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
export function notifRedirectPath(notif, role) {
  const { type, meta = {} } = notif;
  const cat = toCategory(type);

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
    if (cat === "gamification")                     return "/teamlead/leaderboard";
    if (cat === "team")                             return "/teamlead/team";
    return "/teamlead/notifications";
  }

  // ── Manager portal (/manager, V2 Phase 3 · M-1) ─────────────────────────
  if (role === "Manager" || role === "manager") {
    if (type?.startsWith("sprint_") && meta.sprintId) return `/manager/sprints/${meta.sprintId}`;
    if (type === "more_tries_requested") return "/manager/inbox"; // E-3: the Manager may decide too (D-142)
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
