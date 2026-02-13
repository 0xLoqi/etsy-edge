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

const FREE_INITIAL_AUDITS = 3; // free audits on install
const FREE_MONTHLY_AUDITS = 1; // free audits per month after initial
const PAID_MONTHLY_CAP = 200;

/** Warning thresholds for paid users (only shown when count >= threshold) */
const PAID_WARN_THRESHOLDS = [100, 150, 175, 190, 195];

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

  /**
   * Get aggregated search term frequency from visited listings in the same category.
   * Falls back to all listings if no same-category matches found.
   */
  async getCompetitorTagAnalysis(
    excludeListingId: string,
    currentCategory: string
  ): Promise<{
    tags: { tag: string; count: number; percentage: number }[];
    listingsAnalyzed: number;
    categoryMatch: boolean;
  }> {
    const cache = await tagCache.getValue();
    const allEntries = Object.entries(cache).filter(([id]) => id !== excludeListingId);
    if (allEntries.length === 0) {
      return { tags: [], listingsAnalyzed: 0, categoryMatch: false };
    }

    // Try same-category first
    const categoryNorm = currentCategory.toLowerCase().trim();
    const sameCat = categoryNorm
      ? allEntries.filter(([, e]) => e.category.toLowerCase().trim() === categoryNorm)
      : [];

    const entries = sameCat.length >= 2 ? sameCat : allEntries;
    const categoryMatch = sameCat.length >= 2 && categoryNorm.length > 0;

    const tagCounts: Record<string, number> = {};
    for (const [, entry] of entries) {
      for (const tag of entry.tags) {
        const normalized = tag.toLowerCase().trim();
        tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
      }
    }

    const total = entries.length;
    const tags = Object.entries(tagCounts)
      .map(([tag, count]) => ({
        tag,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return { tags, listingsAnalyzed: total, categoryMatch };
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
      const remaining = PAID_MONTHLY_CAP - monthlyCount;
      const allowed = remaining > 0;

      // Progressive warnings
      let warning: string | null = null;
      let showCounter = false;

      if (monthlyCount >= 195) {
        warning = `You've used ${monthlyCount} of ${PAID_MONTHLY_CAP} optimizations this month. Only ${remaining} left.`;
        showCounter = true;
      } else if (monthlyCount >= 190) {
        warning = `${remaining} optimizations remaining this month.`;
        showCounter = true;
      } else if (monthlyCount >= 175) {
        warning = `You've used ${monthlyCount} optimizations this month. ${remaining} remaining.`;
        showCounter = true;
      } else if (monthlyCount >= 150) {
        warning = `${remaining} optimizations remaining this month.`;
        showCounter = false;
      } else if (monthlyCount >= 100) {
        warning = `You've used ${monthlyCount} of your ${PAID_MONTHLY_CAP} monthly optimizations.`;
        showCounter = false;
      }

      return { allowed, used: monthlyCount, limit: PAID_MONTHLY_CAP, warning, showCounter };
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
        ? "You've used all your free optimizations. Upgrade to Pro for 200/month."
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
};
