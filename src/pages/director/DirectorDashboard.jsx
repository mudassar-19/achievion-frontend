import { useEffect, useState, useCallback } from "react";
import { DIRECTOR_FEATURES as DF } from "@/lib/directorFeatures";
import { motion } from "framer-motion";
import {
  FolderKanban, ClipboardCheck, BarChart3, AlertTriangle,
  CheckCircle2, Activity, History, Users, MessageSquare, Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import usePerfLog from "@/hooks/usePerfLog";
import { useRoleTheme } from "@/utils/roleTheme";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import OrgCodeBadge from "@/components/ui/OrgCodeBadge";
import PageHeader from "@/components/ui/PageHeader";
import OrgGarden from "@/components/director/OrgGarden";
import Widget from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 85) return "#0E6A30";
  if (s >= 70) return "var(--accent-text)";
  return "#7A5200";
}

const AUDIT_LABELS = {
  role_change:              "Role changed",
  account_status_change:    "Status updated",
  account_deleted:          "Account removed",
  employee_created:         "Member joined",
  DIRECTOR_SETUP:           "Director setup",
  DIRECTOR_CREATED:         "Director added",
  ORG_CREATED:              "Organisation created",
  workspace_updated:        "Workspace settings updated",
  settings_updated:         "Settings updated",
  GAMIFICATION_RESET:       "Scoring rules reset",
  gamificationRules:        "Scoring rules updated",
  project_created:          "Project created",
  project_updated:          "Project updated",
  project_xp_updated:       "XP pool adjusted",
  project_status_changed:   "Project status changed",
  project_frozen:           "Project frozen",
  project_unfrozen:         "Project unfrozen",
  portfolio_view_saved:     "Portfolio view saved",
  portfolio_view_updated:   "Portfolio view updated",
  portfolio_view_deleted:   "Portfolio view deleted",
};

function humanAudit(action) {
  return AUDIT_LABELS[action]
    ?? String(action ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60)    return `${secs}s ago`;
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}


// ── Org Snapshot (widget 1) ───────────────────────────────────────────────────
function OrgSnapshot({ data, loading, theme }) {
  if (loading) return <Widget title="Org Snapshot" icon={BarChart3} delay={0.05}><SkeletonCard className="m-4" /></Widget>;

  const quality = data?.avgAiScore;
  const stats = [
    {
      label: "Active Projects",
      value: data?.activeProjects ?? 0,
      icon: FolderKanban,
      color: theme.accent,
      link:  "/director/projects",
    },
    {
      label: "Pending Approvals",
      value: data?.pendingApprovals ?? 0,
      icon: ClipboardCheck,
      color: "#7A5200",
      link:  "/director/approvals",
    },
    {
      label: "Avg Quality Score",
      value: quality != null ? `${quality}%` : null,
      noDataLabel: "No data yet",
      icon: BarChart3,
      color: quality != null ? scoreColor(quality) : "#9DB0C2",
      link: null,
    },
  ];

  return (
    <Widget title="Org Snapshot" icon={BarChart3} iconColor={theme.accent} delay={0.05}>
      <div className="grid grid-cols-3 divide-x divide-ink/[0.05]">
        {stats.map((s) => <StatCard key={s.label} {...s} to={s.link} />)}
      </div>
    </Widget>
  );
}

// ── Needs Your Decision (widget 2) ───────────────────────────────────────────
function NeedsDecision({ actionApprovals, loading }) {
  if (loading) return <Widget title="Needs Your Decision" icon={ClipboardCheck} iconColor="#7A5200" delay={0.1}><SkeletonCard className="m-4" /></Widget>;

  const total = actionApprovals.length ?? 0;

  return (
    <Widget
      title="Needs Your Decision"
      icon={ClipboardCheck}
      iconColor="#7A5200"
      delay={0.1}
      action={{ to: "/director/approvals", label: "View all" }}
    >
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <CheckCircle2 size={24} className="text-[#0E6A30] mb-2" strokeWidth={1.5} />
          <p className="text-sm text-slate-500">No approvals waiting.</p>
          <p className="text-xs text-slate-400 mt-0.5">Requests will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-ink/[0.04]">
          <Link
            to="/director/approvals"
            className="flex items-center justify-between px-5 py-3 hover:bg-ink/[0.06] transition-colors"
          >
            <span className="text-xs font-semibold text-text-secondary">
              {total === 1 ? "1 account request" : `${total} account requests`}
            </span>
            <span className="text-[12px] font-bold" style={{ color: "var(--accent)" }}>Review →</span>
          </Link>
        </div>
      )}
    </Widget>
  );
}

