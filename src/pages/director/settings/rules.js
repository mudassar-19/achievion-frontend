// Director Settings: bounds, plain messages and server-message mapping for Gamification, Working Time and
// Extension Rules (UI-E1). Pure (no imports) so rules.test.mjs runs with `node --test`.
// The server decides (D-431 gamification bounds, D-436 working hours, D-423 extension rules); this mirrors its ranges
// so a wrong value is explained before the request, and turns a server 400 into the same plain words.

export const TASK_TYPES = ["Feature", "Bug", "Design", "Testing", "DevOps", "Documentation"];
export const BADGES = [
  { key: "tenTasks", label: "Ten tasks", unit: "tasks done", min: 5, max: 50 },
  { key: "streak7", label: "7-day streak", unit: "days in a row", min: 3, max: 14 },
  { key: "streak30", label: "30-day streak", unit: "days in a row", min: 15, max: 60 },
];
// Same values as the server's DEFAULT_GAMIFICATION_RULES (RND-12).
export const RECOMMENDED = {
  xpMultipliers: Object.fromEntries(TASK_TYPES.map((t) => [t, 1])),
  streakBonus: 1.1,
  badgeThresholds: { firstTask: 1, tenTasks: 10, streak7: 7, streak30: 30 },
};

// The stored rules can miss whole parts (the server replaces the object on save); fill them from the defaults.
export const withDefaults = (r) => ({
  xpMultipliers: { ...RECOMMENDED.xpMultipliers, ...(r?.xpMultipliers ?? {}) },
  streakBonus: r?.streakBonus ?? RECOMMENDED.streakBonus,
  badgeThresholds: { ...RECOMMENDED.badgeThresholds, ...(r?.badgeThresholds ?? {}) },
});

const num = (v) => (v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));
const onStep = (v, step) => Math.abs(v / step - Math.round(v / step)) < 1e-6;
const drop = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v));

export function gamificationErrors(r) {
  const e = {};
  for (const t of TASK_TYPES) {
    const v = num(r.xpMultipliers[t]);
    e[`xp.${t}`] = v === null ? "Enter a number." : v < 0.5 || v > 2 ? "Enter a value between 0.5 and 2." : !onStep(v, 0.1) ? "Use steps of 0.1, for example 0.9 or 1.2." : "";
  }
  const s = num(r.streakBonus);
  e.streakBonus = s === null ? "Enter a number." : s < 1 || s > 1.5 ? "Enter a value between 1 and 1.5." : "";
  for (const b of BADGES) {
    const v = num(r.badgeThresholds[b.key]);
    e[`badge.${b.key}`] = v === null ? "Enter a number." : !Number.isInteger(v) ? "Enter a whole number." : v < b.min || v > b.max ? `Enter a whole number between ${b.min} and ${b.max}.` : "";
  }
  return drop(e);
}

// weekendDays: day numbers 0 (Sun) to 6 (Sat) that are NOT worked.
export function workingTimeErrors({ hours, weekendDays }) {
  const h = num(hours);
  return drop({
    hours: h === null ? "Enter a number." : h < 4 || h > 12 ? "Enter a value between 4 and 12 hours." : !onStep(h, 0.5) ? "Use half hours, for example 7 or 7.5." : "",
    days: weekendDays.length >= 7 ? "Keep at least one working day." : "",
    warning: h !== null && h > 8 && h <= 12 ? `${h} hours is above 8. Plans made with this number leave little room for meetings, reviews and breaks.` : "",
  });
}
// Switch one day between working and weekend; the last working day stays.
export const toggleWeekend = (weekendDays, day) =>
  weekendDays.includes(day) ? weekendDays.filter((d) => d !== day) : weekendDays.length >= 6 ? weekendDays : [...weekendDays, day].sort((a, b) => a - b);

export function extensionErrors({ days, pct, cap }) {
  const d = num(days), p = num(pct), c = num(cap);
  return drop({
    days: d === null ? "Enter a number." : !Number.isInteger(d) ? "Enter a whole number of days." : d < 0 || d > 10 ? "Enter 0 to 10 days." : "",
    pct: p === null ? "Enter a number." : p < 0 || p > 50 ? "Enter 0 to 50 percent." : "",
    cap: c === null ? "Enter a number." : c < 0 || c > 50 ? "Enter 0 to 50 percent." : p !== null && c < p ? `The total cannot be lower than the single-extension limit (${p}%).` : "",
  });
}
export const extensionSentence = ({ days, pct, cap }) =>
  `A Manager can approve an extension alone only when it is at most ${days} working day${Number(days) === 1 ? "" : "s"} AND at most ${pct}% of the original timeline. Both must be true. `
  + `All extensions of one task together may not pass ${cap}% of the original timeline. Anything more goes to the Director for approval.`;

