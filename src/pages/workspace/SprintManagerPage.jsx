import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gauge, Plus, Loader2, ChevronRight, Zap, Calendar, Flag,
  CheckCircle2, X, Check, Trash2, RotateCcw,
  Play, ListTodo, AlertTriangle, Clock,
} from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";
import { useUiStore } from "@/stores/uiStore";

import TallyLoader from "@/components/ui/TallyLoader";
// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  Planning:  { color: "#7A5200", icon: ListTodo },
  Active:    { color: "#1948BD", icon: Play     },
  Completed: { color: "#0E6A30", icon: CheckCircle2 },
};

const PRIORITY_CFG = {
  Critical: { color: "#B01F17", dot: "bg-[#D1291F]" },
  High:     { color: "#9A3A06", dot: "bg-[#E8590C]" },
  Medium:   { color: "#7A5200", dot: "bg-[#FFC21A]" },
  Low:      { color: "#3A4660", dot: "bg-[#6D7B99]" },
};

const TYPE_CFG = {
  Feature:       { bg: "bg-[#1F57E0]/15", text: "text-[#1948BD]"  },
  Bug:           { bg: "bg-[#D1291F]/15", text: "text-[#B01F17]"  },
  Design:        { bg: "bg-[#2A62EC]/15", text: "text-[#1948BD]"  },
  Testing:       { bg: "bg-[#12803B]/15", text: "text-[#0E6A30]"  },
  DevOps:        { bg: "bg-[#E8590C]/15", text: "text-[#9A3A06]"  },
  Documentation: { bg: "bg-[#6D7B99]/15", text: "text-[#3A4660]"  },
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysLeft(endDate) {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate) - Date.now()) / 86400000);
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div
      className="flex-1 min-w-[120px] rounded-xl border px-4 py-3 flex flex-col gap-0.5"
      style={{ background: `${accent}09`, borderColor: `${accent}22` }}
    >
      <p className="text-[14px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-2xl font-black text-text-primary">{value}</p>
      {sub && <p className="text-[14px] text-slate-600 font-semibold">{sub}</p>}
    </div>
  );
}

// ── Sprint Task Row ───────────────────────────────────────────────────────────
function SprintTaskRow({ task, onRemove }) {
  const priority = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.Medium;
  const type     = TYPE_CFG[task.type]         ?? TYPE_CFG.Feature;
  const days     = daysLeft(task.deadline);
  const overdue  = days !== null && days < 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-ink/[0.06] bg-ink/[0.025] hover:bg-ink/[0.05] transition-colors group">
      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${priority.dot}`} title={task.priority} />
      <span className={`text-[14px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${type.bg} ${type.text}`}>
        {task.type}
      </span>
      <p className="flex-1 text-xs font-semibold text-slate-300 truncate">{task.title}</p>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="flex items-center gap-1 text-[14px] font-bold text-[#7A5200]">
          <Zap size={9} strokeWidth={2.5} />{task.xpValue}
        </span>
        {days !== null && (
          <span className={`flex items-center gap-1 text-[14px] font-semibold ${overdue ? "text-[#B01F17]" : days <= 3 ? "text-[#9A3A06]" : "text-slate-600"}`}>
            {overdue ? <AlertTriangle size={9} strokeWidth={2.5} /> : <Clock size={9} />}
            {overdue ? `${Math.abs(days)}d late` : `${days}d`}
          </span>
        )}
        <span
          className="text-[14px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: task.status === "Done" ? "#12803B20" : task.status === "In-Progress" ? "#1948BD20" : "#4F5B7520",
            color:      task.status === "Done" ? "#0E6A30"  : task.status === "In-Progress" ? "#1948BD"  : "#3A4660",
          }}
        >
          {task.status}
        </span>
        <button
          onClick={() => onRemove(task.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-ink/10 text-slate-600 hover:text-[#B01F17]"
        >
          <Trash2 size={11} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// ── Sprint Sidebar Item ───────────────────────────────────────────────────────
function SprintItem({ sprint, isActive, onClick, accent }) {
  const cfg = STATUS_CFG[sprint.status] ?? STATUS_CFG.Planning;
  const Icon = cfg.icon;
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-3 rounded-xl border transition-all duration-150 flex flex-col gap-1.5"
      style={isActive ? {
        background:  `${accent}12`,
        borderColor: `${accent}35`,
      } : {
        background:  "rgba(20,32,61,0.02)",
        borderColor: "rgba(20,32,61,0.06)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs font-bold truncate ${isActive ? "text-text-primary" : "text-slate-400"}`}>
          {sprint.name}
        </p>
        <ChevronRight size={12} className={isActive ? "text-text-primary" : "text-slate-700"} strokeWidth={2.5} />
      </div>
      <div className="flex items-center gap-1.5">
        <Icon size={10} strokeWidth={2.5} style={{ color: cfg.color }} />
        <span className="text-[14px] font-semibold" style={{ color: cfg.color }}>{sprint.status}</span>
        <span className="text-[14px] text-slate-600 ml-auto">{sprint.taskCount} tasks</span>
      </div>
      {sprint.endDate && (
        <p className="text-[14px] text-slate-700 flex items-center gap-1">
          <Calendar size={9} strokeWidth={2} />
          Ends {fmtDate(sprint.endDate)}
        </p>
      )}
    </button>
  );
}

