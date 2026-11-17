import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Building2, Loader2, Zap, Check, ImageUp } from "lucide-react";
import BrandingCard from "./BrandingCard";
import api       from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import { useRoleTheme } from "@/utils/roleTheme";

import TallyLoader from "@/components/ui/TallyLoader";
import PageHeader from "@/components/ui/PageHeader";
import { fmtDate as dateStd } from "@/lib/dates";
// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return dateStd(d);
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

// ── Page ──────────────────────────────────────────────────────────────────────
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
      });
      addToast({ type: "success", message: "Workspace settings saved." });
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Save failed." });
    } finally {
      setSaving(false);
    }
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

        {/* ── Gamification rules moved to Settings > Gamification (UI-E1): one place, with bounds, preview and restore ── */}
        <Section icon={Zap} title="Gamification rules" description="XP multipliers, the streak bonus and badge numbers are now edited in Settings." delay={0.15}>
          <Link to="/director/settings?section=gamification" className="inline-flex h-10 items-center rounded-xl border border-border-subtle bg-white px-4 text-sm font-bold text-text-primary hover:bg-ink/[0.04]">
            Open Settings, Gamification
          </Link>
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
