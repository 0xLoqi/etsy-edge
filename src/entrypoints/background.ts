import { getAiTagSuggestions } from "../lib/ai-suggestions";
import { appStorage } from "../lib/storage";
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
    // --- Payment ---

    case "CHECK_PAID_STATUS": {
      const paid = await isPaidUser();
      return { success: true, data: { paid } };
    }

    case "OPEN_PAYMENT_PAGE": {
      openPaymentPage();
      return { success: true, data: null };
    }

    // --- Free features (local, no API needed) ---

    case "GET_COMPETITOR_ANALYSIS": {
      const analysis = await appStorage.getCompetitorTagAnalysis(
        message.excludeListingId as string
      );
      const count = await appStorage.getVisitedCount(
        message.excludeListingId as string
      );
      return { success: true, data: { tags: analysis, listingsAnalyzed: count } };
    }

    // --- Paid features (gated) ---

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
