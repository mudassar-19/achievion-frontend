// Checks for the Director notifications helpers (UI-E2). Run: node --test client/src/lib/notifFormat.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { tierOf, humanText, unreadCounts, FILTERS, filterList } from "./notifFormat.js";

test("tier: approval requests always need action, whatever the server wrote", () => {
  assert.equal(tierOf({ type: "approval_pending", tier: "fyi" }), "needs_action");
  assert.equal(tierOf({ type: "approval_required", tier: "fyi" }), "needs_action");
  assert.equal(tierOf({ type: "escalation" }), "critical");
  assert.equal(tierOf({ type: "recap_ready", tier: "needs_action" }), "fyi");
  assert.equal(tierOf({ type: "something_new", tier: "critical" }), "critical");
  assert.equal(tierOf({ type: "something_new" }), "fyi");
});

test("raw approval codes become words", () => {
  assert.equal(humanText({ message: "New DELETE_EMPLOYEE request pending your approval" }), "New request to delete an employee is waiting for your approval");
  assert.equal(humanText({ message: "New REACTIVATE_EMPLOYEE request pending your approval" }), "New request to reactivate an employee is waiting for your approval");
  assert.equal(humanText({ message: "New ROLE_CHANGE request pending your approval" }), "New request to change an employee's role is waiting for your approval");
  assert.equal(humanText({ message: "New CREATE_EMPLOYEE request pending your approval" }), "New request to create an employee is waiting for your approval");
  assert.equal(humanText({ message: "Ali asked for REACTIVATE_EMPLOYEE today" }), "Ali asked for reactivate an employee today");
  assert.equal(humanText({ message: "Project Alpha is at risk" }), "Project Alpha is at risk");
  assert.equal(humanText({ message: null }), "");
  for (const m of ["TASK_ASSIGNMENT", "SUSPEND_EMPLOYEE"]) assert.doesNotMatch(humanText({ message: `x ${m} y` }), /[A-Z]+_[A-Z]+/);
});

test("unread counts per filter: only unread, All is the total", () => {
  const list = [
    { type: "approval_pending", read: false }, { type: "approval_pending", read: false }, { type: "approval_pending", read: true },
    { type: "escalation", read: false }, { type: "escalation", read: true }, { type: "recap_ready", read: false }, { type: "recap_ready", read: true },
  ];
  assert.deepEqual(unreadCounts(list), { all: 4, critical: 1, needs_action: 2, fyi: 1 });
  assert.deepEqual(unreadCounts([]), { all: 0, critical: 0, needs_action: 0, fyi: 0 });
});

test("one filter row: All, Critical, Needs action, FYI; each shows its own tier only", () => {
  assert.deepEqual(FILTERS.map((f) => f.id), ["all", "critical", "needs_action", "fyi"]);
  const list = [{ _id: 1, type: "approval_pending" }, { _id: 2, type: "escalation" }, { _id: 3, type: "recap_ready" }];
  assert.deepEqual(filterList(list, "all").map((n) => n._id), [1, 2, 3]);
  assert.deepEqual(filterList(list, "critical").map((n) => n._id), [2]);
  assert.deepEqual(filterList(list, "needs_action").map((n) => n._id), [1]);
  assert.deepEqual(filterList(list, "fyi").map((n) => n._id), [3]);
});
