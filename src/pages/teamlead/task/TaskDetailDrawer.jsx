// Team Lead task detail drawer with tabs (V2 Phase 4 · T-2, UX TL v4 §6.1, D-120, D-124, D-125). Details | Subtasks |
// Dependencies | Comments & files | Time log | Activity | Submission & review | AI help. Actions: Edit, Duplicate,
// Delete (Backlog / To Do only, confirm), Extend deadline (reason, org rules), Reassign (Team page).
import FileLink from "@/components/ui/FileLink";
import TaskComments from "./TaskComments";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Paperclip, Trash2, Sparkles } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Drawer from "@/components/ui/Drawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import { BTN } from "@/components/ui/buttons";
import useLoad from "../../manager/project/useLoad";
import { fmt } from "../../manager/project/format";
import TaskFormDrawer from "./TaskFormDrawer";

const TABS = [["details", "Details"], ["subtasks", "Subtasks"], ["deps", "Dependencies"], ["comments", "Comments & files"], ["time", "Time log"], ["activity", "Activity"], ["review", "Submission & review"], ["ai", "AI help"]];
const CHIP = { Backlog: "on_hold", "To-Do": "planned", "In-Progress": "maintenance", "In-Review": "pending", Done: "completed" };
const H3 = "mb-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500";
const hm = (n) => `${Math.floor(n / 60)}h ${n % 60}m`;

