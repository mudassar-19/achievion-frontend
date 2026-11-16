import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Shield, Bell, Building2, Zap,
  Loader2, ChevronRight,
  Save, Users, Plus, Pencil, XCircle, Check, X,
} from "lucide-react";
import useUiStore from "@/stores/uiStore";
import api        from "@/lib/api";
import PageHeader  from "@/components/ui/PageHeader";
import { useSearchParams } from "react-router-dom";
import useAuthStore from "@/stores/authStore";
import { WorkingTimeSection, ExtensionSection, GamificationSection, AlertsSection, OrganizationSection } from "./settings/RulesSections";
import { RECOMMENDED, ALERT_DEFAULTS, withDefaults, alertRules, alertErrors, orgErrors, gamificationErrors, workingTimeErrors, extensionErrors, fromServer } from "./settings/rules";

const ACCENT = "#4B2FC4";

// ── Section definitions ───────────────────────────────────────────────────────
const SECTIONS = [
  { id: "working-time",     icon: Clock,     label: "Working Time" },
  { id: "extension-rules",  icon: Shield,    label: "Extension Rules" },
  { id: "gamification",     icon: Zap,       label: "Gamification" },
  { id: "alerts",           icon: Bell,      label: "Alerts" },
  { id: "organization",     icon: Building2, label: "Organization" },
  { id: "roles",            icon: Users,     label: "Custom Roles" },
]; // UI-E2 (item 42): AI, Security and Resource Bookings tabs removed. Custom Roles stays until its audit is decided.

function defaultState() {
  return {
    workingHoursPerDay: 7,
    weekendDays: [0, 6],
    extensionMaxDays: 3,
    extensionMaxPct: 20,
    extensionCumCapPct: 20,
    celebrationLevel: "Full",
    recapEnabled: true,
    rules: RECOMMENDED, // XP multipliers, streak bonus, badge numbers (saved through /workspace-settings)
    orgName: "",
    timezone: "Asia/Karachi",
    fiscalYear: "calendar",
    alertRules: ALERT_DEFAULTS, // org-wide rules (Alerts tab), kept inside alertSettings.orgRules
    alertsOther: {},            // anything else already stored in alertSettings; sent back unchanged
    aiSummaryEnabled: false,
    aiSummaryDay: 1,
    aiSummaryTime: "09:00",
    aiCostCapUsd: 1.0,
    escalationContactId: null,
  };
}

// Toggle, LabelRow and the Working Time / Extension Rules / Gamification sections: ./settings/RulesSections.jsx (UI-E1).

// The AI, Security and Resource Bookings tabs were removed in UI-E2 (item 42). Alerts and Organization sections:
// ./settings/RulesSections.jsx (UI-E1b).

// ── Custom Roles section ──────────────────────────────────────────────────────
const CATEGORIES = ["developer", "designer", "tester"];
const CAT_LABEL = { developer: "Developer", designer: "Designer", tester: "Tester" };
const CAT_COLOR = { developer: "#0E6A30", designer: "#7A4B00", tester: "#136386" };

