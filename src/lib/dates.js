// X-1 (D-QA3B-1): the one date format for the whole app: "17 Nov 2026" and "17 Nov 2026, 3:05 PM", in the org / person time zone.
// Pure (no store import) so dates.test.mjs runs with `node --test`; the auth store calls setDatePrefs() when the user loads.
// Only an explicit "iso" date preference (2026-11-17) and a 24 h clock are honoured; the old "mdy"/"dmy" choices both give "17 Nov 2026".

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let prefs = { timeZone: undefined, dateFormat: "dmy", timeFormat: "12h" };

export function setDatePrefs(p = {}) {
  prefs = { timeZone: p.timezone || p.timeZone || undefined, dateFormat: p.dateFormat || "dmy", timeFormat: p.timeFormat || "12h" };
}

const valid = (d) => (d instanceof Date ? d : new Date(d));
// y/m/d/h/min of the instant as seen in the time zone (a bad zone name falls back to the browser's).
function parts(date, timeZone) {
  const opts = { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" };
  let f;
  try { f = new Intl.DateTimeFormat("en-US", { ...opts, timeZone }); } catch { f = new Intl.DateTimeFormat("en-US", opts); }
  const o = {};
  for (const p of f.formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, min: +o.minute };
}

// A date-only string ("2026-11-17") is a calendar day, not an instant: never shift it by the time zone.
const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;
function dayParts(v, timeZone) {
  if (typeof v === "string" && DAY_ONLY.test(v)) { const [y, m, d] = v.split("-").map(Number); return { y, m, d, h: 0, min: 0 }; }
  const date = valid(v);
  return Number.isNaN(date.getTime()) ? null : parts(date, timeZone);
}

/** "17 Nov 2026" (opts.year === false -> "17 Nov"). Empty / invalid -> "—". */
export function fmtDate(v, opts = {}) {
  if (!v) return opts.empty ?? "—";
  const p = dayParts(v, opts.timeZone ?? prefs.timeZone);
  if (!p) return opts.empty ?? "—";
  if (prefs.dateFormat === "iso" && opts.year !== false) return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  return opts.year === false ? `${p.d} ${MONTHS[p.m - 1]}` : `${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

/** "3:05 PM" or "15:05" (person's clock choice). */
export function fmtTime(v, opts = {}) {
  if (!v) return "";
  const p = dayParts(v, opts.timeZone ?? prefs.timeZone);
  if (!p) return "";
  const mm = String(p.min).padStart(2, "0");
  if (prefs.timeFormat === "24h") return `${String(p.h).padStart(2, "0")}:${mm}`;
  return `${p.h % 12 || 12}:${mm} ${p.h < 12 ? "AM" : "PM"}`;
}

/** "17 Nov 2026, 3:05 PM". */
export function fmtDateTime(v, opts = {}) {
  if (!v) return opts.empty ?? "—";
  const d = fmtDate(v, opts);
  return d === (opts.empty ?? "—") ? d : `${d}, ${fmtTime(v, opts)}`;
}

/** "17 Nov" when it is this year, else "17 Nov 2026" (short lists). */
export function fmtDateShort(v, opts = {}) {
  if (!v) return opts.empty ?? "—";
  const p = dayParts(v, opts.timeZone ?? prefs.timeZone);
  if (!p) return opts.empty ?? "—";
  const now = parts(new Date(), opts.timeZone ?? prefs.timeZone);
  return fmtDate(v, { ...opts, year: p.y !== now.y });
}

/** The calendar day (YYYY-MM-DD) of an instant in the time zone: for "is this the same day" checks. */
export function dayKey(v, timeZone) {
  const p = dayParts(v, timeZone ?? prefs.timeZone);
  return p ? `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}` : "";
}

/** Placeholder text for a native date input is browser-made; this is the hint to show next to it. */
export const DATE_HINT = "e.g. 17 Nov 2026";
