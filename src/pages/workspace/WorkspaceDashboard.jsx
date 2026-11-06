import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Zap, ClipboardList, CheckSquare, Clock, ArrowRight,
  TrendingUp, Star, Activity,
} from "lucide-react";
import { Link } from "react-router-dom";
import useAuthStore from "@/stores/authStore";
import useTaskStore from "@/stores/taskStore";
import useNotificationStore from "@/stores/notificationStore";
import { useRoleTheme } from "@/utils/roleTheme";
import GamificationSection from "@/components/widgets/GamificationSection";
import OrgCodeBadge from "@/components/ui/OrgCodeBadge";
import StartHereCard from "@/components/ui/StartHereCard";

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

export default function WorkspaceDashboard() {
  const user  = useAuthStore((s) => s.user);
  const theme = useRoleTheme();

  const { tasks, loading, fetchTasks }                       = useTaskStore();
  const { notifications, fetch: fetchNotifs, loaded: notifsLoaded } = useNotificationStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchTasks(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!notifsLoaded) fetchNotifs(); }, [notifsLoaded]);

  const recentActivity = notifications.slice(0, 6);

  const active  = tasks.filter((t) => t.status === "In-Progress");
  const todo    = tasks.filter((t) => t.status === "To-Do");
  const inRev   = tasks.filter((t) => t.status === "In-Review");
  const done    = tasks.filter((t) => t.status === "Done");
  const overdue = tasks.filter(
    (t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "Done"
  );
  const pctDone = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;

  const portalTitle = user?.role ? `${user.role} Portal` : "My Portal";

  const stats = [
    { label: "To-Do",       value: todo.length,    icon: ClipboardList, color: "#4F5B75"  },
    { label: "In Progress", value: active.length,  icon: Zap,           color: "#1948BD"  },
    { label: "In Review",   value: inRev.length,   icon: TrendingUp,    color: "#1948BD"  },
    { label: "Completed",   value: `${pctDone}%`,  icon: CheckSquare,   color: theme.text },
  ];

  const sprintTasks = [...active, ...todo].slice(0, 6);
  const [now] = useState(() => Date.now()); // fixed at mount

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
              Welcome back, {user?.username ?? "there"} — keep the streak alive!
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

      <StartHereCard
        storageKey={`workspace-${user?.id ?? "me"}`}
        steps={[
          { label: "Open your tasks", hint: "See what is assigned to you and start one.", to: "/workspace/tasks" },
          { label: "Submit your work", hint: "Open a task in progress and press Submit for review.", to: "/workspace/tasks" },
          { label: "Check your progress", hint: "XP, badges and your place on the leaderboard.", to: "/workspace/leaderboard" },
        ]}
      />

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

      {/* ── Row 2: Current Sprint + Daily Tip ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* My Active Tasks (2/3 width) */}
        <motion.div
          variants={card}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.1 }}
          className="md:col-span-2 rounded-2xl border bg-bg-elevated p-5 flex flex-col gap-4"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} style={{ color: theme.text }} />
              <span className="text-sm font-semibold text-text-primary">My Active Tasks</span>
            </div>
            <Link
              to="/workspace/tasks"
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: theme.text }}
            >
              All tasks <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <p className="text-xs text-text-secondary">Loading…</p>
          ) : sprintTasks.length === 0 ? (
            <p className="text-xs text-text-secondary italic">No active tasks — check the task board for new assignments.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sprintTasks.map((t) => (
                <li
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
                        Due {new Date(t.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
                </li>
              ))}
            </ul>
          )}

          {/* Progress bar */}
          {!loading && tasks.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-auto">
              <div className="flex justify-between text-[14px] text-text-secondary">
                <span>Completion rate</span>
                <span style={{ color: theme.text }}>{pctDone}% done</span>
              </div>
              <div className="h-1.5 rounded-full bg-bg-base overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: theme.accent }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pctDone}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Recent Activity (1/3 width) */}
        <motion.div
          variants={card}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.15 }}
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
            <ul className="flex flex-col gap-3">
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

          <div className="flex flex-col gap-2 mt-auto">
            <Link
              to="/workspace/tasks"
              className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              <span className="flex items-center gap-2">
                <ClipboardList size={13} />
                My Task Board
              </span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ── Row 3: Overdue Alert (only if any) ── */}
      {!loading && overdue.length > 0 && (
        <motion.div
          variants={card}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.2 }}
          className="rounded-2xl border bg-bg-elevated p-5 flex flex-col gap-4"
          style={{ borderColor: "rgba(209,41,31,0.3)" }}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-red-400" />
            <span className="text-sm font-semibold text-red-400">
              Overdue — Needs Attention ({overdue.length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {overdue.slice(0, 6).map((t) => {
              const daysOver = Math.ceil(
                (now - new Date(t.deadline).getTime()) / 86400000
              );
              return (
                <div
                  key={t._id}
                  className="flex flex-col gap-1.5 rounded-lg border px-3 py-2.5"
                  style={{ borderColor: "rgba(209,41,31,0.25)", borderLeftWidth: 3, borderLeftColor: "#D1291F" }}
                >
                  <span className="text-xs font-medium text-text-primary truncate">{t.title}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="rounded px-1.5 py-0.5 text-[14px] font-semibold"
                      style={{ background: `${PRIORITY_COLOR[t.priority]}22`, color: PRIORITY_COLOR[t.priority] }}
                    >
                      {t.priority}
                    </span>
                    <span className="text-[14px] font-semibold text-red-400">
                      {daysOver}d overdue
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Gamification (prominent — large gap above) ── */}
      <div className="mt-2">
        <GamificationSection scope="role" />
      </div>
    </motion.div>
  );
}
