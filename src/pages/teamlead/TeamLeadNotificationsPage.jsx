import { fmtShort as dShort } from "@/pages/manager/project/format";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Trophy, ClipboardList, AlertTriangle,
  Check, Trash2, CheckCheck, Info,
  GitBranch, Users,
} from "lucide-react";
import useNotificationStore, { toCategory } from "@/stores/notificationStore";
import useUiStore from "@/stores/uiStore";

import TallyLoader from "@/components/ui/TallyLoader";
const TEAL = "#08695F";

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CFG = {
  task:         { icon: ClipboardList, color: "#1948BD", label: "Task"         },
  project:      { icon: GitBranch,     color: "#1948BD", label: "Project"      },
  gamification: { icon: Trophy,        color: "#7A5200", label: "Gamification" },
  team:         { icon: Users,         color: "#0E6A30", label: "Team"         },
  system:       { icon: AlertTriangle, color: "#B01F17", label: "System"       },
};

function cfgFor(type) {
  return TYPE_CFG[toCategory(type)] ?? TYPE_CFG.system;
}

function timeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return dShort(date);
}

// ─── TL-specific redirect path ────────────────────────────────────────────────
function tlRedirectPath(notif) {
  const { type, meta = {} } = notif;
  const cat = toCategory(type);
  if (type === "review_requested" && meta.taskId) return `/teamlead/review/${meta.taskId}`;
  if (type === "review_requested")                return "/teamlead/review-submissions";
  if (cat === "project" && meta.projectId)        return `/teamlead/projects/${meta.projectId}`;
  if (cat === "project")                          return "/teamlead/projects";
  if (cat === "task"    && meta.taskId)            return `/teamlead/tasks/${meta.taskId}`;
  if (cat === "task")                             return "/teamlead/tasks";
  if (cat === "gamification")                     return "/teamlead/badges";
  if (cat === "team")                             return "/teamlead/team";
  return "/teamlead/notifications";
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const TABS = [
  { key: "all",          label: "All"          },
  { key: "unread",       label: "Unread"       },
  { key: "task",         label: "Tasks"        },
  { key: "project",      label: "Projects"     },
  { key: "gamification", label: "Gamification" },
  { key: "team",         label: "Team"         },
  { key: "system",       label: "System"       },
];

// ─── Single notification row ──────────────────────────────────────────────────
function NotifRow({ n, onMarkRead, onDelete, onNavigate }) {
  const cfg  = cfgFor(n.type);
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      transition={{ duration: 0.25 }}
      className={[
        "group flex items-start gap-3 px-4 py-3.5 rounded-xl border-l-2 border transition-colors duration-150",
        !n.read
          ? "bg-ink/[0.04] border-ink/[0.07] cursor-pointer"
          : "bg-ink/[0.015] border-ink/[0.04] cursor-pointer",
        "hover:bg-ink/[0.055]",
      ].join(" ")}
      style={{ borderLeftColor: !n.read ? cfg.color : `${cfg.color}55` }}
      onClick={() => onNavigate(n)}
    >
      {/* Type icon */}
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border mt-0.5"
        style={{ background: `${cfg.color}15`, borderColor: `${cfg.color}30` }}
      >
        <Icon size={14} strokeWidth={2} style={{ color: cfg.color }} />
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={["text-sm font-bold leading-tight", !n.read ? "text-text-primary" : "text-slate-400"].join(" ")}>
            {n.title || n.type}
          </p>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            {!n.read && <span className="h-1.5 w-1.5 rounded-full" style={{ background: TEAL }} />}
            <span className="text-[14px] text-slate-600 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.message}</p>
        <p className="text-[14px] text-slate-700 mt-1 font-medium uppercase tracking-wider">
          {cfg.label}
        </p>
      </div>

      {/* Actions — visible on hover */}
      <div
        className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        {!n.read && (
          <button
            onClick={() => onMarkRead(n._id)}
            title="Mark as read"
            aria-label="Mark as read"
            className="p-1.5 rounded-md hover:bg-ink/[0.08] text-slate-600 transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.color = TEAL)}
            onMouseLeave={(e) => (e.currentTarget.style.color = "")}
          >
            <Check size={12} strokeWidth={2.5} />
          </button>
        )}
        <button
          onClick={() => onDelete(n._id)}
          title="Delete"
          aria-label="Delete"
          className="p-1.5 rounded-md hover:bg-ink/[0.08] text-slate-600 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TeamLeadNotificationsPage() {
  const navigate   = useNavigate();
  const addToast   = useUiStore((s) => s.addToast);

  const notifications = useNotificationStore((s) => s.notifications);
  const loading       = useNotificationStore((s) => s.loading);
  const markRead      = useNotificationStore((s) => s.markRead);
  const markAllRead   = useNotificationStore((s) => s.markAllRead);
  const deleteOne     = useNotificationStore((s) => s.deleteOne);
  const deleteAll     = useNotificationStore((s) => s.deleteAll);

  const [tab, setTab] = useState("all");

  // Counts per tab
  const counts = useMemo(() => ({
    all:          notifications.length,
    unread:       notifications.filter((n) => !n.read).length,
    task:         notifications.filter((n) => toCategory(n.type) === "task").length,
    project:      notifications.filter((n) => toCategory(n.type) === "project").length,
    gamification: notifications.filter((n) => toCategory(n.type) === "gamification").length,
    team:         notifications.filter((n) => toCategory(n.type) === "team").length,
    system:       notifications.filter((n) => toCategory(n.type) === "system").length,
  }), [notifications]);

  const visible = useMemo(() => {
    if (tab === "all")    return notifications;
    if (tab === "unread") return notifications.filter((n) => !n.read);
    return notifications.filter((n) => toCategory(n.type) === tab);
  }, [notifications, tab]);

  const unreadCount = counts.unread;

  async function handleMarkAllRead() {
    await markAllRead();
    addToast({ type: "success", message: "All notifications marked as read." });
  }

  async function handleClearAll() {
    await deleteAll();
    addToast({ type: "success", message: "All notifications cleared." });
  }

  function handleNavigate(n) {
    if (!n.read) markRead(n._id);
    const dest = tlRedirectPath(n);
    if (dest !== "/teamlead/notifications") navigate(dest);
  }

  return (
    <div className="px-4 sm:px-8 py-8 min-h-full max-w-[860px] mx-auto flex flex-col gap-6">

      {/* ── Page heading ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600 mb-0.5">Activity Log</p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-text-primary">Notifications</h1>
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full text-[14px] font-black text-accent-on"
                  style={{ background: TEAL }}
                >
                  {unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-ink/[0.08] hover:border-ink/[0.18] px-3 py-1.5 rounded-lg transition-all"
              >
                <CheckCheck size={12} strokeWidth={2.5} />
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-400 border border-ink/[0.08] hover:border-red-400/30 px-3 py-1.5 rounded-lg transition-all"
              >
                <Trash2 size={12} strokeWidth={2.5} />
                Clear all
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Total",        value: counts.all,          color: "#08695F"      },
          { label: "Unread",       value: counts.unread,       color: "var(--accent-text)" },
          { label: "Tasks",        value: counts.task,         color: "#1948BD" },
          { label: "Gamification", value: counts.gamification, color: "#7A5200" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center py-4 rounded-2xl bg-gradient-to-b from-[#FFFFFF] to-[#F5F6FA] border border-ink/[0.07] gap-0.5"
          >
            <p className="text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
            <p className="text-[14px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Filter tabs ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
        className="flex flex-wrap gap-1 p-1 rounded-xl bg-ink/[0.03] border border-ink/[0.06] w-fit"
      >
        {TABS.map(({ key, label }) => {
          const count    = counts[key] ?? 0;
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
              style={isActive ? { background: TEAL, color: "var(--on-accent)" } : { color: "#4F5B75" }}
            >
              {label}
              {count > 0 && (
                <span
                  className="text-[14px] font-black px-1 py-px rounded-full"
                  style={isActive
                    ? { background: "rgba(20,32,61,0.05)", color: "var(--on-accent)" }
                    : { background: "rgba(20,32,61,0.08)", color: "#3A4660" }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* ── Notification list ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col gap-1.5 flex-1"
      >
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <TallyLoader />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-2xl border border-ink/[0.05] bg-ink/[0.01]">
            <Bell size={36} className="text-slate-700" strokeWidth={1.2} />
            <p className="text-sm text-slate-500 font-semibold">
              {tab === "all" ? "No notifications yet" : `No ${tab} notifications`}
            </p>
            <p className="text-xs text-slate-700">Notifications from task assignments, reviews, and achievements appear here.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((n) => (
              <NotifRow
                key={n._id}
                n={n}
                onMarkRead={markRead}
                onDelete={deleteOne}
                onNavigate={handleNavigate}
              />
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* ── Info footer ───────────────────────────────────────────────────── */}
      {visible.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-[14px] text-slate-700 border border-ink/[0.05] rounded-xl px-4 py-2.5"
          style={{ background: "rgba(20,32,61,0.015)" }}
        >
          <Info size={10} style={{ color: "#08695F" }} />
          <span>
            Notifications auto-update in real-time via WebSocket.
            Click any notification to navigate to the relevant area.
          </span>
        </motion.div>
      )}
    </div>
  );
}
