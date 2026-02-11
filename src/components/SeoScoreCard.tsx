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
              flexShrink: 0,
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
      <div style={{ padding: "8px 14px", fontSize: "12px" }}>
        {Object.entries(score.breakdown).map(([key, val]) => {
          const pct = Math.round((val.score / val.max) * 100);
          const barColor =
            pct >= 70 ? "#16a34a" : pct >= 40 ? "#ca8a04" : "#dc2626";

          return (
            <div
              key={key}
              style={{
                padding: "6px 0",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <span style={{ color: "#6b7280", lineHeight: "1.3" }}>
                  {val.detail}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: barColor,
                    flexShrink: 0,
                    marginLeft: "12px",
                    fontSize: "11px",
                  }}
                >
                  {val.score}/{val.max}
                </span>
              </div>
              {/* Progress bar */}
              <div
                style={{
                  height: "4px",
                  background: "#f3f4f6",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: barColor,
                    borderRadius: "2px",
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>
          );
        })}
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
            Tips
          </div>
          {score.recommendations.map((rec, i) => (
            <div
              key={i}
              style={{
                fontSize: "12px",
                color: "#6b7280",
                padding: "4px 0",
                lineHeight: "1.5",
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
