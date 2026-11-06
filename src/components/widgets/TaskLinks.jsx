import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, CheckCircle2, Circle, Plus } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";

// V1 1.9 — subtasks (one level) and prerequisites. Server enforces the rules; this panel shows and edits them.
const PANEL = "rounded-2xl p-5 bg-bg-surface border border-ink/[0.08]";
const HEAD  = "text-[14px] font-bold uppercase tracking-widest text-slate-600";

function StatusDot({ status }) {
  return status === "Done"
    ? <CheckCircle2 size={14} className="shrink-0 text-[#0E6A30]" aria-label="Done" />
    : <Circle size={14} className="shrink-0 text-slate-500" aria-label={status} />;
}

function TaskRow({ t }) {
  return (
    <li className="flex items-center gap-2 py-1.5 border-b border-ink/[0.05] last:border-0">
      <StatusDot status={t.status} />
      <Link to={`/workspace/tasks/${t._id}`} className="min-w-0 flex-1 truncate text-xs font-semibold text-text-primary hover:underline underline-offset-2">
        {t.title}
      </Link>
      <span className="shrink-0 text-[12px] text-text-secondary">{t.status}</span>
    </li>
  );
}

export default function TaskLinks({ task, canManage, onChanged }) {
  const addToast = useUiStore((s) => s.addToast);
  const prereqs  = task.dependsOn ?? [];
  const subtasks = task.subtasks ?? [];
  const blocking = prereqs.filter((p) => p.status !== "Done");
  const isSubtask = Boolean(task.parentId);

  const [subTitle, setSubTitle] = useState("");
  const [busy, setBusy]         = useState(false);
  const [editing, setEditing]   = useState(false);
  const [options, setOptions]   = useState([]);
  const [picked, setPicked]     = useState(() => new Set(prereqs.map((p) => String(p._id))));

  useEffect(() => {
    if (!editing || !task.projectId) return;
    api.get(`/api/tasks?projectId=${task.projectId}`)
      .then((d) => setOptions((d.tasks ?? d ?? []).filter((t) => String(t._id) !== String(task._id))))
      .catch(() => setOptions([]));
  }, [editing, task.projectId, task._id]);

  async function addSubtask(e) {
    e.preventDefault();
    if (!subTitle.trim()) return;
    setBusy(true);
    try {
      const firstAssignee = task.assignees?.[0]?._id ?? task.assignees?.[0];
      await api.post("/api/tasks", {
        title: subTitle.trim(), type: task.type, priority: task.priority, parentId: task._id,
        projectId: task.projectId ?? undefined, deadline: task.deadline ?? undefined,
        ...(firstAssignee ? { assigneeId: String(firstAssignee) } : {}),
      });
      setSubTitle("");
      onChanged?.();
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Could not add the subtask." });
    } finally { setBusy(false); }
  }

  async function savePrereqs() {
    setBusy(true);
    try {
      await api.patch(`/api/tasks/${task._id}`, { dependsOn: [...picked] });
      setEditing(false);
      onChanged?.();
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Could not save prerequisites." });
    } finally { setBusy(false); }
  }

  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <section className={PANEL} aria-labelledby="links-h">
      <h2 id="links-h" className="sr-only">Subtasks and prerequisites</h2>

      {isSubtask && (
        <p className="mb-3 text-xs text-text-secondary">
          Subtask of{" "}
          <Link to={`/workspace/tasks/${task.parentId._id ?? task.parentId}`} className="font-semibold text-text-primary hover:underline underline-offset-2">
            {task.parentId.title ?? "parent task"}
          </Link>
        </p>
      )}

      {/* Prerequisites */}
      <div className="flex items-center justify-between mb-2">
        <p className={HEAD}>Prerequisites</p>
        {canManage && task.projectId && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-[#1948BD] hover:underline underline-offset-2">Edit</button>
        )}
      </div>
      {blocking.length > 0 && (
        <p role="status" className="mb-2 flex items-start gap-1.5 rounded-lg bg-[#FFF8E6] px-2.5 py-2 text-xs text-[#7A4B00]">
          <Lock size={13} className="mt-px shrink-0" aria-hidden="true" />
          Can't start yet: {blocking.length} prerequisite{blocking.length > 1 ? "s" : ""} not Done.
        </p>
      )}
      {!editing && (prereqs.length
        ? <ul className="mb-4">{prereqs.map((p) => <TaskRow key={p._id} t={p} />)}</ul>
        : <p className="mb-4 text-xs text-text-secondary">None. This task can start any time.</p>)}
      {editing && (
        <div className="mb-4">
          {options.length === 0
            ? <p className="text-xs text-text-secondary">No other tasks in this project.</p>
            : (
              <ul className="max-h-48 overflow-y-auto rounded-lg border border-ink/[0.08] p-1">
                {options.map((o) => (
                  <li key={o._id}>
                    <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text-primary hover:bg-ink/[0.04] cursor-pointer">
                      <input type="checkbox" checked={picked.has(String(o._id))} onChange={() => toggle(String(o._id))} />
                      <span className="min-w-0 flex-1 truncate">{o.title}</span>
                      <span className="text-[12px] text-text-secondary">{o.status}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy} onClick={savePrereqs} className="h-8 rounded-lg bg-[#2A62EC] px-3 text-xs font-bold text-white disabled:opacity-40">Save</button>
            <button type="button" onClick={() => { setEditing(false); setPicked(new Set(prereqs.map((p) => String(p._id)))); }} className="h-8 rounded-lg border border-ink/[0.10] px-3 text-xs font-semibold text-text-primary">Cancel</button>
          </div>
        </div>
      )}

      {/* Subtasks (one level) */}
      {!isSubtask && (
        <>
          <p className={`${HEAD} mb-2`}>Subtasks {subtasks.length > 0 && <span className="tabular-nums">· {subtasks.filter((s) => s.status === "Done").length}/{subtasks.length}</span>}</p>
          {subtasks.length
            ? <ul>{subtasks.map((s) => <TaskRow key={s._id} t={s} />)}</ul>
            : <p className="text-xs text-text-secondary">No subtasks.</p>}
          {canManage && (
            <form onSubmit={addSubtask} className="mt-3 flex gap-2">
              <label className="sr-only" htmlFor="sub-title">New subtask title</label>
              <input
                id="sub-title" value={subTitle} onChange={(e) => setSubTitle(e.target.value)} maxLength={200} placeholder="Add a subtask"
                className="flex-1 min-w-0 bg-ink/[0.04] border border-ink/[0.08] rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/40"
              />
              <button type="submit" disabled={busy || !subTitle.trim()} aria-label="Add subtask" className="flex items-center justify-center h-8 w-8 self-center rounded-lg bg-[#2A62EC] text-white disabled:opacity-40">
                <Plus size={14} strokeWidth={2.25} />
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
