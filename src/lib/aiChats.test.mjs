// Checks for the AI chat history helpers (UI-E2, master list item 30). Run: node --test client/src/lib/aiChats.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { storageKey, makeTitle, upsertChat, renameChat, deleteChat, uniqueTitles, MAX_CHATS } from "./aiChats.js";

test("the history is kept per person, never one key for the whole browser", () => {
  assert.equal(storageKey("u1"), "achievion-ai-chats:u1");
  assert.notEqual(storageKey("u1"), storageKey("u2"));
  assert.equal(storageKey(undefined), "achievion-ai-chats:anonymous");
});

test("a chat is named after its first question", () => {
  assert.equal(makeTitle("  What are the top risks right now?  "), "What are the top risks right now?");
  assert.equal(makeTitle("a".repeat(80)), `${"a".repeat(50)}…`);
  assert.equal(makeTitle("line one\nline two"), "line one line two");
  assert.equal(makeTitle(""), "New chat");
});

test("upsert: a chat moves to the top when it gets a new message, the first question stays its title", () => {
  const t0 = "2026-11-15T10:00:00.000Z", t1 = "2026-11-15T11:00:00.000Z", t2 = "2026-11-15T12:00:00.000Z";
  let list = upsertChat([], { id: "a", firstQuestion: "First A", messages: [{ role: "user", text: "First A" }], now: t0 });
  list = upsertChat(list, { id: "b", firstQuestion: "First B", messages: [], now: t1 });
  assert.deepEqual(list.map((c) => c.id), ["b", "a"]);
  list = upsertChat(list, { id: "a", firstQuestion: "A later question", messages: [{ role: "user", text: "x" }], now: t2 });
  assert.deepEqual(list.map((c) => c.id), ["a", "b"]);
  assert.equal(list[0].title, "First A");        // the title is not overwritten
  assert.equal(list[0].createdAt, t0);           // created once
  assert.equal(list[0].updatedAt, t2);
  const many = Array.from({ length: MAX_CHATS + 5 }, (_, i) => ({ id: `c${i}`, firstQuestion: `Q${i}`, messages: [], now: new Date(2026, 0, 1, 0, i).toISOString() }));
  assert.equal(many.reduce((l, c) => upsertChat(l, c), []).length, MAX_CHATS);
});

test("rename and delete", () => {
  const list = [{ id: "a", title: "One", messages: [] }, { id: "b", title: "Two", messages: [] }];
  assert.equal(renameChat(list, "a", "  Budget talk  ")[0].title, "Budget talk");
  assert.equal(renameChat(list, "a", "x".repeat(100))[0].title.length, 60);
  assert.equal(renameChat(list, "a", "   ")[0].title, "One");   // an empty name changes nothing
  assert.deepEqual(deleteChat(list, "a").map((c) => c.id), ["b"]);
  assert.deepEqual(deleteChat(list, "zzz").map((c) => c.id), ["a", "b"]);
});

test("recent chats never show two equal titles", () => {
  const list = [
    { id: "n", title: "What are the top risks?", createdAt: "2026-11-15T12:00:00Z" },
    { id: "m", title: "What are the top risks?", createdAt: "2026-11-15T11:00:00Z" },
    { id: "o", title: "What are the top risks?", createdAt: "2026-11-14T09:00:00Z" },
    { id: "p", title: "Other", createdAt: "2026-11-14T09:00:00Z" },
  ];
  const t = uniqueTitles(list);
  assert.equal(t.o, "What are the top risks?");            // the oldest keeps the plain title
  assert.equal(t.m, "What are the top risks? (2)");
  assert.equal(t.n, "What are the top risks? (3)");
  assert.equal(t.p, "Other");
  assert.equal(new Set(Object.values(t)).size, 4);
});
