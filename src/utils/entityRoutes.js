// AI entity cards (QA4 Y-1, M-1): where a card opens, per portal. Only screens that already exist. Pure, so entityRoutes.test.mjs runs with node --test.
// entity (API_CONTRACT_QA4 §5) = { type: "person"|"task"|"project"|"sprint"|"flag"|"request", id, label?, name?, title?, ...card data }
const MAP = {
  Manager: {
    person: (e) => `/manager/resources?member=${e.id}`, task: (e) => `/manager/tasks?task=${e.id}`, project: (e) => `/manager/projects/${e.id}`,
    sprint: (e) => `/manager/sprints/${e.id}`, flag: () => "/manager/anomalies", request: () => "/manager/inbox", approval: () => "/manager/inbox", extension: () => "/manager/inbox",
  },
  "Team Lead": {
    person: () => "/teamlead/team", task: (e) => `/teamlead/tasks?task=${e.id}`, project: (e) => `/teamlead/modules/${e.id}`,
    sprint: (e) => `/teamlead/sprints/${e.id}`, flag: () => "/teamlead/team", request: () => "/teamlead/requests", approval: () => "/teamlead/requests", extension: () => "/teamlead/requests",
  },
  Director: {
    person: () => "/director/capacity", task: (e) => (e.projectId ? `/director/projects/${e.projectId}` : "/director/projects"), project: (e) => `/director/projects/${e.id}`,
    sprint: (e) => (e.projectId ? `/director/projects/${e.projectId}` : "/director/projects"), flag: () => "/director/anomalies", request: () => "/director/extensions", approval: () => "/director/approvals", extension: () => "/director/extensions",
  },
};
const EMPLOYEE = { task: (e) => `/workspace/tasks/${e.id}` };

export function entityPath(entity, role) {
  const r = String(role ?? "").toLowerCase().replace("_", " ");
  const table = r === "manager" ? MAP.Manager : r === "team lead" ? MAP["Team Lead"] : r === "director" ? MAP.Director : EMPLOYEE;
  return table[entity?.type]?.(entity ?? {}) ?? null;
}

// What a card shows, from the server's card data. Names come from the server (entities[].name / label / title); nothing is built from the answer text.
export function entityView(e) {
  const name = e.name ?? e.label ?? e.title ?? (e.type === "sprint" ? e.sprint : "") ?? "";
  const stats = [], add = (label, value) => { if (value != null && value !== "") stats.push({ label, value }); };
  let sub = "";
  if (e.type === "person") { sub = e.role ?? ""; add("Load", e.loadPct != null ? `${e.loadPct}%` : null); add("Free", e.freeHoursPerDay != null ? `${e.freeHoursPerDay} h/day` : null); add("Overdue", e.overdue); }
  else if (e.type === "task") { sub = [e.project, e.status].filter(Boolean).join(" · "); add("Due", e.deadline ? String(e.deadline).slice(0, 10) : null); }
  else if (e.type === "project") { sub = e.band ?? ""; add("Done", e.progressPct != null ? `${e.progressPct}%` : null); add("Overdue", e.overdue); }
  else if (e.type === "sprint") { add("Done", e.done != null && e.total != null ? `${e.done}/${e.total}` : null); add("Ends", e.endDate ? String(e.endDate).slice(0, 10) : null); }
  else if (e.type === "flag") { sub = e.kind ?? ""; add("Age", e.ageDays != null ? `${e.ageDays} d` : null); }
  return { name: name || "Item", sub, stats };
}
