// X-2 (D-QA3B-2): one layer that turns internal keys into plain words. Pure, so humanize.test.mjs runs with `node --test`.
// No snake_case event names, no config key names, no decision ids, and no "HR" wording reach the screen.

const SNAKE = /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)+$|^[a-z]+$/;

// Words for server notification types (title shown when the server sent no real title, or sent a key).
const TYPE_TITLE = {
  needs_action: "Needs your action", approval_required: "Approval needed", approval_pending: "Approval needed", approval_result: "Approval decided",
  extension_requested: "Extension request", extension_requested_fyi: "Extension requested", extension_approved: "Extension approved", extension_rejected: "Extension declined",
  more_tries_requested: "More tries requested", review_requested: "Review requested", task_assigned: "New task", mention: "You were mentioned",
  chat_dm: "New direct message", project_at_risk: "Project at risk", escalation: "Escalation", recap_ready: "Weekly recap is ready", xp_milestone: "XP milestone",
  org_health_drop: "Organization health dropped", system_incident: "System notice", deadline_soon: "Deadline coming up", deadline_missed: "Deadline missed",
};

const ACTION_LABEL = {
  company_community_created: "Company community created", report_exported: "Report exported", extension_approved: "Extension approved",
  extension_requested: "Extension requested", extension_rejected: "Extension declined", role_change: "Role changed", account_status_change: "Account status changed",
  account_deleted: "Account removed", employee_created: "Employee added", settings_updated: "Settings updated", workspace_updated: "Workspace settings updated",
  portfolio_view_saved: "Portfolio view saved", portfolio_view_updated: "Portfolio view updated", portfolio_view_deleted: "Portfolio view removed",
  view_as_started: "View as started", view_as_ended: "View as ended", sim_data_tidy: "Sim data tidy",
};

export const isKey = (s) => typeof s === "string" && SNAKE.test(s.trim());
const sentence = (key) => { const t = String(key).trim().replace(/[_-]+/g, " ").toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };

/** "needs_action" -> "Needs your action"; any other snake_case key -> "Sentence case"; real titles pass through. */
export function notifTitle(n) {
  const t = n?.title;
  if (t && !isKey(t)) return humanizeText(t);
  return TYPE_TITLE[t] ?? TYPE_TITLE[n?.type] ?? (t ? sentence(t) : n?.type ? sentence(n.type) : "Notification");
}

/** "company_community_created" -> "Company community created". */
export const actionLabel = (action) => ACTION_LABEL[action] ?? (action ? sentence(action) : "Event");

// Config names the server may put in a sentence -> plain phrases.
const CONFIG_WORDS = [
  [/exceeds\s+extensionMaxDays\s*\((\d+)\)/gi, "is more than the $1-working-day limit"],
  [/extensionMaxDays/gi, "the extension limit"],
  [/extensionMaxPercent|extensionMaxPct/gi, "the extension percentage limit"],
  [/extensionTotalPercent|extensionTotalPct/gi, "the total extension limit"],
  [/weeklySummaryEnabled/gi, "weekly recap"],
  [/overloadThreshold/gi, "overload limit"],
];

/** Removes decision ids ("(D-026)"), config key names and kachha action names from a sentence. */
export function humanizeText(text) {
  if (text == null) return "";
  let t = String(text);
  for (const [re, to] of CONFIG_WORDS) t = t.replace(re, to);
  t = t.replace(/\s*\(\s*D-\d{3}[^)]*\)/g, "").replace(/\bD-\d{3}\b/g, "");
  t = t.replace(/\bExtension approve:/g, "Extension approved:").replace(/\bExtension reject:/g, "Extension declined:");
  t = t.replace(/\bHR (approvals?|requests?)\b/gi, "employee $1").replace(/\bHR\b/g, "employee");
  return t.replace(/\s{2,}/g, " ").trim();
}

/** "+4d" calendar days stay as written elsewhere; this makes "4 working days" wording. */
export const workingDays = (n) => `${n} working day${Number(n) === 1 ? "" : "s"}`;
