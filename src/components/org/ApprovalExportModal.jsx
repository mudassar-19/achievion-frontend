import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X, ChevronLeft, ChevronRight, FileDown, Loader2, CalendarDays,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Pure date utilities (no external library) ─────────────────────────────────

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function sameDay(a, b) {
  return (
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

// Build a flat array of Date objects (or null for padding) for a given month.
// Week starts on Monday.
function calendarDays(year, month) {
  const firstDow  = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMo  = new Date(year, month + 1, 0).getDate();
  const padLeft   = (firstDow + 6) % 7; // Mon = 0 offset
  const days      = Array(padLeft).fill(null);
  for (let d = 1; d <= daysInMo; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

// ── PDF helpers ───────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtFilename(d) {
  return d.toISOString().slice(0, 10);
}

function describeApproval(a) {
  const { actionType, payload, targetEmployeeId } = a;
  const target = targetEmployeeId?.name ?? payload?.name ?? "—";
  switch (actionType) {
    case "CREATE_EMPLOYEE":     return `Create account for ${payload?.name ?? "—"} as ${payload?.role ?? ""}`;
    case "DELETE_EMPLOYEE":     return `Delete ${target}${payload?.reason ? ` — "${payload.reason}"` : ""}`;
    case "SUSPEND_EMPLOYEE":    return `Suspend ${target}`;
    case "REACTIVATE_EMPLOYEE": return `Reactivate ${target}'s account`;
    case "ROLE_CHANGE":         return `${target}: ${payload?.oldRole} → ${payload?.newRole}`;
    default:                    return actionType;
  }
}

function generatePDF(approvals, orgName, start, end) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw   = doc.internal.pageSize.getWidth();
  const ph   = doc.internal.pageSize.getHeight();

  // ── Header band ──────────────────────────────────────────────────────────────
  doc.setFillColor(10, 14, 40);
  doc.rect(0, 0, pw, 22, "F");

  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Achievion", 14, 10);

  doc.setFontSize(9);
  doc.setTextColor(120, 130, 180);
  doc.setFont("helvetica", "normal");
  doc.text("Approval History Report", 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(80, 90, 140);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pw - 14, 16, { align: "right" });

  // ── Meta block ───────────────────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setTextColor(40, 45, 70);
  doc.setFont("helvetica", "bold");
  doc.text("Organisation:", 14, 30);
  doc.setFont("helvetica", "normal");
  doc.text(orgName, 45, 30);

  doc.setFont("helvetica", "bold");
  doc.text("Period:", 14, 36);
  doc.setFont("helvetica", "normal");
  doc.text(`${fmtDate(start)} – ${fmtDate(end)}`, 45, 36);

  // ── Summary chips ─────────────────────────────────────────────────────────
  const approved = approvals.filter((a) => a.status === "APPROVED").length;
  const rejected = approvals.filter((a) => a.status === "REJECTED").length;
  const pending  = approvals.filter((a) => a.status === "PENDING").length;

  const summaries = [
    { label: "Total",    count: approvals.length, color: [60, 65, 100] },
    { label: "Approved", count: approved,          color: [16, 120, 80] },
    { label: "Rejected", count: rejected,           color: [140, 30, 50] },
    { label: "Pending",  count: pending,            color: [130, 90, 10] },
  ];
  let sx = 14;
  summaries.forEach(({ label, count, color }) => {
    doc.setFillColor(...color);
    doc.roundedRect(sx, 40, 36, 9, 2, 2, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`${count}`, sx + 18, 45.5, { align: "center" });
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(label.toUpperCase(), sx + 18, 48, { align: "center" });
    sx += 40;
  });

  // ── Table ─────────────────────────────────────────────────────────────────
  const rows = approvals.map((a, i) => [
    i + 1,
    a.actionType.replace(/_/g, " "),
    describeApproval(a),
    a.status,
    fmtDate(a.createdAt),
    fmtDate(a.resolvedAt),
    a.rejectionReason ?? "—",
  ]);

  autoTable(doc, {
    startY: 54,
    head: [["#", "Action Type", "Description", "Status", "Requested", "Resolved", "Rejection Reason"]],
    body: rows.length > 0 ? rows : [["", "", "No records found in the selected date range.", "", "", "", ""]],
    styles: { fontSize: 14, cellPadding: 2.5, lineColor: [220, 225, 240], lineWidth: 0.1 },
    headStyles: {
      fillColor: [10, 14, 40],
      textColor: [180, 185, 220],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [246, 247, 252] },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 36 },
      2: { cellWidth: "auto" },
      3: { halign: "center", cellWidth: 24 },
      4: { halign: "center", cellWidth: 28 },
      5: { halign: "center", cellWidth: 28 },
      6: { cellWidth: 38 },
    },
    didParseCell(data) {
      if (data.column.index === 3 && data.section === "body") {
        const v = data.cell.raw;
        if (v === "APPROVED") { data.cell.styles.textColor = [16, 160, 90];  data.cell.styles.fontStyle = "bold"; }
        if (v === "REJECTED") { data.cell.styles.textColor = [200, 40, 70];  data.cell.styles.fontStyle = "bold"; }
        if (v === "PENDING")  { data.cell.styles.textColor = [180, 120, 10]; data.cell.styles.fontStyle = "bold"; }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // ── Page footer ───────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 205, 230);
    doc.setLineWidth(0.2);
    doc.line(14, ph - 12, pw - 14, ph - 12);
    doc.setFontSize(7.5);
    doc.setTextColor(160, 165, 190);
    doc.setFont("helvetica", "normal");
    doc.text("Achievion — Confidential", 14, ph - 8);
    doc.text(`Page ${i} of ${pageCount}`, pw - 14, ph - 8, { align: "right" });
  }

  doc.save(`approvals-${fmtFilename(start)}-to-${fmtFilename(end)}.pdf`);
}

// ── Month calendar ────────────────────────────────────────────────────────────

function MonthCalendar({ year, month, startDate, endDate, hoverDate, minDate, onDayClick, onDayHover, onDayLeave }) {
  const days  = calendarDays(year, month);
  const today = startOfDay(new Date());
  const min   = minDate ? startOfDay(new Date(minDate)) : null;
  const max   = startOfDay(today);

  function dayState(date) {
    const d = startOfDay(date);

    if ((min && d < min) || d > max) return "disabled";

    const isStart = startDate && sameDay(d, startDate);
    const isEnd   = endDate   && sameDay(d, endDate);
    if (isStart && isEnd) return "edge"; // single-day selection
    if (isStart) return "edge-start";
    if (isEnd)   return "edge-end";

    const rangeEnd = endDate ?? hoverDate;
    if (startDate && rangeEnd) {
      const lo = d > startOfDay(startDate) && d < startOfDay(rangeEnd);
      const hi = d < startOfDay(startDate) && d > startOfDay(rangeEnd);
      if (lo || hi) return "in-range";
    }

    if (sameDay(d, today)) return "today";
    return "normal";
  }

  return (
    <div className="select-none">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {DAY_LABELS.map((l) => (
          <div key={l} className="h-7 flex items-center justify-center text-[14px] font-bold tracking-wide text-slate-600 uppercase">
            {l}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} className="h-9" />;

          const state      = dayState(date);
          const isDisabled = state === "disabled";
          const isEdge     = state === "edge" || state === "edge-start" || state === "edge-end";
          const isInRange  = state === "in-range";
          const isToday    = state === "today";

          return (
            <div
              key={date.toISOString()}
              className={[
                "h-9 flex items-center justify-center",
                isInRange ? "bg-accent/10" : "",
              ].join(" ")}
            >
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && onDayClick(date)}
                onMouseEnter={() => !isDisabled && onDayHover(date)}
                onMouseLeave={onDayLeave}
                className={[
                  "h-8 w-8 rounded-full flex items-center justify-center text-[14px] font-medium transition-all duration-100",
                  isDisabled ? "text-slate-700 cursor-not-allowed" : "cursor-pointer",
                  isEdge    ? "bg-accent text-[#14203D] font-bold shadow-card" : "",
                  isInRange  ? "text-accent-text hover:bg-accent/20" : "",
                  isToday && !isEdge ? "ring-1 ring-accent/40 text-accent-text" : "",
                  !isEdge && !isInRange && !isToday && !isDisabled
                    ? "text-slate-300 hover:bg-ink/8 hover:text-text-primary"
                    : "",
                ].join(" ")}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function ApprovalExportModal({ allData, orgName, orgCreatedAt, onClose }) {
  const today   = new Date();
  const minDate = orgCreatedAt ? new Date(orgCreatedAt) : null;

  const [viewYear,      setViewYear]      = useState(today.getFullYear());
  const [viewMonth,     setViewMonth]     = useState(today.getMonth());
  const [startDate,     setStartDate]     = useState(null);
  const [endDate,       setEndDate]       = useState(null);
  const [hoverDate,     setHoverDate]     = useState(null);
  const [showYearGrid,  setShowYearGrid]  = useState(false);
  const [exporting,     setExporting]     = useState(false);

  // ── Filtered approvals (memoised) ──────────────────────────────────────────
  const filteredApprovals = useMemo(() => {
    if (!startDate || !endDate) return [];
    const all = [
      ...allData.PENDING,
      ...allData.APPROVED,
      ...allData.REJECTED,
    ];
    return all
      .filter((a) => {
        if (!a.createdAt) return false;
        const d = new Date(a.createdAt);
        return d >= startDate && d <= endDate;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allData, startDate, endDate]);

  // ── Preset quick-selects ───────────────────────────────────────────────────
  function applyPreset(rawStart, rawEnd) {
    let s = startOfDay(rawStart);
    if (minDate && s < startOfDay(minDate)) s = startOfDay(minDate);
    const e = endOfDay(rawEnd);
    setStartDate(s);
    setEndDate(e);
    setViewYear(s.getFullYear());
    setViewMonth(s.getMonth());
    setShowYearGrid(false);
  }

  const presets = [
    {
      label: "Last 7 days",
      fn: () => {
        const s = new Date(today);
        s.setDate(s.getDate() - 6);
        return [s, today];
      },
    },
    {
      label: "Last 30 days",
      fn: () => {
        const s = new Date(today);
        s.setDate(s.getDate() - 29);
        return [s, today];
      },
    },
    {
      label: "Last 3 months",
      fn: () => {
        const s = new Date(today);
        s.setMonth(s.getMonth() - 3);
        return [s, today];
      },
    },
    {
      label: "Last year",
      fn: () => {
        const s = new Date(today);
        s.setFullYear(s.getFullYear() - 1);
        return [s, today];
      },
    },
    {
      label: "All time",
      fn: () => [minDate ?? today, today],
    },
  ];

  // ── Day click ──────────────────────────────────────────────────────────────
  function handleDayClick(date) {
    const d = startOfDay(date);
    if (!startDate || endDate) {
      // Start a fresh selection
      setStartDate(d);
      setEndDate(null);
    } else {
      // Complete the range
      if (d < startDate) {
        setEndDate(endOfDay(startDate));
        setStartDate(d);
      } else {
        setEndDate(endOfDay(date));
      }
    }
  }

  // ── Month navigation ───────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const canPrev = !minDate || !(
    viewYear === minDate.getFullYear() && viewMonth === minDate.getMonth()
  );
  const canNext = !(
    viewYear === today.getFullYear() && viewMonth === today.getMonth()
  );

  // ── Year grid ──────────────────────────────────────────────────────────────
  const minYear = minDate ? minDate.getFullYear() : today.getFullYear() - 10;
  const years   = [];
  for (let y = today.getFullYear(); y >= minYear; y--) years.push(y);

  // ── Export ─────────────────────────────────────────────────────────────────
  function handleExport() {
    if (!startDate || !endDate || exporting) return;
    setExporting(true);
    // Yield to the browser so the spinner renders before the sync PDF work
    setTimeout(() => {
      try {
        generatePDF(filteredApprovals, orgName, startDate, endDate);
        onClose();
      } catch (err) {
        console.error("PDF export error:", err);
        setExporting(false);
      }
    }, 60);
  }

  const canExport = Boolean(startDate && endDate);

  // ── Date display ───────────────────────────────────────────────────────────
  function displayDate(d) {
    if (!d) return null;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div
        className="relative z-10 w-full max-w-[420px] rounded-2xl border border-ink/[0.09] shadow-[0_32px_80px_rgba(0,0,0,0.8)]"
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F5F6FA 100%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-ink/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
              <CalendarDays size={15} className="text-accent-text" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[14px] font-bold uppercase tracking-widest text-accent-text leading-none mb-0.5">
                PDF Export
              </p>
              <h2 className="text-sm font-bold text-text-primary leading-none">Select Date Range</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-text-primary hover:bg-ink/8 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* ── Quick presets ── */}
          <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600 mb-2">
            Quick select
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {presets.map((p) => {
              const [s, e] = p.fn();
              const active = startDate && endDate && sameDay(startDate, startOfDay(s < (minDate ?? s) ? (minDate ?? s) : s)) && sameDay(endDate, endOfDay(e));
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(s, e)}
                  className={[
                    "px-2.5 py-1 rounded-lg border text-[14px] font-medium transition-all",
                    active
                      ? "border-accent/40 bg-accent/10 text-accent-text"
                      : "border-ink/8 text-slate-500 hover:text-accent-text hover:border-accent/30 hover:bg-accent/5",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* ── Month / year navigation header ── */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              disabled={!canPrev}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-text-primary hover:bg-ink/8 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={15} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={() => setShowYearGrid((v) => !v)}
              className="flex items-center gap-1 text-sm font-bold text-text-primary hover:text-accent-text transition-colors"
            >
              {MONTH_NAMES[viewMonth]} {viewYear}
              <ChevronRight
                size={12}
                className={`transition-transform duration-200 ${showYearGrid ? "rotate-90" : ""}`}
                strokeWidth={2.5}
              />
            </button>

            <button
              type="button"
              onClick={nextMonth}
              disabled={!canNext}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-text-primary hover:bg-ink/8 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={15} strokeWidth={2} />
            </button>
          </div>

          {/* ── Year grid ── */}
          {showYearGrid ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 max-h-[168px] overflow-y-auto rounded-xl border border-ink/8 bg-ink/[0.015] p-2 mb-1">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setViewYear(y); setShowYearGrid(false); }}
                  className={[
                    "py-1.5 rounded-lg text-xs font-medium transition-all",
                    y === viewYear
                      ? "bg-accent/20 text-accent-text font-bold border border-accent/30"
                      : "text-slate-400 hover:text-text-primary hover:bg-ink/8",
                  ].join(" ")}
                >
                  {y}
                </button>
              ))}
            </div>
          ) : (
            /* ── Calendar ── */
            <MonthCalendar
              year={viewYear}
              month={viewMonth}
              startDate={startDate}
              endDate={endDate}
              hoverDate={hoverDate}
              minDate={minDate}
              onDayClick={handleDayClick}
              onDayHover={setHoverDate}
              onDayLeave={() => setHoverDate(null)}
            />
          )}

          {/* ── Selected range summary ── */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-px rounded-xl overflow-hidden border border-ink/[0.06] bg-ink/[0.06]">
            {[
              {
                label: "From",
                value: displayDate(startDate),
                hint: "Click a start date",
              },
              {
                label: "To",
                value: displayDate(endDate),
                hint: "Click an end date",
              },
              {
                label: "Records",
                value: canExport ? filteredApprovals.length : "—",
                hint: "In range",
              },
            ].map(({ label, value, hint }) => (
              <div key={label} className="bg-[#F5F6FA] px-3 py-2.5 text-center">
                <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600 mb-1">{label}</p>
                <p className={`text-[14px] font-semibold leading-snug ${value ? "text-accent-text" : "text-slate-700"}`}>
                  {value ?? hint}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-ink/10 text-sm font-semibold text-slate-400 hover:text-text-primary hover:bg-ink/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!canExport || exporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/25 text-sm font-bold text-accent-text hover:bg-accent/18 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
          >
            {exporting ? (
              <><Loader2 size={14} className="animate-spin" /> Generating…</>
            ) : (
              <><FileDown size={14} strokeWidth={2} /> Export PDF</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
