// Director Settings: Working Time, Extension Rules and Gamification (UI-E1). Values live in the page state
// (`s`, `setS`); `errors` come from settings/rules.js (and from a server 400, see the page). Components only.
import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { Info, RotateCcw, TriangleAlert } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { TASK_TYPES, BADGES, RECOMMENDED, ALERT_FIELDS, FISCAL_YEARS, withDefaults, toggleWeekend, extensionSentence } from "./rules";

const ACCENT = "#4B2FC4";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const INPUT = "h-10 w-24 rounded-xl border bg-white px-3 text-sm font-bold tabular-nums text-text-primary";

export function Toggle({ on, onToggle, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onToggle}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 motion-reduce:transition-none"
      style={{ background: on ? ACCENT : "rgba(20,32,61,0.15)" }}>
      <span aria-hidden="true" className="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none"
        style={{ transform: on ? "translateX(16px)" : "translateX(0px)" }} />
    </button>
  );
}

export function LabelRow({ label, hint, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-2 border-b border-ink/[0.05] py-3.5 last:border-0 sm:flex-row sm:items-start">
      <div className="shrink-0 sm:w-56 sm:pt-2">
        {htmlFor ? <label htmlFor={htmlFor} className="text-sm font-semibold text-text-primary">{label}</label> : <p className="text-sm font-semibold text-text-primary">{label}</p>}
        {hint && <p className="mt-0.5 text-xs leading-snug text-text-secondary">{hint}</p>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Note({ children, tone }) {
  const warn = tone === "warning";
  return (
    <p role={warn ? "status" : undefined} className={`mt-2 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${warn ? "border-[#8A6200]/30 bg-[#FFC21A]/10 text-[#5C3D00]" : "border-ink/[0.07] bg-ink/[0.04] text-text-secondary"}`}>
      {warn ? <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </p>
  );
}

const ErrorText = ({ id, children }) => (children ? <p id={id} role="alert" className="mt-1 text-xs font-semibold text-[#B01F17]">{children}</p> : null);

// A labelled number box with its unit and its own error line.
function NumberField({ id, value, onChange, error, unit, step = 1, min, max, label }) {
  return (
    <div>
      <span className="flex items-center gap-2">
        <input id={id} name={id} autoComplete="off" type="number" inputMode="decimal" value={value} min={min} max={max} step={step} aria-label={label}
          aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className={`${INPUT} ${error ? "border-[#D1291F]" : "border-border-subtle"}`} />
        {unit && <span className="text-sm text-text-secondary">{unit}</span>}
      </span>
      <ErrorText id={`${id}-err`}>{error}</ErrorText>
    </div>
  );
}

// ── Working Time (RND-25, 26, 27) ─────────────────────────────────────────────
export function WorkingTimeSection({ s, setS, errors }) {
  const [blocked, setBlocked] = useState(false);
  return (
    <div className="flex flex-col">
      <LabelRow label="Planning hours per day" htmlFor="wt-hours" hint="Hours a person can be planned for in one working day. Used for new estimates, capacity and deadlines.">
        <div className="flex items-center gap-3">
          <input id="wt-hours" type="range" min={4} max={12} step={0.5} value={s.workingHoursPerDay}
            onChange={(e) => setS("workingHoursPerDay", +e.target.value)} aria-valuetext={`${s.workingHoursPerDay} hours`}
            aria-describedby="wt-hours-range" className="min-w-0 flex-1 accent-[#4B2FC4]" />
          <output htmlFor="wt-hours" className="w-14 shrink-0 text-right text-sm font-black tabular-nums text-[#4B2FC4]">{s.workingHoursPerDay} h</output>
        </div>
        <p id="wt-hours-range" className="mt-1 text-xs text-text-secondary">4 to 12 hours, in half hours.</p>
        <ErrorText>{errors.hours}</ErrorText>
        {errors.warning && <Note tone="warning">{errors.warning}</Note>}
      </LabelRow>

      <LabelRow label="Weekend days" hint="Days that are not worked. They are left out of deadlines, capacity and streaks.">
        <div role="group" aria-label="Weekend days" className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day, i) => {
            const off = s.weekendDays.includes(i);
            return (
              <button key={day} type="button" aria-pressed={off}
                onClick={() => { const next = toggleWeekend(s.weekendDays, i); setBlocked(next === s.weekendDays); setS("weekendDays", next); }}
                className={`h-10 rounded-lg border px-3.5 text-sm font-bold transition-colors ${off ? "border-transparent text-white" : "border-border-subtle bg-white text-text-secondary hover:border-ink/25"}`}
                style={off ? { background: ACCENT } : undefined}>
                {day}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-text-secondary">{7 - s.weekendDays.length} working day{7 - s.weekendDays.length === 1 ? "" : "s"} a week.</p>
        <ErrorText>{errors.days || (blocked ? "Keep at least one working day." : "")}</ErrorText>
      </LabelRow>

      <Note>Saving this does not move dates that are already saved: existing deadlines and task dates stay as they are. Only new estimates use the new numbers (days needed = hours / planning hours per day, counted over working days).</Note>
    </div>
  );
}

// ── Extension Rules (D-026) ───────────────────────────────────────────────────
function DefaultMark({ value, standard, unit }) {
  return Number(value) === standard
    ? <span className="ml-2 inline-flex whitespace-nowrap rounded-full border border-border-subtle bg-ink/[0.04] px-2 py-0.5 text-[11px] font-semibold text-text-secondary">Default (D-026)</span>
    : <span className="ml-2 whitespace-nowrap text-xs text-text-secondary">Default (D-026) is {standard}{unit}</span>;
}

export function ExtensionSection({ s, setS, errors }) {
  const ok = !errors.days_ext && !errors.pct && !errors.cap;
  return (
    <div className="flex flex-col">
      <LabelRow htmlFor="ext-days" label={<>Single extension: days<DefaultMark value={s.extensionMaxDays} standard={3} unit=" days" /></>}
        hint="Longest extension, in working days, that a Manager can approve alone.">
        <NumberField id="ext-days" value={s.extensionMaxDays} onChange={(v) => setS("extensionMaxDays", v)} error={errors.days_ext} unit="working days" min={0} max={10} />
      </LabelRow>
      <LabelRow htmlFor="ext-pct" label={<>Single extension: percent<DefaultMark value={s.extensionMaxPct} standard={20} unit="%" /></>}
        hint="Largest share of the original timeline that a Manager can add alone.">
        <NumberField id="ext-pct" value={s.extensionMaxPct} onChange={(v) => setS("extensionMaxPct", v)} error={errors.pct} unit="% of the original timeline" min={0} max={50} step={5} />
      </LabelRow>
      <LabelRow htmlFor="ext-cap" label={<>Total per task: percent<DefaultMark value={s.extensionCumCapPct} standard={20} unit="%" /></>}
        hint="All extensions of one task added together. Above this the Director decides.">
        <NumberField id="ext-cap" value={s.extensionCumCapPct} onChange={(v) => setS("extensionCumCapPct", v)} error={errors.cap} unit="% of the original timeline" min={0} max={50} step={5} />
      </LabelRow>
      <Note>{ok ? extensionSentence({ days: s.extensionMaxDays, pct: s.extensionMaxPct, cap: s.extensionCumCapPct }) : "Correct the marked values to see the rule in words."}</Note>
      <p className="mt-2 text-xs text-text-secondary">New numbers apply to extension requests made after you save. Requests already decided stay as they are.</p>
    </div>
  );
}

// ── Alerts: rules for the whole organization (item 43) ────────────────────────
// A Director's own choices (which messages reach their bell, email) are in Account settings, not here.
export function AlertsSection({ s, setS, errors }) {
  const set = (k, v) => setS("alertRules", { ...s.alertRules, [k]: v });
  return (
    <div className="flex flex-col">
      <p className="pb-3 text-sm leading-relaxed text-text-secondary">These rules apply to everyone in the organization. Your own notification choices are in <Link to="/director/account-settings?tab=settings" className="font-bold text-accent-text underline">Account settings</Link>.</p>
      {ALERT_FIELDS.map((f) => (
        <LabelRow key={f.key} htmlFor={`al-${f.key}`} label={f.label} hint={f.hint}>
          <NumberField id={`al-${f.key}`} value={s.alertRules[f.key]} onChange={(v) => set(f.key, v)} error={errors[f.key]} unit={f.unit} min={f.min} max={f.max} step={f.step} label={f.label} />
        </LabelRow>
      ))}
      <LabelRow label="Streak-break reminder" hint="Remind a person the evening before their streak would break.">
        <Toggle on={s.alertRules.streakReminder} onToggle={() => set("streakReminder", !s.alertRules.streakReminder)} label="Streak-break reminder" />
      </LabelRow>
    </div>
  );
}

// ── Organization ──────────────────────────────────────────────────────────────
const ZONES = [["Asia/Karachi", "Pakistan (PKT, UTC+5): Karachi"], ["Asia/Dubai", "Gulf (GST, UTC+4): Dubai"], ["UTC", "UTC"], ["Europe/London", "UK (GMT): London"], ["America/New_York", "US East (EST): New York"]];
const SELECT = "h-10 w-full max-w-sm rounded-xl border bg-white px-3 text-sm font-semibold text-text-primary";

export function OrganizationSection({ s, setS, errors, people }) {
  return (
    <div className="flex flex-col">
      <LabelRow htmlFor="org-name" label="Organization name" hint="Shown to everyone in the organization and on reports.">
        <input id="org-name" name="orgName" autoComplete="off" type="text" value={s.orgName} maxLength={120} onChange={(e) => setS("orgName", e.target.value)}
          aria-invalid={!!errors.orgName} aria-describedby={errors.orgName ? "org-name-err" : undefined} placeholder="For example: Acme Software…"
          className={`h-10 w-full max-w-sm rounded-xl border bg-white px-3 text-sm text-text-primary ${errors.orgName ? "border-[#D1291F]" : "border-border-subtle"}`} />
        <ErrorText id="org-name-err">{errors.orgName}</ErrorText>
      </LabelRow>

      <LabelRow htmlFor="org-escalation" label="Escalation contact" hint="Told about an escalation that has no handler. It is always someone; the Director is the default.">
        <select id="org-escalation" name="escalationContactId" value={s.escalationContactId ?? ""} onChange={(e) => setS("escalationContactId", e.target.value || null)}
          aria-invalid={!!errors.escalation} aria-describedby={errors.escalation ? "org-escalation-err" : undefined} className={`${SELECT} ${errors.escalation ? "border-[#D1291F]" : "border-border-subtle"}`}>
          {!s.escalationContactId && <option value="">Choose a person…</option>}
          {people.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role}){m.isMe ? ", you (default)" : ""}</option>)}
        </select>
        <ErrorText id="org-escalation-err">{errors.escalation}</ErrorText>
      </LabelRow>

      <LabelRow htmlFor="org-tz" label="Time zone" hint="Daily streaks, the weekly recap and snapshots run in this time zone.">
        <select id="org-tz" name="timezone" value={s.timezone} onChange={(e) => setS("timezone", e.target.value)} aria-invalid={!!errors.timezone}
          className={`${SELECT} ${errors.timezone ? "border-[#D1291F]" : "border-border-subtle"}`}>
          {ZONES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <ErrorText>{errors.timezone}</ErrorText>
      </LabelRow>

      <LabelRow htmlFor="org-fy" label="Fiscal year" hint="Sets the span of the yearly recap.">
        <select id="org-fy" name="fiscalYear" value={s.fiscalYear} onChange={(e) => setS("fiscalYear", e.target.value)} aria-invalid={!!errors.fiscalYear}
          className={`${SELECT} ${errors.fiscalYear ? "border-[#D1291F]" : "border-border-subtle"}`}>
          {FISCAL_YEARS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <ErrorText>{errors.fiscalYear}</ErrorText>
      </LabelRow>
    </div>
  );
}

// ── Gamification (RND-12, 16, 17) ─────────────────────────────────────────────
function Preview({ multipliers, valid }) {
  const [type, setType] = useState("Feature");
  const [res, setRes] = useState(null); // { currentXP, previewXP } | "error"
  const key = JSON.stringify(multipliers);
  useEffect(() => {
    if (!valid) return undefined;
    let live = true;
    const t = setTimeout(() => {
      api.post("/api/director/gamification/preview", { taskType: type, baseXP: 50, proposedMultipliers: JSON.parse(key) }, { silent: true })
        .then((r) => live && setRes(r)).catch(() => live && setRes("error"));
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [type, key, valid]);

  const diff = res && res !== "error" ? res.previewXP - res.currentXP : 0;
  return (
    <div className="mt-3 rounded-xl border border-border-subtle bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="text-sm font-bold text-text-primary">Preview: what this changes</h3>
        <label className="flex items-center gap-2 text-xs text-text-secondary">Sample task
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-lg border border-border-subtle bg-white px-2 text-sm font-semibold text-text-primary">
            {TASK_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-1 text-xs text-text-secondary">A Medium-priority {type} task with a base of 50 XP, approved on time.</p>
      <div aria-live="polite" className="mt-3">
        {!valid ? <p className="text-sm text-text-secondary">Correct the marked multipliers to see the preview.</p>
          : res === "error" ? <p role="alert" className="text-sm text-[#B01F17]">The preview could not be loaded. Your values are not lost; try changing the sample task.</p>
          : !res ? <p className="text-sm text-text-secondary">Working out the sample…</p>
          : (
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-text-secondary">
              <span>Saved rules: <strong className="text-lg font-black tabular-nums text-text-primary">{res.currentXP} XP</strong></span>
              <span aria-hidden="true">→</span>
              <span>With these values: <strong className="text-lg font-black tabular-nums text-[#4B2FC4]">{res.previewXP} XP</strong></span>
              <span className="font-semibold text-text-primary">{diff === 0 ? "No change for this task." : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} XP per task like this.`}</span>
            </p>
          )}
      </div>
      <p className="mt-2 text-xs text-text-secondary">Only tasks approved after you save use the new rules. XP that people already have does not change. The streak bonus and the badge numbers are not part of this sample.</p>
    </div>
  );
}

export function GamificationSection({ s, setS, errors, onRestored }) {
  const addToast = useUiStore((st) => st.addToast);
  const uid = useId();
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [busy, setBusy] = useState(false);
  const r = s.rules;
  const setRule = (part, key, v) => setS("rules", key === null ? { ...r, [part]: v } : { ...r, [part]: { ...r[part], [key]: v } });
  const xpValid = !TASK_TYPES.some((t) => errors[`xp.${t}`]);
  const isRecommended = JSON.stringify(withDefaults(r)) === JSON.stringify(RECOMMENDED);

  async function restore() {
    if (reason.trim().length < 5) { setReasonError("Write a short reason (at least 5 characters). It goes to the audit log."); document.getElementById(`${uid}-reason`)?.focus(); return; }
    setBusy(true);
    try {
      const d = await api.post("/api/director/gamification/restore-defaults", { confirm: true, reason: reason.trim() });
      onRestored(withDefaults(d.gamificationRules));
      addToast({ type: "success", message: "Recommended defaults restored." });
      setRestoreOpen(false); setReason(""); setReasonError("");
    } catch (e) { setReasonError(e?.message ?? "The defaults could not be restored. Try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col">
      <LabelRow label="XP by task type" hint="The base XP of a task is multiplied by this number. 1 means normal XP. Allowed: 0.5 to 2, in steps of 0.1.">
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
          {TASK_TYPES.map((t) => (
            <div key={t}>
              <label htmlFor={`${uid}-xp-${t}`} className="mb-1 block text-xs font-semibold text-text-secondary">{t}</label>
              <NumberField id={`${uid}-xp-${t}`} value={r.xpMultipliers[t]} onChange={(v) => setRule("xpMultipliers", t, v)} error={errors[`xp.${t}`]} unit="×" step={0.1} min={0.5} max={2} />
            </div>
          ))}
        </div>
        <Preview multipliers={r.xpMultipliers} valid={xpValid} />
      </LabelRow>

      <LabelRow htmlFor={`${uid}-streak`} label="Streak bonus" hint="XP is multiplied by this while a person has an active daily streak. Allowed: 1 (no bonus) to 1.5.">
        <NumberField id={`${uid}-streak`} value={r.streakBonus} onChange={(v) => setRule("streakBonus", null, v)} error={errors.streakBonus} unit="×" step={0.05} min={1} max={1.5} />
      </LabelRow>

      <LabelRow label="Badges" hint="How much it takes to earn each badge. The First task badge is always given for 1 finished task.">
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
          {BADGES.map((b) => (
            <div key={b.key}>
              <label htmlFor={`${uid}-b-${b.key}`} className="mb-1 block text-xs font-semibold text-text-secondary">{b.label} <span className="font-normal">({b.min} to {b.max})</span></label>
              <NumberField id={`${uid}-b-${b.key}`} value={r.badgeThresholds[b.key]} onChange={(v) => setRule("badgeThresholds", b.key, v)} error={errors[`badge.${b.key}`]} unit={b.unit} min={b.min} max={b.max} />
            </div>
          ))}
        </div>
      </LabelRow>

      <LabelRow label="Celebration level" hint="How much animation people see when they earn something. Applies to the whole organization.">
        <div role="group" aria-label="Celebration level" className="flex flex-wrap gap-2">
          {["Full", "Quiet", "Off"].map((lvl) => (
            <button key={lvl} type="button" aria-pressed={s.celebrationLevel === lvl} onClick={() => setS("celebrationLevel", lvl)}
              className={`h-10 rounded-lg border px-4 text-sm font-bold transition-colors ${s.celebrationLevel === lvl ? "border-transparent text-white" : "border-border-subtle bg-white text-text-secondary hover:border-ink/25"}`}
              style={s.celebrationLevel === lvl ? { background: ACCENT } : undefined}>{lvl}</button>
          ))}
        </div>
      </LabelRow>

      <LabelRow label="Weekly recap" hint="Show the recap on the first sign-in after each week.">
        <Toggle on={s.recapEnabled} onToggle={() => setS("recapEnabled", !s.recapEnabled)} label="Weekly recap" />
      </LabelRow>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/[0.06] pt-4">
        <p className="min-w-0 flex-1 basis-64 text-xs leading-relaxed text-text-secondary">
          Recommended defaults: every task type 1 ×, streak bonus 1.1 ×, badges at 10 tasks, 7 days and 30 days.
          {isRecommended ? " These values are in use now." : ""}
        </p>
        <button type="button" onClick={() => { setReasonError(""); setRestoreOpen(true); }}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-subtle bg-white px-4 text-sm font-bold text-text-primary hover:bg-ink/[0.04]">
          <RotateCcw size={14} aria-hidden="true" /> Restore recommended defaults
        </button>
      </div>

      <ConfirmModal open={restoreOpen} onClose={() => !busy && setRestoreOpen(false)} onConfirm={restore} loading={busy} confirmLabel="Restore defaults"
        title="Restore the recommended defaults?"
        body="XP multipliers, the streak bonus and the badge numbers go back to the recommended values at once, for the whole organization. XP that people already have does not change. Celebration level and weekly recap are not touched.">
        <label htmlFor={`${uid}-reason`} className="block text-sm font-bold text-text-primary">Reason</label>
        <textarea id={`${uid}-reason`} rows={3} maxLength={300} value={reason} onChange={(e) => { setReason(e.target.value); setReasonError(""); }}
          aria-invalid={!!reasonError} aria-describedby={reasonError ? `${uid}-reason-err` : undefined} placeholder="For example: the test values are no longer needed…"
          className="mt-1.5 w-full rounded-xl border border-border-subtle p-3 text-sm" />
        <ErrorText id={`${uid}-reason-err`}>{reasonError}</ErrorText>
      </ConfirmModal>
    </div>
  );
}
