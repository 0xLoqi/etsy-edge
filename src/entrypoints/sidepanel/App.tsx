import { useState, useEffect } from "react";
import type { PageListingData } from "../../types/etsy";
import type { SeoScore } from "../../types/extension";
import TagSpyPanel from "../../components/TagSpyPanel";

interface ListingData {
  listingId: string;
  pageData: PageListingData | null;
  topSearches: string[];
  relatedSearches: string[];
  seoScore: SeoScore;
  breadcrumbs: string[];
}

export default function App() {
  const [data, setData] = useState<ListingData | null>(null);
  const [isEtsyPage, setIsEtsyPage] = useState(true);

  useEffect(() => {
    // Listen for listing data pushed from background/content script
    const handler = (message: Record<string, unknown>) => {
      if (message.type === "LISTING_DATA") {
        setData(message.data as ListingData);
        setIsEtsyPage(true);
      } else if (message.type === "NOT_LISTING_PAGE") {
        setData(null);
        setIsEtsyPage(message.isEtsy as boolean ?? false);
      }
    };

    browser.runtime.onMessage.addListener(handler);

    // Ask for data on the current tab immediately
    browser.runtime.sendMessage({ type: "REQUEST_LISTING_DATA" }).catch(() => {});

    return () => {
      browser.runtime.onMessage.removeListener(handler);
    };
  }, []);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white px-6 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <div className="text-lg font-bold text-gray-800 mb-2">Etsy Edge</div>
        {isEtsyPage ? (
          <p className="text-sm text-gray-500 leading-relaxed">
            Navigate to an Etsy listing page to see tags, SEO score, and optimization insights.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Open any Etsy listing page to get started.
            </p>
            <button
              onClick={() => {
                browser.tabs.create({ url: "https://www.etsy.com" });
              }}
              className="px-5 py-2.5 bg-[#f56400] hover:bg-[#d95700] text-white text-sm font-semibold rounded-full transition-colors"
            >
              Go to Etsy
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-white">
      <TagSpyPanel
        listingId={data.listingId}
        pageData={data.pageData}
        topSearches={data.topSearches}
        relatedSearches={data.relatedSearches}
        seoScore={data.seoScore}
        breadcrumbs={data.breadcrumbs}
      />
    </div>
  );
}
