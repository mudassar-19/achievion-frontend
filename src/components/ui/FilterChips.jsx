import { useSearchParams } from "react-router-dom";

// Filter chips kept in the URL (?param=a,b) so a filtered list can be shared and survives reload.
// multi: several values (comma list) · otherwise one value or none. Changing a filter resets ?page.
// fallback: the value shown as on when the param is absent (single choice with a default, e.g. a date range).
// allLabel: adds a first chip that clears the filter and is on when nothing is chosen (QA2-67, single choice + "All").
export default function FilterChips({ label, param, options, multi = false, fallback, allLabel }) {
  const [sp, setSp] = useSearchParams();
  const current = (sp.get(param) ?? fallback ?? "").split(",").filter(Boolean);

  function toggle(value) {
    const next = new URLSearchParams(sp);
    const on = current.includes(value);
    const list = multi ? (on ? current.filter((v) => v !== value) : [...current, value]) : (on ? [] : [value]);
    if (list.length && !(fallback && list.join(",") === fallback)) next.set(param, list.join(",")); else next.delete(param);
    next.delete("page");
    setSp(next, { replace: true });
  }

  return (
    <div role="group" aria-label={label} className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-bold text-text-secondary">{label}</span>
      {allLabel && (
        <button type="button" aria-pressed={!current.length} onClick={() => { const next = new URLSearchParams(sp); next.delete(param); next.delete("page"); setSp(next, { replace: true }); }}
          className={["inline-flex min-h-8 items-center rounded-xl border px-3 text-xs font-bold transition-colors",
            !current.length ? "border-accent/30 bg-accent/10 text-accent-text" : "border-ink/[0.08] bg-ink/[0.03] text-text-secondary hover:text-text-primary"].join(" ")}>{allLabel}</button>
      )}
      {options.map((o) => {
        const on = current.includes(o.value);
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => toggle(o.value)} title={typeof o.label === "string" ? o.label : undefined}
            className={["inline-flex min-h-8 min-w-0 max-w-[220px] items-center rounded-xl border px-3 text-xs font-bold transition-colors",
              on ? "border-accent/30 bg-accent/10 text-accent-text" : "border-ink/[0.08] bg-ink/[0.03] text-text-secondary hover:text-text-primary"].join(" ")}>
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
