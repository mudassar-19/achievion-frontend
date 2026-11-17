// X-9 (D-QA3B-11): every notification type the server sends has a real destination in every portal; the item is focused when there is one.
import test from "node:test";
import assert from "node:assert/strict";
import { notifRedirectPath } from "./notifRoutes.js";

const ID = "6ad4444040d9acae6866f7be";
const meta = { taskId: ID, projectId: ID, milestoneId: ID, sprintId: ID, bugId: ID, memberId: ID, channelId: ID, approvalId: ID, extensionRequestId: ID };
const TYPES = ["quest_published", "review_requested", "xp", "system", "deadline_soon", "task_assigned", "deadline_missed", "approval_pending", "approval_result", "badge", "sprint_started",
  "needs_action", "sprint_closed", "qa_signoff_done", "qa_signoff_needed", "project_module_assigned", "task_rejected", "workload_over_limit", "module_accepted", "announcement", "bug_reported",
  "task_reassigned", "streak_freeze", "burnout_alert", "xp_adjusted", "bug_assigned", "bug_valid", "bug_verified", "bug_fixed", "project_member_added", "mention", "bug_closed", "extension_requested",
  "dm_message", "burnout_risk", "resubmission_decided", "extension_requested_fyi", "bug_invalid", "bug_reopened", "manager_decision_required", "bug_duplicate", "module_question",
  "deadline_change_request", "extension_approved", "review_nudge"];
const ROLES = { "Director": "/director", "Manager": "/manager", "Team Lead": "/teamlead", "Senior Developer": "/workspace", "Junior Designer": "/workspace", "Senior Tester": "/workspace", "org_admin": "/org" };

test("every type opens a page inside its own portal, never an empty or undefined link", () => {
  for (const [role, base] of Object.entries(ROLES)) for (const type of TYPES) {
    const to = notifRedirectPath({ type, meta }, role);
    assert.ok(typeof to === "string" && to.startsWith(base), `${role} ${type} -> ${to}`);
    assert.ok(!/undefined|null/.test(to), `${role} ${type} -> ${to}`);
  }
});

test("chat notices open the conversation, announcements their page", () => {
  assert.equal(notifRedirectPath({ type: "dm_message", meta: { channelId: ID } }, "Director"), `/director/chat?open=${ID}`);
  assert.equal(notifRedirectPath({ type: "mention", meta: { channelId: ID } }, "Junior Designer"), `/workspace/chat?open=${ID}`);
  assert.equal(notifRedirectPath({ type: "system", meta: {}, deepLink: `/chat/${ID}` }, "Manager"), `/manager/chat?open=${ID}`);
  assert.equal(notifRedirectPath({ type: "announcement", meta: {} }, "Team Lead"), "/teamlead/announcements");
});

test("action notices focus the item", () => {
  assert.equal(notifRedirectPath({ type: "approval_pending", meta: {}, deepLink: `/director/approvals?id=${ID}` }, "Director"), `/director/approvals?id=${ID}`);
  assert.equal(notifRedirectPath({ type: "task_assigned", meta: { taskId: ID } }, "Junior Designer"), `/workspace/tasks/${ID}`);
  assert.equal(notifRedirectPath({ type: "bug_assigned", meta: { bugId: ID, taskId: ID } }, "Senior Tester"), `/workspace/bugs?bug=${ID}`);
  assert.equal(notifRedirectPath({ type: "extension_requested", meta: { taskId: ID } }, "Director"), "/director/extensions");
  assert.equal(notifRedirectPath({ type: "approval_result", meta: {} }, "org_admin"), "/org/approvals");
});
