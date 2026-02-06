import type { TagSuggestion } from "../types/extension";
import { appStorage } from "./storage";

interface SuggestionInput {
  title: string;
  description: string;
  category: string;
  currentTags: string[];
  competitorTags: string[];
}

/**
 * Get AI-powered tag suggestions using OpenAI GPT-4o-mini.
 */
export async function getAiTagSuggestions(
  input: SuggestionInput
): Promise<TagSuggestion[]> {
  const apiKey = await appStorage.openaiApiKey.getValue();
  if (!apiKey) throw new Error("OpenAI API key not configured. Go to extension settings.");

  const prompt = buildPrompt(input);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an Etsy SEO expert. You suggest optimized tags for Etsy listings. Always return exactly 13 tags. Each tag should be max 20 characters. Respond ONLY with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `OpenAI error: ${(err as Record<string, unknown>).error || res.status}`
    );
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  return parseAiResponse(content);
}

function buildPrompt(input: SuggestionInput): string {
  const competitorSection =
    input.competitorTags.length > 0
      ? `\n\nTop competitor tags for similar listings:\n${input.competitorTags.slice(0, 30).join(", ")}`
      : "";

  return `Suggest 13 optimized Etsy tags for this listing.

Title: ${input.title}
Description: ${input.description.slice(0, 500)}
Category: ${input.category || "Unknown"}
Current tags: ${input.currentTags.join(", ") || "None"}
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
}

function parseAiResponse(content: string): TagSuggestion[] {
  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found");

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) throw new Error("Not an array");

    return parsed.slice(0, 13).map((item: Record<string, string>) => ({
      tag: String(item.tag || "").slice(0, 20),
      reason: String(item.reason || ""),
      source: "ai" as const,
    }));
  } catch {
    throw new Error("Failed to parse AI response. Try again.");
  }
}
