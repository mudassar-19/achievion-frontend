import test from "node:test";
import assert from "node:assert/strict";
import { aiText, sourceLabel } from "./aiText.js";

test("US and ISO dates become the app format", () => {
  assert.match(aiText("Due 11/23/2026 and 2026-11-24."), /Due 23 Nov 2026 and 24 Nov 2026\./);
  assert.equal(aiText("Ratio 3/4 done"), "Ratio 3/4 done");
});
test("source chip shows the name, not the fact line", () => {
  assert.equal(sourceLabel({ source: "Project", text: "Project: FleetTrack Driver App Status: Active Progress: 42%" }), "Project: FleetTrack Driver App");
  assert.equal(sourceLabel({ source: "recap" }), "recap");
});