function Row({ t, onOpen }) {
  return (
    <li><button type="button" onClick={() => onOpen(t.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-ink/[0.03]">
      <span className="min-w-0 flex-1 truncate font-semibold text-text-primary">{t.title}{t.assignee ? <span className="font-normal text-text-secondary"> · {t.assignee}</span> : null}</span>
      <StatusChip status={CHIP[t.status]} label={t.status.replace("-", " ")} size="xs" />
    </button></li>
  );
}

export default function TaskDetailDrawer({ taskId, onClose, onOpenTask, onChanged }) {
  const addToast = useUiStore((s) => s.addToast);
  const url = taskId ? `/api/teamlead/tasks/${taskId}/full` : null;
  const { data: t, error, reload, setData } = useLoad(url);
  const [tab, setTab] = useState("details");
  const [editing, setEditing] = useState(null);       // task (maybe with AI fields merged) | null
  const [newSub, setNewSub] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [extending, setExtending] = useState(false);
  const [ext, setExt] = useState({ days: "3", reason: "" });
  const [extErr, setExtErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState({ status: "idle" });
  useEffect(() => { setTab("details"); setAi({ status: "idle" }); }, [taskId]); // eslint-disable-line react-hooks/set-state-in-effect

  // T-4: refresh in place, so a reaction or comment does not blank the drawer.
  const changed = () => { if (url) api.get(url).then(setData).catch(() => reload()); onChanged?.(); };
  async function act(fn, ok) {
    setBusy(true);
    try { const r = await fn(); if (ok) addToast({ type: "success", message: typeof ok === "function" ? ok(r) : ok }); changed(); return r; }
    catch (e) { addToast({ type: "error", message: e?.message ?? "That did not work." }); return null; }
    finally { setBusy(false); }
  }
  async function duplicate() { const r = await act(() => api.post(`/api/teamlead/tasks/${taskId}/duplicate`, {}), (x) => `Copy created: "${x.title}".`); if (r) onOpenTask?.(r.id); }
  async function remove() { setDeleting(false); const r = await act(() => api.delete(`/api/teamlead/tasks/${taskId}`), "Task deleted."); if (r) onClose(); }
  async function extend(e) {
    e.preventDefault();
    const er = {};
    if (!(Number.isInteger(Number(ext.days)) && Number(ext.days) >= 1 && Number(ext.days) <= 60)) er.days = "Extend by 1 to 60 days.";
    if (ext.reason.trim().length < 10) er.reason = "Write a reason of at least 10 characters.";
    setExtErr(er); if (Object.keys(er).length) return;
    try {
      const r = await api.post(`/api/teamlead/tasks/${taskId}/extend`, { days: Number(ext.days), reason: ext.reason.trim() });
      addToast({ type: "success", message: r?.status === "pending" || r?.extension?.status === "pending" ? "Request sent; it needs approval under your organization's rules." : "Deadline extended." });
      setExtending(false); setExt({ days: "3", reason: "" }); changed();
    } catch (err) { setExtErr(err?.data?.fields ?? { reason: err?.message ?? "Could not extend." }); }
  }
  async function upload(files) {
    if (!files.length) return;
    const fd = new FormData(); [...files].slice(0, 5).forEach((x) => fd.append("files", x));
    await act(() => api.upload(`/api/teamlead/tasks/${taskId}/attachments`, fd), "File added.");
  }
  async function askAi() {
    setAi({ status: "loading" });
    try { const r = await api.post("/api/teamlead/ai/task-suggest", { title: t.title, type: t.type, priority: t.priority, difficulty: t.difficulty, description: t.description, projectId: t.projectId }, { silent: true }); setAi({ status: "done", s: r.suggestion }); }
    catch (e) { setAi({ status: "error", message: e?.status === 503 ? "AI is not configured. Everything else works as usual." : e?.message ?? "AI is unavailable right now. Try again." }); }
  }

  const body = !taskId ? null : error ? <ErrorState message={error} onRetry={reload} /> : !t ? <div className="flex flex-col gap-3 p-5"><Skeleton className="h-10 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div> : (
    <div className="flex flex-col gap-4 p-5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={CHIP[t.status]} label={t.status.replace("-", " ")} size="xs" />
        {t.limitState === "waiting" && <span className="inline-flex items-center gap-1 rounded-full border border-[#8A6200]/30 bg-[#FFC21A]/10 px-2 py-0.5 text-[11px] font-semibold text-[#5C3D00]">Waiting for Manager</span>}
        {t.limitState === "declined" && <span className="inline-flex items-center gap-1 rounded-full border border-[#B01F17]/30 bg-[#B01F17]/10 px-2 py-0.5 text-[11px] font-semibold text-[#B01F17]">Manager declined another try</span>}
        {t.sprint && <Link to={`/teamlead/sprints/${t.sprint.id}`} title={t.sprint.name} className="inline-flex max-w-[220px] items-center rounded-full border border-ink/[0.12] px-2 py-0.5 text-[11px] font-semibold text-text-secondary hover:text-text-primary"><span className="truncate">Sprint: {t.sprint.name}</span></Link>}
        {t.blocked && <span className="inline-flex items-center gap-1 rounded-full border border-[#8A6200]/30 bg-[#FFC21A]/10 px-2 py-0.5 text-[11px] font-semibold text-[#5C3D00]"><Lock size={11} aria-hidden="true" />Blocked by a prerequisite</span>}
        {t.qaRequired && <span className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[11px] font-semibold">QA required</span>}
        {t.groupTag && <span className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[11px] font-semibold">Group task · {t.groupSize} people</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {t.status !== "Done" && <button type="button" className={BTN.secondary} onClick={() => setEditing(t)}>Edit</button>}
        <button type="button" className={BTN.secondary} disabled={busy} onClick={duplicate}>Duplicate</button>
        {t.status !== "Done" && t.deadline && <button type="button" className={BTN.secondary} onClick={() => { setExtErr({}); setExtending(true); }}>Extend deadline</button>}
        {t.assignees[0] && ["Backlog", "To-Do", "In-Progress"].includes(t.status) && <Link to={`/teamlead/team?member=${t.assignees[0].id}`} className={BTN.secondary}>Reassign</Link>}
        {t.canDelete ? <button type="button" className={BTN.ghost} onClick={() => setDeleting(true)}><Trash2 size={14} aria-hidden="true" />Delete</button>
          : <span className="self-center text-xs text-text-secondary" title="Only tasks in Backlog or To Do can be deleted.">Delete: only in Backlog / To Do</span>}
      </div>

      <div role="tablist" aria-label="Task sections" className="-mx-5 flex gap-0.5 overflow-x-auto border-b border-border-subtle px-5"
        onKeyDown={(e) => { if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return; const i = TABS.findIndex(([k]) => k === tab), n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0]; setTab(n); requestAnimationFrame(() => document.getElementById(`tdt-${n}`)?.focus()); }}>
        {TABS.map(([k, l]) => (
          <button key={k} id={`tdt-${k}`} role="tab" type="button" aria-selected={tab === k} aria-controls="tdt-panel" tabIndex={tab === k ? 0 : -1} onClick={() => setTab(k)}
            className={`whitespace-nowrap border-b-2 px-2.5 py-2 text-xs font-bold transition-colors ${tab === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            {l}{k === "subtasks" && t.subtasks.length ? ` (${t.subtasks.length})` : k === "deps" && t.dependsOn.length + t.blocks.length ? ` (${t.dependsOn.length + t.blocks.length})` : k === "comments" && t.comments.length + t.attachments.length ? ` (${t.comments.length + t.attachments.length})` : ""}
          </button>
        ))}
      </div>

      <div id="tdt-panel" role="tabpanel" aria-labelledby={`tdt-${tab}`} className="flex flex-col gap-4">
        {tab === "details" && (
          <>
            <dl className="grid grid-cols-[120px_1fr] gap-y-2">
              <dt className="text-text-secondary">Assignee</dt><dd className="font-semibold">{t.assignees.map((a) => a.name).join(", ") || "Unassigned"}</dd>
              <dt className="text-text-secondary">Category</dt><dd>{t.type} · {t.priority} priority · {t.difficulty}</dd>
              <dt className="text-text-secondary">Estimate</dt><dd className="tabular-nums">{t.estimatedHours != null ? `${t.estimatedHours} h` : "—"}</dd>
              <dt className="text-text-secondary">Dates</dt><dd className="tabular-nums">{t.startDate ? fmt(t.startDate) : "—"} → {t.deadline ? fmt(t.deadline) : "no deadline"}{t.isLate ? " · late" : ""}</dd>
              <dt className="text-text-secondary">XP</dt><dd className="tabular-nums">{t.xpValue ?? "default for the priority"}</dd>
              <dt className="text-text-secondary">Tags</dt><dd>{t.tags.length ? t.tags.join(", ") : "—"}</dd>
              {t.parent && <><dt className="text-text-secondary">Subtask of</dt><dd><button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => onOpenTask?.(t.parent.id)}>{t.parent.title}</button></dd></>}
            </dl>
            <section><h3 className={H3}>Description</h3><p className="whitespace-pre-wrap">{t.description || <span className="text-text-secondary">No description.</span>}</p></section>
            <section><h3 className={H3}>Acceptance criteria</h3>{t.acceptanceCriteria.length ? <ul className="list-disc pl-5">{t.acceptanceCriteria.map((c, i) => <li key={i}>{c}</li>)}</ul> : <p className="text-text-secondary">None yet. Add them with Edit.</p>}</section>
            <section><h3 className={H3}>Benchmark</h3><p className="whitespace-pre-wrap">{t.benchmark || <span className="text-text-secondary">None yet.</span>}</p></section>
          </>
        )}
        {tab === "subtasks" && (
          <>
            {t.subtasks.length ? <ul className="flex flex-col">{t.subtasks.map((x) => <Row key={x.id} t={x} onOpen={(id) => onOpenTask?.(id)} />)}</ul> : <p className="text-text-secondary">No subtasks.</p>}
            {!t.parent && t.status !== "Done" && <button type="button" className={`${BTN.secondary} self-start`} onClick={() => setNewSub(true)}>Add subtask</button>}
            {t.parent && <p className="text-xs text-text-secondary">This is already a subtask; subtasks go one level deep.</p>}
          </>
        )}
        {tab === "deps" && (
          <>
            <section><h3 className={H3}>Waits for</h3>
              {t.dependsOn.length ? <ul className="flex flex-col">{t.dependsOn.map((x) => <Row key={x.id} t={x} onOpen={(id) => onOpenTask?.(id)} />)}</ul> : <p className="text-text-secondary">Nothing. It can start any time.</p>}
              {t.blocked && <p className="mt-1 text-xs text-[#5C3D00]">It cannot start until every task above is Done. When the last one is approved, the assignee gets a "Task unblocked" notification.</p>}
            </section>
            <section><h3 className={H3}>Blocks</h3>{t.blocks.length ? <ul className="flex flex-col">{t.blocks.map((x) => <Row key={x.id} t={x} onOpen={(id) => onOpenTask?.(id)} />)}</ul> : <p className="text-text-secondary">No task waits for this one.</p>}</section>
            {t.status !== "Done" && <button type="button" className={`${BTN.secondary} self-start`} onClick={() => setEditing(t)}>Change dependencies</button>}
          </>
        )}
        {tab === "comments" && (
          <>
            <TaskComments t={t} taskId={taskId} act={act} busy={busy} />
            <section><h3 className={H3}>Files ({t.attachments.length})</h3>
              {t.attachments.length ? <ul className="flex flex-col gap-1">{t.attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-2"><Paperclip size={13} aria-hidden="true" className="shrink-0 text-text-secondary" /><FileLink href={a.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold underline">{a.name}</FileLink>
                  <span className="shrink-0 text-xs text-text-secondary">{a.by ?? ""}</span>
                  <button type="button" aria-label={`Remove file ${a.name}`} className={BTN.icon} onClick={() => act(() => api.delete(`/api/teamlead/tasks/${taskId}/attachments/${a.id}`), "File removed.")}><Trash2 size={14} aria-hidden="true" /></button></li>))}</ul>
                : <p className="text-text-secondary">No files.</p>}
              <label htmlFor="td-files" className="mt-2 flex flex-col gap-1 text-xs font-bold">Add files (PDF, DOC, DOCX, CSV, PNG, JPG; 5 MB each)
                <input id="td-files" type="file" multiple accept=".pdf,.doc,.docx,.csv,.png,.jpg,.jpeg" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} className="font-normal" /></label>
            </section>
          </>
        )}
        {tab === "time" && (
          <>
            <p><strong className="tabular-nums">{hm(t.time.minutes)}</strong> logged{t.estimatedHours != null ? ` of ${t.estimatedHours} h estimated` : ""}. The assignee logs time on their task page.</p>
            {t.time.logs.length ? <ul className="flex flex-col gap-1">{t.time.logs.map((l, i) => <li key={i} className="flex justify-between gap-3"><span className="min-w-0 truncate">{l.who}{l.note ? ` · ${l.note}` : ""}</span><span className="shrink-0 tabular-nums text-text-secondary">{hm(l.minutes)} · {fmt(l.at)}</span></li>)}</ul> : <p className="text-text-secondary">No time logged yet.</p>}
          </>
        )}
        {tab === "activity" && (t.history?.length ? <ol className="flex flex-col gap-1.5">{t.history.map((a, i) => <li key={i} className="flex justify-between gap-3"><span className="min-w-0">{a.who} · {a.kind === "status" ? `${a.from ?? "—"} → ${a.to}` : a.kind}{a.note ? ` (${a.note})` : ""}</span><span className="shrink-0 tabular-nums text-text-secondary">{fmt(a.at)}</span></li>)}</ol> : <p className="text-text-secondary">No activity yet.</p>)}
        {tab === "review" && (
          <>
            <section><h3 className={H3}>Submission</h3>
              {t.submission.note || t.submission.links.length || t.submission.files.length ? (
                <ul className="flex flex-col gap-1">{t.submission.note && <li>{t.submission.note}</li>}
                  {[...t.submission.links.map((l) => ({ name: l.label || l.url, url: l.url })), ...t.submission.files].filter((x) => x.url).map((x, i) => <li key={i}><FileLink href={x.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{x.name}</FileLink></li>)}</ul>
              ) : <p className="text-text-secondary">Nothing submitted yet.</p>}
            </section>
            <section><h3 className={H3}>Review</h3>
              {t.review.tlScore == null ? <p className="text-text-secondary">Not reviewed yet.{t.status === "In-Review" ? " " : ""}{t.status === "In-Review" && <Link to={`/teamlead/review/${taskId}`} className="font-semibold underline">Open the review</Link>}</p> : (
                <p>Your score <strong className="tabular-nums">{t.review.tlScore}</strong> · AI <strong className="tabular-nums">{t.review.aiScore ?? "—"}</strong>{t.review.disagree ? " · AI and you disagree by more than 20" : ""}{t.review.note ? ` · "${t.review.note}"` : ""}</p>
              )}
              {t.aiReview?.status === "done" && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div><p className="text-xs font-bold">AI: strengths</p><ul className="list-disc pl-5 text-xs">{(t.aiReview.strengths ?? []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                  <div><p className="text-xs font-bold">AI: improvements</p><ul className="list-disc pl-5 text-xs">{(t.aiReview.improvements ?? []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                </div>
              )}
            </section>
          </>
        )}
        {tab === "ai" && (
          <>
            <p className="text-text-secondary">The AI suggests a description, an estimate and tags. Nothing changes until you open them in Edit and save. Benchmark and review hints come with the Team Lead AI assistant later.</p>
            {ai.status !== "done" && <button type="button" className={`${BTN.secondary} self-start`} disabled={ai.status === "loading"} onClick={askAi}><Sparkles size={14} aria-hidden="true" />{ai.status === "loading" ? "Asking…" : "Suggest with AI"}</button>}
            {ai.status === "error" && <p role="status" className="text-xs text-text-secondary">{ai.message}</p>}
            {ai.status === "done" && (
              <div className="flex flex-col gap-2 rounded-xl border border-accent/15 bg-accent/[0.03] p-3" aria-live="polite">
                <p className="whitespace-pre-wrap">{ai.s.description}</p>
                <p className="text-xs text-text-secondary">Estimate {ai.s.estimatedHours} h{ai.s.estimatedHours > 14 ? " (over 14 h: split the task)" : ""} · tags {ai.s.tags.join(", ") || "none"} · {ai.s.why}</p>
                <span className="flex flex-wrap gap-2">
                  <button type="button" className={BTN.primary} onClick={() => { setEditing({ ...t, description: ai.s.description, estimatedHours: Math.min(14, Math.max(1, ai.s.estimatedHours)), tags: [...new Set([...t.tags, ...ai.s.tags])].slice(0, 5) }); setAi({ status: "idle" }); }}>Open in Edit</button>
                  <button type="button" className={BTN.ghost} onClick={() => setAi({ status: "idle" })}>Decline</button>
                </span>
                <span className="text-[11px] text-text-secondary">AI-generated. Check it before saving.</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Drawer open={!!taskId} onClose={onClose} title={t?.title ?? "Task"} width={560}>
        {body}
        {/* Inside the Drawer so the dialogs stack above it (M-4 pattern, layer z-[70]). */}
      <ConfirmModal open={deleting} layer="z-[70]" onClose={() => setDeleting(false)} onConfirm={remove} loading={busy} destructive confirmLabel="Delete task"
        title={`Delete "${t?.title}"?`} body="The task is removed. Only tasks that have not started can be deleted." />
      <ConfirmModal open={extending} layer="z-[70]" onClose={() => setExtending(false)} onConfirm={() => document.getElementById("td-ext-form")?.requestSubmit()} confirmLabel="Extend deadline"
        title="Extend the deadline" body={`Current deadline: ${t?.deadline ? fmt(t.deadline) : "none"}. Within your organization's limits it moves at once; above them it waits for approval.`}>
        <form id="td-ext-form" onSubmit={extend} className="mt-3 flex flex-col gap-3 text-sm">
          <label htmlFor="td-ext-days" className="flex flex-col gap-1 font-bold">Days<input id="td-ext-days" type="number" min={1} max={60} value={ext.days} onChange={(e) => setExt({ ...ext, days: e.target.value })} aria-invalid={!!extErr.days} className="h-10 w-32 rounded-xl px-3 font-normal tabular-nums" />
            {extErr.days && <span className="text-xs font-semibold text-[#B01F17]">{extErr.days}</span>}</label>
          <label htmlFor="td-ext-reason" className="flex flex-col gap-1 font-bold">Reason<textarea id="td-ext-reason" rows={3} maxLength={500} value={ext.reason} onChange={(e) => setExt({ ...ext, reason: e.target.value })} aria-invalid={!!extErr.reason} placeholder="Why the extra time is needed…" className="rounded-xl p-3 font-normal" />
            {extErr.reason && <span className="text-xs font-semibold text-[#B01F17]">{extErr.reason}</span>}</label>
        </form>
      </ConfirmModal>
      </Drawer>
      <TaskFormDrawer open={!!editing} task={editing} onClose={() => setEditing(null)} onSaved={() => { addToast({ type: "success", message: "Task saved." }); changed(); }} />
      <TaskFormDrawer open={newSub} preset={t ? { projectId: String(t.projectId ?? ""), parentId: String(t.id), mode: "single" } : null} onClose={() => setNewSub(false)}
        onSaved={() => { addToast({ type: "success", message: "Subtask created." }); changed(); }} />
    </>
  );
}
