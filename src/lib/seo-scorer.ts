import type { SeoScore } from "../types/extension";

interface ScoringInput {
  title: string;
  description: string;
  /** Related search phrases scraped from the page (not seller's actual tags) */
  relatedSearches: string[];
}

// Common filler words that don't help Etsy SEO
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "are",
  "was", "will", "can", "has", "had", "have", "but", "not", "you",
  "all", "her", "his", "our", "its", "she", "him", "who", "get",
  "got", "been", "being", "into", "over", "just", "also", "than",
  "them", "then", "some", "very", "when", "what", "which", "their",
  "about", "would", "make", "like", "could", "each", "other", "more",
  "new", "one", "two", "set", "use", "way", "day",
]);

// Filler adjectives that waste prime title real estate
const FILLER_STARTERS = new Set([
  "beautiful", "cute", "lovely", "pretty", "unique", "amazing", "awesome",
  "best", "great", "nice", "perfect", "stunning", "gorgeous", "wonderful",
  "cool", "super", "special", "deluxe", "premium", "luxury", "elegant",
  "sale", "free", "cheap", "discount", "deal",
]);

function getKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,|•\-–—/()&+:;!?"']+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function getUniqueKeywords(text: string): Set<string> {
  return new Set(getKeywords(text));
}

/**
 * Score a listing's SEO quality.
 *
 * Design goal: page-1 listings should cluster around A/B,
 * page-10+ listings should land in C/D territory,
 * and truly neglected listings should hit F.
 *
 * Total: 100 points across 6 categories.
 */
export function scoreListing(input: ScoringInput): SeoScore {
  const breakdown = {
    titleLength: scoreTitleLength(input.title),
    titleFrontLoad: scoreTitleFrontLoad(input.title),
    titleLongTail: scoreTitleLongTail(input.title),
    titleSearchAlignment: scoreTitleSearchAlignment(input.title, input.relatedSearches),
    keywordDiversity: scoreKeywordDiversity(input.title, input.relatedSearches),
    descriptionQuality: scoreDescriptionQuality(input.description, input.title),
  };

  const totalScore = Object.values(breakdown).reduce((sum, b) => sum + b.score, 0);
  const maxScore = Object.values(breakdown).reduce((sum, b) => sum + b.max, 0);
  const percentage = Math.round((totalScore / maxScore) * 100);

  const recommendations: string[] = [];
  for (const [key, val] of Object.entries(breakdown)) {
    const pct = val.score / val.max;
    if (pct >= 0.8) continue; // Don't nag about things they're doing well

    switch (key) {
      case "titleLength":
        recommendations.push(
          input.title.length < 80
            ? "Longer titles rank better on Etsy. Aim for 100-140 characters using varied keyword phrases."
            : "Your title is very long. Keep the strongest keywords in the first 60 characters."
        );
        break;
      case "titleFrontLoad":
        recommendations.push(
          "Front-load your title: put the exact phrase a buyer would search in the first 40 characters. Avoid starting with adjectives like \"Beautiful\" or \"Cute.\""
        );
        break;
      case "titleLongTail":
        recommendations.push(
          "Use more specific, multi-word phrases. \"Personalized Leather Journal Notebook\" beats \"Journal\" — long-tail keywords convert better and face less competition."
        );
        break;
      case "titleSearchAlignment":
        recommendations.push(
          "Your title keywords don't closely match what Etsy surfaces as related searches. Study the top related searches and incorporate 2-3 exact phrases into your title."
        );
        break;
      case "keywordDiversity":
        recommendations.push(
          "Diversify your keywords. Each tag and title word should target a different search term — don't repeat the same root word multiple times."
        );
        break;
      case "descriptionQuality":
        if (input.description.length < 300) {
          recommendations.push(
            "Your description is too short. Write 300+ characters with natural keyword usage — Etsy indexes the first 160 chars for search."
          );
        } else {
          recommendations.push(
            "Weave more of your title keywords naturally into the first 2-3 sentences of your description. Etsy gives the most weight to early description text."
          );
        }
        break;
    }
  }

  return {
    grade: percentageToGrade(percentage),
    score: percentage,
    breakdown,
    recommendations,
  };
}

// ─── Title Length (15 pts) ────────────────────────────────────────────
// Strict: only the 100-140 sweet spot gets full marks.
// Below 80 chars is a serious miss.
function scoreTitleLength(title: string): { score: number; max: number; detail: string } {
  const len = title.length;
  const max = 15;
  let score = 0;

  if (len >= 100 && len <= 140) score = max;           // Sweet spot
  else if (len >= 90 && len < 100) score = max - 3;    // Close
  else if (len >= 80 && len < 90) score = max - 6;     // Leaving value on table
  else if (len >= 60 && len < 80) score = max - 9;     // Significant gap
  else if (len > 140) score = max - 5;                  // Over-stuffed
  else if (len >= 40 && len < 60) score = max - 12;    // Barely trying
  else score = 0;                                       // < 40 chars = no effort

  return { score, max, detail: `Title: ${len} chars (sweet spot: 100-140)`, label: "Title length" };
}

