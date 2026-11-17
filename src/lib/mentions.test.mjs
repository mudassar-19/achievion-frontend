// Items 73, 74, 75 (D-545): who appears in an @ list and in the New DM search, and in what order. Self never appears.
import test from "node:test";
import assert from "node:assert/strict";
import { mentionCandidates, rankPeople, nextIndex, activeMention } from "./mentions.js";

const people = [
  { id: "1", name: "Ayesha Khan", role: "Developer" },
  { _id: "2", name: "Bilal Raza", role: "Manager" },     // some lists use _id
  { id: "3", name: "Zara Ayub", role: "Tester" },
  { id: "4", name: "Khalid Ali", role: "Designer" },
  { id: "5", name: "Mayank Rao", role: "Developer" },
];

test("the signed-in person never appears, whether the list uses id or _id", () => {
  assert.ok(!mentionCandidates(people, "1", "").some((p) => p.name === "Ayesha Khan"));
  assert.ok(!mentionCandidates(people, "2", "").some((p) => p.name === "Bilal Raza"));
  assert.equal(mentionCandidates(people, "1", "").length, 4);
  assert.equal(mentionCandidates(people, undefined, "").length, 5); // not signed in (a test): nobody is removed by mistake
});

test("prefix matches first: the whole name, then any word of it; a name that only contains the text comes last or not at all", () => {
  const r = rankPeople(people, "ay").map((p) => p.name);
  assert.deepEqual(r.slice(0, 2), ["Ayesha Khan", "Zara Ayub"].slice(0, 1).concat(["Zara Ayub"]).slice(0, 2)); // Ayesha (name prefix), Zara Ayub (word prefix)
  assert.equal(r[0], "Ayesha Khan");
  assert.ok(!r.includes("Mayank Rao") || r.indexOf("Mayank Rao") > r.indexOf("Zara Ayub"), "Mayank only contains 'ay'");
});

test("group chat @ list is prefix only (no 'contains'); the New DM search also shows contains, after the prefix ones", () => {
  assert.ok(!mentionCandidates(people, "9", "ay").some((p) => p.name === "Mayank Rao"));
  assert.ok(rankPeople(people, "ay", { contains: true }).some((p) => p.name === "Mayank Rao"));
  assert.equal(rankPeople(people, "ay", { contains: true }).at(-1).name, "Mayank Rao");
});

test("an empty query lists people alphabetically; no match gives an empty list", () => {
  assert.deepEqual(rankPeople(people, "").map((p) => p.name), ["Ayesha Khan", "Bilal Raza", "Khalid Ali", "Mayank Rao", "Zara Ayub"]);
  assert.deepEqual(rankPeople(people, "qq"), []);
});

test("keyboard: Up and Down wrap around, Enter and Escape are handled by the box", () => {
  assert.equal(nextIndex(0, "ArrowDown", 3), 1);
  assert.equal(nextIndex(2, "ArrowDown", 3), 0);
  assert.equal(nextIndex(0, "ArrowUp", 3), 2);
  assert.equal(nextIndex(1, "Home", 3), 1); // other keys: unchanged
  assert.equal(nextIndex(0, "ArrowDown", 0), 0);
});

test("the @ the person is typing is found at the caret, only at the start of a word", () => {
  assert.deepEqual(activeMention("hello @Ay", 9), { start: 6, text: "Ay" });
  assert.deepEqual(activeMention("@", 1), { start: 0, text: "" });
  assert.equal(activeMention("mail me at a@b.com", 18), null);   // an e-mail address is not a mention
  assert.deepEqual(activeMention("hi @Ayesha Kh", 13), { start: 3, text: "Ayesha Kh" }); // a two-word name can be typed out
  assert.equal(activeMention("hi @Ayesha, ok", 14), null);       // a comma ends it
});

test("splitMentions marks known @names, longest first, Urdu and long names too", async () => {
  const { splitMentions } = await import("./mentions.js");
  const names = ["Ali", "Ali Raza", "علی خان"];
  assert.deepEqual(splitMentions("hi @Ali Raza and @علی خان!", names), [
    { text: "hi " }, { text: "@Ali Raza", mention: true }, { text: " and " }, { text: "@علی خان", mention: true }, { text: "!" }]);
  assert.deepEqual(splitMentions("mail a@Ali.com", names), [{ text: "mail a@Ali.com" }]);   // not at a word start
  assert.deepEqual(splitMentions("@Alina", names), [{ text: "@Alina" }]);                       // a longer word is not Ali
  assert.deepEqual(splitMentions("plain", []), [{ text: "plain" }]);
});
