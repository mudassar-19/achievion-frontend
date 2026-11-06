import { useState, useRef, useEffect } from "react";
import { hpColor } from "@/utils/hpTier";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Search, ChevronDown, Coins, Flame, Heart, LogOut, User, Settings, Trophy, ClipboardList, AlertTriangle, GitBranch, Users, CheckCheck } from "lucide-react";
import XpProgressBar from "@/components/ui/XpProgressBar";
import { TOPBAR_H } from "./WorkspaceLayout";
import { NavToggle } from "./ShellNav";
import useAuthStore           from "@/stores/authStore";
import useGamificationStore   from "@/stores/gamificationStore";
import "@/stores/uiStore";
import useNotificationStore, { toCategory, notifRedirectPath } from "@/stores/notificationStore";
import { useRoleTheme, portalBase } from "@/utils/roleTheme";

const SHOW_SEARCH = false; // flip when global search exists

// ── Type config for dropdown icons ────────────────────────────────────────────
const TYPE_CFG = {
  task:         { Icon: ClipboardList, color: "#1948BD" },
  project:      { Icon: GitBranch,     color: "#1948BD" },
  gamification: { Icon: Trophy,        color: "#7A5200" },
  team:         { Icon: Users,         color: "#0E6A30" },
  system:       { Icon: AlertTriangle, color: "#3A4660" },
};

function typeCfg(type) {
  return TYPE_CFG[toCategory(type)] ?? TYPE_CFG.system;
}

