// Item 54: a soft warning when the work and the person's role do not match (a login subtask under a Design task given to
// a developer, a backend task given to a designer), and "most room" prefers people whose role fits. Never blocks (D-011).
import test from "node:test";
import assert from "node:assert/strict";
import { roleFits, fitWarning, domainWarning, suggestFor } from "./taskFit.js";

test("which roles fit which task types", () => {
  assert.equal(roleFits("Senior Developer", "Feature"), true);
  assert.equal(roleFits("Junior Designer", "Design"), true);
  assert.equal(roleFits("Senior Developer", "Design"), false);
  assert.equal(roleFits("Senior Designer", "Feature"), false);
  assert.equal(roleFits("Tester", "Testing"), true);
  assert.equal(roleFits("Junior Tester", "Bug"), true);
  assert.equal(roleFits("Senior Designer", "Documentation"), true);
  assert.equal(roleFits("Team Lead", "Design"), true); // leaders are not judged by category
});

test("the warning names the person's role and the type, and says it is only a warning", () => {
  assert.equal(fitWarning({ name: "Saim", role: "Senior Developer" }, "Design"), "Saim is a Senior Developer; this is a Design task. You can still assign them, but a Designer fits better.");
  assert.equal(fitWarning({ name: "Qaseem", role: "Senior Designer" }, "Design"), null);
  assert.equal(fitWarning({ name: "X", role: "Senior Developer" }, "Documentation"), null);
});

test("a subtask of another domain than its parent gets a warning", () => {
  assert.match(domainWarning("Design", "Feature"), /development subtask under a design task/i);
  assert.match(domainWarning("Feature", "Testing"), /testing subtask under a development task/i);
  assert.equal(domainWarning("Design", "Design"), null);
  assert.equal(domainWarning("Feature", "Bug"), null); // both development
  assert.equal(domainWarning("Documentation", "Feature"), null); // documentation fits any
  assert.equal(domainWarning(null, "Feature"), null);
});

test("most room: people whose role fits come first, then the least loaded; if nobody fits, the least loaded overall", () => {
  const team = [
    { id: 1, name: "Saim", role: "Senior Developer", status: "Available", activeTasks: 0 },
    { id: 2, name: "Qaseem", role: "Senior Designer", status: "Available", activeTasks: 3 },
    { id: 3, name: "Dina", role: "Junior Designer", status: "Overloaded", activeTasks: 1 },
  ];
  assert.equal(suggestFor(team, "Design").id, 2); // the fitting designer who is not overloaded, even with more tasks than Saim
  assert.equal(suggestFor(team, "Feature").id, 1);
  assert.equal(suggestFor([team[0]], "Design").id, 1); // nobody fits: fall back
  assert.equal(suggestFor([], "Design"), null);
});
