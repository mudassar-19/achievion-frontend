import { fmtShort as dShort } from "@/pages/manager/project/format";
import { useEffect, useState, useCallback } from "react";
import { motion }                           from "framer-motion";
import { Flag, Target, CheckCircle2, AlertTriangle, Zap, Activity } from "lucide-react";
import api         from "@/lib/api";
import useTLSocket from "@/hooks/useTLSocket";

import TallyLoader from "@/components/ui/TallyLoader";
const TEAL = "#08695F";
const WORKLOAD_COLORS = { Free: "#0E6A30", Moderate: "#7A5200", Busy: "#9A3A06", Overloaded: "#B01F17" };

function StatCard({ label, value, color, icon: Icon, sub }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2 p-4 rounded-2xl border"
      style={{ background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)", borderColor: "rgba(20,32,61,0.06)" }}>
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon size={14} strokeWidth={1.75} style={{ color }} />
        </span>
      </div>
      <p className="text-2xl font-black tabular-nums" style={{ color }}>{value ?? "—"}</p>
      {sub && <p className="text-[14px] text-slate-600">{sub}</p>}
    </motion.div>
  );
}

function ProgressBar({ value = 0, color = TEAL, thin }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full rounded-full overflow-hidden ${thin ? "h-1" : "h-2"}`}
      style={{ background: "rgba(20,32,61,0.06)" }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="h-full rounded-full" style={{ background: color, boxShadow: "var(--shadow-1)" }}
      />
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1" style={{ background: "rgba(20,32,61,0.05)" }} />
      <p className="text-[14px] font-black uppercase tracking-widest text-slate-500">{children}</p>
      <div className="h-px flex-1" style={{ background: "rgba(20,32,61,0.05)" }} />
    </div>
  );
}

function workloadLevel(taskCount) {
  if (taskCount === 0)  return "Free";
  if (taskCount <= 2)   return "Moderate";
  if (taskCount <= 3)   return "Busy";
  return "Overloaded";
}

export default function TeamLeadAnalyticsPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort,    setSort]    = useState("tasksCompleted");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get("/api/teamlead/analytics");
      setData(d);
    } catch { setData(null); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useTLSocket({ onRefresh: load });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <TallyLoader />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-600">
        <AlertTriangle size={28} strokeWidth={1.2} className="mb-2" />
        <p className="text-sm">Could not load analytics.</p>
        <button onClick={load} className="mt-3 text-xs font-bold px-4 py-2 rounded-xl"
          style={{ background: `${TEAL}15`, color: TEAL }}>Retry</button>
      </div>
    );
  }

  const { teamPerformance = [], milestoneAnalytics = {}, taskStats = {}, sprintAnalytics = {}, workloadDistribution = [] } = data;

  const sorted = [...teamPerformance].sort((a, b) => (b[sort] ?? 0) - (a[sort] ?? 0));
  const maxWL  = Math.max(...workloadDistribution.map((u) => u.taskCount ?? 0), 1);

  return (
    <div className="px-4 sm:px-8 py-8 flex flex-col gap-8 min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text-primary">Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">Team performance, sprint health, and delivery insights</p>
      </div>

      {/* ── Task Stats ──────────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Task Stats · Last 30 Days</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Total Tasks"       value={taskStats.total}          color={TEAL}      icon={CheckCircle2} />
          <StatCard label="Completed"         value={taskStats.done}           color="#0E6A30"   icon={CheckCircle2} />
          <StatCard label="In Review"         value={taskStats.inReview}       color="#1948BD"   icon={Activity}     />
          <StatCard label="Overdue"           value={taskStats.overdue}        color="#B01F17"   icon={AlertTriangle} sub={taskStats.overdue > 0 ? "needs attention" : "all on track"} />
        </div>
        <div className="rounded-2xl border px-5 py-4" style={{ borderColor: `${TEAL}18`, background: `${TEAL}06` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-text-primary">Completion Rate</p>
            <span className="text-xs font-black tabular-nums" style={{ color: "#08695F" }}>
              {taskStats.completionRate ?? 0}%
            </span>
          </div>
          <ProgressBar value={taskStats.completionRate ?? 0} />
          <p className="text-[14px] text-slate-600 mt-2">{taskStats.done ?? 0} completed of {taskStats.total ?? 0} total</p>
        </div>
      </section>

      {/* ── Sprint Analytics ─────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Sprint Analytics</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Total Sprints" value={sprintAnalytics.total}     color={TEAL}      icon={Target} />
          <StatCard label="Active"        value={sprintAnalytics.active}    color="#1948BD"   icon={Zap} />
          <StatCard label="Completed"     value={sprintAnalytics.completed} color="#0E6A30"   icon={CheckCircle2} />
          <StatCard label="Delayed"       value={sprintAnalytics.delayed}   color="#B01F17"   icon={AlertTriangle} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border p-4" style={{ borderColor: "rgba(20,32,61,0.06)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
            <p className="text-[14px] font-bold uppercase tracking-widest text-slate-500 mb-2">Avg Velocity</p>
            <p className="text-2xl font-black tabular-nums" style={{ color: "#08695F" }}>
              {sprintAnalytics.avgVelocity != null ? `${sprintAnalytics.avgVelocity}` : "—"}
            </p>
            <p className="text-[14px] text-slate-600 mt-1">tasks per sprint</p>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "rgba(20,32,61,0.06)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
            <p className="text-[14px] font-bold uppercase tracking-widest text-slate-500 mb-2">Active Sprint Completion</p>
            <p className="text-2xl font-black tabular-nums" style={{ color: "#1948BD" }}>
              {sprintAnalytics.activeSprintCompletion != null ? `${sprintAnalytics.activeSprintCompletion}%` : "—"}
            </p>
            <div className="mt-2"><ProgressBar value={sprintAnalytics.activeSprintCompletion ?? 0} color="#1948BD" thin /></div>
          </div>
        </div>
      </section>

      {/* ── Milestone Analytics ──────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Milestone Analytics</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Total"     value={milestoneAnalytics.total}     color={TEAL}      icon={Flag} />
          <StatCard label="Active"    value={milestoneAnalytics.active}    color="#1948BD"   icon={Flag} />
          <StatCard label="Completed" value={milestoneAnalytics.completed} color="#0E6A30"   icon={CheckCircle2} />
          <StatCard label="Delayed"   value={milestoneAnalytics.delayed}   color="#B01F17"   icon={AlertTriangle} />
        </div>
        {milestoneAnalytics.bottleneck?.length > 0 && (
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(20,32,61,0.06)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(20,32,61,0.05)" }}>
              <p className="text-xs font-black text-text-primary">Bottleneck Milestones</p>
              <p className="text-[14px] text-slate-600 mt-0.5">Milestones at risk of delay</p>
            </div>
            <div className="flex flex-col divide-y" style={{ divideColor: "rgba(20,32,61,0.04)" }}>
              {milestoneAnalytics.bottleneck.map((m) => (
                <div key={m.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-text-primary">{m.title}</span>
                    <span className="text-[14px] text-slate-500">
                      {m.dueDate ? dShort(m.dueDate) : "—"}
                    </span>
                  </div>
                  <ProgressBar value={m.progress ?? 0} color="#7A5200" thin />
                  <p className="text-[14px] text-slate-600 mt-1">{m.progress ?? 0}% complete</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Team Performance ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Team Performance</SectionTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { key: "tasksCompleted", label: "Tasks" },
              { key: "reviewPassRate", label: "Pass Rate" },
              { key: "totalXp",        label: "XP" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setSort(key)}
                className="text-[14px] font-bold px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: sort === key ? `${TEAL}18` : "transparent",
                  color:      sort === key ? "#08695F" : "#4F5B75",
                  border:     `1px solid ${sort === key ? TEAL + "30" : "transparent"}`,
                }}>{label}</button>
            ))}
          </div>
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-slate-700 text-center py-8">No team performance data yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((member, i) => (
              <motion.div key={member.userId}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 px-5 py-4 rounded-2xl border"
                style={{ background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)", borderColor: "rgba(20,32,61,0.06)" }}>
                {/* Rank */}
                <span className="text-xs font-black tabular-nums w-5 shrink-0 text-center"
                  style={{ color: i === 0 ? "#7A5200" : i === 1 ? "#3A4660" : i === 2 ? "#9A3A06" : "#4F5B75" }}>
                  {i + 1}
                </span>
                {/* Avatar placeholder */}
                <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center font-black text-xs"
                  style={{ background: `${TEAL}20`, color: TEAL }}>
                  {member.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{member.name}</p>
                  <p className="text-[14px] text-slate-600 truncate capitalize">{member.role?.replace(/_/g, " ")}</p>
                </div>
                {/* Metrics */}
                <div className="flex items-center gap-5 shrink-0 text-right">
                  <div>
                    <p className="text-sm font-black tabular-nums" style={{ color: "#08695F" }}>{member.tasksCompleted ?? 0}</p>
                    <p className="text-[14px] text-slate-600">tasks</p>
                  </div>
                  <div>
                    <p className="text-sm font-black tabular-nums text-text-primary">{member.reviewPassRate ?? 0}%</p>
                    <p className="text-[14px] text-slate-600">pass rate</p>
                  </div>
                  <div>
                    <p className="text-sm font-black tabular-nums" style={{ color: "#7A5200" }}>{member.totalXp ?? 0}</p>
                    <p className="text-[14px] text-slate-600">XP · Lv {member.level ?? 1}</p>
                  </div>
                  {member.hp != null && (
                    <div>
                      <p className="text-sm font-black tabular-nums text-red-400">{member.hp}</p>
                      <p className="text-[14px] text-slate-600">HP</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── Workload Distribution ────────────────────────────────────────────── */}
      {workloadDistribution.length > 0 && (
        <section>
          <SectionTitle>Workload Distribution</SectionTitle>
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(20,32,61,0.06)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
            <div className="p-5 flex flex-col gap-3">
              {workloadDistribution.map((u) => {
                const level = workloadLevel(u.taskCount ?? 0);
                const color = WORKLOAD_COLORS[level];
                return (
                  <div key={u.userId} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-[14px] font-black"
                      style={{ background: `${color}20`, color }}>
                      {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <p className="text-xs text-slate-300 w-28 truncate shrink-0">{u.name}</p>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(20,32,61,0.05)" }}>
                          <motion.div initial={{ width: 0 }}
                            animate={{ width: `${((u.taskCount ?? 0) / maxWL) * 100}%` }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className="h-full rounded-full" style={{ background: color }} />
                        </div>
                        <span className="text-[14px] font-bold tabular-nums shrink-0" style={{ color }}>
                          {u.taskCount ?? 0} tasks
                        </span>
                      </div>
                    </div>
                    <span className="text-[14px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: `${color}15`, color }}>{level}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
