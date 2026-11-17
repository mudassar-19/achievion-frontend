// Org Health tabs besides Overview (item 18, RND-02/03): Trends, Departments (no ranking, D-038), Well-being (counts only).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import api from "@/lib/api";

const CARD = "rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] p-5";
const H3 = "text-xs font-bold text-slate-600 uppercase tracking-wider mb-4";
const SERIES = [["overall", "Overall", "#4B2FC4"], ["delivery", "Delivery", "#0E6A30"], ["capacity", "Capacity", "#B45309"], ["risk", "Risk", "#B01F17"], ["quality", "Quality", "#0B63C5"]];
const shortDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const TABS =[["overview", "Overview"], ["trends", "Trends"], ["departments", "Departments"], ["wellbeing", "Well-being"]];

export function TabBar({ tab, onChange }) {
  function onKey(e) {
    const i = TABS.findIndex(([k]) => k === tab);
    const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i + TABS.length - 1) % TABS.length : null;
    if (next == null) return;
    e.preventDefault(); onChange(TABS[next][0]); document.getElementById(`oh-tab-${TABS[next][0]}`)?.focus();
  }
  return (
    <div role="tablist" aria-label="Org Health sections" onKeyDown={onKey} className="flex flex-wrap gap-1.5">
      {TABS.map(([k, label]) => (
        <button key={k} id={`oh-tab-${k}`} role="tab" type="button" aria-selected={tab === k} aria-controls="oh-panel" tabIndex={tab === k ? 0 : -1} onClick={() => onChange(k)}
          className={["min-h-9 rounded-xl border px-4 text-sm font-bold transition-colors", tab === k ? "border-[#4B2FC4]/30 bg-[#4B2FC4]/10 text-[#4B2FC4]" : "border-ink/[0.08] bg-ink/[0.03] text-slate-600 hover:text-text-primary"].join(" ")}>
          {label}
        </button>
      ))}
    </div>
  );
}

