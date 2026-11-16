import test from "node:test";
import assert from "node:assert/strict";
import { addPicked, MAX_FILES, MAX_BYTES } from "./attachPick.js";

const f = (name, size = 100) => ({ name, size });

test("new files are appended, not replaced (item 49)", () => {
  const r = addPicked([f("a.pdf")], [f("b.png"), f("c.csv")]);
  assert.deepEqual(r.files.map((x) => x.name), ["a.pdf", "b.png", "c.csv"]);
  assert.deepEqual(r.errors, []);
});

test("at most 5 files; the extra ones are refused with a clear message", () => {
  const r = addPicked([f("1.pdf"), f("2.pdf"), f("3.pdf"), f("4.pdf")], [f("5.pdf"), f("6.pdf")]);
  assert.equal(r.files.length, MAX_FILES);
  assert.match(r.errors[0], /at most 5/i);
});

test("a file over 5 MB or of a wrong type is refused by name; the others still go in", () => {
  const r = addPicked([], [f("big.pdf", MAX_BYTES + 1), f("run.exe"), f("ok.JPG")]);
  assert.deepEqual(r.files.map((x) => x.name), ["ok.JPG"]);
  assert.equal(r.errors.length, 2);
  assert.match(r.errors[0], /big\.pdf.*5 MB/);
  assert.match(r.errors[1], /run\.exe.*PDF, DOC/);
});

test("the same file picked twice is added once", () => {
  const r = addPicked([f("a.pdf", 10)], [f("a.pdf", 10)]);
  assert.equal(r.files.length, 1);
});
