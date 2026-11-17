// Project health (D-077, computed on read): "84 · On track" pill.
import { HEALTH_TONE as TONE } from "./healthTone";

import { healthBand } from "@/lib/healthBand";

export default function HealthBadge({ score, band: serverBand }) {
  const band = score == null ? serverBand : healthBand(score); // one scale (D-QA4-11)
  const t = TONE[band] ?? TONE["On track"];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums"
      style={{ color: t.fg, background: t.bg, borderColor: t.bd }}>
      {score == null ? band : `${score} · ${band}`}
    </span>
  );
}
