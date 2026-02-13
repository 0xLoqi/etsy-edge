import type { PageListingData } from "../types/etsy";

/**
 * Extract related search / tag data from an Etsy listing page.
 * Uses multiple strategies since Etsy changes their DOM frequently.
 * Returns an array of search phrases associated with this listing.
 */
export function extractRelatedSearches(): string[] {
  // Strategy 1: Tag cards (current Etsy layout — "Related searches" section)
  // These are clickable tag pills shown below the listing, using Etsy's wt- design system
  const tagCards = document.querySelectorAll("h3.tag-card-title");
  if (tagCards.length > 0) {
    const tags = Array.from(tagCards)
      .map((el) => el.textContent?.trim() || "")
      .filter((t) => t.length > 0);
    if (tags.length > 0) return tags;
  }

  // Strategy 2: Action group links (alternative Etsy tag layout)
  // Sometimes tags appear as links inside wt-action-group containers
  const actionLinks = document.querySelectorAll(".wt-action-group__item-container a");
  if (actionLinks.length > 0) {
    const tags = Array.from(actionLinks)
      .map((el) => el.textContent?.trim() || "")
      .filter((t) => t.length > 0 && !t.toLowerCase().includes("page"));
    if (tags.length > 0) return tags;
  }

  // Strategy 3: Related searches links (various selector patterns)
  // Etsy sometimes renders these as a grid of links
  const searchSelectors = [
    '[data-appears-component-name="related_searches"] a',
    '[data-appears-component-name*="tag"] a',
    '.related-searches a',
    '.wt-grid a[href*="/search?q="]',
    'a[href*="/search?q="][data-click]',
  ];
  for (const selector of searchSelectors) {
    const links = document.querySelectorAll(selector);
    if (links.length >= 3) {
      const tags = Array.from(links)
        .map((el) => el.textContent?.trim() || "")
        .filter((t) => t.length > 0 && t.length < 60);
      if (tags.length > 0) return tags;
    }
  }

  // Strategy 4: Listzilla spec script (older Etsy format, may still exist)
  const neuScripts = document.querySelectorAll(
    "script[data-neu-spec-placeholder-data]"
  );
  for (const script of neuScripts) {
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

  // Strategy 5: Scan ALL inline script blocks for click_queries or tag arrays
  const allScripts = document.querySelectorAll("script:not([src])");
  for (const script of allScripts) {
    const text = script.textContent || "";

    // Look for click_queries in any JSON structure
    if (text.includes("click_queries")) {
      try {
        const match = text.match(/"click_queries"\s*:\s*(\[[^\]]+\])/);
        if (match) {
          const queries = JSON.parse(match[1]);
          if (Array.isArray(queries) && queries.length > 0) {
            return queries.map(String);
          }
        }
      } catch {
        // Parse error, continue
      }
    }

    // Look for related_tags or tags arrays
    if (text.includes("related_tags") || text.includes('"tags"')) {
      try {
        const match = text.match(/"(?:related_)?tags"\s*:\s*(\[[^\]]*\])/);
        if (match) {
          const tags = JSON.parse(match[1]);
          if (Array.isArray(tags) && tags.length > 0 && typeof tags[0] === "string") {
            return tags;
          }
        }
      } catch {
        // Parse error, continue
      }
    }
  }

  // Strategy 6: Search-link based extraction as last resort
  // Grab all internal Etsy search links near the bottom of the page
  const allSearchLinks = document.querySelectorAll('a[href*="/search?q="]');
  if (allSearchLinks.length > 0) {
    const tags: string[] = [];
    const seen = new Set<string>();
    for (const link of allSearchLinks) {
      const text = link.textContent?.trim() || "";
      const lower = text.toLowerCase();
      // Filter out navigation, pagination, and generic links
      if (
        text.length > 2 &&
        text.length < 60 &&
        !lower.includes("page") &&
        !lower.includes("see more") &&
        !lower.includes("shop") &&
        !seen.has(lower)
      ) {
        seen.add(lower);
        tags.push(text);
      }
    }
    if (tags.length >= 3) return tags;
  }

  return [];
}

/**
 * Extract category breadcrumbs from the page DOM.
 */
export function extractBreadcrumbs(): string[] {
  // Strategy 1: Schema.org BreadcrumbList
  const breadcrumbList = document.querySelector(
    '[itemtype*="BreadcrumbList"]'
  );
  if (breadcrumbList) {
    const links = breadcrumbList.querySelectorAll("a");
    const crumbs = Array.from(links)
      .map((a) => a.textContent?.trim() || "")
      .filter((t) => t.length > 0 && t !== "Homepage");
    if (crumbs.length > 0) return crumbs;
  }

  // Strategy 2: Aria-labeled breadcrumbs
  const ariaNav = document.querySelector(
    '[aria-label*="Breadcrumb"], [aria-label*="breadcrumb"], nav[aria-label*="Category"]'
  );
  if (ariaNav) {
    const links = ariaNav.querySelectorAll("a");
    const crumbs = Array.from(links)
      .map((a) => a.textContent?.trim() || "")
      .filter((t) => t.length > 0 && t !== "Homepage" && t !== "Home");
    if (crumbs.length > 0) return crumbs;
  }

  // Strategy 3: Class-based breadcrumbs (Etsy's wt- system)
  const wtBreadcrumbs = document.querySelectorAll(
    '.wt-action-group--nowrap a, [class*="breadcrumb"] a'
  );
  if (wtBreadcrumbs.length > 0) {
    const crumbs = Array.from(wtBreadcrumbs)
      .map((a) => a.textContent?.trim() || "")
      .filter((t) => t.length > 0 && t !== "Homepage" && t !== "Home");
    if (crumbs.length > 0) return crumbs;
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
