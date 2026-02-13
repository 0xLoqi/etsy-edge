import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  ETSY_API_KEY: string;
  ANTHROPIC_API_KEY: string;
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
  if (++requestCount % 100 === 0) cleanupRateLimits();
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

// Cleanup stale rate limit entries (called lazily during checks)
function cleanupRateLimits() {
  const cutoff = Date.now() - WINDOW_MS * 2;
  for (const [ip, entry] of rateLimits) {
    const lastEtsy = entry.etsy[entry.etsy.length - 1] || 0;
    const lastAi = entry.ai[entry.ai.length - 1] || 0;
    if (lastEtsy < cutoff && lastAi < cutoff) {
      rateLimits.delete(ip);
    }
  }
}

// Run cleanup every 100 requests instead of setInterval (not allowed in Workers global scope)
let requestCount = 0;

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
// AI endpoint — full listing optimization
// ---------------------------------------------------------------------------

const OPTIMIZE_SYSTEM_PROMPT = `You are an elite Etsy SEO consultant. You analyze Etsy listings and provide specific, actionable optimization advice. You understand Etsy's search algorithm deeply:
- Etsy indexes the title, tags, categories, and attributes for search
- Title keywords in the first 40 characters carry the most weight
- Tags should be multi-word long-tail phrases (max 20 chars each, Etsy allows 13 tags)
- Don't repeat title words in tags — Etsy already indexes them separately
- Description's first 160 characters matter for search
- Keyword diversity across different search intents beats repetition

You always respond with valid JSON. Never include markdown formatting or code fences.`;

app.post("/api/ai/optimize-listing", async (c) => {
  const ip = getClientIp(c);
  if (!checkRate(ip, "ai")) {
    return c.json({ error: "Rate limited. Try again in a moment." }, 429);
  }

  const body = await c.req.json<{
    title: string;
    description: string;
    category: string;
    currentTags: string[];
    scoreBreakdown: Record<string, { score: number; max: number; detail: string }>;
    currentGrade: string;
    currentScore: number;
  }>();

  if (!body.title) {
    return c.json({ error: "title is required" }, 400);
  }

  // Build a diagnosis of weak areas from the score breakdown
  const weakAreas: string[] = [];
  const strongAreas: string[] = [];
  for (const [key, val] of Object.entries(body.scoreBreakdown || {})) {
    const pct = val.score / val.max;
    const label = key.replace(/([A-Z])/g, " $1").toLowerCase().trim();
    if (pct < 0.6) weakAreas.push(`${label}: ${val.score}/${val.max} — ${val.detail}`);
    else if (pct >= 0.8) strongAreas.push(`${label}: ${val.score}/${val.max}`);
  }

  const userPrompt = `Optimize this Etsy listing. Current grade: ${body.currentGrade} (${body.currentScore}/100).

LISTING DATA:
Title: ${body.title}
Description (first 500 chars): ${(body.description || "").slice(0, 500)}
Category: ${body.category || "Unknown"}
Current tags: ${(body.currentTags || []).join(", ") || "None"}

WEAK AREAS (fix these):
${weakAreas.length > 0 ? weakAreas.join("\n") : "No major weaknesses detected."}

STRONG AREAS (keep these):
${strongAreas.length > 0 ? strongAreas.join("\n") : "None scoring above 80%."}

Provide a complete optimization. Return JSON with this exact structure:
{
  "optimizedTitle": "A rewritten title (100-140 chars) that front-loads high-value search terms and improves all weak metrics. Keep the product identity intact.",
  "titleExplanation": "1-2 sentences explaining what you changed and why it scores better.",
  "tags": [
    {"tag": "multi word tag", "reason": "brief reason this tag helps"},
    ... exactly 13 tags
  ],
  "diagnosis": [
    {"metric": "metric name", "issue": "what's wrong", "fix": "how the suggestions fix it"},
    ... one per weak area
  ],
  "projectedGrade": "A or B — your honest estimate after applying all suggestions",
  "projectedScore": 82
}

CRITICAL RULES:
- Every tag MUST be 20 characters or fewer (this is an Etsy hard limit, no exceptions)
- Every tag MUST be multi-word (2-4 words, long-tail phrases)
- Tags must NOT repeat words already in the optimized title
- The optimized title must be 100-140 characters
- Focus tags on buyer search intent: what would someone TYPE to find this product?
- Include occasion/use tags (gift for her, birthday present, etc.) if relevant
- projectedGrade should be realistic, not just "A" every time
- projectedScore should be a realistic 0-100 number matching the grade (A=90+, B=75-89, C=60-74, D=40-59, F=<40)`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": c.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      system: OPTIMIZE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.6,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return c.json(
      { error: `AI error: ${(err as Record<string, { message?: string }>).error?.message || res.status}` },
      res.status as 400
    );
  }

  const data = (await res.json()) as {
    content?: { type: string; text: string }[];
  };
  const content = data.content?.[0]?.text || "";

  return c.json({ content });
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
