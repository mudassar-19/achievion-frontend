import test from "node:test";
import assert from "node:assert/strict";
import { healthBand, orgBand, bandOfProject } from "./healthBand.js";

test("75 / 60 edges", () => {
  assert.equal(healthBand(75), "On track"); assert.equal(healthBand(74), "Needs attention");
  assert.equal(healthBand(60), "Needs attention"); assert.equal(healthBand(59), "At risk");
});
test("sim data from the issue list: FleetTrack 53 At risk, Kohsar 96 and Org 86 Healthy", () => {
  assert.equal(healthBand(53), "At risk"); assert.equal(healthBand(96), "On track"); assert.equal(orgBand(86), "Healthy");
});
test("no score or Not started is never red", () => {
  assert.equal(bandOfProject({ healthScore: null, healthBand: "Not started" }), "Not started");
  assert.equal(bandOfProject({ healthScore: 35, healthBand: "Off track" }), "At risk");
});
