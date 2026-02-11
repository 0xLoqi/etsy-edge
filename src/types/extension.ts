export interface SeoScore {
  grade: "A" | "B" | "C" | "D" | "F";
  score: number; // 0-100
  breakdown: Record<string, { score: number; max: number; detail: string }>;
  recommendations: string[];
}

export interface TagSuggestion {
  tag: string;
  reason: string;
  source: "ai" | "competitor" | "trending";
}

export interface CompetitorAnalysis {
  keyword: string;
  topListings: {
    title: string;
    tags: string[];
    views: number;
    favorites: number;
  }[];
  commonTags: { tag: string; count: number; percentage: number }[];
}

export interface UserSettings {
  isPaid: boolean;
  showTagSpy: boolean;
  showSeoScore: boolean;
}

export type MessageType =
  | { type: "GET_COMPETITOR_ANALYSIS"; excludeListingId: string }
  | { type: "GET_AI_SUGGESTIONS"; title: string; description: string; category: string; currentTags: string[]; competitorTags: string[] }
  | { type: "CHECK_PAID_STATUS" }
  | { type: "OPEN_PAYMENT_PAGE" };

export type MessageResponse =
  | { success: true; data: unknown }
  | { success: false; error: string };
