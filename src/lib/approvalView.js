// Item 11 leftovers (Director approvals page). Pure. Tests: approvalView.test.mjs.
const DAY = 86_400_000;
export const WAITING_DAYS = 3;

export const waitingDays = (createdAt, now = new Date()) => (createdAt ? Math.floor((+now - +new Date(createdAt)) / DAY) : 0);
export const isWaiting = (createdAt, now = new Date()) => !!createdAt && waitingDays(createdAt, now) >= WAITING_DAYS;

// Same table as the server's `conflictWith`: requests about one person that cannot both be answered.
const CONTRADICT = { DELETE_EMPLOYEE: ["SUSPEND_EMPLOYEE", "REACTIVATE_EMPLOYEE", "ROLE_CHANGE"], SUSPEND_EMPLOYEE: ["DELETE_EMPLOYEE", "REACTIVATE_EMPLOYEE"],
  REACTIVATE_EMPLOYEE: ["DELETE_EMPLOYEE", "SUSPEND_EMPLOYEE"], ROLE_CHANGE: ["DELETE_EMPLOYEE"] };
const WORD = { DELETE_EMPLOYEE: "delete", SUSPEND_EMPLOYEE: "suspend", REACTIVATE_EMPLOYEE: "reactivate", ROLE_CHANGE: "role change" };
export function conflictNote(acc, all) {
  const target = acc.targetEmployeeId?._id ?? acc.targetEmployeeId;
  if (!target) return null;
  const other = all.find((o) => o._id !== acc._id && String(o.targetEmployeeId?._id ?? o.targetEmployeeId) === String(target) && (CONTRADICT[acc.actionType] ?? []).includes(o.actionType));
  return other ? `A ${WORD[other.actionType]} request for the same person is also waiting. Decide one, then the other.` : null;
}

// Deleting an account is confirmed by typing the person's name (an empty or unknown name is never accepted).
export const deleteConfirmed = (typed, name) => !!String(name ?? "").trim() && String(typed ?? "").trim().toLowerCase() === String(name).trim().toLowerCase();

// The role the person has NOW comes from the account; the request's own old role is only mentioned when it differs.
export function roleChangeText({ name, currentRole, requestedFrom, to }) {
  const now = currentRole ?? requestedFrom ?? "current role unknown";
  const stale = currentRole && requestedFrom && currentRole !== requestedFrom ? ` (the request was written when ${name} was a ${requestedFrom})` : "";
  return `${name}: ${now} → ${to ?? "unknown role"}${stale}`;
}
