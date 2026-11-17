import test from "node:test";
import assert from "node:assert/strict";
import { entityPath, entityView } from "./entityRoutes.js";

const ID = "6ad4444040d9acae6866f7be";
const TYPES = ["person", "task", "project", "sprint", "flag", "request"];

test("Manager, Team Lead and Director: every entity type opens an existing portal screen", () => {
  for (const role of ["Manager", "Team Lead", "Director", "team_lead"]) {
    for (const type of TYPES) {
      const to = entityPath({ type, id: ID, projectId: ID }, role);
      assert.ok(to && /^\/(manager|teamlead|director)\//.test(to), `${role} ${type} -> ${to}`);
    }
  }
});
test("person opens Resources focused for the Manager; a task opens the read-only drawer", () => {
  assert.equal(entityPath({ type: "person", id: ID }, "Manager"), `/manager/resources?member=${ID}`);
  assert.equal(entityPath({ type: "task", id: ID }, "Manager"), `/manager/tasks?task=${ID}`);
});
test("unknown type or an employee asking for a person: no link, never a dead one", () => {
  assert.equal(entityPath({ type: "nope", id: ID }, "Manager"), null);
  assert.equal(entityPath({ type: "person", id: ID }, "Developer"), null);
});

test("card data from the contract becomes name, line and chips", () => {
  const v = entityView({ type: "person", id: ID, name: "Bilal Ahmed", role: "Senior Developer", loadPct: 160, freeHoursPerDay: 0, overdue: 4 });
  assert.equal(v.name, "Bilal Ahmed"); assert.equal(v.sub, "Senior Developer");
  assert.deepEqual(v.stats.map((s) => s.label), ["Load", "Free", "Overdue"]);
  assert.equal(entityView({ type: "task", id: ID, title: "Fix login", status: "In-Review", project: "CRM" }).sub, "CRM · In-Review");
  assert.equal(entityView({ type: "sprint", id: ID, name: "Sprint 2", done: 1, total: 5 }).stats[0].value, "1/5");
});
