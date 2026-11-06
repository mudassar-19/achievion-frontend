// Project health (D-077, computed on read): "84 · On track" pill.
import { HEALTH_TONE as TONE } from "./healthTone";

export default function HealthBadge({ score, band }) {
  const t = TONE[band] ?? TONE["On track"];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums"
      style={{ color: t.fg, background: t.bg, borderColor: t.bd }}>
      {score == null ? band : `${score} · ${band}`}
    </span>
  );
}
