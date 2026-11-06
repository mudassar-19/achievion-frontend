import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CalendarRange, ChevronRight,
  Zap,
} from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";

import TallyLoader from "@/components/ui/TallyLoader";
// ── Config ─────────────────────────────────────────────────────────────────────
const PRIORITY_COLORS = {
  Critical: "#B01F17",
  High:     "#9A3A06",
  Medium:   "#7A5200",
  Low:      "#3A4660",
};

const STATUS_COLORS = {
  "Backlog":     "#4F5B75",
  "To-Do":       "#7A5200",
  "In-Progress": "#1948BD",
  "In-Review":   "#1948BD",
  "Done":        "#0E6A30",
};

const TYPE_CFG = {
  Feature:       { bg: "bg-[#1F57E0]/15", text: "text-[#1948BD]" },
  Bug:           { bg: "bg-[#D1291F]/15", text: "text-[#B01F17]" },
  Design:        { bg: "bg-[#2A62EC]/15", text: "text-[#1948BD]" },
  Testing:       { bg: "bg-[#12803B]/15", text: "text-[#0E6A30]" },
  DevOps:        { bg: "bg-[#E8590C]/15", text: "text-[#9A3A06]" },
  Documentation: { bg: "bg-[#6D7B99]/15", text: "text-[#3A4660]" },
};

const WEEK_OPTIONS = [4, 6, 8, 12];
const ROW_H        = 36;
const LEFT_W       = 200;
const COL_W        = 38; // px per day

// ── Helpers ────────────────────────────────────────────────────────────────────
function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function daysBetween(a, b) {
  return Math.floor((startOfDay(b) - startOfDay(a)) / 86400000);
}

