// Mirrors server/services/xpEngine.js (D-066): xpValue is the XP base; blank → priority default.
export const PRIORITY_BASE_XP = { Critical: 100, High: 75, Medium: 50, Low: 25 };
export const XP_VALUE_MIN = 10;
export const XP_VALUE_MAX = 1000;

// "" or a whole number 10-1000 → null (ok); anything else → error message.
export function xpValueError(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= XP_VALUE_MIN && n <= XP_VALUE_MAX ? null : `Whole number from ${XP_VALUE_MIN} to ${XP_VALUE_MAX}`;
}

// Review score shown to employees (D-063/D-064): the TL's 0-100 score; older reviews only have stars,
// counted as stars × 20. Stars always come from the score: clamp(round(score / 20), 1, 5).
export const reviewScore = (task) =>
  Number.isFinite(task?.tlScore) ? task.tlScore : Number.isFinite(task?.qualityScore) ? task.qualityScore * 20 : null;
export const starsFromScore = (score) => Math.min(5, Math.max(1, Math.round(score / 20)));

// S-1: what the employee sees after a review. T-4 writes reviewNote + revisionHistory; older paths wrote
// rejectionFeedback, revisionNotes or (POST /review) only reviewNote. Reads all of them; changes no data.
export function reviewResult(task) {
  const last = (task?.revisionHistory ?? []).filter((h) => h.type === "revision_requested").at(-1);
  const count = task?.resubmissionCount ?? task?.revisionCount ?? 0;
  const fromHistory = last?.comment ? [last.comment, last.unmetCriteria?.length ? `Not met: ${last.unmetCriteria.join("; ")}` : ""].filter(Boolean).join(" ") : null;
  const done = task?.status === "Done";
  return {
    revisionReason: fromHistory ?? task?.revisionNotes ?? task?.rejectionFeedback ?? (!done && count > 0 ? task?.reviewNote ?? null : null),
    feedback: done ? task?.reviewNote ?? null : null,
    revisionCount: count,
  };
}
