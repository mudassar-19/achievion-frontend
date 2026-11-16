// Item 11 leftovers (Director approvals): waiting tag after 3 days, typed confirmation for delete, honest "current role" text.
import test from "node:test";
import assert from "node:assert/strict";
import { waitingDays, isWaiting, deleteConfirmed, roleChangeText, conflictNote } from "./approvalView.js";

const NOW = new Date("2026-11-17T12:00:00Z");

test("a request waiting 3 days or more is tagged, with the number of days", () => {
  assert.equal(waitingDays("2026-11-14T12:00:00Z", NOW), 3);
  assert.equal(isWaiting("2026-11-14T12:00:00Z", NOW), true);
  assert.equal(isWaiting("2026-11-14T13:00:00Z", NOW), false); // 2 days 23 hours
  assert.equal(waitingDays("2026-10-17T12:00:00Z", NOW), 31);
  assert.equal(isWaiting(null, NOW), false);
});

test("deleting an account needs the person's name typed, ignoring case and spaces at the ends", () => {
  assert.equal(deleteConfirmed("Saim Khan", "Saim Khan"), true);
  assert.equal(deleteConfirmed("  saim khan ", "Saim Khan"), true);
  assert.equal(deleteConfirmed("Saim", "Saim Khan"), false);
  assert.equal(deleteConfirmed("", "Saim Khan"), false);
  assert.equal(deleteConfirmed("anything", ""), false); // no name known: never confirmed by accident
});

test("a pending request that contradicts another pending one for the same person is named", () => {
  const rows = [
    { _id: "1", actionType: "DELETE_EMPLOYEE", targetEmployeeId: { _id: "p1" } },
    { _id: "2", actionType: "SUSPEND_EMPLOYEE", targetEmployeeId: { _id: "p1" } },
    { _id: "3", actionType: "ROLE_CHANGE", targetEmployeeId: { _id: "p2" } },
    { _id: "4", actionType: "SUSPEND_EMPLOYEE", targetEmployeeId: { _id: "p2" } },
  ];
  assert.equal(conflictNote(rows[0], rows), "A suspend request for the same person is also waiting. Decide one, then the other.");
  assert.equal(conflictNote(rows[1], rows), "A delete request for the same person is also waiting. Decide one, then the other.");
  assert.equal(conflictNote(rows[2], rows), null); // role change and suspension do not contradict
  assert.equal(conflictNote({ _id: "9", actionType: "CREATE_EMPLOYEE", payload: {} }, rows), null);
});

test("role change text shows the role the person has NOW, and says when the request was written for another one", () => {
  assert.equal(roleChangeText({ name: "Bob", currentRole: "Developer", requestedFrom: "Developer", to: "Team Lead" }), "Bob: Developer → Team Lead");
  assert.equal(roleChangeText({ name: "Bob", currentRole: "Manager", requestedFrom: "Developer", to: "Team Lead" }), "Bob: Manager → Team Lead (the request was written when Bob was a Developer)");
  assert.equal(roleChangeText({ name: "Bob", currentRole: null, requestedFrom: "Developer", to: "Team Lead" }), "Bob: Developer → Team Lead");
  assert.equal(roleChangeText({ name: "Bob", currentRole: null, requestedFrom: null, to: "Team Lead" }), "Bob: current role unknown → Team Lead");
});
