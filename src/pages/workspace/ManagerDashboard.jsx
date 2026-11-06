// ── ManagerDashboard.jsx — Project-centric Command Center ─────────────────────
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  FolderKanban, Users, Zap, Shield,
  Activity, Clock, CheckCircle2, RefreshCw, Plus,
  ChevronRight, Circle, Flame,
} from "lucide-react";
import api from "@/lib/api";
import useAuthStore from "@/stores/authStore";
import { useRoleTheme } from "@/utils/roleTheme";
import OrgCodeBadge from "@/components/ui/OrgCodeBadge";
import { avatarUrl } from "@/lib/avatar";

// ── Config ─────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  Planning:    { color: "#4F5B75" },
  Scheduled:   { color: "#1948BD" },
  Active:      { color: "#0E6A30" },
  "In Review": { color: "#1948BD" },
  Delayed:     { color: "#9A3A06" },
  "On Hold":   { color: "#7A5200" },
  Completed:   { color: "var(--accent-text)" },
  Archived:    { color: "#374151" },
};

const RISK_CFG = {
  Low:      { color: "#0E6A30" },
  Medium:   { color: "#7A5200" },
  High:     { color: "#9A3A06" },
  Critical: { color: "#B01F17" },
};

const AVAIL_CFG = {
  Available:  { color: "#0E6A30", bg: "rgba(18,128,59,0.10)" },
  Busy:       { color: "#7A5200", bg: "rgba(255,194,26,0.10)"  },
  Overloaded: { color: "#B01F17", bg: "rgba(209,41,31,0.10)"  },
};

const ACTION_CFG = {
  project_created:        { icon: FolderKanban, color: "#0E6A30" },
  project_updated:        { icon: Activity,     color: "#1948BD" },
  project_status_changed: { icon: Activity,     color: "#1948BD" },
  project_xp_updated:     { icon: Zap,          color: "#7A5200" },
  role_change:            { icon: Users,        color: "#9A3A06" },
  account_status_change:  { icon: Users,        color: "#B01F17" },
  account_deleted:        { icon: Users,        color: "#B01F17" },
  employee_created:       { icon: Users,        color: "#0E6A30" },
  DIRECTOR_SETUP:         { icon: Shield,       color: "#1948BD" },
  ORG_CREATED:            { icon: FolderKanban, color: "#0E6A30" },
  GAMIFICATION_RESET:     { icon: Zap,          color: "#B01F17" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function daysFromNow(date) {
  if (!date) return null;
  return Math.ceil((new Date(date) - Date.now()) / 86_400_000);
}

function relativeTime(date) {
  if (!date) return "";
  const diff  = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function utilColor(pct) {
  if (pct >= 86) return "#B01F17";
  if (pct >= 61) return "#9A3A06";
  if (pct >= 31) return "#1948BD";
  return "#0E6A30";
}

function burnoutColor(r) {
  if (r >= 70) return "#B01F17";
  if (r >= 40) return "#9A3A06";
  return "#0E6A30";
}

// ── Animated progress bar ──────────────────────────────────────────────────────
function Bar({ pct, color, height = 5 }) {
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ background: "rgba(20,32,61,0.06)", height }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{ background: color, height: "100%", borderRadius: 9999 }}
      />
    </div>
  );
}

