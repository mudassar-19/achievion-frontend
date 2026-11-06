// E-4 Tester Quality: words, chips and the board edges for the client. The server (services/qualityRules.js) decides; this
// only explains a refused drop before it is sent and opens the note form where a move needs one.
export const BUG_COLUMNS = [
  { key: "Open", label: "Open", color: "#B01F17" }, { key: "Fixed", label: "Fixed", color: "#1948BD" },
  { key: "Verified", label: "Verified", color: "#0E6A30" }, { key: "Closed", label: "Closed", color: "#4F5B75" },
];
export const SEVERITY_CHIP = { Critical: "at_risk", High: "rejected", Medium: "pending", Low: "on_hold" };
export const BUG_CHIP = { Open: "at_risk", Fixed: "maintenance", Verified: "approved", Closed: "on_hold" };
export const VALIDITY_LABEL = { pending: "Waiting for the Team Lead", valid: "Accepted", invalid: "Not accepted", duplicate: "Duplicate" };
export const RESULT_CHIP = { Pass: "approved", Fail: "rejected", Blocked: "pending" };
export const ACTION_LABEL = { reported: "Reported", valid: "Accepted", invalid: "Not accepted", duplicate: "Marked duplicate", fixed: "Fixed", verified: "Verified", reopened: "Reopened", closed: "Closed" };

// Allowed board edges; moves that need a note open the bug instead of moving at once.
const EDGES = { Open: ["Fixed", "Closed"], Fixed: ["Verified", "Open"], Verified: ["Closed"], Closed: [] };
export function boardVerdict(bug, to) {
  if (bug.status === to) return { ok: false, reason: null };
  if (!EDGES[bug.status]?.includes(to)) return { ok: false, reason: `A bug cannot move from ${bug.status} to ${to}.` };
  if (to === "Fixed" || (bug.status === "Fixed" && to === "Open")) return { ok: true, action: "note" };
  return { ok: true };
}
