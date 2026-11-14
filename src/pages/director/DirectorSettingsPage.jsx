import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Shield, Bell, Building2, Cpu, Zap,
  Loader2, AlertTriangle, ChevronRight, Info,
  RefreshCw, Save, UserCog, Monitor, Users, Plus, Pencil, XCircle, Check, X, Calendar,
} from "lucide-react";
import useUiStore from "@/stores/uiStore";
import api        from "@/lib/api";
import PageHeader  from "@/components/ui/PageHeader";

const ACCENT = "#4B2FC4";

// ── Section definitions ───────────────────────────────────────────────────────
const SECTIONS = [
  { id: "working-time",     icon: Clock,     label: "Working Time" },
  { id: "extension-rules",  icon: Shield,    label: "Extension Rules" },
  { id: "gamification",     icon: Zap,       label: "Gamification" },
  { id: "alerts",           icon: Bell,      label: "Alerts" },
  { id: "organization",     icon: Building2, label: "Organization" },
  { id: "ai",               icon: Cpu,       label: "AI" },
  { id: "security",         icon: Monitor,   label: "Security" },
  { id: "roles",            icon: Users,     label: "Custom Roles" },
  { id: "bookings",         icon: Calendar,  label: "Resource Bookings" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ALERT_TYPES = [
  { id: "approval_pending",  label: "Approval pending" },
  { id: "escalation",        label: "Escalation raised" },
  { id: "project_at_risk",   label: "Project at risk" },
  { id: "org_health_drop",   label: "Org health drop" },
  { id: "recap_ready",       label: "Recap ready" },
  { id: "system_incident",   label: "System incident" },
];

const SUMMARY_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function defaultState() {
  return {
    workingHoursPerDay: 7,
    weekendDays: [0, 6],
    extensionMaxDays: 3,
    extensionMaxPct: 20,
    extensionCumCapPct: 20,
    celebrationLevel: "Full",
    recapEnabled: true,
    orgName: "",
    timezone: "Asia/Karachi",
    fiscalYear: "calendar",
    alerts: Object.fromEntries(ALERT_TYPES.map(a => [a.id, { inApp: true, email: false }])),
    aiSummaryEnabled: false,
    aiSummaryDay: 1,
    aiSummaryTime: "09:00",
    aiCostCapUsd: 1.0,
    escalationContactId: null,
  };
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent outline-none transition-colors duration-200"
      style={{ background: on ? ACCENT : "rgba(20,32,61,0.15)" }}
    >
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out"
        style={{ transform: on ? "translateX(16px)" : "translateX(0px)" }}
      />
    </button>
  );
}

// ── Label row ─────────────────────────────────────────────────────────────────
function LabelRow({ label, hint, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-ink/[0.05] last:border-0">
      <div className="sm:w-52 shrink-0">
        <p className="text-xs font-semibold text-text-primary">{label}</p>
        {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ── Assumption badge ──────────────────────────────────────────────────────────
function AssumptionBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 ml-2">
      <Info size={9} /> ASSUMPTION
    </span>
  );
}

// ── Impact note ───────────────────────────────────────────────────────────────
function ImpactNote({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 mt-2 px-3 py-2.5 rounded-xl bg-ink/[0.04] border border-ink/[0.07]">
      <Info size={12} className="text-slate-500 shrink-0 mt-0.5" />
      <p className="text-[11px] text-slate-500">{message}</p>
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ title, body, confirmLabel, onConfirm, onCancel, busy }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.17 }}
        className="w-full max-w-sm rounded-2xl bg-[#FFFFFF] border border-ink/[0.1] p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${ACCENT}18` }}>
            <AlertTriangle size={15} style={{ color: ACCENT }} strokeWidth={2} />
          </div>
          <h3 className="text-sm font-bold text-text-primary mt-1">{title}</h3>
        </div>
        <p className="text-xs text-slate-400 mb-5">{body}</p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-40"
            style={{ background: ACCENT }}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-700 transition-colors">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Reset modal (type-to-confirm) ─────────────────────────────────────────────
function ResetModal({ onConfirm, onClose }) {
  const [typed, setTyped] = useState("");
  const PHRASE = "RESET XP POOL";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.17 }}
        className="w-full max-w-sm rounded-2xl bg-[#FFFFFF] border border-[#D1291F]/30 p-6 shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw size={16} className="text-[#B01F17]" />
          <h3 className="text-sm font-bold text-text-primary">Reset XP Pools</h3>
        </div>
        <p className="text-xs text-slate-400 mb-1">
          This will reset all org-level XP pools to their defaults. Individual member XP is not affected.
          <strong className="text-[#B01F17]"> This cannot be undone.</strong>
        </p>
        <p className="text-xs text-slate-500 mt-3 mb-2">
          Type <span className="text-text-primary font-bold font-mono">{PHRASE}</span> to confirm:
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={PHRASE}
          aria-label={`Type ${PHRASE} to confirm`}
          className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2.5 text-xs text-text-primary font-mono placeholder-slate-700 focus:outline-none focus:border-[#D1291F]/40 mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={typed !== PHRASE}
            className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#D1291F] text-white disabled:opacity-30 transition-colors"
          >
            Reset XP Pools
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-700 transition-colors">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Working Time section ──────────────────────────────────────────────────────
function WorkingTimeSection({ s, setS }) {
  const valid = s.workingHoursPerDay >= 1 && s.workingHoursPerDay <= 24;
  return (
    <div className="flex flex-col gap-1">
      <LabelRow label="Working hours / day" hint="Used for deadline and capacity estimates">
        <div className="flex items-center gap-3">
          <input
            type="range" min={1} max={24} step={0.5}
            value={s.workingHoursPerDay}
            onChange={(e) => setS("workingHoursPerDay", +e.target.value)}
            className="flex-1 accent-[#4B2FC4]"
            aria-label="Working hours per day"
          />
          <span className="w-14 text-right text-sm font-black tabular-nums" style={{ color: ACCENT }}>
            {s.workingHoursPerDay}h
          </span>
        </div>
        {!valid && <p className="text-[11px] text-[#B01F17] mt-1">Must be between 1 and 24.</p>}
      </LabelRow>

      <LabelRow label="Weekend days" hint="These days are excluded from deadline calculations">
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day, i) => {
            const isWeekend = s.weekendDays.includes(i);
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  const next = isWeekend
                    ? s.weekendDays.filter((d) => d !== i)
                    : [...s.weekendDays, i];
                  // At least 5 working days required
                  if (next.length <= 6) setS("weekendDays", next);
                }}
                className={[
                  "h-8 px-3 rounded-lg text-xs font-bold border transition-all",
                  isWeekend
                    ? "text-white border-transparent"
                    : "text-slate-500 border-ink/[0.08] bg-ink/[0.03] hover:border-ink/20",
                ].join(" ")}
                style={isWeekend ? { background: ACCENT } : {}}
              >
                {day}
              </button>
            );
          })}
        </div>
      </LabelRow>

      <ImpactNote message="Changing working hours will affect all future deadline estimates. Existing estimates will not be recalculated automatically (backend pending)." />
    </div>
  );
}

