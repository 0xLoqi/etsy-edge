import ReactDOM from "react-dom/client";
import { extractListingId, isListingPage, extractJsonLd } from "../lib/extractors";
import TagSpyPanel from "../components/TagSpyPanel";
import "../app.css";

export default defineContentScript({
  matches: ["*://*.etsy.com/listing/*"],
  cssInjectionMode: "ui",

  async main(ctx) {
    const listingId = extractListingId(window.location.href);
    if (!listingId) return;

    const pageData = extractJsonLd();

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
