import { useEffect, useState } from "react";
import { useNavigate, Link }   from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, Clock, AlertTriangle, Users, ChevronRight, Bell, CheckCircle2, Circle, AlertCircle, TrendingUp, Shield, GitBranch, Activity, FolderKanban } from "lucide-react";
import api from "@/lib/api";
import useAuthStore          from "@/stores/authStore";
import useNotificationStore  from "@/stores/notificationStore";

import TallyLoader from "@/components/ui/TallyLoader";
const TEAL = "#08695F";

const STATUS_CFG = {
  Active:       { color: "#08695F",      label: "Active"      },
  Planning:     { color: "#1948BD", label: "Planning"    },
  "In Progress":{ color: "#1948BD", label: "In Progress" },
  Completed:    { color: "#0E6A30", label: "Completed"   },
  Delayed:      { color: "#B01F17", label: "Delayed"     },
  "On Hold":    { color: "#3A4660", label: "On Hold"     },
  "In Review":  { color: "#1948BD", label: "In Review"   },
  Scheduled:    { color: "#7A5200", label: "Scheduled"   },
};

function statusCfg(s) { return STATUS_CFG[s] ?? { color: "#3A4660", label: s }; }

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

function ProgressBar({ value = 0, color = TEAL }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full rounded-full bg-ink/[0.06] overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color, boxShadow: "var(--shadow-1)" }}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex items-center gap-4 p-4 rounded-2xl border"
      style={{
        background:  "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)",
        borderColor: "rgba(20,32,61,0.06)",
      }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}
      >
        <Icon size={20} strokeWidth={1.75} style={{ color }} />
      </span>
      <div>
        <p className="text-2xl font-black tabular-nums" style={{ color }}>{value ?? "—"}</p>
        <p className="text-[14px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
        {sub && <p className="text-[14px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function AlertRow({ icon: Icon, color, text }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}
      >
        <Icon size={13} strokeWidth={2} style={{ color }} />
      </span>
      <p className="text-xs text-slate-400 leading-snug">{text}</p>
    </div>
  );
}

function timeAgo(date) {
  if (!date) return "";
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)  return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SEVERITY_COLOR = {
  Critical: "#B01F17",
  High:     "#9A3A06",
  Medium:   "#7A5200",
  Low:      "#1948BD",
};

const ALERT_TYPE_ICON = {
  overdue_task:      AlertTriangle,
  review_stalled:    Clock,
  unassigned_tasks:  Circle,
  delayed_milestone: GitBranch,
  overloaded_member: Users,
  burnout_risk:      Shield,
};

function SmartAlertChip({ alert }) {
  const color = SEVERITY_COLOR[alert.severity] ?? "#3A4660";
  const Icon  = ALERT_TYPE_ICON[alert.type] ?? AlertCircle;
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
      style={{ background: `${color}06`, borderColor: `${color}20` }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}
      >
        <Icon size={12} strokeWidth={2} style={{ color }} />
      </span>
      <p className="flex-1 text-xs text-slate-300 leading-snug">{alert.message}</p>
      <span
        className="text-[14px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
        style={{ color, background: `${color}15` }}
      >
        {alert.severity}
      </span>
    </div>
  );
}