// ── Team Well-being (widget 3 — aggregate only, no names) ────────────────────
function TeamWellbeing({ data, xpDist, loading }) {
  if (loading) return <Widget title="Team Well-being" icon={Activity} iconColor="#B01F17" delay={0.15}><SkeletonCard className="m-4" /></Widget>;

  const atRisk     = data?.burnoutRisk ?? 0;
  const totalMembers = xpDist.reduce((s, r) => {
    if (r.category === "Director") return s;
    return s + (r.memberCount ?? 0);
  }, 0);
  const healthy    = Math.max(0, totalMembers - atRisk);
  const pct        = totalMembers > 0 ? Math.round((atRisk / totalMembers) * 100) : 0;

  return (
    <Widget title="Team Well-being" icon={Activity} iconColor="#B01F17" delay={0.15} action={{ to: "/director/analytics", label: "Details" }}>
      <div className="px-5 py-5 flex flex-col gap-4">
        {totalMembers === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No team data yet.</p>
        ) : (
          <>
            {/* Risk bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-500">HP below threshold</span>
                <span className="text-xs font-black" style={{ color: atRisk > 0 ? "#B01F17" : "#0E6A30" }}>
                  {atRisk > 0 ? `${atRisk} at risk` : "All healthy"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "#12803B1A" }}>
                <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: pct > 0 ? "#D1291F" : "#12803B" }} />
              </div>
            </div>

            {/* Count pills */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(18,128,59,0.07)", border: "1px solid rgba(18,128,59,0.18)" }}>
                <p className="text-2xl font-black text-[#0E6A30]">{healthy}</p>
                <p className="text-[13px] font-semibold text-slate-500 mt-0.5">Healthy</p>
              </div>
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(209,41,31,0.07)", border: "1px solid rgba(209,41,31,0.18)" }}>
                <p className="text-2xl font-black text-[#B01F17]">{atRisk}</p>
                <p className="text-[13px] font-semibold text-slate-500 mt-0.5">At risk</p>
              </div>
            </div>
          </>
        )}
      </div>
    </Widget>
  );
}

