import type { PageListingData } from "../types/etsy";

/**
 * Extract listing ID from an Etsy URL.
 * Handles: /listing/1234567890/some-title
 */
export function extractListingId(url: string): string | null {
  const match = url.match(/\/listing\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Check if current URL is an Etsy listing page.
 */
export function isListingPage(url: string): boolean {
  return /^https:\/\/(www\.)?etsy\.com\/listing\/\d+/.test(url);
}

/**
 * Check if current URL is the Etsy seller listing editor.
 */
export function isListingEditor(url: string): boolean {
  return /^https:\/\/(www\.)?etsy\.com\/your\/shops\/me\/tools\/listings\/\d+/.test(url);
}

/**
 * Check if current URL is any Etsy page we care about.
 */
export function isEtsyPage(url: string): boolean {
  return /^https:\/\/(www\.)?etsy\.com\//.test(url);
}

/**
 * Extract listing data from JSON-LD structured data in the page.
 */
export function extractJsonLd(): PageListingData | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || "");

      // Could be an array or single object
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item["@type"] === "Product") {
          return {
            listingId: extractListingId(window.location.href) || "",
            title: item.name || "",
            description: item.description || "",
            price: item.offers?.price || item.offers?.[0]?.price || "",
            currency: item.offers?.priceCurrency || item.offers?.[0]?.priceCurrency || "USD",
            rating: item.aggregateRating?.ratingValue || null,
            reviewCount: item.aggregateRating?.reviewCount || null,
            imageUrl: item.image || null,
          };
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return null;
}