// ── Time-ago helper ───────────────────────────────────────────────────────────
function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)   return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Notification dropdown ─────────────────────────────────────────────────────
function NotificationDropdown({ open, onClose }) {
  const ref        = useRef(null);
  const navigate   = useNavigate();
  const theme      = useRoleTheme();
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead      = useNotificationStore((s) => s.markRead);
  const markAllRead   = useNotificationStore((s) => s.markAllRead);
  const unreadCount   = useNotificationStore((s) => s.unreadCount);
  const user          = useAuthStore((s) => s.user);

  // Latest 12 items (unread first, then most-recent)
  const preview = [...notifications]
    .sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1))
    .slice(0, 12);

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  function handleItem(n) {
    if (!n.read) markRead(n._id);
    navigate(notifRedirectPath(n, user?.role));
    onClose();
  }

  function handleViewAll() {
    navigate(`${portalBase(user?.role)}/notifications`);
    onClose();
  }

  if (!open) return null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: 4,  scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={[
        "absolute right-0 top-full mt-2 w-80 z-50",
        "rounded-2xl bg-[#FFFFFF] border border-ink/10",
        "shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink/[0.07]">
        <div className="flex items-center gap-2">
          <Bell size={14} strokeWidth={2} style={{ color: theme.text }} />
          <span className="text-sm font-bold text-accent-on">Notifications</span>
          {unreadCount > 0 && (
            <span
              className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[14px] font-black text-accent-on"
              style={{ background: theme.accent }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="flex items-center gap-1 text-[14px] font-semibold text-slate-500 hover:text-text-primary transition-colors"
          >
            <CheckCheck size={11} strokeWidth={2.5} />
            All read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[360px] overflow-y-auto">
        {preview.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <CheckCheck size={24} className="text-slate-700" strokeWidth={1.2} />
            <p className="text-xs text-slate-600 font-medium">You're all caught up!</p>
          </div>
        ) : (
          preview.map((n) => {
            const { Icon, color } = typeCfg(n.type);
            return (
              <button
                key={n._id}
                onClick={() => handleItem(n)}
                className={[
                  "flex items-start gap-3 w-full px-4 py-3 text-left",
                  "border-b border-ink/[0.04] transition-colors duration-100",
                  !n.read ? "bg-ink/[0.035] hover:bg-ink/[0.06]" : "hover:bg-ink/[0.025]",
                ].join(" ")}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border mt-0.5"
                  style={{ background: `${color}15`, borderColor: `${color}30` }}
                >
                  <Icon size={12} strokeWidth={2} style={{ color }} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className={["text-xs font-bold leading-tight truncate", !n.read ? "text-text-primary" : "text-slate-400"].join(" ")}>
                      {n.title || n.type}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />}
                      <span className="text-[14px] text-slate-600 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-[14px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <button
        onClick={handleViewAll}
        className="flex w-full items-center justify-center py-2.5 text-xs font-semibold text-slate-500 hover:text-text-primary border-t border-ink/[0.06] transition-colors"
      >
        View all notifications
      </button>
    </motion.div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, value, iconClass, iconStyle, title }) {
  return (
    <div
      title={title}
      className={[
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
        "bg-bg-elevated border border-ink/[0.08]",
        "text-xs font-bold cursor-default select-none",
        "hover:border-ink/20 transition-colors duration-150",
      ].join(" ")}
    >
      <Icon size={13} className={iconClass} style={iconStyle} strokeWidth={2.2} />
      <span className={iconClass} style={iconStyle}>{typeof value === "number" ? value.toLocaleString() : value}</span>
    </div>
  );
}

// ── Avatar dropdown ───────────────────────────────────────────────────────────
function AvatarDropdown({ username, level, open, onClose, onLogout }) {
  const base = portalBase(useAuthStore((s) => s.user?.role));
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={[
        "absolute right-0 top-full mt-2 w-44 z-50",
        "rounded-xl bg-bg-elevated border border-ink/10",
        "shadow-[0_8px_40px_rgba(0,0,0,0.55)] overflow-hidden",
      ].join(" ")}
      role="menu"
    >
      <div className="px-3 py-2.5 border-b border-ink/5">
        <p className="text-xs font-bold text-text-primary">{username}</p>
        <p className="text-[14px] text-slate-500">Level {level}</p>
      </div>

      <div className="py-1">
        {[
          { icon: User,     label: "Profile",  href: `${base}/profile`  },
          { icon: Settings, label: "Settings", href: `${base}/settings` },
        ].map(({ icon: Icon, label, href }) => (
          <a
            key={label}
            href={href}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400 hover:text-text-primary hover:bg-ink/5 transition-colors"
            role="menuitem"
          >
            <Icon size={13} strokeWidth={1.75} />
            {label}
          </a>
        ))}

        <div className="border-t border-ink/5 mt-1 pt-1">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-danger hover:bg-danger/10 transition-colors"
            role="menuitem"
          >
            <LogOut size={13} strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────────────
export default function Topbar() {
  const navigate = useNavigate();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [bellOpen,   setBellOpen]   = useState(false);
  const bellRef = useRef(null);

  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { level, currentXp, maxXp, gold, hp, streak } = useGamificationStore(
    (s) => s.currentUser
  );
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const username = user?.username ?? "Guest";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 bg-bg-surface border-b border-ink/5 z-50 flex items-center gap-2 px-3 sm:gap-4 sm:px-5"
      style={{ height: TOPBAR_H }}
    >
      {/* Left — aligns with sidebar (drawer toggle below 1024 px) */}
      <div className="shell-spacer w-60 shrink-0" />
      <NavToggle />

      {/* Center — global search */}
      <div className="flex-1 flex justify-center min-w-0">
        {/* Search is not built yet: hidden, code kept for when it is (shared-fixes item 6). */}
        <div className={`relative w-full max-w-sm hidden ${SHOW_SEARCH ? "sm:block" : ""}`}>
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
            strokeWidth={2}
          />
          <input
            type="search"
            disabled
            aria-label="Search (coming soon)"
            title="Search is not available yet"
            placeholder="Search is coming soon"
            className={[
              "w-full rounded-lg pl-9 pr-4 py-[7px] text-sm",
              "bg-bg-elevated border border-ink/[0.08]",
              "text-text-primary placeholder:text-slate-500",
              "focus:outline-none focus:border-accent/50",
              "focus:shadow-card-hover",
              "transition-all duration-150",
            ].join(" ")}
          />
        </div>
      </div>

      {/* Right — XP bar + stat pills + bell + avatar. Managers have no personal XP/gold/HP (D-081). */}
      <div className="flex items-center gap-2.5 shrink-0">
        {user?.role !== "Manager" && (<>
        {/* XP progress bar */}
        <div className="hidden xl:block w-44">
          <XpProgressBar currentXp={currentXp} maxXp={maxXp} level={level} />
        </div>
        <div className="hidden xl:block h-6 w-px bg-ink/[0.08]" aria-hidden="true" />

        <div className="hidden sm:flex items-center gap-2.5">
        <StatPill icon={Coins}  value={gold}   iconClass="text-[#7A5200]"  title="Gold coins" />
        <StatPill icon={Flame}  value={streak} iconClass="text-orange-400" title="Day streak"  />
        <StatPill icon={Heart}  value={hp}     iconStyle={{ color: hpColor(hp) }} title="Health points" />

        <div className="h-6 w-px bg-ink/[0.08]" aria-hidden="true" />
        </div>
        </>)}

        {/* Notifications bell */}
        <div className="relative" ref={bellRef}>
          <button
            className={[
              "relative flex h-8 w-8 items-center justify-center rounded-lg",
              "border transition-all duration-150",
              bellOpen
                ? "border-ink/20 bg-ink/[0.07] text-text-primary"
                : "border-ink/[0.08] bg-bg-elevated text-slate-500 hover:text-text-primary hover:border-ink/20",
            ].join(" ")}
            aria-label="Notifications"
            aria-haspopup="true"
            aria-expanded={bellOpen}
            onClick={() => { setAvatarOpen(false); setBellOpen((o) => !o); }}
          >
            <Bell size={15} strokeWidth={1.75} />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{    scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[14px] font-bold text-accent-on shadow-card"
                  aria-hidden="true"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <AnimatePresence>
            {bellOpen && (
              <NotificationDropdown
                open={bellOpen}
                onClose={() => setBellOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => { setBellOpen(false); setAvatarOpen((o) => !o); }}
            className={[
              "flex items-center gap-2 rounded-lg px-2.5 py-1.5",
              "border border-ink/[0.08] bg-bg-elevated",
              "text-slate-600 hover:text-text-primary hover:border-ink/20",
              "transition-all duration-150",
            ].join(" ")}
            aria-haspopup="true"
            aria-expanded={avatarOpen}
            aria-label="User menu"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[14px] font-black text-white">
              {username[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="hidden sm:block text-xs font-medium">{username}</span>
            <ChevronDown
              size={12}
              className={`transition-transform duration-150 ${avatarOpen ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </button>

          <AvatarDropdown
            username={username}
            level={level}
            open={avatarOpen}
            onClose={() => setAvatarOpen(false)}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  );
}


