export interface SeoScore {
  grade: "A" | "B" | "C" | "D" | "F";
  score: number; // 0-100
  breakdown: Record<string, { score: number; max: number; detail: string; label: string }>;
  recommendations: string[];
}

export interface TagSuggestion {
  tag: string;
  reason: string;
  source: "ai" | "trending";
}

export interface AiOptimization {
  optimizedTitle: string;
  titleExplanation: string;
  tags: { tag: string; reason: string }[];
  diagnosis: { metric: string; issue: string; fix: string }[];
  projectedGrade: string;
  projectedScore?: number;
}

export interface UserSettings {
  isPaid: boolean;
  showTagSpy: boolean;
  showSeoScore: boolean;
}

export type MessageType =
  | { type: "GET_AI_SUGGESTIONS"; title: string; description: string; category: string; currentTags: string[] }
  | { type: "CHECK_PAID_STATUS" }
  | { type: "OPEN_PAYMENT_PAGE" };

export type MessageResponse =
  | { success: true; data: unknown }
  | { success: false; error: string };
