import { useState, useMemo, useEffect } from "react";
import useAuthStore from "@/stores/authStore";
import PageHeader from "@/components/ui/PageHeader";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Trophy, ClipboardList, AlertTriangle,
  Check, Trash2, CheckCheck, Info,
  GitBranch, Users,
} from "lucide-react";
import { useRoleTheme }    from "@/utils/roleTheme";
import useUiStore          from "@/stores/uiStore";
import useNotificationStore, { toCategory, notifRedirectPath } from "@/stores/notificationStore";

import TallyLoader from "@/components/ui/TallyLoader";
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
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
            {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
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
            className="p-1 rounded-md hover:bg-ink/[0.08] text-slate-600 hover:text-accent-text transition-colors"
          >
            <Check size={12} strokeWidth={2.5} />
          </button>
        )}
        <button
          onClick={() => onDelete(n._id)}
          title="Delete"
          className="p-1 rounded-md hover:bg-ink/[0.08] text-slate-600 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── NotificationsPage ────────────────────────────────────────────────────────
export default function NotificationsPage({ hideGamification = false }) {
  const navigate   = useNavigate();
  const theme      = useRoleTheme();
  const addToast   = useUiStore((s) => s.addToast);

  const notifications = useNotificationStore((s) => s.notifications);
  const loading       = useNotificationStore((s) => s.loading);
  const markRead      = useNotificationStore((s) => s.markRead);
  const markAllRead   = useNotificationStore((s) => s.markAllRead);
  const deleteOne     = useNotificationStore((s) => s.deleteOne);
  const deleteAll     = useNotificationStore((s) => s.deleteAll);
  const fetchAll      = useNotificationStore((s) => s.fetch);
  const userRole      = useAuthStore((s) => s.user?.role);
  const isManager     = userRole === "Manager"; // universal page header (D-083)

  useEffect(() => { fetchAll(); }, [fetchAll]); // fresh list on open (the bell may have marked items read)

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

  async function handleMarkRead(id) {
    await markRead(id);
  }

  async function handleMarkAllRead() {
    await markAllRead();
    addToast({ type: "success", message: "All notifications marked as read." });
  }

  async function handleDelete(id) {
    await deleteOne(id);
  }

  async function handleClearAll() {
    await deleteAll();
    addToast({ type: "success", message: "All notifications cleared." });
  }

  function handleNavigate(n) {
    if (!n.read) markRead(n._id);
    const dest = notifRedirectPath(n, userRole);
    const ownPath = `/workspace/notifications`;
    if (dest !== ownPath) navigate(dest);
  }

  return (
    <div className={isManager ? "px-4 sm:px-8 py-8 min-h-full max-w-[1280px] mx-auto w-full flex flex-col gap-6" : "px-4 sm:px-8 py-8 min-h-full max-w-[860px] mx-auto flex flex-col gap-6"}>

      {isManager ? (
        <PageHeader title="Notifications" subtitle="Updates about your projects, team and requests.">
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
        </PageHeader>
      ) : (
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600 mb-0.5">Activity Log</p>
        <div className="flex items-center justify-between gap-4">
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
                  style={{ background: theme.accent }}
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
      )}

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Total",        value: counts.all,          color: theme.text             },
          { label: "Unread",       value: counts.unread,       color: "var(--accent-text)"   },
          { label: "Tasks",        value: counts.task,         color: "#1948BD"              },
          ...(hideGamification ? [] : [{ label: "Gamification", value: counts.gamification, color: "#7A5200" }]),
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center py-4 rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] gap-0.5"
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
        className="flex items-center gap-1 flex-wrap"
      >
        {TABS.filter((t) => !(hideGamification && t.key === "gamification")).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150"
              style={active
                ? { background: `${theme.accent}22`, color: theme.text, border: `1px solid ${theme.accent}44` }
                : { background: "transparent", color: "#4F5B75", border: "1px solid transparent" }
              }
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span
                  className="text-[14px] font-black px-1 py-0.5 rounded-full min-w-4 text-center"
                  style={active
                    ? { background: `${theme.accent}1f`, color: theme.text }
                    : { background: "rgba(20,32,61,0.07)", color: "#4F5B75" }
                  }
                >
                  {counts[t.key]}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* ── Notification list ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <TallyLoader />
        </div>
      ) : visible.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-ink/[0.06]"
        >
          {tab === "unread"
            ? <CheckCheck size={32} className="text-slate-700 mb-3" strokeWidth={1.2} />
            : <Bell       size={32} className="text-slate-700 mb-3" strokeWidth={1.2} />
          }
          <p className="text-sm text-slate-600 font-medium">
            {tab === "unread" ? "You're all caught up!" : `No ${tab === "all" ? "" : tab + " "}notifications.`}
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-2"
        >
          <AnimatePresence initial={false}>
            {visible.map((n) => (
              <NotifRow
                key={n._id}
                n={n}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
                onNavigate={handleNavigate}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Footer hint */}
      {!loading && notifications.length > 0 && (
        <p className="text-[14px] text-slate-700 text-center pb-2 flex items-center justify-center gap-1">
          <Info size={10} />
          Click a notification to navigate · Hover to mark read or delete
        </p>
      )}
    </div>
  );
}
