// One themed select for the whole app (QA4 M-6): no native dark OS list. Button + listbox popover, optional groups, search over 8 options.
// options: [{ value, label, group? }] · value "" = nothing chosen (shows `placeholder`). Keyboard: Up/Down/Home/End, Enter, Esc, type in the search box.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

const SEARCH_OVER = 8;

export default function Select({ value, onChange, options, placeholder = "Choose", label, className = "", buttonClassName = "", align = "left" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cur, setCur] = useState(0);
  const box = useRef(null), searchRef = useRef(null), listRef = useRef(null);
  const id = useId();
  const chosen = options.find((o) => o.value === value);
  const shown = useMemo(() => options.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase())), [options, q]);
  const searchable = options.length > SEARCH_OVER;

  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);
  useEffect(() => { if (open) { setCur(Math.max(0, shown.findIndex((o) => o.value === value))); if (searchable) searchRef.current?.focus(); else listRef.current?.focus(); } }, [open]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { listRef.current?.querySelector(`[data-i="${cur}"]`)?.scrollIntoView({ block: "nearest" }); }, [cur]);

  const pick = (o) => { onChange(o.value); setOpen(false); setQ(""); box.current?.querySelector("button")?.focus(); };
  function onKey(e) {
    if (e.key === "Escape") { e.stopPropagation(); setOpen(false); box.current?.querySelector("button")?.focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setCur((c) => Math.min(shown.length - 1, c + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCur((c) => Math.max(0, c - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setCur(0); }
    else if (e.key === "End") { e.preventDefault(); setCur(shown.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[cur]) pick(shown[cur]); }
  }

  return (
    <div ref={box} className={`relative min-w-0 ${className}`}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => { setOpen((v) => !v); setQ(""); }}
        className={`flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-ink/[0.12] bg-white px-3 text-left text-sm text-text-primary hover:border-accent/40 ${buttonClassName}`}>
        <span className={`truncate ${chosen ? "" : "text-slate-500"}`}>{chosen?.label ?? placeholder}</span>
        <ChevronDown size={14} aria-hidden="true" className="shrink-0 text-slate-500" />
      </button>
      {open && (
        <div onKeyDown={onKey} className={`absolute z-50 mt-1 w-max min-w-full max-w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-ink/[0.1] bg-white shadow-[0_12px_32px_rgba(20,32,61,0.16)] ${align === "right" ? "right-0" : "left-0"}`}>
          {searchable && <input ref={searchRef} value={q} onChange={(e) => { setQ(e.target.value); setCur(0); }} placeholder="Search" aria-label="Search options"
            className="w-full border-b border-ink/[0.08] px-3 py-2 text-sm outline-none" />}
          <ul ref={listRef} role="listbox" id={id} tabIndex={-1} aria-label={label} aria-activedescendant={shown[cur] ? `${id}-${cur}` : undefined} className="max-h-64 overflow-y-auto py-1 outline-none">
            {shown.length === 0 && <li className="px-3 py-2 text-sm text-text-secondary">Nothing matches.</li>}
            {shown.map((o, i) => {
              const head = o.group && o.group !== shown[i - 1]?.group ? o.group : null;
              return (
                <li key={`${o.value}-${i}`} role="presentation">
                  {head && <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{head}</p>}
                  <div role="option" id={`${id}-${i}`} data-i={i} aria-selected={o.value === value} onClick={() => pick(o)} onMouseEnter={() => setCur(i)}
                    className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-sm ${i === cur ? "bg-accent/[0.08]" : ""}`}>
                    <span className="truncate">{o.label}</span>{o.value === value && <Check size={13} aria-hidden="true" className="shrink-0 text-accent-text" />}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
