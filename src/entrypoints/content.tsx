import { extractListingId, extractJsonLd, extractRelatedSearches, extractBreadcrumbs } from "../lib/extractors";
import { scoreListing } from "../lib/seo-scorer";
import { appStorage } from "../lib/storage";

export default defineContentScript({
  matches: ["*://*.etsy.com/listing/*"],

  async main() {
    const listingId = extractListingId(window.location.href);
    if (!listingId) return;

    // Scrape everything from the DOM — no API needed
    const pageData = extractJsonLd();
    const relatedSearches = extractRelatedSearches();
    const breadcrumbs = extractBreadcrumbs();

    // Top searches are the closest proxy for seller tags
    const topSearches = relatedSearches.slice(0, 13);

    // Use the deepest breadcrumb as primary category
    const primaryCategory = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1] : breadcrumbs[0] || "";

    // Save for competitor analysis later
    if (relatedSearches.length > 0) {
      await appStorage.saveVisitedListing(listingId, relatedSearches, pageData?.title || "", primaryCategory);
    }

    // Score locally using scraped data
    const seoScore = scoreListing({
      title: pageData?.title || "",
      description: pageData?.description || "",
      relatedSearches,
    });

    const listingData = {
      listingId,
      pageData,
      topSearches,
      relatedSearches,
      seoScore,
      breadcrumbs,
    };

    // Send the scraped data to the background so it can relay to the side panel
    browser.runtime.sendMessage({
      type: "CONTENT_LISTING_DATA",
      data: listingData,
    }).catch(() => {
      // Side panel might not be open yet, that's fine
    });

    // Also respond to on-demand requests (when side panel opens after page load)
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "PING_CONTENT") {
        // Re-send listing data to background for relay
        browser.runtime.sendMessage({
          type: "CONTENT_LISTING_DATA",
          data: listingData,
        }).catch(() => {});
      }
    });
  },
});