// ── Extension Rules section ───────────────────────────────────────────────────
function ExtensionSection({ s, setS }) {
  const daysValid = s.extensionMaxDays >= 1 && s.extensionMaxDays <= 30;
  const pctValid  = s.extensionMaxPct  >= 0 && s.extensionMaxPct  <= 100;
  const capValid  = s.extensionCumCapPct >= 0 && s.extensionCumCapPct <= 100;

  function impact() {
    return `Manager-alone extensions limited to ${s.extensionMaxDays} days or ${s.extensionMaxPct}% of original timeline, with a cumulative cap of ${s.extensionCumCapPct}% of original timeline. Anything beyond requires Director approval.`;
  }

  return (
    <div className="flex flex-col gap-1">
      <LabelRow
        label={<span>Manager-alone limit (days) <AssumptionBadge /></span>}
        hint="Max days a Manager can extend without Director approval"
      >
        <div className="flex items-center gap-3">
          <input
            type="number" min={1} max={30} step={1}
            value={s.extensionMaxDays}
            onChange={(e) => setS("extensionMaxDays", +e.target.value)}
            aria-label="Extension max days"
            className={[
              "w-24 bg-ink/[0.04] border rounded-xl px-3 py-2 text-sm text-text-primary font-black tabular-nums text-center focus:outline-none transition-colors",
              daysValid ? "border-ink/[0.08] focus:border-ink/20" : "border-[#D1291F]/50",
            ].join(" ")}
          />
          <span className="text-xs text-slate-500">days</span>
        </div>
        {!daysValid && <p className="text-[11px] text-[#B01F17] mt-1">Must be 1–30 days.</p>}
      </LabelRow>

      <LabelRow
        label={<span>Manager-alone limit (%) <AssumptionBadge /></span>}
        hint="Max % of original timeline a Manager can extend alone"
      >
        <div className="flex items-center gap-3">
          <input
            type="number" min={5} max={50} step={5}
            value={s.extensionMaxPct}
            onChange={(e) => setS("extensionMaxPct", +e.target.value)}
            aria-label="Extension max percent"
            className={[
              "w-24 bg-ink/[0.04] border rounded-xl px-3 py-2 text-sm text-text-primary font-black tabular-nums text-center focus:outline-none transition-colors",
              pctValid ? "border-ink/[0.08] focus:border-ink/20" : "border-[#D1291F]/50",
            ].join(" ")}
          />
          <span className="text-xs text-slate-500">%</span>
        </div>
        {!pctValid && <p className="text-[11px] text-[#B01F17] mt-1">Must be 5–50%.</p>}
      </LabelRow>

      <LabelRow
        label="Cumulative cap (%)"
        hint="Total extension % of original timeline across all extensions before Director approval required"
      >
        <div className="flex items-center gap-3">
          <input
            type="number" min={0} max={100} step={5}
            value={s.extensionCumCapPct}
            onChange={(e) => setS("extensionCumCapPct", +e.target.value)}
            aria-label="Cumulative cap percent"
            className={[
              "w-24 bg-ink/[0.04] border rounded-xl px-3 py-2 text-sm text-text-primary font-black tabular-nums text-center focus:outline-none transition-colors",
              capValid ? "border-ink/[0.08] focus:border-ink/20" : "border-[#D1291F]/50",
            ].join(" ")}
          />
          <span className="text-xs text-slate-500">%</span>
        </div>
        {!capValid && <p className="text-[11px] text-[#B01F17] mt-1">Must be 0–100%.</p>}
      </LabelRow>

      <ImpactNote message={impact()} />
      <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
        <Info size={10} /> These thresholds are not enforced by the system yet (D-020 backend pending).
      </p>
    </div>
  );
}

