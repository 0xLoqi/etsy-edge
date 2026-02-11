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
};
