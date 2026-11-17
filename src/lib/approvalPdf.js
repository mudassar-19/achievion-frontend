// QA3 P-1..P-8: the Approval History PDF. Org name first, "powered by Achievion" small; small body font so 24 rows fit on 2 pages;
// no row is split across pages; plain "to" instead of an arrow (the built-in PDF font has no arrow glyph); dates in the org time zone;
// who asked, who decided and the notes are in the file. Pure row builder is tested in approvalPdf.test.mjs.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "17 Nov 2026" in the given time zone (en-CA gives yyyy-mm-dd parts without depending on the browser locale).
export function fmtDay(d, timeZone) {
  if (!d) return "—";
  const [y, m, day] = new Date(d).toLocaleDateString("en-CA", { timeZone }).split("-");
  return `${Number(day)} ${MONTHS[Number(m) - 1]} ${y}`;
}
export function fmtStamp(d, timeZone) {
  const t = new Date(d).toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" });
  return `${fmtDay(d, timeZone)}, ${t} (${timeZone ?? "local time"})`;
}
// File name uses the same day text as the header, so the two never disagree by one day.
export const fileDay = (d, timeZone) => new Date(d).toLocaleDateString("en-CA", { timeZone });

const TYPE_WORD = { CREATE_EMPLOYEE: "Create", DELETE_EMPLOYEE: "Delete", SUSPEND_EMPLOYEE: "Suspend", REACTIVATE_EMPLOYEE: "Reactivate", ROLE_CHANGE: "Role change" };
const STATUS_WORD = { APPROVED: "Approved", REJECTED: "Rejected", PENDING: "Pending" };
const who = (u) => (u && typeof u === "object" ? u.name : null) ?? "—";

export function describeApproval(a) {
  const { actionType, payload, targetEmployeeId } = a;
  const target = targetEmployeeId?.name ?? payload?.name ?? "—";
  switch (actionType) {
    case "CREATE_EMPLOYEE":     return `Create account for ${payload?.name ?? "—"} as ${payload?.role ?? ""}`.trim();
    case "DELETE_EMPLOYEE":     return `Delete ${target}`;
    case "SUSPEND_EMPLOYEE":    return `Suspend ${target}`;
    case "REACTIVATE_EMPLOYEE": return `Reactivate ${target}'s account`;
    case "ROLE_CHANGE":         return `${target}: ${payload?.oldRole ?? "?"} to ${payload?.newRole ?? "?"}`;
    default:                    return String(actionType);
  }
}

export function approvalRow(a, i, timeZone) {
  return [
    String(i + 1),
    TYPE_WORD[a.actionType] ?? String(a.actionType).replace(/_/g, " "),
    describeApproval(a),
    STATUS_WORD[a.status] ?? a.status,
    `${fmtDay(a.createdAt, timeZone)}\nby ${who(a.requestedBy)}`,
    a.resolvedAt ? `${fmtDay(a.resolvedAt, timeZone)}\nby ${who(a.resolvedBy)}` : "—",
    a.payload?.reason || a.rejectionReason || "No reason given",
    a.directorNote || "—",
  ];
}

export function generateApprovalPdf(approvals, { orgName, start, end, timeZone }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();

  // Header: the organisation first; Achievion only as "powered by".
  doc.setFillColor(10, 14, 40); doc.rect(0, 0, pw, 22, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text(orgName, 14, 10);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(170, 178, 220);
  doc.text("Approval History Report", 14, 16.5);
  doc.setFontSize(8); doc.text(`Generated ${fmtStamp(new Date(), timeZone)}`, pw - 14, 10, { align: "right" });
  doc.text("Powered by Achievion", pw - 14, 16.5, { align: "right" });

  doc.setFontSize(9.5); doc.setTextColor(40, 45, 70);
  doc.setFont("helvetica", "bold"); doc.text("Period:", 14, 30);
  doc.setFont("helvetica", "normal"); doc.text(`${fmtDay(start, timeZone)} to ${fmtDay(end, timeZone)}`, 30, 30);

  // Summary: number and label in separate, spaced lines.
  const count = (s) => approvals.filter((a) => a.status === s).length;
  [["Total", approvals.length, [60, 65, 100]], ["Approved", count("APPROVED"), [16, 120, 80]], ["Rejected", count("REJECTED"), [140, 30, 50]], ["Pending", count("PENDING"), [130, 90, 10]]]
    .forEach(([label, n, color], k) => {
      const x = 14 + k * 42;
      doc.setFillColor(...color); doc.roundedRect(x, 34, 38, 12, 2, 2, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(String(n), x + 19, 40, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text(label.toUpperCase(), x + 19, 44.3, { align: "center" });
    });

  autoTable(doc, {
    startY: 51,
    head: [["#", "Type", "What", "Status", "Requested", "Decided", "Why it was asked", "Director's note"]],
    body: approvals.length ? approvals.map((a, i) => approvalRow(a, i, timeZone)) : [["", "", "No records in the selected period.", "", "", "", "", ""]],
    rowPageBreak: "avoid", // a row is never cut between two pages
    styles: { fontSize: 7.5, cellPadding: 1.8, lineColor: [220, 225, 240], lineWidth: 0.1, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [10, 14, 40], textColor: [200, 205, 235], fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [246, 247, 252] },
    // Fixed widths wide enough that "Approved", "Rejected" and "12" never break inside a word (total 269 mm).
    columnStyles: { 0: { cellWidth: 10, halign: "center" }, 1: { cellWidth: 22 }, 2: { cellWidth: 62 }, 3: { cellWidth: 20 }, 4: { cellWidth: 34 }, 5: { cellWidth: 34 }, 6: { cellWidth: 45 }, 7: { cellWidth: 42 } },
    didParseCell(data) {
      if (data.column.index === 3 && data.section === "body") {
        const c = { Approved: [16, 130, 80], Rejected: [190, 40, 65], Pending: [170, 115, 10] }[data.cell.raw];
        if (c) { data.cell.styles.textColor = c; data.cell.styles.fontStyle = "bold"; }
      }
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setDrawColor(200, 205, 230); doc.setLineWidth(0.2); doc.line(14, ph - 12, pw - 14, ph - 12);
    doc.setFontSize(7.5); doc.setTextColor(150, 155, 185); doc.setFont("helvetica", "normal");
    doc.text(`${orgName} · Confidential · Powered by Achievion`, 14, ph - 8); doc.text(`Page ${i} of ${pages}`, pw - 14, ph - 8, { align: "right" });
  }
  doc.save(`approvals-${fileDay(start, timeZone)}-to-${fileDay(end, timeZone)}.pdf`);
}
