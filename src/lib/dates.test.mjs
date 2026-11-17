import test from "node:test";
import assert from "node:assert/strict";
import { fmtDate, fmtTime, fmtDateTime, fmtDateShort, dayKey, setDatePrefs } from "./dates.js";

test("one format: 17 Nov 2026", () => {
  setDatePrefs({ timezone: "Asia/Karachi" });
  assert.equal(fmtDate("2026-11-17T10:00:00Z"), "17 Nov 2026");
  assert.equal(fmtDate("2026-11-17"), "17 Nov 2026");
  assert.equal(fmtDate("2026-09-05"), "5 Sep 2026");
  assert.equal(fmtDate("2026-11-17", { year: false }), "17 Nov");
  assert.equal(fmtDate(null), "—");
  assert.equal(fmtDate("nonsense"), "—");
});
test("the time zone decides the day", () => {
  assert.equal(fmtDate("2026-11-16T20:00:00Z", { timeZone: "Asia/Karachi" }), "17 Nov 2026"); // 01:00 next day in PKT
  assert.equal(fmtDate("2026-11-16T20:00:00Z", { timeZone: "UTC" }), "16 Nov 2026");
  assert.equal(dayKey("2026-11-16T20:00:00Z", "Asia/Karachi"), "2026-11-17");
});
test("time and date-time, 12 h and 24 h", () => {
  setDatePrefs({ timezone: "UTC" });
  assert.equal(fmtTime("2026-11-17T15:05:00Z"), "3:05 PM");
  assert.equal(fmtTime("2026-11-17T00:05:00Z"), "12:05 AM");
  assert.equal(fmtDateTime("2026-11-17T15:05:00Z"), "17 Nov 2026, 3:05 PM");
  setDatePrefs({ timezone: "UTC", timeFormat: "24h" });
  assert.equal(fmtTime("2026-11-17T15:05:00Z"), "15:05");
});
test("iso preference and the old mdy choice", () => {
  setDatePrefs({ timezone: "UTC", dateFormat: "iso" });
  assert.equal(fmtDate("2026-11-17"), "2026-11-17");
  setDatePrefs({ timezone: "UTC", dateFormat: "mdy" });
  assert.equal(fmtDate("2026-11-17"), "17 Nov 2026");
});
test("short form drops the current year only", () => {
  setDatePrefs({ timezone: "UTC" });
  const y = new Date().getUTCFullYear();
  assert.equal(fmtDateShort(`${y}-03-04`), "4 Mar");
  assert.equal(fmtDateShort("1999-03-04"), "4 Mar 1999");
});
