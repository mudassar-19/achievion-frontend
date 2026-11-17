import test from "node:test";
import assert from "node:assert/strict";
import { matchesPreset } from "./taskFilters.js";

const now = new Date("2026-11-17T10:00:00").getTime();
const t = (deadline, status = "To-Do") => ({ deadline, status });

test("overdue, today, week are separate buckets; Done and undated match none", () => {
  assert.ok(matchesPreset(t("2026-11-16T12:00:00"), "overdue", now));
  assert.ok(!matchesPreset(t("2026-11-17T23:00:00"), "overdue", now));
  assert.ok(matchesPreset(t("2026-11-17T23:00:00"), "due-today", now));
  assert.ok(!matchesPreset(t("2026-11-17T23:00:00"), "due-week", now));
  assert.ok(matchesPreset(t("2026-11-24T09:00:00"), "due-week", now));
  assert.ok(!matchesPreset(t("2026-11-25T09:00:00"), "due-week", now));
  assert.ok(!matchesPreset(t("2026-11-16", "Done"), "overdue", now));
  assert.ok(!matchesPreset(t(null), "overdue", now));
  assert.ok(matchesPreset(t(null), "", now));
});