// ── Alerts: rules for the whole organization (item 43) ────────────────────────
// Bounds are proposals (docs/ui/UI_E1B_DECISIONS_PROPOSED.md); defaults are the numbers already named in the commitments
// (80% deadline warning D-018, HP under 30% FR05-10, 5 minutes offline for email, one FYI a day).
export const ALERT_FIELDS = [
  { key: "overloadLimitPct", label: "Overload limit", hint: "A person counts as overloaded above this share of their daily capacity.", unit: "% of capacity", min: 50, max: 150, step: 5 },
  { key: "deadlineWarnPct", label: "Deadline warning point", hint: "Warn when this share of a task's time has passed and it is not done.", unit: "% of the time", min: 50, max: 95, step: 5 },
  { key: "hpThresholdPct", label: "Burnout warning (energy)", hint: "Tell the Manager when a person's energy (their health points, HP) falls under this.", unit: "% HP", min: 10, max: 60, step: 5 },
  { key: "emailDelayMin", label: "Email after inactivity", hint: "Email a notification only when the person has been away this long.", unit: "minutes", min: 1, max: 60, step: 1 },
  { key: "dailyFyiLimit", label: "Daily FYI limit", hint: "Most low-priority (FYI) notifications one person gets in a day.", unit: "per day", min: 1, max: 10, step: 1 },
];
export const ALERT_DEFAULTS = { overloadLimitPct: 100, deadlineWarnPct: 80, hpThresholdPct: 30, streakReminder: true, emailDelayMin: 5, dailyFyiLimit: 1 };
export const alertRules = (stored) => ({ ...ALERT_DEFAULTS, ...Object.fromEntries(Object.keys(ALERT_DEFAULTS).filter((k) => stored?.[k] !== undefined).map((k) => [k, stored[k]])) });
export function alertErrors(r) {
  const e = {};
  for (const f of ALERT_FIELDS) {
    const v = num(r[f.key]);
    e[f.key] = v === null ? "Enter a number." : !Number.isInteger(v) ? "Enter a whole number." : v < f.min || v > f.max ? `Enter a value between ${f.min} and ${f.max}.` : "";
  }
  return drop(e);
}

// ── Organization ──────────────────────────────────────────────────────────────
export const FISCAL_YEARS = [["calendar", "Calendar year (Jan to Dec)"], ["july-june", "July to June"]];
// people = [{ id }]: the organization's members the escalation contact can be.
export function orgErrors({ orgName, escalationContactId, timezone, fiscalYear }, people) {
  const n = String(orgName ?? "").trim();
  return drop({
    orgName: !n ? "Organization name is required." : n.length > 80 ? "Use 80 characters or fewer." : "",
    escalation: !escalationContactId ? "Choose who is told about an escalation that has no handler." : !people.some((p) => String(p.id) === String(escalationContactId)) ? "Choose a person from the list." : "",
    timezone: !timezone ? "Choose a time zone." : "",
    fiscalYear: !FISCAL_YEARS.some(([k]) => k === fiscalYear) ? "Choose a fiscal year." : "",
  });
}

// Server 400 text → { field, message } in the words of the screen. Unknown text is passed through with field null.
export function fromServer(text) {
  const t = String(text ?? "");
  let m;
  if ((m = t.match(/^xpMultipliers\.(\w+) must be between/))) return { field: `xp.${m[1]}`, message: `${m[1]}: enter a value between 0.5 and 2.` };
  if ((m = t.match(/^xpMultipliers\.(\w+) must be a multiple/))) return { field: `xp.${m[1]}`, message: `${m[1]}: use steps of 0.1.` };
  if (/^streakBonus/.test(t)) return { field: "streakBonus", message: "Streak bonus: enter a value between 1 and 1.5." };
  const label = (k) => BADGES.find((b) => b.key === k)?.label ?? k;
  if ((m = t.match(/^badgeThresholds\.(\w+) must be less than (\w+)/))) return { field: `badge.${m[1]}`, message: `"${label(m[1])}" must be lower than "${label(m[2])}".` };
  if ((m = t.match(/^badgeThresholds\.(\w+) must be an integer between (\d+) and (\d+)/))) return { field: `badge.${m[1]}`, message: `${label(m[1])}: enter a whole number between ${m[2]} and ${m[3]}.` };
  if (/^hoursPerDay must be between/.test(t)) return { field: "hours", message: "Planning hours per day: enter a value between 4 and 12." };
  if (/^hoursPerDay must be a multiple/.test(t)) return { field: "hours", message: "Planning hours per day: use half hours." };
  if (/^At least one working day/.test(t)) return { field: "days", message: "Keep at least one working day." };
  if (/^Escalation contact/.test(t)) return { field: "escalation", message: "Escalation contact: choose a person from your organization." };
  if (/^extensionMaxDays/.test(t)) return { field: "days_ext", message: "Single extension (days): enter a whole number from 0 to 10." };
  if (/^extensionMaxPct/.test(t)) return { field: "pct", message: "Single extension (%): enter 0 to 50." };
  if (/^extensionCumCapPct must be >=/.test(t)) return { field: "cap", message: "Total per task (%): it cannot be lower than the single-extension limit." };
  if (/^extensionCumCapPct/.test(t)) return { field: "cap", message: "Total per task (%): enter 0 to 50." };
  return { field: null, message: t || "The settings could not be saved." };
}
