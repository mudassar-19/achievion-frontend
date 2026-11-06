import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, CheckCircle2, XCircle, Users, FolderKanban, UserCog, Pencil, X, Check, Loader2, Mail, Building2, Calendar, Activity, AlertTriangle, RefreshCw, Lock, LogOut, Monitor, Eye, EyeOff, Clock } from "lucide-react";
import useAuthStore  from "@/stores/authStore";
import useUiStore    from "@/stores/uiStore";
import api           from "@/lib/api";

import TallyLoader from "@/components/ui/TallyLoader";
import PageHeader from "@/components/ui/PageHeader";
import { avatarUrl } from "@/lib/avatar";
const ACCENT = "#4B2FC4";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function timeAgo(d) {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)     return "just now";
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function initials(name) {
  return (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function dicebearUrl(seed) {
  return avatarUrl("bottts", seed ?? "director", { backgroundColor: ["0f1e3a"] });
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, suffix = "", color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="flex flex-col items-center justify-center py-5 rounded-2xl gap-1 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07]"
    >
      <Icon size={18} strokeWidth={1.75} style={{ color }} />
      <p className="text-3xl font-black tabular-nums leading-none mt-1" style={{ color }}>
        {value}<span className="text-lg">{suffix}</span>
      </p>
      <p className="text-[14px] font-semibold text-slate-500 uppercase tracking-wider text-center px-2">{label}</p>
    </motion.div>
  );
}

// ── Activity bar (approved vs rejected) ──────────────────────────────────────
function ActivityBar({ approved, rejected, pending, label }) {
  const total = approved + rejected + pending;
  const approvedPct = total > 0 ? (approved / total) * 100 : 0;
  const rejectedPct = total > 0 ? (rejected / total) * 100 : 0;
  const pendingPct  = total > 0 ? (pending  / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] font-black uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <div className="h-2 rounded-full overflow-hidden flex bg-ink/[0.05]">
        <motion.div
          className="h-full rounded-l-full"
          style={{ background: "#12803B", width: `${approvedPct}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${approvedPct}%` }}
          transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
        />
        <motion.div
          className="h-full"
          style={{ background: "#D1291F", width: `${rejectedPct}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${rejectedPct}%` }}
          transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
        />
        <motion.div
          className="h-full rounded-r-full"
          style={{ background: "#E8590C", width: `${pendingPct}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${pendingPct}%` }}
          transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
        />
      </div>
      <div className="flex gap-4 text-[14px] font-semibold">
        <span className="flex items-center gap-1 text-[#0E6A30]"><span className="h-1.5 w-1.5 rounded-full bg-[#12803B]" />{approved} Approved</span>
        <span className="flex items-center gap-1 text-[#B01F17]"><span className="h-1.5 w-1.5 rounded-full bg-[#D1291F]" />{rejected} Rejected</span>
        <span className="flex items-center gap-1 text-[#9A3A06]"><span className="h-1.5 w-1.5 rounded-full bg-[#E8590C]" />{pending} Pending</span>
      </div>
    </div>
  );
}

// ── Audit event row ────────────────────────────────────────────────────────────
const EVENT_CFG = {
  role_change:             { label: "Role Change",              color: "#1948BD", icon: UserCog },
  account_status_change:   { label: "Status Change",            color: "#9A3A06", icon: Activity },
  account_deleted:         { label: "Account Deleted",          color: "#B01F17", icon: XCircle },
  employee_created:        { label: "Employee Created",         color: "#0E6A30", icon: CheckCircle2 },
  GAMIFICATION_RESET:      { label: "Gamification Reset",       color: "#B01F17", icon: RefreshCw },
  ORG_CREATED:             { label: "Org Created",              color: "#1948BD", icon: Building2 },
  DIRECTOR_SETUP:          { label: "Director Setup",           color: "#1948BD", icon: ShieldCheck },
  settings_updated:        { label: "Settings Updated",         color: "#4B2FC4", icon: Activity },
  workspace_updated:       { label: "Workspace Settings Updated", color: "#4B2FC4", icon: Activity },
  portfolio_view_saved:    { label: "Portfolio View Saved",     color: "#0E6A30", icon: CheckCircle2 },
  portfolio_view_updated:  { label: "Portfolio View Updated",   color: "#4B2FC4", icon: Activity },
  portfolio_view_deleted:  { label: "Portfolio View Deleted",   color: "#B01F17", icon: XCircle },
};