// ── KPI chip ──────────────────────────────────────────────────────────────────
function KpiChip({ label, value, color, icon: Icon, to }) {
  const inner = (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border h-full"
      style={{ background: `${color}0a`, borderColor: `${color}25` }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18` }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-black leading-none" style={{ color }}>{value}</p>
        <p className="text-[14px] text-slate-500 mt-0.5 uppercase tracking-wider font-bold">{label}</p>
      </div>
    </div>
  );
  if (to) {
    return (
      <Link to={to} className="flex-1 hover:scale-[1.02] transition-transform duration-200 block">
        {inner}
      </Link>
    );
  }
  return <div className="flex-1">{inner}</div>;
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHead({ icon: Icon, title, accent, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}18` }}
        >
          <Icon size={13} style={{ color: accent }} />
        </div>
        <h2 className="text-sm font-black text-text-primary">{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({ project, accent }) {
  const navigate    = useNavigate();
  const statusColor = (STATUS_CFG[project.status] ?? STATUS_CFG.Planning).color;
  const riskColor   = (RISK_CFG[project.riskLevel] ?? RISK_CFG.Low).color;
  const days        = daysFromNow(project.deadline);
  const isOverdue   = days !== null && days < 0 && !["Completed", "Archived"].includes(project.status);
  const isCritical  = project.riskLevel === "Critical" && isOverdue;
  const msTotal     = project.milestones?.total ?? 0;
  const msCompleted = project.milestones?.completed ?? 0;
  const msProgress  = msTotal > 0 ? Math.round((msCompleted / msTotal) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      onClick={() => navigate(`/workspace/projects/${project.id}`)}
      className="cursor-pointer rounded-2xl border overflow-hidden flex flex-col"
      style={{
        background:  "rgba(255,255,255,0.85)",
        borderColor: isCritical ? "rgba(209,41,31,0.40)" : "rgba(20,32,61,0.07)",
        boxShadow:   isCritical ? "0 0 24px rgba(209,41,31,0.12)" : "none",
      }}
    >
      {/* Status stripe */}
      <div className="h-0.5 w-full" style={{ background: statusColor }} />

      {/* Card header */}
      <div className="px-4 pt-3 pb-2.5 border-b border-ink/[0.05]">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-black text-text-primary truncate leading-snug">{project.title}</p>
            {project.clientName && (
              <p className="text-[14px] text-slate-600 truncate">{project.clientName}</p>
            )}
          </div>
          {/* Risk dot — blinks when critical+overdue */}
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
            style={{
              background: riskColor,
              boxShadow:  "var(--shadow-1)",
              animation:  isCritical ? "blink 1.2s ease-in-out infinite" : "none",
            }}
          />
        </div>
        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-[14px] font-black px-1.5 py-0.5 rounded-full"
            style={{ color: statusColor, background: `${statusColor}18` }}
          >
            {project.status}
          </span>
          <span className="text-[14px] font-bold px-1.5 py-0.5 rounded-full text-slate-500 bg-ink/[0.04]">
            {project.category}
          </span>
          {project.priority && (
            <span
              className="text-[14px] font-black px-1.5 py-0.5 rounded-full"
              style={{
                color:      (RISK_CFG[project.priority] ?? RISK_CFG.Low).color,
                background: `${(RISK_CFG[project.priority] ?? RISK_CFG.Low).color}12`,
              }}
            >
              {project.priority}
            </span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-3 flex flex-col gap-2.5 flex-1">
        {/* Task progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[14px] text-slate-500">Tasks</span>
            <span className="text-[14px] font-black text-text-primary">{project.completion ?? 0}%</span>
          </div>
          <Bar pct={project.completion ?? 0} color={statusColor} height={5} />
        </div>

        {/* Milestone progress */}
        {msTotal > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[14px] text-slate-500">Milestones</span>
              <span className="text-[14px] font-bold text-slate-400">{msCompleted}/{msTotal}</span>
            </div>
            <Bar pct={msProgress} color={accent} height={4} />
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-1.5">
            <Users size={11} className="text-slate-600" />
            <span className="text-[14px] text-slate-400 font-bold">{(project.members ?? []).length}</span>
          </div>
          {days !== null && (
            <span
              className="text-[14px] font-bold"
              style={{ color: isOverdue ? "#B01F17" : days <= 7 ? "#7A5200" : "#4F5B75" }}
            >
              {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
            </span>
          )}
          {project.healthScore !== undefined && (
            <span
              className="text-[14px] font-black px-1.5 py-0.5 rounded-full"
              style={{
                color:
                  project.healthScore >= 70 ? "#0E6A30"
                  : project.healthScore >= 40 ? "#7A5200"
                  : "#B01F17",
                background:
                  project.healthScore >= 70 ? "rgba(18,128,59,0.12)"
                  : project.healthScore >= 40 ? "rgba(255,194,26,0.12)"
                  : "rgba(209,41,31,0.12)",
              }}
            >
              {project.healthScore} · {project.healthBand ?? "health"}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Workforce node ────────────────────────────────────────────────────────────
function WorkforceNode({ member }) {
  const [expanded, setExpanded] = useState(false);
  const av   = AVAIL_CFG[member.availability] ?? AVAIL_CFG.Available;
  const util = member.utilization ?? 0;
  const uc   = utilColor(util);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background:  "rgba(20,32,61,0.02)",
        borderColor: member.availability === "Overloaded"
          ? "rgba(209,41,31,0.22)"
          : "rgba(20,32,61,0.06)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-3 w-full px-3 py-2.5 text-left"
      >
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-ink/10">
            <img
              src={avatarUrl("bottts", member.avatarSeed ?? member.name)}
              alt={member.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#FFFFFF]"
            style={{ background: av.color }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-text-primary truncate">{member.name}</p>
          <p className="text-[14px] text-slate-500 truncate">{member.role}</p>
        </div>

        <div className="shrink-0 w-16">
          <span className="text-[14px] font-bold block mb-1" style={{ color: uc }}>{util}%</span>
          <Bar pct={util} color={uc} height={4} />
        </div>

        <span
          className="text-[14px] font-black px-1.5 py-0.5 rounded-full shrink-0"
          style={{ color: av.color, background: av.bg }}
        >
          {member.availability}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-ink/[0.05]"
          >
            <div className="px-3 py-2.5 flex flex-col gap-2.5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 text-center">
                {[
                  { label: "Active",  value: member.tasks?.inProgress ?? 0,         color: "#1948BD" },
                  { label: "Overdue", value: member.tasks?.overdue ?? 0,             color: "#B01F17" },
                  { label: "Done",    value: member.tasks?.done ?? 0,                color: "#0E6A30" },
                  { label: "Burnout", value: `${member.burnoutRisk ?? 0}%`,          color: burnoutColor(member.burnoutRisk ?? 0) },
                ].map(({ label, value, color }) => (
                  <div key={label} className="py-1.5 rounded-lg bg-ink/[0.03]">
                    <p className="text-[14px] font-black" style={{ color }}>{value}</p>
                    <p className="text-[14px] text-slate-600">{label}</p>
                  </div>
                ))}
              </div>

              {(member.projects ?? []).length > 0 && (
                <div className="flex flex-col gap-1">
                  {(member.projects ?? []).slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 text-[14px] text-slate-400">
                      <Circle size={5} fill="currentColor" className="text-slate-600 shrink-0" />
                      <span className="truncate flex-1">{p.title}</span>
                      <span className="text-slate-600 shrink-0">{p.status}</span>
                    </div>
                  ))}
                  {(member.projects ?? []).length > 3 && (
                    <p className="text-[14px] text-slate-600">+{(member.projects ?? []).length - 3} more</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Risk item ─────────────────────────────────────────────────────────────────
function RiskItem({ label, sub, color, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-2.5 px-3 py-2 rounded-xl border text-left w-full transition-all hover:bg-ink/[0.03]"
      style={{ background: `${color}06`, borderColor: `${color}22` }}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
        style={{ background: color, boxShadow: "var(--shadow-1)" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-text-primary truncate">{label}</p>
        {sub && <p className="text-[14px] text-slate-500 mt-0.5 truncate">{sub}</p>}
      </div>
      <ChevronRight size={12} className="text-slate-600 shrink-0 mt-1" />
    </button>
  );
}

// ── Activity entry ────────────────────────────────────────────────────────────
function ActivityEntry({ entry }) {
  const cfg  = ACTION_CFG[entry.action] ?? { icon: Activity, color: "#4F5B75" };
  const Icon = cfg.icon;
  const label =
    entry.detail ??
    (entry.projectTitle ? `"${entry.projectTitle}"` : entry.action.replace(/_/g, " "));

  return (
    <div className="flex items-start gap-3">
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${cfg.color}15` }}
      >
        <Icon size={12} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0 border-b border-ink/[0.04] pb-3">
        <p className="text-[14px] text-slate-300 leading-relaxed line-clamp-2">{label}</p>
        <p className="text-[14px] text-slate-600 mt-0.5">{relativeTime(entry.createdAt)}</p>
      </div>
    </div>
  );
}

// ── Performer row ─────────────────────────────────────────────────────────────
function PerformerRow({ emp, rank }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-sm w-5 text-center shrink-0">
        {rank < 3
          ? medals[rank]
          : <span className="text-[14px] font-black text-slate-600">#{rank + 1}</span>}
      </span>
      <div className="w-7 h-7 rounded-xl overflow-hidden border border-ink/10 shrink-0">
        <img
          src={avatarUrl("bottts", emp.avatarSeed ?? emp.name)}
          alt={emp.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-text-primary truncate">{emp.name}</p>
        <Bar pct={emp.completionRate ?? 0} color="#7A5200" height={3} />
      </div>
      <div className="text-right shrink-0">
        <p className="text-[14px] font-black text-[#7A5200]">{emp.completionRate ?? 0}%</p>
        <p className="text-[14px] text-slate-600">done</p>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const theme    = useRoleTheme();
  const accent   = theme.accent;
  const user     = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [projects,    setProjects]    = useState([]);
  const [workforce,   setWorkforce]   = useState({ members: [], counts: {} });
  const [reports,     setReports]     = useState(null);
  const [overdue,     setOverdue]     = useState([]);
  const [activity,    setActivity]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    if (!loading) setRefreshing(true);
    try {
      const [projRes, wfRes, repRes, overdueRes, actRes] = await Promise.allSettled([
        api.get("/api/manager/projects"),
        api.get("/api/manager/workforce"),
        api.get("/api/manager/reports"),
        api.get("/api/manager/overdue-tasks"),
        api.get("/api/manager/activity-feed"),
      ]);
      if (projRes.status    === "fulfilled") setProjects(projRes.value    ?? []);
      if (wfRes.status      === "fulfilled") setWorkforce(wfRes.value     ?? { members: [], counts: {} });
      if (repRes.status     === "fulfilled") setReports(repRes.value);
      if (overdueRes.status === "fulfilled") setOverdue(overdueRes.value  ?? []);
      if (actRes.status     === "fulfilled") setActivity(actRes.value     ?? []);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const t = setInterval(fetchAll, 120_000);
    return () => clearInterval(t);
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: accent, borderTopColor: "transparent" }}
          />
          <p className="text-sm text-slate-500">Loading command center…</p>
        </div>
      </div>
    );
  }

  // Derived values
  const activeProjects = projects.filter((p) =>
    ["Active", "In Review", "Scheduled"].includes(p.status)
  ).length;

  const highRiskProjs = projects.filter(
    (p) =>
      ["High", "Critical"].includes(p.riskLevel) &&
      !["Completed", "Archived"].includes(p.status)
  );

  const delayedProjects = projects.filter((p) => {
    if (!p.deadline || ["Completed", "Archived"].includes(p.status)) return false;
    return daysFromNow(p.deadline) < 0;
  });

  const overloadedCount = workforce.counts?.overloaded ?? 0;
  const topPerformers   = reports?.employeeStats?.topPerformers ?? [];

  const sortedProjects = [...projects].sort((a, b) => {
    const s = (p) =>
      (["High", "Critical"].includes(p.riskLevel) ? 2 : 0) +
      (daysFromNow(p.deadline) < 0 ? 3 : 0);
    return s(b) - s(a);
  });

  return (
    <div className="flex flex-col gap-6 px-6 py-6 min-h-full">
      {/* Blinking animation for critical risk dots */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.25; }
        }
      `}</style>

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p
            className="text-[14px] font-bold uppercase tracking-widest mb-0.5"
            style={{ color: accent }}
          >
            Manager
          </p>
          <h1 className="text-2xl font-black text-text-primary">Command Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {user?.name} · Updated {relativeTime(lastRefresh)}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <OrgCodeBadge />
          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-ink/[0.08] text-xs font-bold text-slate-400 hover:text-text-primary hover:border-ink/20 transition-all disabled:opacity-40"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            to="/workspace/projects/create"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
              color:      "var(--on-accent)",
              boxShadow:  `0 4px 16px ${accent}40`,
            }}
          >
            <Plus size={13} /> New Project
          </Link>
        </div>
      </div>

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <KpiChip label="Active Projects"    value={activeProjects}        color={accent}  icon={FolderKanban} to="/workspace/projects"  />
        <KpiChip label="Overloaded Members" value={overloadedCount}       color="#B01F17" icon={Flame}        to="/workspace/workforce" />
        <KpiChip label="High Risk"          value={highRiskProjs.length}  color="#9A3A06" icon={Shield}       to="/workspace/reports"   />
        <KpiChip label="Overdue Tasks"      value={overdue.length}        color="#7A5200" icon={Clock}        />
      </div>

      {/* ── §1 Project Operations ─────────────────────────────────────────── */}
      <section>
        <SectionHead
          icon={FolderKanban}
          title="Project Operations"
          accent={accent}
          action={
            <Link
              to="/workspace/projects"
              className="text-[14px] text-slate-500 hover:text-text-primary flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight size={11} />
            </Link>
          }
        />
        {sortedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-ink/[0.07] bg-ink/[0.01]">
            <FolderKanban size={28} className="text-slate-700 mb-2" />
            <p className="text-sm text-slate-500">No projects yet</p>
            <Link
              to="/workspace/projects/create"
              className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors"
            >
              Create your first project →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {sortedProjects.slice(0, 12).map((p) => (
              <ProjectCard key={p.id} project={p} accent={accent} />
            ))}
          </div>
        )}
      </section>

      {/* ── §2 Workforce + §4 Risk ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* §2 Workforce Intelligence */}
        <div
          className="lg:col-span-3 rounded-2xl border border-ink/[0.08] p-4"
          style={{ background: "rgba(255,255,255,0.5)" }}
        >
          <SectionHead
            icon={Users}
            title="Workforce Intelligence"
            accent={accent}
            action={
              <div className="flex items-center gap-3 text-[14px] text-slate-500">
                <span><span style={{ color: "#0E6A30" }}>●</span> {workforce.counts?.available ?? 0} Available</span>
                <span><span style={{ color: "#7A5200" }}>●</span> {workforce.counts?.busy ?? 0} Busy</span>
                <span><span style={{ color: "#B01F17" }}>●</span> {overloadedCount} Overloaded</span>
              </div>
            }
          />
          {(workforce.members ?? []).length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8">No workforce data.</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto pr-1">
              {(workforce.members ?? []).map((m) => (
                <WorkforceNode key={m.id} member={m} />
              ))}
            </div>
          )}
        </div>

        {/* §4 Risk Intelligence */}
        <div
          className="lg:col-span-2 rounded-2xl border border-[#D1291F]/15 p-4 flex flex-col gap-4"
          style={{ background: "rgba(255,255,255,0.5)" }}
        >
          <SectionHead icon={Shield} title="Risk Intelligence" accent="#B01F17" />

          {/* High-risk projects */}
          <div>
            <p className="text-[14px] font-bold text-slate-500 uppercase tracking-wider mb-2">High Risk Projects</p>
            {highRiskProjs.length === 0 ? (
              <div className="flex items-center gap-2 py-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <p className="text-xs text-slate-500">No high-risk projects</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {highRiskProjs.slice(0, 4).map((p) => (
                  <RiskItem
                    key={p.id}
                    label={p.title}
                    sub={`${p.riskLevel} risk · ${p.status}`}
                    color={(RISK_CFG[p.riskLevel] ?? RISK_CFG.High).color}
                    onClick={() => navigate(`/workspace/projects/${p.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Overdue tasks */}
          <div>
            <p className="text-[14px] font-bold text-slate-500 uppercase tracking-wider mb-2">Overdue Tasks</p>
            {overdue.length === 0 ? (
              <div className="flex items-center gap-2 py-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <p className="text-xs text-slate-500">No overdue tasks</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {overdue.slice(0, 5).map((t) => (
                  <RiskItem
                    key={t.id}
                    label={t.title}
                    sub={`${t.daysOver}d overdue · ${t.assignees?.[0]?.name ?? "Unassigned"}`}
                    color="#B01F17"
                    onClick={() => {}}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Delayed projects */}
          {delayedProjects.length > 0 && (
            <div>
              <p className="text-[14px] font-bold text-slate-500 uppercase tracking-wider mb-2">Delayed Projects</p>
              <div className="flex flex-col gap-1.5">
                {delayedProjects.slice(0, 3).map((p) => (
                  <RiskItem
                    key={p.id}
                    label={p.title}
                    sub={`${Math.abs(daysFromNow(p.deadline))}d overdue`}
                    color="#9A3A06"
                    onClick={() => navigate(`/workspace/projects/${p.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── §3 XP Snapshot + §5 Activity Feed ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* §3 XP & Performance */}
        <div
          className="lg:col-span-2 rounded-2xl border border-ink/[0.08] p-4"
          style={{ background: "rgba(255,255,255,0.5)" }}
        >
          <SectionHead icon={Zap} title="XP & Performance" accent="#7A5200" />
          {topPerformers.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-6">No XP data yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topPerformers.map((emp, i) => (
                <PerformerRow key={emp.id} emp={emp} rank={i} />
              ))}
            </div>
          )}
          {/* Org summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 pt-3 border-t border-ink/[0.06]">
            <div className="text-center">
              <p className="text-base font-black text-[#7A5200]">
                {reports?.employeeStats?.total ?? 0}
              </p>
              <p className="text-[14px] text-slate-600">Employees</p>
            </div>
            <div className="text-center">
              <p className="text-base font-black text-[#0E6A30]">
                {reports?.employeeStats?.avgCompletion ?? 0}%
              </p>
              <p className="text-[14px] text-slate-600">Avg Done</p>
            </div>
            <div className="text-center">
              <p className="text-base font-black text-[#B01F17]">
                {reports?.projectStats?.delayed ?? 0}
              </p>
              <p className="text-[14px] text-slate-600">Delayed</p>
            </div>
          </div>
        </div>

        {/* §5 Activity Feed */}
        <div
          className="lg:col-span-3 rounded-2xl border border-ink/[0.08] p-4"
          style={{ background: "rgba(255,255,255,0.5)" }}
        >
          <SectionHead
            icon={Activity}
            title="Activity Feed"
            accent={accent}
            action={<span className="text-[14px] text-slate-600">Live audit stream</span>}
          />
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Activity size={22} className="text-slate-700" />
              <p className="text-sm text-slate-500">No activity recorded yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0 max-h-[360px] overflow-y-auto pr-1">
              {activity.map((entry) => (
                <ActivityEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
