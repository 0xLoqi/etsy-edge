import { storage } from "wxt/utils/storage";

const showTagSpy = storage.defineItem<boolean>("local:showTagSpy", {
  fallback: true,
});

const showSeoScore = storage.defineItem<boolean>("local:showSeoScore", {
  fallback: true,
});

interface VisitedListing {
  tags: string[];
  title: string;
  /** Primary category from breadcrumbs (e.g. "Candles & Holders") */
  category: string;
  timestamp: number;
}

// Cache of scraped data from every visited listing
const tagCache = storage.defineItem<Record<string, VisitedListing>>(
  "local:tagCache",
  { fallback: {} }
);

const MAX_CACHE_ENTRIES = 500;

// ---------------------------------------------------------------------------
// AI usage tracking — monthly caps with progressive warnings
// ---------------------------------------------------------------------------

interface AiUsageData {
  /** YYYY-MM key for the current billing month */
  month: string;
  /** Number of AI optimizations used this month */
  count: number;
}

const aiUsage = storage.defineItem<AiUsageData>("local:aiUsage", {
  fallback: { month: "", count: 0 },
});

/** Timestamp of the very first extension install (epoch ms) */
const installTimestamp = storage.defineItem<number>("local:installTimestamp", {
  fallback: 0,
});

/** Free audits already consumed from the initial welcome allotment */
const freeAuditsUsed = storage.defineItem<number>("local:freeAuditsUsed", {
  fallback: 0,
});

// ---------------------------------------------------------------------------
// AI result cache — persist across tab switches so users don't lose reports
// ---------------------------------------------------------------------------

interface CachedAiResult {
  listingId: string;
  result: Record<string, unknown>;
  timestamp: number;
}

/** Cache up to 20 AI results keyed by listing ID */
const aiResultCache = storage.defineItem<Record<string, CachedAiResult>>(
  "local:aiResultCache",
  { fallback: {} }
);

const MAX_AI_CACHE = 20;

/** Whether the user has dismissed the review prompt */
const reviewPromptDismissed = storage.defineItem<boolean>(
  "local:reviewPromptDismissed",
  { fallback: false }
);

/** Total audits completed (lifetime, across all tiers) */
const totalAuditsCompleted = storage.defineItem<number>(
  "local:totalAuditsCompleted",
  { fallback: 0 }
);

