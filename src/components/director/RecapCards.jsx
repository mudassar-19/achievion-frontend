// Recap metric cards (item 26): the number, its name and a week-over-week arrow ("was 8" under it). Shared by the Recaps tab and the popup.
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

const ACCENT = "#4B2FC4";
const unit = (c) => (c.metric?.unit === "%" ? "%" : c.metric?.unit === "points" ? " pts" : "");

function Trend({ t, good = true }) {
  if (!t) return null;
  const Icon = t.dir === "up" || t.dir === "new" ? ArrowUp : t.dir === "down" ? ArrowDown : Minus;
  const tone = t.dir === "flat" ? "text-text-secondary" : (t.dir === "down") === good ? "text-[#B01F17]" : "text-[#0E6A30]";
  const word = t.dir === "flat" ? "same as before" : t.dir === "new" ? `new, was ${t.prev}` : `${t.delta > 0 ? "+" : ""}${t.delta} vs ${t.prev} before`;
  return <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${tone}`}><Icon size={11} aria-hidden="true" />{word}</span>;
}

export default function RecapCards({ cards, limit, cols = "grid-cols-2 sm:grid-cols-4" }) {
  const list = (limit ? cards.slice(0, limit) : cards);
  return (
    <div className={`grid gap-2 ${cols}`}>
      {list.map((c, i) => (
        <div key={i} className="flex flex-col gap-0.5 rounded-xl border border-ink/[0.05] bg-ink/[0.03] px-3 py-2" title={c.body}>
          <p className="text-lg font-black tabular-nums" style={{ color: ACCENT }}>{c.metric?.value == null ? "No data" : `${c.metric.value}${unit(c)}`}</p>
          <p className="text-[11px] font-semibold leading-tight text-slate-600">{c.title}</p>
          <Trend t={c.trend} good={c.title !== "Extension requests"} />
        </div>
      ))}
    </div>
  );
}
