// Employee task drawer, 560px, deep link ?task=<id> (E-2, Employee UX §4.3, D-175). Tabs: Overview | Subtasks | Time log |
// Comments & files | Activity | Submission & review. Reads GET /api/workspace/tasks/:id/full; writes through /api/tasks (S-1 scope).
// Never shows an AI score (D-075): the server does not send one. Submit / Resubmit open the existing submit form (composer: E-3).
import { useEffect, useState } from "react";
import { Check, Circle, Lock, Paperclip, Play, Square, Star, Timer } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Drawer from "@/components/ui/Drawer";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import FileLink from "@/components/ui/FileLink";
import { BTN } from "@/components/ui/buttons";
import { CalendarClock, ExternalLink, Palette, RotateCcw, Sparkles } from "lucide-react";
import { STATUS_CHIP, statusLabel } from "@/utils/employeePortal";
import TaskComments from "../teamlead/task/TaskComments";
import { BugDetail } from "./quality/BugDetail";
import { BUG_CHIP, SEVERITY_CHIP, VALIDITY_LABEL } from "@/utils/quality";
import SubmitComposer from "./SubmitComposer";
import useAuthStore from "@/stores/authStore";
import { employeeKind } from "@/utils/employeePortal";
import useLoad from "../manager/project/useLoad";
import { fmt, fmtDateTime } from "../manager/project/format";

const TABS = [["overview", "Overview"], ["subtasks", "Subtasks"], ["time", "Time log"], ["comments", "Comments & files"], ["activity", "Activity"], ["review", "Submission & review"], ["bugs", "Bugs"]];
const H3 = "mb-1.5 text-xs font-bold text-text-secondary";
const hm = (n) => (n >= 60 ? `${Math.floor(n / 60)} h ${n % 60} min` : `${n} min`);
const DECISION = { approved: ["approved", "Approved"], revision: ["at_risk", "Revision requested"], waiting: ["pending", "Waiting for review"], none: ["on_hold", "Not submitted yet"] };
const ACTIVITY = { created: "Created", status: "Status", edited: "Edited", submitted: "Submitted", reviewed: "Reviewed", escalated: "Escalated", comment: "Comment", time: "Time logged", extension: "Deadline" };

// E-4 (D-190): bugs on this task. The person on the task marks a fix (with a note) once the Team Lead accepted the bug.
function TaskBugs({ taskId }) {
  const { data, error, reload } = useLoad(`/api/quality/bugs?task=${taskId}`);
  const [open, setOpen] = useState(null);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <div aria-busy="true" aria-label="Loading bugs"><Skeleton className="h-24 rounded-xl" /></div>;
  if (!data.rows.length) return <p className="text-text-secondary">No bugs reported on this task.</p>;
  return (
    <ul className="flex flex-col gap-2">{data.rows.map((b) => (
      <li key={b.id} className="rounded-xl border border-ink/[0.08]">
        <button type="button" aria-expanded={open === b.id} onClick={() => setOpen((x) => (x === b.id ? null : b.id))} className="flex w-full flex-wrap items-center gap-2 px-3 py-2.5 text-left hover:bg-ink/[0.03]">
          <span className="min-w-0 flex-1 basis-40 truncate font-semibold" title={b.title}>{b.title}</span>
          <StatusChip status={SEVERITY_CHIP[b.severity]} label={b.severity} size="xs" /><StatusChip status={BUG_CHIP[b.status]} label={b.status} size="xs" />
          {b.validity !== "valid" && <span className="text-[11px] font-semibold text-text-secondary">{VALIDITY_LABEL[b.validity]}</span>}
        </button>
        {open === b.id && <div className="border-t border-ink/[0.06] p-3"><BugDetail id={b.id} onChanged={reload} /></div>}
      </li>))}</ul>
  );
}