// ─── Title Front-Loading (20 pts) ────────────────────────────────────
// Etsy heavily weights the first ~40 chars. Filler words up front kill rankings.
// Stricter: penalize ALL filler/stop words in first 40, not just the first word.
function scoreTitleFrontLoad(title: string): { score: number; max: number; detail: string } {
  const max = 20;
  const first40 = title.slice(0, 40);
  const allWords = first40.toLowerCase().split(/[\s,|•\-–—/()&+:]+/).filter((w) => w.length > 1);

  if (allWords.length === 0) return { score: 0, max, detail: "Title too short to analyze", label: "Keyword front-loading" };

  // Count meaningful keywords (non-stop, non-filler) in first 40 chars
  const meaningfulWords = allWords.filter(
    (w) => !STOP_WORDS.has(w) && !FILLER_STARTERS.has(w) && w.length > 2
  );

  // Base score from ratio of meaningful words
  const keywordRatio = meaningfulWords.length / Math.max(1, allWords.length);

  // Heavy penalty: filler word as the FIRST word (wastes the most valuable position)
  let penalty = 0;
  if (allWords.length > 0 && FILLER_STARTERS.has(allWords[0])) {
    penalty += 8; // Very costly — this is the #1 SEO mistake
  }

  // Moderate penalty: any filler words in the first 40 chars at all
  const fillerCount = allWords.filter((w) => FILLER_STARTERS.has(w)).length;
  penalty += fillerCount * 2;

  // Additional penalty: too many stop words diluting the signal
  const stopCount = allWords.filter((w) => STOP_WORDS.has(w) && w.length > 1).length;
  if (stopCount > 2) penalty += (stopCount - 2) * 1;

  const score = Math.max(0, Math.round(max * keywordRatio) - penalty);

  return {
    score,
    max,
    detail: `${meaningfulWords.length}/${allWords.length} front-loaded keywords are meaningful`,
    label: "Keyword front-loading",
  };
}

// ─── Title Long-Tail Specificity (20 pts) ────────────────────────────
// Stricter: generic short words barely score. Need real multi-word phrases.
function scoreTitleLongTail(title: string): { score: number; max: number; detail: string } {
  const max = 20;
  const keywords = getKeywords(title);

  if (keywords.length === 0) return { score: 0, max, detail: "No keywords found", label: "Long-tail specificity" };

  // Average keyword length (longer = more specific)
  const avgLen = keywords.reduce((s, w) => s + w.length, 0) / keywords.length;

  // Unique roots for vocabulary diversity (crude 4-char stemming)
  const uniqueRoots = new Set(keywords.map((w) => w.slice(0, 4)));
  const uniqueRatio = uniqueRoots.size / keywords.length;

  let score = 0;

  // Word specificity: stricter tiers
  if (avgLen >= 7) score += Math.round(max * 0.35);
  else if (avgLen >= 6) score += Math.round(max * 0.2);
  else if (avgLen >= 5) score += Math.round(max * 0.1);
  else score += Math.round(max * 0.03); // Short generic words = almost nothing

  // Vocabulary diversity: stricter tiers
  if (uniqueRatio >= 0.85) score += Math.round(max * 0.35);
  else if (uniqueRatio >= 0.7) score += Math.round(max * 0.2);
  else if (uniqueRatio >= 0.5) score += Math.round(max * 0.1);
  else score += Math.round(max * 0.02); // Lots of repeated roots = keyword stuffing

  // Keyword count bonus: need 8+ to use the full title strategically
  if (keywords.length >= 10) score += Math.round(max * 0.3);
  else if (keywords.length >= 8) score += Math.round(max * 0.2);
  else if (keywords.length >= 6) score += Math.round(max * 0.1);
  else score += Math.round(max * 0.02); // Under 6 keywords = barely trying

  score = Math.min(max, score);

  return {
    score,
    max,
    detail: `${keywords.length} keywords, avg ${avgLen.toFixed(1)} chars, ${uniqueRoots.size} unique roots`,
    label: "Long-tail specificity",
  };
}

