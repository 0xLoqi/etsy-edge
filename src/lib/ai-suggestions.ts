import type { AiOptimization } from "../types/extension";
import { WORKER_URL } from "./config";

interface OptimizationInput {
  title: string;
  description: string;
  category: string;
  currentTags: string[];
  scoreBreakdown: Record<string, { score: number; max: number; detail: string }>;
  currentGrade: string;
  currentScore: number;
}

/**
 * Get AI-powered listing optimization via the backend worker.
 */
export async function getAiOptimization(
  input: OptimizationInput
): Promise<AiOptimization> {
  const res = await fetch(`${WORKER_URL}/api/ai/optimize-listing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      category: input.category,
      currentTags: input.currentTags,
      scoreBreakdown: input.scoreBreakdown,
      currentGrade: input.currentGrade,
      currentScore: input.currentScore,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as Record<string, string>).error || `AI API error: ${res.status}`
    );
  }

  const data = await res.json() as { content: string };
  return parseOptimizationResponse(data.content);
}

/** Trim a tag to fit Etsy's 20-char limit at a word boundary. */
function fitTag(raw: string): string {
  const tag = raw.trim().toLowerCase();
  if (tag.length <= 20) return tag;
  const trimmed = tag.slice(0, 20);
  const lastSpace = trimmed.lastIndexOf(" ");
  return lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed;
}

function parseOptimizationResponse(content: string): AiOptimization {
  try {
    // Strip markdown code fences if present
    const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    // Extract the JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON object found in response");

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      optimizedTitle: String(parsed.optimizedTitle || ""),
      titleExplanation: String(parsed.titleExplanation || ""),
      tags: (parsed.tags || []).slice(0, 13).map((t: Record<string, string>) => ({
        tag: fitTag(String(t.tag || "")),
        reason: String(t.reason || ""),
      })),
      diagnosis: (parsed.diagnosis || []).map((d: Record<string, string>) => ({
        metric: String(d.metric || ""),
        issue: String(d.issue || ""),
        fix: String(d.fix || ""),
      })),
      projectedGrade: String(parsed.projectedGrade || "B"),
      projectedScore: typeof parsed.projectedScore === "number" ? parsed.projectedScore : undefined,
    };
  } catch (e) {
    throw new Error(`Failed to parse AI response: ${e instanceof Error ? e.message : "unknown error"}`);
  }
}
