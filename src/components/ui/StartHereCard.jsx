import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, X } from "lucide-react";
import { useRoleTheme } from "@/utils/roleTheme";

// First-use guide for a portal dashboard (V2 Phase 0.4, UX standard "Start here").
// steps: [{ label, hint, to, done? }] — keep it to 3. Hidden per browser once dismissed.
function readHidden(key) {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}

export default function StartHereCard({ title = "Start here", steps, storageKey, className = "" }) {
  const theme = useRoleTheme();
  const key = `achievion:start-here:${storageKey}`;
  const [hidden, setHidden] = useState(() => readHidden(key));

  if (hidden || !steps?.length || steps.every((s) => s.done)) return null;

  function hide() {
    try { localStorage.setItem(key, "1"); } catch { /* private mode: hide for this visit only */ }
    setHidden(true);
  }

  return (
    <section
      aria-labelledby={`${key}-title`}
      className={`rounded-2xl border border-ink/[0.07] bg-bg-surface px-5 py-4 ${className}`}
      style={{ boxShadow: "0 1px 2px rgba(20,32,61,0.04), 0 8px 24px -12px rgba(20,32,61,0.10)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={`${key}-title`} className="text-base font-black text-text-primary tracking-tight">
          {title}
        </h2>
        <button
          type="button"
          onClick={hide}
          aria-label="Hide the start-here guide"
          className="-mr-1.5 -mt-1 h-8 w-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-text-primary hover:bg-ink/[0.06] focus-visible:outline-none focus-visible:ring-2"
          style={{ "--tw-ring-color": theme.border }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <ol className="mt-3 grid gap-2 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.label}>
            <Link
              to={s.to}
              className="group flex h-full items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--nav-bg-hover)] focus-visible:outline-none focus-visible:ring-2"
              style={{ "--tw-ring-color": theme.border }}
            >
              <span
                className="mt-px shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black tabular-nums"
                style={s.done
                  ? { background: theme.accent, color: theme.onAccent }
                  : { background: theme.accentLight, color: theme.text, boxShadow: `inset 0 0 0 1px ${theme.border}` }}
                aria-hidden="true"
              >
                {s.done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`flex items-center gap-1 text-sm font-bold ${s.done ? "text-text-secondary line-through decoration-1" : "text-text-primary"}`}>
                  {s.label}
                  {!s.done && (
                    <ArrowRight size={14} aria-hidden="true" className="shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" style={{ color: theme.text }} />
                  )}
                </span>
                {s.hint && <span className="mt-0.5 block text-[13px] leading-snug text-text-secondary">{s.hint}</span>}
                {s.done && <span className="sr-only">(done)</span>}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
