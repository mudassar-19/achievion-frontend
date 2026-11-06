import { fmtDateTime as dTime } from "@/pages/manager/project/format";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence }    from "framer-motion";
import { Crown, Star, Flag, Target, Shield, Activity, Clock, Zap, TrendingUp, Users, AlertTriangle, CheckCircle2, Award, Layers, BarChart2, Circle, Briefcase } from "lucide-react";
import api          from "@/lib/api";
import useAuthStore from "@/stores/authStore";
import useTLSocket  from "@/hooks/useTLSocket";

import TallyLoader from "@/components/ui/TallyLoader";
// ── Design tokens ─────────────────────────────────────────────────────────────
const TEAL = "#08695F";


const RARITY = {
  legendary: { bg: "rgba(255,194,26,0.13)", text: "#7A5200", border: "rgba(255,194,26,0.30)", glow: "#7A520040" },
  epic:      { bg: "rgba(167,139,250,0.13)", text: "#1948BD", border: "rgba(167,139,250,0.30)", glow: "#1948BD40" },
  rare:      { bg: "rgba(31,87,224,0.13)",  text: "#1948BD", border: "rgba(31,87,224,0.30)",  glow: "#1948BD40" },
  common:    { bg: "rgba(79,91,117,0.08)", text: "#3A4660", border: "rgba(79,91,117,0.20)", glow: "transparent" },
};
const rc = (r) => RARITY[r?.toLowerCase?.()] ?? RARITY.common;

const INSIGHT_STYLE = {
  positive: { icon: CheckCircle2, color: "#0E6A30", bg: "rgba(18,128,59,0.10)", border: "rgba(18,128,59,0.20)" },
  warning:  { icon: AlertTriangle, color: "#7A5200", bg: "rgba(255,194,26,0.10)", border: "rgba(255,194,26,0.20)" },
  critical: { icon: AlertTriangle, color: "#B01F17", bg: "rgba(209,41,31,0.10)",  border: "rgba(209,41,31,0.20)"  },
  neutral:  { icon: Circle,       color: "#4F5B75", bg: "rgba(109,123,153,0.10)", border: "rgba(109,123,153,0.20)" },
};

const ACTIVITY_ICON = {
  task_completed:     { emoji: "✅", color: "#0E6A30" },
  task_review:        { emoji: "🔍", color: "#1948BD" },
  task_started:       { emoji: "⚙️", color: "#1948BD" },
  task_updated:       { emoji: "📋", color: "#4F5B75" },
  milestone_completed:{ emoji: "🏆", color: "#7A5200" },
  milestone_updated:  { emoji: "🎯", color: "#08695F"      },
  sprint_updated:     { emoji: "⚡", color: "#9A3A06" },
  sprint_completed:   { emoji: "🚀", color: "#0E6A30" },
};

const WORKLOAD_COLOR = {
  Free:       { text: "#0E6A30", bg: "rgba(18,128,59,0.12)"  },
  Moderate:   { text: TEAL,      bg: `rgba(10,127,118,0.12)`  },
  Busy:       { text: "#7A5200", bg: "rgba(255,194,26,0.12)"   },
  Overloaded: { text: "#B01F17", bg: "rgba(209,41,31,0.12)"   },
};

// ── Circular gauge ─────────────────────────────────────────────────────────────
function Gauge({ value, size = 80, strokeW = 7, color = TEAL, label, sublabel }) {
  const r    = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(100, Math.max(0, value));
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(20,32,61,0.05)" strokeWidth={strokeW} />
          <motion.circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={strokeW}
            stroke={color} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ - dash}
            initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
          />
        </svg>
        <span className="absolute text-sm font-black tabular-nums" style={{ color }}>{pct}%</span>
      </div>
      {label && <p className="text-[14px] font-bold text-text-primary text-center leading-tight mt-0.5">{label}</p>}
      {sublabel && <p className="text-[14px] text-slate-600 text-center">{sublabel}</p>}
    </div>
  );
}