// ── Gamification section ──────────────────────────────────────────────────────
function GamificationSection({ s, setS }) {
  const [showReset, setShowReset] = useState(false);
  const addToast = useUiStore((st) => st.addToast);

  return (
    <>
      <AnimatePresence>
        {showReset && (
          <ResetModal
            onClose={() => setShowReset(false)}
            onConfirm={async () => {
              setShowReset(false);
              try {
                await api.post("/api/director/settings/reset-xp-pools", { confirm: "RESET XP POOL" });
                addToast({ type: "success", message: "XP pools reset." });
              } catch {
                addToast({ type: "error", message: "Reset failed — endpoint pending." });
              }
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-1">
        <LabelRow label="Celebration level" hint="Controls celebration animations org-wide">
          <div className="flex gap-2">
            {["Full", "Quiet", "Off"].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setS("celebrationLevel", lvl)}
                className={[
                  "px-4 py-1.5 rounded-lg text-xs font-bold border transition-all",
                  s.celebrationLevel === lvl
                    ? "text-white border-transparent"
                    : "text-slate-500 border-ink/[0.08] bg-ink/[0.03] hover:border-ink/20",
                ].join(" ")}
                style={s.celebrationLevel === lvl ? { background: ACCENT } : {}}
              >
                {lvl}
              </button>
            ))}
          </div>
        </LabelRow>

        <LabelRow label="Weekly recap" hint="Show recap popup on first login after each week">
          <Toggle on={s.recapEnabled} onToggle={() => setS("recapEnabled", !s.recapEnabled)} />
        </LabelRow>

        <div className="mt-4 pt-4 border-t border-ink/[0.06]">
          <p className="text-xs font-bold text-[#B01F17] mb-1">Danger zone</p>
          <p className="text-[11px] text-slate-500 mb-3">
            Reset all org-level XP pools to defaults. Individual member XP is not affected.
          </p>
          <button
            type="button"
            onClick={() => setShowReset(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-[#D1291F]/40 text-[#B01F17] hover:bg-[#D1291F]/10 transition-colors"
          >
            <RefreshCw size={12} /> Reset XP Pools
          </button>
        </div>
      </div>
    </>
  );
}

// ── Alerts section ────────────────────────────────────────────────────────────
function AlertsSection({ s, setS }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alert type</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center w-14">In-app</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center w-14">Email</span>
      </div>
      {ALERT_TYPES.map((a) => (
        <div key={a.id} className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center py-2.5 border-b border-ink/[0.05] last:border-0">
          <span className="text-xs font-semibold text-text-primary">{a.label}</span>
          <div className="flex justify-center w-14">
            <Toggle
              on={s.alerts[a.id]?.inApp ?? true}
              onToggle={() => setS("alerts", {
                ...s.alerts,
                [a.id]: { ...s.alerts[a.id], inApp: !(s.alerts[a.id]?.inApp ?? true) },
              })}
            />
          </div>
          <div className="flex justify-center w-14">
            <Toggle
              on={s.alerts[a.id]?.email ?? false}
              onToggle={() => setS("alerts", {
                ...s.alerts,
                [a.id]: { ...s.alerts[a.id], email: !(s.alerts[a.id]?.email ?? false) },
              })}
            />
          </div>
        </div>
      ))}
      <ImpactNote message="Email alerts require email delivery to be configured by your system administrator." />
    </div>
  );
}

// ── Organization section ──────────────────────────────────────────────────────
function OrganizationSection({ s, setS, members }) {
  const orgNameValid = s.orgName.trim().length > 0;
  return (
    <div className="flex flex-col gap-1">
      <LabelRow label="Organization name">
        <input
          type="text"
          value={s.orgName}
          onChange={(e) => setS("orgName", e.target.value)}
          placeholder="Organization name"
          aria-label="Organization name"
          className={[
            "w-full max-w-xs bg-ink/[0.04] border rounded-xl px-3 py-2 text-sm text-text-primary placeholder-slate-600 focus:outline-none transition-colors",
            orgNameValid ? "border-ink/[0.08] focus:border-ink/20" : "border-[#D1291F]/50",
          ].join(" ")}
        />
        {!orgNameValid && <p className="text-[11px] text-[#B01F17] mt-1">Organization name is required.</p>}
      </LabelRow>

      <LabelRow label="Escalation contact" hint="Member notified when an escalation is raised without a handler">
        <div className="flex items-center gap-2">
          <UserCog size={13} className="text-slate-500 shrink-0" />
          <select
            value={s.escalationContactId ?? ""}
            onChange={(e) => setS("escalationContactId", e.target.value || null)}
            aria-label="Escalation contact"
            className="flex-1 max-w-xs bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-ink/20 transition-colors"
          >
            <option value="">— None —</option>
            {(members ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
            ))}
          </select>
        </div>
      </LabelRow>

      <LabelRow label="Timezone">
        <select
          value={s.timezone}
          onChange={(e) => setS("timezone", e.target.value)}
          aria-label="Timezone"
          className="w-full max-w-xs bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-ink/20 transition-colors"
        >
          <option value="Asia/Karachi">PKT (UTC+5) — Karachi</option>
          <option value="UTC">UTC</option>
          <option value="Asia/Dubai">GST (UTC+4) — Dubai</option>
          <option value="Europe/London">GMT — London</option>
          <option value="America/New_York">EST — New York</option>
        </select>
      </LabelRow>

      <LabelRow label="Fiscal year">
        <select
          value={s.fiscalYear}
          onChange={(e) => setS("fiscalYear", e.target.value)}
          aria-label="Fiscal year"
          className="w-full max-w-xs bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-ink/20 transition-colors"
        >
          <option value="calendar">Calendar year (Jan–Dec)</option>
          <option value="july-june">July–June</option>
        </select>
      </LabelRow>

    </div>
  );
}

// ── AI section ────────────────────────────────────────────────────────────────
function AiSection({ s, setS }) {
  return (
    <div className="flex flex-col gap-1">
      <LabelRow label="Weekly AI summary" hint="Automatic weekly summary generated by AI">
        <Toggle on={s.aiSummaryEnabled} onToggle={() => setS("aiSummaryEnabled", !s.aiSummaryEnabled)} />
      </LabelRow>

      <AnimatePresence>
        {s.aiSummaryEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <LabelRow label="Delivery day" hint="Day the weekly summary is generated">
              <div className="flex flex-wrap gap-2">
                {SUMMARY_DAYS.map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setS("aiSummaryDay", i)}
                    className={[
                      "h-8 px-3 rounded-lg text-xs font-bold border transition-all",
                      s.aiSummaryDay === i
                        ? "text-white border-transparent"
                        : "text-slate-500 border-ink/[0.08] bg-ink/[0.03] hover:border-ink/20",
                    ].join(" ")}
                    style={s.aiSummaryDay === i ? { background: ACCENT } : {}}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </LabelRow>

            <LabelRow label="Delivery time">
              <input
                type="time"
                value={s.aiSummaryTime}
                onChange={(e) => setS("aiSummaryTime", e.target.value)}
                aria-label="AI summary delivery time"
                className="bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-ink/20 transition-colors"
              />
            </LabelRow>
          </motion.div>
        )}
      </AnimatePresence>

      <LabelRow label="AI cost cap (USD/day)" hint="Max spend on AI features per calendar day (0 = disabled)">
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} max={100} step={0.5}
            value={s.aiCostCapUsd}
            onChange={(e) => setS("aiCostCapUsd", +e.target.value)}
            aria-label="AI cost cap USD per day"
            className="w-24 bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2 text-sm text-text-primary font-black tabular-nums text-center focus:outline-none focus:border-ink/20 transition-colors"
          />
          <span className="text-xs text-slate-500">USD/day</span>
        </div>
      </LabelRow>

      <ImpactNote message="AI weekly summary is generated from org-level data only (D-033). AI integration pending backend." />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
// ── Security section (Sessions) ───────────────────────────────────────────────
function SecuritySection({ addToast }) {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    api.get("/api/auth/sessions")
      .then((d) => setSessions(d?.sessions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function signOutOthers() {
    setRevoking(true);
    try {
      const d = await api.post("/api/auth/sessions/sign-out-others");
      addToast({ type: "success", message: `${d?.revoked ?? 0} other session(s) signed out.` });
      const refreshed = await api.get("/api/auth/sessions");
      setSessions(refreshed?.sessions ?? []);
    } catch (e) {
      addToast({ type: "error", message: e?.message ?? "Failed to revoke sessions." });
    } finally {
      setRevoking(false);
    }
  }

  function fmt(date) {
    if (!date) return "—";
    return new Date(date).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-text-primary">Active Sessions</p>
          <p className="text-xs text-slate-500 mt-0.5">Devices where you are currently logged in.</p>
        </div>
        <button onClick={signOutOthers} disabled={revoking || sessions.filter((s) => !s.isCurrent).length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-40 transition-colors">
          {revoking ? <Loader2 size={12} className="animate-spin" /> : null}
          Sign out other sessions
        </button>
      </div>
      {loading ? (
        <div className="flex flex-col gap-2">{[0,1,2].map(i=><div key={i} className="h-12 rounded-xl bg-ink/[0.04] animate-pulse"/>)}</div>
      ) : sessions.length === 0 ? (
        <p className="text-xs text-slate-400">No active sessions found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <div key={s.id} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${s.isCurrent ? "border-[#4B2FC4]/30 bg-[#4B2FC4]/5" : "border-ink/[0.08]"}`}>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-semibold text-text-primary flex items-center gap-2">
                  {s.device?.slice(0, 60) ?? "Unknown device"}
                  {s.isCurrent && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#4B2FC4]/10 text-[#4B2FC4]">Current</span>}
                </p>
                <p className="text-[11px] text-slate-400">
                  {s.ip ?? "—"} · Last seen {fmt(s.lastSeenAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
          {roles.map((role) => (
            <div key={role.key} className={`flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl border ${role.active ? "border-ink/[0.08] bg-white" : "border-ink/[0.05] bg-ink/[0.02] opacity-60"}`}>
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

// ── Resource Bookings section (Director read-only) ────────────────────────────
function BookingsSectionDirector({ addToast }) {
  const [assets,  setAssets]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // { asset, bookings }
  const [bookLoading, setBookLoading] = useState(false);

  useEffect(() => {
    api.get("/api/manager/assets").then((d) => setAssets(d?.assets ?? [])).catch(() => setAssets([])).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function viewBookings(asset) {
    setBookLoading(true);
    try {
      const d = await api.get(`/api/director/assets/${asset.id ?? asset._id}/bookings`);
      setSelected({ asset, bookings: d.bookings ?? [] });
    } catch (e) { addToast({ type: "error", message: e.message ?? "Could not load bookings." }); }
    finally { setBookLoading(false); }
  }

  function fmtDay(d) { return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"; }

  if (loading) return <div className="flex flex-col gap-2">{[0,1,2].map(i=><div key={i} className="h-10 rounded-xl bg-ink/[0.04] animate-pulse"/>)}</div>;

  if (selected) return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setSelected(null)} className="text-xs font-semibold text-slate-500 hover:text-text-primary transition-colors">← All assets</button>
        <span className="text-xs text-slate-400">/</span>
        <span className="text-xs font-bold text-text-primary">{selected.asset.name}</span>
        <span className="ml-auto text-[11px] text-slate-400">Read-only</span>
      </div>
      {selected.bookings.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">No active bookings for this asset.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {selected.bookings.map((b) => (
            <div key={b._id} className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-ink/[0.08] bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-primary">{fmtDay(b.from)} – {fmtDay(b.to)}</p>
                <p className="text-[11px] text-slate-400">{b.bookedBy?.name ?? "Unknown"} · {b.projectId?.title ?? "No project"}{b.note ? ` · "${b.note}"` : ""}</p>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">Active</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-bold text-text-primary">Asset Bookings</p>
        <p className="text-xs text-slate-500 mt-0.5">View active bookings by asset. Select an asset to see its schedule.</p>
      </div>
      {assets.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">No assets in this organisation yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {assets.map((a) => (
            <button key={a.id ?? a._id} type="button" onClick={() => viewBookings(a)} disabled={bookLoading}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-ink/[0.08] bg-white text-left hover:bg-ink/[0.03] transition-colors disabled:opacity-60">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">{a.name}</p>
                <p className="text-[11px] text-slate-400">{a.type}</p>
              </div>
              <ChevronRight size={13} className="text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DirectorSettingsPage() {
  const addToast = useUiStore((st) => st.addToast);
  const [activeId, setActiveId] = useState("working-time");
  const [settings, setSettingsState] = useState(defaultState);
  const [saved,    setSaved]    = useState(defaultState);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [members,  setMembers]  = useState([]);

  useEffect(() => {
    api.get("/api/director/workspace-members")
      .then((d) => setMembers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Load from /api/director/settings (Slice 3a); fall back to workspace-settings for name
  useEffect(() => {
    api.get("/api/director/settings")
      .then((d) => {
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
          alerts:               d.alertSettings  ?? defaultState().alerts,
          aiSummaryEnabled:     ai.weeklySummaryEnabled ?? ai.weeklyDigest ?? false,
          aiSummaryDay:         ai.summaryDay  ?? 1,
          aiSummaryTime:        ai.summaryTime ?? "09:00",
          aiCostCapUsd:         ai.costCapUsdPerDay ?? 1.0,
          celebrationLevel:     gam.celebrationLevel ?? "Full",
          recapEnabled:         gam.recapEnabled     ?? true,
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
  }

  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  // Validation: is the current section valid for saving?
  function isSectionValid() {
    const s = settings;
    if (activeId === "working-time")    return s.workingHoursPerDay >= 1 && s.workingHoursPerDay <= 24;
    if (activeId === "extension-rules") return s.extensionMaxDays >= 1 && s.extensionMaxDays <= 30 &&
                                               s.extensionMaxPct  >= 0 && s.extensionMaxPct  <= 100 &&
                                               s.extensionCumCapPct  >= 0 && s.extensionCumCapPct <= 100;
    if (activeId === "organization")    return s.orgName.trim().length > 0;
    return true;
  }

  async function handleSave() {
    // Working time: prompt for recalculate
    if (activeId === "working-time" && settings.workingHoursPerDay !== saved.workingHoursPerDay) {
      setShowConfirm(true);
      return;
    }
    await doSave();
  }

  async function doSave() {
    setSaving(true);
    try {
      const workingDays = [0,1,2,3,4,5,6].filter(d => !settings.weekendDays.includes(d));
      await api.patch("/api/director/settings", {
        name:           settings.orgName.trim() || undefined,
        workingTime:    { hoursPerDay: settings.workingHoursPerDay, workingDays },
        extensionRules: {
          extensionMaxDays:   settings.extensionMaxDays,
          extensionMaxPct:    settings.extensionMaxPct,
          extensionCumCapPct: settings.extensionCumCapPct,
        },
        alertSettings:        settings.alerts,
        aiSettings: {
          weeklySummaryEnabled: settings.aiSummaryEnabled,
          summaryDay:           settings.aiSummaryDay,
          summaryTime:          settings.aiSummaryTime,
          costCapUsdPerDay:     settings.aiCostCapUsd,
        },
        gamificationSettings: { celebrationLevel: settings.celebrationLevel, recapEnabled: settings.recapEnabled },
        escalationContactId:  settings.escalationContactId,
      });
      setSaved({ ...settings });
      addToast({ type: "success", message: "Settings saved." });
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Save failed." });
    } finally {
      setSaving(false); setShowConfirm(false);
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
      <AnimatePresence>
        {showConfirm && (
          <ConfirmModal
            title="Recalculate estimates?"
            body={`Working hours changed to ${settings.workingHoursPerDay}h/day. Do you want to proceed? (Existing estimates will not be recalculated — backend pending.)`}
            confirmLabel="Save anyway"
            onConfirm={doSave}
            onCancel={() => setShowConfirm(false)}
            busy={saving}
          />
        )}
      </AnimatePresence>

      <div className="px-4 sm:px-8 py-8 max-w-[1280px] mx-auto min-h-full flex flex-col gap-6">

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <PageHeader title="Settings" subtitle="Organization-level configuration and rules." />
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6 min-h-0">

          {/* ── Left nav ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:w-52 shrink-0 flex lg:flex-col gap-1"
          >
            {SECTIONS.map((sec) => {
              const Icon   = sec.icon;
              const active = sec.id === activeId;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveId(sec.id)}
                  className={[
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left w-full",
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
              {activeId === "working-time"    && <WorkingTimeSection  s={settings} setS={setS} />}
              {activeId === "extension-rules" && <ExtensionSection    s={settings} setS={setS} />}
              {activeId === "gamification"    && <GamificationSection s={settings} setS={setS} />}
              {activeId === "alerts"          && <AlertsSection       s={settings} setS={setS} />}
              {activeId === "organization"    && <OrganizationSection s={settings} setS={setS} members={members} />}
              {activeId === "ai"              && <AiSection           s={settings} setS={setS} />}
              {activeId === "security"        && <SecuritySection addToast={addToast} />}
              {activeId === "roles"           && <RolesSection addToast={addToast} />}
              {activeId === "bookings"        && <BookingsSectionDirector addToast={addToast} />}
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
                  <p className="text-[11px] text-slate-500">Unsaved changes</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSettingsState({ ...saved })}
                      className="px-4 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !isSectionValid()}
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
