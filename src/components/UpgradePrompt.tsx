interface Props {
  feature: string;
  onUpgrade: () => void;
}

export default function UpgradePrompt({ feature, onUpgrade }: Props) {
  return (
    <div
      style={{
        padding: "14px",
        background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
        border: "1px solid #fed7aa",
        borderRadius: "8px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 600, color: "#9a3412", marginBottom: "6px" }}>
        {feature}
      </div>
      <div style={{ fontSize: "12px", color: "#78716c", marginBottom: "10px", lineHeight: "1.4" }}>
        Upgrade to Etsy Edge Pro for AI-powered tag suggestions, competitor analysis, and more.
      </div>
      <button
        onClick={onUpgrade}
        style={{
          background: "#ea580c",
          color: "white",
          border: "none",
          borderRadius: "6px",
          padding: "8px 20px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Upgrade — $9.99/mo
      </button>
    </div>
  );
}
