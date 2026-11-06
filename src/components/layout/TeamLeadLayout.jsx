import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, FolderKanban, CheckSquare, Users, Bell, User, Trophy, Award, UserCircle2, Sparkles, CalendarCheck2, Settings, LogOut, CheckCheck, X, AlertTriangle, ClipboardList, GitBranch, MessageSquare, Kanban } from "lucide-react";
import BottomTicker    from "./BottomTicker";
import ToastContainer  from "@/components/ui/ToastContainer";
import { TOPBAR_H, SIDEBAR_W, TICKER_H } from "./WorkspaceLayout";
import useAuthStore         from "@/stores/authStore";
import "@/stores/gamificationStore";
import useNotificationStore, { notifRedirectPath, toCategory } from "@/stores/notificationStore";
import { NavToggle, NavScrim } from "./ShellNav";
import useGamificationSocket from "@/hooks/useGamificationSocket";
import useUiStore from "@/stores/uiStore";

// ── Brand accent ───────────────────────────────────────────────────────────────
const TEAL         = "#08695F";
const TEAL_LIGHT   = "rgba(10,127,118,0.15)";

const TEAL_GLOW    = "rgba(10,127,118,0.20)";

// ── Type icon map ─────────────────────────────────────────────────────────────
const TYPE_ICON = {
  task:         { Icon: ClipboardList, color: "#1948BD" },
  project:      { Icon: GitBranch,     color: "#1948BD" },
  gamification: { Icon: Trophy,        color: "#7A5200" },
  team:         { Icon: Users,         color: "#0E6A30" },
  system:       { Icon: AlertTriangle, color: "#3A4660" },
};
function notifIcon(type) {
  return TYPE_ICON[toCategory(type)] ?? TYPE_ICON.system;
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)   return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Section heading ────────────────────────────────────────────────────────────
function SectionLabel({ label }) {
  return (
    <p
      className="mx-5 mt-4 mb-1 text-[14px] font-bold uppercase tracking-[0.15em] select-none"
      style={{ color: "#08695F" }}
    >
      {label}
    </p>
  );
}

// ── Single nav link ────────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, to, end = false }) {
  const base =
    "flex items-center gap-3 mx-2 px-[14px] py-2.5 rounded-lg text-sm font-medium " +
    "transition-all duration-150 border-l-2 select-none";
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        isActive ? base : `${base} text-[color:var(--nav-text)] hover:text-[color:var(--nav-text-hover)] hover:bg-[var(--nav-bg-hover)] border-transparent`
      }
      style={({ isActive }) =>
        isActive
          ? {
              color:           "#08695F",
              background:      TEAL_LIGHT,
              borderLeftColor: TEAL,
              boxShadow:       `inset 0 0 16px ${TEAL_GLOW}`,
            }
          : {}
      }
    >
      <Icon size={17} strokeWidth={1.75} className="shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

