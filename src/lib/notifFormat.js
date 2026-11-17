// Director notifications: tier, words and counts (UI-E2, master list item 34). Pure (no imports) so notifFormat.test.mjs
// runs with `node --test`. The server's type and tier are not changed; this maps them for the screen only.

export const FILTERS = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "needs_action", label: "Needs action" },
  { id: "fyi", label: "FYI" },
];

const TIER_BY_TYPE = {
  approval_pending: "needs_action", approval_required: "needs_action", project_at_risk: "needs_action",
  escalation: "critical", org_health_drop: "critical", system_incident: "critical",
  recap_ready: "fyi", xp_milestone: "fyi",
};
// A request waiting for the Director is "Needs action" even when an old record says FYI (item 34).
export const tierOf = (n) => TIER_BY_TYPE[n?.type] ?? (["critical", "needs_action", "fyi"].includes(n?.tier) ? n.tier : "fyi");

const CODE_WORDS = {
  CREATE_EMPLOYEE: "create an employee", DELETE_EMPLOYEE: "delete an employee", SUSPEND_EMPLOYEE: "suspend an employee",
  REACTIVATE_EMPLOYEE: "reactivate an employee", ROLE_CHANGE: "change an employee's role", TASK_ASSIGNMENT: "assign a task",
};
// "New DELETE_EMPLOYEE request pending your approval" → plain words. Other text is left as it is.
export function humanText(n) {
  let t = String(n?.message ?? "");
  t = t.replace(/^New ([A-Z_]+) request pending your approval$/, (m, code) => (CODE_WORDS[code] ? `New request to ${CODE_WORDS[code]} is waiting for your approval` : m));
  return t.replace(/\b[A-Z]+(?:_[A-Z]+)+\b/g, (code) => CODE_WORDS[code] ?? code.toLowerCase().replace(/_/g, " "));
}

// Unread numbers only (a read notification is not counted anywhere).
export function unreadCounts(list) {
  const c = { all: 0, critical: 0, needs_action: 0, fyi: 0 };
  for (const n of list) if (!n.read) { c.all++; c[tierOf(n)]++; }
  return c;
}

export const filterList = (list, id) => (id === "all" ? list : list.filter((n) => tierOf(n) === id));

// ── Bell wording (QA4 M-16). Screen-only fixes; the server text is not changed. ──────────────────────────────
// "Bilal Ahmed is at Over capacity x1.1 of daily capacity" → "Bilal Ahmed is at 110% of daily capacity".
export function bellText(message) {
  return String(message ?? "").replace(/\b(?:Over capacity |At capacity )?x(\d+(?:\.\d+)?) of daily capacity/g, (m, x) => `${Math.round(Number(x) * 100)}% of daily capacity`);
}
const VERBS = "Approved|Rejected|Declined|Requested|Assigned|Updated|Created|Published|Closed|Started|Added|Removed|Completed|Resolved";
// A generic title gets the person's name from the sentence; "Extension Approved" becomes "Extension approved".
export function bellTitle(title, message) {
  const t = String(title ?? "");
  if (/^someone is over their (limit|capacity)/i.test(t)) {
    const who = /^(.+?) is at \d/.exec(bellText(message))?.[1];
    if (who) return `${who} is over capacity`;
  }
  return new RegExp(`^[A-Z][a-z]+ (?:[A-Z][a-z]+ )?(?:${VERBS})$`).test(t) ? t.charAt(0) + t.slice(1).toLowerCase() : t;
}
