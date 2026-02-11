import type { TagSuggestion } from "../types/extension";
import { WORKER_URL } from "./config";

interface SuggestionInput {
  title: string;
  description: string;
  category: string;
  currentTags: string[];
  competitorTags: string[];
}

/**
 * Get AI-powered tag suggestions via the backend worker.
 */
export async function getAiTagSuggestions(
  input: SuggestionInput
): Promise<TagSuggestion[]> {
  const res = await fetch(`${WORKER_URL}/api/ai/suggest-tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      category: input.category,
      currentTags: input.currentTags,
      competitorTags: input.competitorTags,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as Record<string, string>).error || `AI API error: ${res.status}`
    );
  }

  const data = await res.json() as { content: string };
  return parseAiResponse(data.content);
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
