import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Zap, Loader2, CheckCircle2, Circle, Clock, AlertCircle,
  CalendarDays, Flag, Target, TrendingUp, ArrowRight,
  ExternalLink, ChevronDown,
} from "lucide-react";
import api from "@/lib/api";
import usePerfLog from "@/hooks/usePerfLog";
import { useRoleTheme } from "@/utils/roleTheme";
import useUiStore from "@/stores/uiStore";

import TallyLoader from "@/components/ui/TallyLoader";
import { avatarUrl } from "@/lib/avatar";
// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_SPRINT_CFG = {
  Planning:  { color: "#1948BD", bg: "#1F57E018" },
  Active:    { color: "#0E6A30", bg: "#12803B18" },
  Completed: { color: "#1948BD", bg: "#2A62EC18" },
};

const TASK_STATUS_CFG = {
  "Backlog":     { color: "#4F5B75", icon: Circle,       label: "Backlog"     },
  "To-Do":       { color: "#1948BD", icon: Circle,       label: "To-Do"       },
  "In-Progress": { color: "#9A3A06", icon: Clock,        label: "In Progress" },
  "In-Review":   { color: "#1948BD", icon: AlertCircle,  label: "In Review"   },
  "Done":        { color: "#0E6A30", icon: CheckCircle2, label: "Done"        },
};

const PRIORITY_DOT  = { Critical: "#B01F17", High: "#9A3A06", Medium: "#7A5200", Low: "#1948BD" };
const TYPE_COLOR    = {
  Feature: "#1948BD", Bug: "#B01F17", Design: "#9A3A06",
  Testing: "#08695F", DevOps: "#1948BD", Documentation: "#4F5B75",
};
const ROLE_COLORS   = {
  Director: "#1948BD", Manager: "#1948BD", "Team Lead": "#08695F",
  "Senior Developer": "#0E6A30", "Junior Developer": "#0E6A30",
  "Senior Designer":  "#B01F17", "Junior Designer":  "#B01F17",
  "Senior Tester":    "#7A5200", "Junior Tester":    "#7A5200",
};

