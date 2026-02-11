import ReactDOM from "react-dom/client";
import { extractListingId, extractJsonLd, extractTags, extractBreadcrumbs } from "../lib/extractors";
import { scoreListing } from "../lib/seo-scorer";
import { appStorage } from "../lib/storage";
import TagSpyPanel from "../components/TagSpyPanel";
import "../app.css";

export default defineContentScript({
  matches: ["*://*.etsy.com/listing/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    const listingId = extractListingId(window.location.href);
    if (!listingId) return;

    // Scrape everything from the DOM — no API needed
    const pageData = extractJsonLd();
    const tags = extractTags();
    const breadcrumbs = extractBreadcrumbs();

    // Save this listing's tags for competitor analysis later
    if (tags.length > 0) {
      await appStorage.saveVisitedListing(listingId, tags, pageData?.title || "");
    }

    // Score locally using scraped data
    const seoScore = scoreListing({
      title: pageData?.title || "",
      description: pageData?.description || "",
      tags,
    });

    // Create shadow root UI container
    const ui = await createShadowRootUi(ctx, {
      name: "etsy-edge-panel",
      position: "inline",
      anchor: "body",
      onMount: (container) => {
        const app = document.createElement("div");
        app.id = "etsy-edge-root";
        container.append(app);

        const root = ReactDOM.createRoot(app);
        root.render(
          <TagSpyPanel
            listingId={listingId}
            pageData={pageData}
            tags={tags}
            seoScore={seoScore}
            breadcrumbs={breadcrumbs}
          />
        );
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