// ── XP bar ─────────────────────────────────────────────────────────────────────
function XpBar({ current, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-[14px] text-slate-600 mb-1">
        <span>{current.toLocaleString()} XP</span>
        <span>{pct}%</span>
        <span>{max.toLocaleString()} XP</span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(20,32,61,0.06)" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg,${TEAL},var(--accent))`, boxShadow: "var(--shadow-1)" }}
        />
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub, unit = "" }) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl border"
      style={{ background: "rgba(20,32,61,0.025)", borderColor: "rgba(20,32,61,0.07)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-bold uppercase tracking-wider text-slate-600">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}15` }}>
          <Icon size={12} style={{ color }} />
        </span>
      </div>
      <div>
        <span className="text-2xl font-black tabular-nums" style={{ color }}>{value ?? 0}</span>
        {unit && <span className="text-xs text-slate-600 ml-1">{unit}</span>}
      </div>
      {sub && <p className="text-[14px] text-slate-700 leading-tight">{sub}</p>}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, color = TEAL }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${color}18` }}>
        <Icon size={13} style={{ color }} />
      </span>
      <span className="text-sm font-black text-text-primary uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ── Member workload bar ─────────────────────────────────────────────────────────
function MemberBar({ member }) {
  const wc = WORKLOAD_COLOR[member.workload] ?? WORKLOAD_COLOR.Moderate;
  const pct = Math.min(100, (member.openTasks / 10) * 100);
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-black"
        style={{ background: `${TEAL}18`, color: TEAL }}>
        {member.name?.slice(0,1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[14px] font-semibold text-text-primary truncate">{member.name}</span>
          <span className="text-[14px] font-bold px-1.5 py-0.5 rounded-full ml-2 shrink-0"
            style={{ background: wc.bg, color: wc.text }}>{member.workload}</span>
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(20,32,61,0.05)" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full" style={{ background: wc.text }} />
        </div>
        <div className="flex justify-between text-[14px] text-slate-700 mt-0.5">
          <span>{member.openTasks} tasks</span>
          <span>HP {member.hp}%</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function TeamLeadProfilePage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("members"); // members | gamification
  const storeUser = useAuthStore((s) => s.user);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/teamlead/profile/full");
      setData(res);
    } catch { setData(null); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useTLSocket({ onRefresh: load });

  if (loading) return (
    <div className="flex items-center justify-center min-h-full">
      <div className="flex flex-col items-center gap-3">
        <TallyLoader />
        <p className="text-xs text-slate-600">Loading operational profile…</p>
      </div>
    </div>
  );
  if (!data) return (
    <div className="text-center py-24 text-slate-600 text-sm">
      <AlertTriangle size={24} className="mx-auto mb-2 opacity-40" />
      Could not load profile. Please refresh.
    </div>
  );

  const { user, gamification: gam, performance: perf, operational: ops, teamMembers, recentActivity, insights } = data;
  const tlS  = gam.tlStats ?? {};
  const name = storeUser?.name ?? user.name;
  const initials = name.split(" ").map((w) => w[0]).slice(0,2).join("").toUpperCase();

  const activeTitleDef = gam.activeTitle
    ? gam.titles?.find((t) => t.id === gam.activeTitle) ?? null
    : null;
  const titleColors = activeTitleDef ? rc(activeTitleDef.rarity) : rc("common");
  const displayTitle = activeTitleDef
    ? (activeTitleDef.name ?? activeTitleDef.id ?? "").replace(/tl_/g,"").replace(/_/g," ")
    : gam.activeTitle ? gam.activeTitle.replace(/tl_/g,"").replace(/_/g," ") : null;

  const recentBadges = [...gam.badges].reverse().slice(0,6);

  return (
    <div className="px-6 py-8 flex flex-col gap-5 min-h-full pb-12">

      {/* ── HERO IDENTITY CARD ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border p-6"
        style={{ background: `linear-gradient(135deg, #EAEDF4 0%, #FFFFFF 50%, #F5F6FA 100%)`, borderColor: `${TEAL}22` }}>
        {/* Decorative glow */}
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${TEAL}, transparent)` }} />

        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">

          {/* Avatar + identity */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-black"
                style={{ background: `linear-gradient(135deg,${TEAL}30,${TEAL}10)`, color: TEAL, border: `2px solid ${TEAL}35` }}>
                {initials}
              </div>
              {/* Level badge */}
              <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-black border-2 border-[#F5F6FA]"
                style={{ background: `linear-gradient(135deg,${TEAL},var(--accent))`, color: "var(--on-accent)" }}>
                {gam.level}
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black text-text-primary">{name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[14px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: `${TEAL}18`, color: TEAL, border: `1px solid ${TEAL}30` }}>
                  Team Lead
                </span>
                {user.department && (
                  <span className="text-[14px] font-semibold text-slate-500">{user.department}</span>
                )}
              </div>
              {displayTitle && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Crown size={11} style={{ color: titleColors.text }} />
                  <span className="text-[14px] font-black capitalize" style={{ color: titleColors.text }}>{displayTitle}</span>
                  <span className="text-[14px] font-bold px-1.5 py-0.5 rounded-full capitalize"
                    style={{ background: titleColors.bg, color: titleColors.text }}>{activeTitleDef?.rarity ?? "—"}</span>
                </div>
              )}
              <p className="text-[14px] text-slate-600 mt-1.5">
                Joined {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString("en-US", { month:"long", year:"numeric" }) : "—"}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block h-20 w-px" style={{ background: "rgba(20,32,61,0.06)" }} />

          {/* XP progression */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-slate-500">LEVEL {gam.level} PROGRESSION</span>
              <span className="text-[14px] font-bold" style={{ color: "#08695F" }}>{gam.totalXp.toLocaleString()} total XP</span>
            </div>
            <XpBar current={gam.currentXp} max={gam.maxXp} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <div className="flex items-center gap-1.5">
                <Zap size={10} style={{ color: "#7A5200" }} />
                <span className="text-[14px] text-slate-500">{gam.gold} Gold</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[14px]">❤️</span>
                <span className="text-[14px] text-slate-500">{gam.hp} HP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity size={10} style={{ color: "#0E6A30" }} />
                <span className="text-[14px] text-slate-500">Streak: <strong className="text-green-400">{gam.streakDays?.current ?? 0}d</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star size={10} style={{ color: "#7A5200" }} />
                <span className="text-[14px] text-slate-500">Best: <strong style={{ color: "#7A5200" }}>{gam.streakDays?.best ?? 0}d</strong></span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block h-20 w-px" style={{ background: "rgba(20,32,61,0.06)" }} />

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            {[
              { label: "Projects",  value: perf.projectsHandled,  color: "#08695F"      },
              { label: "Rank #",    value: gam.leaderboardRank,    color: "#7A5200" },
              { label: "Badges",    value: gam.badges.length,      color: "#1948BD" },
              { label: "Team",      value: teamMembers.length,     color: "#1948BD" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(20,32,61,0.03)", border: "1px solid rgba(20,32,61,0.06)" }}>
                <span className="text-lg font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
                <span className="text-[14px] font-semibold uppercase tracking-wider text-slate-600">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── PERFORMANCE GAUGES ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SectionHeader icon={BarChart2} label="Performance Scores" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Team Efficiency",    sub: "Overall execution",    value: perf.teamEfficiencyScore,    color: "#08695F"      },
            { label: "Task Success Rate",  sub: "Reviews approved",     value: perf.taskSuccessRate,        color: "#0E6A30" },
            { label: "Deadline Adherence", sub: "Milestones on time",   value: perf.deadlineAdherenceRate,  color: "#7A5200" },
            { label: "Risk Management",    sub: "Operational stability",value: ops.riskManagementScore,     color: "#1948BD" },
          ].map((g) => (
            <div key={g.label} className="flex items-center justify-center py-5 rounded-2xl border"
              style={{ background: "rgba(20,32,61,0.025)", borderColor: "rgba(20,32,61,0.07)" }}>
              <Gauge value={g.value} size={100} strokeW={8} color={g.color} label={g.label} sublabel={g.sub} />
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── KPI METRICS GRID ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <SectionHeader icon={Layers} label="Operational KPIs" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5">
          <StatCard label="Projects Handled"  value={perf.projectsHandled}       icon={Briefcase}   color={TEAL}      sub="All time managed" />
          <StatCard label="Active Oversight"  value={ops.projectOversightCount}  icon={Shield}      color="#1948BD"   sub="Currently supervising" />
          <StatCard label="Tasks Managed"     value={perf.tasksManaged}          icon={Target}      color="#1948BD"   sub="Across all projects" />
          <StatCard label="Milestones"        value={perf.activeMilestonesCount} icon={Flag}        color="#7A5200"   sub="Active operations" />
          <StatCard label="Sprints Done"      value={tlS.sprintsCompleted ?? 0}  icon={Zap}         color="#0E6A30"   sub="Completed sprints" />
          <StatCard label="Perfect Sprints"   value={tlS.perfectSprints ?? 0}    icon={Star}        color="#7A5200"   sub="100% completion" />
          <StatCard label="Avg Delivery"      value={perf.avgDeliveryDays}       icon={Clock}       color="#3A4660"   sub="Days per task" unit="d" />
          <StatCard label="Review Speed"      value={perf.approvalResponseSpeedH}icon={TrendingUp}  color={TEAL}      sub="Avg review response" unit="h" />
        </div>
      </motion.div>

      {/* ── OPERATIONAL METRICS ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <SectionHeader icon={Activity} label="Operational Intelligence" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Workload Stability */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl border"
            style={{ background: "rgba(20,32,61,0.025)", borderColor: "rgba(20,32,61,0.07)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold uppercase tracking-wider text-slate-600">Workload Stability</span>
              <Users size={12} className="text-slate-600" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black" style={{ color: ops.workloadStabilityScore >= 70 ? "#0E6A30" : ops.workloadStabilityScore >= 50 ? "#7A5200" : "#B01F17" }}>
                {ops.workloadStabilityScore}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(20,32,61,0.05)" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${ops.workloadStabilityScore}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: ops.workloadStabilityScore >= 70 ? "#12803B" : ops.workloadStabilityScore >= 50 ? "#7A5200" : "#B01F17" }} />
            </div>
            <p className="text-[14px] text-slate-600">{teamMembers.filter((m) => m.workload === "Overloaded").length} overloaded · {teamMembers.filter((m) => m.workload === "Free").length} free</p>
          </div>

          {/* Team Performance */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl border"
            style={{ background: "rgba(20,32,61,0.025)", borderColor: "rgba(20,32,61,0.07)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold uppercase tracking-wider text-slate-600">Team Performance</span>
              <TrendingUp size={12} className="text-slate-600" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black" style={{ color: ops.teamPerformanceScore >= 70 ? "#08695F" : ops.teamPerformanceScore >= 50 ? "#7A5200" : "#B01F17" }}>
                {ops.teamPerformanceScore}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(20,32,61,0.05)" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${ops.teamPerformanceScore}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full" style={{ background: `linear-gradient(90deg,${TEAL},var(--accent))` }} />
            </div>
            <p className="text-[14px] text-slate-600">{teamMembers.length} members · avg HP {teamMembers.length ? Math.round(teamMembers.reduce((s, m) => s + m.hp, 0) / teamMembers.length) : 100}%</p>
          </div>

          {/* Leadership stats strip */}
          <div className="flex flex-col gap-2 p-4 rounded-2xl border"
            style={{ background: "rgba(20,32,61,0.025)", borderColor: "rgba(20,32,61,0.07)" }}>
            <span className="text-[14px] font-bold uppercase tracking-wider text-slate-600">Leadership Stats</span>
            <div className="flex flex-col gap-1.5 mt-1">
              {[
                { label: "Milestones Delivered",  value: tlS.milestonesDelivered ?? 0, color: "#08695F"      },
                { label: "Milestones On-Time",     value: tlS.milestonesOnTime ?? 0,    color: "#0E6A30" },
                { label: "Reviews Approved",       value: tlS.reviewsApproved ?? 0,     color: "#7A5200" },
                { label: "Consecutive On-Time",    value: tlS.consecutiveOnTime ?? 0,   color: "#9A3A06" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[14px] text-slate-600">{s.label}</span>
                  <span className="text-[14px] font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── TEAM MEMBERS + GAMIFICATION TABS ──────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {/* Tab bar */}
        <div className="flex items-center gap-3 mb-3">
          <SectionHeader icon={Users} label="" />
          {[
            { id: "members",      label: "Team Workload"       },
            { id: "gamification", label: "Gamification Summary"},
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={tab === t.id
                ? { background: TEAL, color: "var(--on-accent)" }
                : { background: "rgba(20,32,61,0.04)", color: "#4F5B75", border: "1px solid rgba(20,32,61,0.08)" }}>
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "members" ? (
            <motion.div key="members" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: "rgba(20,32,61,0.07)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
              {teamMembers.length === 0 ? (
                <p className="text-xs text-slate-700 text-center py-10">No team members yet.</p>
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 divide-y md:divide-y-0"
                  style={{ divideColor: "rgba(20,32,61,0.04)" }}>
                  {teamMembers.map((m, i) => <MemberBar key={i} member={m} />)}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="gam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Badges */}
              <div className="rounded-2xl border overflow-hidden"
                style={{ borderColor: "rgba(20,32,61,0.07)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(20,32,61,0.05)" }}>
                  <p className="text-[14px] font-black text-text-primary">Badges ({gam.badges.length})</p>
                  <Award size={12} style={{ color: "#7A5200" }} />
                </div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {recentBadges.length === 0 ? (
                    <p className="col-span-3 text-xs text-slate-700 text-center py-6">No badges yet.</p>
                  ) : recentBadges.map((b, i) => {
                    const colors = rc(b.rarity);
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border"
                        style={{ background: colors.bg, borderColor: colors.border }}>
                        <span className="text-xl">{b.emoji ?? "🏅"}</span>
                        <p className="text-[14px] font-bold text-center leading-tight" style={{ color: colors.text }}>{b.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Titles + rank */}
              <div className="rounded-2xl border overflow-hidden"
                style={{ borderColor: "rgba(20,32,61,0.07)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(20,32,61,0.05)" }}>
                  <p className="text-[14px] font-black text-text-primary">Titles & Rank</p>
                  <Crown size={12} className="text-purple-400" />
                </div>
                <div className="p-4 flex flex-col gap-3">
                  {/* Active title */}
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                    style={{ background: titleColors.bg, border: `1px solid ${titleColors.border}` }}>
                    <Crown size={14} style={{ color: titleColors.text }} />
                    <div>
                      <p className="text-[14px] font-black capitalize" style={{ color: titleColors.text }}>
                        {displayTitle ?? "No title equipped"}
                      </p>
                      <p className="text-[14px] text-slate-600">Active title</p>
                    </div>
                  </div>
                  {/* Leaderboard rank */}
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: "rgba(255,194,26,0.08)", border: "1px solid rgba(255,194,26,0.18)" }}>
                    <div>
                      <p className="text-[14px] font-bold text-text-primary">Org Leaderboard</p>
                      <p className="text-[14px] text-slate-600">among {gam.totalTLs} Team Leads</p>
                    </div>
                    <span className="text-xl font-black" style={{ color: "#7A5200" }}>#{gam.leaderboardRank}</span>
                  </div>
                  {/* Title count */}
                  <div className="flex items-center justify-between text-[14px] text-slate-600 px-1">
                    <span>{gam.titles.length} titles unlocked</span>
                    <span>{gam.badges.length} badges earned</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── RECENT ACTIVITY FEED ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23 }}>
        <SectionHeader icon={Activity} label="Recent Activity" />
        <div className="rounded-2xl border overflow-hidden"
          style={{ borderColor: "rgba(20,32,61,0.07)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-slate-700 text-center py-10">No recent activity found.</p>
          ) : (
            <div className="divide-y max-h-80 overflow-y-auto" style={{ divideColor: "rgba(20,32,61,0.04)" }}>
              {recentActivity.map((ev, i) => {
                const cfg = ACTIVITY_ICON[ev.type] ?? { emoji: ev.icon ?? "📌", color: "#4F5B75" };
                return (
                  <motion.div key={ev.id ?? i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3 px-4 py-3">
                    <span className="text-base shrink-0 mt-0.5">{ev.icon ?? cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[14px] font-semibold text-text-primary truncate">{ev.subject}</span>
                        {ev.meta?.isLate && <span className="text-[14px] text-red-400 font-bold">LATE</span>}
                        {ev.meta?.status && (
                          <span className="text-[14px] font-bold px-1.5 py-0.5 rounded-full capitalize"
                            style={{ background: "rgba(20,32,61,0.05)", color: "#3A4660" }}>{ev.meta.status}</span>
                        )}
                      </div>
                      <p className="text-[14px] text-slate-600 mt-0.5">
                        {ev.actor?.name && <span className="text-slate-500">{ev.actor.name} · </span>}
                        {ev.timestamp ? dTime(ev.timestamp) : "—"}
                      </p>
                    </div>
                    <span className="text-[14px] font-bold px-2 py-1 rounded-full shrink-0"
                      style={{ background: `${cfg.color}15`, color: cfg.color }}>
                      {ev.type.replace(/_/g," ")}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── BOTTOM ROW: Insights + Account ──────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Quick Insights */}
        <div>
          <SectionHeader icon={Zap} label="Quick Insights" color="#7A5200" />
          <div className="rounded-2xl border overflow-hidden"
            style={{ borderColor: "rgba(20,32,61,0.07)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
            {insights.length === 0 ? (
              <p className="text-xs text-slate-700 text-center py-8">No insights yet — keep delivering!</p>
            ) : (
              <div className="flex flex-col divide-y" style={{ divideColor: "rgba(20,32,61,0.04)" }}>
                {insights.map((ins, i) => {
                  const cfg = INSIGHT_STYLE[ins.type] ?? INSIGHT_STYLE.neutral;
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 px-4 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <Icon size={11} style={{ color: cfg.color }} />
                      </span>
                      <p className="text-[14px] text-slate-300 leading-relaxed">{ins.message}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Account Information */}
        <div>
          <SectionHeader icon={Briefcase} label="Account Information" color="#4F5B75" />
          <div className="rounded-2xl border p-4"
            style={{ borderColor: "rgba(20,32,61,0.07)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
            <div className="flex flex-col gap-2.5">
              {[
                { label: "Email",      value: user.email },
                { label: "Role",       value: user.role },
                { label: "Department", value: user.department ?? "Not assigned" },
                { label: "Status",     value: user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : "Active" },
                { label: "Org ID",     value: user.orgId ?? "—" },
                { label: "Member Since", value: user.joinedAt ? new Date(user.joinedAt).toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : "—" },
              ].map((f) => (
                <div key={f.label} className="flex items-start justify-between gap-2 py-1.5 border-b" style={{ borderColor: "rgba(20,32,61,0.04)" }}>
                  <span className="text-[14px] font-bold uppercase tracking-wider text-slate-600 shrink-0">{f.label}</span>
                  <span className="text-[14px] text-slate-300 text-right truncate">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


