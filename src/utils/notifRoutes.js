// Notification category and link target per role. Pure (no store, no socket) so tests can import it (E-1).
import { employeeKind, employeeNotifPath } from "./employeePortal.js";
// ── Notification type → display category ─────────────────────────────────────
export function toCategory(type) {
  if (!type) return "system";
  if (["badge_unlocked", "badge_earned", "xp_gained", "level_up", "title_unlocked"].includes(type))
    return "gamification";
  if (type.startsWith("project_"))  return "project";
  if (["resubmission_decided", "mention", "qa_signoff_needed", "qa_signoff_done", "task_assigned", "task_updated", "task_rejected", "task_approved", "review_requested", "deadline_soon", "deadline_missed"].includes(type))
    return "task";
  if (["team_request", "team_assigned", "team_lead_request"].includes(type))
    return "team";
  return "system";
}

// ── Redirect path for a notification ─────────────────────────────────────────
// Pass role to get role-specific redirect paths (e.g. Team Lead portal).
// X-9 (D-QA3B-11): ONE map for the bell, the chat dock, the Notifications pages and Profile "Recent events". Read-only notices open
// their page; action notices open the exact page with the item focused (?task=, ?bug=, ?open=, ?id=). Never a dead or empty link.
const isDirector = (r) => r === "Director" || r === "director";
const isOrgAdmin = (r) => r === "org_admin" || r === "Org Admin";
const portalOf = (r) => (isDirector(r) ? "/director" : r === "Manager" || r === "manager" ? "/manager" : r === "Team Lead" || r === "team_lead" ? "/teamlead" : isOrgAdmin(r) ? "/org" : "/workspace");

// Chat family (all portals but Org Admin, who has no chat): the conversation, or the Announcements page.
function chatPath(notif, role) {
  const { type, meta = {}, deepLink } = notif, p = portalOf(role);
  if (type === "announcement") return isOrgAdmin(role) ? "/org/dashboard" : `${p}/announcements`;
  const id = meta.channelId ?? (/\/chat\/([0-9a-f]{24})/i.exec(deepLink ?? "") ?? /[?&]open=([0-9a-f]{24})/i.exec(deepLink ?? ""))?.[1];
  if (!id || !(type === "dm_message" || type === "mention" || type === "system")) return null;
  return isOrgAdmin(role) ? "/org/dashboard" : `${p}/chat?open=${id}`;
}

// The Director has no task page: the item opens inside its project.
function directorPath(notif) {
  const { type, meta = {}, deepLink } = notif, cat = toCategory(type), proj = meta.projectId;
  if (type === "approval_required" || type === "approval_pending" || type === "approval_result") return deepLink?.startsWith("/director/approvals") ? deepLink : "/director/approvals";
  if (type === "needs_action" || type?.startsWith("extension_") || type === "more_tries_requested") return meta.reportId ? "/director/reports" : "/director/extensions";
  if (type === "workload_over_limit" || type === "overloaded_member" || type === "burnout_alert" || type === "burnout_risk") return "/director/capacity";
  if (type === "deadline_change_request" && proj) return `/director/projects/${proj}`;
  if ((type === "project_module_assigned" || type?.startsWith("module_")) && proj && meta.milestoneId) return `/director/projects/${proj}/modules/${meta.milestoneId}`;
  if (type === "escalation") return "/director/notifications";
  if (proj) return `/director/projects/${proj}`;
  if (cat === "project") return "/director/projects";
  if (cat === "gamification" || type === "xp_adjusted" || type === "streak_freeze") return "/director/profile";
  if (cat === "team") return "/director/roles";
  return "/director/notifications";
}

