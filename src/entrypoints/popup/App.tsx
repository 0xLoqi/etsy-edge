import { useState, useEffect } from "react";
import { appStorage } from "../../lib/storage";
import { usePaidStatus } from "../../hooks/usePaidStatus";

export default function App() {
  const [saved, setSaved] = useState(false);
  const [showTagSpy, setShowTagSpy] = useState(true);
  const [showSeoScore, setShowSeoScore] = useState(true);
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { isPaid, loading: paymentLoading, openUpgrade } = usePaidStatus();

  const handleRedeemCode = async () => {
    if (!code.trim()) return;
    setCodeStatus("loading");
    try {
      const res = await browser.runtime.sendMessage({ type: "VALIDATE_CODE", code: code.trim() });
      if (res?.success && res?.data?.valid) {
        setCodeStatus("success");
        // Reload to pick up new paid status
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setCodeStatus("error");
        setTimeout(() => setCodeStatus("idle"), 3000);
      }
    } catch {
      setCodeStatus("error");
      setTimeout(() => setCodeStatus("idle"), 3000);
    }
  };

  useEffect(() => {
    (async () => {
      setShowTagSpy(await appStorage.showTagSpy.getValue());
      setShowSeoScore(await appStorage.showSeoScore.getValue());
    })();
  }, []);

  const handleSave = async () => {
    await appStorage.showTagSpy.setValue(showTagSpy);
    await appStorage.showSeoScore.setValue(showSeoScore);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="w-80 p-4 bg-white text-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-xl font-bold text-orange-600">Etsy Edge</div>
          {!paymentLoading && isPaid && (
            <div className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-semibold">
              PRO
            </div>
          )}
          {!paymentLoading && !isPaid && (
            <div className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              Free
            </div>
          )}
        </div>
      </div>

      {/* Upgrade banner for free users */}
      {!paymentLoading && !isPaid && (
        <button
          onClick={openUpgrade}
          className="w-full mb-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg text-left hover:border-orange-300 transition-colors cursor-pointer"
        >
          <p className="font-semibold text-orange-800 text-sm">Upgrade to Pro</p>
          <p className="text-orange-600 text-xs mt-0.5">
            Unlimited Smart Audits — rewritten titles, optimized tags & diagnosis — $9.99/mo
          </p>
        </button>
      )}

      {/* Early adopter code redemption */}
      {!paymentLoading && !isPaid && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1.5">Have an early adopter code?</p>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="EDGE-EARLY-XXXX"
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 font-mono focus:outline-none focus:border-orange-400"
            />
            <button
              onClick={handleRedeemCode}
              disabled={codeStatus === "loading" || !code.trim()}
              className="text-xs px-2.5 py-1.5 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {codeStatus === "loading" ? "..." : "Apply"}
            </button>
          </div>
          {codeStatus === "success" && (
            <p className="text-xs text-green-600 mt-1">Pro unlocked for 30 days!</p>
          )}
          {codeStatus === "error" && (
            <p className="text-xs text-red-500 mt-1">Invalid code. Try again.</p>
          )}
        </div>
      )}

      {/* Settings */}
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showTagSpy}
              onChange={(e) => setShowTagSpy(e.target.checked)}
              className="rounded text-orange-600"
            />
            Show Tag Spy on listing pages
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showSeoScore}
              onChange={(e) => setShowSeoScore(e.target.checked)}
              className="rounded text-orange-600"
            />
            Show Optimization Score on listing pages
          </label>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors cursor-pointer"
        >
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>

      <div className="mt-4 pt-3 border-t text-xs text-gray-400 text-center">
        Etsy Edge v0.1.0
      </div>
    </div>
  );
}
