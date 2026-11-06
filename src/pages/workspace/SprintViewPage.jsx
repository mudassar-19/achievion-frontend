import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Loader2, ChevronRight, CheckCircle2, Circle, Clock,
  CalendarDays, Flag, LayoutList, Target, TrendingUp,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";

import TallyLoader from "@/components/ui/TallyLoader";
import { avatarUrl } from "@/lib/avatar";
// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  Planning:  { color: "#1948BD", bg: "#1F57E018", label: "Planning"   },
  Active:    { color: "#0E6A30", bg: "#12803B18", label: "Active"     },
  Completed: { color: "#1948BD", bg: "#2A62EC18", label: "Completed"  },
};

const TASK_STATUS_CFG = {
  "Backlog":     { color: "#4F5B75", icon: Circle        },
  "To-Do":       { color: "#1948BD", icon: Circle        },
  "In-Progress": { color: "#9A3A06", icon: Clock         },
  "In-Review":   { color: "#1948BD", icon: AlertCircle   },
  "Done":        { color: "#0E6A30", icon: CheckCircle2  },
};

const PRIORITY_DOT = { Critical: "#B01F17", High: "#9A3A06", Medium: "#7A5200", Low: "#1948BD" };
const TYPE_COLOR   = {
  Feature: "#1948BD", Bug: "#B01F17", Design: "#9A3A06",
  Testing: "#08695F", DevOps: "#1948BD", Documentation: "#4F5B75",
};
const ROLE_COLORS  = {
  Director: "#1948BD", Manager: "#1948BD", "Team Lead": "#08695F",
  "Senior Developer": "#0E6A30", "Junior Developer": "#0E6A30",
  "Senior Designer":  "#B01F17", "Junior Designer":  "#B01F17",
  "Senior Tester":    "#7A5200", "Junior Tester":    "#7A5200",
};

const KANBAN_COLS = ["To-Do", "In-Progress", "In-Review", "Done"];

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysLeft(d) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d) - Date.now()) / 86400000);
  return diff;
}

// ── Sprint List Item ──────────────────────────────────────────────────────────
function SprintListItem({ sprint, isActive, onClick, accent }) {
  const cfg = STATUS_CFG[sprint.status] ?? STATUS_CFG.Planning;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
      style={isActive
        ? { background: `${accent}15`, borderLeft: `3px solid ${accent}`, paddingLeft: "9px" }
        : { color: "#4F5B75" }
      }
    >
      <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-text-primary truncate">{sprint.name}</p>
        <p className="text-[14px] text-slate-600 mt-0.5">{sprint.taskCount} tasks</p>
      </div>
      {isActive && <ChevronRight size={11} className="flex-shrink-0" style={{ color: accent }} strokeWidth={2.5} />}
    </button>
  );
}

