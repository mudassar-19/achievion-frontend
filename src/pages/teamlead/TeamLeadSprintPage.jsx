import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence }           from "framer-motion";
import { Loader2, Plus, ChevronRight, AlertTriangle, Trash2, Edit3, X, Zap, Target, Flag, Search } from "lucide-react";
import api         from "@/lib/api";
import useTLSocket from "@/hooks/useTLSocket";

import TallyLoader from "@/components/ui/TallyLoader";
import useUiStore from "@/stores/uiStore";
const TEAL = "#08695F";

const STATUS_CFG = {
  Planning:       { color: "#3A4660", bg: "rgba(79,91,117,0.12)", label: "Planning"      },
  Active:         { color: TEAL,      bg: `${TEAL}15`,              label: "Active"        },
  "Under Review": { color: "#1948BD", bg: "rgba(42,98,236,0.12)",  label: "Under Review"  },
  Completed:      { color: "#0E6A30", bg: "rgba(18,128,59,0.12)",  label: "Completed"     },
  Delayed:        { color: "#B01F17", bg: "rgba(209,41,31,0.12)",   label: "Delayed"       },
};
function sCfg(s) { return STATUS_CFG[s] ?? STATUS_CFG.Planning; }

const TASK_STATUS_COLOR = {
  Backlog: "#4F5B75", "To-Do": "#3A4660",
  "In-Progress": "#1948BD", "In-Review": "#1948BD", Done: "#0E6A30",
};
const PRIORITY_COLOR = { Critical: "#B01F17", High: "#9A3A06", Medium: "#7A5200", Low: "#3A4660" };

function ProgressBar({ value = 0, color = TEAL }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(20,32,61,0.06)" }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="h-full rounded-full" style={{ background: color, boxShadow: "var(--shadow-1)" }}
      />
    </div>
  );
}

function daysLabel(endDate) {
  if (!endDate) return null;
  const d = Math.ceil((new Date(endDate) - Date.now()) / 86_400_000);
  if (d < 0)   return { label: `${-d}d overdue`, color: "#B01F17" };
  if (d === 0) return { label: "Ends today",     color: "#7A5200" };
  if (d <= 3)  return { label: `${d}d left`,     color: "#7A5200" };
  return        { label: `${d}d left`,           color: "#3A4660" };
}

