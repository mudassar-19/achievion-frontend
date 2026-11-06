import { TONE } from "./tone";

// Utilisation as a capped bar + plain label ("76%" or "Over capacity ×7.6").
export default function LoadBar({ pct, label, tone = "ok", wide = false }) {
  const t = TONE[tone] ?? TONE.ok;
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className={`h-1.5 ${wide ? "w-28" : "w-16"} overflow-hidden rounded-full bg-ink/[0.07]`} aria-hidden="true">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: t.bar }} />
      </span>
      <span className="text-xs font-semibold tabular-nums" style={{ color: t.text }}>{label}</span>
    </span>
  );
}
