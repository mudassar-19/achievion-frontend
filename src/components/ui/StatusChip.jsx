const CONFIGS = {
  active:      { bg: "rgba(18,128,59,0.10)",  border: "rgba(18,128,59,0.30)",  text: "#0E6A30" },
  planning:    { bg: "rgba(255,194,26,0.10)", border: "rgba(138,98,0,0.30)",   text: "#7A5200" },
  planned:     { bg: "rgba(255,194,26,0.10)", border: "rgba(138,98,0,0.30)",   text: "#7A5200" },
  at_risk:     { bg: "rgba(209,41,31,0.10)",  border: "rgba(209,41,31,0.30)",  text: "#B01F17" },
  on_hold:     { bg: "rgba(74,86,107,0.10)",  border: "rgba(74,86,107,0.30)",  text: "#3A4659" },
  completed:   { bg: "rgba(18,128,59,0.10)",  border: "rgba(18,128,59,0.30)",  text: "#0E6A30" },
  pending:     { bg: "rgba(255,194,26,0.10)", border: "rgba(138,98,0,0.30)",   text: "#7A5200" },
  approved:    { bg: "rgba(18,128,59,0.10)",  border: "rgba(18,128,59,0.30)",  text: "#0E6A30" },
  rejected:    { bg: "rgba(209,41,31,0.10)",  border: "rgba(209,41,31,0.30)",  text: "#B01F17" },
  maintenance: { bg: "rgba(42,98,236,0.10)",  border: "rgba(42,98,236,0.30)",  text: "#1948BD" },
};

const DEFAULT_CFG = { bg: "rgba(74,86,107,0.10)", border: "rgba(74,86,107,0.30)", text: "#3A4659" };

export default function StatusChip({ status, label, size = "sm" }) {
  const key = (status ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  const cfg = CONFIGS[key] ?? DEFAULT_CFG;
  const displayLabel = label ?? (status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown");
  const cls = size === "xs"
    ? "text-[11px] px-1.5 py-0.5 gap-1"
    : "text-xs px-2.5 py-1 gap-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${cls}`}
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: cfg.text }} />
      {displayLabel}
    </span>
  );
}
