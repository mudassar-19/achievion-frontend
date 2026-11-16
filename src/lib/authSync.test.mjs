// Item 62: two tabs of one browser share one saved login. A login in one tab must not wipe the other tab's login.
import test from "node:test";
import assert from "node:assert/strict";
import { syncAction, alreadySignedIn, ALREADY_SIGNED_IN } from "./authSync.js";

const saved = (token) => JSON.stringify({ state: { token }, version: 0 });

test("the same token, or no change that matters: nothing to do", () => {
  assert.equal(syncAction("T1", saved("T1")), "none");
  assert.equal(syncAction(null, saved(null)), "none");
  assert.equal(syncAction(null, null), "none"); // key removed while this tab had no login
});

test("another tab logged out: this tab logs out too (it only writes what is already saved)", () => {
  assert.equal(syncAction("T1", saved(null)), "logout");
  assert.equal(syncAction("T1", null), "logout");
});

test("another tab logged in (as anyone): this tab reloads to pick that login up, it never writes its own empty state", () => {
  assert.equal(syncAction(null, saved("T2")), "reload"); // the bug: this tab used to clear the shared login
  assert.equal(syncAction("T1", saved("T2")), "reload");
});

test("signing in while the browser already holds a login this tab does not own is refused with a clear message", () => {
  assert.equal(alreadySignedIn(saved("T2"), null), true); // another tab signed in a moment ago
  assert.equal(alreadySignedIn(saved("T2"), "T1"), true);
  assert.equal(alreadySignedIn(saved("T1"), "T1"), false); // this tab's own login
  assert.equal(alreadySignedIn(saved(null), null), false);
  assert.equal(alreadySignedIn(null, null), false);
  assert.equal(alreadySignedIn("{bad", null), false);
  assert.match(ALREADY_SIGNED_IN, /already signed in as another account in this browser\. Sign out first\./);
});

test("unreadable saved data is ignored", () => {
  assert.equal(syncAction("T1", "{not json"), "none");
});