// ── Task Card (read-only) ─────────────────────────────────────────────────────
function TaskCard({ task, accent }) {
  
  const tc   = TYPE_COLOR[task.type] ?? "#3A4660";
  const pdot = PRIORITY_DOT[task.priority] ?? "#4F5B75";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-xl border border-ink/[0.07] bg-ink/[0.02] p-3 flex flex-col gap-2 hover:border-ink/[0.12] transition-colors"
    >
      {/* Type + priority */}
      <div className="flex items-center gap-1.5">
        <span className="text-[14px] font-black uppercase px-1.5 py-0.5 rounded-full" style={{ background: `${tc}18`, color: tc }}>
          {task.type}
        </span>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: pdot }} />
        <span className="text-[14px] text-slate-600">{task.priority}</span>
      </div>

      {/* Title */}
      <p className="text-xs font-bold text-text-primary leading-snug line-clamp-2">{task.title}</p>

      {/* XP */}
      <div className="flex items-center gap-1 text-[14px] font-bold" style={{ color: accent }}>
        <Zap size={9} strokeWidth={2.5} />{task.xpValue} XP
      </div>

      {/* Assignees */}
      {task.assignees?.length > 0 && (
        <div className="flex -space-x-1.5">
          {task.assignees.slice(0, 4).map((a, i) => {
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
          {task.assignees.length > 4 && (
            <div className="h-5 w-5 rounded-md bg-ink/[0.06] border-2 border-[#FFFFFF] flex items-center justify-center text-[14px] font-black text-slate-500">
              +{task.assignees.length - 4}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── SprintViewPage ────────────────────────────────────────────────────────────
export default function SprintViewPage() {
  const theme = useRoleTheme();

  const [sprints,   setSprints]   = useState([]);
  const [loadList,  setLoadList]  = useState(true);
  const [selected,  setSelected]  = useState(null);   // sprint id
  const [detail,    setDetail]    = useState(null);
  const [loadDetail,setLoadDetail]= useState(false);
  const [viewMode,  setViewMode]  = useState("board"); // "board" | "list"

  // Load sprint list
  useEffect(() => {
    api.get("/api/manager/sprints")
      .then((r) => {
        const list = Array.isArray(r) ? r : (r.data ?? []);
        setSprints(list);
        // Auto-select active sprint
        const active = list.find((s) => s.status === "Active") ?? list[0] ?? null;
        if (active) setSelected(String(active.id));
      })
      .catch(() => setSprints([]))
      .finally(() => setLoadList(false));
  }, []);

  // Load sprint detail when selection changes
  useEffect(() => {
    if (!selected) { setTimeout(() => setDetail(null), 0); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadDetail(true);
    api.get(`/api/manager/sprints/${selected}`)
      .then((r) => setDetail(r.data ?? r))
      .catch(() => setDetail(null))
      .finally(() => setLoadDetail(false));
  }, [selected]);

  const tasks   = detail?.tasks ?? [];
  const stats   = detail?.stats ?? {};
  const dl      = daysLeft(detail?.endDate);

  // Progress
  const progressPct = stats.total > 0
    ? Math.round((stats.done / stats.total) * 100)
    : 0;

  // Kanban grouping
  const byStatus = {};
  for (const col of KANBAN_COLS) byStatus[col] = [];
  for (const t of tasks) {
    const bucket = KANBAN_COLS.includes(t.status) ? t.status : "To-Do";
    byStatus[bucket].push(t);
  }

  return (
    <div className="flex gap-0 min-h-full">
      {/* ── Sprint list sidebar ───────────────────────────────────────────── */}
      <motion.aside
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="w-52 flex-shrink-0 border-r border-ink/[0.06] flex flex-col py-6 px-3 gap-1"
      >
        <p className="text-[14px] font-black uppercase tracking-[0.15em] text-slate-600 px-3 mb-2">Sprints</p>

        {loadList ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin" style={{ color: theme.text }} />
          </div>
        ) : sprints.length === 0 ? (
          <p className="text-xs text-slate-600 px-3">No sprints yet.</p>
        ) : (
          sprints.map((s) => (
            <SprintListItem
              key={String(s.id)}
              sprint={s}
              isActive={String(s.id) === selected}
              onClick={() => setSelected(String(s.id))}
              accent={theme.accent}
            />
          ))
        )}
      </motion.aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-6 px-4 sm:px-8 py-8 overflow-auto">
        {!selected ? (
          <div className="flex flex-col items-center gap-3 py-24">
            <Target size={40} className="text-slate-700" strokeWidth={1.5} />
            <p className="text-base font-black text-text-primary">Select a sprint</p>
            <p className="text-sm text-slate-500">Choose a sprint from the sidebar to view details.</p>
          </div>
        ) : loadDetail ? (
          <div className="flex justify-center py-24">
            <TallyLoader />
          </div>
        ) : !detail ? (
          <p className="text-sm text-slate-500 py-16 text-center">Failed to load sprint details.</p>
        ) : (
          <>
            {/* ── Sprint header ─────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start justify-between gap-4 flex-wrap"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span
                    className="text-[14px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{ background: (STATUS_CFG[detail.status] ?? STATUS_CFG.Planning).bg, color: (STATUS_CFG[detail.status] ?? STATUS_CFG.Planning).color }}
                  >
                    {(STATUS_CFG[detail.status] ?? STATUS_CFG.Planning).label}
                  </span>
                  <span className="text-[14px] font-bold text-slate-600 uppercase tracking-wider">Read-only view</span>
                </div>
                <h1 className="text-2xl font-black text-text-primary">{detail.name}</h1>
                {detail.goal && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Flag size={10} strokeWidth={2} style={{ color: theme.text }} />
                    {detail.goal}
                  </p>
                )}
              </div>

              {/* Date + countdown */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CalendarDays size={13} strokeWidth={2} className="text-slate-600" />
                  {fmtDate(detail.startDate)} — {fmtDate(detail.endDate)}
                </div>
                {dl !== null && detail.status === "Active" && (
                  <span
                    className="text-xs font-black px-3 py-1 rounded-full"
                    style={dl < 0
                      ? { background: "#D1291F18", color: "#B01F17" }
                      : dl <= 3
                        ? { background: "#E8590C18", color: "#9A3A06" }
                        : { background: `${theme.accent}18`, color: theme.text }
                    }
                  >
                    {dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? "Ends today" : `${dl}d left`}
                  </span>
                )}
              </div>
            </motion.div>

            {/* ── Stats strip ──────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.05 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {[
                { label: "Total Tasks", value: stats.total      ?? 0, color: "#4F5B75"    },
                { label: "Done",        value: stats.done       ?? 0, color: "#0E6A30"    },
                { label: "In Progress", value: stats.inProgress ?? 0, color: theme.text },
                { label: "XP Earned",   value: `${stats.earnedXp ?? 0}/${stats.totalXp ?? 0}`, color: "#1948BD" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-2xl border border-ink/[0.07] bg-ink/[0.02] p-4">
                  <p className="text-xl font-black" style={{ color }}>{value}</p>
                  <p className="text-[14px] font-black uppercase tracking-wider text-slate-600 mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>

            {/* ── Progress bar ─────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.08 }}
              className="rounded-2xl border border-ink/[0.07] bg-ink/[0.02] p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} strokeWidth={2} style={{ color: theme.text }} />
                  <p className="text-xs font-black text-text-primary">Sprint Progress</p>
                </div>
                <p className="text-sm font-black" style={{ color: theme.text }}>{progressPct}%</p>
              </div>
              <div className="h-3 rounded-full bg-ink/[0.05] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: progressPct >= 80
                      ? "#0E6A30"
                      : progressPct >= 50
                        ? theme.accent
                        : "#9A3A06",
                    boxShadow: "var(--shadow-1)",
                  }}
                />
              </div>
              <p className="text-[14px] text-slate-600">
                {stats.done ?? 0} of {stats.total ?? 0} tasks completed
              </p>
            </motion.div>

            {/* ── View toggle + board/list ──────────────────────────── */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-text-primary">
                {tasks.length} task{tasks.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-1 bg-ink/[0.04] border border-ink/[0.08] rounded-xl p-1">
                {[
                  { key: "board", icon: LayoutList, label: "Board" },
                  { key: "list",  icon: LayoutList, label: "List"  },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setViewMode(key)}
                    className="px-3 py-1.5 rounded-lg text-[14px] font-bold transition-all"
                    style={viewMode === key
                      ? { background: theme.accent, color: "var(--on-accent)" }
                      : { color: "#4F5B75" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {viewMode === "board" ? (
                /* ── Kanban board ──────────────────────────────────── */
                <motion.div
                  key="board"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-2 xl:grid-cols-4 gap-4"
                >
                  {KANBAN_COLS.map((col) => {
                    const scfgCol = TASK_STATUS_CFG[col] ?? TASK_STATUS_CFG["To-Do"];
                    return (
                      <div key={col} className="flex flex-col gap-2">
                        {/* Column header */}
                        <div className="flex items-center gap-2 px-1 py-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: scfgCol.color }} />
                          <p className="text-xs font-black text-slate-400">{col}</p>
                          <span className="ml-auto text-[14px] font-black text-slate-600">
                            {byStatus[col].length}
                          </span>
                        </div>

                        {/* Column body */}
                        <div
                          className="min-h-[120px] rounded-2xl border border-ink/[0.06] bg-ink/[0.01] p-2 flex flex-col gap-2"
                          style={{ borderColor: `${scfgCol.color}20` }}
                        >
                          {byStatus[col].length === 0 ? (
                            <div className="flex-1 flex items-center justify-center">
                              <p className="text-[14px] text-slate-700">No tasks</p>
                            </div>
                          ) : (
                            byStatus[col].map((t) => (
                              <TaskCard key={String(t.id)} task={t} accent={theme.accent} />
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ) : (
                /* ── List view ─────────────────────────────────────── */
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-ink/[0.07] bg-ink/[0.02] overflow-hidden"
                >
                  {/* Header */}
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr] gap-4 px-5 py-3 border-b border-ink/[0.07] bg-ink/[0.02]">
                    {["Task", "Type", "Priority", "Status", "Assignees"].map((h) => (
                      <p key={h} className="text-[14px] font-black uppercase tracking-widest text-slate-600">{h}</p>
                    ))}
                  </div>
                  {tasks.length === 0 ? (
                    <p className="text-sm text-slate-600 text-center py-10">No tasks in this sprint.</p>
                  ) : (
                    tasks.map((t, i) => {
                      const sc   = TASK_STATUS_CFG[t.status] ?? TASK_STATUS_CFG["To-Do"];
                      const tc   = TYPE_COLOR[t.type] ?? "#3A4660";
                      const pdot = PRIORITY_DOT[t.priority] ?? "#4F5B75";
                      return (
                        <motion.div
                          key={String(t.id)}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.02 }}
                          className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr] gap-4 px-5 py-3 border-b border-ink/[0.04] last:border-0 hover:bg-ink/[0.025] transition-colors items-center"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-primary truncate">{t.title}</p>
                            <p className="text-[14px] text-slate-600 flex items-center gap-1 mt-0.5">
                              <Zap size={8} strokeWidth={2.5} style={{ color: theme.text }} />
                              {t.xpValue} XP
                            </p>
                          </div>
                          <span className="text-[14px] font-bold px-2 py-0.5 rounded-full w-fit" style={{ background: `${tc}18`, color: tc }}>{t.type}</span>
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: pdot }} />
                            <span className="text-[14px] text-slate-400">{t.priority}</span>
                          </div>
                          <span className="text-[14px] font-bold px-2 py-0.5 rounded-full w-fit" style={{ background: `${sc.color}18`, color: sc.color }}>{t.status}</span>
                          <div className="flex -space-x-1">
                            {(t.assignees ?? []).slice(0, 4).map((a, ai) => (
                              <div key={ai} title={a.name} className="h-5 w-5 rounded-md overflow-hidden border-2 border-[#FFFFFF]">
                                <img
                                  src={avatarUrl("bottts", a.name)}
                                  alt={a.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
