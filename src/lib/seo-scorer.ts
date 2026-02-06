import type { SeoScore } from "../types/extension";

interface ScoringInput {
  title: string;
  description: string;
  tags: string[];
}

/**
 * Score a listing's SEO quality. Returns a grade (A-F), numeric score (0-100),
 * detailed breakdown, and actionable recommendations.
 */
export function scoreListing(input: ScoringInput): SeoScore {
  const breakdown = {
    tagCount: scoreTagCount(input.tags),
    titleLength: scoreTitleLength(input.title),
    titleKeywords: scoreTitleKeywords(input.title),
    descriptionLength: scoreDescriptionLength(input.description),
    tagDiversity: scoreTagDiversity(input.tags),
  };

  const totalScore = Object.values(breakdown).reduce((sum, b) => sum + b.score, 0);
  const maxScore = Object.values(breakdown).reduce((sum, b) => sum + b.max, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);

  const recommendations: string[] = [];
  if (breakdown.tagCount.score < breakdown.tagCount.max) {
    recommendations.push(`Use all 13 tags — you're only using ${input.tags.length}.`);
  }
  if (breakdown.titleLength.score < breakdown.titleLength.max) {
    recommendations.push(
      input.title.length < 40
        ? "Title is too short. Aim for 60-140 characters with keywords."
        : "Title is very long. Keep the most important keywords in the first 40 characters."
    );
  }
  if (breakdown.titleKeywords.score < breakdown.titleKeywords.max) {
    recommendations.push(
      "Front-load your title with your primary keyword. Etsy weighs the first 40 characters most heavily."
    );
  }
  if (breakdown.descriptionLength.score < breakdown.descriptionLength.max) {
    recommendations.push(
      input.description.length < 300
        ? "Description is too short. Aim for 300+ characters with natural keyword usage."
        : "Great description length."
    );
  }
  if (breakdown.tagDiversity.score < breakdown.tagDiversity.max) {
    recommendations.push(
      "Some tags overlap or are too similar. Use varied phrases to capture more search terms."
    );
  }

  return {
    grade: percentageToGrade(percentage),
    score: percentage,
    breakdown,
    recommendations: recommendations.filter(
      (r) => !r.startsWith("Great")
    ),
  };
}

function scoreTagCount(tags: string[]): { score: number; max: number; detail: string } {
  const count = tags.length;
  const max = 30;
  // 13 tags = full score, proportional below
  const score = Math.min(max, Math.round((count / 13) * max));
  return { score, max, detail: `${count}/13 tags used` };
}

function scoreTitleLength(title: string): { score: number; max: number; detail: string } {
  const len = title.length;
  const max = 20;
  let score = 0;
  if (len >= 60 && len <= 140) score = max;
  else if (len >= 40 && len < 60) score = Math.round(max * 0.7);
  else if (len > 140) score = Math.round(max * 0.6);
  else if (len >= 20 && len < 40) score = Math.round(max * 0.4);
  else score = Math.round(max * 0.2);
  return { score, max, detail: `${len} characters (ideal: 60-140)` };
}

function scoreTitleKeywords(title: string): { score: number; max: number; detail: string } {
  const max = 20;
  const first40 = title.slice(0, 40);
  const words = first40.split(/[\s,|•\-–—]+/).filter((w) => w.length > 2);
  // More meaningful words in first 40 chars = better
  const score = Math.min(max, Math.round((words.length / 5) * max));
  return { score, max, detail: `${words.length} keywords in first 40 characters` };
}

function scoreDescriptionLength(desc: string): { score: number; max: number; detail: string } {
  const len = desc.length;
  const max = 15;
  let score = 0;
  if (len >= 300) score = max;
  else if (len >= 150) score = Math.round(max * 0.6);
  else if (len >= 50) score = Math.round(max * 0.3);
  return { score, max, detail: `${len} characters (aim for 300+)` };
}

function scoreTagDiversity(tags: string[]): { score: number; max: number; detail: string } {
  const max = 15;
  if (tags.length === 0) return { score: 0, max, detail: "No tags" };

  // Check for overlapping/redundant tags
  const normalized = tags.map((t) => t.toLowerCase().trim());
  const words = new Set<string>();
  let redundantCount = 0;

  for (const tag of normalized) {
    const tagWords = tag.split(/\s+/);
    const allExist = tagWords.every((w) => words.has(w));
    if (allExist && tagWords.length > 0) redundantCount++;
    tagWords.forEach((w) => words.add(w));
  }

  const diversityRatio = 1 - redundantCount / tags.length;
  const score = Math.round(max * diversityRatio);
  return {
    score,
    max,
    detail:
      redundantCount > 0
        ? `${redundantCount} potentially redundant tag${redundantCount > 1 ? "s" : ""}`
        : "Good tag diversity",
  };
}

function percentageToGrade(pct: number): SeoScore["grade"] {
  if (pct >= 90) return "A";
  if (pct >= 75) return "B";
  if (pct >= 60) return "C";
  if (pct >= 40) return "D";
  return "F";
}