const FREE_INITIAL_AUDITS = 1; // free audits on install
const FREE_MONTHLY_AUDITS = 1; // free audits per month after initial
const PAID_SAFETY_CAP = 500; // silent abuse prevention — no UI messaging

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const appStorage = {
  showTagSpy,
  showSeoScore,

  async getCachedTags(listingId: string): Promise<string[] | null> {
    const cache = await tagCache.getValue();
    const entry = cache[listingId];
    if (entry) return entry.tags;
    return null;
  },

  /** Save scraped data from a visited listing. */
  async saveVisitedListing(
    listingId: string,
    tags: string[],
    title: string,
    category: string
  ): Promise<void> {
    const cache = await tagCache.getValue();
    cache[listingId] = { tags, title, category, timestamp: Date.now() };
    // Evict oldest if over limit
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_ENTRIES) {
      const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
      for (const key of sorted.slice(0, keys.length - MAX_CACHE_ENTRIES)) {
        delete cache[key];
      }
    }
    await tagCache.setValue(cache);
  },

  // -------------------------------------------------------------------------
  // AI usage tracking
  // -------------------------------------------------------------------------

  /** Ensure install timestamp is recorded (called once at startup). */
  async ensureInstallTimestamp(): Promise<void> {
    const ts = await installTimestamp.getValue();
    if (!ts) {
      await installTimestamp.setValue(Date.now());
    }
  },

  /**
   * Check whether the user can make another AI optimization call.
   * Returns an object describing the current state.
   */
  async checkAiUsage(isPaid: boolean): Promise<{
    allowed: boolean;
    /** Current count this month */
    used: number;
    /** Max for this tier */
    limit: number;
    /** Warning message (only set for paid users near limit) */
    warning: string | null;
    /** true when the persistent counter should show in the UI */
    showCounter: boolean;
  }> {
    const month = currentMonthKey();
    const usage = await aiUsage.getValue();

    // Reset count if we rolled into a new month
    const monthlyCount = usage.month === month ? usage.count : 0;

    if (isPaid) {
      // Paid users get "unlimited" audits — silent safety cap prevents abuse
      const allowed = monthlyCount < PAID_SAFETY_CAP;
      return { allowed, used: monthlyCount, limit: PAID_SAFETY_CAP, warning: null, showCounter: false };
    }

    // --- Free tier ---
    const used = await freeAuditsUsed.getValue();
    const ts = await installTimestamp.getValue();
    const installMonth = ts
      ? `${new Date(ts).getFullYear()}-${String(new Date(ts).getMonth() + 1).padStart(2, "0")}`
      : month;

    // In the install month they get FREE_INITIAL_AUDITS total.
    // In subsequent months they get FREE_MONTHLY_AUDITS per month.
    const isInstallMonth = month === installMonth;
    const freeLimit = isInstallMonth
      ? FREE_INITIAL_AUDITS
      : FREE_MONTHLY_AUDITS;

    // For free users after install month, "used" resets monthly via monthlyCount
    const effectiveUsed = isInstallMonth ? used : monthlyCount;
    const allowed = effectiveUsed < freeLimit;

    return {
      allowed,
      used: effectiveUsed,
      limit: freeLimit,
      warning: !allowed
        ? "You've used your free optimization. Upgrade to Pro for unlimited audits — $9.99/mo."
        : null,
      showCounter: false,
    };
  },

  /** Increment the usage counter. Call AFTER a successful AI call. */
  async recordAiUsage(isPaid: boolean): Promise<void> {
    const month = currentMonthKey();
    const usage = await aiUsage.getValue();

    const newCount = usage.month === month ? usage.count + 1 : 1;
    await aiUsage.setValue({ month, count: newCount });

    // Also track free-tier lifetime usage (for install-month allotment)
    if (!isPaid) {
      const used = await freeAuditsUsed.getValue();
      await freeAuditsUsed.setValue(used + 1);
    }
  },

  /** Get current usage stats (for UI display). */
  async getAiUsageStats(isPaid: boolean) {
    return this.checkAiUsage(isPaid);
  },

  // -------------------------------------------------------------------------
  // AI result cache — persist reports across tab switches
  // -------------------------------------------------------------------------

  /** Save an AI optimization result for a listing. */
  async cacheAiResult(listingId: string, result: Record<string, unknown>): Promise<void> {
    const cache = await aiResultCache.getValue();
    cache[listingId] = { listingId, result, timestamp: Date.now() };
    // Evict oldest if over limit
    const keys = Object.keys(cache);
    if (keys.length > MAX_AI_CACHE) {
      const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
      for (const key of sorted.slice(0, keys.length - MAX_AI_CACHE)) {
        delete cache[key];
      }
    }
    await aiResultCache.setValue(cache);
  },

  /** Get a cached AI result for a listing (or null). */
  async getCachedAiResult(listingId: string): Promise<Record<string, unknown> | null> {
    const cache = await aiResultCache.getValue();
    const entry = cache[listingId];
    if (!entry) return null;
    // Expire after 24 hours
    if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) return null;
    return entry.result;
  },

  // -------------------------------------------------------------------------
  // Review prompt
  // -------------------------------------------------------------------------

  async shouldShowReviewPrompt(): Promise<boolean> {
    const dismissed = await reviewPromptDismissed.getValue();
    if (dismissed) return false;
    const total = await totalAuditsCompleted.getValue();
    return total >= 1;
  },

  async dismissReviewPrompt(): Promise<void> {
    await reviewPromptDismissed.setValue(true);
  },

  async incrementAuditsCompleted(): Promise<number> {
    const total = await totalAuditsCompleted.getValue();
    const next = total + 1;
    await totalAuditsCompleted.setValue(next);
    return next;
  },
};