function firstChangedField(before, after) {
  if (!before && !after) return "";
  const b = before ?? {};
  const a = after  ?? {};
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  const changed = keys.find(k => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
  if (!changed) return "";
  const bv = b[changed] !== undefined ? String(b[changed]) : "—";
  const av = a[changed] !== undefined ? String(a[changed]) : "—";
  return `${changed.replace(/_/g,"  ")}: ${bv} → ${av}`;
}

function eventDetail(log) {
  if (log.action === "role_change" && log.oldRole && log.newRole) return `${log.oldRole} → ${log.newRole}`;
  if (log.action === "account_status_change" && log.newStatus)    return `Status → ${log.newStatus}`;
  if (log.action === "account_deleted")                            return "Account removed";
  if (log.action === "employee_created" && log.newRole)           return `Joined as ${log.newRole}`;
  if ((log.action === "settings_updated" || log.action === "workspace_updated") && (log.before || log.after))
    return firstChangedField(log.before, log.after);
  if (log.action === "portfolio_view_saved" && log.details?.name)    return `"${log.details.name}"`;
  if (log.action === "portfolio_view_updated" && log.details?.name)  return `"${log.details.name}"`;
  if (log.action === "portfolio_view_deleted" && log.details?.name)  return `"${log.details.name}" removed`;
  if (log.detail)                                                  return log.detail;
  return "";
}

function EventRow({ log }) {
  const cfg  = EVENT_CFG[log.action] ?? { label: log.action, color: "#4F5B75", icon: Activity };
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-ink/[0.04] last:border-0">
      <div
        className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30` }}
      >
        <Icon size={14} strokeWidth={2} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-text-primary truncate">
          {log.targetName ? `${log.targetName}` : cfg.label}
        </p>
        <p className="text-[14px] text-slate-600 truncate">{eventDetail(log) || cfg.label}</p>
      </div>
      <span className="text-[14px] text-slate-600 shrink-0">{timeAgo(log.createdAt)}</span>
    </div>
  );
}

// ── Edit name modal ────────────────────────────────────────────────────────────
function EditNameModal({ current, onSave, onClose }) {
  const [val,  setVal]  = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const addToast = useUiStore((s) => s.addToast);

  async function handleSave() {
    if (!val.trim() || val.trim() === current) { onClose(); return; }
    setBusy(true);
    try {
      const data = await api.patch("/api/auth/me", { name: val.trim() });
      onSave(data.user?.name ?? val.trim());
      addToast({ type: "success", message: "Name updated." });
      onClose();
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Update failed." });
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1,    opacity: 1 }}
        exit={{   scale: 0.92, opacity: 0 }}
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
          aria-label="Display name"
          autoFocus
          className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20 mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={busy || !val.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold text-text-primary disabled:opacity-40 transition-colors"
            style={{ background: ACCENT }}
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

// ── Password strength ────────────────────────────────────────────────────────
function pwStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#B01F17", "#E8590C", "#7A5200", "#0E6A30"];
  return { score, label: labels[score], color: colors[score] };
}

// ── Security tab ─────────────────────────────────────────────────────────────
function SecurityTab({ user }) {
  const addToast = useUiStore((s) => s.addToast);
  const [current,  setCurrent]  = useState("");
  const [newPw,    setNewPw]    = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  const strength = pwStrength(newPw);
  const pwMatch  = newPw === confirm;
  const canSave  = current && strength.score >= 2 && pwMatch && newPw.length >= 8;

  async function handleChangePw(e) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await api.patch("/api/auth/password", { currentPassword: current, newPassword: newPw });
      addToast({ type: "success", message: "Password updated." });
      setCurrent(""); setNewPw(""); setConfirm("");
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Password change failed." });
    } finally { setSaving(false); }
  }

  // Mock active sessions (backend pending)
  const sessions = [
    { id: "cur", device: "Current device", browser: "Current session", ip: "—", lastSeen: new Date(), current: true },
  ];

  return (
    <div className="flex flex-col gap-6">

      {/* Change password */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] p-6"
      >
        <div className="flex items-center gap-2.5 mb-5">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${ACCENT}18` }}>
            <Lock size={15} style={{ color: ACCENT }} strokeWidth={1.75} />
          </div>
          <h2 className="text-sm font-bold text-text-primary">Change Password</h2>
        </div>

        <form onSubmit={handleChangePw} className="flex flex-col gap-4 max-w-sm">
          {/* Current password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Current password</label>
            <div className="relative">
              <input
                type={showCur ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
                className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2.5 pr-10 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20 transition-colors"
              />
              <button type="button" onClick={() => setShowCur(!showCur)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-text-primary transition-colors"
                aria-label={showCur ? "Hide password" : "Show password"}
              >
                {showCur ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">New password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2.5 pr-10 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20 transition-colors"
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-text-primary transition-colors"
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {/* Strength meter */}
            {newPw && (
              <div className="flex flex-col gap-1">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex-1 rounded-full transition-all duration-300"
                      style={{ background: i <= strength.score ? strength.color : "rgba(20,32,61,0.1)" }}
                    />
                  ))}
                </div>
                {strength.label && (
                  <p className="text-[11px] font-semibold" style={{ color: strength.color }}>{strength.label}</p>
                )}
              </div>
            )}
          </div>

          {/* Confirm */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              autoComplete="new-password"
              className={[
                "w-full bg-ink/[0.04] border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20 transition-colors",
                confirm && !pwMatch ? "border-[#D1291F]/50" : "border-ink/[0.08]",
              ].join(" ")}
            />
            {confirm && !pwMatch && <p className="text-[11px] text-[#B01F17]">Passwords do not match.</p>}
          </div>

          <button
            type="submit"
            disabled={!canSave || saving}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-40"
            style={{ background: ACCENT }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Update password
          </button>
        </form>
      </motion.div>

      {/* Active sessions */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}
        className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${ACCENT}18` }}>
              <Monitor size={15} style={{ color: ACCENT }} strokeWidth={1.75} />
            </div>
            <h2 className="text-sm font-bold text-text-primary">Active Sessions</h2>
          </div>
          <button
            type="button"
            onClick={() => addToast({ type: "info", message: "Sign out other devices — backend pending." })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-ink/[0.1] text-slate-400 hover:text-text-primary hover:border-ink/20 transition-colors"
          >
            <LogOut size={11} /> Sign out other devices
          </button>
        </div>

        {sessions.map((ses) => (
          <div key={ses.id} className="flex items-center gap-3 py-3 border-b border-ink/[0.04] last:border-0">
            <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 bg-ink/[0.05]">
              <Monitor size={14} className="text-slate-500" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-text-primary">{ses.device}</p>
                {ses.current && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: "#0E6A30" }}
                  >Current</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">{ses.browser} · {ses.ip}</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
              <Clock size={10} /> just now
            </div>
          </div>
        ))}

        <p className="text-[11px] text-slate-500 mt-3">
          Full session tracking requires backend integration (D-020).
        </p>

        {/* Last login */}
        {user?.lastLogin && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-ink/[0.05]">
            <Clock size={12} className="text-slate-500" />
            <p className="text-[11px] text-slate-500">
              Last login: {new Date(user.lastLogin).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        )}
      </motion.div>

    </div>
  );
}

// ── DirectorProfilePage ───────────────────────────────────────────────────────
export default function DirectorProfilePage() {
  const user    = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [data,      setData]     = useState(null);
  const [loading,   setLoading]  = useState(true);
  const [editName,  setEditName] = useState(false);
  const [name,      setName]     = useState(user?.name ?? "");
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    api.get("/api/director/profile")
      .then((d) => {
        setData(d);
        setName(d.name ?? user?.name ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <TallyLoader />
      </div>
    );
  }

  const stats      = data?.stats      ?? {};
  const recentLogs = data?.recentLogs ?? [];
  const org        = data?.org        ?? {};
  const email      = data?.email      ?? user?.email ?? "—";
  const dept       = data?.department;

  const STAT_CARDS = [
    { icon: Users,        label: "Members Managed",  value: stats.memberCount    ?? 0, color: "var(--accent-text)" },
    { icon: FolderKanban, label: "Active Projects",  value: stats.activeProjects ?? 0, color: ACCENT              },
    { icon: CheckCircle2, label: "HR Approved",      value: stats.hrApproved     ?? 0, color: "#0E6A30"           },
    { icon: AlertTriangle,label: "Pending HR",       value: stats.hrPending      ?? 0, color: "#9A3A06"           },
  ];

  return (
    <>
      <AnimatePresence>
        {editName && (
          <EditNameModal
            current={name}
            onClose={() => setEditName(false)}
            onSave={(newName) => {
              setName(newName);
              if (setUser) setUser({ ...user, name: newName });
            }}
          />
        )}
      </AnimatePresence>

      <div className="px-4 sm:px-8 py-8 min-h-full max-w-[1280px] mx-auto flex flex-col gap-6">

        {/* Heading */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <PageHeader title="Profile & Security" subtitle="Account overview, security settings, and active sessions." />
        </motion.div>

        {/* ── Tab bar ───────────────────────────────────────────────────────── */}
        <div className="flex gap-1 border-b border-ink/[0.07] -mt-2">
          {[{ id: "profile", label: "Profile" }, { id: "security", label: "Security" }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "border-current"
                  : "border-transparent text-slate-500 hover:text-text-primary",
              ].join(" ")}
              style={activeTab === tab.id ? { color: ACCENT, borderColor: ACCENT } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "security" && <SecurityTab user={user} />}

        {activeTab === "profile" && <>

        {/* ── Hero card ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-2xl p-px"
          style={{
            background: `linear-gradient(135deg, ${ACCENT}55 0%, ${ACCENT}22 50%, rgba(20,32,61,0.3) 100%)`,
            boxShadow:  `0 8px 40px ${ACCENT}22, 0 4px 20px rgba(0,0,0,0.6)`,
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `linear-gradient(${ACCENT} 1px, transparent 1px), linear-gradient(90deg, ${ACCENT} 1px, transparent 1px)`,
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
                className="absolute -inset-1 rounded-full opacity-50 blur"
                style={{ background: `conic-gradient(from 0deg, ${ACCENT}, #FFFFFF, ${ACCENT})` }}
              />
              <div className="relative h-24 w-24 rounded-full overflow-hidden border-2" style={{ borderColor: ACCENT }}>
                <div className="absolute inset-0 flex items-center justify-center bg-[#EAEDF4] z-0">
                  <span className="text-2xl font-black" style={{ color: ACCENT }}>{initials(name)}</span>
                </div>
                <img src={dicebearUrl(name)} alt={name} className="relative z-10 h-full w-full object-cover" />
              </div>
              {/* Authority icon instead of level badge */}
              <div
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full border-2 border-[#FFFFFF] flex items-center justify-center"
                style={{ background: ACCENT }}
              >
                <ShieldCheck size={13} strokeWidth={2.5} className="text-text-primary" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col gap-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h2 className="text-2xl font-black text-text-primary">{name}</h2>
                <button
                  onClick={() => setEditName(true)}
                  aria-label="Edit display name"
                  className="min-h-[2rem] min-w-[2rem] flex items-center justify-center rounded text-slate-600 hover:text-slate-700 transition-colors"
                >
                  <Pencil size={13} />
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap justify-center sm:justify-start mt-0.5">
                <span className="flex items-center gap-1"><ShieldCheck size={11} />Director</span>
                {dept && <span className="flex items-center gap-1"><Building2 size={11} />{dept}</span>}
                <span className="flex items-center gap-1"><Mail size={11} />{email}</span>
                {org.name && <span className="flex items-center gap-1"><Building2 size={11} />{org.name}</span>}
              </div>

              {/* Authority badges instead of XP/Level/Gold */}
              <div className="flex items-center gap-2 mt-2 flex-wrap justify-center sm:justify-start">
                <span
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border"
                  style={{ background: `${ACCENT}18`, borderColor: `${ACCENT}40`, color: ACCENT }}
                >
                  <ShieldCheck size={11} /> System Authority
                </span>
                {org.orgId && (
                  <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-ink/[0.08] text-slate-400">
                    {org.orgId}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-ink/[0.08] text-slate-500">
                  <Calendar size={10} /> Since {fmtDate(data?.createdAt)}
                </span>
              </div>
            </div>

            {/* Quick summary on the right */}
            <div className="shrink-0 grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { label: "Projects",  value: stats.activeProjects ?? 0, color: ACCENT },
                { label: "Members (excl. Director)", value: stats.memberCount ?? 0, color: "var(--accent-text)" },
                { label: "HR Approved", value: stats.hrApproved ?? 0,   color: "#0E6A30" },
                { label: "HR Pending",  value: stats.hrPending  ?? 0,   color: "#9A3A06" },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center px-4 py-2.5 rounded-xl border border-ink/[0.06] bg-ink/[0.03]"
                >
                  <p className="text-xl font-black tabular-nums" style={{ color }}>{value}</p>
                  <p className="text-[14px] font-bold uppercase tracking-wider text-slate-600">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── 4-stat row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STAT_CARDS.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.06} />)}
        </div>

        {/* ── Activity panels ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* HR & employee approval activity */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-2xl p-5 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] flex flex-col gap-4"
          >
            <div className="flex items-center gap-2">
              <Users size={14} strokeWidth={2} style={{ color: ACCENT }} />
              <p className="text-[14px] font-bold uppercase tracking-[0.15em] text-slate-500">HR & Employee Approvals</p>
            </div>
            <ActivityBar
              approved={stats.hrApproved ?? 0}
              rejected={stats.hrRejected ?? 0}
              pending={stats.hrPending   ?? 0}
              label="Request breakdown"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[
                { label: "HR Approved",  value: stats.hrApproved ?? 0,  color: "#0E6A30" },
                { label: "HR Rejected",  value: stats.hrRejected ?? 0,  color: "#B01F17" },
                { label: "Role Changes", value: stats.roleChanges ?? 0, color: ACCENT     },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center p-3 rounded-xl bg-ink/[0.03] border border-ink/[0.05]">
                  <p className="text-lg font-black tabular-nums" style={{ color }}>{value}</p>
                  <p className="text-[14px] font-bold uppercase tracking-wider text-slate-600 text-center mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Recent system events ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="rounded-2xl p-5 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07]"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} strokeWidth={2} style={{ color: ACCENT }} />
            <p className="text-[14px] font-bold uppercase tracking-[0.15em] text-slate-500">Recent System Events</p>
          </div>
          {recentLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-700">
              <Activity size={28} strokeWidth={1.2} className="mb-2" />
              <p className="text-xs font-medium">No system events recorded yet.</p>
            </div>
          ) : (
            recentLogs.map((log) => <EventRow key={String(log.id)} log={log} />)
          )}
        </motion.div>

        {/* ── Account details ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="rounded-2xl p-5 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07]"
        >
          <p className="text-[14px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-4">Account Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            {[
              { icon: ShieldCheck, label: "Full Name",    value: name },
              { icon: Mail,        label: "Email",        value: email },
              { icon: ShieldCheck, label: "Role",         value: "Director" },
              { icon: Building2,   label: "Organization", value: org.name },
              { icon: Calendar,    label: "Member Since", value: fmtDate(data?.createdAt) },
              { icon: FolderKanban,label: "Projects",     value: stats.activeProjects ?? 0 },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 py-3 border-b border-ink/[0.04]">
                <Icon size={13} className="text-slate-600 shrink-0" strokeWidth={1.75} />
                <span className="text-xs text-slate-500 w-28 shrink-0">{label}</span>
                <span className="text-xs font-semibold text-slate-300">{value || "—"}</span>
              </div>
            ))}
          </div>
        </motion.div>

        </>}  {/* end activeTab === "profile" */}

      </div>
    </>
  );
}
