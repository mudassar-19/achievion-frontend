// Manager Tasks presets (QA4 M-28/M-32): one definition for "Overdue", "Due today", "Due this week".
// Overdue = past due and not Done. Due today is its own bucket. Due this week = after today, up to 7 days ahead.
const DAY = 86400000;
const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };

export function matchesPreset(t, preset, now = Date.now()) {
  if (!preset) return true;
  if (t.status === "Done" || !t.deadline) return false;
  const due = sod(t.deadline), today = sod(now);
  if (preset === "overdue") return due < today;
  if (preset === "due-today") return due === today;
  if (preset === "due-week") return due > today && due <= today + 7 * DAY;
  return true;
}
