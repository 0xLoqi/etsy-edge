import type { SeoScore } from "../types/extension";

interface ScoringInput {
  title: string;
  description: string;
  /** Related search phrases scraped from the page (not seller's actual tags) */
  relatedSearches: string[];
}

/**
 * Score a listing's SEO quality based on what we can observe from the page.
 * Title and description come from JSON-LD (accurate).
 * Related searches are Etsy-generated phrases (useful for keyword analysis).
 */
export function scoreListing(input: ScoringInput): SeoScore {
  const breakdown = {
    titleLength: scoreTitleLength(input.title),
    titleKeywords: scoreTitleKeywords(input.title),
    titleSearchOverlap: scoreTitleSearchOverlap(input.title, input.relatedSearches),
    descriptionLength: scoreDescriptionLength(input.description),
    descriptionKeywords: scoreDescriptionKeywords(input.description, input.title),
  };

  const totalScore = Object.values(breakdown).reduce((sum, b) => sum + b.score, 0);
  const maxScore = Object.values(breakdown).reduce((sum, b) => sum + b.max, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);

  const recommendations: string[] = [];
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
  if (breakdown.titleSearchOverlap.score < breakdown.titleSearchOverlap.max) {
    recommendations.push(
      "Your title keywords don't strongly match Etsy's search terms for this category. Consider using phrases shoppers actually search for."
    );
  }
  if (breakdown.descriptionLength.score < breakdown.descriptionLength.max) {
    if (input.description.length < 300) {
      recommendations.push("Description is too short. Aim for 300+ characters with natural keyword usage.");
    }
  }
  if (breakdown.descriptionKeywords.score < breakdown.descriptionKeywords.max) {
    recommendations.push(
      "Repeat your main title keywords naturally in the description. Etsy indexes description text for search."
    );
  }

  return {
    grade: percentageToGrade(percentage),
    score: percentage,
    breakdown,
    recommendations,
  };
}

function scoreTitleLength(title: string): { score: number; max: number; detail: string } {
  const len = title.length;
  const max = 25;
  let score = 0;
  if (len >= 60 && len <= 140) score = max;
  else if (len >= 40 && len < 60) score = Math.round(max * 0.7);
  else if (len > 140) score = Math.round(max * 0.6);
  else if (len >= 20 && len < 40) score = Math.round(max * 0.4);
  else score = Math.round(max * 0.2);
  return { score, max, detail: `Title: ${len} chars (ideal: 60-140)` };
}

function scoreTitleKeywords(title: string): { score: number; max: number; detail: string } {
  const max = 25;
  const first40 = title.slice(0, 40);
  const words = first40.split(/[\s,|•\-–—]+/).filter((w) => w.length > 2);
  const score = Math.min(max, Math.round((words.length / 5) * max));
  return { score, max, detail: `${words.length} keywords in first 40 chars` };
}

/**
 * How well do the title keywords match Etsy's related search terms?
 * High overlap = title is well-aligned with what shoppers search.
 */
function scoreTitleSearchOverlap(
  title: string,
  relatedSearches: string[]
): { score: number; max: number; detail: string } {
  const max = 20;
  if (relatedSearches.length === 0) return { score: 0, max, detail: "No search data available" };

  const titleWords = new Set(
    title.toLowerCase().split(/[\s,|•\-–—/()]+/).filter((w) => w.length > 2)
  );

  // Check how many of the top related searches contain title words
  const top = relatedSearches.slice(0, 20);
  let matches = 0;
  for (const search of top) {
    const searchWords = search.toLowerCase().split(/\s+/);
    if (searchWords.some((w) => titleWords.has(w))) matches++;
  }

  const ratio = matches / top.length;
  const score = Math.round(max * Math.min(1, ratio * 1.5)); // boost slightly
  return {
    score,
    max,
    detail: `Title matches ${matches}/${top.length} top searches`,
  };
}

function scoreDescriptionLength(desc: string): { score: number; max: number; detail: string } {
  const len = desc.length;
  const max = 15;
  let score = 0;
  if (len >= 300) score = max;
  else if (len >= 150) score = Math.round(max * 0.6);
  else if (len >= 50) score = Math.round(max * 0.3);
  return { score, max, detail: `Description: ${len} chars (aim for 300+)` };
}

/**
 * Does the description reinforce the title keywords?
 * Etsy indexes description text, so repeating key terms helps.
 */
function scoreDescriptionKeywords(
  desc: string,
  title: string
): { score: number; max: number; detail: string } {
  const max = 15;
  if (desc.length < 50) return { score: 0, max, detail: "Description too short to analyze" };

  const titleWords = title
    .toLowerCase()
    .split(/[\s,|•\-–—/()]+/)
    .filter((w) => w.length > 3);

  if (titleWords.length === 0) return { score: max, max, detail: "N/A" };

  const descLower = desc.toLowerCase();
  let found = 0;
  for (const word of titleWords) {
    if (descLower.includes(word)) found++;
  }

  const ratio = found / titleWords.length;
  const score = Math.round(max * ratio);
  return {
    score,
    max,
    detail: `${found}/${titleWords.length} title keywords in description`,
  };
}

function percentageToGrade(pct: number): SeoScore["grade"] {
  if (pct >= 90) return "A";
  if (pct >= 75) return "B";
  if (pct >= 60) return "C";
  if (pct >= 40) return "D";
  return "F";
}
