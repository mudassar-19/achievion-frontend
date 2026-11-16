// Checks for the Director Settings rules (UI-E1). Run: node --test client/src/pages/director/settings/rules.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { RECOMMENDED, withDefaults, gamificationErrors, workingTimeErrors, extensionErrors, extensionSentence, fromServer, toggleWeekend, ALERT_DEFAULTS, alertRules, alertErrors, orgErrors } from "./rules.js";

test("alert rules: stored values are filled from the defaults, each wrong value has its own message", () => {
  assert.deepEqual(alertRules(undefined), ALERT_DEFAULTS);
  assert.deepEqual(alertRules({ overloadLimitPct: 120, someOldKey: true }), { ...ALERT_DEFAULTS, overloadLimitPct: 120 });
  assert.deepEqual(alertErrors(ALERT_DEFAULTS), {});
  const e = alertErrors({ overloadLimitPct: 40, deadlineWarnPct: 99, hpThresholdPct: 5, streakReminder: true, emailDelayMin: 0, dailyFyiLimit: 2.5 });
  assert.match(e.overloadLimitPct, /between 50 and 150/);
  assert.match(e.deadlineWarnPct, /between 50 and 95/);
  assert.match(e.hpThresholdPct, /between 10 and 60/);
  assert.match(e.emailDelayMin, /between 1 and 60/);
  assert.match(e.dailyFyiLimit, /whole number/);
  assert.match(alertErrors({ ...ALERT_DEFAULTS, overloadLimitPct: "" }).overloadLimitPct, /Enter a number/);
});

test("organization: name, escalation contact (never empty, must be on the list), time zone, fiscal year", () => {
  const people = [{ id: "d1" }, { id: "m1" }];
  const ok = { orgName: "Acme", escalationContactId: "d1", timezone: "Asia/Karachi", fiscalYear: "calendar" };
  assert.deepEqual(orgErrors(ok, people), {});
  assert.match(orgErrors({ ...ok, orgName: "  " }, people).orgName, /required/);
  assert.match(orgErrors({ ...ok, orgName: "x".repeat(81) }, people).orgName, /80 characters/);
  assert.match(orgErrors({ ...ok, escalationContactId: null }, people).escalation, /Choose who is told/);
  assert.match(orgErrors({ ...ok, escalationContactId: "zz" }, people).escalation, /Choose a person from the list/);
  assert.match(orgErrors({ ...ok, timezone: "" }, people).timezone, /Choose a time zone/);
  assert.match(orgErrors({ ...ok, fiscalYear: "x" }, people).fiscalYear, /Choose a fiscal year/);
  assert.equal(fromServer("Escalation contact not found in this organization.").field, "escalation");
});

test("stored rules that miss parts are filled from the recommended defaults", () => {
  const r = withDefaults({ badgeThresholds: { tenTasks: 5, streak7: 6, streak30: 15 } });
  assert.deepEqual(r.xpMultipliers, RECOMMENDED.xpMultipliers);
  assert.equal(r.streakBonus, 1.1);
  assert.deepEqual(r.badgeThresholds, { firstTask: 1, tenTasks: 5, streak7: 6, streak30: 15 });
  assert.deepEqual(withDefaults(null), RECOMMENDED);
});

test("gamification: each wrong value gets its own plain message", () => {
  assert.deepEqual(gamificationErrors(RECOMMENDED), {});
  const bad = withDefaults({ xpMultipliers: { Bug: 2.1, Design: 0.4, Testing: 1.25, DevOps: "" }, streakBonus: 1.6, badgeThresholds: { tenTasks: 4, streak7: 15, streak30: 14.5 } });
  const e = gamificationErrors(bad);
  assert.match(e["xp.Bug"], /between 0\.5 and 2/);
  assert.match(e["xp.Design"], /between 0\.5 and 2/);
  assert.match(e["xp.Testing"], /steps of 0\.1/);
  assert.match(e["xp.DevOps"], /Enter a number/);
  assert.equal(e["xp.Feature"], undefined);
  assert.match(e.streakBonus, /between 1 and 1\.5/);
  assert.match(e["badge.tenTasks"], /between 5 and 50/);
  assert.match(e["badge.streak7"], /between 3 and 14/);
  assert.match(e["badge.streak30"], /whole number/);
});

