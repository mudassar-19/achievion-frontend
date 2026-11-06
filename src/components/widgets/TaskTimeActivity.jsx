import { useState } from "react";
import { Clock, Plus } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";

// V1 1.7 — time log (assignees log minutes) and per-task activity history.
const PANEL = "rounded-2xl p-5 bg-bg-surface border border-ink/[0.08]";
const HEAD  = "text-[14px] font-bold uppercase tracking-widest text-slate-600 mb-3";

const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);
const when   = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");

export function TimeLogPanel({ task, canLog, onLogged }) {
  const addToast = useUiStore((s) => s.addToast);
  const [minutes, setMinutes] = useState("");
  const [note, setNote]       = useState("");
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState(null);

  const logs  = task.timeLogs ?? [];
  const total = logs.reduce((m, l) => m + (l.minutes ?? 0), 0);

  async function submit(e) {
    e.preventDefault();
    const n = Number(minutes);
    if (!Number.isInteger(n) || n < 1 || n > 1440) { setErr("Enter whole minutes from 1 to 1440."); return; }
    setErr(null); setBusy(true);
    try {
      const r = await api.post(`/api/tasks/${task._id}/time-log`, { minutes: n, note: note.trim() });
      setMinutes(""); setNote("");
      onLogged?.(r);
      addToast({ type: "success", message: `Logged ${fmtMin(n)}.` });
    } catch (e2) {
      setErr(e2.message ?? "Could not log time. Try again.");
    } finally { setBusy(false); }
  }

  return (
    <section className={PANEL} aria-labelledby="timelog-h">
      <div className="flex items-baseline justify-between">
        <h2 id="timelog-h" className={HEAD}>Time log</h2>
        <span className="text-xs font-bold tabular-nums text-text-primary">{fmtMin(total)} total</span>
      </div>

      {logs.length === 0 && <p className="text-xs text-text-secondary mb-3">No time logged yet.</p>}
      <ul className="flex flex-col">
        {logs.slice().reverse().map((l, i) => (
          <li key={l._id ?? i} className="flex items-start justify-between gap-3 py-1.5 border-b border-ink/[0.05] last:border-0">
            <span className="min-w-0 text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">{l.user?.name ?? "Someone"}</span>
              {l.note ? ` · ${l.note}` : ""}
              <span className="block text-[12px]">{when(l.loggedAt)}</span>
            </span>
            <span className="shrink-0 text-xs font-bold tabular-nums text-text-primary">{fmtMin(l.minutes ?? 0)}</span>
          </li>
        ))}
      </ul>

      {canLog && (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2" noValidate>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="tl-min">Minutes</label>
            <input
              id="tl-min" type="number" inputMode="numeric" min={1} max={1440} step={1} required
              value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Minutes"
              aria-invalid={Boolean(err)} aria-describedby={err ? "tl-err" : undefined}
              className="w-24 bg-ink/[0.04] border border-ink/[0.08] rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/40"
            />
            <label className="sr-only" htmlFor="tl-note">Note</label>
            <input
              id="tl-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you work on? (optional)"
              className="flex-1 min-w-0 bg-ink/[0.04] border border-ink/[0.08] rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/40"
            />
            <button
              type="submit" disabled={busy || !minutes} aria-label="Log time"
              className="flex items-center justify-center h-8 w-8 self-center rounded-lg bg-[#2A62EC] text-white disabled:opacity-40 hover:bg-[#1F4FC8] transition-colors"
            >
              <Plus size={14} strokeWidth={2.25} />
            </button>
          </div>
          {err && <p id="tl-err" role="alert" className="text-xs text-[#B01F17]">{err}</p>}
        </form>
      )}
    </section>
  );
}

const KIND_TEXT = {
  created:   (a) => `created the task${a.to ? ` (${a.to})` : ""}`,
  status:    (a) => `moved it ${a.from ? `from ${a.from} ` : ""}to ${a.to}`,
  edited:    (a) => `edited ${a.note || "details"}`,
  submitted: ()  => "submitted it for review",
  reviewed:  ()  => "reviewed it",
  escalated: ()  => "escalated it to the Manager",
  comment:   ()  => "commented",
  time:      ()  => "logged time",
  extension: ()  => "updated an extension",
};

export function ActivityPanel({ task }) {
  const items = (task.activity ?? []).slice().reverse();
  return (
    <section className={PANEL} aria-labelledby="activity-h">
      <h2 id="activity-h" className={HEAD}>Activity</h2>
      {items.length === 0 ? (
        <p className="text-xs text-text-secondary">No activity recorded yet. New changes appear here.</p>
      ) : (
        <ol className="relative flex flex-col gap-3 pl-4 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-ink/[0.10]">
          {items.map((a, i) => (
            <li key={a._id ?? i} className="relative">
              <span className="absolute -left-4 top-1.5 h-[9px] w-[9px] rounded-full bg-bg-surface border-2 border-[#2A62EC]" aria-hidden="true" />
              <p className="text-xs text-text-primary leading-snug">
                <span className="font-semibold">{a.by?.name ?? "System"}</span>{" "}
                {(KIND_TEXT[a.kind] ?? (() => a.kind))(a)}
                {a.note && a.kind !== "edited" ? <span className="text-text-secondary"> · {a.note}</span> : null}
              </p>
              <p className="flex items-center gap-1 text-[12px] text-text-secondary">
                <Clock size={11} aria-hidden="true" /> {when(a.at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
