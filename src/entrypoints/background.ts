import { fetchListingTags, searchListings, analyzeCompetitorTags, fetchListing } from "../lib/etsy-api";
import { getAiTagSuggestions } from "../lib/ai-suggestions";
import { scoreListing } from "../lib/seo-scorer";
import { initPayment, isPaidUser, openPaymentPage } from "../lib/payment";

export default defineBackground(() => {
  // Initialize ExtensionPay payment listener
  initPayment();

  // Handle messages from content script and popup
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse).catch((err) =>
      sendResponse({ success: false, error: err.message })
    );
    return true; // Keep channel open for async response
  });
});

async function handleMessage(message: Record<string, unknown>) {
  switch (message.type) {
    // --- Free features ---

    case "FETCH_TAGS": {
      const tags = await fetchListingTags(message.listingId as string);
      return { success: true, data: { tags } };
    }

    case "FETCH_LISTING": {
      const listing = await fetchListing(message.listingId as string);
      return { success: true, data: listing };
    }

    case "SCORE_LISTING": {
      const listing = await fetchListing(message.listingId as string);
      const score = scoreListing({
        title: listing.title,
        description: listing.description || "",
        tags: listing.tags,
      });
      return { success: true, data: score };
    }

    // --- Payment ---

    case "CHECK_PAID_STATUS": {
      const paid = await isPaidUser();
      return { success: true, data: { paid } };
    }

    case "OPEN_PAYMENT_PAGE": {
      openPaymentPage();
      return { success: true, data: null };
    }

    // --- Paid features (gated) ---

    case "SEARCH_LISTINGS": {
      const paid = await isPaidUser();
      if (!paid) return { success: false, error: "UPGRADE_REQUIRED" };
      const results = await searchListings(
        message.keyword as string,
        (message.limit as number) || 25
      );
      return { success: true, data: results };
    }

    case "ANALYZE_COMPETITORS": {
      const paid = await isPaidUser();
      if (!paid) return { success: false, error: "UPGRADE_REQUIRED" };
      const analysis = await analyzeCompetitorTags(
        message.keyword as string,
        (message.limit as number) || 20
      );
      return { success: true, data: analysis };
    }

    case "GET_AI_SUGGESTIONS": {
      const paid = await isPaidUser();
      if (!paid) return { success: false, error: "UPGRADE_REQUIRED" };
      const suggestions = await getAiTagSuggestions({
        title: message.title as string,
        description: message.description as string,
        category: message.category as string,
        currentTags: message.currentTags as string[],
        competitorTags: message.competitorTags as string[],
      });
      return { success: true, data: suggestions };
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}
