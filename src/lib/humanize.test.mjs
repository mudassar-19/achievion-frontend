import test from "node:test";
import assert from "node:assert/strict";
import { notifTitle, actionLabel, humanizeText, isKey, workingDays } from "./humanize.js";

test("a raw key is never a title", () => {
  assert.equal(notifTitle({ title: "needs_action", type: "approval_required" }), "Needs your action");
  assert.equal(notifTitle({ title: "some_new_key" }), "Some new key");
  assert.equal(notifTitle({ title: "Extension request", type: "x" }), "Extension request");
  assert.equal(notifTitle({ type: "extension_requested" }), "Extension request");
  assert.equal(notifTitle({}), "Notification");
});
test("event names read as words", () => {
  assert.equal(actionLabel("company_community_created"), "Company community created");
  assert.equal(actionLabel("report_exported"), "Report exported");
  assert.equal(actionLabel("brand_new_event"), "Brand new event");
  assert.ok(isKey("extension_approved") && !isKey("Extension approved"));
});
test("config names, decision ids and HR wording go", () => {
  assert.equal(humanizeText("Extension queued for Director (+4d, exceeds extensionMaxDays (3))"), "Extension queued for Director (+4d, is more than the 3-working-day limit)");
  assert.equal(humanizeText("Default (D-026) is 20%"), "Default is 20%");
  assert.equal(humanizeText("Extension approve: Fix login"), "Extension approved: Fix login");
  assert.equal(humanizeText("HR approvals"), "employee approvals");
  assert.equal(humanizeText(null), "");
  assert.equal(workingDays(1), "1 working day");
  assert.equal(workingDays(3), "3 working days");
});