// ── Team by Role (widget 4 — headcount only, no XP) ─────────────────────────
function TeamByRole({ xpDist, loading, theme }) {
  if (loading) return <Widget title="Team by Role" icon={Users} delay={0.2}><SkeletonCard className="m-4" /></Widget>;

  const rows = xpDist
    .filter((r) => r.category !== "Director")
    .sort((a, b) => b.memberCount - a.memberCount);
  const maxCount = rows[0]?.memberCount || 1;

  return (
    <Widget title="Team by Role" icon={Users} iconColor={theme.accent} delay={0.2} action={{ to: "/director/roles", label: "View roster" }}>
      {rows.length === 0 ? (
        <EmptyState
          pose="thinking"
          heading="No team members yet"
          body="Members will appear here once they join."
          className="py-8"
        />
      ) : (
        <div className="flex flex-col gap-3 px-5 py-5">
          {rows.map((r) => {
            const pct = Math.round((r.memberCount / maxCount) * 100);
            return (
              <div key={r.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-text-secondary">{r.category}</span>
                  <span className="text-[13px] font-black text-text-primary tabular-nums">{r.memberCount}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-ink/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: "var(--accent)" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Widget>
  );
}

// Counts working days between two dates using given workingDays (0=Sun…6=Sat array)
function workingDaysLeft(deadlineMs, nowMs, wdNums) {
  const wdSet = new Set(wdNums);
  let count = 0;
  const cur = new Date(nowMs);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(deadlineMs);
  end.setHours(23, 59, 59, 999);
  while (cur <= end) {
    if (wdSet.has(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// ── Dues widget (widget 5 — upcoming project deadlines) ──────────────────────
function DuesWidget({ duesData, loading }) {
  const [now] = useState(() => Date.now());
  if (loading) return <Widget title="Upcoming Deadlines" icon={Clock} delay={0.3}><SkeletonCard className="m-4" /></Widget>;

  const projects         = duesData?.projects ?? [];
  const hoursPerDay      = duesData?.workingHoursPerDay ?? 7;
  const workingDays      = duesData?.workingDays ?? [1, 2, 3, 4, 5];

  return (
    <Widget
      title="Upcoming Deadlines"
      icon={Clock}
      iconColor="#B01F17"
      delay={0.3}
      action={{ to: "/director/projects", label: "Portfolio" }}
    >
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <CheckCircle2 size={20} className="text-slate-300" strokeWidth={1.5} />
          <p className="text-sm text-slate-500">No upcoming deadlines.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-ink/[0.04]">
          {projects.map((p) => {
            const deadline  = p.deadline ? new Date(p.deadline) : null;
            const wdLeft    = deadline ? workingDaysLeft(deadline.getTime(), now, workingDays) : null;
            const hoursLeft = wdLeft != null ? wdLeft * hoursPerDay : null;
            const overdue   = deadline ? deadline.getTime() < now : false;
            const urgent    = !overdue && wdLeft != null && wdLeft <= 2;
            const label     = overdue
              ? "overdue"
              : hoursLeft != null && hoursLeft < hoursPerDay * 2
                ? `${hoursLeft}h`
                : wdLeft != null ? `${wdLeft}d` : "—";
            return (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-ink/[0.05] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-text-primary truncate">{p.title}</p>
                  {p.manager && <p className="text-[12px] text-slate-500 truncate">Manager: {p.manager}</p>}
                </div>
                {deadline && (
                  <span className={`shrink-0 text-[12px] font-bold tabular-nums whitespace-nowrap ${overdue ? "text-red-600" : urgent ? "text-amber-600" : "text-slate-500"}`}>
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Widget>
  );
}

// ── Audit Log snapshot (widget 6) ────────────────────────────────────────────
function AuditLogSnap({ auditLogs, loading, theme }) {
  if (loading) return <Widget title="Audit Log" icon={History} delay={0.25}><SkeletonCard className="m-4" /></Widget>;

  return (
    <Widget
      title="Audit Log"
      icon={History}
      iconColor={theme.accent}
      delay={0.25}
      action={{ to: "/director/audit-log", label: "View all" }}
    >
      {auditLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <History size={20} className="text-slate-300 mb-2" strokeWidth={1.5} />
          <p className="text-sm text-slate-500">No actions recorded yet.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-ink/[0.04]">
          {auditLogs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 px-5 py-3 hover:bg-ink/[0.05] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-text-primary truncate">{humanAudit(log.action)}</p>
                {log.targetName && <p className="text-[12px] text-slate-500 truncate">{log.targetName}</p>}
              </div>
              <span className="shrink-0 text-[12px] text-slate-400 tabular-nums whitespace-nowrap">
                {timeAgo(log.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DirectorDashboard() {
  const theme = useRoleTheme();
  const { log } = usePerfLog();

  const [data,            setData]            = useState(null);
  const [actionApprovals, setActionApprovals] = useState([]);
  const [auditLogs,       setAuditLogs]       = useState([]);
  const [xpDist,          setXpDist]          = useState([]);
  const [duesData,        setDuesData]        = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [dash, auditRes, xpRes, actionRes, duesRes] = await Promise.all([
        api.get("/api/director/dashboard"),
        api.get("/api/director/audit-log?limit=6"),
        api.get("/api/director/xp-distribution"),
        api.get("/api/approvals").catch(() => ({ approvals: [] })),
        api.get("/api/director/dues").catch(() => null),
      ]);
      setData(dash);
      setAuditLogs(auditRes.logs ?? []);
      setXpDist(Array.isArray(xpRes) ? xpRes : []);
      setActionApprovals(actionRes.approvals ?? []);
      setDuesData(duesRes);
    } catch (e) {
      setError(e.message ?? "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t0 = performance.now();
    load().finally(() => log("dashboard_load", performance.now() - t0, "/director"));
  }, [load, log]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle size={28} className="text-[#B01F17]" strokeWidth={1.5} />
        <p className="text-sm text-slate-600">{error}</p>
        <button
          onClick={load}
          className="h-9 px-5 rounded-xl border border-ink/10 text-sm font-semibold text-text-primary hover:bg-ink/[0.06] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1280px] mx-auto flex flex-col gap-7 min-h-full">

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <PageHeader title="Command Overview" subtitle="Org health at a glance">
          <OrgCodeBadge className="mt-1" />
        </PageHeader>
      </motion.div>

      {/* Widget 1: Org Snapshot */}
      <OrgSnapshot data={data} loading={loading} theme={theme} />

      {/* Garden: org growth visual */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="glass-panel rounded-2xl border border-ink/[0.07] px-5 py-4"
        >
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400 mb-3">Org Garden</p>
          <OrgGarden
            score={Math.max(0, 100 - (data.burnoutRisk ?? 0) * 10)}
            projects={duesData?.projects}
          />
        </motion.div>
      )}

      {/* Row 2: Approvals + Team Well-being */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <NeedsDecision
            actionApprovals={actionApprovals}
            loading={loading}
          />
        </div>
        <div className="lg:col-span-2">
          <TeamWellbeing data={data} xpDist={xpDist} loading={loading} />
        </div>
      </div>

      {/* Row 3: Team by Role + Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <TeamByRole xpDist={xpDist} loading={loading} theme={theme} />
        </div>
        <div className="lg:col-span-3">
          <AuditLogSnap auditLogs={auditLogs} loading={loading} theme={theme} />
        </div>
      </div>

      {/* Row 4: Dues / Upcoming Deadlines */}
      {DF.dues && <DuesWidget duesData={duesData} loading={loading} />}

      {/* Share Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3 }}
        className="rounded-2xl border border-ink/[0.07] bg-gradient-to-r from-[#EAEDF4] to-[#F5F7FB] px-5 py-4 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <MessageSquare size={16} strokeWidth={1.75} style={{ color: theme.accent }} />
          <div>
            <p className="text-sm font-bold text-text-primary">Share Team Feedback</p>
            <p className="text-xs text-slate-500">Complete the satisfaction survey to help measure success criteria.</p>
          </div>
        </div>
        <Link
          to="/survey"
          className="shrink-0 h-8 px-4 rounded-xl text-xs font-bold text-white transition-colors"
          style={{ background: theme.accent }}
        >
          Take Survey
        </Link>
      </motion.div>

    </div>
  );
}
