import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Star, CheckSquare,
  ClipboardList, TrendingUp, Clock, ArrowRight, Send, RotateCcw, Activity,
} from "lucide-react";
import { Link } from "react-router-dom";
import useAuthStore from "@/stores/authStore";
import useTaskStore from "@/stores/taskStore";
import useNotificationStore from "@/stores/notificationStore";
import { useRoleTheme } from "@/utils/roleTheme";
import GamificationSection from "@/components/widgets/GamificationSection";
import OrgCodeBadge from "@/components/ui/OrgCodeBadge";

const PRIORITY_COLOR = {
  Critical: "#B01F17",
  High:     "#9A3A06",
  Medium:   "#7A5200",
  Low:      "#4F5B75",
};

const STATUS_COLOR = {
  "To-Do":       "#4F5B75",
  "In-Progress": "#1948BD",
  "In-Review":   "#1948BD",
  "Done":        "#0E6A30",
};

const card = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08 } },
};

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SeniorDashboard() {
  const user  = useAuthStore((s) => s.user);
  const theme = useRoleTheme();

  const { tasks, loading, fetchTasks }                            = useTaskStore();
  const { notifications, fetch: fetchNotifs, loaded: notifsLoaded } = useNotificationStore();

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { if (!notifsLoaded) fetchNotifs(); }, [notifsLoaded, fetchNotifs]);

  // Derive submissions from live task data — tasks that have been submitted
  // (status In-Review, Done, or In-Progress with revisions)
  const submissions = tasks.filter((t) =>
    t.status === "In-Review" ||
    t.status === "Done" ||
    ((t.revisionCount ?? 0) > 0)
  );

  const recentActivity = notifications.slice(0, 5);

  const portalTitle = user?.role ? `${user.role} Portal` : "Senior Portal";

  const active  = tasks.filter((t) => t.status === "In-Progress");
  const inRev   = tasks.filter((t) => t.status === "In-Review");
  const done    = tasks.filter((t) => t.status === "Done");
  const todo    = tasks.filter((t) => t.status === "To-Do");
  const pctDone = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;

  const pendingSubs  = submissions.filter((s) => s.status === "In-Review");
  const reviseSubs   = submissions.filter((s) => s.status === "In-Progress" && s.revisionCount > 0);
  const approvedSubs = submissions.filter((s) => s.status === "Done");

  const stats = [
    { label: "To-Do",       value: todo.length,   icon: ClipboardList, color: "#4F5B75"   },
    { label: "In Progress", value: active.length,  icon: TrendingUp,    color: "#1948BD"   },
    { label: "In Review",   value: inRev.length,   icon: Send,          color: "#1948BD"   },
    { label: "Completed",   value: `${pctDone}%`,  icon: CheckSquare,   color: theme.text },
  ];

  const SUB_STATUS = {
    "In-Review":   { label: "Pending Review",    color: "#1948BD" },
    "Done":        { label: "Approved",           color: "#0E6A30" },
    "In-Progress": { label: "Revision Requested", color: "#9A3A06" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-6 p-6"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: theme.accentLight, border: `1px solid ${theme.border}` }}
          >
            <Star size={20} style={{ color: theme.text }} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-text-primary leading-none">
              {portalTitle}
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Welcome back, {user?.username ?? "there"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OrgCodeBadge />
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: theme.accentLight, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            {user?.role}
          </span>
        </div>
      </div>

      {/* ── Stat Strip ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {stats.map((s) => (
          <motion.div
            key={s.label}
            variants={card}
            className="rounded-2xl border bg-bg-elevated p-4 flex flex-col gap-2"
            style={{ borderColor: theme.border }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">{s.label}</span>
              <s.icon size={15} style={{ color: s.color }} />
            </div>
            <span className="text-2xl font-bold" style={{ color: s.color }}>
              {loading ? "—" : s.value}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Row 2: My Submissions + My Tasks grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* My Submissions Preview */}
        <motion.div
          variants={card}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          className="rounded-2xl border bg-bg-elevated p-5 flex flex-col gap-4"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send size={16} style={{ color: theme.text }} />
              <span className="text-sm font-semibold text-text-primary">My Submissions</span>
            </div>
            <Link to="/workspace/submissions" className="flex items-center gap-1 text-xs font-medium" style={{ color: theme.text }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { label: "Pending",  value: pendingSubs.length,  color: "#1948BD" },
              { label: "Revision", value: reviseSubs.length,   color: "#9A3A06" },
              { label: "Approved", value: approvedSubs.length, color: "#0E6A30" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border p-3 text-center" style={{ borderColor: theme.border }}>
                <p className="text-xl font-black" style={{ color }}>{loading ? "—" : value}</p>
                <p className="text-[14px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <p className="text-xs text-slate-600">Loading…</p>
          ) : submissions.length === 0 ? (
            <p className="text-xs text-slate-600 italic">No submissions yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {submissions.slice(0, 4).map((t) => {
                const sc = SUB_STATUS[t.status] ?? { label: t.status, color: "#3A4660" };
                return (
                  <li key={t._id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2" style={{ borderColor: theme.border }}>
                    <span className="text-xs font-medium text-text-primary truncate">{t.title}</span>
                    <span className="shrink-0 text-[14px] font-bold px-2 py-0.5 rounded" style={{ background: `${sc.color}20`, color: sc.color }}>{sc.label}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <Link to="/workspace/submissions" className="flex items-center gap-1 text-xs font-medium mt-auto" style={{ color: theme.text }}>
            <RotateCcw size={12} /> View revision history
          </Link>
        </motion.div>

        {/* My Tasks grid */}
        <motion.div
          variants={card}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.15 }}
          className="rounded-2xl border bg-bg-elevated p-5 flex flex-col gap-4"
          style={{ borderColor: theme.border }}
        >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} style={{ color: theme.text }} />
            <span className="text-sm font-semibold text-text-primary">My Tasks</span>
          </div>
          <Link
            to="/workspace/tasks"
            className="flex items-center gap-1 text-xs font-medium"
            style={{ color: theme.text }}
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <p className="text-xs text-text-secondary">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="text-xs text-text-secondary italic">No tasks assigned yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {tasks.slice(0, 6).map((t) => (
              <div
                key={t._id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                style={{
                  borderColor:     theme.border,
                  borderLeftWidth: 3,
                  borderLeftColor: STATUS_COLOR[t.status] ?? "#6D7B99",
                }}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-medium text-text-primary truncate">{t.title}</span>
                  {t.deadline && (
                    <span className="flex items-center gap-1 text-[14px] text-text-secondary">
                      <Clock size={9} />
                      {new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="rounded px-1.5 py-0.5 text-[14px] font-semibold"
                    style={{ background: `${PRIORITY_COLOR[t.priority]}22`, color: PRIORITY_COLOR[t.priority] ?? "#4F5B75" }}
                  >
                    {t.priority}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[14px] font-semibold"
                    style={{ background: `${STATUS_COLOR[t.status]}22`, color: STATUS_COLOR[t.status] ?? "#4F5B75" }}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
      </div>

      {/* ── Row 3: Recent Activity ── */}
      <motion.div
        variants={card}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.2 }}
        className="rounded-2xl border bg-bg-elevated p-5 flex flex-col gap-4"
        style={{ borderColor: theme.border }}
      >
        <div className="flex items-center gap-2">
          <Activity size={16} style={{ color: theme.text }} />
          <span className="text-sm font-semibold text-text-primary">Recent Activity</span>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-xs text-text-secondary italic">No recent activity yet.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {recentActivity.map((n) => (
              <li key={n._id} className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-text-primary leading-snug line-clamp-2">
                  {n.message ?? n.title ?? "Activity"}
                </span>
                <span className="text-[14px] text-text-secondary">{timeAgo(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* ── Gamification ── */}
      <GamificationSection scope="role" />
    </motion.div>
  );
}