export function notifRedirectPath(notif, role) {
  const { type, meta = {} } = notif;
  const cat = toCategory(type);

  const chat = chatPath(notif, role);
  if (chat) return chat;
  if (isOrgAdmin(role)) return type === "approval_result" || type === "approval_required" || type === "approval_pending" ? "/org/approvals" : "/org/dashboard";

  if (isDirector(role)) return directorPath(notif);

  // ── Team Lead portal ──────────────────────────────────────────────────────
  if (role === "Team Lead" || role === "team_lead") {
    if (type === "extension_requested" || type === "more_tries_requested") return "/teamlead/requests"; // E-3 (D-180)
    if (type?.startsWith("bug_") && meta.bugId) return `/teamlead/bugs?bug=${meta.bugId}`; // E-4 (D-190)
    if (type === "review_requested" && meta.taskId) return `/teamlead/review/${meta.taskId}`;
    if (type === "review_requested")                return "/teamlead/review-submissions";
    if (type === "qa_signoff_done" && meta.taskId)  return `/teamlead/review/${meta.taskId}`;
    if (type.startsWith("sprint_") && meta.sprintId) return `/teamlead/sprints/${meta.sprintId}`;
    // T-1 (D-113): Projects → Modules; a task opens the read-only drawer on Tasks; Badges is hidden → Leaderboard.
    if (cat === "project" && meta.projectId)        return `/teamlead/modules/${meta.projectId}${meta.milestoneId ? `?module=${meta.milestoneId}` : ""}`;
    if (cat === "project")                          return "/teamlead/modules";
    if (cat === "task"    && meta.taskId)            return `/teamlead/tasks?task=${meta.taskId}`;
    if (cat === "task")                             return "/teamlead/tasks";
    if (cat === "gamification")                     return "/teamlead/badges";
    if (cat === "team")                             return "/teamlead/team";
    return "/teamlead/notifications";
  }

  // ── Manager portal (/manager, V2 Phase 3 · M-1) ─────────────────────────
  if (role === "Manager" || role === "manager") {
    if (type?.startsWith("sprint_") && meta.sprintId) return `/manager/sprints/${meta.sprintId}`;
    if (type === "more_tries_requested" || type === "extension_requested") return "/manager/inbox"; // E-3: the Manager may decide too (D-142)
    if (type?.startsWith("bug_") && meta.taskId) return `/manager/tasks/${meta.taskId}`;
    if ((type === "needs_action" || type === "manager_decision_required") && meta.taskId) return `/manager/tasks/${meta.taskId}`;
    if (cat === "gamification" || type === "xp_adjusted" || type === "streak_freeze") return "/manager/profile";
    if (type === "extension_requested_fyi" && meta.taskId) return `/manager/tasks/${meta.taskId}`;
    if (type === "workload_over_limit" && meta.memberId) return `/manager/resources?member=${meta.memberId}`;
    if (cat === "project" && meta.projectId) return `/manager/projects/${meta.projectId}`;
    if (cat === "project" || type === "risk_alert") return "/manager/projects";
    if (cat === "task"    && meta.taskId)    return `/manager/tasks/${meta.taskId}`;
    if (cat === "task")                      return "/manager/tasks";
    if (cat === "team")                      return "/manager/resources";
    if (type === "approval_requested" || type === "approval_resolved") return "/manager/inbox";
    return "/manager/notifications";
  }

  // ── Developer / Designer / Tester (E-1): employee pages only ──────────────
  if (employeeKind(role)) return employeeNotifPath(type ?? "", cat, meta);

  // ── No role given (old shared NotificationsPage, still used by /manager/notifications) ──
  if (cat === "project" && meta.projectId)  return `/workspace/projects/${meta.projectId}`;
  if (cat === "project")                    return "/workspace/projects";
  if (cat === "task"    && meta.taskId)     return `/workspace/tasks/${meta.taskId}`;
  if (cat === "task")                       return "/workspace/tasks";
  if (cat === "gamification")               return "/workspace/badges";
  if (cat === "team")                       return "/workspace/team-overview";
  if (type === "approval_requested" || type === "approval_resolved") return "/workspace/operations";
  if (type === "risk_alert")                return "/workspace/projects";
  return "/workspace/notifications";
}
