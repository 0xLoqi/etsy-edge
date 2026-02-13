import { getAiOptimization } from "../lib/ai-suggestions";
import { initPayment, isPaidUser, openPaymentPage } from "../lib/payment";
import { appStorage } from "../lib/storage";

// Set to true to bypass payment checks during development/testing.
// IMPORTANT: Set back to false before publishing to Chrome Web Store!
const DEV_BYPASS_PAYMENT = false;

// Cache the last listing data so we can push it when the side panel opens
let lastListingData: Record<string, unknown> | null = null;

export default defineBackground(() => {
  // Initialize ExtensionPay payment listener
  initPayment();

  // Record install timestamp on first run
  appStorage.ensureInstallTimestamp();

  // Open the side panel when the extension icon is clicked
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Handle messages from content script, side panel, and popup
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse).catch((err) =>
      sendResponse({ success: false, error: err.message })
    );
    return true; // Keep channel open for async response
  });

  // When the active tab changes, ask the content script for data
  browser.tabs.onActivated.addListener(async (activeInfo) => {
    lastListingData = null;
    try {
      const tab = await browser.tabs.get(activeInfo.tabId);
      if (tab.url && /etsy\.com\/listing\//.test(tab.url)) {
        // Ping the content script to re-send its data
        browser.tabs.sendMessage(activeInfo.tabId, { type: "PING_CONTENT" }).catch(() => {});
      } else {
        // Not a listing page — tell the side panel
        const isEtsy = tab.url ? /etsy\.com/.test(tab.url) : false;
        broadcastToSidePanel({ type: "NOT_LISTING_PAGE", isEtsy });
      }
    } catch {
      // Tab might not exist
    }
  });

  // When a tab navigates, check if we need to update
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete") return;
    // Only care about the active tab
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || activeTab.id !== tabId) return;

    if (tab.url && /etsy\.com\/listing\//.test(tab.url)) {
      // Content script will fire and send data, but give it a moment
      setTimeout(() => {
        browser.tabs.sendMessage(tabId, { type: "PING_CONTENT" }).catch(() => {});
      }, 500);
    } else {
      lastListingData = null;
      const isEtsy = tab.url ? /etsy\.com/.test(tab.url) : false;
      broadcastToSidePanel({ type: "NOT_LISTING_PAGE", isEtsy });
    }
  });
});

/** Send a message to the side panel (it's a runtime context, not a tab) */
async function broadcastToSidePanel(message: Record<string, unknown>) {
  try {
    await browser.runtime.sendMessage(message);
  } catch {
    // Side panel might not be open
  }
}

async function handleMessage(
  message: Record<string, unknown>,
  _sender: browser.Runtime.MessageSender
) {
  switch (message.type) {
    // --- Content script pushes listing data ---

    case "CONTENT_LISTING_DATA": {
      lastListingData = message.data as Record<string, unknown>;
      // Relay to side panel
      broadcastToSidePanel({ type: "LISTING_DATA", data: message.data });
      return { success: true };
    }

    // --- Side panel requests listing data on open ---

    case "REQUEST_LISTING_DATA": {
      if (lastListingData) {
        // We have cached data, send it directly
        broadcastToSidePanel({ type: "LISTING_DATA", data: lastListingData });
        return { success: true };
      }
      // No cached data — ping the active tab's content script
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && tab.url && /etsy\.com\/listing\//.test(tab.url)) {
          browser.tabs.sendMessage(tab.id, { type: "PING_CONTENT" }).catch(() => {});
        } else {
          const isEtsy = tab?.url ? /etsy\.com/.test(tab.url) : false;
          broadcastToSidePanel({ type: "NOT_LISTING_PAGE", isEtsy });
        }
      } catch {
        broadcastToSidePanel({ type: "NOT_LISTING_PAGE", isEtsy: false });
      }
      return { success: true };
    }

    // --- Payment ---

    case "CHECK_PAID_STATUS": {
      const paid = DEV_BYPASS_PAYMENT || await isPaidUser();
      return { success: true, data: { paid } };
    }

    case "OPEN_PAYMENT_PAGE": {
      openPaymentPage();
      return { success: true, data: null };
    }

    case "OPEN_SIDE_PANEL": {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.windowId) {
          await (browser.sidePanel as any).open({ windowId: tab.windowId });
        }
      } catch {
        // Side panel may already be open or API not available
      }
      return { success: true };
    }

    // --- AI result cache ---

    case "GET_CACHED_AI_RESULT": {
      const cached = await appStorage.getCachedAiResult(message.listingId as string);
      return { success: true, data: cached };
    }

    case "CACHE_AI_RESULT": {
      await appStorage.cacheAiResult(
        message.listingId as string,
        message.result as Record<string, unknown>
      );
      return { success: true };
    }

    // --- AI usage stats ---

    case "CHECK_AI_USAGE": {
      const paid = DEV_BYPASS_PAYMENT || await isPaidUser();
      const usage = await appStorage.checkAiUsage(paid);
      return { success: true, data: usage };
    }

    // --- Paid features (gated) ---

    case "GET_AI_OPTIMIZATION": {
      const paid = DEV_BYPASS_PAYMENT || await isPaidUser();

      // Check usage cap before calling AI
      const usage = await appStorage.checkAiUsage(paid);
      if (!usage.allowed) {
        return { success: false, error: "LIMIT_REACHED", data: usage };
      }

      const optimization = await getAiOptimization({
        title: message.title as string,
        description: message.description as string,
        category: message.category as string,
        currentTags: message.currentTags as string[],
        scoreBreakdown: message.scoreBreakdown as Record<string, { score: number; max: number; detail: string }>,
        currentGrade: message.currentGrade as string,
        currentScore: message.currentScore as number,
      });

      // Record the usage AFTER successful call
      await appStorage.recordAiUsage(paid);

      // Re-check to get updated warning info
      const updatedUsage = await appStorage.checkAiUsage(paid);

      return { success: true, data: optimization, usage: updatedUsage };
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}
