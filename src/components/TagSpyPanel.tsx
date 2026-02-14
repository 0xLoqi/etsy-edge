import { useState, useEffect } from "react";
import type { PageListingData } from "../types/etsy";
import type { SeoScore, AiOptimization } from "../types/extension";
import { usePaidStatus } from "../hooks/usePaidStatus";
import SeoScoreCard from "./SeoScoreCard";
import UpgradePrompt from "./UpgradePrompt";

interface Props {
  listingId: string;
  pageData: PageListingData | null;
  topSearches: string[];
  relatedSearches: string[];
  seoScore: SeoScore;
  breadcrumbs: string[];
}

type Tab = "tags" | "ai";

export default function TagSpyPanel({ listingId, pageData, topSearches, relatedSearches, seoScore, breadcrumbs }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [showAllSearches, setShowAllSearches] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("tags");

  // Paid feature state
  const { isPaid, openUpgrade } = usePaidStatus();
  const [aiResult, setAiResult] = useState<AiOptimization | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedAllTags, setCopiedAllTags] = useState(false);
  const [copiedTagIdx, setCopiedTagIdx] = useState<number | null>(null);
  const [showDiagnosis, setShowDiagnosis] = useState(false);

  // Usage tracking
  const [usageWarning, setUsageWarning] = useState<string | null>(null);
  const [usageCounter, setUsageCounter] = useState<{ used: number; limit: number } | null>(null);
  const [showCounter, setShowCounter] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [showFreeConfirm, setShowFreeConfirm] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  // On mount: restore cached AI result + fetch current usage stats
  useEffect(() => {
    // Restore cached AI result for this listing
    browser.runtime.sendMessage({ type: "GET_CACHED_AI_RESULT", listingId })
      .then((res) => {
        if (res?.success && res.data) {
          setAiResult(res.data as AiOptimization);
        }
      })
      .catch(() => {});

    // Fetch current usage stats
    browser.runtime.sendMessage({ type: "CHECK_AI_USAGE" })
      .then((res) => {
        if (res?.success && res.data) {
          const u = res.data as { used: number; limit: number; warning: string | null; showCounter: boolean };
          setUsageCounter({ used: u.used, limit: u.limit });
          setShowCounter(u.showCounter);
          if (u.warning) setUsageWarning(u.warning);
        }
      })
      .catch(() => {});
  }, [listingId]);

  async function loadAiOptimization() {
    if (!pageData) return;
    setAiLoading(true);
    setAiError(null);
    setUsageWarning(null);
    try {
      const response = await browser.runtime.sendMessage({
        type: "GET_AI_OPTIMIZATION",
        title: pageData.title,
        description: pageData.description,
        category: breadcrumbs.join(" > "),
        currentTags: topSearches,
        scoreBreakdown: seoScore.breakdown,
        currentGrade: seoScore.grade,
        currentScore: seoScore.score,
      });
      if (response.success) {
        const result = response.data as AiOptimization;
        setAiResult(result);
        // Persist to cache so tab switching doesn't lose it
        browser.runtime.sendMessage({
          type: "CACHE_AI_RESULT",
          listingId,
          result,
        }).catch(() => {});
        // Update usage info
        if (response.usage) {
          const u = response.usage as { used: number; limit: number; warning: string | null; showCounter: boolean };
          setUsageWarning(u.warning);
          setShowCounter(u.showCounter);
          setUsageCounter({ used: u.used, limit: u.limit });
        }
      } else if (response.error === "LIMIT_REACHED") {
        const u = response.data as { used: number; limit: number } | undefined;
        if (u) setUsageCounter({ used: u.used, limit: u.limit });
        if (isPaid) {
          // Silent cap hit — don't reveal limits, just show a generic message
          setAiError("Something went wrong. Please try again later.");
        } else {
          setLimitReached(true);
          setAiError("Free audit used.");
        }
      } else if (response.error === "UPGRADE_REQUIRED") {
        setAiError("upgrade");
      } else {
        setAiError(response.error || "Something went wrong");
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Failed to get optimization");
    } finally {
      setAiLoading(false);
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

  // remaining only meaningful for free users (paid = unlimited)
  const remaining = usageCounter && isFinite(usageCounter.limit) ? usageCounter.limit - usageCounter.used : null;

  return (
    <div className="flex flex-col h-full text-sm text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-orange-50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-orange-600 text-[15px]">Etsy Edge</span>
          {isPaid && (
            <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded-full font-semibold">
              PRO
            </span>
          )}
        </div>
      </div>

      {/* Listing info bar */}
      {pageData && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 shrink-0">
          <div className="font-semibold text-xs text-gray-700 leading-snug truncate">
            {pageData.title}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {pageData.price} {pageData.currency}
            {pageData.rating && ` · ${pageData.rating}★`}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-2 shrink-0">
        {(["tags", "ai"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === tab
                ? "text-orange-600 border-orange-600 bg-orange-50/50"
                : "text-gray-500 border-transparent hover:text-gray-700"
            }`}
          >
            {tab === "tags" ? "Optimization" : "Smart Audit"}
          </button>
        ))}
      </div>

      {/* Tab content — scrollable area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* === TAGS TAB === */}
        {activeTab === "tags" && (
          <div>
            {/* SEO Score first */}
            {seoScore && (
              <div className="mb-4">
                <SeoScoreCard score={seoScore} />
              </div>
            )}

            {/* Related searches below */}
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-xs text-gray-500">
                {showAllSearches
                  ? `${relatedSearches.length} related searches`
                  : `Top ${topSearches.length} related searches`}
              </span>
              <div className="flex gap-1.5">
                {relatedSearches.length > 13 && (
                  <button
                    onClick={() => { setShowAllSearches(!showAllSearches); setCopiedIdx(null); }}
                    className="px-2.5 py-1 text-[11px] text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    {showAllSearches ? "Top 13" : `All ${relatedSearches.length}`}
                  </button>
                )}
                <button
                  onClick={copyAllTags}
                  className={`px-2.5 py-1 text-[11px] border rounded-md cursor-pointer ${
                    allCopied ? "text-green-600 border-green-300 bg-green-50" : "text-gray-500 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {allCopied ? "Copied!" : "Copy All"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {displayedSearches.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => copyTag(tag, i)}
                  className={`px-2.5 py-1 text-xs rounded-md border cursor-pointer transition-all ${
                    copiedIdx === i
                      ? "bg-green-50 border-green-300 text-green-600"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                  title="Click to copy"
                >
                  {copiedIdx === i ? "Copied!" : tag}
                </button>
              ))}
              {relatedSearches.length === 0 && (
                <span className="text-gray-400 text-xs">No related searches found for this listing</span>
              )}
            </div>
          </div>
        )}

        {/* === AI OPTIMIZATION TAB === */}
        {activeTab === "ai" && (
          <div>
            {aiLoading ? (
              <div className="py-4 space-y-4">
                {/* Animated progress header */}
                <div className="text-center mb-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-full">
                    <svg className="w-3.5 h-3.5 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-xs font-semibold text-orange-700">Analyzing your listing...</span>
                  </div>
                </div>

                {/* Skeleton: grade bar */}
                <div className="flex items-center justify-center gap-6 py-3 px-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="w-8 h-2 bg-gray-200 rounded animate-pulse mx-auto mb-1.5" />
                    <div className="w-12 h-12 rounded-lg bg-gray-200 animate-pulse" />
                  </div>
                  <div className="text-xl text-gray-200">→</div>
                  <div className="text-center">
                    <div className="w-8 h-2 bg-gray-200 rounded animate-pulse mx-auto mb-1.5" />
                    <div className="w-12 h-12 rounded-lg bg-gray-200 animate-pulse" />
                  </div>
                </div>

                {/* Skeleton: title */}
                <div>
                  <div className="w-24 h-2.5 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="w-full h-2.5 bg-gray-200 rounded animate-pulse" />
                    <div className="w-3/4 h-2.5 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>

                {/* Skeleton: tags */}
                <div>
                  <div className="w-16 h-2.5 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="flex flex-wrap gap-1.5">
                    {[...Array(13)].map((_, i) => (
                      <div key={i} className="h-6 bg-gray-200 rounded-md animate-pulse" style={{ width: `${60 + Math.random() * 40}px`, animationDelay: `${i * 0.05}s` }} />
                    ))}
                  </div>
                </div>

                <div className="text-center text-[11px] text-gray-400 pt-1">
                  Rewriting title, generating tags & diagnosing issues...
                </div>
              </div>
            ) : aiError && aiError !== "upgrade" ? (
              <div className="text-center py-6">
                {limitReached ? (
                  <div>
                    <div className="text-2xl mb-2">⏳</div>
                    <div className="text-xs text-amber-800 font-semibold mb-1">
                      Free audit used
                    </div>
                    <div className="text-[11px] text-gray-400 leading-relaxed mb-4">
                      You've used your free Smart Audit. Upgrade for unlimited audits — $9.99/mo.
                    </div>
                    <button
                      onClick={openUpgrade}
                      className="px-5 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 cursor-pointer"
                    >
                      Upgrade to Pro — $9.99/mo
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-red-600 mb-3">{aiError}</div>
                    <button
                      onClick={loadAiOptimization}
                      className="px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 cursor-pointer"
                    >
                      Try Again
                    </button>
                  </>
                )}
              </div>
            ) : aiResult ? (
              <div className="space-y-4">
                {/* Grade bar: current → projected */}
                <div className="flex items-center justify-center gap-6 py-3 px-4 bg-green-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-[10px] text-gray-500 mb-1">Current</div>
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center font-extrabold text-2xl text-red-600 border-2 border-red-300">
                      {seoScore.grade}
                    </div>
                    <div className="text-[11px] font-semibold text-red-600 mt-1">{seoScore.score}/100</div>
                  </div>
                  <div className="text-xl text-gray-300">→</div>
                  <div className="text-center">
                    <div className="text-[10px] text-gray-500 mb-1">Projected</div>
                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center font-extrabold text-2xl text-green-600 border-2 border-green-300">
                      {aiResult.projectedGrade}
                    </div>
                    <div className="text-[11px] font-semibold text-green-600 mt-1">{aiResult.projectedScore ?? "—"}/100</div>
                  </div>
                </div>

                {/* Optimized title */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">Optimized Title</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiResult.optimizedTitle);
                        setCopiedTitle(true);
                        setTimeout(() => setCopiedTitle(false), 1500);
                      }}
                      className={`text-[11px] cursor-pointer ${copiedTitle ? "text-green-600 font-medium" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      {copiedTitle ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
                    {aiResult.optimizedTitle}
                  </div>
                  {aiResult.titleExplanation && (
                    <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">{aiResult.titleExplanation}</p>
                  )}
                </div>

                {/* Tags as chips */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-violet-800 uppercase tracking-wide">
                      Tags ({aiResult.tags.length}/13)
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiResult.tags.map(t => t.tag).join(", "));
                        setCopiedAllTags(true);
                        setTimeout(() => setCopiedAllTags(false), 1500);
                      }}
                      className={`text-[11px] cursor-pointer ${copiedAllTags ? "text-green-600 font-medium" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      {copiedAllTags ? "✓ Copied All" : "Copy All"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {aiResult.tags.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          navigator.clipboard.writeText(t.tag);
                          setCopiedTagIdx(i);
                          setTimeout(() => setCopiedTagIdx(null), 1500);
                        }}
                        className={`px-2 py-1 text-[11px] rounded-md border cursor-pointer font-medium transition-all ${
                          copiedTagIdx === i
                            ? "bg-green-50 border-green-300 text-green-600"
                            : "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
                        }`}
                        title={t.reason}
                      >
                        {copiedTagIdx === i ? "✓" : t.tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collapsible diagnosis */}
                {aiResult.diagnosis.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowDiagnosis(!showDiagnosis)}
                      className="text-[11px] font-semibold text-orange-800 flex items-center gap-1 cursor-pointer hover:text-orange-900"
                    >
                      {showDiagnosis ? "▾" : "▸"} Why these changes? ({aiResult.diagnosis.length} issues found)
                    </button>
                    {showDiagnosis && (
                      <div className="mt-2 space-y-1.5">
                        {aiResult.diagnosis.map((d, i) => (
                          <div key={i} className="p-2 bg-red-50 rounded-md text-[11px] leading-snug">
                            <span className="font-semibold text-red-900">{d.metric}</span>
                            <span className="text-red-800"> — {d.issue}</span>
                            <div className="text-green-700 mt-0.5">→ {d.fix}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Usage warning */}
                {usageWarning && (
                  <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 leading-snug">
                    {usageWarning}
                  </div>
                )}

                {/* Free user: upgrade CTA after seeing result */}
                {!isPaid && (
                  <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg text-center">
                    <div className="text-xs font-semibold text-gray-800 mb-1">Want this for every listing?</div>
                    <div className="text-[11px] text-gray-500 mb-2.5">Run Smart Audits on every listing — $9.99/mo</div>
                    <button
                      onClick={openUpgrade}
                      className="px-5 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 cursor-pointer"
                    >
                      Upgrade to Pro — $9.99/mo
                    </button>
                  </div>
                )}

                {/* Re-analyze (paid users only — free users already used theirs) */}
                {isPaid && (
                  <div>
                    <button
                      onClick={() => { setAiResult(null); setShowDiagnosis(false); loadAiOptimization(); }}
                      className="w-full py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      Re-analyze this listing
                    </button>
                  </div>
                )}
              </div>
            ) : showDemo ? (
              /* Demo view — realistic example of what an audit looks like */
              <div className="py-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Example Audit</div>
                  <button
                    onClick={() => setShowDemo(false)}
                    className="text-[11px] text-orange-600 font-medium cursor-pointer hover:text-orange-700"
                  >
                    ← Back
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Demo grade bar */}
                  <div className="flex items-center justify-center gap-6 py-2.5 px-3 bg-green-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-[9px] text-gray-500 mb-0.5">Current</div>
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center font-extrabold text-xl text-orange-600 border-2 border-orange-300">C</div>
                      <div className="text-[10px] font-semibold text-orange-600 mt-0.5">58/100</div>
                    </div>
                    <div className="text-lg text-gray-300">→</div>
                    <div className="text-center">
                      <div className="text-[9px] text-gray-500 mb-0.5">Projected</div>
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center font-extrabold text-xl text-green-600 border-2 border-green-300">A</div>
                      <div className="text-[10px] font-semibold text-green-600 mt-0.5">93/100</div>
                    </div>
                  </div>

                  {/* Demo title */}
                  <div>
                    <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wide mb-1">Optimized Title</div>
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-relaxed">
                      Personalized Ceramic Mug — Custom Name Coffee Cup, Handmade Gift for Her, Unique Birthday Present, Artisan Pottery
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 leading-snug">Front-loads "personalized" and "ceramic mug" — the two highest-volume search terms for this category.</p>
                  </div>

                  {/* Demo tags */}
                  <div>
                    <div className="text-[10px] font-bold text-violet-800 uppercase tracking-wide mb-1.5">Tags (13/13)</div>
                    <div className="flex flex-wrap gap-1">
                      {["personalized mug", "custom coffee cup", "handmade ceramic", "gift for her", "unique birthday gift", "custom name mug", "artisan pottery", "personalized gift", "coffee lover gift", "ceramic cup handmade", "mothers day gift", "coworker gift idea", "housewarming gift"].map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded bg-violet-50 border border-violet-200 text-violet-700 font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Demo diagnosis */}
                  <div>
                    <div className="text-[10px] font-semibold text-orange-800 mb-1.5">3 issues found</div>
                    <div className="space-y-1.5">
                      <div className="p-2 bg-red-50 rounded text-[10px] leading-snug">
                        <span className="font-semibold text-red-900">Title front-loading</span>
                        <span className="text-red-800"> — "Beautiful Hand-Painted" wastes first 20 characters on filler</span>
                        <div className="text-green-700 mt-0.5">→ Lead with "Personalized Ceramic Mug" to match buyer searches</div>
                      </div>
                      <div className="p-2 bg-red-50 rounded text-[10px] leading-snug">
                        <span className="font-semibold text-red-900">Missing long-tail tags</span>
                        <span className="text-red-800"> — only 8 of 13 tag slots used</span>
                        <div className="text-green-700 mt-0.5">→ Added 5 intent-matched phrases like "coffee lover gift"</div>
                      </div>
                      <div className="p-2 bg-red-50 rounded text-[10px] leading-snug">
                        <span className="font-semibold text-red-900">Search alignment</span>
                        <span className="text-red-800"> — title doesn't contain top buyer search terms</span>
                        <div className="text-green-700 mt-0.5">→ Added "custom," "personalized," and "gift for her" to title</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA at bottom of demo */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setShowDemo(false);
                      if (!isPaid) {
                        setShowFreeConfirm(true);
                      } else {
                        loadAiOptimization();
                      }
                    }}
                    className="w-full py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 cursor-pointer"
                  >
                    {isPaid ? "Run Smart Audit on This Listing" : "Try It Free on This Listing"}
                  </button>
                  <div className="mt-1.5 text-center text-[11px] text-gray-400">
                    {isPaid ? "Unlimited with your Pro plan" : "1 free audit included — no credit card required"}
                  </div>
                </div>
              </div>
            ) : (
              /* Initial state — sell the value, let them try it */
              <div className="py-4">
                <div className="text-center mb-4">
                  <div className="text-2xl mb-2">📈</div>
                  <div className="font-semibold text-sm text-gray-800">Get more sales from this listing</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {isPaid ? "One audit pays for itself with a single extra sale" : "Try it free — see exactly what you'll get"}
                  </div>
                </div>

                {/* Preview of what the audit includes */}
                <div className="space-y-2 mb-5">
                  <div className="flex items-start gap-2.5 p-2.5 bg-blue-50 rounded-lg">
                    <span className="text-sm mt-0.5">📝</span>
                    <div>
                      <div className="text-xs font-semibold text-gray-800">Rewritten title</div>
                      <div className="text-[11px] text-gray-500 leading-snug">Front-loads high-value search terms buyers actually type</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 bg-violet-50 rounded-lg">
                    <span className="text-sm mt-0.5">🏷️</span>
                    <div>
                      <div className="text-xs font-semibold text-gray-800">13 optimized tags</div>
                      <div className="text-[11px] text-gray-500 leading-snug">Long-tail phrases matched to buyer search intent</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 bg-red-50 rounded-lg">
                    <span className="text-sm mt-0.5">🔬</span>
                    <div>
                      <div className="text-xs font-semibold text-gray-800">Diagnosis & fixes</div>
                      <div className="text-[11px] text-gray-500 leading-snug">Pinpoints exactly why you're ranking low and how to fix it</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 bg-green-50 rounded-lg">
                    <span className="text-sm mt-0.5">🎯</span>
                    <div>
                      <div className="text-xs font-semibold text-gray-800">Projected score</div>
                      <div className="text-[11px] text-gray-500 leading-snug">See your grade jump from {seoScore.grade} to a higher tier</div>
                    </div>
                  </div>
                </div>

                {/* Free user confirmation step */}
                {!isPaid && showFreeConfirm ? (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-center">
                    <div className="text-sm font-bold text-gray-800 mb-1">First one's free!</div>
                    <div className="text-[11px] text-gray-500 mb-3 leading-snug">
                      You get 1 free Smart Audit to try it out.<br />After that, Pro is just $9.99/mo for unlimited audits.
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowFreeConfirm(false)}
                        className="flex-1 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => { setShowFreeConfirm(false); loadAiOptimization(); }}
                        className="flex-1 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 cursor-pointer"
                      >
                        Use My Free Audit
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        if (!isPaid) {
                          setShowFreeConfirm(true);
                        } else {
                          loadAiOptimization();
                        }
                      }}
                      className="w-full py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 cursor-pointer"
                    >
                      {isPaid ? "Run Smart Audit" : "Try Your Free Audit"}
                    </button>
                    <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-gray-400">
                      <span>{isPaid ? "Unlimited audits with Pro" : "1 free audit — no card required"}</span>
                      <span className="text-gray-300">·</span>
                      <button
                        onClick={() => setShowDemo(true)}
                        className="text-orange-600 hover:text-orange-700 font-medium cursor-pointer"
                      >
                        See example
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