function SmartAlertsPanel({ alerts, loading }) {
  const [collapsed, setCollapsed] = useState(false);

  if (loading) return null;
  if (!alerts.length) return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-5 py-3 rounded-2xl border"
      style={{ background: "rgba(18,128,59,0.05)", borderColor: "rgba(18,128,59,0.18)" }}
    >
      <CheckCircle2 size={14} style={{ color: "#0E6A30" }} />
      <p className="text-xs text-emerald-400 font-semibold">No active alerts — everything looks healthy!</p>
    </motion.div>
  );

  const criticalCount = alerts.filter((a) => a.severity === "Critical").length;
  

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: criticalCount ? "rgba(209,41,31,0.25)" : "rgba(232,89,12,0.18)" }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-3.5"
        style={{ background: criticalCount ? "rgba(209,41,31,0.06)" : "rgba(232,89,12,0.05)" }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={14} style={{ color: criticalCount ? "#B01F17" : "#9A3A06" }} />
          <span className="text-sm font-black text-text-primary">Smart Alerts</span>
          <span
            className="text-[14px] font-black px-2 py-0.5 rounded-full"
            style={{
              background: criticalCount ? "rgba(209,41,31,0.12)" : "rgba(232,89,12,0.10)",
              color:      criticalCount ? "#B01F17"               : "#9A3A06",
            }}
          >
            {alerts.length} alert{alerts.length === 1 ? "" : "s"}
          </span>
          {criticalCount > 0 && (
            <span className="text-[14px] font-bold text-red-400">{criticalCount} critical</span>
          )}
        </div>
        <ChevronRight
          size={13}
          className="text-slate-600 transition-transform duration-200"
          style={{ transform: collapsed ? "none" : "rotate(90deg)" }}
        />
      </button>

      {/* Alerts list */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 space-y-2 max-h-80 overflow-y-auto">
              {alerts.slice(0, 10).map((a, i) => (
                <SmartAlertChip key={i} alert={a} />
              ))}
              {alerts.length > 10 && (
                <p className="text-[14px] text-slate-600 text-center pt-1">
                  +{alerts.length - 10} more alerts — <Link to="/teamlead/team" className="underline" style={{ color: "#08695F" }}>view team</Link>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function TeamLeadDashboardPage() {
  const user     = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount   = useNotificationStore((s) => s.unreadCount);

  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [smartAlerts,  setSmartAlerts]  = useState([]);
  const [alertLoading, setAlertLoading] = useState(true);

  useEffect(() => {
    api.get("/api/teamlead/dashboard")
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    api.get("/api/teamlead/alerts")
      .then((d) => setSmartAlerts(d.alerts ?? []))
      .catch(() => setSmartAlerts([]))
      .finally(() => setAlertLoading(false));
  }, []);

  const projects    = data?.projectSummaries ?? [];
  const tasks       = data?.tasks            ?? {};
  
  const alerts      = data?.alerts           ?? {};
  const overdue     = data?.overdueTasks     ?? [];
  const hasAlerts   = alerts.overdueCount > 0 || alerts.delayedMilestones > 0 || alerts.unassignedTasks > 0;
  const notifPreview = notifications.slice(0, 5);

  return (
    <div className="px-4 sm:px-8 py-8 min-h-full max-w-[1200px] mx-auto flex flex-col gap-8">

      {/* ── Welcome Hero ─────────────────────────────────────────────────────── */}
      <motion.div
        initial="hidden" animate="show" variants={stagger}
        className="relative overflow-hidden rounded-3xl p-7 border"
        style={{
          background:  "linear-gradient(135deg, #F5F6FA 0%, #EAEDF4 40%, #F5F6FA 100%)",
          borderColor: `${TEAL}22`,
          boxShadow:   "var(--shadow-1)",
        }}
      >
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl pointer-events-none" style={{ background: `${TEAL}15` }} />
        <motion.div variants={fadeUp}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "#08695F" }}>Team Lead Portal</p>
          <h1 className="text-4xl font-black text-text-primary mb-1">{user?.name ?? "Team Lead"}</h1>
          <div className="flex items-center gap-3 flex-wrap mt-3">
            <span
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[14px] font-bold uppercase tracking-wider"
              style={{ background: `${TEAL}18`, border: `1px solid ${TEAL}35`, color: "#138674" }}
            >
              <Users size={10} strokeWidth={2.5} />
              Team Lead
            </span>
            {user?.orgName && <span className="text-xs text-slate-600 font-medium">{user.orgName}</span>}
            {/* One count everywhere: the Smart Alerts list (/api/teamlead/alerts). */}
            {smartAlerts.length > 0 && (
              <span
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[14px] font-bold"
                style={{ background: "rgba(209,41,31,0.10)", border: "1px solid rgba(209,41,31,0.25)", color: "#B01F17" }}
              >
                <AlertTriangle size={10} strokeWidth={2.5} />
                {smartAlerts.length} alert{smartAlerts.length === 1 ? "" : "s"}
              </span>
            )}
            {unreadCount > 0 && (
              <button
                onClick={() => navigate("/teamlead/notifications")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[14px] font-bold transition-colors"
                style={{ background: "rgb(var(--c-accent) / 0.10)", border: "1px solid rgb(var(--c-accent) / 0.25)", color: "var(--accent-text)" }}
              >
                <Bell size={10} strokeWidth={2.5} />
                {unreadCount} unread
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Loading ───────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <TallyLoader />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Stat cards ───────────────────────────────────────────────────── */}
          <motion.div initial="hidden" animate="show" variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={CheckSquare}   label="Total Tasks"      value={tasks.total}       color={TEAL}      />
            <StatCard icon={Activity}      label="In Progress"      value={tasks.inProgress}  color="#1948BD"   />
            <StatCard icon={Clock}         label="In Review"        value={tasks.inReview}    color="#1948BD"   />
            <StatCard icon={AlertTriangle} label="Overdue"          value={tasks.overdue}     color="#B01F17"
              sub={tasks.overdue > 0 ? "needs attention" : "all on track"} />
          </motion.div>

          {/* ── Smart Alerts Panel ───────────────────────────────────────────── */}
          <SmartAlertsPanel alerts={smartAlerts} loading={alertLoading} />

          {/* ── Main 3-col grid ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Active Projects 2/3 ─────────────────────────────────────── */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h2 className="text-base font-black text-text-primary">Active Projects</h2>
                  <p className="text-[14px] text-slate-600">Projects you are assigned to</p>
                </div>
                <Link to="/teamlead/projects" className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#08695F" }}>
                  View all <ChevronRight size={13} strokeWidth={2.5} />
                </Link>
              </div>

              {projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 rounded-2xl border-2 border-dashed" style={{ borderColor: `${TEAL}18` }}>
                  <FolderKanban size={28} className="text-slate-700 mb-2" strokeWidth={1.2} />
                  <p className="text-sm text-slate-600 font-medium">No projects assigned yet</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {projects.slice(0, 5).map((p, i) => {
                    const cfg = statusCfg(p.status);
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.05 }}
                      >
                        <Link
                          to={`/teamlead/projects/${p.id}`}
                          className="block p-4 rounded-2xl border transition-all duration-150 hover:border-ink/[0.15] hover:bg-ink/[0.025] group"
                          style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.06)" }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-text-primary truncate group-hover:text-[#138674] transition-colors">{p.title}</h3>
                              {p.activeMilestone && (
                                <p className="text-[14px] text-slate-500 mt-0.5 truncate">
                                  Milestone: {p.activeMilestone.title}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[14px] font-bold"
                                style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`, color: cfg.color }}
                              >
                                {cfg.label}
                              </span>
                            </div>
                          </div>

                          {p.activeMilestone && (
                            <div className="mb-2">
                              <ProgressBar value={p.activeMilestone.progress ?? 0} color={cfg.color} />
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-[14px] text-slate-600">
                            <span className="flex items-center gap-1"><Users size={10} strokeWidth={2} /> {p.memberCount} members</span>
                            <span className="flex items-center gap-1"><TrendingUp size={10} strokeWidth={2} /> {p.milestoneCount} milestones</span>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* ── Right column ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-5">

              {/* Alerts */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.12 }}
                className="rounded-2xl border p-5"
                style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.06)" }}
              >
                <h2 className="text-sm font-black text-text-primary mb-3">Alerts</h2>
                {!hasAlerts ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <CheckCircle2 size={20} style={{ color: "#0E6A30" }} strokeWidth={1.5} />
                    <p className="text-xs text-slate-600">Everything looks good!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-ink/[0.04]">
                    {(alerts.overdueCount ?? 0) > 0 && (
                      <AlertRow icon={AlertTriangle} color="#B01F17"
                        text={`${alerts.overdueCount} overdue task${alerts.overdueCount > 1 ? "s" : ""} need attention`} />
                    )}
                    {(alerts.delayedMilestones ?? 0) > 0 && (
                      <AlertRow icon={Clock} color="#7A5200"
                        text={`${alerts.delayedMilestones} milestone${alerts.delayedMilestones > 1 ? "s" : ""} are delayed`} />
                    )}
                    {(alerts.unassignedTasks ?? 0) > 0 && (
                      <AlertRow icon={Circle} color="#3A4660"
                        text={`${alerts.unassignedTasks} task${alerts.unassignedTasks > 1 ? "s" : ""} without assignee`} />
                    )}
                  </div>
                )}
              </motion.div>

              {/* Task summary */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.18 }}
                className="rounded-2xl border p-5"
                style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.06)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black text-text-primary">Task Activity</h2>
                  <Link to="/teamlead/tasks" className="text-[14px] font-semibold" style={{ color: "#08695F" }}>View all →</Link>
                </div>
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: "Total",       value: tasks.total,      color: "#08695F"       },
                    { label: "In Progress", value: tasks.inProgress, color: "#1948BD"  },
                    { label: "In Review",   value: tasks.inReview,   color: "#1948BD"  },
                    { label: "Completed",   value: tasks.done,       color: "#0E6A30"  },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                        <span className="text-xs text-slate-500 font-medium">{label}</span>
                      </div>
                      <span className="text-sm font-black tabular-nums" style={{ color }}>{value ?? 0}</span>
                    </div>
                  ))}
                </div>
                {(tasks.total ?? 0) > 0 && (
                  <div className="mt-4">
                    <ProgressBar value={Math.round(((tasks.done ?? 0) / tasks.total) * 100)} color="#0E6A30" />
                    <p className="text-[14px] text-slate-600 mt-1.5 text-right">
                      {Math.round(((tasks.done ?? 0) / tasks.total) * 100)}% completion rate
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Notifications preview */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.24 }}
                className="rounded-2xl border p-5"
                style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.06)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-accent-on">Notifications</h2>
                    {unreadCount > 0 && (
                      <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[14px] font-black" style={{ background: TEAL, color: "var(--on-accent)" }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <Link to="/teamlead/notifications" className="text-[14px] font-semibold" style={{ color: "#08695F" }}>View all →</Link>
                </div>
                {notifPreview.length === 0 ? (
                  <div className="flex flex-col items-center gap-1 py-6">
                    <Bell size={20} className="text-slate-700" strokeWidth={1.2} />
                    <p className="text-xs text-slate-600">No notifications</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {notifPreview.map((n) => (
                      <button
                        key={n._id}
                        onClick={() => navigate("/teamlead/notifications")}
                        className="flex items-start gap-2.5 text-left rounded-lg px-2 py-2 transition-colors hover:bg-ink/[0.04]"
                      >
                        <span className="h-1.5 w-1.5 rounded-full mt-2 shrink-0" style={{ background: n.read ? "#6D7B99" : TEAL }} />
                        <div className="flex-1 min-w-0">
                          <p className={["text-[14px] font-bold leading-tight truncate", !n.read ? "text-text-primary" : "text-slate-500"].join(" ")}>
                            {n.title || n.type}
                          </p>
                          <p className="text-[14px] text-slate-600 mt-0.5 truncate">{n.message}</p>
                        </div>
                        <span className="text-[14px] text-slate-700 shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* ── Overdue tasks list ────────────────────────────────────────────── */}
          {overdue.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.28 }}
              className="rounded-2xl border p-5"
              style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(209,41,31,0.15)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={14} style={{ color: "#B01F17" }} strokeWidth={2} />
                <h2 className="text-sm font-black text-text-primary">Overdue Tasks</h2>
              </div>
              <div className="flex flex-col gap-2">
                {overdue.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-xl border"
                    style={{ borderColor: "rgba(209,41,31,0.12)", background: "rgba(209,41,31,0.04)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{t.title}</p>
                      {t.assignee && (
                        <p className="text-[14px] text-slate-500 mt-0.5">Assigned to {t.assignee.name} · {t.assignee.role}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[14px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(209,41,31,0.15)", color: "#B01F17" }}>
                        {t.daysOver}d overdue
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
