import { useState, useEffect } from "react";
import { appStorage } from "../../lib/storage";
import { usePaidStatus } from "../../hooks/usePaidStatus";

export default function App() {
  const [saved, setSaved] = useState(false);
  const [showTagSpy, setShowTagSpy] = useState(true);
  const [showSeoScore, setShowSeoScore] = useState(true);
  const { isPaid, loading: paymentLoading, openUpgrade } = usePaidStatus();

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
            AI tag suggestions, competitor analysis, and more — $9.99/mo
          </p>
        </button>
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
            Show SEO Score on listing pages
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
