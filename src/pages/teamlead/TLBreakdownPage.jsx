// Team Lead breakdown workspace (V2 Phase 4 · T-3, UX TL v4 §4, TL-03/TL-04, D-012, D-017, D-019, D-119, D-126..D-129).
// /teamlead/modules/:projectId/breakdown?module=<id>. Left: brief, deadline, team capacity. Centre: editable draft table
// (add, delete, duplicate, drag reorder, merge two, split). Right: AI suggest (per-row Accept / Edit / Decline) + live
// realism check (numbers from the server engine). The draft stays in this browser until Apply (all or nothing).
import { RealismExplain } from "./TLAiCards";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { GripVertical, Plus, Trash2, Copy, Scissors, Merge, ChevronDown, ChevronRight, Sparkles, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { BTN } from "@/components/ui/buttons";
import useLoad from "../manager/project/useLoad";
import { fmt } from "../manager/project/format";

const TYPES = ["Feature", "Bug", "Design", "Testing", "DevOps", "Documentation"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Critical"];
const VERDICT = {
  empty: ["Nothing to check yet", "var(--text-secondary)"], fits: ["Fits the time left", "#0E6A30"], tight: ["Tight: little room left", "#7A5200"],
  over: ["Does not fit before the deadline", "#B01F17"], no_deadline: ["No deadline to check against", "var(--text-secondary)"],
};
let seq = 0;
const newKey = () => `r${Date.now().toString(36)}${(seq++).toString(36)}`;
const blankRow = (extra = {}) => ({ key: newKey(), title: "", section: "", type: "Feature", hours: "", difficulty: "Medium", priority: "Medium", assigneeId: "", deadline: "", dependsOn: [], qaRequired: false, acceptanceCriteria: [], benchmark: "", ...extra });
const storeKey = (p, m) => `tl-breakdown:${p}:${m || "project"}`;
const load = (k) => { try { const v = JSON.parse(localStorage.getItem(k) ?? "null"); return Array.isArray(v) ? v : null; } catch { return null; } }; // a damaged draft must not break the page
const save = (k, v) => { try { if (v?.length) localStorage.setItem(k, JSON.stringify(v)); else localStorage.removeItem(k); } catch { /* storage blocked: draft lives in memory only */ } };

function Deps({ row, rows, existing, onChange }) {
  const opts = [...rows.filter((r) => r.key !== row.key).map((r) => [`row:${r.key}`, r.title || "Untitled row", "draft"]), ...existing.map((t) => [`task:${t.id}`, t.title, t.status])];
  return (
    <details className="relative">
      <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-lg px-2 text-xs font-semibold text-text-secondary hover:bg-ink/[0.04]" aria-label={`Dependencies of ${row.title || "this row"}`}>
        {row.dependsOn.length ? `${row.dependsOn.length} selected` : "None"}<ChevronDown size={12} aria-hidden="true" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 max-h-64 w-72 overflow-y-auto rounded-xl border border-ink/[0.1] bg-white p-1 shadow-lg">
        {opts.length ? opts.map(([v, l, s]) => (
          <label key={v} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-ink/[0.03]">
            <input type="checkbox" checked={row.dependsOn.includes(v)} onChange={(e) => onChange(e.target.checked ? [...row.dependsOn, v] : row.dependsOn.filter((x) => x !== v))} className="h-4 w-4 accent-[var(--accent)]" />
            <span className="min-w-0 flex-1 truncate">{l}</span><span className="shrink-0 text-text-secondary">{s === "draft" ? "draft" : s.replace("-", " ")}</span>
          </label>
        )) : <p className="p-2 text-xs text-text-secondary">No other tasks yet.</p>}
      </div>
    </details>
  );
}

export default function TLBreakdownPage() {
  const { projectId } = useParams();
  const [sp] = useSearchParams();
  const moduleId = sp.get("module");
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const ctx = useLoad(`/api/teamlead/modules/${projectId}/breakdown${moduleId ? `?module=${moduleId}` : ""}`);
  const key = storeKey(projectId, moduleId);
  const [rows, setRows] = useState(() => load(key) ?? []);
  const [open, setOpen] = useState(() => new Set());
  const [picked, setPicked] = useState(() => new Set());
  const [rowErrors, setRowErrors] = useState({});
  const [realism, setRealism] = useState(null);
  const [realismErr, setRealismErr] = useState(null);
  const [checking, setChecking] = useState(false); // a newer draft is being checked
  const [ai, setAi] = useState({ status: "idle", rows: [] });
  const [section, setSection] = useState("");
  const [bench, setBench] = useState({}); // rowKey → { status, text, message }
  const [confirm, setConfirm] = useState(null); // "apply" | "clear"
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);
  const drag = useRef(null);
  const leaving = useRef(false); // set right before navigating away after Apply

  useEffect(() => { save(key, rows); }, [key, rows]);
  const d = ctx.data;
  const people = d?.team ?? [];

  // Live realism check (server engine), debounced.
  useEffect(() => {
    if (!d) return undefined;
    setChecking(true);
    const h = setTimeout(() => {
      api.post(`/api/teamlead/modules/${projectId}/realism`, { moduleId: moduleId || undefined, rows: rows.map((r) => ({ ...r, hours: r.hours === "" ? null : Number(r.hours) })) }, { silent: true })
        .then((x) => { setRealism(x); setRealismErr(null); }).catch((e) => setRealismErr(e?.message ?? "The check could not run.")).finally(() => setChecking(false));
    }, 400);
    return () => clearTimeout(h);
  }, [rows, d, projectId, moduleId]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => !leaving.current && rows.length > 0 && !applied && currentLocation.pathname !== nextLocation.pathname);

  const update = (k, patch) => { setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...patch } : r))); setRowErrors((e) => (e[k] ? { ...e, [k]: undefined } : e)); };
  const addRow = (extra) => { const r = blankRow(extra); setRows((rs) => [...rs, r]); setTimeout(() => document.getElementById(`bt-${r.key}`)?.focus(), 0); };
  const removeRows = (keys) => { setRows((rs) => rs.filter((r) => !keys.includes(r.key)).map((r) => ({ ...r, dependsOn: r.dependsOn.filter((x) => !keys.some((k) => x === `row:${k}`)) }))); setPicked(new Set()); };
  const duplicate = (r) => setRows((rs) => { const i = rs.findIndex((x) => x.key === r.key); const c = { ...r, key: newKey(), title: `${r.title} (copy)`.slice(0, 120) }; return [...rs.slice(0, i + 1), c, ...rs.slice(i + 1)]; });
  const split = (r) => setRows((rs) => {
    const i = rs.findIndex((x) => x.key === r.key); const h = Number(r.hours) || 0;
    const a = { ...r, title: `${r.title} (part 1)`.slice(0, 120), hours: h ? Math.max(1, Math.round((h / 2) * 4) / 4) : "" };
    const b = { ...r, key: newKey(), title: `${r.title} (part 2)`.slice(0, 120), hours: h ? Math.max(1, Math.round((h - (Number(a.hours) || 0)) * 4) / 4) : "", dependsOn: [...r.dependsOn, `row:${r.key}`] };
    return [...rs.slice(0, i), a, b, ...rs.slice(i + 1)];
  });
  function merge() {
    const [k1, k2] = [...picked];
    setRows((rs) => {
      const a = rs.find((r) => r.key === k1), b = rs.find((r) => r.key === k2);
      const m = { ...a, title: `${a.title} + ${b.title}`.slice(0, 120), hours: (Number(a.hours) || 0) + (Number(b.hours) || 0) || "",
        acceptanceCriteria: [...new Set([...a.acceptanceCriteria, ...b.acceptanceCriteria])].slice(0, 10), qaRequired: a.qaRequired || b.qaRequired,
        dependsOn: [...new Set([...a.dependsOn, ...b.dependsOn])].filter((x) => x !== `row:${a.key}` && x !== `row:${b.key}`), benchmark: [a.benchmark, b.benchmark].filter(Boolean).join(" ").slice(0, 1000) };
      return rs.filter((r) => r.key !== k2).map((r) => (r.key === k1 ? m : { ...r, dependsOn: [...new Set(r.dependsOn.map((x) => (x === `row:${k2}` ? `row:${k1}` : x)))] }));
    });
    setPicked(new Set());
  }
  const move = (k, dir) => setRows((rs) => { const i = rs.findIndex((r) => r.key === k), j = i + dir; if (j < 0 || j >= rs.length) return rs; const n = [...rs]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const dropOn = (k) => setRows((rs) => { const from = rs.findIndex((r) => r.key === drag.current), to = rs.findIndex((r) => r.key === k); if (from < 0 || to < 0 || from === to) return rs; const n = [...rs]; const [x] = n.splice(from, 1); n.splice(to, 0, x); return n; });

  // ── AI ──
  const suggest = useCallback(async () => {
    setAi({ status: "loading", rows: [] });
    try {
      const r = await api.post("/api/teamlead/ai/breakdown", { projectId, moduleId: moduleId || undefined, section: section.trim() || undefined, draft: rows.map((x) => x.title).filter(Boolean) }, { silent: true });
      const keys = r.rows.map(() => newKey());
      setAi({ status: "done", rows: r.rows.map((x, i) => ({ ...x, key: keys[i], dependsOn: x.dependsOn.map((dd) => (dd.row !== undefined ? `row:${keys[dd.row]}` : `task:${dd.taskId}`)) })) });
    } catch (e) {
      setAi({ status: e?.data?.code === "ai_off" ? "off" : e?.data?.code === "limit" ? "limit" : "error", rows: [], message: e?.message ?? "AI is unavailable right now." });
    }
  }, [projectId, moduleId, section, rows]);
  function acceptSuggestion(s, edit) {
    setRows((rs) => {
      const have = new Set([...rs.map((r) => `row:${r.key}`), ...ai.rows.map((x) => `row:${x.key}`)]);
      return [...rs, blankRow({ key: s.key, title: s.title, type: s.type, hours: s.hours, difficulty: s.difficulty, section: section.trim().slice(0, 24), acceptanceCriteria: s.acceptanceCriteria, benchmark: s.benchmark, dependsOn: s.dependsOn.filter((x) => have.has(x) || x.startsWith("task:")), qaRequired: s.type === "Testing", fromAi: true })];
    });
    setAi((a) => ({ ...a, rows: a.rows.filter((x) => x.key !== s.key) }));
    if (edit) setTimeout(() => { setOpen((o) => new Set([...o, s.key])); document.getElementById(`bt-${s.key}`)?.focus(); }, 0);
  }
  async function suggestBenchmark(r) {
    setBench((b) => ({ ...b, [r.key]: { status: "loading" } }));
    try { const x = await api.post("/api/teamlead/ai/benchmark", { projectId, title: r.title, type: r.type, acceptanceCriteria: r.acceptanceCriteria }, { silent: true }); setBench((b) => ({ ...b, [r.key]: { status: "done", text: x.benchmark } })); }
    catch (e) { setBench((b) => ({ ...b, [r.key]: { status: "error", message: e?.status === 503 ? "AI is not configured. Write the benchmark yourself." : e?.message ?? "AI is unavailable right now." } })); }
  }

  // ── Apply ──
  const notifyCount = useMemo(() => new Set(rows.map((r) => r.assigneeId).filter(Boolean)).size, [rows]);
  async function apply() {
    setBusy(true);
    try {
      const r = await api.post(`/api/teamlead/modules/${projectId}/breakdown/apply`, { moduleId: moduleId || undefined, rows: rows.map((x) => ({ ...x, hours: x.hours === "" ? null : Number(x.hours), deadline: x.deadline || null, assigneeId: x.assigneeId || null })) });
      setApplied(true); setRows([]); save(key, []); setConfirm(null);
      addToast({ type: "success", message: `${r.created} tasks created. ${r.notified} ${r.notified === 1 ? "person was" : "people were"} told.` });
      leaving.current = true;
      navigate(`/teamlead/modules/${projectId}?${moduleId ? `module=${moduleId}&` : ""}tab=tasks`);
    } catch (e) {
      setConfirm(null); setRowErrors(e?.data?.rowErrors ?? {});
      addToast({ type: "error", message: e?.message ?? "The tasks could not be created." });
    } finally { setBusy(false); }
  }

  if (ctx.error) return (
    <Page>{/Accept the module first/.test(ctx.error)
      ? <EmptyState heading="Accept the module first. Tasks can be planned after you accept it." action={{ label: "Back to the module", to: `/teamlead/modules/${projectId}${moduleId ? `?module=${moduleId}` : ""}` }} />
      : /not found/i.test(ctx.error) ? <EmptyState heading="This module does not exist or is not one of yours." action={{ label: "Back to modules", to: "/teamlead/modules" }} />
      : <ErrorState message={ctx.error} onRetry={ctx.reload} />}</Page>
  );
  if (!d) return <Page><div aria-busy="true" aria-label="Loading breakdown" className="flex flex-col gap-6"><Skeleton className="h-14 w-1/2 rounded-xl" /><div className="grid gap-6 xl:grid-cols-[240px_1fr_300px]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div></div></Page>;

  const verdict = VERDICT[realism?.verdict ?? "empty"];
  const errorsFor = (k) => rowErrors[k] ?? {};
  const issuesFor = (k) => (realism?.issues ?? []).filter((i) => i.rowKey === k);
  const cell = "h-9 w-full min-w-0 rounded-lg px-2 text-sm font-normal";
  const canApply = rows.length > 0 && !realism?.blocking && !busy && !checking;
  const moduleLink = `/teamlead/modules/${projectId}${moduleId ? `?module=${moduleId}` : ""}`;

  return (
    <Page>
      <div>
        <Breadcrumb items={[{ label: "Modules", to: "/teamlead/modules" }, { label: d.title, to: moduleLink }, { label: "Breakdown" }]} />
        <PageHeader title={`Break down: ${d.title}`} subtitle="Plan the tasks here. Nothing is created until you apply; the draft stays in this browser."
          primary={{ label: rows.length ? `Apply ${rows.length} task${rows.length === 1 ? "" : "s"}` : "Apply tasks", onClick: () => setConfirm("apply"), disabled: !canApply }}
          secondary={{ label: "Clear draft", onClick: () => setConfirm("clear"), disabled: !rows.length }} />
        {realism?.blocking && rows.length > 0 && <p role="status" className="mt-2 text-xs font-semibold text-[#B01F17]">Fix the red items in the realism check before applying (each task 1 to 14 hours).</p>}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        {/* Left: brief, deadline, capacity */}
        <aside className="flex flex-col gap-4" aria-label="Module">
          <Panel title="Brief" icon={Info}>
            <div className="flex flex-col gap-3 px-4 py-3 text-sm">
              <p className="whitespace-pre-wrap text-text-primary">{d.brief || <span className="text-text-secondary">No brief written yet.</span>}</p>
              <p className="text-xs text-text-secondary">Deadline: <strong className="text-text-primary">{d.deadline ? fmt(d.deadline) : "none"}</strong></p>
            </div>
          </Panel>
          <Panel title="Team capacity" icon={CheckCircle2}>
            <div className="flex flex-col gap-3 px-4 py-3 text-sm">
              {realism?.totals ? (
                <>
                  <p className="text-xs text-text-secondary">{realism.totals.days} working days × {d.workTime.hoursPerDay} h, minus current work:</p>
                  <p><strong className="tabular-nums">{realism.totals.freeHours} h</strong> free of {realism.totals.capacityHours} h</p>
                  <div className="h-2 overflow-hidden rounded-full bg-ink/[0.07]" role="img" aria-label={`Draft uses ${realism.totals.usedPct ?? 0}% of the free hours`}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, realism.totals.usedPct ?? 0)}%`, background: verdict[1] === "var(--text-secondary)" ? "var(--accent)" : verdict[1] }} />
                  </div>
                  <p className="text-xs tabular-nums text-text-secondary">Draft: {realism.totals.taskHours} h{realism.totals.freeHours ? ` (${realism.totals.usedPct}% of the free hours)` : "; no free hours left before the deadline"}</p>
                </>
              ) : <p className="text-xs text-text-secondary">{d.deadline ? "Add tasks to see how much of the time they use." : "No deadline, so the time left cannot be measured."}</p>}
              {rows.length > 0 && realism?.verdict && realism.verdict !== "empty" && <RealismExplain projectId={projectId} moduleId={moduleId} rows={rows.map((r) => ({ ...r, hours: r.hours === "" ? null : r.hours }))} />}
              <ul className="flex flex-col gap-1 border-t border-ink/[0.05] pt-2">
                {people.length ? people.map((p) => <li key={p.id} className="flex justify-between gap-2 text-xs"><span className="truncate">{p.name}</span><span className="shrink-0 tabular-nums text-text-secondary">{p.utilisation}% now</span></li>)
                  : <li className="text-xs text-text-secondary">Nobody from your team is on this project yet.</li>}
              </ul>
            </div>
          </Panel>
        </aside>

        {/* Centre: draft table */}
        <section aria-label="Draft tasks" className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={BTN.secondary} onClick={() => addRow()}><Plus size={14} aria-hidden="true" />Add row</button>
            <button type="button" className={BTN.secondary} disabled={picked.size !== 2} onClick={merge} title={picked.size !== 2 ? "Select exactly two rows to merge." : undefined}><Merge size={14} aria-hidden="true" />Merge 2 rows</button>
            <button type="button" className={BTN.ghost} disabled={!picked.size} onClick={() => removeRows([...picked])}><Trash2 size={14} aria-hidden="true" />Delete selected</button>
            <span className="ml-auto text-xs text-text-secondary">{rows.length} of {d.maxRows} rows · draft saved in this browser</span>
          </div>
          {!rows.length ? (
            <div className="rounded-2xl border border-dashed border-ink/[0.15] bg-bg-surface p-8">
              <EmptyState heading="No tasks in the draft yet. Ask the AI for a first list, or add rows yourself." action={{ label: "Add a row", onClick: () => addRow() }} />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-ink/[0.07] bg-bg-surface">
              <table className="w-full min-w-[1320px] table-fixed text-sm">
                <caption className="sr-only">Draft tasks for {d.title}</caption>
                <thead><tr className="border-b border-ink/[0.06] text-left text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
                  <th scope="col" className="w-16 px-2 py-2"><span className="sr-only">Select and move</span></th>
                  <th scope="col" className="w-[260px] px-2 py-2">Title</th><th scope="col" className="w-24 px-2 py-2">Section</th><th scope="col" className="w-32 px-2 py-2">Type</th>
                  <th scope="col" className="w-20 px-2 py-2">Hours</th><th scope="col" className="w-28 px-2 py-2">Difficulty</th><th scope="col" className="w-28 px-2 py-2">Priority</th>
                  <th scope="col" className="w-36 px-2 py-2">Assignee</th><th scope="col" className="w-40 px-2 py-2">Deadline</th><th scope="col" className="w-28 px-2 py-2">Depends on</th>
                  <th scope="col" className="w-12 px-2 py-2">QA</th><th scope="col" className="w-10 px-2 py-2"><span className="sr-only">More</span></th>
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => {
                    const er = errorsFor(r.key), iss = issuesFor(r.key), hasErr = iss.some((x) => x.level === "error") || Object.keys(er).length;
                    const expanded = open.has(r.key);
                    return [
                      <tr key={r.key} id={`row-${r.key}`} draggable onDragStart={() => { drag.current = r.key; }} onDragOver={(e) => e.preventDefault()} onDrop={() => dropOn(r.key)}
                        className={`border-b border-ink/[0.04] align-top ${hasErr ? "bg-[#D1291F]/[0.04]" : ""}`}>
                        <td className="px-2 py-1.5"><span className="flex items-center gap-1">
                          <input type="checkbox" aria-label={`Select ${r.title || `row ${i + 1}`}`} checked={picked.has(r.key)} onChange={() => setPicked((p) => { const n = new Set(p); if (n.has(r.key)) n.delete(r.key); else n.add(r.key); return n; })} className="h-4 w-4 accent-[var(--accent)]" />
                          <button type="button" aria-label={`Move ${r.title || `row ${i + 1}`} (Arrow Up / Arrow Down, or drag)`} onKeyDown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); move(r.key, e.key === "ArrowUp" ? -1 : 1); requestAnimationFrame(() => e.target.focus()); } }}
                            className="flex h-8 w-6 cursor-grab items-center justify-center rounded text-text-secondary hover:bg-ink/[0.05]"><GripVertical size={14} aria-hidden="true" /></button></span></td>
                        <td className="px-2 py-1.5"><label className="sr-only" htmlFor={`bt-${r.key}`}>Title</label>
                          <input id={`bt-${r.key}`} value={r.title} maxLength={120} autoComplete="off" onChange={(e) => update(r.key, { title: e.target.value })} placeholder="What has to be done…" aria-invalid={!!er.title} className={cell} />
                          {er.title && <p className="mt-0.5 text-xs font-semibold text-[#B01F17]">{er.title}</p>}
                          {r.fromAi && <span className="text-[11px] text-text-secondary">from AI</span>}</td>
                        <td className="px-2 py-1.5"><input aria-label="Section" value={r.section} maxLength={24} autoComplete="off" onChange={(e) => update(r.key, { section: e.target.value })} placeholder="e.g. API…" className={cell} /></td>
                        <td className="px-2 py-1.5"><select aria-label="Type" value={r.type} onChange={(e) => update(r.key, { type: e.target.value })} className={cell}>{TYPES.map((x) => <option key={x}>{x}</option>)}</select></td>
                        <td className="px-2 py-1.5"><input aria-label="Hours" type="number" inputMode="decimal" min={1} max={14} step={0.25} value={r.hours} onChange={(e) => update(r.key, { hours: e.target.value })} aria-invalid={iss.some((x) => x.level === "error")} className={`${cell} tabular-nums`} /></td>
                        <td className="px-2 py-1.5"><select aria-label="Difficulty" value={r.difficulty} onChange={(e) => update(r.key, { difficulty: e.target.value })} className={cell}>{DIFFICULTIES.map((x) => <option key={x}>{x}</option>)}</select></td>
                        <td className="px-2 py-1.5"><select aria-label="Priority" value={r.priority} onChange={(e) => update(r.key, { priority: e.target.value })} className={cell}>{PRIORITIES.map((x) => <option key={x}>{x}</option>)}</select></td>
                        <td className="px-2 py-1.5"><select aria-label="Assignee" value={r.assigneeId} onChange={(e) => update(r.key, { assigneeId: e.target.value })} aria-invalid={!!er.assignee} className={cell}><option value="">Unassigned</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                          {er.assignee && <p className="mt-0.5 text-xs font-semibold text-[#B01F17]">{er.assignee}</p>}</td>
                        <td className="px-2 py-1.5"><input aria-label="Deadline" type="date" value={r.deadline} onChange={(e) => update(r.key, { deadline: e.target.value })} className={cell} /></td>
                        <td className="px-2 py-1.5"><Deps row={r} rows={rows} existing={d.existingTasks} onChange={(v) => update(r.key, { dependsOn: v })} />
                          {er.dependsOn && <p className="mt-0.5 text-xs font-semibold text-[#B01F17]">{er.dependsOn}</p>}</td>
                        <td className="px-2 py-1.5 text-center"><input type="checkbox" aria-label="QA required" checked={r.qaRequired} onChange={(e) => update(r.key, { qaRequired: e.target.checked })} className="mt-2 h-4 w-4 accent-[var(--accent)]" /></td>
                        <td className="px-2 py-1.5"><button type="button" aria-expanded={expanded} aria-controls={`more-${r.key}`} aria-label={`${expanded ? "Hide" : "Show"} criteria, benchmark and row actions`} onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(r.key)) n.delete(r.key); else n.add(r.key); return n; })}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-ink/[0.05]">{expanded ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronRight size={15} aria-hidden="true" />}</button></td>
                      </tr>,
                      expanded && (
                        <tr key={`${r.key}-more`} id={`more-${r.key}`} className="border-b border-ink/[0.06] bg-ink/[0.015]">
                          <td />
                          <td colSpan={11} className="px-2 py-3">
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="flex flex-col gap-1 text-xs font-bold">Acceptance criteria (one per line)
                                <textarea rows={3} maxLength={2100} value={r.acceptanceCriteria.join("\n")} onChange={(e) => update(r.key, { acceptanceCriteria: e.target.value.split("\n").slice(0, 10) })} placeholder="It shows an error under the field…" className="rounded-lg p-2 text-sm font-normal" /></label>
                              <div className="flex flex-col gap-1">
                                <label htmlFor={`bb-${r.key}`} className="text-xs font-bold">Benchmark</label>
                                <textarea id={`bb-${r.key}`} rows={3} maxLength={1000} value={r.benchmark} onChange={(e) => update(r.key, { benchmark: e.target.value })} placeholder={'What "good" looks like…'} className="rounded-lg p-2 text-sm font-normal" />
                                <div className="flex flex-wrap items-center gap-2">
                                  <button type="button" className={BTN.ghost} disabled={!r.title.trim() || bench[r.key]?.status === "loading"} onClick={() => suggestBenchmark(r)}><Sparkles size={13} aria-hidden="true" />{bench[r.key]?.status === "loading" ? "Asking…" : "Suggest benchmark"}</button>
                                  {bench[r.key]?.status === "error" && <span role="status" className="text-xs text-text-secondary">{bench[r.key].message}</span>}
                                </div>
                                {bench[r.key]?.status === "done" && (
                                  <div className="flex flex-col gap-1.5 rounded-lg border border-accent/15 bg-accent/[0.03] p-2 text-xs" aria-live="polite">
                                    <p>{bench[r.key].text}</p>
                                    <span className="flex gap-2"><button type="button" className={BTN.secondary} onClick={() => { update(r.key, { benchmark: bench[r.key].text }); setBench((b) => ({ ...b, [r.key]: undefined })); }}>Accept</button>
                                      <button type="button" className={BTN.ghost} onClick={() => { update(r.key, { benchmark: bench[r.key].text }); setBench((b) => ({ ...b, [r.key]: undefined })); document.getElementById(`bb-${r.key}`)?.focus(); }}>Edit</button>
                                      <button type="button" className={BTN.ghost} onClick={() => setBench((b) => ({ ...b, [r.key]: undefined }))}>Decline</button></span>
                                    <span className="text-[11px] text-text-secondary">AI-generated.</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" className={BTN.ghost} onClick={() => duplicate(r)}><Copy size={13} aria-hidden="true" />Duplicate</button>
                              <button type="button" className={BTN.ghost} onClick={() => split(r)}><Scissors size={13} aria-hidden="true" />Split in two</button>
                              <button type="button" className={BTN.ghost} onClick={() => removeRows([r.key])}><Trash2 size={13} aria-hidden="true" />Delete row</button>
                            </div>
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right: AI + realism */}
        <aside className="flex flex-col gap-4" aria-label="Help">
          <Panel title="Suggest tasks" icon={Sparkles}>
            <div className="flex flex-col gap-3 px-4 py-3 text-sm">
              {d.ai.configured ? (
                <>
                  <label className="flex flex-col gap-1 text-xs font-bold">Section (optional)<input value={section} maxLength={60} autoComplete="off" onChange={(e) => setSection(e.target.value)} placeholder="Whole module, or e.g. Payments…" className="h-9 rounded-lg px-2 text-sm font-normal" /></label>
                  <button type="button" className={BTN.secondary} disabled={ai.status === "loading"} onClick={suggest}>{ai.status === "loading" ? "Thinking…" : ai.rows.length ? "Suggest more" : "Suggest tasks"}</button>
                </>
              ) : <p className="text-xs text-text-secondary">AI is not configured on this server. Add the rows yourself; everything else works.</p>}
              {ai.status === "loading" && <p role="status" className="text-xs text-text-secondary">Reading the brief and the existing tasks…</p>}
              {["error", "limit", "off"].includes(ai.status) && <p role="alert" className="text-xs text-text-secondary">{ai.message} {ai.status === "error" && <button type="button" onClick={suggest} className="font-bold text-accent-text underline">Retry</button>}</p>}
              {ai.rows.length > 0 && (
                <div className="flex flex-col gap-2" aria-live="polite">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold">{ai.rows.length} suggested · AI-generated</span>
                    <button type="button" className={BTN.ghost} onClick={() => ai.rows.forEach((s) => acceptSuggestion(s, false))}>Accept all</button></div>
                  <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
                    {ai.rows.map((s) => (
                      <li key={s.key} className="flex flex-col gap-1 rounded-xl border border-accent/15 bg-accent/[0.03] p-2.5 text-xs">
                        <span className="font-semibold text-text-primary">{s.title}</span>
                        <span className="text-text-secondary">{s.type} · {s.hours} h{s.clamped ? " (set to the 1–14 h range)" : ""} · {s.difficulty}{s.dependsOn.length ? ` · waits for ${s.dependsOn.length}` : ""}</span>
                        <span className="flex gap-1.5"><button type="button" className={BTN.secondary} onClick={() => acceptSuggestion(s, false)}>Accept</button><button type="button" className={BTN.ghost} onClick={() => acceptSuggestion(s, true)}>Edit</button>
                          <button type="button" className={BTN.ghost} onClick={() => setAi((a) => ({ ...a, rows: a.rows.filter((x) => x.key !== s.key) }))}>Decline</button></span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Realism check" icon={AlertTriangle} iconColor={realism?.verdict === "over" ? "#B01F17" : undefined}>
            <div className="flex flex-col gap-3 px-4 py-3 text-sm" aria-live="polite">
              {realismErr ? <p role="alert" className="text-xs text-text-secondary">{realismErr}</p> : (
                <>
                  <p className="flex items-center justify-between gap-2 font-bold" style={{ color: verdict[1] }}>{verdict[0]}{checking && <span role="status" className="text-xs font-normal text-text-secondary">Checking…</span>}</p>
                  {realism?.totals && <p className="text-xs tabular-nums text-text-secondary">{realism.totals.taskHours} h planned · {realism.totals.freeHours} h free · {realism.totals.days} working days left</p>}
                  {(realism?.issues ?? []).length > 0 && (
                    <ul className="flex flex-col gap-1.5">
                      {realism.issues.map((x, i) => (
                        <li key={i}><button type="button" disabled={!x.rowKey} onClick={() => document.getElementById(`bt-${x.rowKey}`)?.focus()}
                          className="flex w-full items-start gap-1.5 rounded-lg p-1 text-left text-xs hover:bg-ink/[0.03] disabled:cursor-default disabled:hover:bg-transparent">
                          <AlertTriangle size={12} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: x.level === "error" ? "#B01F17" : "#7A5200" }} />
                          <span className={x.level === "error" ? "font-semibold text-[#B01F17]" : "text-text-primary"}>{x.message}</span></button></li>
                      ))}
                    </ul>
                  )}
                  {(realism?.people ?? []).length > 0 && (
                    <ul className="flex flex-col gap-1 border-t border-ink/[0.05] pt-2">{realism.people.map((p) => <li key={p.id} className="flex justify-between gap-2 text-xs"><span className="truncate">{p.name} +{p.addedHours} h</span><span className="shrink-0 font-semibold tabular-nums" style={{ color: p.afterPct > 100 ? "#B01F17" : undefined }}>{p.label}</span></li>)}</ul>
                  )}
                  {(realism?.suggestions ?? []).length > 0 && (
                    <div className="flex flex-col gap-1.5 border-t border-ink/[0.05] pt-2">
                      <p className="text-xs font-bold">What you can do</p>
                      <p className="text-xs text-text-secondary">Cut or merge the lowest-priority rows, or:</p>
                      <Link to={`${moduleLink}${moduleLink.includes("?") ? "&" : "?"}request=deadline`} className={BTN.secondary}>Request a deadline change</Link>
                      <Link to={`${moduleLink}${moduleLink.includes("?") ? "&" : "?"}request=person`} className={BTN.ghost}>Ask your Manager for another person</Link>
                    </div>
                  )}
                  <p className="text-[11px] text-text-secondary">Numbers come from the workload engine: working days and hours of your organization, minus each person's current work.</p>
                </>
              )}
            </div>
          </Panel>
        </aside>
      </div>

      <ConfirmModal open={confirm === "apply"} onClose={() => setConfirm(null)} onConfirm={apply} loading={busy} confirmLabel={`Create ${rows.length} tasks`}
        title={`Create ${rows.length} task${rows.length === 1 ? "" : "s"}, notify ${notifyCount} ${notifyCount === 1 ? "person" : "people"}?`}
        body={`Tasks with an assignee start in To Do, the rest in Backlog. ${realism?.verdict === "over" ? "The realism check says the plan does not fit before the deadline. " : ""}If any row is invalid, nothing is created.`} />
      <ConfirmModal open={confirm === "clear"} onClose={() => setConfirm(null)} onConfirm={() => { setRows([]); setRowErrors({}); setConfirm(null); }} destructive confirmLabel="Clear draft"
        title="Clear the whole draft?" body="All rows in this draft are removed from this browser. No tasks were created from them." />
      <ConfirmModal open={blocker.state === "blocked"} onClose={() => blocker.reset?.()} onConfirm={() => blocker.proceed?.()} confirmLabel="Leave"
        title="Leave without applying?" body="Your draft stays in this browser, but no tasks are created until you apply them." />
    </Page>
  );
}
