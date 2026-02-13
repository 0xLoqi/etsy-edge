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

    // Inject floating grade badge in bottom-right corner
    injectGradeBadge(seoScore.grade, seoScore.score);
  },
});

function injectGradeBadge(grade: string, score: number) {
  // Don't inject twice (SPA navigation)
  if (document.getElementById("etsy-edge-badge")) return;

  const gradeColors: Record<string, { bg: string; border: string; text: string }> = {
    A: { bg: "#ecfdf5", border: "#6ee7b7", text: "#065f46" },
    B: { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af" },
    C: { bg: "#fefce8", border: "#fde047", text: "#854d0e" },
    D: { bg: "#fff7ed", border: "#fdba74", text: "#9a3412" },
    F: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b" },
  };

  const colors = gradeColors[grade] || gradeColors.C;

  const badge = document.createElement("button");
  badge.id = "etsy-edge-badge";
  badge.title = `Optimization: ${score}/100 — Click to open Etsy Edge`;
  badge.innerHTML = `
    <span style="font-weight:800;font-size:20px;line-height:1;color:${colors.text}">${grade}</span>
    <span style="font-size:9px;color:#78716c;font-weight:600;letter-spacing:0.5px">ETSY EDGE</span>
  `;

  Object.assign(badge.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "2147483647",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    padding: "10px 14px",
    background: colors.bg,
    border: `2px solid ${colors.border}`,
    borderRadius: "12px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    outline: "none",
  });

  badge.addEventListener("mouseenter", () => {
    badge.style.transform = "scale(1.05)";
    badge.style.boxShadow = "0 6px 20px rgba(0,0,0,0.2)";
  });
  badge.addEventListener("mouseleave", () => {
    badge.style.transform = "scale(1)";
    badge.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  });

  badge.addEventListener("click", () => {
    browser.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" }).catch(() => {});
  });

  document.body.appendChild(badge);
}
