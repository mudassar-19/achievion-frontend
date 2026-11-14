// Live leaderboard helpers (Batch 3, E4). Pure: the server ranks (ties share a rank), the page only compares two answers.
const rankOf = (rows, id) => (rows ?? []).find((r) => String(r.userId) === String(id))?.rank ?? null;

/** My move between two server answers: { dir: "up" | "down", by, rank } or null (no change, first load, not ranked). */
export function myMove(prev, next, meId) {
  const a = rankOf(prev, meId), b = rankOf(next, meId);
  if (a === null || b === null || a === b) return null;
  return { dir: b < a ? "up" : "down", by: Math.abs(a - b), rank: b };
}
/** Same people in the same order? (then nothing has to move) */
export const sameOrder = (a = [], b = []) => a.length === b.length && a.every((r, i) => String(r.userId) === String(b[i].userId));
