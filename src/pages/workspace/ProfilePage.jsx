import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare, Clock, Flame, Zap, Coins,
  Pencil, X, Check, Loader2,
  Shield, Building2, Mail, User, Award,
  TrendingUp, Calendar, Star, Target, AlertTriangle,
  BarChart2, Activity, Layers, Users, GitBranch,
  Filter, RefreshCw, Eye,
  Snowflake, CheckCircle, XCircle, Timer,
} from "lucide-react";
import useAuthStore     from "@/stores/authStore";
import useGamificationStore from "@/stores/gamificationStore";
import PageHeader from "@/components/ui/PageHeader";
import { useRoleTheme } from "@/utils/roleTheme";
import api              from "@/lib/api";
import useUiStore       from "@/stores/uiStore";
import { avatarUrl } from "@/lib/avatar";
import { frameStyle, badgeEmoji, titleMeta } from "@/utils/shopCosmetics";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTimeAgo(d) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function initials(name) {
  return (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function dicebearUrl(seed) {
  return avatarUrl("bottts", seed ?? "default", { backgroundColor: ["0f1e3a"] });
}

// ─── XP Bar ──────────────────────────────────────────────────────────────────
function XpBar({ current, max, accent }) {
  const pct = Math.min(100, Math.round(((current ?? 0) / (max || 1000)) * 100));
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between text-[14px] font-semibold text-slate-500">
        <span>Level progress</span>
        <span className="tabular-nums">{(current ?? 0).toLocaleString()} / {(max ?? 1000).toLocaleString()} XP</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-ink/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ background: `linear-gradient(90deg, ${accent}, ${accent}99)`, boxShadow: "var(--shadow-1)" }}
        />
      </div>
    </div>
  );
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({ title, subtitle, icon: Icon, accent, children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay }}
      className={`rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-ink/[0.05]">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}18` }}>
          <Icon size={14} style={{ color: accent }} />
        </div>
        <div>
          <p className="text-xs font-bold text-text-primary leading-none">{title}</p>
          {subtitle && <p className="text-[14px] text-slate-600 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, suffix = "", sub, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="flex flex-col items-center justify-center py-5 px-3 rounded-2xl gap-1 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07]"
    >
      <Icon size={17} strokeWidth={1.75} style={{ color }} />
      <p className="text-2xl font-black tabular-nums leading-none mt-1" style={{ color }}>
        {value ?? "—"}<span className="text-sm font-bold">{suffix}</span>
      </p>
      <p className="text-[14px] font-semibold text-slate-500 uppercase tracking-wider text-center">{label}</p>
      {sub && <p className="text-[14px] text-slate-600 text-center">{sub}</p>}
    </motion.div>
  );
}

// ─── Badge Pill ───────────────────────────────────────────────────────────────
function BadgePill({ name, earnedAt, rarity, accent }) {
  const rarityColor = rarity === "Legendary" ? "#7A5200"
    : rarity === "Epic" ? "#1948BD"
    : rarity === "Rare" ? "#1948BD"
    : accent;
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold"
      style={{ background: `${rarityColor}12`, borderColor: `${rarityColor}33`, color: rarityColor }}
    >
      <Award size={12} />
      <span className="truncate">{name}</span>
      {earnedAt && <span className="text-[14px] opacity-50 ml-auto shrink-0">{fmtDate(earnedAt)}</span>}
    </div>
  );
}

