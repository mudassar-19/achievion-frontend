// QA3 P-1, P-6, P-7: plain "to" instead of an arrow, one day text in the org time zone, who asked / who decided / notes in the row.
import test from "node:test";
import assert from "node:assert/strict";
import { fmtDay, fmtStamp, fileDay, approvalRow, describeApproval } from "./approvalPdf.js";

test("P-1: role change uses the word 'to', never an arrow (no glyph in the PDF font)", () => {
  const t = describeApproval({ actionType: "ROLE_CHANGE", targetEmployeeId: { name: "Sana Javed" }, payload: { oldRole: "Tester", newRole: "Junior Tester" } });
  assert.equal(t, "Sana Javed: Tester to Junior Tester");
  assert.ok(!/[→→]/.test(t));
});

test("P-6: the same instant is the same day in the header and in the file name, in the org time zone", () => {
  const d = "2026-10-17T20:30:00Z"; // 18 Oct 01:30 in Karachi
  assert.equal(fmtDay(d, "Asia/Karachi"), "18 Oct 2026");
  assert.equal(fileDay(d, "Asia/Karachi"), "2026-10-18");
  assert.equal(fmtDay(d, "UTC"), "17 Oct 2026");
  assert.match(fmtStamp("2026-11-17T06:40:19Z", "Asia/Karachi"), /^17 Nov 2026, 11:40 \(Asia\/Karachi\)$/);
});

test("P-7: a row carries requested by, decided by, the reason (or a plain fallback) and the Director's note", () => {
  const a = { actionType: "SUSPEND_EMPLOYEE", status: "REJECTED", targetEmployeeId: { name: "Hamza" }, createdAt: "2026-11-04T05:00:00Z", resolvedAt: "2026-11-04T07:00:00Z",
    requestedBy: { name: "Saima Rehman" }, resolvedBy: { name: "Imran Siddiqui" }, payload: {}, directorNote: "Not needed" };
  assert.deepEqual(approvalRow(a, 0, "Asia/Karachi"), ["1", "Suspend", "Suspend Hamza", "Rejected", "4 Nov 2026\nby Saima Rehman", "4 Nov 2026\nby Imran Siddiqui", "No reason given", "Not needed"]);
});