// ─── Title ↔ Search Alignment (25 pts, increased from 20) ───────────
// THE key differentiator. Page-1 listings match related searches tightly.
// Stricter: exact phrase matches are worth a lot, partial overlap barely counts.
function scoreTitleSearchAlignment(
  title: string,
  relatedSearches: string[]
): { score: number; max: number; detail: string } {
  const max = 25;
  if (relatedSearches.length === 0) return { score: 0, max, detail: "No search data available", label: "Search term alignment" };

  const titleLower = title.toLowerCase();
  const titleWords = getUniqueKeywords(title);
  const top = relatedSearches.slice(0, 15);

  let exactPhraseMatches = 0;
  let strongPartialMatches = 0; // 3+ word overlap
  let weakPartialMatches = 0;   // 2 word overlap

  for (const search of top) {
    const searchLower = search.toLowerCase();

    // Exact phrase contained in title (strongest signal)
    if (titleLower.includes(searchLower)) {
      exactPhraseMatches++;
      continue;
    }

    // Check word overlap strength
    const searchWords = searchLower.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    const overlapCount = searchWords.filter((w) => titleWords.has(w)).length;

    if (overlapCount >= 3) {
      strongPartialMatches++;
    } else if (overlapCount >= 2) {
      weakPartialMatches++;
    }
  }

  // Weighted scoring: exact phrases are gold, strong partials are OK, weak barely count
  const weightedScore = exactPhraseMatches * 5 + strongPartialMatches * 2 + weakPartialMatches * 0.5;

  // To get full marks you need ~3 exact + 4 strong partial = 23
  // A mediocre listing with just 2-word overlaps: 6 * 0.5 = 3 out of 23 = low
  const maxPossible = 23;
  const ratio = weightedScore / maxPossible;
  const score = Math.round(max * Math.min(1, ratio));

  return {
    score,
    max,
    detail: `${exactPhraseMatches} exact + ${strongPartialMatches} strong + ${weakPartialMatches} weak matches in top ${top.length} searches`,
    label: "Search term alignment",
  };
}

// ─── Keyword Diversity (10 pts) ──────────────────────────────────────
// Does the title cover multiple distinct search intents?
// Stricter: need to cover a high percentage of search term groups.
function scoreKeywordDiversity(
  title: string,
  relatedSearches: string[]
): { score: number; max: number; detail: string } {
  const max = 10;
  if (relatedSearches.length === 0) return { score: 3, max, detail: "No search data to analyze", label: "Keyword diversity" };

  const allSearchKeywords = relatedSearches.slice(0, 13).flatMap((s) => getKeywords(s));
  const titleKeywords = getKeywords(title);

  // Group by crude stems (first 4 chars)
  const searchStems = new Set(allSearchKeywords.map((w) => w.slice(0, 4)));
  const titleStems = new Set(titleKeywords.map((w) => w.slice(0, 4)));

  // How many distinct search intents does the title cover?
  let stemOverlap = 0;
  for (const stem of titleStems) {
    if (searchStems.has(stem)) stemOverlap++;
  }

  // Title coverage of search intent — no generous multiplier
  const titleCoverage = stemOverlap / Math.max(1, searchStems.size);

  // Strict tiers
  let score = 0;
  if (titleCoverage >= 0.6) score = max;
  else if (titleCoverage >= 0.45) score = Math.round(max * 0.7);
  else if (titleCoverage >= 0.3) score = Math.round(max * 0.4);
  else if (titleCoverage >= 0.15) score = Math.round(max * 0.2);
  else score = 0;

  return {
    score,
    max,
    detail: `Title covers ${stemOverlap}/${searchStems.size} search keyword groups`,
    label: "Keyword diversity",
  };
}

// ─── Description Quality (10 pts, reduced from 15) ──────────────────
// Reduced weight: description matters for SEO but title+tags matter more.
// Stricter: need strong keyword density in the first 160 chars.
function scoreDescriptionQuality(
  desc: string,
  title: string
): { score: number; max: number; detail: string } {
  const max = 10;
  if (desc.length < 50) return { score: 0, max, detail: "Description too short (< 50 chars)", label: "Description SEO" };

  const titleKeywords = getUniqueKeywords(title);
  const descLower = desc.toLowerCase();
  const first160 = descLower.slice(0, 160);

  if (titleKeywords.size === 0) return { score: max, max, detail: "N/A", label: "Description SEO" };

  // Keywords in first 160 chars (most important for SEO)
  let earlyFound = 0;
  for (const word of titleKeywords) {
    if (first160.includes(word)) earlyFound++;
  }
  const earlyRatio = earlyFound / titleKeywords.size;

  // Keywords in full description
  let fullFound = 0;
  for (const word of titleKeywords) {
    if (descLower.includes(word)) fullFound++;
  }
  const fullRatio = fullFound / titleKeywords.size;

  // Length factor — need 300+ to even get bonus
  let lengthBonus = 0;
  if (desc.length >= 500) lengthBonus = 2;
  else if (desc.length >= 300) lengthBonus = 1;

  // Stricter combine: early placement is critical
  const baseScore = Math.round((max - 2) * (earlyRatio * 0.7 + fullRatio * 0.3));
  const score = Math.min(max, baseScore + lengthBonus);

  return {
    score,
    max,
    detail: `${earlyFound}/${titleKeywords.size} keywords in first 160 chars, ${fullFound} total`,
    label: "Description SEO",
  };
}

function percentageToGrade(pct: number): SeoScore["grade"] {
  if (pct >= 90) return "A";
  if (pct >= 75) return "B";
  if (pct >= 60) return "C";
  if (pct >= 40) return "D";
  return "F";
}
