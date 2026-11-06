// Universal portal shell (docs/design/UNIVERSAL_SHELL.md). Extracted from the Director portal:
// 60px top bar, 64px rail that expands to 220px (hover or pin), bell dropdown, avatar menu,
// optional AI panel slot. Colour comes only from the role accent tokens (--c-accent on [data-role]),
// so the Director stays plum and every other role gets its own accent with the same pixels.
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ToastContainer from "@/components/ui/ToastContainer";
import useAuthStore from "@/stores/authStore";
import api from "@/lib/api";
import Tally from "@/components/ui/Tally";
import { AI_W } from "./AiPanel";
import { User, Bell, LogOut, ChevronDown, Pin, PinOff, Menu, X, CheckCheck, Shield } from "lucide-react";

export const D_TOPBAR_H  = 60;
export const D_RAIL_W    = 64;   // collapsed rail
export const D_RAIL_EXP  = 220;  // expanded (hover or pin)
const PHONE_MQ = "(max-width: 639px)";

const A = (a) => `rgb(var(--c-accent) / ${a})`; // role accent with alpha
const ACCENT = "rgb(var(--c-accent))";

// ── Nav item for the rail ──────────────────────────────────────────────────────
function RailItem({ icon: Icon, label, to, end = false, badge, expanded, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      aria-label={label}
      title={label}
      className="relative block mx-1.5 rounded-xl select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      style={({ isActive }) => ({
        background:  isActive ? A(0.12) : "transparent",
        boxShadow:   isActive ? `inset 0 0 12px ${A(0.08)}` : "none",
      })}
    >
      {({ isActive }) => (
        <span
          aria-current={isActive ? "page" : undefined}
          className={[
            "flex items-center gap-3 px-[10px] py-2.5 rounded-xl transition-colors duration-100",
            isActive
              ? "text-[color:var(--rail-active,var(--accent))]" // T-1: teal needs the darker accent-text for 4.5:1
              : "text-[color:var(--nav-text)] hover:text-[color:var(--nav-text-hover)] hover:bg-[var(--nav-bg-hover)]",
          ].join(" ")}
        >
          <span className="shrink-0 flex h-[20px] w-[20px] items-center justify-center">
            <Icon size={18} strokeWidth={isActive ? 2 : 1.75} />
          </span>
          {expanded && (
            <span className="flex-1 min-w-0 truncate text-sm font-semibold leading-none">
              {label}
            </span>
          )}
          {expanded && badge != null && badge > 0 && (
            <span
              className="shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none"
              style={{ background: A(0.15), color: ACCENT }}
            >
              {badge > 99 ? "99+" : badge}
            </span>
          )}
          {!expanded && badge != null && badge > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full" style={{ background: ACCENT }} />
          )}
        </span>
      )}
    </NavLink>
  );
}

function RailSection({ label, expanded }) {
  if (!expanded) return <div className="mx-3 my-2 h-px bg-border-subtle" />;
  return (
    <p className="mx-4 mt-5 mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 select-none">
      {label}
    </p>
  );
}

function typeLabel(type) {
  if (type === "approval_required") return "Approval request";
  if (type === "approval_result")   return "Approval result";
  return type;
}