// ─── Risk Badge ───────────────────────────────────────────────────────────────
const RISK_CFG = {
  Critical: { bg: "bg-red-500/15",    text: "text-red-400",    border: "border-red-500/25" },
  High:     { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/25" },
  Medium:   { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/25" },
  Low:      { bg: "bg-emerald-500/15",text: "text-emerald-400",border: "border-emerald-500/25" },
};
function RiskBadge({ level }) {
  const c = RISK_CFG[level] ?? RISK_CFG.Low;
  return (
    <span className={`text-[14px] font-bold px-1.5 py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`}>{level}</span>
  );
}

// ─── Project Status Chip ──────────────────────────────────────────────────────
const STATUS_CFG = {
  "In Progress": { bg: "bg-blue-500/15",    text: "text-blue-400"    },
  "Completed":   { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  "On Hold":     { bg: "bg-yellow-500/15",  text: "text-yellow-400"  },
  "Frozen":      { bg: "bg-cyan-500/15",    text: "text-cyan-400"    },
  "At Risk":     { bg: "bg-red-500/15",     text: "text-red-400"     },
};
function StatusChip({ status }) {
  const c = STATUS_CFG[status] ?? { bg: "bg-ink/10", text: "text-slate-400" };
  return (
    <span className={`text-[14px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{status}</span>
  );
}

// ─── Activity Event Icon ──────────────────────────────────────────────────────
function actionMeta(action) {
  switch (action) {
    case "project_created":        return { icon: GitBranch, color: "#0E6A30", label: "Project created" };
    case "project_updated":        return { icon: Pencil,    color: "#1948BD", label: "Project updated" };
    case "project_status_changed": return { icon: Activity,  color: "#7A5200", label: "Status changed"  };
    case "project_frozen":         return { icon: Snowflake, color: "#137986", label: "Project frozen"  };
    case "project_unfrozen":       return { icon: Snowflake, color: "#168358", label: "Project unfrozen" };
    case "project_deleted":        return { icon: XCircle,   color: "#B01F17", label: "Project deleted" };
    case "project_xp_updated":     return { icon: Zap,       color: "#1948BD", label: "XP updated"     };
    case "role_change":            return { icon: Shield,    color: "#9A3A06", label: "Role change"     };
    default:                       return { icon: Activity,  color: "#3A4660", label: action?.replace(/_/g, " ") ?? "Event" };
  }
}

const FEED_CATEGORIES = ["All", "Projects", "Approvals", "Risk", "Gamification"];

// ─── Edit Name Modal ──────────────────────────────────────────────────────────
function EditNameModal({ current, onSave, onClose, theme }) {
  const [val, setVal]   = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const addToast = useUiStore((s) => s.addToast);

  async function handleSave() {
    if (!val.trim() || val.trim() === current) { onClose(); return; }
    setBusy(true);
    try {
      const data = await api.patch("/api/auth/me", { name: val.trim() });
      onSave(data.user);
      addToast({ type: "success", message: "Name updated!" });
      onClose();
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Update failed." });
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="w-full max-w-sm rounded-2xl bg-[#FFFFFF] border border-ink/[0.1] p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-text-primary">Edit Display Name</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
          placeholder="Your full name"
          autoFocus
          className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-ink/20 mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={busy || !val.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold text-accent-on disabled:opacity-40 transition-colors"
            style={{ background: theme.accent }}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, label, color, size = 80 }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, score ?? 0);
  const dash = circ * (pct / 100);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx={40} cy={40} r={r} fill="none" stroke="rgba(20,32,61,0.05)" strokeWidth={8} />
        <motion.circle
          cx={40} cy={40} r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
          transform="rotate(-90 40 40)"
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
        <text x={40} y={44} textAnchor="middle" fill="white" fontSize={14} fontWeight={900} fontFamily="sans-serif">
          {pct}
        </text>
      </svg>
      <p className="text-[14px] font-semibold text-slate-500 uppercase tracking-wider text-center">{label}</p>
    </div>
  );
}

// ─── ProfilePage ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const user     = useAuthStore((s) => s.user);
  const setUser  = useAuthStore((s) => s.setUser);
  const isViewAs = useAuthStore((s) => !!s.viewAs);
  const shopEquipped = useGamificationStore((s) => s.currentUser.shopEquipped ?? {});
  const theme    = useRoleTheme();

  const isManager = user?.role === "Manager";

  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [editName, setEditName] = useState(false);

  const [mgr,        setMgr]        = useState(null);
  const [mgrLoading, setMgrLoading] = useState(false);
  const [feedFilter, setFeedFilter] = useState("All");
  const [mgrError,   setMgrError]   = useState(null);

  useEffect(() => {
    api.get("/api/auth/profile")
      .then((d) => setProfile(d.profile))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadMgrData = useCallback(() => {
    if (!isManager) return;
    setMgrLoading(true);
    setMgrError(null);
    api.get("/api/auth/manager-profile-summary")
      .then((d) => setMgr(d.data))
      .catch((e) => setMgrError(e.message ?? "Failed to load"))
      .finally(() => setMgrLoading(false));
  }, [isManager]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadMgrData(); }, [loadMgrData]);

  const p = profile ?? {};
  const displayName   = p.name        ?? user?.name        ?? "—";
  const displayEmail  = p.email       ?? user?.email       ?? "—";
  const level         = p.level       ?? user?.level       ?? 1;
  const currentXp     = p.currentXp   ?? user?.currentXp   ?? 0;
  const maxXp         = p.maxXp       ?? user?.maxXp       ?? 1000;
  const gold          = p.gold        ?? user?.gold        ?? 0;
  const role          = p.role        ?? user?.role        ?? "—";
  const department    = p.department  ?? "—";
  const badges        = p.badges      ?? [];
  const tasksDone     = p.tasksDone   ?? 0;
  const onTimePct     = p.onTimePct   ?? 0;
  const longestStreak = p.longestStreak ?? 0;
  const currentStreak = p.currentStreak ?? 0;
  const recentXpLog   = p.recentXpLog ?? [];

  const ident      = mgr?.identity        ?? {};
  const projOvr    = mgr?.projectOverview ?? {};
  const teamPerf   = mgr?.teamPerformance ?? {};
  const approvStat = mgr?.approvalStats   ?? {};
  const effScore   = mgr?.efficiencyScore ?? null;
  const actFeed    = mgr?.activityFeed    ?? [];
  const mgrXp      = mgr?.recentXpActivity ?? [];

  const filteredFeed = actFeed.filter((e) => {
    if (feedFilter === "All") return true;
    if (feedFilter === "Projects")    return e.action?.startsWith("project_");
    if (feedFilter === "Approvals")   return e.action?.includes("approval");
    if (feedFilter === "Risk")        return e.action?.includes("risk") || e.action?.includes("escalat");
    if (feedFilter === "Gamification") return e.action?.includes("gamif") || e.action?.includes("xp");
    return true;
  });

  const STATS = [
    { icon: CheckSquare, label: "Tasks Done",     value: tasksDone,     suffix: "",  color: theme.text },
    { icon: Clock,       label: "On-Time %",      value: onTimePct,     suffix: "%", color: "#0E6A30"    },
    { icon: Flame,       label: "Best Streak",    value: longestStreak, suffix: "d", color: "#9A3A06"    },
    { icon: Zap,         label: "Current Streak", value: currentStreak, suffix: "d", color: "#7A5200"    },
  ];

  return (
    <>
      <AnimatePresence>
        {editName && (
          <EditNameModal
            current={displayName}
            theme={theme}
            onClose={() => setEditName(false)}
            onSave={(updatedUser) => {
              setProfile((prev) => ({ ...prev, name: updatedUser.name }));
              if (setUser) setUser(updatedUser);
            }}
          />
        )}
      </AnimatePresence>

      <div className={isManager ? "px-4 sm:px-8 py-8 min-h-full max-w-[1280px] mx-auto w-full flex flex-col gap-6" : "px-6 py-8 min-h-full max-w-[1200px] mx-auto flex flex-col gap-6"}>

{isManager ? (
        <PageHeader title="Profile" subtitle="Your account, your team at a glance, and security."
          secondary={{ label: mgrLoading ? "Updating…" : "Refresh", onClick: loadMgrData, disabled: mgrLoading }} />
      ) : (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="flex items-end justify-between"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600 mb-0.5">
              {isManager ? "Operations Intelligence" : "Character Sheet"}
            </p>
            <h1 className="text-3xl font-black text-text-primary">Profile</h1>
          </div>
          {isManager && (
            <button
              onClick={loadMgrData}
              disabled={mgrLoading}
              className="flex items-center gap-1.5 text-[14px] font-semibold text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg border border-ink/[0.06] hover:border-ink/[0.12]"
            >
              <RefreshCw size={11} className={mgrLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          )}
        </motion.div>
      )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={30} className="animate-spin" style={{ color: theme.text }} strokeWidth={1.5} />
          </div>
        ) : (
          <>
            {/* ── SECTION 1: Identity Hero Block ───────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="relative overflow-hidden rounded-2xl p-px"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}55 0%, ${theme.border} 50%, rgba(20,32,61,0.3) 100%)`,
                boxShadow:  `0 8px 40px ${theme.glow}, 0 4px 20px rgba(0,0,0,0.6)`,
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.025]"
                style={{
                  backgroundImage: `linear-gradient(${theme.accent} 1px, transparent 1px), linear-gradient(90deg, ${theme.accent} 1px, transparent 1px)`,
                  backgroundSize: "32px 32px",
                }}
              />
              <div
                className="relative rounded-[calc(1rem-1px)] flex flex-col sm:flex-row items-center sm:items-start gap-6 px-7 py-7"
                style={{ background: "linear-gradient(135deg, #EAEDF4 0%, #FFFFFF 100%)" }}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="absolute -inset-1 rounded-full opacity-60 blur"
                    style={{ background: `conic-gradient(from 0deg, ${theme.accent}, ${theme.border}, ${theme.accent})` }}
                  />
                  <div className="relative h-24 w-24 rounded-full overflow-hidden border-2"
                    style={{ borderColor: theme.accent, ...(frameStyle(shopEquipped?.frame) ?? {}) }}>
                    <div className="absolute inset-0 flex items-center justify-center bg-[#EAEDF4] z-0">
                      <span className="text-2xl font-black" style={{ color: theme.text }}>{initials(displayName)}</span>
                    </div>
                    <img
                      src={dicebearUrl(ident.avatarSeed ?? displayName)}
                      alt="avatar"
                      className="relative z-10 h-full w-full object-cover"
                    />
                    {badgeEmoji(shopEquipped?.badge) && (
                      <span className="absolute bottom-0.5 right-0.5 z-20 text-xl leading-none"
                        aria-label={`Equipped badge: ${shopEquipped.badge}`}>{badgeEmoji(shopEquipped.badge)}</span>
                    )}
                  </div>
                  {!isManager && ( /* D-081: no personal level for Managers */
                  <div
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full border-2 border-[#FFFFFF] flex items-center justify-center text-[14px] font-black text-accent-on"
                    style={{ background: theme.accent }}
                  >
                    {level}
                  </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col gap-1 text-center sm:text-left min-w-0">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h2 className="text-2xl font-black text-text-primary">{displayName}</h2>
                    <button onClick={() => setEditName(true)} aria-label="Edit name" title="Edit name" className="p-1 rounded text-slate-600 hover:text-slate-700 transition-colors">
                      <Pencil size={13} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap justify-center sm:justify-start mt-0.5">
                    <span className="flex items-center gap-1"><Shield size={11} />{role}</span>
                    {department !== "—" && <span className="flex items-center gap-1"><Building2 size={11} />{department}</span>}
                    <span className="flex items-center gap-1"><Mail size={11} />{displayEmail}</span>
                  </div>

                  {ident.activeTitle && (
                    <p className="text-[14px] font-semibold mt-0.5 text-center sm:text-left" style={{ color: theme.text }}>
                      ✦ {ident.activeTitle.name}
                    </p>
                  )}
                  {!ident.activeTitle && titleMeta(shopEquipped?.title) && (
                    <p className="text-[14px] font-bold mt-0.5 text-center sm:text-left"
                      style={{ color: titleMeta(shopEquipped.title).color }}>
                      ✦ {titleMeta(shopEquipped.title).label}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2 flex-wrap justify-center sm:justify-start">
                    {!isManager && (<>
                    <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: `${theme.accent}20`, color: theme.text }}>
                      <Zap size={11} />Level {level}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-400/15 text-yellow-400">
                      <Coins size={11} />{gold.toLocaleString()} Gold
                    </span>
                    </>)}
                    {!isManager && badges.length > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-400">
                        <Award size={11} />{badges.length} Badge{badges.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {isManager && projOvr.active !== undefined && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-400">
                        <Layers size={11} />{projOvr.active} Active Project{projOvr.active !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {!isManager && (
                  <div className="mt-3 w-full max-w-sm">
                    <XpBar current={currentXp} max={maxXp} accent={theme.accent} />
                  </div>
                  )}
                </div>

                {isManager && effScore !== null && (
                  <div className="shrink-0 hidden sm:flex">
                    <ScoreRing score={effScore} label="Efficiency" color={theme.accent} size={80} />
                  </div>
                )}
              </div>
            </motion.div>

            {/* ── SECTION 2: Performance Metrics (Manager only) ─────────── */}
            {isManager && (
              <div className="flex flex-col gap-4">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-[14px] font-bold uppercase tracking-[0.15em] text-slate-600"
                >
                  Performance Metrics
                </motion.p>

                {mgrLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 size={22} className="animate-spin" style={{ color: theme.text }} />
                  </div>
                ) : mgrError ? (
                  <div className="rounded-2xl bg-red-500/10 border border-red-500/20 px-5 py-4 text-xs text-red-400 flex items-center gap-2">
                    <AlertTriangle size={14} /> {mgrError}
                  </div>
                ) : (
                  <>
                    {/* Top metric cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <MetricCard
                        icon={Timer}
                        label="Avg Response"
                        value={approvStat.avgResponseHours !== null && approvStat.avgResponseHours !== undefined
                          ? approvStat.avgResponseHours
                          : "—"}
                        suffix={approvStat.avgResponseHours !== null ? "h" : ""}
                        sub="Approval response time"
                        color={theme.accent}
                        delay={0.05}
                      />
                      <MetricCard
                        icon={BarChart2}
                        label="Efficiency Score"
                        value={effScore}
                        suffix="%"
                        sub="Decision + delivery speed"
                        color="#1948BD"
                        delay={0.1}
                      />
                      <MetricCard
                        icon={Layers}
                        label="Projects Managed"
                        value={projOvr.total}
                        sub={`${projOvr.completed ?? 0} completed · ${projOvr.delayed ?? 0} delayed`}
                        color="#136386"
                        delay={0.15}
                      />
                      <MetricCard
                        icon={Users}
                        label="Task Completion"
                        value={teamPerf.taskCompletionRatio}
                        suffix="%"
                        sub={`${teamPerf.completedTasks ?? 0} / ${teamPerf.totalTasks ?? 0} tasks`}
                        color="#0E6A30"
                        delay={0.2}
                      />
                      <MetricCard
                        icon={AlertTriangle}
                        label="Approval Delay"
                        value={approvStat.approvalDelayRate}
                        suffix="%"
                        sub={`${approvStat.pending ?? 0} pending`}
                        color={approvStat.approvalDelayRate > 40 ? "#B01F17" : "#7A5200"}
                        delay={0.25}
                      />
                    </div>

                    {/* Detail panels row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <Section title="Project Oversight" subtitle="Active & risk overview" icon={Eye} accent={theme.accent} delay={0.1}>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                          {[
                            { label: "Total",     val: projOvr.total,     color: "text-slate-300" },
                            { label: "Active",    val: projOvr.active,    color: "text-blue-400"  },
                            { label: "Completed", val: projOvr.completed, color: "text-emerald-400" },
                            { label: "Frozen",    val: projOvr.frozen,    color: "text-cyan-400"  },
                            { label: "Delayed",   val: projOvr.delayed,   color: "text-rose-400"  },
                          ].map(({ label, val, color }) => (
                            <div key={label} className="flex flex-col">
                              <span className={`text-xl font-black tabular-nums ${color}`}>{val ?? 0}</span>
                              <span className="text-[14px] text-slate-600">{label}</span>
                            </div>
                          ))}
                        </div>
                      </Section>

                      <Section title="Team Performance" subtitle="Task & productivity" icon={Users} accent="#0E6A30" delay={0.13}>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                          {[
                            { label: "Total Tasks",  val: teamPerf.totalTasks,         color: "text-slate-300"  },
                            { label: "Completed",    val: teamPerf.completedTasks,      color: "text-emerald-400" },
                            { label: "Blocked",      val: teamPerf.blockedTasks,        color: "text-red-400"    },
                            { label: "On-Time %",    val: `${teamPerf.onTimePct ?? 0}%`,color: "text-yellow-400" },
                          ].map(({ label, val, color }) => (
                            <div key={label} className="flex flex-col">
                              <span className={`text-xl font-black tabular-nums ${color}`}>{val ?? 0}</span>
                              <span className="text-[14px] text-slate-600">{label}</span>
                            </div>
                          ))}
                        </div>
                      </Section>

                      <Section title="Approval Operations" subtitle="Request handling" icon={CheckCircle} accent="#7A5200" delay={0.16}>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                          {[
                            { label: "Total",    val: approvStat.total,    color: "text-slate-300"  },
                            { label: "Approved", val: approvStat.approved, color: "text-emerald-400" },
                            { label: "Rejected", val: approvStat.rejected, color: "text-rose-400"   },
                            { label: "Pending",  val: approvStat.pending,  color: "text-yellow-400" },
                          ].map(({ label, val, color }) => (
                            <div key={label} className="flex flex-col">
                              <span className={`text-xl font-black tabular-nums ${color}`}>{val ?? 0}</span>
                              <span className="text-[14px] text-slate-600">{label}</span>
                            </div>
                          ))}
                        </div>
                      </Section>

                      <Section title="Performance Rings" subtitle="Visual score summary" icon={Target} accent="#1948BD" delay={0.19}>
                        <div className="flex items-center justify-around gap-2">
                          <ScoreRing score={effScore}                     label="Efficiency" color={theme.accent} size={68} />
                          <ScoreRing score={teamPerf.taskCompletionRatio} label="Completion" color="#0E6A30"      size={68} />
                          <ScoreRing score={teamPerf.onTimePct}           label="On-Time"    color="#7A5200"      size={68} />
                        </div>
                      </Section>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── SECTION 3: Gamification Summary ──────────────────────── */}
            {!mgrLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Section title="Badges Earned" subtitle={`${badges.length} total`} icon={Award} accent={theme.accent} delay={0.18}>
                  {badges.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-700">
                      <Award size={28} strokeWidth={1.2} className="mb-2" />
                      <p className="text-xs font-medium">No badges yet — complete tasks to earn some!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                      {badges.map((b, i) => (
                        <BadgePill key={i} name={b.name} earnedAt={b.earnedAt} rarity={b.rarity} accent={theme.accent} />
                      ))}
                    </div>
                  )}
                </Section>

                <Section title="Recent XP Activity" subtitle="Last 20 events" icon={Zap} accent="#7A5200" delay={0.21}>
                  {(isManager ? mgrXp : recentXpLog).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-700">
                      <TrendingUp size={28} strokeWidth={1.2} className="mb-2" />
                      <p className="text-xs font-medium">No XP activity yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-ink/[0.04] max-h-64 overflow-y-auto pr-1">
                      {(isManager ? mgrXp : recentXpLog).map((l, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${theme.accent}20` }}>
                              <Zap size={11} style={{ color: theme.text }} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-300 capitalize">{l.source?.replace(/_/g, " ")}</p>
                              <p className="text-[14px] text-slate-600">{fmtTimeAgo(l.createdAt)}</p>
                            </div>
                          </div>
                          <span className="text-xs font-black tabular-nums" style={{ color: l.amount >= 0 ? theme.text : "#B01F17" }}>
                            {l.amount >= 0 ? "+" : ""}{l.amount} XP
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </div>
            )}

            {/* ── SECTION 4: Active Projects List (Manager only) ────────── */}
            {isManager && !mgrLoading && (projOvr.recentList?.length ?? 0) > 0 && (
              <Section title="Active Projects" subtitle="Current operational oversight" icon={Layers} accent="#136386" delay={0.24}>
                <div className="flex flex-col divide-y divide-ink/[0.04]">
                  {(projOvr.recentList ?? []).map((proj) => (
                    <div key={proj._id} className="flex items-center justify-between py-3 gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <GitBranch size={12} className="text-slate-600 shrink-0" />
                        <p className="text-xs font-semibold text-slate-200 truncate">{proj.title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <RiskBadge level={proj.riskLevel} />
                        <StatusChip status={proj.status} />
                        {proj.deadline && (
                          <span className="text-[14px] text-slate-600 hidden sm:block">Due {fmtDate(proj.deadline)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── SECTION 5: Activity Feed (Manager only) ───────────────── */}
            {isManager && !mgrLoading && (
              <Section title="Activity Feed" subtitle="Audit-trail of your operations" icon={Activity} accent="#1948BD" delay={0.28}>
                <div className="flex items-center gap-1.5 mb-4 -mt-1 flex-wrap">
                  <Filter size={11} className="text-slate-600 mr-1" />
                  {FEED_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFeedFilter(cat)}
                      className="text-[14px] font-bold px-2.5 py-1 rounded-full border transition-all"
                      style={feedFilter === cat
                        ? { background: `${theme.accent}25`, color: theme.text, borderColor: `${theme.accent}50` }
                        : { background: "transparent", color: "#4F5B75", borderColor: "rgba(20,32,61,0.07)" }
                      }
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {filteredFeed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-700">
                    <Activity size={28} strokeWidth={1.2} className="mb-2" />
                    <p className="text-xs font-medium">No activity events found.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0 max-h-80 overflow-y-auto pr-1">
                    {filteredFeed.map((event, i) => {
                      const meta = actionMeta(event.action);
                      const EventIcon = meta.icon;
                      return (
                        <motion.div
                          key={event._id ?? i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.03 }}
                          className="flex items-start gap-3 py-3 border-b border-ink/[0.04] last:border-0"
                        >
                          <div className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: `${meta.color}18` }}>
                            <EventIcon size={13} style={{ color: meta.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 flex-wrap">
                              <p className="text-xs font-semibold text-slate-200">{meta.label}</p>
                              {event.projectTitle && (
                                <span className="text-[14px] font-medium text-slate-500 truncate max-w-[180px]">
                                  – {event.projectTitle}
                                </span>
                              )}
                            </div>
                            {event.detail && (
                              <p className="text-[14px] text-slate-600 mt-0.5 line-clamp-1">{event.detail}</p>
                            )}
                          </div>
                          <span className="text-[14px] text-slate-600 shrink-0 mt-0.5">{fmtTimeAgo(event.createdAt)}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </Section>
            )}

            {/* ── SECTION 6: Account Details (always shown) ─────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3 }}
              className="rounded-2xl p-5 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07]"
            >
              <p className="text-[14px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-4">Account Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                {[
                  { icon: User,      label: "Full Name",    value: displayName },
                  { icon: Mail,      label: "Email",        value: displayEmail },
                  { icon: Shield,    label: "Role",         value: role },
                  { icon: Building2, label: "Department",   value: department },
                  { icon: Calendar,  label: "Member Since", value: fmtDate(p.createdAt) },
                  { icon: Star,      label: "HP",           value: isViewAs ? "Hidden in View as" : `${p.hp ?? user?.hp ?? 100} / 100` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 py-3 border-b border-ink/[0.04]">
                    <Icon size={13} className="text-slate-600 shrink-0" strokeWidth={1.75} />
                    <span className="text-xs text-slate-500 w-28 shrink-0">{label}</span>
                    <span className="text-xs font-semibold text-slate-300">{value || "—"}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── SECTION 7: Base stat cards (always shown) ─────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {STATS.map((s, i) => (
                <MetricCard key={s.label} {...s} delay={i * 0.06} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