// ── Team Lead Topbar ───────────────────────────────────────────────────────────
function TeamLeadTopbar() {
  const user      = useAuthStore((s) => s.user);
  const logout    = useAuthStore((s) => s.logout);
  const navigate  = useNavigate();
  const dropRef   = useRef(null);
  const [bellOpen, setBellOpen] = useState(false);

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount   = useNotificationStore((s) => s.unreadCount);
  const markRead      = useNotificationStore((s) => s.markRead);
  const markAllRead   = useNotificationStore((s) => s.markAllRead);

  // Latest 10 notifications for dropdown
  const preview = [...notifications]
    .sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1))
    .slice(0, 10);

  // Close on outside click
  useEffect(() => {
    if (!bellOpen) return;
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setBellOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bellOpen]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function handleNotifClick(n) {
    if (!n.read) markRead(n._id);
    const dest = notifRedirectPath(n);
    // Remap workspace paths to teamlead paths
    const teamleadDest = dest
      .replace("/workspace/projects", "/teamlead/projects")
      .replace("/workspace/tasks",    "/teamlead/tasks")
      .replace("/workspace/badges",   "/teamlead/badges")
      .replace("/workspace/notifications", "/teamlead/notifications")
      .replace("/workspace/team-overview", "/teamlead/team");
    navigate(teamleadDest.startsWith("/workspace") ? "/teamlead/notifications" : teamleadDest);
    setBellOpen(false);
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center border-b"
      style={{
        height:     TOPBAR_H,
        background: "linear-gradient(90deg, #F5F6FA 0%, #F5F6FA 50%, #F5F6FA 100%)",
        borderColor: `${TEAL}22`,
        boxShadow:  `0 1px 0 ${TEAL}20, 0 4px 24px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Sidebar spacer */}
      <NavToggle />
      <div
        className="shell-spacer shrink-0 h-full border-r"
        style={{ width: SIDEBAR_W, borderColor: `${TEAL}18` }}
      />

      {/* Center: greeting + role pill */}
      <div className="flex-1 flex items-center gap-4 px-7">
        <div className="shell-hide-xs flex flex-col leading-none">
          <span className="text-[14px] text-slate-500 font-medium">Welcome back,</span>
          <span
            className="text-sm font-bold"
            style={{
              background:           `linear-gradient(90deg, #08695F, #0A7F76)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor:  "transparent",
              backgroundClip:       "text",
            }}
          >
            {user?.name ?? "Team Lead"}
          </span>
        </div>
        <span
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[14px] font-bold uppercase tracking-widest select-none"
          style={{
            background: `linear-gradient(90deg, ${TEAL}20, rgb(var(--c-accent) / 0.08))`,
            border:     `1px solid ${TEAL}35`,
            color:      "#138674",
          }}
        >
          <Users size={9} strokeWidth={2.5} />
          Team Lead
        </span>
      </div>

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-3 pr-5 shrink-0">
        {/* Notification bell */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-150"
            style={{
              background:  bellOpen ? `${TEAL}22` : `${TEAL}0a`,
              border:      `1px solid ${bellOpen ? `${TEAL}55` : `${TEAL}25`}`,
              boxShadow:   bellOpen ? `0 0 14px ${TEAL}30` : "none",
              color:       bellOpen ? TEAL : `${TEAL}90`,
            }}
            aria-label="Notifications"
          >
            <Bell size={15} strokeWidth={1.75} />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{    scale: 0 }}
                  className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full text-[14px] font-bold text-accent-on px-1 leading-none"
                  style={{ background: TEAL, boxShadow: "var(--shadow-1)" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Notification dropdown */}
          <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0,  scale: 1    }}
                exit={{    opacity: 0, y: 4,  scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, #F5F6FA 0%, #F5F6FA 100%)",
                  border:     `1px solid ${TEAL}25`,
                  boxShadow:  `0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px ${TEAL}10`,
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: `1px solid ${TEAL}15` }}
                >
                  <div className="flex items-center gap-2">
                    <Bell size={13} style={{ color: "#08695F" }} strokeWidth={1.75} />
                    <span className="text-xs font-bold text-text-primary">Notifications</span>
                    {unreadCount > 0 && (
                      <span
                        className="flex h-4 min-w-[1rem] items-center justify-center rounded-full text-[14px] font-bold px-1.5"
                        style={{ background: `${TEAL}20`, border: `1px solid ${TEAL}40`, color: "#138674" }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllRead()}
                        className="flex items-center gap-1 text-[14px] transition-colors"
                        style={{ color: "#08695F" }}
                      >
                        <CheckCheck size={11} />
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setBellOpen(false)} className="text-slate-600 hover:text-slate-400 transition-colors">
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="max-h-72 overflow-y-auto">
                  {preview.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <CheckCheck size={24} className="text-slate-700" strokeWidth={1.2} />
                      <p className="text-xs text-slate-600">You're all caught up!</p>
                    </div>
                  ) : (
                    preview.map((n) => {
                      const { Icon, color } = notifIcon(n.type);
                      return (
                        <button
                          key={n._id}
                          onClick={() => handleNotifClick(n)}
                          className="flex gap-3 w-full px-4 py-3 text-left transition-colors"
                          style={{
                            borderBottom: "1px solid rgba(20,32,61,0.04)",
                            background:   n.read ? "transparent" : `${TEAL}06`,
                          }}
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border mt-0.5"
                            style={{ background: `${color}15`, borderColor: `${color}30` }}
                          >
                            <Icon size={12} strokeWidth={2} style={{ color }} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <p className={["text-[14px] font-bold leading-tight truncate", !n.read ? "text-text-primary" : "text-slate-400"].join(" ")}>
                                {n.title || n.type}
                              </p>
                              <div className="flex items-center gap-1 shrink-0">
                                {!n.read && (
                                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: TEAL }} />
                                )}
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
                  onClick={() => { navigate("/teamlead/notifications"); setBellOpen(false); }}
                  className="flex w-full items-center justify-center py-2.5 text-xs font-semibold transition-colors"
                  style={{ borderTop: `1px solid ${TEAL}12`, color: "#08695F" }}
                >
                  View all notifications
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="h-6 w-px" style={{ background: `${TEAL}20` }} />

        {/* Profile shortcut */}
        <button
          onClick={() => navigate("/teamlead/profile")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
          style={{
            background: `${TEAL}0a`,
            border:     `1px solid ${TEAL}25`,
            color:      "#138674",
          }}
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[14px] font-black text-[#FFFFFF]"
            style={{ background: TEAL }}
          >
            {user?.name?.[0]?.toUpperCase() ?? "T"}
          </span>
          <span className="hidden sm:block">{user?.name ?? "Team Lead"}</span>
        </button>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="hidden items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
          style={{
            background: "rgba(209,41,31,0.08)",
            border:     "1px solid rgba(209,41,31,0.20)",
            color:      "#B01F17",
          }}
        >
          <LogOut size={13} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </header>
  );
}

// ── Team Lead Sidebar ──────────────────────────────────────────────────────────
function TeamLeadSidebar() {
  const navOpen  = useUiStore((s) => s.navOpen);
  const logout   = useAuthStore((s) => s.logout);
  const user     = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      data-open={navOpen}
      className="shell-aside fixed left-0 w-60 border-r flex flex-col z-40"
      style={{
        top:         TOPBAR_H,
        bottom:      TICKER_H,
        background:  "linear-gradient(180deg, #F5F6FA 0%, #F5F6FA 100%)",
        borderColor: `${TEAL}18`,
      }}
    >
      {/* Branding */}
      <div
        className="flex items-center gap-2.5 px-5 py-4 shrink-0"
        style={{ borderBottom: `1px solid ${TEAL}12` }}
      >
        <div className="min-w-0">
          {user?.orgName ? (
            <>
              <span
                className="block text-base font-black leading-tight truncate"
                style={{
                  background:           `linear-gradient(90deg, ${TEAL}, var(--accent))`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor:  "transparent",
                  backgroundClip:       "text",
                }}
              >
                {user.orgName}
              </span>
              <span className="block text-[14px] font-medium text-slate-600 mt-0.5 tracking-wide">
                Team Lead Portal
              </span>
            </>
          ) : (
            <>
              <span
                className="block text-base font-black tracking-[0.08em] uppercase"
                style={{
                  background:           `linear-gradient(90deg, ${TEAL}, var(--accent))`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor:  "transparent",
                  backgroundClip:       "text",
                  letterSpacing:        "0.06em",
                }}
              >
                ACHIEVION
              </span>
              <span
                className="block text-[14px] font-bold uppercase tracking-widest mt-px"
                style={{ color: "#08695F" }}
              >
                Team Lead
              </span>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 py-2 flex flex-col overflow-y-auto" aria-label="Team Lead navigation">

        {/* MAIN */}
        <SectionLabel label="Main" />
        <NavItem icon={LayoutDashboard} label="Dashboard"      to="/teamlead"          end />
        <NavItem icon={FolderKanban}    label="Projects"       to="/teamlead/projects"     />

        {/* WORK */}
        <SectionLabel label="Work" />
        <NavItem icon={CheckSquare}     label="Tasks Hub"      to="/teamlead/tasks"         />
        <NavItem icon={Kanban}          label="Board"          to="/teamlead/board"         />
        <NavItem icon={CheckCheck}      label="Review Submissions" to="/teamlead/review-submissions" />
        <NavItem icon={CalendarCheck2}  label="Availability"   to="/teamlead/availability"  />
        <NavItem icon={Users}           label="Team Overview"  to="/teamlead/team"          />

        {/* GAMIFICATION */}
        <SectionLabel label="Gamification" />
        <NavItem icon={Trophy}          label="Leaderboard"    to="/teamlead/leaderboard"   />
        <NavItem icon={Award}           label="Badges"         to="/teamlead/badges"        />
        <NavItem icon={UserCircle2}     label="Avatar"         to="/teamlead/avatar"        />
        <NavItem icon={Sparkles}        label="Titles"         to="/teamlead/titles"        />

        {/* ACCOUNT */}
        <SectionLabel label="Collaborate" />
        <NavItem icon={MessageSquare}   label="Collaboration"  to="/teamlead/chat"          />

        <SectionLabel label="Account" />
        <NavItem icon={User}            label="Profile"        to="/teamlead/profile"       />
        <NavItem icon={Bell}            label="Notifications"  to="/teamlead/notifications" />
        <NavItem icon={Settings}        label="Settings"       to="/teamlead/settings"      />
      </nav>

      {/* Sign out */}
      <div className="py-2 shrink-0" style={{ borderTop: `1px solid ${TEAL}12` }}>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 mx-2 px-[14px] py-2.5 rounded-lg text-sm font-medium border-l-2 border-transparent text-slate-500 hover:text-[#B01F17] hover:bg-[#D1291F]/[0.08] transition-all duration-150"
        >
          <LogOut size={17} strokeWidth={1.75} className="shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

// ── TeamLeadLayout ─────────────────────────────────────────────────────────────
export default function TeamLeadLayout() {
  useGamificationSocket();
  const fetchNotifs  = useNotificationStore((s) => s.fetch);
  const initSocket   = useNotificationStore((s) => s.initSocket);
  const destroySocket= useNotificationStore((s) => s.destroySocket);

  useEffect(() => {
    fetchNotifs();
    initSocket();

    return () => destroySocket();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-bg-base font-sans text-text-primary antialiased">
      <TeamLeadTopbar />
      <TeamLeadSidebar />

      <main
        id="main"
        className="shell-main fixed overflow-y-auto"
        style={{ top: TOPBAR_H, left: SIDEBAR_W, right: 0, bottom: TICKER_H }}
      >
        <Outlet />
      </main>

      <NavScrim />
      <BottomTicker />
      <ToastContainer />
    </div>
  );
}