function formatTime(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Top bar ────────────────────────────────────────────────────────────────────
function ShellTopbar({ cfg, notifSignal, railExpanded, onToggleRail, onAiToggle, aiOpen, phone }) {
  const user     = useAuthStore((s) => s.user);
  const logout   = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const notifLabel  = cfg.notifLabel ?? ((n) => typeLabel(n.type));

  const [notifs,    setNotifs]    = useState([]);
  const [bellOpen,  setBellOpen]  = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [marking,   setMarking]   = useState(false);
  const bellRef   = useRef(null);
  const avatarRef = useRef(null);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const fetchNotifs = useCallback(async () => {
    try {
      const data = await api.get("/api/notifications");
      setNotifs(data.notifications ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);
  useEffect(() => { if (notifSignal) fetchNotifs(); }, [notifSignal, fetchNotifs]);

  // Close dropdowns on outside click or Esc
  useEffect(() => {
    function handler(e) {
      if (bellOpen   && bellRef.current   && !bellRef.current.contains(e.target))   setBellOpen(false);
      if (avatarOpen && avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false);
    }
    function onKey(e) { if (e.key === "Escape") { setBellOpen(false); setAvatarOpen(false); } }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", onKey); };
  }, [bellOpen, avatarOpen]);

  async function markAllRead() {
    setMarking(true);
    try {
      await api.patch("/api/notifications/read-all");
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* silent */ }
    setMarking(false);
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center border-b"
      style={{
        height:     D_TOPBAR_H,
        background: "#F5F6FA",
        borderColor: A(0.14),
        boxShadow:  `0 1px 0 ${A(0.10)}, 0 2px 12px rgba(0,0,0,0.04)`,
      }}
    >
      {/* ── Rail toggle + portal name ── */}
      <div
        className="flex items-center gap-2.5 shrink-0 h-full px-3"
        style={{
          width: railExpanded && !phone ? D_RAIL_EXP : D_RAIL_W,
          transition: "width 0.2s ease",
          borderRight: `1px solid ${A(0.10)}`,
        }}
      >
        <button
          type="button"
          onClick={onToggleRail}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[color:var(--nav-text)] hover:bg-[var(--nav-bg-hover)] hover:text-[color:var(--nav-text-hover)] transition-colors"
          aria-label={railExpanded ? "Collapse navigation" : "Expand navigation"}
        >
          {railExpanded ? <X size={16} strokeWidth={2} /> : <Menu size={16} strokeWidth={2} />}
        </button>
        {railExpanded && !phone && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
            className="min-w-0"
          >
            <span className="block text-sm font-black tracking-wider uppercase leading-none" style={{ color: "var(--accent-text)" }}>
              {cfg.portal}
            </span>
            <span className="block text-[11px] text-slate-400 leading-none mt-0.5">{cfg.portalSub}</span>
          </motion.div>
        )}
      </div>

      {/* ── Identity label + role chip ── */}
      <div className="flex-1 flex items-center px-5 min-w-0">
        <span className="text-sm font-semibold text-text-secondary truncate">
          {cfg.label ?? user?.name}
        </span>
        <span
          className="ml-2 hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-widest shrink-0"
          style={{ background: A(0.08), border: `1px solid ${A(0.20)}`, color: "var(--accent-text)" }}
        >
          <Shield size={9} strokeWidth={2.5} />
          {cfg.portal}
        </span>
      </div>

      {/* ── Right controls ── */}
      <div className="flex items-center gap-1 pr-4 shrink-0">
        {/* AI slot: only rendered when the portal has an AI panel */}
        {onAiToggle && (
          <button
            type="button"
            onClick={onAiToggle}
            title="AI Assistant (Ctrl+J)"
            aria-label="Toggle AI Assistant"
            aria-pressed={aiOpen}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-[var(--nav-bg-hover)]"
            style={aiOpen
              ? { background: A(0.10), border: `1px solid ${A(0.25)}` }
              : { border: "1px solid transparent" }}
          >
            <Tally pose="idle" size={26} />
          </button>
        )}

        {cfg.topbarExtra}

        {/* Notification bell */}
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => { setBellOpen((v) => !v); setAvatarOpen(false); }}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-[var(--nav-bg-hover)]"
            style={{
              background: bellOpen ? A(0.10) : undefined,
              border:     bellOpen ? `1px solid ${A(0.25)}` : "1px solid transparent",
            }}
            aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
            aria-expanded={bellOpen}
          >
            <Bell size={15} strokeWidth={1.75} className="text-slate-600" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full text-[10px] font-bold text-white px-1 leading-none"
                style={{ background: ACCENT }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {bellOpen && (
              <motion.div
                className="absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl overflow-hidden"
                style={{
                  background: "#FFFFFF",
                  border:     `1px solid ${A(0.14)}`,
                  boxShadow:  `0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px ${A(0.06)}`,
                }}
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0,  scale: 1 }}
                exit={{    opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${A(0.10)}` }}>
                  <div className="flex items-center gap-2">
                    <Bell size={13} strokeWidth={1.75} style={{ color: ACCENT }} />
                    <span className="text-xs font-bold text-text-primary">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: A(0.12), color: "var(--accent-text)" }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        disabled={marking}
                        className="flex min-h-8 -my-[7px] items-center gap-1 text-[12px] font-semibold disabled:opacity-40 transition-colors"
                        style={{ color: "var(--accent-text)" }}
                      >
                        <CheckCheck size={11} />
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setBellOpen(false)}
                      aria-label="Close notifications"
                      className="inline-flex h-8 w-8 -m-[9.5px] items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <Bell size={20} className="text-slate-300" strokeWidth={1.5} />
                      <p className="text-xs text-slate-400">No notifications yet</p>
                    </div>
                  ) : (
                    notifs.slice(0, 20).map((n) => {
                      const target = cfg.notifTarget?.(n);
                      async function handleClick() {
                        if (!n.read) {
                          try {
                            await api.patch(`/api/notifications/${n._id}/read`);
                            setNotifs((prev) => prev.map((x) => x._id === n._id ? { ...x, read: true } : x));
                          } catch { /* best-effort */ }
                        }
                        if (target) { navigate(target.to); setBellOpen(false); }
                      }
                      return (
                        <div
                          key={n._id}
                          onClick={handleClick}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
                          role="button"
                          tabIndex={0}
                          className="flex gap-3 px-4 py-3 cursor-pointer transition-colors"
                          style={{
                            borderBottom: "1px solid rgba(20,32,61,0.05)",
                            background:   n.read ? "transparent" : A(0.04),
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = A(0.07); }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? "transparent" : A(0.04); }}
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: n.read ? "#CBD5E1" : ACCENT }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-text-primary">{notifLabel(n)}</p>
                            <p className="text-xs text-text-secondary mt-0.5 break-words leading-snug">{n.message}</p>
                            {target && (
                              <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--accent-text)" }}>{target.label}</p>
                            )}
                            <p className="text-[11px] text-slate-400 mt-1">{formatTime(n.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {cfg.notificationsPath && (
                  <NavLink
                    to={cfg.notificationsPath}
                    onClick={() => setBellOpen(false)}
                    className="flex h-10 items-center justify-center text-xs font-bold hover:bg-ink/[0.04] transition-colors"
                    style={{ borderTop: `1px solid ${A(0.10)}`, color: "var(--accent-text)" }}
                  >
                    View all notifications
                  </NavLink>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar menu (the only place to sign out) */}
        <div className="relative" ref={avatarRef}>
          <button
            type="button"
            onClick={() => { setAvatarOpen((v) => !v); setBellOpen(false); }}
            className="flex h-9 items-center gap-1.5 rounded-xl px-2 transition-colors hover:bg-[var(--nav-bg-hover)]"
            style={{
              background: avatarOpen ? A(0.08) : undefined,
              border:     avatarOpen ? `1px solid ${A(0.20)}` : "1px solid transparent",
            }}
            aria-label="Account menu"
            aria-expanded={avatarOpen}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-black text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #2A62EC)` }}
              aria-hidden="true"
            >
              {(user?.name ?? cfg.portal).charAt(0).toUpperCase()}
            </div>
            <ChevronDown size={12} strokeWidth={2.5} className="text-slate-400" />
          </button>

          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                className="absolute right-0 top-full mt-2 w-52 z-50 rounded-2xl overflow-hidden"
                style={{
                  background: "#FFFFFF",
                  border:     `1px solid ${A(0.12)}`,
                  boxShadow:  "0 12px 36px rgba(0,0,0,0.10)",
                }}
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0,  scale: 1 }}
                exit={{    opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <div className="px-4 py-3" style={{ borderBottom: `1px solid ${A(0.08)}` }}>
                  <p className="text-xs font-bold text-text-primary truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>
                <nav className="py-1.5" aria-label="Account">
                  {cfg.menu.map(({ icon: Icon = User, label, to }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setAvatarOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:bg-ink/[0.06] hover:text-text-primary transition-colors"
                    >
                      <Icon size={14} strokeWidth={1.75} />
                      {label}
                    </NavLink>
                  ))}
                  <div style={{ borderTop: `1px solid ${A(0.08)}` }} className="mt-1.5 pt-1.5">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-[#B01F17] hover:bg-[#D1291F]/05 transition-colors"
                    >
                      <LogOut size={14} strokeWidth={1.75} />
                      Sign out
                    </button>
                  </div>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

// ── Rail ───────────────────────────────────────────────────────────────────────
function ShellRail({ cfg, expanded, pinned, onPin, width, onNavigate }) {
  return (
    <aside
      className="fixed left-0 z-40 flex flex-col"
      style={{
        top:     D_TOPBAR_H,
        bottom:  0,
        width:   width ?? (expanded ? D_RAIL_EXP : D_RAIL_W),
        transition: "width 0.22s ease",
        background: "#F5F6FA",
        borderRight: width === 0 ? "none" : `1px solid ${A(0.10)}`,
        overflow: "hidden",
      }}
      inert={width === 0 ? true : undefined}
    >
      {expanded && onPin && (
        <div className="flex items-center justify-end px-3 pt-2 pb-1 shrink-0">
          <button
            type="button"
            onClick={onPin}
            title={pinned ? "Unpin navigation" : "Pin navigation open"}
            aria-label={pinned ? "Unpin navigation" : "Pin navigation open"}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-ink/[0.06] hover:text-text-primary transition-colors"
          >
            {pinned ? <PinOff size={13} strokeWidth={2} /> : <Pin size={13} strokeWidth={2} />}
          </button>
        </div>
      )}

      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden" aria-label={`${cfg.portal} navigation`}>
        {cfg.nav.map((g) => (
          <div key={g.label} role="group" aria-label={g.label}>
            <RailSection label={g.label} expanded={expanded} />
            {g.items.map((it) => <RailItem key={it.to} {...it} expanded={expanded} onNavigate={onNavigate} />)}
          </div>
        ))}
      </nav>

      {cfg.bottomNav?.length > 0 && (
        <div className="shrink-0 py-2 border-t border-border-subtle">
          {cfg.bottomNav.map((it) => <RailItem key={it.to} {...it} expanded={expanded} onNavigate={onNavigate} />)}
        </div>
      )}
    </aside>
  );
}

/**
 * cfg = {
 *   role: "director" | "manager" | …   → data-role (accent tokens)
 *   portal, portalSub, label            → rail header + top bar identity
 *   nav: [{ label, items: [{ icon, label, to, end?, badge? }] }], bottomNav?: [item]
 *   menu: [{ icon, label, to }]          → avatar menu links (Sign out is always last)
 *   notifTarget?(n) → { to, label } | null, notifLabel?(n), notificationsPath?
 *   topbarExtra?: node, storageKey
 *   phoneDrawer?: true → under 640px the rail is hidden and the menu button opens it over the page (E-1, employees)
 * }
 * notifSignal: bump to refetch the bell. aiPanel: ({ open, onClose }) => node; omit to hide the AI slot.
 */
export default function PortalShell({ cfg, notifSignal, aiPanel: aiPanelProp, children }) {
  // U-1 (D-131): Settings → Preferences can switch the AI panel off.
  const aiOff = useAuthStore((s) => s.user?.settings?.preferences?.aiPanel === false);
  const aiPanel = aiOff ? undefined : aiPanelProp;
  const [aiOpen, setAiOpen] = useState(false);
  const [railPinned, setRailPinned] = useState(() => {
    try {
      const stored = localStorage.getItem(cfg.storageKey);
      return stored === null ? true : stored === "1";
    } catch { return true; }
  });
  const [railHovered, setRailHovered] = useState(false);
  const [phone, setPhone] = useState(() => !!cfg.phoneDrawer && window.matchMedia(PHONE_MQ).matches);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => {
    if (!cfg.phoneDrawer) return undefined;
    const mq = window.matchMedia(PHONE_MQ);
    const on = () => { setPhone(mq.matches); setDrawer(false); };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [cfg.phoneDrawer]);
  useEffect(() => {
    if (!drawer) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setDrawer(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);
  const railExpanded = phone ? drawer : railPinned || railHovered;

  function togglePin() {
    if (phone) { setDrawer((v) => !v); return; }
    const next = !railPinned;
    setRailPinned(next);
    try { localStorage.setItem(cfg.storageKey, next ? "1" : "0"); } catch { /* storage blocked */ }
    if (!next) setRailHovered(false);
  }

  // AI panel via Ctrl+J (only when the portal has one)
  useEffect(() => {
    if (!aiPanel) return undefined;
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "j") { e.preventDefault(); setAiOpen((v) => !v); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [aiPanel]);

  const railW = phone ? 0 : railExpanded ? D_RAIL_EXP : D_RAIL_W;
  const closeAi = useCallback(() => setAiOpen(false), []);

  return (
    <div className="bg-bg-base font-sans text-text-primary antialiased" data-role={cfg.role}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-text-primary">
        Skip to content
      </a>
      <ShellTopbar
        cfg={cfg}
        notifSignal={notifSignal}
        railExpanded={railExpanded}
        onToggleRail={togglePin}
        onAiToggle={aiPanel ? () => setAiOpen((v) => !v) : null}
        aiOpen={aiOpen}
        phone={phone}
      />

      {phone ? (<>
        {drawer && <div aria-hidden="true" className="fixed inset-0 z-30" style={{ top: D_TOPBAR_H, background: "rgba(20,32,61,0.3)" }} onClick={() => setDrawer(false)} />}
        <ShellRail cfg={cfg} expanded={drawer} width={drawer ? D_RAIL_EXP : 0} onNavigate={() => setDrawer(false)} />
      </>) : (
      /* Rail hover zone (only when not pinned) */
      <div
        className="fixed left-0 z-40"
        style={{ top: D_TOPBAR_H, bottom: 0, width: D_RAIL_W }}
        onMouseEnter={() => !railPinned && setRailHovered(true)}
        onMouseLeave={() => !railPinned && setRailHovered(false)}
      >
        <ShellRail cfg={cfg} expanded={railExpanded} pinned={railPinned} onPin={togglePin} />
      </div>
      )}

      {aiPanel?.({ open: aiOpen, onClose: closeAi })}

      <main
        id="main"
        tabIndex={0}
        aria-label={`${cfg.portal} main content`}
        className="fixed overflow-y-auto focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset focus-visible:outline-none"
        style={{
          top:    D_TOPBAR_H,
          left:   railW,
          right:  aiOpen ? AI_W : 0,
          bottom: 0,
          transition: "left 0.22s ease, right 0.26s ease",
        }}
      >
        <Outlet />
        {children}
      </main>

      <ToastContainer />
    </div>
  );
}