function RolesSection({ addToast }) {
  const [roles,     setRoles]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [busy,      setBusy]      = useState("");
  const [showAdd,   setShowAdd]   = useState(false);
  const [addForm,   setAddForm]   = useState({ label: "", category: "developer" });
  const [addErr,    setAddErr]    = useState("");
  const [editKey,   setEditKey]   = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editErr,   setEditErr]   = useState("");

  async function load() {
    setLoading(true);
    try { setRoles((await api.get("/api/director/settings/custom-roles")).customRoles ?? []); }
    catch { addToast({ type: "error", message: "Could not load custom roles." }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e) {
    e.preventDefault();
    const lab = addForm.label.trim();
    if (lab.length < 2 || lab.length > 40) return setAddErr("Label must be 2–40 characters.");
    setAddErr(""); setBusy("add");
    try {
      const { customRole } = await api.post("/api/director/settings/custom-roles", { label: lab, category: addForm.category });
      setRoles((r) => [...r, customRole]);
      setShowAdd(false); setAddForm({ label: "", category: "developer" });
      addToast({ type: "success", message: `Role "${customRole.label}" added.` });
    } catch (e2) { setAddErr(e2.message ?? "Could not add role."); }
    finally { setBusy(""); }
  }

  async function handleRename(key) {
    const lab = editLabel.trim();
    if (lab.length < 2 || lab.length > 40) return setEditErr("Label must be 2–40 characters.");
    setEditErr(""); setBusy(`rename-${key}`);
    try {
      const { customRole } = await api.patch(`/api/director/settings/custom-roles/${key}`, { label: lab });
      setRoles((r) => r.map((x) => x.key === key ? customRole : x));
      setEditKey(null);
      addToast({ type: "success", message: "Role renamed." });
    } catch (e2) { setEditErr(e2.message ?? "Could not rename role."); }
    finally { setBusy(""); }
  }

  async function handleDeactivate(role) {
    setBusy(`deact-${role.key}`);
    try {
      await api.delete(`/api/director/settings/custom-roles/${role.key}`);
      setRoles((r) => r.map((x) => x.key === role.key ? { ...x, active: false } : x));
      addToast({ type: "success", message: `"${role.label}" deactivated.` });
    } catch (e2) { addToast({ type: "error", message: e2.message ?? "Could not deactivate role." }); }
    finally { setBusy(""); }
  }

  if (loading) return <div className="flex flex-col gap-2">{[0,1,2].map(i=><div key={i} className="h-12 rounded-xl bg-ink/[0.04] animate-pulse"/>)}</div>;

  const active = roles.filter((r) => r.active);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-text-primary">Custom Roles</p>
          <p className="text-xs text-slate-500 mt-0.5">{active.length}/20 active roles. Category determines XP weights and task rules.</p>
        </div>
        <button type="button" disabled={active.length >= 20} onClick={() => { setShowAdd(true); setAddErr(""); }}
          className="flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-colors"
          style={{ background: ACCENT }}>
          <Plus size={13} /> Add role
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 p-4 rounded-xl border border-ink/[0.08] bg-ink/[0.02]">
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-[11px] font-semibold text-text-secondary">Label</label>
            <input autoFocus maxLength={40} value={addForm.label} onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Senior Developer"
              className="h-9 rounded-xl border border-ink/[0.1] bg-white px-3 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4B2FC4]/40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-text-secondary">Category</label>
            <select value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
              className="h-9 rounded-xl border border-ink/[0.1] bg-white px-3 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4B2FC4]/40">
              {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
            </select>
          </div>
          {addErr && <p role="alert" className="w-full text-[11px] text-[#B01F17] font-semibold">{addErr}</p>}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={() => setShowAdd(false)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-700 transition-colors"><X size={13} />Cancel</button>
            <button type="submit" disabled={busy === "add"} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-colors" style={{ background: ACCENT }}>
              {busy === "add" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Add
            </button>
          </div>
        </form>
      )}

      {roles.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">No custom roles yet. Add one to give employees display labels.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {roles.map((role, i) => (
            <div key={`${role.key}-${i}`} className={`flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border ${role.active ? "border-ink/[0.08] bg-white" : "border-ink/[0.05] bg-ink/[0.02] opacity-60"}`}>
              {editKey === role.key ? (
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                  <input autoFocus value={editLabel} onChange={(e) => setEditLabel(e.target.value)} maxLength={40}
                    className="h-8 rounded-xl border border-ink/[0.1] bg-white px-3 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4B2FC4]/40 min-w-[160px]" />
                  {editErr && <p role="alert" className="text-[11px] text-[#B01F17] font-semibold">{editErr}</p>}
                  <div className="flex gap-1.5 ml-auto">
                    <button type="button" onClick={() => handleRename(role.key)} disabled={!!busy}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: ACCENT }}>
                      {busy.startsWith("rename") ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Save
                    </button>
                    <button type="button" onClick={() => setEditKey(null)} className="px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-700"><X size={11} /></button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-xs font-semibold text-text-primary flex-1 min-w-0 truncate">{role.label}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${CAT_COLOR[role.category]}18`, color: CAT_COLOR[role.category] }}>{CAT_LABEL[role.category]}</span>
                  {!role.active && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Inactive</span>}
                  {role.active && (
                    <div className="flex gap-1.5 shrink-0">
                      <button type="button" onClick={() => { setEditKey(role.key); setEditLabel(role.label); setEditErr(""); }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-text-primary hover:bg-ink/[0.05] transition-colors">
                        <Pencil size={11} /> Rename
                      </button>
                      <button type="button" disabled={busy === `deact-${role.key}`} onClick={() => handleDeactivate(role)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-[#B01F17] hover:bg-rose-500/5 transition-colors disabled:opacity-40">
                        {busy === `deact-${role.key}` ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />} Deactivate
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DirectorSettingsPage() {
  const addToast = useUiStore((st) => st.addToast);
  const me = useAuthStore((s) => s.user);
  const meId = String(me?._id ?? me?.id ?? "");
  // The open tab is in the address (?section=gamification): linkable, and a reload keeps it.
  const [sp, setSp] = useSearchParams();
  const wanted = sp.get("section");
  const activeId = SECTIONS.some((x) => x.id === wanted) ? wanted : "working-time";
  const setActiveId = (id) => setSp(id === "working-time" ? {} : { section: id }, { replace: true });
  const [settings, setSettingsState] = useState(defaultState);
  const [saved,    setSaved]    = useState(defaultState);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [serverError, setServerError] = useState(null); // { field, message } from the last refused save
  const [members,  setMembers]  = useState([]);

  useEffect(() => {
    api.get("/api/director/workspace-members")
      .then((d) => setMembers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Load from /api/director/settings (Slice 3a) + the gamification rules from /workspace-settings (UI-E1)
  useEffect(() => {
    Promise.all([api.get("/api/director/settings"), api.get("/api/director/workspace-settings", { silent: true }).catch(() => null)])
      .then(([d, ws]) => {
        const wt  = d.workingTime          ?? {};
        const ext = d.extensionRules        ?? {};
        const ai  = d.aiSettings            ?? {};
        const gam = d.gamificationSettings  ?? {};
        // Convert API workingDays (work days 0-6) → UI weekendDays (non-work days)
        const workingDays = wt.workingDays ?? [1,2,3,4,5];
        const weekendDays = [0,1,2,3,4,5,6].filter(day => !workingDays.includes(day));
        const merged = {
          ...defaultState(),
          orgName:              d.name   ?? "",
          workingHoursPerDay:   wt.hoursPerDay ?? 7,
          weekendDays,
          extensionMaxDays:     ext.extensionMaxDays   ?? 3,
          extensionMaxPct:      ext.extensionMaxPct    ?? 20,
          extensionCumCapPct:   ext.extensionCumCapPct ?? 20,
          alertRules:           alertRules(d.alertSettings?.orgRules),
          alertsOther:          Object.fromEntries(Object.entries(d.alertSettings ?? {}).filter(([k]) => k !== "orgRules")),
          timezone:             wt.timezone ?? "Asia/Karachi", // the server does not send it yet: shown as the default
          fiscalYear:           gam.fiscalYear ?? "calendar",
          aiSummaryEnabled:     ai.weeklySummaryEnabled ?? ai.weeklyDigest ?? false,
          aiSummaryDay:         ai.summaryDay  ?? 1,
          aiSummaryTime:        ai.summaryTime ?? "09:00",
          aiCostCapUsd:         ai.costCapUsdPerDay ?? 1.0,
          celebrationLevel:     gam.celebrationLevel ?? "Full",
          recapEnabled:         gam.recapEnabled     ?? true,
          rules:                withDefaults(ws?.gamificationRules),
          escalationContactId:  d.escalationContactId ?? null,
        };
        setSettingsState(merged);
        setSaved(merged);
      })
      .catch(() => {
        // Fall back: try old workspace-settings endpoint for name only
        api.get("/api/director/workspace-settings")
          .then((d) => {
            const def = { ...defaultState(), orgName: d.name ?? "" };
            setSettingsState(def); setSaved(def);
          })
          .catch(() => { setSettingsState(defaultState()); setSaved(defaultState()); });
      })
      .finally(() => setLoading(false));
  }, []);

  function setS(key, val) {
    setSettingsState((prev) => ({ ...prev, [key]: val }));
    setServerError(null);
  }

  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);
  // Closing or reloading the tab with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  // People the escalation contact can be: the organization's members, the Director (you) included and first.
  const people = [
    ...(meId ? [{ id: meId, name: me?.name ?? "You", role: me?.role ?? "Director", isMe: true }] : []),
    ...members.filter((m) => String(m.id) !== meId && m.status !== "suspended").map((m) => ({ id: String(m.id), name: m.name, role: m.roleLabel ?? m.role })),
  ];
  const rulesDirty = JSON.stringify(settings.rules) !== JSON.stringify(saved.rules);

  // UI-E1: one save sends every section, so the three rule sections are checked together (settings/rules.js).
  // A server 400 is shown under its field with the same words.
  const at = (field) => (serverError?.field === field ? { [field]: serverError.message } : {});
  const wtErrors  = { ...workingTimeErrors({ hours: settings.workingHoursPerDay, weekendDays: settings.weekendDays }), ...at("hours"), ...at("days") };
  const ext       = extensionErrors({ days: settings.extensionMaxDays, pct: settings.extensionMaxPct, cap: settings.extensionCumCapPct });
  const extErrors = { ...(ext.days ? { days_ext: ext.days } : {}), ...(ext.pct ? { pct: ext.pct } : {}), ...(ext.cap ? { cap: ext.cap } : {}), ...at("days_ext"), ...at("pct"), ...at("cap") };
  const gamErrors = { ...gamificationErrors(settings.rules), ...(serverError?.field?.match(/^(xp|badge)\.|^streakBonus$/) ? { [serverError.field]: serverError.message } : {}) };
  // Default escalation contact: the Director, so it is never empty (the stored value stays null until a save).
  const escalation = settings.escalationContactId ?? (meId || null);
  const alErrors = alertErrors(settings.alertRules);
  const orgErrs = { ...orgErrors({ ...settings, escalationContactId: escalation }, people), ...at("escalation") };
  const invalidIn = [
    (wtErrors.hours || wtErrors.days) && "working-time",
    Object.keys(extErrors).length > 0 && "extension-rules",
    Object.keys(gamificationErrors(settings.rules)).length > 0 && "gamification",
    Object.keys(alErrors).length > 0 && "alerts",
    Object.keys(orgErrs).filter((k) => k !== "escalation" || !serverError).length > 0 && "organization",
  ].filter(Boolean);
  const blockedBy = invalidIn.length ? SECTIONS.find((x) => x.id === invalidIn[0])?.label : null;

  async function handleSave() {
    setSaving(true);
    try {
      // Gamification rules first: if the server refuses them nothing else is half-saved.
      if (rulesDirty) {
        const r = settings.rules;
        await api.patch("/api/director/workspace-settings", { gamificationRules: { xpMultipliers: r.xpMultipliers, streakBonus: r.streakBonus, badgeThresholds: r.badgeThresholds } }, { silent: true });
        setSaved((prev) => ({ ...prev, rules: r }));
      }
      const workingDays = [0,1,2,3,4,5,6].filter(d => !settings.weekendDays.includes(d));
      await api.patch("/api/director/settings", {
        name:           settings.orgName.trim() || undefined,
        // The time zone is sent only when it was changed: the server does not return the stored one yet.
        workingTime:    { hoursPerDay: settings.workingHoursPerDay, workingDays, ...(settings.timezone !== saved.timezone ? { timezone: settings.timezone } : {}) },
        extensionRules: {
          extensionMaxDays:   settings.extensionMaxDays,
          extensionMaxPct:    settings.extensionMaxPct,
          extensionCumCapPct: settings.extensionCumCapPct,
        },
        alertSettings:        { ...settings.alertsOther, orgRules: settings.alertRules },
        aiSettings: {
          weeklySummaryEnabled: settings.aiSummaryEnabled,
          summaryDay:           settings.aiSummaryDay,
          summaryTime:          settings.aiSummaryTime,
          costCapUsdPerDay:     settings.aiCostCapUsd,
        },
        gamificationSettings: { celebrationLevel: settings.celebrationLevel, recapEnabled: settings.recapEnabled, fiscalYear: settings.fiscalYear },
        escalationContactId:  escalation,
      }, { silent: true });
      setSaved({ ...settings, escalationContactId: escalation });
      setSettingsState((p) => ({ ...p, escalationContactId: escalation }));
      setServerError(null);
      addToast({ type: "success", message: "Settings saved." });
    } catch (err) {
      const e = fromServer(err?.message);
      setServerError(e);
      // Open the section that holds the refused value so its message is on screen.
      const home = !e.field ? null : /^(xp|badge)\.|^streakBonus$/.test(e.field) ? "gamification" : ["hours", "days"].includes(e.field) ? "working-time" : e.field === "escalation" ? "organization" : "extension-rules";
      if (home) setActiveId(home);
      addToast({ type: "error", message: `Not saved. ${e.message}` });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ACCENT, borderTopColor: "transparent" }} />
      </div>
    );
  }

  const activeSection = SECTIONS.find((s) => s.id === activeId);

  return (
    <>
      <div className="px-4 sm:px-8 py-8 max-w-[1280px] mx-auto min-h-full flex flex-col gap-6">

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <PageHeader title="Organization settings" subtitle="Rules and details that apply to the whole organization." />
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6 min-h-0">

          {/* ── Left nav ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:w-52 shrink-0 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible [&>button]:w-auto [&>button]:shrink-0 [&>button]:whitespace-nowrap lg:[&>button]:w-full"
          >
            {SECTIONS.map((sec) => {
              const Icon   = sec.icon;
              const active = sec.id === activeId;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveId(sec.id)}
                  className={[
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left w-full",
                    active
                      ? "text-text-primary"
                      : "text-slate-500 hover:text-text-primary hover:bg-ink/[0.05]",
                  ].join(" ")}
                  style={active ? { background: `${ACCENT}18`, color: ACCENT } : {}}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={14} strokeWidth={1.75} />
                  <span>{sec.label}</span>
                  {active && <ChevronRight size={12} className="ml-auto" />}
                </button>
              );
            })}
          </motion.div>

          {/* ── Right panel ───────────────────────────────────────────── */}
          <motion.div
            key={activeId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="flex-1 rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] flex flex-col min-h-[480px]"
          >
            {/* Section header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-ink/[0.06]">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${ACCENT}18` }}>
                {activeSection && <activeSection.icon size={16} style={{ color: ACCENT }} strokeWidth={1.75} />}
              </div>
              <h2 className="text-sm font-bold text-text-primary">{activeSection?.label}</h2>
            </div>

            {/* Section content */}
            <div className="flex-1 px-6 py-4 overflow-y-auto">
              {activeId === "working-time"    && <WorkingTimeSection  s={settings} setS={setS} errors={wtErrors} />}
              {activeId === "extension-rules" && <ExtensionSection    s={settings} setS={setS} errors={extErrors} />}
              {activeId === "gamification"    && <GamificationSection s={settings} setS={setS} errors={gamErrors}
                onRestored={(rules) => { setSettingsState((p) => ({ ...p, rules })); setSaved((p) => ({ ...p, rules })); setServerError(null); }} />}
              {activeId === "alerts"          && <AlertsSection       s={settings} setS={setS} errors={alErrors} />}
              {activeId === "organization"    && <OrganizationSection s={{ ...settings, escalationContactId: escalation }} setS={setS} errors={orgErrs} people={people} />}
              {activeId === "roles"           && <RolesSection addToast={addToast} />}
            </div>

            {/* ── Sticky save bar ───────────────────────────────────── */}
            <AnimatePresence>
              {dirty && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center justify-between gap-4 px-6 py-4 border-t border-ink/[0.07] bg-[#FFFFFF]/90 backdrop-blur-sm rounded-b-2xl"
                >
                  <p role="status" className={`min-w-0 text-xs ${blockedBy ? "font-semibold text-[#B01F17]" : "text-slate-500"}`}>
                    {blockedBy ? `Correct the marked value in ${blockedBy} to save.` : "Unsaved changes"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSettingsState({ ...saved })}
                      className="px-4 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !!blockedBy}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-40"
                      style={{ background: ACCENT }}
                    >
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      Save changes
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>
      </div>
    </>
  );
}
