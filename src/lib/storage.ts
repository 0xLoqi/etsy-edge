import { storage } from "wxt/utils/storage";

const showTagSpy = storage.defineItem<boolean>("local:showTagSpy", {
  fallback: true,
});

const showSeoScore = storage.defineItem<boolean>("local:showSeoScore", {
  fallback: true,
});

// Cache of scraped tags from every visited listing
const tagCache = storage.defineItem<Record<string, { tags: string[]; title: string; timestamp: number }>>(
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

  /** Save scraped tags from a visited listing. */
  async saveVisitedListing(listingId: string, tags: string[], title: string): Promise<void> {
    const cache = await tagCache.getValue();
    cache[listingId] = { tags, title, timestamp: Date.now() };
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

  /** Get aggregated tag frequency across all visited listings (excluding a given listing). */
  async getCompetitorTagAnalysis(
    excludeListingId: string
  ): Promise<{ tag: string; count: number; percentage: number; listings: number }[]> {
    const cache = await tagCache.getValue();
    const entries = Object.entries(cache).filter(([id]) => id !== excludeListingId);
    if (entries.length === 0) return [];

    const tagCounts: Record<string, number> = {};
    for (const [, entry] of entries) {
      for (const tag of entry.tags) {
        const normalized = tag.toLowerCase().trim();
        tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
      }
    }

    const total = entries.length;
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({
        tag,
        count,
        percentage: Math.round((count / total) * 100),
        listings: total,
      }))
      .sort((a, b) => b.count - a.count);
  },

  /** Get count of visited listings (excluding a given one). */
  async getVisitedCount(excludeListingId: string): Promise<number> {
    const cache = await tagCache.getValue();
    return Object.keys(cache).filter((id) => id !== excludeListingId).length;
  },
};
