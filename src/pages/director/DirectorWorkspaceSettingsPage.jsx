import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Loader2, Zap, Check, ImageUp } from "lucide-react";
import BrandingCard from "./BrandingCard";
import api       from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import { useRoleTheme } from "@/utils/roleTheme";

import TallyLoader from "@/components/ui/TallyLoader";
import PageHeader from "@/components/ui/PageHeader";
// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, description, icon: Icon, delay = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] p-6"
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgb(var(--c-accent)/0.12)" }}>
          <Icon size={16} style={{ color: "var(--accent)" }} strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-text-primary">{title}</h2>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// ── Read-only field row ───────────────────────────────────────────────────────
function FieldRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-ink/[0.04] last:border-0">
      <span className="text-xs text-slate-500 sm:w-36 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-text-primary">{value || "—"}</span>
    </div>
  );
}

// ── Inline editable field ─────────────────────────────────────────────────────
function EditableField({ label, value, onChange }) {
  const id = `wf-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-ink/[0.04] last:border-0">
      <label htmlFor={id} className="text-xs text-slate-500 sm:w-36 shrink-0">{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-ink/[0.04] border border-ink/[0.08] rounded-lg px-3 py-2 text-xs text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/25 transition-colors"
      />
    </div>
  );
}

// ── Number config row ─────────────────────────────────────────────────────────
function NumberRow({ label, description, value, onChange, min = 0, max = 10, step = 0.1 }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-ink/[0.04] last:border-0">
      <div>
        <p className="text-xs font-semibold text-text-primary">{label}</p>
        {description && <p className="text-[14px] text-slate-600 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
          className="h-8 w-8 rounded-md bg-ink/[0.05] hover:bg-ink/[0.1] text-slate-400 text-sm font-bold flex items-center justify-center transition-colors"
        >
          −
        </button>
        <span className="w-12 text-center text-xs font-black tabular-nums" style={{ color: "var(--accent)" }}>{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}
          className="h-8 w-8 rounded-md bg-ink/[0.05] hover:bg-ink/[0.1] text-slate-400 text-sm font-bold flex items-center justify-center transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}


// ── Page ──────────────────────────────────────────────────────────────────────
const DEFAULT_GAMIFICATION = {
  xpMultipliers: {
    Feature:       1.0,
    Bug:           0.8,
    Design:        0.9,
    Testing:       0.7,
    DevOps:        0.9,
    Documentation: 0.5,
  },
  streakBonus:     1.1,
  badgeThresholds: { firstTask: 1, tenTasks: 10, streak7: 7, streak30: 30 },
};

export default function DirectorWorkspaceSettingsPage() {
  const theme    = useRoleTheme();
  const addToast = useUiStore((s) => s.addToast);

  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);

  // General fields
  const [orgName,      setOrgName]      = useState("");
  const [orgId,        setOrgId]        = useState("");
  const [adminEmail,   setAdminEmail]   = useState("");
  const [foundedDate,  setFoundedDate]  = useState("");
  const [memberCount,  setMemberCount]  = useState(0);
  const [companySize,  setCompanySize]  = useState("");
  const [gamification, setGamification] = useState(DEFAULT_GAMIFICATION);

  // Load workspace settings on mount
  useEffect(() => {
    api.get("/api/director/workspace-settings")
      .then((d) => {
        setOrgName(d.name        ?? "");
        setOrgId(d.orgId         ?? "");
        setAdminEmail(d.adminEmail ?? "");
        setFoundedDate(d.createdAt ?? "");
        setMemberCount(d.memberCount ?? 0);
        setCompanySize(d.companySize  ?? "");
        if (d.gamificationRules) {
          setGamification((prev) => ({ ...prev, ...d.gamificationRules }));
        }
      })
      .catch(() => addToast({ type: "error", message: "Failed to load workspace settings." }))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveGeneral() {
    setSaving(true);
    try {
      await api.patch("/api/director/workspace-settings", {
        name:              orgName.trim(),
        companySize,
        gamificationRules: gamification,
      });
      addToast({ type: "success", message: "Workspace settings saved." });
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  // Gamification helpers
  function setXpMult(type, val) {
    setGamification((prev) => ({
      ...prev,
      xpMultipliers: { ...prev.xpMultipliers, [type]: val },
    }));
  }
  function setStreakBonus(val) {
    setGamification((prev) => ({ ...prev, streakBonus: val }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <TallyLoader />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1280px] mx-auto flex flex-col gap-6">

        {/* Page heading */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <PageHeader title="Workspace Settings" subtitle="Organization-level configuration and gamification rules." />
        </motion.div>

        {/* ── General ─────────────────────────────────────────────────────── */}
        <Section icon={Building2} title="General" description="Basic organization information." delay={0.05}>
          <EditableField
            label="Organization Name"
            value={orgName}
            onChange={setOrgName}
          />
          <FieldRow label="Org ID"       value={orgId} />
          <FieldRow label="Admin Email"  value={adminEmail} />
          <FieldRow label="Founded"      value={fmtDate(foundedDate)} />
          <FieldRow label="Members (incl. Director)" value={memberCount.toLocaleString()} />
        </Section>

        {/* ── Branding (Batch 5, D7) ───────────────────────────────────────── */}
        <Section icon={ImageUp} title="Branding" description="Your organization's logo." delay={0.08}>
          <BrandingCard />
        </Section>

        {/* ── Gamification Rules ───────────────────────────────────────────── */}
        <Section icon={Zap} title="Gamification Rules" description="XP multipliers and streak bonuses applied to all tasks organization-wide." delay={0.15}>
          <p className="text-[14px] font-bold uppercase tracking-[0.12em] text-slate-600 mb-2">XP Multipliers by Task Type</p>
          {Object.entries(gamification.xpMultipliers).map(([type, val]) => (
            <NumberRow
              key={type}
              label={type}
              description={`Multiplied against base task XP for "${type}" tasks`}
              value={val}
              onChange={(v) => setXpMult(type, v)}
              min={0.1}
              max={5}
              step={0.1}
            />
          ))}
          <div className="mt-4 pt-4 border-t border-ink/[0.06]">
            <p className="text-[14px] font-bold uppercase tracking-[0.12em] text-slate-600 mb-2">Streak Bonus</p>
            <NumberRow
              label="Daily Streak Multiplier"
              description="Applied to XP when a member has an active streak"
              value={gamification.streakBonus}
              onChange={setStreakBonus}
              min={1.0}
              max={3.0}
              step={0.05}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-ink/[0.06]">
            <p className="text-[14px] font-bold uppercase tracking-[0.12em] text-slate-600 mb-2">Badge Unlock Thresholds</p>
            {Object.entries(gamification.badgeThresholds).map(([key, val]) => (
              <NumberRow
                key={key}
                label={{ streak7: "7-Day Streak", streak30: "30-Day Streak" }[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                value={val}
                onChange={(v) => setGamification((prev) => ({
                  ...prev,
                  badgeThresholds: { ...prev.badgeThresholds, [key]: Math.round(v) },
                }))}
                min={1}
                max={100}
                step={1}
              />
            ))}
          </div>
        </Section>

        {/* ── Save button ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex justify-end"
        >
          <button
            type="button"
            onClick={saveGeneral}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-text-primary disabled:opacity-40 transition-colors"
            style={{ background: theme.accent, boxShadow: `0 4px 16px ${theme.accent}44` }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            Save Changes
          </button>
        </motion.div>

    </div>
  );
}
