// Checks for the pure chat helpers (UI-C). Run: node --test client/src/lib/chatFormat.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { dmName, chatTitle, chatTime, dayLabel, sameRun, canPostIn, unreadTotal, badge } from "./chatFormat.js";

test("a DM is named after the other person, never after an id", () => {
  assert.equal(dmName({ name: "Sara Malik" }), "Sara Malik");
  assert.equal(dmName(undefined), "Loading name…");          // still being looked up
  assert.equal(dmName(null), "Deactivated user");             // the other account is gone
  assert.equal(dmName({ name: "  " }), "Deactivated user");
  const dm = { type: "dm", name: "dm-69ff7ad11bfb1a34a037d4aa-69ff7ad11bfb1a34a037d4bb" };
  for (const p of [undefined, null, { name: "Ali" }]) assert.doesNotMatch(chatTitle(dm, p), /dm-|undefined|Direct message|[a-f\d]{24}/);
});

test("group titles", () => {
  assert.equal(chatTitle({ type: "announcement", name: "announcements" }), "Announcements");
  assert.equal(chatTitle({ type: "custom", name: "frontend-devs" }), "#frontend-devs");
});

test("time stamps are short today and dated before", () => {
  const now = new Date("2026-11-15T18:00:00Z"), o = { now, timeZone: "UTC" };
  assert.equal(chatTime("2026-11-15T09:05:00Z", o), "9:05 AM");
  assert.equal(chatTime("2026-11-14T09:05:00Z", o), "Nov 14, 9:05 AM");
  assert.equal(chatTime("2025-11-14T09:05:00Z", o), "Nov 14, 2025, 9:05 AM");
  assert.equal(chatTime("2026-11-15T21:05:00Z", { ...o, hour12: false }), "21:05");
  assert.equal(chatTime(null, o), "");
  assert.equal(dayLabel("2026-11-15T01:00:00Z", o), "Today");
  assert.equal(dayLabel("2026-11-14T23:00:00Z", o), "Yesterday");
  assert.equal(dayLabel("2026-11-02T23:00:00Z", o), "Nov 2, 2026");
  // The day is the person's day, not the UTC day.
  assert.equal(dayLabel("2026-11-14T20:00:00Z", { now, timeZone: "Asia/Karachi" }), "Today");
});

test("messages of one person within five minutes read as one run", () => {
  const a = { sender: { _id: "u1" }, createdAt: "2026-11-15T09:00:00Z" };
  assert.equal(sameRun(a, { sender: { _id: "u1" }, createdAt: "2026-11-15T09:04:00Z" }), true);
  assert.equal(sameRun(a, { sender: { _id: "u1" }, createdAt: "2026-11-15T09:06:00Z" }), false);
  assert.equal(sameRun(a, { sender: { _id: "u2" }, createdAt: "2026-11-15T09:01:00Z" }), false);
  assert.equal(sameRun({ ...a, deletedAt: "x" }, { sender: { _id: "u1" }, createdAt: "2026-11-15T09:01:00Z" }), false);
  assert.equal(sameRun(undefined, a), false);
});

test("who may type in a conversation (the server still decides)", () => {
  const dev = { id: "u1", role: "Developer" }, mgr = { id: "m1", role: "Manager" };
  assert.equal(canPostIn({ type: "dm" }, dev), true);
  assert.equal(canPostIn({ type: "custom" }, dev), true);
  assert.equal(canPostIn({ type: "announcement" }, dev), false);
  assert.equal(canPostIn({ type: "announcement" }, mgr), true);
  assert.equal(canPostIn({ type: "announcement", posterIds: ["u1"] }, dev), true);
  assert.equal(canPostIn({ type: "custom", permissions: { sendMessages: "admins" } }, dev), false);
  assert.equal(canPostIn({ type: "custom", permissions: { sendMessages: "admins" }, adminIds: [{ _id: "u1" }] }, dev), true);
});

test("unread: muted conversations do not count; the badge stops at 99+", () => {
  assert.equal(unreadTotal([{ unread: 3 }, { unread: 5, muted: true }, { unread: 2 }, {}]), 5);
  assert.equal(badge(0), "");
  assert.equal(badge(7), "7");
  assert.equal(badge(120), "99+");
});