// Employee-allowed forward transitions
const TRANSITIONS = { "To-Do": "In-Progress", "In-Progress": "In-Review" };

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysLeft(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - Date.now()) / 86400000);
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
  return (
    <div className="rounded-2xl border border-ink/[0.07] bg-ink/[0.02] p-4 flex flex-col gap-1">
      <p className="text-xl font-black" style={{ color }}>{value}</p>
      <p className="text-[14px] font-black uppercase tracking-wider text-slate-600">{label}</p>
      {sub && <p className="text-[14px] text-slate-700">{sub}</p>}
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, accent, onStatusChange, updating }) {
  const scfg     = TASK_STATUS_CFG[task.status] ?? TASK_STATUS_CFG["To-Do"];
  const tc       = TYPE_COLOR[task.type]         ?? "#3A4660";
  const pdot     = PRIORITY_DOT[task.priority]   ?? "#4F5B75";
  const Icon     = scfg.icon;
  const nextStep = TRANSITIONS[task.status];
  const dl       = daysLeft(task.deadline);
  const [open, setOpen] = useState(false);

  const isOverdue = dl !== null && dl < 0 && task.status !== "Done" && task.status !== "In-Review";
  const isDueSoon = dl !== null && dl >= 0 && dl <= 2 && task.status !== "Done";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-ink/[0.08] bg-ink/[0.025] flex flex-col overflow-hidden hover:border-ink/[0.14] transition-colors"
      style={{ borderColor: task.status === "Done" ? "#12803B30" : undefined }}
    >
      {/* Card top */}
      <div className="p-4 flex flex-col gap-3">
        {/* Type + priority + deadline */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[14px] font-black uppercase px-2 py-0.5 rounded-full"
            style={{ background: `${tc}18`, color: tc }}
          >
            {task.type}
          </span>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: pdot }} />
            <span className="text-[14px] text-slate-500">{task.priority}</span>
          </div>
          {dl !== null && (
            <span
              className="ml-auto text-[14px] font-bold px-2 py-0.5 rounded-full"
              style={
                isOverdue  ? { background: "#D1291F18", color: "#B01F17" } :
                isDueSoon  ? { background: "#E8590C18", color: "#9A3A06" } :
                             { background: "#6D7B9918", color: "#4F5B75" }
              }
            >
              {isOverdue ? `${Math.abs(dl)}d overdue` : dl === 0 ? "Due today" : `${dl}d left`}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-bold text-text-primary leading-snug">{task.title}</p>

        {/* Status pill */}
        <div className="flex items-center gap-1.5">
          <Icon size={11} strokeWidth={2} style={{ color: scfg.color }} />
          <span className="text-[14px] font-bold" style={{ color: scfg.color }}>{scfg.label}</span>
        </div>

        {/* XP + Gold */}
        <div className="flex items-center gap-3 text-[14px] font-bold">
          <span className="flex items-center gap-1" style={{ color: accent }}>
            <Zap size={9} strokeWidth={2.5} />{task.xpValue} XP
          </span>
          {task.goldValue > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              💰 {task.goldValue} Gold
            </span>
          )}
        </div>

        {/* Assignees */}
        {task.assignees?.length > 0 && (
          <div className="flex -space-x-1.5 items-center">
            {task.assignees.slice(0, 5).map((a, i) => {
              const rc = ROLE_COLORS[a.role] ?? "#3A4660";
              return (
                <div
                  key={i}
                  title={`${a.name} (${a.role})`}
                  className="h-5 w-5 rounded-md overflow-hidden border-2 border-[#FFFFFF]"
                  style={{ outline: `1px solid ${rc}50` }}
                >
                  <img
                    src={avatarUrl("bottts", a.avatarSeed ?? a.name)}
                    alt={a.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              );
            })}
            {task.assignees.length > 5 && (
              <div className="h-5 w-5 rounded-md bg-ink/[0.06] border-2 border-[#FFFFFF] flex items-center justify-center text-[14px] font-black text-slate-500">
                +{task.assignees.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Description toggle */}
      {task.description && (
        <div className="border-t border-ink/[0.05]">
          <button
            onClick={() => setOpen((p) => !p)}
            className="w-full flex items-center gap-2 px-4 py-2 text-[14px] font-bold text-slate-600 hover:text-slate-400 transition-colors"
          >
            <ChevronDown
              size={10}
              strokeWidth={2.5}
              className="transition-transform"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            />
            {open ? "Hide" : "Show"} description
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="px-4 pb-3 text-xs text-slate-500 leading-relaxed">{task.description}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action strip */}
      <div className="border-t border-ink/[0.05] px-4 py-2.5 flex items-center gap-2">
        <Link
          to={`/workspace/tasks/${task.id}`}
          className="flex items-center gap-1 text-[14px] font-bold text-slate-600 hover:text-slate-700 transition-colors"
        >
          <ExternalLink size={9} strokeWidth={2.5} />
          View details
        </Link>
        {nextStep && task.status !== "Done" && task.status !== "In-Review" && (
          <button
            disabled={updating === task.id}
            onClick={() => onStatusChange(task.id, nextStep)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-black transition-all disabled:opacity-50"
            style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}30` }}
          >
            {updating === task.id ? (
              <Loader2 size={9} className="animate-spin" />
            ) : (
              <ArrowRight size={9} strokeWidth={2.5} />
            )}
            {nextStep}
          </button>
        )}
        {task.status === "In-Progress" && (
          <button
            disabled={updating === task.id}
            onClick={() => onStatusChange(task.id, "In-Review")}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-black transition-all disabled:opacity-50"
            style={{ background: "#2A62EC18", color: "#1948BD", border: "1px solid #2A62EC30" }}
          >
            {updating === task.id ? <Loader2 size={9} className="animate-spin" /> : <AlertCircle size={9} />}
            Submit for Review
          </button>
        )}
        {task.status === "Done" && (
          <span className="ml-auto flex items-center gap-1 text-[14px] font-bold text-emerald-500">
            <CheckCircle2 size={9} strokeWidth={2.5} /> Completed
          </span>
        )}
        {task.status === "In-Review" && (
          <span className="ml-auto flex items-center gap-1 text-[14px] font-bold" style={{ color: "#1948BD" }}>
            <AlertCircle size={9} strokeWidth={2.5} /> Awaiting review
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CurrentSprintPage() {
  const theme    = useRoleTheme();
  const addToast = useUiStore((s) => s.addToast);
  const { log }  = usePerfLog();

  const [loading,   setLoading]   = useState(true);
  const [sprint,    setSprint]    = useState(null);
  const [myTasks,   setMyTasks]   = useState([]);
  const [stats,     setStats]     = useState(null);
  const [updating,  setUpdating]  = useState(null); // task id being updated
  const [filter,    setFilter]    = useState("all"); // all | active | done

  const load = useCallback(() => {
    setLoading(true);
    api.get("/api/tasks/current-sprint")
      .then((r) => {
        const d = r.data ?? r;
        setSprint(d.sprint);
        setMyTasks(d.myTasks ?? []);
        setStats(d.stats ?? null);
      })
      .catch(() => addToast?.({ type: "error", message: "Failed to load sprint." }))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => { setTimeout(load, 0); }, [load]);

  async function handleStatusChange(taskId, newStatus) {
    setUpdating(taskId);
    try {
      const t0 = performance.now();
      await api.patch(`/api/tasks/${taskId}/status`, { status: newStatus });
      log("move_task", performance.now() - t0, "/workspace/sprint");
      setMyTasks((prev) =>
        prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t)
      );
      // Update stats optimistically
      setStats((prev) => {
        if (!prev) return prev;
        const task       = myTasks.find((t) => t.id === taskId);
        const wasActive  = task?.status === "In-Progress";
        const willActive = newStatus  === "In-Progress";
        const willDone   = newStatus  === "Done";
        return {
          ...prev,
          myInProgress: prev.myInProgress + (willActive ? 1 : wasActive ? -1 : 0),
          myDone:       prev.myDone       + (willDone ? 1 : 0),
          myXp:         prev.myXp         + (willDone ? (task?.xpValue ?? 0) : 0),
        };
      });
      addToast?.({ type: "success", message: `Task moved to ${newStatus}` });
    } catch {
      addToast?.({ type: "error", message: "Could not update status." });
    } finally {
      setUpdating(null);
    }
  }

  const filteredTasks = myTasks.filter((t) => {
    if (filter === "active") return t.status !== "Done" && t.status !== "Backlog";
    if (filter === "done")   return t.status === "Done";
    return true;
  });

  const sprintCfg = STATUS_SPRINT_CFG[sprint?.status] ?? STATUS_SPRINT_CFG.Active;
  const dl        = daysLeft(sprint?.endDate);
  const progressPct = stats?.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const myProgressPct = stats?.myTotal > 0 ? Math.round((stats.myDone / stats.myTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-6xl">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-2 mb-1">
          <Zap size={14} strokeWidth={2.5} style={{ color: theme.text }} />
          <span className="text-[14px] font-black uppercase tracking-[0.15em] text-slate-600">Active Sprint</span>
        </div>
        <h1 className="text-2xl font-black text-text-primary">Current Sprint</h1>
        <p className="text-xs text-slate-500 mt-0.5">Your assigned tasks in the active sprint.</p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-24">
          <TallyLoader />
        </div>
      ) : !sprint ? (
        /* ── Empty state ───────────────────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 py-24"
        >
          <Target size={44} className="text-slate-700" strokeWidth={1.5} />
          <p className="text-base font-black text-text-primary">No active sprint</p>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            There's no sprint running right now. Your manager will create one soon.
          </p>
        </motion.div>
      ) : (
        <>
          {/* ── Sprint info panel ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04 }}
            className="rounded-2xl border border-ink/[0.08] bg-ink/[0.025] p-5 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[14px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ background: sprintCfg.bg, color: sprintCfg.color }}
                  >
                    {sprint.status}
                  </span>
                </div>
                <h2 className="text-lg font-black text-text-primary">{sprint.name}</h2>
                {sprint.goal && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Flag size={10} strokeWidth={2} style={{ color: theme.text }} />
                    {sprint.goal}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CalendarDays size={12} strokeWidth={2} className="text-slate-600" />
                  {fmtDate(sprint.startDate)} — {fmtDate(sprint.endDate)}
                </div>
                {dl !== null && sprint.status === "Active" && (
                  <span
                    className="text-xs font-black px-3 py-1 rounded-full"
                    style={
                      dl < 0 ? { background: "#D1291F18", color: "#B01F17" } :
                      dl <= 3 ? { background: "#E8590C18", color: "#9A3A06" } :
                               { background: `${theme.accent}18`, color: theme.text }
                    }
                  >
                    {dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? "Ends today" : `${dl}d left`}
                  </span>
                )}
              </div>
            </div>

            {/* Sprint overall progress */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[14px]">
                <span className="font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp size={9} strokeWidth={2} /> Team Progress
                </span>
                <span className="font-black" style={{ color: theme.text }}>{progressPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-ink/[0.05] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: progressPct >= 80 ? "#12803B" : progressPct >= 50 ? theme.accent : "#9A3A06" }}
                />
              </div>
              <p className="text-[14px] text-slate-700">{stats?.done ?? 0} of {stats?.total ?? 0} sprint tasks done</p>
            </div>
          </motion.div>

          {/* ── My stats strip ───────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.08 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <StatCard label="My Tasks"      value={stats?.myTotal      ?? 0} color={theme.accent} />
            <StatCard label="In Progress"   value={stats?.myInProgress ?? 0} color="#9A3A06"      />
            <StatCard label="Completed"     value={stats?.myDone       ?? 0} color="#0E6A30"      />
            <StatCard label="XP Earned"     value={`${stats?.myXp ?? 0} XP`} color="#1948BD"     />
          </motion.div>

          {/* ── My progress bar ──────────────────────────────────────── */}
          {(stats?.myTotal ?? 0) > 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }}
              className="rounded-2xl border border-ink/[0.07] bg-ink/[0.02] p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between text-[14px]">
                <span className="font-black text-slate-500 uppercase tracking-wider">My Progress</span>
                <span className="font-black" style={{ color: theme.text }}>{myProgressPct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-ink/[0.05] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${myProgressPct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
                  className="h-full rounded-full"
                  style={{
                    background: myProgressPct >= 80 ? "#12803B" : myProgressPct >= 50 ? theme.accent : "#9A3A06",
                    boxShadow: "var(--shadow-1)",
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* ── Task filter + list ───────────────────────────────────── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs font-black text-text-primary">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1 bg-ink/[0.04] border border-ink/[0.08] rounded-xl p-1">
              {[
                { key: "all",    label: "All"      },
                { key: "active", label: "Active"   },
                { key: "done",   label: "Completed" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className="px-3 py-1.5 rounded-lg text-[14px] font-bold transition-all"
                  style={filter === key
                    ? { background: theme.accent, color: "var(--on-accent)" }
                    : { color: "#4F5B75" }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-16"
            >
              <CheckCircle2 size={36} className="text-slate-700" strokeWidth={1.5} />
              <p className="text-sm font-bold text-slate-500">
                {filter === "done" ? "No completed tasks yet." :
                 filter === "active" ? "No active tasks." :
                 "No tasks assigned to you in this sprint."}
              </p>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              <AnimatePresence>
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={String(task.id)}
                    task={task}
                    accent={theme.accent}
                    onStatusChange={handleStatusChange}
                    updating={updating}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