// ── New Sprint Modal ──────────────────────────────────────────────────────────
function NewSprintModal({ onClose, onCreate, accent }) {
  const [name,      setName]      = useState("");
  const [goal,      setGoal]      = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate,   setEndDate]   = useState("");
  const [saving,    setSaving]    = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onCreate({ name: name.trim(), goal, startDate: startDate || null, endDate: endDate || null });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-md rounded-2xl border border-ink/[0.10] bg-[#FFFFFF] p-6 flex flex-col gap-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-text-primary">New Sprint</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-text-primary transition-colors">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sprint name (e.g. Sprint 1)…"
            className="bg-ink/[0.05] border border-ink/[0.10] rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/30 transition-colors"
          />
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Sprint goal (optional)…"
            rows={2}
            className="bg-ink/[0.05] border border-ink/[0.10] rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/30 transition-colors resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[14px] font-bold uppercase tracking-wider text-slate-500">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-ink/[0.05] border border-ink/[0.10] rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-ink/30 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[14px] font-bold uppercase tracking-wider text-slate-500">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-ink/[0.05] border border-ink/[0.10] rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-ink/30 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink/[0.10] text-sm font-bold text-slate-400 hover:text-text-primary transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
            style={{ background: accent, color: "var(--on-accent)" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />}
            Create Sprint
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Add Tasks Modal (backlog picker) ──────────────────────────────────────────
function AddTasksModal({ sprintId, onClose, onAdded, accent }) {
  const [backlog,   setBacklog]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(new Set());
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    api.get(`/api/manager/sprints/${sprintId}/backlog`)
      .then((r) => setBacklog(Array.isArray(r) ? r : (r.data ?? [])))
      .catch(() => setBacklog([]))
      .finally(() => setLoading(false));
  }, [sprintId]);

  const toggle = (id) => setSelected((prev) => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const submit = async () => {
    setSaving(true);
    await Promise.all([...selected].map((taskId) =>
      api.post(`/api/manager/sprints/${sprintId}/tasks`, { taskId })
    ));
    setSaving(false);
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-lg rounded-2xl border border-ink/[0.10] bg-[#FFFFFF] p-6 flex flex-col gap-5 shadow-2xl max-h-[80vh]"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-text-primary">Add Tasks to Sprint</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-text-primary transition-colors">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={22} className="animate-spin" style={{ color: accent }} />
            </div>
          ) : backlog.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-10">No eligible tasks in backlog.</p>
          ) : backlog.map((t) => {
            const type = TYPE_CFG[t.type] ?? TYPE_CFG.Feature;
            const priority = PRIORITY_CFG[t.priority] ?? PRIORITY_CFG.Medium;
            const isSelected = selected.has(String(t.id));
            return (
              <button
                key={t.id}
                onClick={() => toggle(String(t.id))}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all"
                style={isSelected ? {
                  background:  `${accent}12`,
                  borderColor: `${accent}40`,
                } : {
                  background:  "rgba(20,32,61,0.025)",
                  borderColor: "rgba(20,32,61,0.07)",
                }}
              >
                <div
                  className="h-4 w-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={isSelected ? { borderColor: accent, background: accent } : { borderColor: "rgba(20,32,61,0.15)" }}
                >
                  {isSelected && <Check size={10} strokeWidth={3} color="var(--on-accent)" />}
                </div>
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${priority.dot}`} />
                <span className={`text-[14px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${type.bg} ${type.text}`}>{t.type}</span>
                <p className="flex-1 text-xs font-semibold text-slate-300 truncate">{t.title}</p>
                <span className="text-[14px] font-bold text-[#7A5200] flex items-center gap-0.5">
                  <Zap size={9} strokeWidth={2.5} />{t.xpValue}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ink/[0.10] text-sm font-bold text-slate-400 hover:text-text-primary transition-colors">Cancel</button>
          <button
            onClick={submit}
            disabled={selected.size === 0 || saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
            style={{ background: accent, color: "var(--on-accent)" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={2.5} />}
            Add {selected.size > 0 ? `${selected.size} Task${selected.size > 1 ? "s" : ""}` : "Tasks"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── SprintManagerPage ─────────────────────────────────────────────────────────
export default function SprintManagerPage() {
  const theme    = useRoleTheme();
  const addToast = useUiStore((s) => s.addToast);

  const [sprints,      setSprints]      = useState([]);
  const [detail,       setDetail]       = useState(null);
  const [activeId,     setActiveId]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [detailLoad,   setDetailLoad]   = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [showAddTasks, setShowAddTasks] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const loadSprints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/manager/sprints");
      const list = Array.isArray(res) ? res : (res.data ?? []);
      setSprints(list);
      if (list.length > 0 && !activeId) setActiveId(String(list[0].id ?? list[0]._id));
    } catch { setSprints([]); }
    finally  { setLoading(false); }
  }, [activeId]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoad(true);
    setDetail(null);
    try {
      const res = await api.get(`/api/manager/sprints/${id}`);
      setDetail(res.data ?? res);
    } catch { setDetail(null); }
    finally  { setDetailLoad(false); }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setTimeout(loadSprints, 0); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeId) setTimeout(() => loadDetail(activeId), 0); }, [activeId]);

  const handleCreateSprint = async (data) => {
    try {
      const res = await api.post("/api/manager/sprints", data);
      const s = res.data ?? res;
      const id = String(s.id ?? s._id);
      setSprints((prev) => [{ ...s, id }, ...prev]);
      setActiveId(id);
      addToast?.({ type: "success", message: `Sprint "${s.name}" created!` });
    } catch {
      addToast?.({ type: "error", message: "Failed to create sprint." });
    }
  };

  const handleRemoveTask = async (taskId) => {
    try {
      await api.delete(`/api/manager/sprints/${activeId}/tasks/${taskId}`);
      setDetail((d) => d ? { ...d, tasks: d.tasks.filter((t) => t.id !== taskId && String(t.id) !== String(taskId)) } : d);
      setSprints((prev) => prev.map((s) => String(s.id) === activeId ? { ...s, taskCount: Math.max(0, (s.taskCount ?? 1) - 1) } : s));
      addToast?.({ type: "success", message: "Task removed from sprint." });
    } catch {
      addToast?.({ type: "error", message: "Failed to remove task." });
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusSaving(true);
    try {
      await api.patch(`/api/manager/sprints/${activeId}`, { status: newStatus });
      setDetail((d) => d ? { ...d, status: newStatus } : d);
      setSprints((prev) => prev.map((s) => String(s.id) === activeId ? { ...s, status: newStatus } : s));
      addToast?.({ type: "success", message: `Sprint marked as ${newStatus}.` });
    } catch {
      addToast?.({ type: "error", message: "Failed to update sprint status." });
    }
    setStatusSaving(false);
  };

  // Compute burndown progress
  const stats     = detail?.stats ?? {};
  const progress  = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const sprintStatus = detail?.status;
  const sprintCfg    = STATUS_CFG[sprintStatus] ?? STATUS_CFG.Planning;
  const endDays      = daysLeft(detail?.endDate);

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 min-h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600 mb-1 flex items-center gap-1.5">
            <Gauge size={11} strokeWidth={2.5} style={{ color: theme.text }} />
            Sprints
          </p>
          <h1 className="text-3xl font-black text-accent-on">Sprint Manager</h1>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
          style={{ background: theme.accent, color: "var(--on-accent)", boxShadow: "var(--shadow-1)" }}
        >
          <Plus size={15} strokeWidth={2.5} />
          New Sprint
        </button>
      </motion.div>

      <div className="flex gap-5 min-h-0">
        {/* ── Sprint sidebar ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="w-56 flex-shrink-0 flex flex-col gap-2"
        >
          <p className="text-[14px] font-black uppercase tracking-widest text-slate-600 px-1">
            Sprints ({sprints.length})
          </p>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={22} className="animate-spin" style={{ color: theme.text }} />
            </div>
          ) : sprints.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <Gauge size={28} className="text-slate-700" />
              <p className="text-xs text-slate-600 text-center">No sprints yet.</p>
            </div>
          ) : (
            sprints.map((s) => (
              <SprintItem
                key={s.id ?? s._id}
                sprint={s}
                isActive={String(s.id ?? s._id) === activeId}
                onClick={() => setActiveId(String(s.id ?? s._id))}
                accent={theme.accent}
              />
            ))
          )}
        </motion.div>

        {/* ── Sprint Detail ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="flex-1 flex flex-col gap-5 min-w-0"
        >
          {detailLoad ? (
            <div className="flex items-center justify-center flex-1 py-20">
              <TallyLoader />
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-center gap-3 flex-1 justify-center py-20">
              <Gauge size={36} className="text-slate-700" />
              <p className="text-sm text-slate-500">Select a sprint to view details.</p>
            </div>
          ) : (
            <>
              {/* Sprint header */}
              <div
                className="flex items-start gap-4 px-5 py-4 rounded-2xl border"
                style={{ background: `${theme.accent}08`, borderColor: `${theme.accent}25` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-black text-text-primary truncate">{detail.name}</h2>
                    <span
                      className="text-[14px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{ background: `${sprintCfg.color}20`, color: sprintCfg.color }}
                    >
                      <sprintCfg.icon size={10} strokeWidth={2.5} />
                      {detail.status}
                    </span>
                  </div>
                  {detail.goal && <p className="text-xs text-slate-400 font-medium mb-2">{detail.goal}</p>}
                  <div className="flex items-center gap-4 text-[14px] text-slate-500">
                    {detail.startDate && <span className="flex items-center gap-1"><Calendar size={10} /> {fmtDate(detail.startDate)}</span>}
                    {detail.endDate   && <span className="flex items-center gap-1"><Flag size={10} /> {fmtDate(detail.endDate)}</span>}
                    {endDays !== null && detail.status === "Active" && (
                      <span className={`flex items-center gap-1 font-bold ${endDays < 0 ? "text-[#B01F17]" : endDays <= 3 ? "text-[#9A3A06]" : "text-slate-400"}`}>
                        {endDays < 0 ? <AlertTriangle size={10} /> : <Clock size={10} />}
                        {endDays < 0 ? `${Math.abs(endDays)}d overdue` : `${endDays}d left`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {detail.status === "Planning" && (
                    <button
                      onClick={() => handleStatusChange("Active")}
                      disabled={statusSaving}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      style={{ background: "#1F57E020", color: "#1948BD", border: "1px solid #1F57E040" }}
                    >
                      <Play size={11} strokeWidth={2.5} /> Start Sprint
                    </button>
                  )}
                  {detail.status === "Active" && (
                    <button
                      onClick={() => handleStatusChange("Completed")}
                      disabled={statusSaving}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      style={{ background: "#12803B20", color: "#0E6A30", border: "1px solid #12803B40" }}
                    >
                      <CheckCircle2 size={11} strokeWidth={2.5} /> Complete
                    </button>
                  )}
                  {detail.status === "Completed" && (
                    <button
                      onClick={() => handleStatusChange("Active")}
                      disabled={statusSaving}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      style={{ background: "#FFC21A20", color: "#7A5200", border: "1px solid #8A620040" }}
                    >
                      <RotateCcw size={11} strokeWidth={2.5} /> Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Stats strip */}
              <div className="flex gap-3 flex-wrap">
                <StatCard label="Total Tasks"   value={stats.total     ?? 0}                         accent={theme.accent} />
                <StatCard label="Done"          value={stats.done      ?? 0} sub={`${progress}% complete`}  accent={theme.accent} />
                <StatCard label="In Progress"   value={stats.inProgress ?? 0}                        accent={theme.accent} />
                <StatCard label="XP Earned"     value={(stats.earnedXp ?? 0).toLocaleString()} sub={`of ${(stats.totalXp ?? 0).toLocaleString()} pool`} accent={theme.accent} />
              </div>

              {/* Burndown bar */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-black uppercase tracking-widest text-slate-500">Task Progress</p>
                  <span className="text-[14px] font-bold text-slate-400">{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-ink/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}aa)` }}
                  />
                </div>
              </div>

              {/* Task list */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-black uppercase tracking-widest text-slate-500">
                    Sprint Tasks ({detail.tasks?.length ?? 0})
                  </p>
                  {detail.status !== "Completed" && (
                    <button
                      onClick={() => setShowAddTasks(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                      style={{ background: `${theme.accent}18`, color: theme.text, border: `1px solid ${theme.accent}35` }}
                    >
                      <Plus size={11} strokeWidth={2.5} /> Add Tasks
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <AnimatePresence>
                    {(detail.tasks ?? []).length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-10 rounded-xl border border-dashed border-ink/[0.07]">
                        <ListTodo size={24} className="text-slate-700" />
                        <p className="text-xs text-slate-600">No tasks in this sprint.</p>
                        {detail.status !== "Completed" && (
                          <button
                            onClick={() => setShowAddTasks(true)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                            style={{ color: theme.text }}
                          >
                            + Add from backlog
                          </button>
                        )}
                      </div>
                    ) : (
                      (detail.tasks ?? []).map((t) => (
                        <motion.div key={String(t.id)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <SprintTaskRow
                            task={t}
                            onRemove={detail.status !== "Completed" ? handleRemoveTask : () => {}}
                            accent={theme.accent}
                          />
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showNew && (
          <NewSprintModal
            onClose={() => setShowNew(false)}
            onCreate={handleCreateSprint}
            accent={theme.accent}
          />
        )}
        {showAddTasks && activeId && (
          <AddTasksModal
            sprintId={activeId}
            onClose={() => setShowAddTasks(false)}
            onAdded={() => loadDetail(activeId)}
            accent={theme.accent}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
