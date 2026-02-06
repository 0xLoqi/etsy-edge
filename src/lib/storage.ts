import { storage } from "wxt/utils/storage";

const etsyApiKey = storage.defineItem<string>("local:etsyApiKey", {
  fallback: "",
});

const openaiApiKey = storage.defineItem<string>("local:openaiApiKey", {
  fallback: "",
});

const showTagSpy = storage.defineItem<boolean>("local:showTagSpy", {
  fallback: true,
});

const showSeoScore = storage.defineItem<boolean>("local:showSeoScore", {
  fallback: true,
});

// Cache for API responses to reduce rate limit usage
const tagCache = storage.defineItem<Record<string, { tags: string[]; timestamp: number }>>(
  "local:tagCache",
  { fallback: {} }
);

const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export const appStorage = {
  etsyApiKey,
  openaiApiKey,
  showTagSpy,
  showSeoScore,

  async getCachedTags(listingId: string): Promise<string[] | null> {
    const cache = await tagCache.getValue();
    const entry = cache[listingId];
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.tags;
    }
    return null;
  },

  async setCachedTags(listingId: string, tags: string[]): Promise<void> {
    const cache = await tagCache.getValue();
    cache[listingId] = { tags, timestamp: Date.now() };
    // Keep cache from growing unbounded — evict oldest if > 500 entries
    const keys = Object.keys(cache);
    if (keys.length > 500) {
      const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
      for (const key of sorted.slice(0, keys.length - 500)) {
        delete cache[key];
      }
    }
    await tagCache.setValue(cache);
  },
};