// E-3b (D-185): files, links and the handoff note of approved designs this task waits for. Read-only; files open through 5-minute links.
function FromDesign({ items }) {
  if (!items?.length) return null;
  return (
    <section aria-label="From design" className="flex flex-col gap-3">
      <h3 className={`${H3} flex items-center gap-1.5`}><Palette size={13} aria-hidden="true" />From design</h3>
      {items.map((h) => (
        <div key={h.fromTask} className="flex flex-col gap-1.5 rounded-xl border border-ink/[0.08] p-3">
          <p className="text-xs text-text-secondary"><strong className="font-semibold text-text-primary [overflow-wrap:anywhere]">{h.fromTitle}</strong> · {h.by} · approved {fmt(h.at)}</p>
          {h.note && <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{h.note}</p>}
          {(h.links.length > 0 || h.files.length > 0) && <ul className="flex flex-col gap-1">
            {h.links.map((l, i) => <li key={`l${i}`} className="flex min-w-0 items-center gap-2"><ExternalLink size={13} aria-hidden="true" className="shrink-0 text-text-secondary" /><a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate font-semibold underline" title={l.url}>{l.label}</a></li>)}
            {h.files.map((f, i) => <li key={`f${i}`} className="flex min-w-0 items-center gap-2"><Paperclip size={13} aria-hidden="true" className="shrink-0 text-text-secondary" /><FileLink href={f.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate font-semibold underline">{f.name}</FileLink></li>)}
          </ul>}
        </div>
      ))}
    </section>
  );
}

function MiniRow({ x, onOpen }) {
  return (
    <li><button type="button" onClick={() => onOpen(x.id)} className="flex min-h-10 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-ink/[0.04]">
      <span className="min-w-0 flex-1 truncate font-semibold text-text-primary" title={x.title}>{x.title}</span>
      <StatusChip status={STATUS_CHIP[x.status]} label={statusLabel(x.status)} size="xs" />
    </button></li>
  );
}

export function Stars({ n }) {
  return <span className="inline-flex" role="img" aria-label={`${n} of 5 stars`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={15} aria-hidden="true" className={i <= n ? "fill-[#B07A00] text-[#B07A00]" : "text-ink/20"} />)}</span>;
}

// Timer kept per task in this browser only; stopping fills the minutes, the person saves.
function TimeLog({ t, taskId, onSaved }) {
  const addToast = useUiStore((s) => s.addToast);
  const key = `achievion:timer:${taskId}`;
  const [startedAt, setStartedAt] = useState(() => { try { return Number(localStorage.getItem(key)) || null; } catch { return null; } });
  const [now, setNow] = useState(() => Date.now());
  const [form, setForm] = useState({ minutes: "", note: "" });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!startedAt) return undefined; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [startedAt]);
  const running = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  function start() { const s = Date.now(); try { localStorage.setItem(key, String(s)); } catch { /* storage blocked: timer for this visit */ } setStartedAt(s); setNow(s); }
  function stop() { try { localStorage.removeItem(key); } catch { /* ignore */ } setForm((f) => ({ ...f, minutes: String(Math.min(1440, Math.max(1, Math.ceil(running / 60)))) })); setStartedAt(null); }
  async function save(e) {
    e.preventDefault();
    const m = Number(form.minutes);
    if (!Number.isInteger(m) || m < 1 || m > 1440) { setErr("Enter whole minutes from 1 to 1440."); return; }
    setErr(null); setBusy(true);
    try { await api.post(`/api/tasks/${taskId}/time-log`, { minutes: m, note: form.note.trim() }); setForm({ minutes: "", note: "" }); addToast({ type: "success", message: `${hm(m)} logged.` }); onSaved(); }
    catch (x) { setErr(x?.message ?? "Could not save the time."); }
    finally { setBusy(false); }
  }
  const est = t.estimatedHours != null ? t.estimatedHours * 60 : null;
  const pct = est ? Math.min(100, Math.round((t.time.minutes / est) * 100)) : null;
  return (
    <>
      <section aria-label="Total time">
        <p><strong className="tabular-nums">{hm(t.time.minutes)}</strong> logged{est != null ? ` of ${t.estimatedHours} h estimated` : ""}{t.time.mine !== t.time.minutes ? ` · ${hm(t.time.mine)} by you` : ""}.</p>
        {pct != null && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.08]" role="progressbar" aria-label="Time against the estimate" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.time.minutes > est ? "#B4410C" : "var(--accent)" }} /></div>}
        {est != null && t.time.minutes > est && <p className="mt-1 text-xs text-text-secondary">Over the estimate. That is fine; tell your Team Lead in a comment if the task is bigger than planned.</p>}
      </section>
      {t.mine && (
        <form onSubmit={save} className="flex flex-col gap-3 rounded-xl border border-ink/[0.08] p-3">
          <div className="flex flex-wrap items-center gap-2">
            {startedAt ? <button type="button" className={BTN.secondary} onClick={stop}><Square size={14} aria-hidden="true" />Stop timer</button>
              : <button type="button" className={BTN.secondary} onClick={start}><Play size={14} aria-hidden="true" />Start timer</button>}
            {startedAt && <span className="text-sm font-semibold tabular-nums" aria-live="off"><Timer size={14} aria-hidden="true" className="mr-1 inline" />{String(Math.floor(running / 3600)).padStart(2, "0")}:{String(Math.floor((running % 3600) / 60)).padStart(2, "0")}:{String(running % 60).padStart(2, "0")}</span>}
          </div>
          <div className="flex flex-wrap gap-3">
            <label htmlFor="tl-min" className="flex flex-col gap-1 text-xs font-bold">Minutes
              <input id="tl-min" type="number" inputMode="numeric" min={1} max={1440} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} aria-invalid={!!err} className="h-10 w-28 rounded-xl px-3 font-normal tabular-nums" /></label>
            <label htmlFor="tl-note" className="flex min-w-0 flex-1 basis-48 flex-col gap-1 text-xs font-bold">Note (optional)
              <input id="tl-note" type="text" maxLength={300} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="What you worked on…" className="h-10 rounded-xl px-3 font-normal" /></label>
          </div>
          {err && <p role="alert" className="text-xs font-semibold text-[#B01F17]">{err}</p>}
          <button type="submit" className={`${BTN.primary} self-start`} disabled={busy}>{busy ? "Saving…" : "Log time"}</button>
        </form>
      )}
      {t.time.logs.length ? <ul className="flex flex-col divide-y divide-ink/[0.05]">{t.time.logs.map((l, i) => (
        <li key={i} className="flex justify-between gap-3 py-2"><span className="min-w-0 [overflow-wrap:anywhere]">{l.who}{l.note ? ` · ${l.note}` : ""}</span><span className="shrink-0 tabular-nums text-text-secondary">{hm(l.minutes)} · {fmt(l.at)}</span></li>))}</ul>
        : <p className="text-text-secondary">No time logged yet.</p>}
    </>
  );
}

function Review({ t }) {
  const r = t.review;
  if (!r) return <p className="text-text-secondary">The submission and review of this task are visible to the people working on it.</p>;
  const [chip, label] = DECISION[r.decision];
  return (
    <>
      <section><h3 className={H3}>Your submission</h3>
        {t.submission.note || t.submission.links.length || t.submission.files.length ? (
          <ul className="flex flex-col gap-1">
            {t.submission.note && <li className="whitespace-pre-wrap [overflow-wrap:anywhere]">{t.submission.note}</li>}
            {[...t.submission.links.map((l) => ({ name: l.label || l.url, url: l.url })), ...t.submission.files].filter((x) => x.url).map((x, i) => (
              <li key={i} className="flex min-w-0 items-center gap-2"><Paperclip size={13} aria-hidden="true" className="shrink-0 text-text-secondary" /><FileLink href={x.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate font-semibold underline">{x.name}</FileLink></li>))}
            {t.submission.at && <li className="text-xs text-text-secondary">Sent {fmtDateTime(t.submission.at)}</li>}
          </ul>
        ) : <p className="text-text-secondary">Nothing submitted yet.</p>}
      </section>
      {r.decision !== "none" && <section className="flex flex-col gap-2 rounded-xl border border-ink/[0.08] p-3" aria-label="Review result">
        <div className="flex flex-wrap items-center gap-2"><StatusChip status={chip} label={label} size="xs" />
          {r.revisions > 0 && <span className="text-xs text-text-secondary">{r.revisions} revision{r.revisions === 1 ? "" : "s"} so far · {t.triesLeft} {t.triesLeft === 1 ? "try" : "tries"} left</span>}</div>
        {r.score != null && <p className="flex flex-wrap items-center gap-2">Team Lead score <strong className="tabular-nums">{r.score}</strong>{r.stars != null && <Stars n={r.stars} />}</p>}
        {r.feedback && <blockquote className="whitespace-pre-wrap border-l-2 border-ink/15 pl-3 [overflow-wrap:anywhere]">{r.feedback}</blockquote>}
        {r.lastRevision && r.decision !== "approved" && (
          <div><p className="text-xs font-bold text-text-secondary">What to change{r.lastRevision.at ? ` · ${fmt(r.lastRevision.at)}` : ""}</p>
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{r.lastRevision.reason || "No reason was written."}</p>
            {r.lastRevision.unmet.length > 0 && <><p className="mt-1.5 text-xs font-bold text-text-secondary">Criteria not met yet</p><ul className="list-disc pl-5">{r.lastRevision.unmet.map((c, i) => <li key={i}>{c}</li>)}</ul></>}
          </div>
        )}
        {r.decision === "waiting" && <p className="text-text-secondary">Your Team Lead reviews it next. You get a notification with the result.</p>}
      </section>}
      {t.aiFeedback && (
        <section className="rounded-xl border border-ink/[0.08] p-3" aria-label="AI feedback">
          <h3 className={`${H3} flex items-center gap-1.5`}><Sparkles size={13} aria-hidden="true" />AI feedback (advice)</h3>
          <p className="text-xs text-text-secondary">Written by the AI after your Team Lead's review. Your score comes only from your Team Lead.</p>
          {t.aiFeedback.strengths.length > 0 && <><p className="mt-2 text-xs font-bold">Strengths</p><ul className="list-disc pl-5">{t.aiFeedback.strengths.map((x, i) => <li key={i} className="[overflow-wrap:anywhere]">{x}</li>)}</ul></>}
          {t.aiFeedback.improvements.length > 0 && <><p className="mt-2 text-xs font-bold">To improve</p><ul className="list-disc pl-5">{t.aiFeedback.improvements.map((x, i) => <li key={i} className="[overflow-wrap:anywhere]">{x}</li>)}</ul></>}
        </section>
      )}
      <section><h3 className={H3}>Why this XP</h3>
        {r.xp.length ? (
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
            {r.xp.map((x, i) => <div key={i} className="contents"><dt className="text-text-secondary">{x.label}</dt><dd className="text-right font-semibold tabular-nums">{typeof x.value === "number" && x.value > 0 && i > 0 ? `+${x.value}` : x.value}</dd></div>)}
            <dt className="border-t border-ink/[0.08] pt-1 font-bold">Total XP for this task</dt><dd className="border-t border-ink/[0.08] pt-1 text-right font-black tabular-nums">{r.xpTotal}</dd>
          </dl>
        ) : <p className="text-text-secondary">XP is paid when the Team Lead approves the task. Worth about {t.xp} XP before quality and timing.</p>}
      </section>
    </>
  );
}

const EXT = { PENDING: ["pending", "Waiting for your Team Lead"], APPROVED: ["approved", "Approved"], REJECTED: ["rejected", "Declined"] };
const TRIES = { waiting: ["pending", "One more try asked: waiting"], allowed: ["approved", "One more try allowed"], declined: ["rejected", "One more try declined"] };

// Ask for more time (D-179): new date + reason, goes to the task's Team Lead.
function ExtensionForm({ t, onSent, onCancel }) {
  const [f, setF] = useState({ newDeadline: "", reason: "" });
  const [er, setEr] = useState({});
  const [busy, setBusy] = useState(false);
  async function send(e) {
    e.preventDefault(); if (busy) return;
    const x = {};
    if (!f.newDeadline) x.newDeadline = "Pick the new date.";
    if (f.reason.trim().length < 10) x.reason = "Write a reason of at least 10 characters.";
    setEr(x); if (Object.keys(x).length) { document.getElementById(x.newDeadline ? "ext-date" : "ext-reason")?.focus(); return; }
    setBusy(true);
    try { await api.post(`/api/workspace/tasks/${t.id}/extension`, { newDeadline: `${f.newDeadline}T17:00:00`, reason: f.reason.trim() }); onSent(); }
    catch (err) { setEr(err?.data?.field ? { [err.data.field]: err.message } : { form: err?.message ?? "It could not be sent." }); }
    finally { setBusy(false); }
  }
  const [min] = useState(() => new Date(Math.max(Date.now(), new Date(t.deadline).getTime()) + 86_400_000).toISOString().slice(0, 10));
  return (
    <form noValidate onSubmit={send} className="flex flex-col gap-3 rounded-xl border border-ink/[0.08] p-3" aria-label="Ask for more time">
      <p className="text-xs text-text-secondary">Your Team Lead decides; the Manager is told. One open request per task.</p>
      {er.form && <p role="alert" className="text-xs font-semibold text-[#B01F17]">{er.form}</p>}
      <label htmlFor="ext-date" className="flex flex-col gap-1 text-xs font-bold">New deadline<input id="ext-date" name="newDeadline" autoComplete="off" type="date" min={min} value={f.newDeadline} onChange={(e) => setF({ ...f, newDeadline: e.target.value })} aria-invalid={!!er.newDeadline} className="h-10 w-48 rounded-xl px-3 font-normal tabular-nums" />
        {er.newDeadline && <span className="font-semibold text-[#B01F17]">{er.newDeadline}</span>}</label>
      <label htmlFor="ext-reason" className="flex flex-col gap-1 text-xs font-bold">Reason<textarea id="ext-reason" name="reason" rows={3} maxLength={500} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} aria-invalid={!!er.reason} placeholder="What happened and what the extra time is for…" className="rounded-xl p-3 text-sm font-normal" />
        {er.reason && <span className="font-semibold text-[#B01F17]">{er.reason}</span>}</label>
      <span className="flex gap-2"><button type="submit" className={BTN.primary} disabled={busy}>{busy ? "Sending…" : "Send request"}</button><button type="button" className={BTN.ghost} onClick={onCancel}>Cancel</button></span>
    </form>
  );
}

// Ask for one more try at the resubmission limit (D-180).
function TriesForm({ t, onSent, onCancel }) {
  const [reason, setReason] = useState("");
  const [er, setEr] = useState(null);
  const [busy, setBusy] = useState(false);
  async function send(e) {
    e.preventDefault(); if (busy) return;
    if (reason.trim().length < 10) { setEr("Write a reason of at least 10 characters."); document.getElementById("tries-reason")?.focus(); return; }
    setBusy(true);
    try { await api.post(`/api/workspace/tasks/${t.id}/more-tries`, { reason: reason.trim() }); onSent(); }
    catch (err) { setEr(err?.message ?? "It could not be sent."); }
    finally { setBusy(false); }
  }
  return (
    <form noValidate onSubmit={send} className="flex flex-col gap-2 rounded-xl border border-ink/[0.08] p-3" aria-label="Ask for one more try">
      <label htmlFor="tries-reason" className="flex flex-col gap-1 text-xs font-bold">Why one more try?<textarea id="tries-reason" name="reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!er} placeholder="What you changed or will change this time…" className="rounded-xl p-3 text-sm font-normal" /></label>
      {er && <p role="alert" className="text-xs font-semibold text-[#B01F17]">{er}</p>}
      <span className="flex gap-2"><button type="submit" className={BTN.primary} disabled={busy}>{busy ? "Sending…" : "Send to my Team Lead"}</button><button type="button" className={BTN.ghost} onClick={onCancel}>Cancel</button></span>
    </form>
  );
}

export default function EmployeeTaskDrawer({ taskId, onClose, onOpenTask, onChanged, compose = false, onComposeChange, initialTab = "overview" }) {
  const addToast = useUiStore((s) => s.addToast);
  const kind = employeeKind(useAuthStore((s) => s.user?.role)) ?? "developer";
  const url = taskId ? `/api/workspace/tasks/${taskId}/full` : null;
  const { data: t, error, reload, setData } = useLoad(url);
  const [tab, setTab] = useState(initialTab);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null); // "extension" | "tries" | null
  useEffect(() => { setTab(initialTab); setForm(null); }, [taskId, initialTab]); // eslint-disable-line react-hooks/set-state-in-effect
  const setCompose = (v) => onComposeChange?.(v);

  const refresh = () => { if (url) api.get(url).then(setData).catch(() => reload()); onChanged?.(); };
  async function act(fn, ok) {
    setBusy(true);
    try { const r = await fn(); if (ok) addToast({ type: "success", message: ok }); refresh(); return r ?? true; }
    catch (e) { addToast({ type: "error", message: e?.message ?? "That did not work." }); return null; }
    finally { setBusy(false); }
  }
  const startTask = () => act(() => api.patch(`/api/tasks/${taskId}/status`, { status: "In-Progress" }), "Task started. Good luck!");

  const primary = !t ? null : t.action === "start" ? <button type="button" className={BTN.primary} disabled={busy} onClick={startTask}>Start</button>
    : t.action === "blocked" ? <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5C3D00]"><Lock size={14} aria-hidden="true" />Waiting for a prerequisite</span>
    : t.action === "submit" ? <button type="button" className={BTN.primary} onClick={() => setCompose(true)}>Submit work</button>
    : t.action === "resubmit" ? <button type="button" className={BTN.primary} disabled={t.triesLeft === 0} title={t.triesLeft === 0 ? "No tries left. Ask your Team Lead for one more." : undefined} onClick={() => setCompose(true)}>Resubmit</button>
    : t.action === "view" ? <button type="button" className={BTN.secondary} onClick={() => setTab("review")}>View submission</button> : null;

  const count = (k) => (k === "subtasks" ? t.subtasks.length : k === "comments" ? t.comments.length + t.attachments.length : 0);
  const body = !taskId ? null : error ? <ErrorState message={error} onRetry={reload} /> : !t ? <div aria-busy="true" aria-label="Loading the task" className="flex flex-col gap-3 p-5"><Skeleton className="h-10 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div> : (
    <div className="flex flex-col gap-4 p-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={STATUS_CHIP[t.status]} label={statusLabel(t.status)} size="xs" />
        <span className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[11px] font-semibold">{t.type}</span>
        <span className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[11px] font-semibold">{t.priority} priority</span>
        {t.sprint && <span title={t.sprint.name} className="inline-flex max-w-[200px] rounded-full border border-ink/[0.12] px-2 py-0.5 text-[11px] font-semibold text-text-secondary"><span className="truncate">Sprint: {t.sprint.name}</span></span>}
        {t.blocked && <span className="inline-flex items-center gap-1 rounded-full border border-[#8A6200]/30 bg-[#FFC21A]/10 px-2 py-0.5 text-[11px] font-semibold text-[#5C3D00]"><Lock size={11} aria-hidden="true" />Blocked</span>}
        {t.review?.decision === "revision" && t.status === "In-Progress" && <span className="rounded-full border border-[#B01F17]/30 bg-[#B01F17]/[0.06] px-2 py-0.5 text-[11px] font-semibold text-[#B01F17]">Revision requested</span>}
        {t.qaRequired && <span className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[11px] font-semibold">QA sign-off</span>}
      </div>
      {(primary || !t.mine) && <div className="flex flex-wrap items-center gap-3">{primary}
        {t.canAskExtension && form !== "extension" && <button type="button" className={BTN.secondary} onClick={() => setForm("extension")}><CalendarClock size={14} aria-hidden="true" />Ask for more time</button>}
        {t.moreTries?.canAsk && form !== "tries" && <button type="button" className={BTN.secondary} onClick={() => setForm("tries")}><RotateCcw size={14} aria-hidden="true" />Ask for one more try</button>}
        {!t.mine && <span className="text-xs text-text-secondary">You can read this task because you are on its project. Only its assignees work on it.</span>}</div>}
      {t.action === "resubmit" && t.triesLeft === 0 && !t.moreTries?.state && <p className="text-xs text-text-secondary">You used every try on this task. Ask your Team Lead for one more.</p>}
      {t.moreTries?.state && <p className="flex flex-wrap items-center gap-2"><StatusChip status={TRIES[t.moreTries.state][0]} label={TRIES[t.moreTries.state][1]} size="xs" />{t.moreTries.note && <span className="text-xs text-text-secondary [overflow-wrap:anywhere]">"{t.moreTries.note}"</span>}</p>}
      {t.extensions.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="Your requests for more time">{t.extensions.slice(-3).map((e, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 text-xs"><StatusChip status={EXT[e.status]?.[0]} label={`More time to ${fmt(e.requestedDeadline)}: ${EXT[e.status]?.[1] ?? e.status}`} size="xs" />{e.note && <span className="text-text-secondary [overflow-wrap:anywhere]">"{e.note}"</span>}</li>))}</ul>
      )}
      {form === "extension" && <ExtensionForm t={t} onCancel={() => setForm(null)} onSent={() => { setForm(null); addToast({ type: "success", message: "Request sent to your Team Lead." }); refresh(); }} />}
      {form === "tries" && <TriesForm t={t} onCancel={() => setForm(null)} onSent={() => { setForm(null); addToast({ type: "success", message: "Request sent to your Team Lead." }); refresh(); }} />}

      <div role="tablist" aria-label="Task sections" className="-mx-5 flex flex-wrap gap-x-0.5 border-b border-border-subtle px-5"
        onKeyDown={(e) => { if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return; const i = TABS.findIndex(([k]) => k === tab), n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0]; setTab(n); requestAnimationFrame(() => document.getElementById(`etd-${n}`)?.focus()); }}>
        {TABS.map(([k, l]) => (
          <button key={k} id={`etd-${k}`} role="tab" type="button" aria-selected={tab === k} aria-controls="etd-panel" tabIndex={tab === k ? 0 : -1} onClick={() => setTab(k)}
            className={`min-h-10 whitespace-nowrap border-b-2 px-2.5 text-xs font-bold transition-colors ${tab === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            {l}{count(k) ? ` (${count(k)})` : ""}
          </button>
        ))}
      </div>

      <div id="etd-panel" role="tabpanel" aria-labelledby={`etd-${tab}`} className="flex flex-col gap-4">
        {tab === "overview" && (
          <>
            <dl className="grid grid-cols-[110px_1fr] gap-y-2">
              {t.project && <><dt className="text-text-secondary">Project</dt><dd className="min-w-0 truncate font-semibold" title={t.project.title}>{t.project.title}</dd></>}
              <dt className="text-text-secondary">Deadline</dt><dd className="tabular-nums">{t.deadline ? fmt(t.deadline) : "No deadline"}</dd>
              <dt className="text-text-secondary">Expected time</dt><dd className="tabular-nums">{t.estimatedHours != null ? `${t.estimatedHours} h` : "—"}</dd>
              <dt className="text-text-secondary">Difficulty</dt><dd>{t.difficulty}</dd>
              <dt className="text-text-secondary">XP</dt><dd className="tabular-nums">About {t.xp} XP</dd>
              <dt className="text-text-secondary">Assigned to</dt><dd className="min-w-0 [overflow-wrap:anywhere]">{t.assignees.map((a) => a.name).join(", ") || "Nobody yet"}</dd>
              {t.parent && <><dt className="text-text-secondary">Subtask of</dt><dd><button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => onOpenTask(t.parent.id)}>{t.parent.title}</button></dd></>}
            </dl>
            <section><h3 className={H3}>Description</h3><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{t.description || <span className="text-text-secondary">No description.</span>}</p></section>
            <section><h3 className={H3}>Acceptance criteria</h3>
              {t.acceptanceCriteria.length ? <ul className="flex flex-col gap-1.5">{t.acceptanceCriteria.map((c, i) => {
                const unmet = t.review?.lastRevision?.unmet?.includes(c) && t.review.decision === "revision";
                return <li key={i} className="flex gap-2">{unmet ? <Circle size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-[#B01F17]" /> : <Check size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-text-secondary" />}<span className="[overflow-wrap:anywhere]">{c}{unmet && <span className="ml-1 text-xs font-semibold text-[#B01F17]">(not met yet)</span>}</span></li>;
              })}</ul> : <p className="text-text-secondary">No criteria written. Ask your Team Lead in a comment if the goal is unclear.</p>}
              {t.acceptanceCriteria.length > 0 && t.mine && t.status !== "Done" && <p className="mt-1.5 text-xs text-text-secondary">You tick these when you submit your work.</p>}
            </section>
            <section><h3 className={H3}>Benchmark</h3><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{t.benchmark || <span className="text-text-secondary">None given.</span>}</p></section>
            <FromDesign items={t.fromDesign} />
            {(t.dependsOn.length > 0 || t.blocks.length > 0) && (
              <section><h3 className={H3}>Blockers and dependencies</h3>
                {t.dependsOn.length > 0 && <><p className="text-xs text-text-secondary">Waits for</p><ul className="flex flex-col">{t.dependsOn.map((x) => <MiniRow key={x.id} x={x} onOpen={onOpenTask} />)}</ul></>}
                {t.blocks.length > 0 && <><p className="mt-2 text-xs text-text-secondary">Others wait for this</p><ul className="flex flex-col">{t.blocks.map((x) => <MiniRow key={x.id} x={x} onOpen={onOpenTask} />)}</ul></>}
              </section>
            )}
          </>
        )}
        {tab === "subtasks" && (t.subtasks.length ? <ul className="flex flex-col">{t.subtasks.map((x) => <MiniRow key={x.id} x={x} onOpen={onOpenTask} />)}</ul> : <p className="text-text-secondary">No subtasks. Your Team Lead adds them when a task needs smaller steps.</p>)}
        {tab === "time" && <TimeLog t={t} taskId={taskId} onSaved={refresh} />}
        {tab === "comments" && (
          <>
            <FromDesign items={t.fromDesign} />
            <TaskComments t={t} taskId={taskId} act={act} busy={busy} base={`/api/tasks/${taskId}`} placeholder="Ask or update your Team Lead. Type @ to mention someone…" />
            <section><h3 className={H3}>Files ({t.attachments.length})</h3>
              {t.attachments.length ? <ul className="flex flex-col gap-1">{t.attachments.map((a) => (
                <li key={a.id} className="flex min-w-0 items-center gap-2"><Paperclip size={13} aria-hidden="true" className="shrink-0 text-text-secondary" /><FileLink href={a.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold underline">{a.name}</FileLink><span className="shrink-0 text-xs text-text-secondary">{a.by ?? ""}</span></li>))}</ul>
                : <p className="text-text-secondary">No files on this task.</p>}
            </section>
          </>
        )}
        {tab === "activity" && (t.history.length ? <ol className="flex flex-col divide-y divide-ink/[0.05]">{t.history.map((a, i) => (
          <li key={i} className="flex justify-between gap-3 py-2"><span className="min-w-0 [overflow-wrap:anywhere]"><strong className="font-semibold">{a.who}</strong> · {ACTIVITY[a.kind] ?? a.kind}{a.kind === "status" || a.kind === "submitted" ? `: ${statusLabel(a.from) || "—"} → ${statusLabel(a.to)}` : ""}{a.note ? ` (${a.note})` : ""}</span><span className="shrink-0 tabular-nums text-text-secondary">{fmtDateTime(a.at)}</span></li>))}</ol>
          : <p className="text-text-secondary">No activity yet.</p>)}
        {tab === "review" && <Review t={t} />}
        {tab === "bugs" && <TaskBugs taskId={taskId} />}
      </div>
    </div>
  );

  const composing = compose && t && ["submit", "resubmit"].includes(t.action) && !(t.action === "resubmit" && t.triesLeft === 0);
  return (
    <Drawer open={!!taskId} onClose={onClose} title={composing ? `Submit: ${t.title}` : t?.title ?? "Task"} width={560}>
      {composing ? <SubmitComposer key={t.id} t={t} kind={kind} onCancel={() => setCompose(false)} onDone={() => { setCompose(false); setTab("review"); refresh(); }} /> : body}
    </Drawer>
  );
}