// Line chart of the saved snapshots, oldest to newest. A snapshot without a number (not enough data) is a gap, not a zero.
export function TrendsTab({ history }) {
  if (!history) return <div className="h-48 rounded-2xl bg-ink/[0.04] animate-pulse" />;
  const rows = [...history].reverse(); // the API sends newest first
  const get = (s, k) => (k === "overall" ? s.overall : s.subScores?.[k]) ?? null;
  const withData = rows.filter((s) => SERIES.some(([k]) => get(s, k) != null));
  if (rows.length < 2 || !withData.length) {
    return (
      <div className={CARD}><h3 className={H3}>Trends</h3>
        <p className="text-sm text-text-primary font-semibold">Not enough history yet</p>
        <p className="text-xs text-slate-600 mt-1">A snapshot is saved automatically every Monday. Two or more snapshots with enough data draw a trend here. Saved so far: {rows.length}.</p>
      </div>
    );
  }
  const W = 640, H = 220, P = { l: 32, r: 12, t: 10, b: 24 };
  const x = (i) => P.l + (rows.length === 1 ? 0 : (i * (W - P.l - P.r)) / (rows.length - 1));
  const y = (v) => P.t + ((100 - v) * (H - P.t - P.b)) / 100;
  // A snapshot without a number breaks the line (gap) instead of drawing a zero.
  const path = (k) => { let d = "", pen = false; rows.forEach((s, i) => { const v = get(s, k); if (v == null) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i)},${y(v)}`; pen = true; }); return d; };
  return (
    <div className={CARD}>
      <h3 className={H3}>Trends (last {rows.length} snapshots)</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Org Health score over time">
        {[0, 25, 50, 75, 100].map((g) => <g key={g}><line x1={P.l} x2={W - P.r} y1={y(g)} y2={y(g)} stroke="rgba(0,0,0,0.08)" /><text x={P.l - 6} y={y(g) + 3} textAnchor="end" fontSize="9" fill="#475569">{g}</text></g>)}
        {SERIES.map(([k, , c]) => <path key={k} d={path(k)} fill="none" stroke={c} strokeWidth={k === "overall" ? 2.5 : 1.5} strokeLinejoin="round" />)}
        {rows.map((s, i) => (i % Math.ceil(rows.length / 6) === 0 || i === rows.length - 1) && <text key={s._id ?? i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#475569">{shortDate(s.calculatedAt)}</text>)}
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {SERIES.map(([k, label, c]) => <li key={k} className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-0.5 w-4 rounded" style={{ background: c }} />{label}</li>)}
      </ul>
      <p className="mt-2 text-[11px] text-slate-600">A gap means that snapshot had too little data for that number. It is not a zero.</p>
    </div>
  );
}

// One card per department, alphabetical (never ranked, D-038). Each card shows the department's own numbers only.
export function DepartmentsTab({ depts }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.all([...depts].sort((a, b) => a.localeCompare(b)).map((d) => api.get(`/api/director/dept/${encodeURIComponent(d)}`, { silent: true }).then((r) => ({ name: d, ...r })).catch(() => ({ name: d, empty: true }))))
      .then((r) => { if (live) setRows(r); });
    return () => { live = false; };
  }, [depts]);
  if (!depts.length) return <div className={CARD}><h3 className={H3}>Departments</h3><p className="text-sm text-slate-600">No departments yet. Add them in Settings.</p></div>;
  if (!rows) return <div className="h-40 rounded-2xl bg-ink/[0.04] animate-pulse" />;
  const pct = (v) => (v == null ? "Not enough data" : `${v}%`);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-600">Departments are listed A to Z. They are not ranked or compared (a department is not a contest).</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r) => (
          <Link key={r.name} to={`/director/dept/${encodeURIComponent(r.name)}`} className={`${CARD} block min-w-0 hover:border-[#4B2FC4]/40`}>
            <h3 className="flex items-center gap-1.5 text-sm font-black text-text-primary [overflow-wrap:anywhere]"><Building2 size={13} aria-hidden="true" className="shrink-0" />{r.name}</h3>
            {r.empty ? <p className="mt-2 text-xs text-slate-600">No members yet.</p> : (
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div><dt className="text-slate-500">People</dt><dd className="font-bold text-text-primary tabular-nums">{r.memberCount}</dd></div>
                <div><dt className="text-slate-500">On time</dt><dd className="font-bold text-text-primary">{pct(r.deliveryOnTime)}</dd></div>
                <div><dt className="text-slate-500">Quality</dt><dd className="font-bold text-text-primary">{pct(r.qualityAvg)}</dd></div>
                <div><dt className="text-slate-500">Open work</dt><dd className="font-bold text-text-primary tabular-nums">{Math.round(r.workloadHours ?? 0)} h</dd></div>
              </dl>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

// Team well-being: how many people sit in each energy tier today and the 30-day trend. Counts only, never a name.
export function WellbeingTab() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { api.get("/api/director/org-health/wellbeing", { silent: true }).then(setD).catch(() => setErr(true)); }, []);
  if (err) return <div className={CARD}><p className="text-sm text-slate-600">Well-being numbers could not be loaded. Try again in a moment.</p></div>;
  if (!d) return <div className="h-40 rounded-2xl bg-ink/[0.04] animate-pulse" />;
  const t = d.today ?? {}, tiers = t.tiers ?? {};
  const TIER = [["Healthy", "#0E6A30"], ["Tired", "#B45309"], ["Low", "#B01F17"]];
  const members = t.members ?? 0;
  if (!members) return <div className={CARD}><h3 className={H3}>Well-being</h3><p className="text-sm text-slate-600">Not enough data. There are no team members to count yet.</p></div>;
  const trend = (d.trend ?? []).filter((s) => s.avgHp != null);
  return (
    <div className="flex flex-col gap-4">
      <div className={CARD}>
        <h3 className={H3}>Team energy today ({members} people)</h3>
        <div className="grid grid-cols-3 gap-3">
          {TIER.map(([k, c]) => (
            <div key={k} className="rounded-xl border border-ink/[0.07] bg-white p-3 text-center">
              <p className="text-2xl font-black tabular-nums" style={{ color: c }}>{tiers[k] ?? 0}</p>
              <p className="text-xs font-semibold text-slate-600">{k}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-600">Average energy: <strong className="text-text-primary">{t.avgHp ?? "n/a"}</strong>{t.activeStreaks != null ? ` · people on a streak: ${t.activeStreaks}` : ""}. Only counts are shown; nobody's own energy is visible here.</p>
      </div>
      {trend.length >= 2 && (
        <div className={CARD}>
          <h3 className={H3}>Average energy, last {trend.length} days</h3>
          <svg viewBox="0 0 640 140" className="w-full h-auto" role="img" aria-label="Average team energy over time">
            <polyline fill="none" stroke="#4B2FC4" strokeWidth="2" points={trend.map((s, i) => `${20 + (i * 600) / (trend.length - 1)},${130 - (s.avgHp / 100) * 120}`).join(" ")} />
          </svg>
          <p className="mt-1 flex justify-between text-[11px] text-slate-600"><span>{shortDate(trend[0].day)}</span><span>{shortDate(trend.at(-1).day)}</span></p>
        </div>
      )}
    </div>
  );
}
