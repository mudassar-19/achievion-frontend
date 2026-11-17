import test from "node:test";
import assert from "node:assert/strict";
import { roleLabel, roleBadge, roleFull } from "./roleLabel.js";

test("custom role is the title, system role the badge", () => {
  const bilal = { role: "Senior Developer", roleLabel: "Senior Full-Stack Developer" };
  assert.equal(roleLabel(bilal), "Senior Full-Stack Developer");
  assert.equal(roleBadge(bilal), "Senior Developer");
  assert.equal(roleFull(bilal), "Senior Full-Stack Developer · Senior Developer");
});
test("no custom role: the system role, no duplicate badge", () => {
  assert.equal(roleLabel({ role: "Tester" }), "Tester");
  assert.equal(roleBadge({ role: "Tester" }), "");
  assert.equal(roleBadge({ role: "Tester", roleLabel: "tester" }), "");
  assert.equal(roleLabel({ role: "Developer", roleLabel: "  " }), "Developer");
  assert.equal(roleLabel(null), "");
  assert.equal(roleLabel({ role: "X", customRole: { name: "Visual Designer" } }), "Visual Designer");
});
