import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  ETSY_API_KEY: string;
  OPENAI_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// ---------------------------------------------------------------------------
// CORS — only allow chrome-extension:// origins + localhost for dev
// ---------------------------------------------------------------------------
app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (!origin) return "";
      if (origin.startsWith("chrome-extension://")) return origin;
      if (origin.startsWith("http://localhost")) return origin;
      return "";
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 86400,
  })
);

// ---------------------------------------------------------------------------
// Rate limiting (per IP, in-memory — resets on worker cold start)
// ---------------------------------------------------------------------------
const rateLimits = new Map<string, { etsy: number[]; ai: number[] }>();

const ETSY_LIMIT = 120; // requests per minute
const AI_LIMIT = 20; // requests per minute
const WINDOW_MS = 60_000;

function checkRate(ip: string, bucket: "etsy" | "ai"): boolean {
  const now = Date.now();
  let entry = rateLimits.get(ip);
  if (!entry) {
    entry = { etsy: [], ai: [] };
    rateLimits.set(ip, entry);
  }

  const timestamps = entry[bucket];
  // Evict old entries
  while (timestamps.length > 0 && now - timestamps[0] > WINDOW_MS) {
    timestamps.shift();
  }

  const limit = bucket === "etsy" ? ETSY_LIMIT : AI_LIMIT;
  if (timestamps.length >= limit) return false;

  timestamps.push(now);
  return true;
}

function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  return c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown";
}

// Periodic cleanup of stale rate limit entries (every 5 minutes)
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS * 2;
  for (const [ip, entry] of rateLimits) {
    const lastEtsy = entry.etsy[entry.etsy.length - 1] || 0;
    const lastAi = entry.ai[entry.ai.length - 1] || 0;
    if (lastEtsy < cutoff && lastAi < cutoff) {
      rateLimits.delete(ip);
    }
  }
}, 300_000);

// ---------------------------------------------------------------------------
// Etsy proxy endpoints
// ---------------------------------------------------------------------------

// Search must be registered before :id to avoid "search" matching as a param
app.get("/api/listings/search", async (c) => {
  const ip = getClientIp(c);
  if (!checkRate(ip, "etsy")) {
    return c.json({ error: "Rate limited. Try again in a moment." }, 429);
  }

  const keyword = c.req.query("keyword") || "";
  const limit = c.req.query("limit") || "25";

  const encoded = encodeURIComponent(keyword);
  const res = await fetch(
    `https://openapi.etsy.com/v3/application/listings/active?keywords=${encoded}&limit=${limit}&sort_on=score`,
    { headers: { "x-api-key": c.env.ETSY_API_KEY } }
  );

  if (!res.ok) {
    return c.json({ error: `Etsy API error: ${res.status}` }, res.status as 400);
  }

  return c.json(await res.json());
});

app.get("/api/listings/:id", async (c) => {
  const ip = getClientIp(c);
  if (!checkRate(ip, "etsy")) {
    return c.json({ error: "Rate limited. Try again in a moment." }, 429);
  }

  const listingId = c.req.param("id");
  const res = await fetch(
    `https://openapi.etsy.com/v3/application/listings/${listingId}`,
    { headers: { "x-api-key": c.env.ETSY_API_KEY } }
  );

  if (!res.ok) {
    return c.json({ error: `Etsy API error: ${res.status}` }, res.status as 400);
  }

  return c.json(await res.json());
});

// ---------------------------------------------------------------------------
// AI endpoint
// ---------------------------------------------------------------------------

const AI_SYSTEM_PROMPT =
  "You are an Etsy SEO expert. You suggest optimized tags for Etsy listings. Always return exactly 13 tags. Each tag should be max 20 characters. Respond ONLY with valid JSON.";

app.post("/api/ai/suggest-tags", async (c) => {
  const ip = getClientIp(c);
  if (!checkRate(ip, "ai")) {
    return c.json({ error: "Rate limited. Try again in a moment." }, 429);
  }

  const body = await c.req.json<{
    title: string;
    description: string;
    category: string;
    currentTags: string[];
    competitorTags: string[];
  }>();

  if (!body.title) {
    return c.json({ error: "title is required" }, 400);
  }

  const competitorSection =
    body.competitorTags?.length > 0
      ? `\n\nTop competitor tags for similar listings:\n${body.competitorTags.slice(0, 30).join(", ")}`
      : "";

  const userPrompt = `Suggest 13 optimized Etsy tags for this listing.

Title: ${body.title}
Description: ${(body.description || "").slice(0, 500)}
Category: ${body.category || "Unknown"}
Current tags: ${(body.currentTags || []).join(", ") || "None"}
${competitorSection}

Rules:
- Exactly 13 tags, each max 20 characters
- Use multi-word phrases (long-tail keywords are better than single words)
- Don't repeat words already in the title (Etsy already indexes the title)
- Mix broad and specific terms
- Include at least 2 tags describing the item's use/occasion
- Avoid trademarked terms

Return JSON array:
[{"tag": "example tag", "reason": "why this tag helps"}, ...]`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return c.json(
      { error: `OpenAI error: ${(err as Record<string, unknown>).error || res.status}` },
      res.status as 400
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content || "";

  return c.json({ content });
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