function fmtDay(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtMonth(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// ── Tooltip ────────────────────────────────────────────────────────────────────
function Tooltip({ task, x, y, visible }) {
  if (!visible) return null;
  const type = TYPE_CFG[task.type] ?? TYPE_CFG.Feature;
  const pc   = PRIORITY_COLORS[task.priority] ?? "#3A4660";
  const sc   = STATUS_COLORS[task.status]     ?? "#3A4660";

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: Math.min(x + 12, window.innerWidth - 260), top: Math.max(8, y - 80) }}
    >
      <div className="w-56 rounded-xl border border-ink/[0.12] bg-[#FFFFFF] shadow-2xl p-3 flex flex-col gap-2">
        <p className="text-xs font-black text-text-primary leading-snug">{task.title}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[14px] font-bold px-1.5 py-0.5 rounded-full ${type.bg} ${type.text}`}>{task.type}</span>
          <span className="text-[14px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${pc}20`, color: pc }}>{task.priority}</span>
          <span className="text-[14px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${sc}20`, color: sc }}>{task.status}</span>
        </div>
        <div className="flex items-center justify-between text-[14px] text-slate-500">
          <span className="flex items-center gap-1 text-[#7A5200] font-bold"><Zap size={9} strokeWidth={2.5} />{task.xpValue} XP</span>
          <span>Due {fmtDay(task.deadline)}</span>
        </div>
        {task.assignees?.length > 0 && (
          <p className="text-[14px] text-slate-500 truncate">
            {task.assignees.map((a) => a.name).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

// ── GanttPage ──────────────────────────────────────────────────────────────────
export default function GanttPage() {
  const theme = useRoleTheme();

  const [groups,  setGroups]  = useState([]);
  const [since,   setSince]   = useState(null);
  const [until,   setUntil]   = useState(null);
  const [weeks,   setWeeks]   = useState(8);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState({ visible: false, task: null, x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState({});

  const scrollRef = useRef(null);

  // Load data
  useEffect(() => {
    api.get(`/api/manager/timeline?weeks=${weeks}`)
      .then((r) => {
        const d = r.data ?? r;
        setGroups(d.groups ?? []);
        setSince(d.since ? startOfDay(d.since) : null);
        setUntil(d.until ? startOfDay(d.until) : null);
      })
      .catch(() => { setGroups([]); })
      .finally(() => setLoading(false));
  }, [weeks]);

  // Scroll to today on load
  useEffect(() => {
    if (!since || !scrollRef.current) return;
    const todayOffset = daysBetween(since, new Date());
    scrollRef.current.scrollLeft = Math.max(0, todayOffset * COL_W - 80);
  }, [since, loading]);

  // Build day headers
  const days = useMemo(() => {
    if (!since || !until) return [];
    const total = daysBetween(since, until) + 1;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      return d;
    });
  }, [since, until]);

  const totalDays  = days.length;
  const todayIdx   = since ? daysBetween(since, new Date()) : -1;

  // Compute month headers (unique month groups)
  const monthHeaders = useMemo(() => {
    const mh = [];
    let cur = null;
    days.forEach((d, i) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key !== cur) {
        cur = key;
        mh.push({ label: fmtMonth(d), startIdx: i });
      }
    });
    return mh;
  }, [days]);

  const toggleGroup = (id) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const totalTasks = groups.reduce((s, g) => s + g.tasks.length, 0);

  return (
    <div className="flex flex-col gap-5 px-4 sm:px-8 py-8 min-h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600 mb-1 flex items-center gap-1.5">
            <CalendarRange size={11} strokeWidth={2.5} style={{ color: theme.text }} />
            Manager · Team Lead
          </p>
          <h1 className="text-3xl font-black text-text-primary">Timeline</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[14px] text-slate-500 font-semibold">{totalTasks} tasks across {groups.length} projects</span>
          {/* Weeks selector */}
          <div className="flex items-center gap-1 bg-ink/[0.04] border border-ink/[0.08] rounded-xl p-1">
            {WEEK_OPTIONS.map((w) => (
              <button
                key={w}
                onClick={() => setWeeks(w)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                style={weeks === w ? { background: theme.accent, color: "var(--on-accent)" } : { color: "#4F5B75" }}
              >
                {w}w
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <TallyLoader />
        </div>
      ) : totalTasks === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <CalendarRange size={36} className="text-slate-700" />
          <p className="text-sm text-slate-500">No tasks with deadlines in this range.</p>
          <p className="text-xs text-slate-600">Assign deadlines to tasks to see them on the timeline.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="flex flex-col rounded-2xl border border-ink/[0.07] bg-ink/[0.02] overflow-hidden">
          {/* ── Sticky header row ───────────────────────────────────────── */}
          <div className="flex border-b border-ink/[0.07] sticky top-0 z-20 bg-[#F5F6FA]">
            {/* Left label column */}
            <div className="flex-shrink-0 border-r border-ink/[0.07]" style={{ width: LEFT_W }}>
              <div className="h-6 border-b border-ink/[0.05]" />
              <div className="px-3 h-8 flex items-center">
                <p className="text-[14px] font-black uppercase tracking-widest text-slate-600">Project / Task</p>
              </div>
            </div>
            {/* Scrollable date header */}
            <div ref={scrollRef} className="flex-1 overflow-x-auto scrollbar-hide">
              <div style={{ width: totalDays * COL_W, minWidth: "100%" }}>
                {/* Month row */}
                <div className="relative h-6 border-b border-ink/[0.05]">
                  {monthHeaders.map((mh) => (
                    <div
                      key={mh.label}
                      className="absolute top-0 h-full flex items-center px-2"
                      style={{ left: mh.startIdx * COL_W }}
                    >
                      <p className="text-[14px] font-black uppercase tracking-wider text-slate-600 whitespace-nowrap">{mh.label}</p>
                    </div>
                  ))}
                </div>
                {/* Day row */}
                <div className="relative h-8 flex">
                  {days.map((d, i) => {
                    const isToday  = i === todayIdx;
                    const isSunday = d.getDay() === 0;
                    return (
                      <div
                        key={i}
                        className={`flex-shrink-0 flex items-center justify-center border-r border-ink/[0.04] ${isSunday ? "bg-white/[0.02]" : ""}`}
                        style={{ width: COL_W }}
                      >
                        <p
                          className={`text-[14px] font-bold ${isToday ? "text-text-primary" : "text-slate-700"}`}
                          style={isToday ? { color: theme.text } : {}}
                        >
                          {d.getDate()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <div className="flex">
            {/* Left label column (sticky) */}
            <div className="flex-shrink-0 border-r border-ink/[0.07]" style={{ width: LEFT_W }}>
              {groups.map((group) => (
                <div key={group.id}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 border-b border-ink/[0.05] hover:bg-ink/[0.03] transition-colors"
                    style={{ height: ROW_H }}
                  >
                    <ChevronRight
                      size={11}
                      strokeWidth={2.5}
                      className="transition-transform flex-shrink-0 text-slate-500"
                      style={collapsed[group.id] ? {} : { transform: "rotate(90deg)" }}
                    />
                    <p className="text-[14px] font-black text-slate-300 truncate flex-1 text-left">{group.label}</p>
                    <span className="text-[14px] font-bold text-slate-600 flex-shrink-0">{group.tasks.length}</span>
                  </button>
                  {/* Task rows */}
                  {!collapsed[group.id] && group.tasks.map((task) => {
                    const sc = STATUS_COLORS[task.status] ?? "#3A4660";
                    return (
                      <div
                        key={String(task.id)}
                        className="flex items-center gap-2 px-3 border-b border-ink/[0.04] hover:bg-ink/[0.03] transition-colors"
                        style={{ height: ROW_H }}
                      >
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: sc }} />
                        <p className="text-[14px] text-slate-400 font-semibold truncate">{task.title}</p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Scrollable chart area — synced with header */}
            <div
              className="flex-1 overflow-x-auto scrollbar-hide"
              onScroll={(e) => {
                if (scrollRef.current) scrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
              }}
            >
              <div style={{ width: totalDays * COL_W, position: "relative" }}>
                {/* Today line */}
                {todayIdx >= 0 && todayIdx < totalDays && (
                  <div
                    className="absolute top-0 bottom-0 z-10 pointer-events-none"
                    style={{ left: todayIdx * COL_W + COL_W / 2, width: 2, background: `${theme.accent}70` }}
                  />
                )}

                {/* Column stripes */}
                {days.map((d, i) => (
                  d.getDay() === 0 ? (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 bg-ink/[0.015]"
                      style={{ left: i * COL_W, width: COL_W }}
                    />
                  ) : null
                ))}

                {groups.map((group) => (
                  <div key={group.id}>
                    {/* Group header row (empty) */}
                    <div
                      className="border-b border-ink/[0.05]"
                      style={{ height: ROW_H }}
                    />
                    {/* Task bars */}
                    {!collapsed[group.id] && group.tasks.map((task) => {
                      const deadlineDay = daysBetween(since, new Date(task.deadline));
                      const clampedDay  = Math.max(0, Math.min(totalDays - 1, deadlineDay));
                      const barX        = Math.max(0, clampedDay * COL_W - 1);
                      const isOverdue   = task.status !== "Done" && deadlineDay < todayIdx;
                      const isDone      = task.status === "Done";
                      const pc          = PRIORITY_COLORS[task.priority] ?? "#3A4660";
                      const barColor    = isDone ? "#0E6A30" : isOverdue ? "#B01F17" : pc;

                      return (
                        <div
                          key={String(task.id)}
                          className="relative border-b border-ink/[0.04]"
                          style={{ height: ROW_H }}
                        >
                          {/* Diamond deadline marker */}
                          <div
                            className="absolute top-1/2 cursor-pointer group/tip"
                            style={{
                              left:      barX,
                              transform: "translate(-50%, -50%) rotate(45deg)",
                              width:     14,
                              height:    14,
                              background: barColor,
                              border:    `2px solid ${barColor}`,
                              boxShadow: "var(--shadow-1)",
                              borderRadius: 2,
                            }}
                            onMouseEnter={(e) => setTooltip({ visible: true, task, x: e.clientX, y: e.clientY })}
                            onMouseMove={(e)  => setTooltip((t) => ({ ...t, x: e.clientX, y: e.clientY }))}
                            onMouseLeave={() => setTooltip({ visible: false, task: null, x: 0, y: 0 })}
                          />
                          {/* Connecting line from task start (col 0) to marker */}
                          <div
                            className="absolute top-1/2 pointer-events-none"
                            style={{
                              left:       0,
                              width:      Math.max(0, barX),
                              height:     2,
                              transform:  "translateY(-50%)",
                              background: `linear-gradient(90deg, transparent, ${barColor}40, ${barColor}60)`,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      {!loading && totalTasks > 0 && (
        <div className="flex items-center gap-5 flex-wrap">
          {[
            { label: "On Track",   color: PRIORITY_COLORS.Medium },
            { label: "High Prio",  color: PRIORITY_COLORS.High },
            { label: "Critical",   color: PRIORITY_COLORS.Critical },
            { label: "Done",       color: "#0E6A30" },
            { label: "Overdue",    color: "#B01F17" },
            { label: "Today",      color: theme.text, line: true },
          ].map(({ label, color, line }) => (
            <div key={label} className="flex items-center gap-2">
              {line ? (
                <div className="w-4 h-0.5 rounded-full" style={{ background: color }} />
              ) : (
                <div className="h-3 w-3 rounded-sm rotate-45" style={{ background: color }} />
              )}
              <span className="text-[14px] font-semibold text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tooltip portal */}
      <Tooltip {...tooltip} accent={theme.accent} />
    </div>
  );
}
