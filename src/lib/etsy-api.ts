import type { EtsyListing, EtsySearchResult } from "../types/etsy";
import { appStorage } from "./storage";

const BASE_URL = "https://openapi.etsy.com/v3/application";

async function getApiKey(): Promise<string> {
  const key = await appStorage.etsyApiKey.getValue();
  if (!key) throw new Error("Etsy API key not configured. Go to extension settings.");
  return key;
}

async function fetchEtsy<T>(endpoint: string): Promise<T> {
  const apiKey = await getApiKey();
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { "x-api-key": apiKey },
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limited. Try again in a moment.");
    if (res.status === 404) throw new Error("Listing not found.");
    throw new Error(`Etsy API error: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch a single listing by ID. Returns tags, title, views, favorites, etc.
 */
export async function fetchListing(listingId: string): Promise<EtsyListing> {
  return fetchEtsy<EtsyListing>(`/listings/${listingId}`);
}

/**
 * Fetch tags for a listing, with caching.
 */
export async function fetchListingTags(listingId: string): Promise<string[]> {
  // Check cache first
  const cached = await appStorage.getCachedTags(listingId);
  if (cached) return cached;

  const listing = await fetchListing(listingId);
  await appStorage.setCachedTags(listingId, listing.tags);
  return listing.tags;
}

/**
 * Search active listings by keyword.
 */
export async function searchListings(
  keyword: string,
  limit = 25
): Promise<EtsySearchResult> {
  const encoded = encodeURIComponent(keyword);
  return fetchEtsy<EtsySearchResult>(
    `/listings/active?keywords=${encoded}&limit=${limit}&sort_on=score`
  );
}

/**
 * Fetch multiple listings' tags for competitor analysis.
 * Returns aggregated tag frequency data.
 */
export async function analyzeCompetitorTags(
  keyword: string,
  limit = 20
): Promise<{ tag: string; count: number; percentage: number }[]> {
  const results = await searchListings(keyword, limit);
  const tagCounts: Record<string, number> = {};

  for (const listing of results.results) {
    for (const tag of listing.tags) {
      const normalized = tag.toLowerCase().trim();
      tagCounts[normalized] = (tagCounts[normalized] || 0) + 1;
    }
  }

  const total = results.results.length;
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({
      tag,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}