// ── Create / Edit Sprint Modal ────────────────────────────────────────────────
function SprintModal({ sprint, projects, onClose, onSaved }) {
  const isEdit = !!sprint;
  const [form, setForm] = useState({
    name:      sprint?.name      ?? "",
    goal:      sprint?.goal      ?? "",
    status:    sprint?.status    ?? "Planning",
    startDate: sprint?.startDate ? sprint.startDate.slice(0, 10) : "",
    endDate:   sprint?.endDate   ? sprint.endDate.slice(0, 10)   : "",
    projectId: sprint?.projectId ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setErr("Sprint name is required."); return; }
    setLoading(true); setErr(null);
    try {
      const body = { ...form, projectId: form.projectId || undefined };
      if (isEdit) await api.patch(`/api/teamlead/sprints/${sprint.id}`, body);
      else        await api.post("/api/teamlead/sprints", body);
      onSaved();
    } catch (e) { setErr(e.message ?? "Failed to save sprint."); }
    finally     { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg rounded-3xl border overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(180deg,#F5F6FA,#F5F6FA)", borderColor: `${TEAL}30` }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: `${TEAL}15` }}>
          <h2 className="text-sm font-black text-text-primary">{isEdit ? "Edit Sprint" : "Create Sprint"}</h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-700 transition-colors"><X size={15} /></button>
        </div>
        <form onSubmit={submit} className="p-6 flex flex-col gap-4">
          {err && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{err}</p>}
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-bold uppercase tracking-widest text-slate-500">Sprint Name *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sprint 1 — Auth & Dashboard"
              className="w-full bg-ink/[0.04] border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-slate-600 outline-none focus:border-teal-500/40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-bold uppercase tracking-widest text-slate-500">Goal / Description</label>
            <textarea value={form.goal} onChange={(e) => set("goal", e.target.value)} rows={2}
              placeholder="What does this sprint aim to deliver?"
              className="w-full bg-ink/[0.04] border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-slate-600 outline-none resize-none focus:border-teal-500/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-bold uppercase tracking-widest text-slate-500">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)}
                className="w-full bg-ink/[0.04] border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none"
                style={{ colorScheme: "dark" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-bold uppercase tracking-widest text-slate-500">End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)}
                className="w-full bg-ink/[0.04] border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none"
                style={{ colorScheme: "dark" }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-bold uppercase tracking-widest text-slate-500">Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)}
                className="w-full border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none"
                style={{ background: "#F5F6FA" }}>
                {Object.keys(STATUS_CFG).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-bold uppercase tracking-widest text-slate-500">Project (optional)</label>
              <select value={form.projectId} onChange={(e) => set("projectId", e.target.value)}
                className="w-full border border-ink/10 rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none"
                style={{ background: "#F5F6FA" }}>
                <option value="">All Projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-ink/10 hover:border-ink/20 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2"
              style={{ background: TEAL, color: "var(--on-accent)", opacity: loading ? 0.7 : 1 }}>
              {loading && <Loader2 size={13} className="animate-spin" />}
              {loading ? "Saving…" : isEdit ? "Update Sprint" : "Create Sprint"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Add Task to Sprint Modal ──────────────────────────────────────────────────
function AddTaskModal({ sprintId, sprintTaskIds, onClose, onAdded }) {
  const [tasks,   setTasks]   = useState([]);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(null);

  useEffect(() => {
    api.get("/api/teamlead/tasks?tab=all")
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  const available = tasks.filter((t) =>
    !sprintTaskIds.includes(String(t.id)) &&
    t.status !== "Done" &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()))
  );

  async function addTask(taskId) {
    setAdding(taskId);
    try {
      await api.post(`/api/teamlead/sprints/${sprintId}/tasks`, { taskId });
      onAdded();
    } catch (err) { useUiStore.getState().addToast({ type: "error", message: err.message ?? "That action failed." }); }
    finally { setAdding(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.18 }}
        className="relative w-full max-w-md rounded-3xl border overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(180deg,#F5F6FA,#F5F6FA)", borderColor: `${TEAL}30` }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: `${TEAL}15` }}>
          <h2 className="text-sm font-black text-text-primary">Add Task to Sprint</h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-700"><X size={15} /></button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/10 bg-ink/[0.03]">
            <Search size={12} className="text-slate-600" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…"
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-slate-600 outline-none" />
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin" style={{ color: "#08695F" }} /></div>
          ) : available.length === 0 ? (
            <p className="text-center text-xs text-slate-600 py-8">No available tasks</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
              {available.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-ink/[0.06] bg-ink/[0.025]">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary truncate">{t.title}</p>
                    <p className="text-[14px] text-slate-600 mt-0.5">{t.status} · {t.priority}</p>
                  </div>
                  <button onClick={() => addTask(String(t.id))} disabled={adding === String(t.id)}
                    className="text-[14px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                    style={{ background: `${TEAL}15`, color: TEAL, border: `1px solid ${TEAL}25` }}>
                    {adding === String(t.id) ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />} Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Sprint Card ───────────────────────────────────────────────────────────────
function SprintCard({ sprint, onEdit, onDelete, onRefresh }) {
  const [collapsed,  setCollapsed]  = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [removing,   setRemoving]   = useState(null);
  const cfg     = sCfg(sprint.status);
  const dl      = daysLabel(sprint.endDate);
  const metrics = sprint.metrics ?? {};

  async function removeTask(taskId) {
    setRemoving(taskId);
    try {
      await api.delete(`/api/teamlead/sprints/${sprint.id}/tasks/${taskId}`);
      onRefresh();
    } catch (err) { useUiStore.getState().addToast({ type: "error", message: err.message ?? "That action failed." }); }
    finally { setRemoving(null); }
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${cfg.color}22`, background: "linear-gradient(135deg,#FFFFFF 0%,#F5F6FA 100%)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => setCollapsed((c) => !c)} className="flex-1 flex items-center gap-3 text-left min-w-0">
          <ChevronRight size={14} className="text-slate-600 shrink-0 transition-transform duration-200"
            style={{ transform: collapsed ? "none" : "rotate(90deg)" }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-text-primary">{sprint.name}</span>
              <span className="text-[14px] font-black uppercase px-2 py-0.5 rounded-full"
                style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
            </div>
            {sprint.goal && <p className="text-[14px] text-slate-500 mt-0.5 truncate max-w-sm">{sprint.goal}</p>}
          </div>
        </button>
        <div className="flex items-center gap-3 shrink-0 text-xs">
          {dl && <span className="font-semibold text-[14px]" style={{ color: dl.color }}>{dl.label}</span>}
          <span className="text-slate-600">{metrics.done ?? 0}/{metrics.total ?? 0} tasks</span>
          <span className="font-black tabular-nums" style={{ color: "#08695F" }}>{metrics.completionPct ?? 0}%</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(sprint)} className="p-1.5 rounded-lg text-slate-600 hover:text-teal-400 transition-colors"><Edit3 size={13} /></button>
          <button onClick={() => onDelete(sprint.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 pb-3">
        <ProgressBar value={metrics.completionPct ?? 0} color={cfg.color} />
        <div className="flex items-center gap-4 mt-2 text-[14px] text-slate-600">
          <span>{metrics.inProgress ?? 0} in progress</span>
          <span>{metrics.inReview ?? 0} in review</span>
          {(metrics.overdue ?? 0) > 0 && <span className="text-red-400">{metrics.overdue} overdue</span>}
          {metrics.velocity && <span className="ml-auto" style={{ color: "#08695F" }}>{metrics.velocity} tasks/day</span>}
        </div>
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="border-t px-5 pt-4 pb-5 space-y-3" style={{ borderColor: `${cfg.color}15` }}>
              {sprint.milestones?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600">Linked Milestones</p>
                  {sprint.milestones.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <Flag size={10} style={{ color: m.status === "Completed" ? "#0E6A30" : "#7A5200" }} />
                      <span className="text-slate-400">{m.title}</span>
                      <span className="ml-auto text-[14px]" style={{ color: m.status === "Completed" ? "#0E6A30" : "#3A4660" }}>{m.status}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600">Tasks ({sprint.tasks?.length ?? 0})</p>
                  {sprint.status !== "Completed" && (
                    <button onClick={() => setAddingTask(true)}
                      className="flex items-center gap-1 text-[14px] font-bold px-2.5 py-1 rounded-lg transition-all"
                      style={{ background: `${TEAL}12`, color: TEAL, border: `1px solid ${TEAL}20` }}>
                      <Plus size={10} /> Add Task
                    </button>
                  )}
                </div>
                {(sprint.tasks?.length ?? 0) === 0 ? (
                  <p className="text-[14px] text-slate-700 py-2">No tasks in this sprint yet.</p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {sprint.tasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                        style={{ background: "rgba(20,32,61,0.02)", borderColor: "rgba(20,32,61,0.05)" }}>
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: TASK_STATUS_COLOR[t.status] ?? "#6D7B99" }} />
                        <span className="flex-1 text-xs text-slate-300 truncate">{t.title}</span>
                        <span className="text-[14px] font-bold shrink-0" style={{ color: PRIORITY_COLOR[t.priority] }}>{t.priority}</span>
                        <button onClick={() => removeTask(String(t.id))} disabled={removing === String(t.id)}
                          className="text-slate-700 hover:text-red-400 transition-colors ml-1">
                          {removing === String(t.id) ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {addingTask && (
          <AddTaskModal
            sprintId={sprint.id}
            sprintTaskIds={(sprint.tasks ?? []).map((t) => String(t.id))}
            onClose={() => setAddingTask(false)}
            onAdded={() => { onRefresh(); setAddingTask(false); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeamLeadSprintPage() {
  const [sprints,  setSprints]  = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");
  const [modal,    setModal]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sd, pd] = await Promise.all([
        api.get("/api/teamlead/sprints"),
        api.get("/api/teamlead/projects"),
      ]);
      setSprints(sd.sprints ?? []);
      setProjects((pd.projects ?? []).map((p) => ({ id: p.id, title: p.title })));
    } catch { setSprints([]); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useTLSocket({ "sprint:created": load, "sprint:updated": load });

  const filtered = filter === "all" ? sprints : sprints.filter((s) => s.status === filter);
  const totalTasks = sprints.reduce((a, s) => a + (s.metrics?.total ?? 0), 0);
  const doneTasks  = sprints.reduce((a, s) => a + (s.metrics?.done  ?? 0), 0);
  const active     = sprints.filter((s) => s.status === "Active").length;
  const delayed    = sprints.filter((s) => s.status === "Delayed").length;

  async function handleDelete(sprintId) {
    if (!window.confirm("Delete this sprint?")) return;
    try { await api.delete(`/api/teamlead/sprints/${sprintId}`); load(); } catch (err) { useUiStore.getState().addToast({ type: "error", message: err.message ?? "That action failed." }); }
  }

  return (
    <div className="px-4 sm:px-8 py-8 flex flex-col gap-6 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Sprint Management</h1>
          <p className="text-xs text-slate-500 mt-1">Create and manage execution sprints for your projects</p>
        </div>
        <button onClick={() => setModal("create")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: TEAL, color: "var(--on-accent)" }}>
          <Plus size={14} /> New Sprint
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Sprints",    value: sprints.length, color: "#08695F",      icon: Target       },
          { label: "Active",           value: active,         color: "#1948BD", icon: Zap          },
          { label: "Tasks in Sprints", value: totalTasks,     color: "#1948BD", icon: Flag         },
          { label: "Delayed",          value: delayed,        color: "#B01F17", icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-2xl border"
            style={{ background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)", borderColor: "rgba(20,32,61,0.06)" }}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
              <Icon size={18} strokeWidth={1.75} style={{ color }} />
            </span>
            <div>
              <p className="text-xl font-black tabular-nums" style={{ color }}>{value}</p>
              <p className="text-[14px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Overall progress */}
      {totalTasks > 0 && (
        <div className="rounded-2xl border px-5 py-4" style={{ borderColor: `${TEAL}18`, background: `${TEAL}06` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-text-primary">Overall Sprint Progress</p>
            <span className="text-xs font-black" style={{ color: "#08695F" }}>
              {doneTasks}/{totalTasks} done · {Math.round((doneTasks / totalTasks) * 100)}%
            </span>
          </div>
          <ProgressBar value={Math.round((doneTasks / totalTasks) * 100)} />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["all", "Active", "Planning", "Under Review", "Completed", "Delayed"].map((s) => {
          const c = s === "all" ? TEAL : sCfg(s).color;
          const count = s === "all" ? sprints.length : sprints.filter((sp) => sp.status === s).length;
          return (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-xl text-[14px] font-bold whitespace-nowrap transition-all"
              style={{
                background: filter === s ? `${c}18` : "transparent",
                color:      filter === s ? c : "#4F5B75",
                border:     `1px solid ${filter === s ? c + "30" : "transparent"}`,
              }}>
              {s === "all" ? "All Sprints" : s} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Sprint list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <TallyLoader />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed"
          style={{ borderColor: `${TEAL}15` }}>
          <Target size={32} className="text-slate-700 mb-3" strokeWidth={1.2} />
          <p className="text-sm text-slate-600 font-medium">
            {filter === "all" ? "No sprints yet — create your first sprint." : `No ${filter} sprints.`}
          </p>
          {filter === "all" && (
            <button onClick={() => setModal("create")} className="mt-4 text-sm font-bold px-4 py-2 rounded-xl"
              style={{ background: `${TEAL}15`, color: TEAL, border: `1px solid ${TEAL}25` }}>
              + Create Sprint
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((sprint) => (
              <SprintCard key={sprint.id} sprint={sprint} onEdit={(s) => setModal(s)}
                onDelete={handleDelete} onRefresh={load} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <SprintModal sprint={modal === "create" ? null : modal} projects={projects}
            onClose={() => setModal(null)} onSaved={() => { load(); setModal(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
