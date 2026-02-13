import type { SeoScore } from "../types/extension";

interface Props {
  score: SeoScore;
}

const gradeStyles: Record<SeoScore["grade"], { bg: string; text: string; border: string; label: string }> = {
  A: { bg: "bg-green-100", text: "text-green-600", border: "border-green-300", label: "Excellent" },
  B: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-300", label: "Good" },
  C: { bg: "bg-yellow-100", text: "text-yellow-600", border: "border-yellow-300", label: "Needs work" },
  D: { bg: "bg-orange-100", text: "text-orange-600", border: "border-orange-300", label: "Weak" },
  F: { bg: "bg-red-100", text: "text-red-600", border: "border-red-300", label: "Poor" },
};

export default function SeoScoreCard({ score }: Props) {
  const g = gradeStyles[score.grade];

  return (
    <div className={`border ${g.border} rounded-lg overflow-hidden`}>
      {/* Grade header */}
      <div className={`flex items-center gap-3 p-3 ${g.bg}`}>
        <div className={`w-9 h-9 rounded-lg bg-white flex items-center justify-center font-extrabold text-xl ${g.text} border-2 ${g.border} shrink-0`}>
          {score.grade}
        </div>
        <div>
          <div className="font-semibold text-xs text-gray-900">
            Listing Optimization: <span className={g.text}>{g.label}</span>
          </div>
          <div className="text-[11px] text-gray-500">{score.score}/100</div>
        </div>
      </div>

      {/* Explainer */}
      <div className="px-3 py-2 bg-gray-50/80 border-b border-gray-100">
        <div className="text-[11px] text-gray-400 leading-snug">
          Measures how well your title & description are optimized for Etsy search — not your shop's sales history or reviews.
        </div>
      </div>

      {/* Breakdown */}
      <div className="px-3 py-1">
        {Object.entries(score.breakdown).map(([key, val]) => {
          const pct = Math.round((val.score / val.max) * 100);
          const barColor = pct >= 70 ? "#16a34a" : pct >= 40 ? "#ca8a04" : "#dc2626";

          return (
            <div key={key} className="py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-medium text-gray-700">{val.label}</span>
                <span
                  className="text-[11px] font-semibold shrink-0 ml-3"
                  style={{ color: barColor }}
                >
                  {val.score}/{val.max}
                </span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">{val.detail}</div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {score.recommendations.length > 0 && (
        <div className="px-3 py-2.5 border-t border-gray-200 bg-gray-50/70">
          <div className="font-semibold text-[11px] text-gray-700 mb-1.5">Quick wins</div>
          {score.recommendations.map((rec, i) => (
            <div key={i} className="text-[11px] text-gray-500 py-1 leading-relaxed">
              • {rec}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
