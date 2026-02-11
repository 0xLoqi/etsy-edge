import { useState } from "react";
import type { PageListingData } from "../types/etsy";
import type { SeoScore, TagSuggestion } from "../types/extension";
import { usePaidStatus } from "../hooks/usePaidStatus";
import SeoScoreCard from "./SeoScoreCard";
import UpgradePrompt from "./UpgradePrompt";

interface Props {
  listingId: string;
  pageData: PageListingData | null;
  /** Top ~13 related searches (closest proxy for seller tags) */
  topSearches: string[];
  /** Full 200+ related search phrases from Etsy */
  relatedSearches: string[];
  seoScore: SeoScore;
  breadcrumbs: string[];
}

type Tab = "tags" | "ai" | "competitors";

export default function TagSpyPanel({ listingId, pageData, topSearches, relatedSearches, seoScore, breadcrumbs }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [showAllSearches, setShowAllSearches] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("tags");

  // Paid feature state
  const { isPaid, openUpgrade } = usePaidStatus();
  const [aiSuggestions, setAiSuggestions] = useState<TagSuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [competitorTags, setCompetitorTags] = useState<{ tag: string; count: number; percentage: number }[]>([]);
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [listingsAnalyzed, setListingsAnalyzed] = useState(0);

  async function loadAiSuggestions() {
    if (!pageData) return;
    setAiLoading(true);
    try {
      const response = await browser.runtime.sendMessage({
        type: "GET_AI_SUGGESTIONS",
        title: pageData.title,
        description: pageData.description,
        category: breadcrumbs.join(" > "),
        currentTags: topSearches,
        competitorTags: competitorTags.slice(0, 20).map((t) => t.tag),
      });
      if (response.success) {
        setAiSuggestions(response.data);
      } else if (response.error === "UPGRADE_REQUIRED") {
        // handled by UI
      }
    } catch {
      // handled by UI
    } finally {
      setAiLoading(false);
    }
  }

  async function loadCompetitorTags() {
    setCompetitorLoading(true);
    try {
      const response = await browser.runtime.sendMessage({
        type: "GET_COMPETITOR_ANALYSIS",
        excludeListingId: listingId,
      });
      if (response.success) {
        setCompetitorTags(response.data.tags);
        setListingsAnalyzed(response.data.listingsAnalyzed);
      }
    } catch {
      // handled by UI
    } finally {
      setCompetitorLoading(false);
    }
  }

  const copyTag = (tag: string, idx: number) => {
    navigator.clipboard.writeText(tag);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const displayedSearches = showAllSearches ? relatedSearches : topSearches;

  const copyAllTags = () => {
    navigator.clipboard.writeText(displayedSearches.join(", "));
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 1500);
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 10000,
          background: "#ea580c",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: "48px",
          height: "48px",
          cursor: "pointer",
          fontSize: "18px",
          fontWeight: "bold",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        }}
        title="Open Etsy Edge"
      >
        EE
      </button>
    );
  }

  const tabStyle = (tab: Tab) => ({
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: activeTab === tab ? 700 : 400,
    color: activeTab === tab ? "#ea580c" : "#6b7280",
    background: activeTab === tab ? "#fff7ed" : "transparent",
    border: "none",
    borderBottom: activeTab === tab ? "2px solid #ea580c" : "2px solid transparent",
    cursor: "pointer" as const,
  });

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 10000,
        width: "380px",
        maxHeight: "80vh",
        overflowY: "auto",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "14px",
        color: "#1a1a1a",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          background: "#fff7ed",
          borderRadius: "12px 12px 0 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 700, color: "#ea580c", fontSize: "15px" }}>
            Etsy Edge
          </span>
          {isPaid && (
            <span
              style={{
                fontSize: "10px",
                background: "#ea580c",
                color: "white",
                padding: "1px 6px",
                borderRadius: "9999px",
                fontWeight: 600,
              }}
            >
              PRO
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "18px",
            color: "#9ca3af",
            padding: "0 4px",
          }}
          title="Minimize"
        >
          &minus;
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e5e7eb",
          padding: "0 8px",
        }}
      >
        <button onClick={() => setActiveTab("tags")} style={tabStyle("tags")}>
          Tags
        </button>
        <button
          onClick={() => {
            setActiveTab("ai");
            if (isPaid && aiSuggestions.length === 0 && !aiLoading) loadAiSuggestions();
          }}
          style={tabStyle("ai")}
        >
          AI Suggest
        </button>
        <button
          onClick={() => {
            setActiveTab("competitors");
            if (competitorTags.length === 0 && !competitorLoading) loadCompetitorTags();
          }}
          style={tabStyle("competitors")}
        >
          Competitors
        </button>
      </div>

      <div style={{ padding: "16px" }}>
        {/* === TAGS TAB === */}
        {activeTab === "tags" && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: "13px", color: "#6b7280" }}>
                {showAllSearches
                  ? `${relatedSearches.length} related searches`
                  : `Top ${topSearches.length} related searches`}
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {relatedSearches.length > 13 && (
                  <button
                    onClick={() => {
                      setShowAllSearches(!showAllSearches);
                      setCopiedIdx(null);
                    }}
                    style={{
                      background: "none",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "12px",
                      cursor: "pointer",
                      color: "#6b7280",
                    }}
                  >
                    {showAllSearches ? "Top 13" : `All ${relatedSearches.length}`}
                  </button>
                )}
                <button
                  onClick={copyAllTags}
                  style={{
                    background: "none",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    cursor: "pointer",
                    color: allCopied ? "#16a34a" : "#6b7280",
                  }}
                >
                  {allCopied ? "Copied!" : "Copy All"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
              {displayedSearches.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => copyTag(tag, i)}
                  style={{
                    background: copiedIdx === i ? "#dcfce7" : "#f3f4f6",
                    border: copiedIdx === i ? "1px solid #86efac" : "1px solid #e5e7eb",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "13px",
                    cursor: "pointer",
                    color: copiedIdx === i ? "#16a34a" : "#374151",
                    transition: "all 0.15s",
                  }}
                  title="Click to copy"
                >
                  {copiedIdx === i ? "Copied!" : tag}
                </button>
              ))}
              {relatedSearches.length === 0 && (
                <span style={{ color: "#9ca3af", fontSize: "13px" }}>
                  No related searches found for this listing
                </span>
              )}
            </div>

            {seoScore && <SeoScoreCard score={seoScore} />}

            {pageData && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "8px 12px",
                  background: "#f9fafb",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#6b7280",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "2px" }}>
                  {pageData.title.slice(0, 80)}
                  {pageData.title.length > 80 ? "..." : ""}
                </div>
                <div>
                  {pageData.price} {pageData.currency}
                  {pageData.rating && ` | ${pageData.rating} stars`}
                </div>
              </div>
            )}
          </>
        )}

        {/* === AI SUGGESTIONS TAB === */}
        {activeTab === "ai" && (
          <>
            {!isPaid ? (
              <UpgradePrompt feature="AI-Powered Tag Suggestions" onUpgrade={openUpgrade} />
            ) : aiLoading ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>
                Generating AI suggestions...
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px" }}>
                  AI-optimized tags for this listing:
                </div>
                {aiSuggestions.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "8px 10px",
                      background: i % 2 === 0 ? "#f9fafb" : "white",
                      borderRadius: "6px",
                      marginBottom: "4px",
                    }}
                  >
                    <div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(s.tag);
                        }}
                        style={{
                          background: "#f3f4f6",
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          fontSize: "13px",
                          cursor: "pointer",
                          color: "#374151",
                          fontWeight: 500,
                        }}
                        title="Click to copy"
                      >
                        {s.tag}
                      </button>
                      <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "3px" }}>
                        {s.reason}
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={loadAiSuggestions}
                  style={{
                    width: "100%",
                    marginTop: "10px",
                    padding: "8px",
                    background: "none",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                    color: "#6b7280",
                  }}
                >
                  Regenerate suggestions
                </button>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>
                <button
                  onClick={loadAiSuggestions}
                  style={{
                    background: "#ea580c",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "10px 20px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Generate AI Tag Suggestions
                </button>
              </div>
            )}
          </>
        )}

        {/* === COMPETITORS TAB === */}
        {activeTab === "competitors" && (
          <>
            {competitorLoading ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>
                Analyzing visited listings...
              </div>
            ) : competitorTags.length > 0 ? (
              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px" }}>
                  Most common tags across {listingsAnalyzed} visited listing{listingsAnalyzed !== 1 ? "s" : ""}:
                </div>
                {competitorTags.slice(0, 20).map((t, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 0",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(t.percentage, 8)}%`,
                        height: "20px",
                        background: i < 5 ? "#fed7aa" : "#f3f4f6",
                        borderRadius: "4px",
                        minWidth: "30px",
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: "6px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: i < 5 ? "#9a3412" : "#6b7280",
                      }}
                    >
                      {t.percentage}%
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(t.tag)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: "#374151",
                        padding: 0,
                      }}
                      title="Click to copy"
                    >
                      {t.tag}
                    </button>
                  </div>
                ))}
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "8px" }}>
                  Visit more competitor listings to improve analysis.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
                  Browse competitor listings to build your analysis.
                  Etsy Edge automatically captures tags from every listing you visit.
                </div>
                <button
                  onClick={loadCompetitorTags}
                  style={{
                    background: "#ea580c",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "10px 20px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Check Visited Listings
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
