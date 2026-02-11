import type { PageListingData } from "../types/etsy";

/**
 * Extract related search queries from the page source.
 * Etsy embeds these in a Listzilla spec script as "click_queries".
 * These are Etsy-generated search phrases derived from the listing's
 * tags, title, and category — NOT the seller's actual 13 tags (those
 * are API-only). The first ~13 are the closest to real tags.
 */
export function extractRelatedSearches(): string[] {
  const scripts = document.querySelectorAll(
    'script[data-neu-spec-placeholder-data]'
  );

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || "");
      if (
        data.spec_name === "Listzilla_ApiSpecs_Tags_Landing" &&
        Array.isArray(data.args?.click_queries)
      ) {
        return data.args.click_queries;
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return [];
}

/**
 * Extract category breadcrumbs from the page DOM.
 */
export function extractBreadcrumbs(): string[] {
  // Etsy uses structured breadcrumbs with an ol/li pattern
  const breadcrumbList = document.querySelector(
    '[itemtype*="BreadcrumbList"], [aria-label*="Breadcrumb"], [class*="breadcrumb"]'
  );
  if (breadcrumbList) {
    const links = breadcrumbList.querySelectorAll("a");
    return Array.from(links)
      .map((a) => a.textContent?.trim() || "")
      .filter((t) => t.length > 0 && t !== "Homepage");
  }
  return [];
}

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
