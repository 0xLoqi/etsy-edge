import type { SeoScore } from "../types/extension";

interface Props {
  score: SeoScore;
}

const gradeColors: Record<SeoScore["grade"], { bg: string; text: string; border: string }> = {
  A: { bg: "#dcfce7", text: "#16a34a", border: "#86efac" },
  B: { bg: "#dbeafe", text: "#2563eb", border: "#93c5fd" },
  C: { bg: "#fef9c3", text: "#ca8a04", border: "#fde047" },
  D: { bg: "#fed7aa", text: "#ea580c", border: "#fdba74" },
  F: { bg: "#fecaca", text: "#dc2626", border: "#fca5a5" },
};

export default function SeoScoreCard({ score }: Props) {
  const colors = gradeColors[score.grade];

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Grade header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: colors.bg,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "20px",
              color: colors.text,
              border: `2px solid ${colors.border}`,
            }}
          >
            {score.grade}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "13px", color: "#1a1a1a" }}>
              SEO Score
            </div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>
              {score.score}/100
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ padding: "10px 14px", fontSize: "12px" }}>
        {Object.entries(score.breakdown).map(([key, val]) => (
          <div
            key={key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "4px 0",
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <span style={{ color: "#6b7280" }}>{val.detail}</span>
            <span
              style={{
                fontWeight: 600,
                color: val.score >= val.max * 0.7 ? "#16a34a" : val.score >= val.max * 0.4 ? "#ca8a04" : "#dc2626",
              }}
            >
              {val.score}/{val.max}
            </span>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {score.recommendations.length > 0 && (
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid #e5e7eb",
            background: "#fafafa",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: "12px",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
            Recommendations
          </div>
          {score.recommendations.map((rec, i) => (
            <div
              key={i}
              style={{
                fontSize: "12px",
                color: "#6b7280",
                padding: "3px 0",
                lineHeight: "1.4",
              }}
            >
              &bull; {rec}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