test("working time: 4 to 12 in half hours, warning above 8, at least one working day", () => {
  assert.deepEqual(workingTimeErrors({ hours: 7, weekendDays: [0, 6] }), {});
  assert.match(workingTimeErrors({ hours: 3.5, weekendDays: [] }).hours, /between 4 and 12/);
  assert.match(workingTimeErrors({ hours: 12.5, weekendDays: [] }).hours, /between 4 and 12/);
  assert.match(workingTimeErrors({ hours: 7.25, weekendDays: [] }).hours, /half hours/);
  assert.match(workingTimeErrors({ hours: 8.5, weekendDays: [] }).warning, /above 8/);
  assert.equal(workingTimeErrors({ hours: 8, weekendDays: [] }).warning, undefined);
  assert.match(workingTimeErrors({ hours: 7, weekendDays: [0, 1, 2, 3, 4, 5, 6] }).days, /at least one working day/);
  // The seventh day cannot be switched to weekend.
  assert.deepEqual(toggleWeekend([0, 1, 2, 3, 4, 5], 6), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(toggleWeekend([0, 6], 6), [0]);
  assert.deepEqual(toggleWeekend([0], 6), [0, 6]);
});

test("extension rules: days 0 to 10 whole, percent 0 to 50, total not below single", () => {
  assert.deepEqual(extensionErrors({ days: 3, pct: 20, cap: 20 }), {});
  assert.match(extensionErrors({ days: 11, pct: 20, cap: 20 }).days, /0 to 10/);
  assert.match(extensionErrors({ days: 2.5, pct: 20, cap: 20 }).days, /whole number/);
  assert.match(extensionErrors({ days: 3, pct: 51, cap: 60 }).pct, /0 to 50/);
  assert.match(extensionErrors({ days: 3, pct: 20, cap: 60 }).cap, /0 to 50/);
  assert.match(extensionErrors({ days: 3, pct: 30, cap: 20 }).cap, /cannot be lower/);
  assert.match(extensionErrors({ days: "", pct: 20, cap: 20 }).days, /Enter a number/);
  const s = extensionSentence({ days: 3, pct: 20, cap: 20 });
  assert.match(s, /3 working days AND at most 20%/);
  assert.doesNotMatch(s, / or /);
  assert.match(extensionSentence({ days: 1, pct: 20, cap: 30 }), /1 working day AND/);
});

test("a server 400 is put under its field in plain words", () => {
  assert.deepEqual(fromServer("xpMultipliers.Bug must be between 0.5 and 2.0."), { field: "xp.Bug", message: "Bug: enter a value between 0.5 and 2." });
  assert.equal(fromServer("xpMultipliers.Testing must be a multiple of 0.1.").field, "xp.Testing");
  assert.equal(fromServer("streakBonus must be between 1.0 and 1.5.").field, "streakBonus");
  assert.equal(fromServer("badgeThresholds.streak7 must be an integer between 3 and 14.").field, "badge.streak7");
  const mono = fromServer("badgeThresholds.tenTasks must be less than streak7.");
  assert.equal(mono.field, "badge.tenTasks");
  assert.match(mono.message, /"Ten tasks" must be lower than "7-day streak"/);
  assert.equal(fromServer("badgeThresholds.streak7 must be less than streak30.").field, "badge.streak7");
  assert.equal(fromServer("hoursPerDay must be between 4 and 12.").field, "hours");
  assert.equal(fromServer("At least one working day is required.").field, "days");
  assert.equal(fromServer("extensionMaxDays must be an integer 0–10.").field, "days_ext");
  assert.equal(fromServer("extensionMaxPct must be 0–50.").field, "pct");
  assert.equal(fromServer("extensionCumCapPct must be >= extensionMaxPct.").field, "cap");
  // No field name of the code reaches the screen.
  for (const m of ["xpMultipliers.Bug must be between 0.5 and 2.0.", "extensionCumCapPct must be 0–50.", "hoursPerDay must be a multiple of 0.5."])
    assert.doesNotMatch(fromServer(m).message, /xpMultipliers|extension[A-Z]|hoursPerDay|badgeThresholds/);
  assert.deepEqual(fromServer("Something else broke."), { field: null, message: "Something else broke." });
});
