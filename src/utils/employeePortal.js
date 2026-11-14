// Employee portal (Developer, Designer, Tester) on the universal shell (E-1). Pure data so tests can import it;
// EmployeeShell maps each item's `icon` key to a lucide icon. Source: Employee UX doc §3.1 and §3.2.

/** "Senior Developer" → "developer"; non-employee roles → null. */
export function employeeKind(role) {
  const m = /(Developer|Designer|Tester)$/.exec(role ?? "");
  return m ? m[1].toLowerCase() : null;
}

export const ROLE_WORDS = {
  developer: ["build", "ship", "review"],
  designer:  ["create", "iterate", "approve"],
  tester:    ["inspect", "verify", "report"],
};

/** home = the role's dashboard path (Seniors land on /workspace/senior). */
export function employeeNav(kind, home) {
  return [
    { label: "Work", items: [
      { icon: "today",       label: "Today",          to: home, end: true },
      { icon: "tasks",       label: "My tasks",       to: "/workspace/tasks" },
      { icon: "submissions", label: "My submissions", to: "/workspace/submissions" },
    ] },
    ...(kind === "tester" ? [{ label: "Quality", items: [
      { icon: "qa",        label: "QA queue",   to: "/workspace/qa" },
      { icon: "bugs",      label: "Bug board",  to: "/workspace/bugs" },
      { icon: "testcases", label: "Test cases", to: "/workspace/test-cases" },
    ] }] : []),
    { label: "Play", items: [
      { icon: "quests",       label: "Quests",          to: "/workspace/quests" },
      { icon: "leaderboard",  label: "Leaderboard",     to: "/workspace/leaderboard" },
      { icon: "achievements", label: "Achievements",    to: "/workspace/achievements" },
      { icon: "shop",         label: "Shop",            to: "/workspace/shop" },
      { icon: "inventory",    label: "Inventory",       to: "/workspace/inventory" },
    ] },
    { label: "Talk", items: [
      { icon: "chat",          label: "Collaboration", to: "/workspace/chat" },
      { icon: "announcements", label: "Announcements", to: "/workspace/announcements" },
      { icon: "ai",            label: "AI assistant",  to: "/workspace/ai" }, // Batch 4 (E14, FR08-01)
    ] },
  ];
}

/** Old /workspace/<key> URLs → their new place (the old pages are reused there until their own step). */
export const OLD_EMPLOYEE_URLS = {
  badges: "/workspace/achievements",
  avatar: "/workspace/inventory",
  sprint: "/workspace/tasks",
};

/** Notification link for an employee: only employee pages (never the Manager-only /workspace pages). */
export function employeeNotifPath(type, cat, meta) {
  if (type.startsWith("bug_") && meta.bugId) return `/workspace/bugs?bug=${meta.bugId}`; // E-4: the bug board opens the bug
  if (type === "qa_signoff_done" && meta.taskId) return `/workspace/tasks/${meta.taskId}`;
  if ((cat === "task" || type.startsWith("extension_") || type === "design_handoff") && meta.taskId) return `/workspace/tasks/${meta.taskId}`; // E-3: extension answers; E-3b: design handoff
  if (cat === "task" || cat === "project" || type.startsWith("sprint_")) return "/workspace/tasks";
  if (cat === "gamification")         return "/workspace/achievements";
  if (cat === "team")                 return "/workspace";
  return "/workspace/notifications";
}

const STATUSES = ["Backlog", "To-Do", "In-Progress", "In-Review", "Done"];
/** My tasks filters kept in the URL (E-2): status, type, priority, sprint (id or "none"), blocked=1. */
export function filterMyTasks(rows, sp) {
  const status = sp.get("status"), type = sp.get("type"), priority = sp.get("priority"), sprint = sp.get("sprint"), blocked = sp.get("blocked") === "1";
  if (status && !STATUSES.includes(status)) return [];
  return rows.filter((r) => (!status || r.status === status) && (!type || r.type === type) && (!priority || r.priority === priority)
    && (!sprint || (sprint === "none" ? !r.sprint : String(r.sprint?.id) === sprint)) && (!blocked || r.blocked));
}

// Task status → StatusChip key and words (E-2).
export const STATUS_CHIP = { Backlog: "on_hold", "To-Do": "planned", "In-Progress": "maintenance", "In-Review": "pending", Done: "completed" };
export const statusLabel = (s) => (s === "To-Do" ? "To do" : String(s ?? "").replace("-", " "));
