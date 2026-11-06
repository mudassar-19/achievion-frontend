// Manager Reports tabs (V2 Phase 3 · M-6, UX §11). Numbers come from /api/manager/reports/* (one service on
// the server, same functions as the sprint summary). No AI here; the narrative arrives with M-7.
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { ListChecks, Zap, CalendarClock, Star, Gauge, Sparkles, BarChart3, TrendingUp, Flame, HeartPulse, NotebookPen, ClipboardList, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import { useRoleTheme } from "@/utils/roleTheme";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { BTN } from "@/components/ui/buttons";
import { AiStatus, AiTag, AiFeedback } from "@/components/ui/AiParts";
import { useAiCall } from "@/components/ui/aiCall";
import useReport, { CHART, signed } from "./useReport";
import { fmt } from "../project/format";

const PAGE = 25;

function Loading({ label }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex flex-col gap-6">
      <Skeleton className="h-[130px] rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
    </div>
  );
}
const Guard = ({ state, label, children }) => (state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : !state.data ? <Loading label={label} /> : children(state.data));

const vs = (delta, prev, suffix = "") => (prev == null ? "nothing to compare with the period before" : `${signed(delta, suffix) ?? "no change"} vs the period before (${prev}${suffix})`);

// A chart with its numbers one click away (table view for screen readers, print and colour-blind readers).
function ChartPanel({ title, icon, summary, rows, columns, empty, children }) {
  return (
    <Panel title={title} icon={icon}>
      {rows.length === 0 || rows.every((r) => !r.value && !r.total)
        ? <p className="px-5 py-10 text-center text-sm text-text-secondary">{empty}</p>
        : <div className="px-3 pb-2 pt-4" role="img" aria-label={summary}>{children}</div>}
      {rows.length > 0 && (
        <details className="border-t border-ink/[0.05] px-5 py-3 text-xs text-text-secondary">
          <summary className="cursor-pointer font-bold">Show the numbers</summary>
          <table className="mt-2 w-full text-left tabular-nums">
            <thead><tr>{columns.map(([, l]) => <th key={l} scope="col" className="py-1 pr-4 font-bold">{l}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-ink/[0.04]">{columns.map(([k]) => <td key={k} className="py-1 pr-4 text-text-primary">{r[k]}</td>)}</tr>)}</tbody>
          </table>
        </details>
      )}
    </Panel>
  );
}

function SimpleBars({ data, dataKey = "value", xKey = "label", unit, color }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART.grid} />
        <XAxis dataKey={xKey} tick={CHART.axis} tickLine={false} axisLine={CHART.axisLine} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tick={CHART.axis} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
        <ReferenceLine y={0} stroke="rgba(16,24,40,0.2)" />
        <Tooltip cursor={{ fill: "rgba(16,24,40,0.04)" }} formatter={(v) => [`${v} ${unit}`, ""]} separator="" contentStyle={CHART.tooltip} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Delivery ────────────────────────────────────────────────────────────────
export function DeliveryTab({ query, compact = false, base, showRework = false }) {
  const theme = useRoleTheme();
  const state = useReport("delivery", query, base);
  return (
    <Guard state={state} label="Loading delivery report">{(d) => {
      const c = d.current, p = d.previous, x = d.delta;
      return (
        <>
          <Panel title="Speed, punctuality and quality" icon={Gauge}>
            <div className={`grid grid-cols-2 divide-ink/[0.05] md:grid-cols-3 ${compact ? "" : "xl:grid-cols-6"} [&>*]:border-b [&>*]:border-ink/[0.05]`}>
              <StatCard label="Tasks done" value={c.tasksDone} icon={ListChecks} color={theme.accent} sub={vs(x.tasksDone, p.tasksDone)} />
              <StatCard label="Velocity" value={`${c.velocity} XP`} icon={Zap} color={theme.accent} sub={vs(x.velocity, p.velocity, " XP")} />
              <StatCard label="On time" value={c.onTimePct != null ? `${c.onTimePct}%` : null} noDataLabel="No deadlines to judge" icon={CalendarClock} color={theme.accent}
                sub={c.onTimePct == null ? "judged at the first submission" : vs(x.onTimePct, p.onTimePct, "%")} />
              <StatCard label="Team Lead score" value={c.avgTlScore} noDataLabel="Not scored yet" icon={Star} color={theme.accent}
                sub={c.avgTlScore == null ? "average final score (0–100)" : `${c.scored} scored · ${vs(x.avgTlScore, p.avgTlScore)}`} />
              <StatCard label="Stars" value={c.avgStars != null ? `${c.avgStars} ★` : null} noDataLabel="No stars yet" icon={Star} color={theme.accent} sub={vs(x.avgStars, p.avgStars)} />
              <StatCard label="AI score" value={c.avgAiScore} noDataLabel="Not compared yet" icon={Sparkles} color={theme.accent}
                sub={`only where the Team Lead also scored (${c.aiCompared})`} />
              {showRework && <StatCard label="Rework" value={c.rework} icon={ClipboardList} color={theme.accent} sub={vs(x.rework, p.rework)} />}
            </div>
          </Panel>
          {!compact && (
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartPanel title="Done tasks over time" icon={BarChart3} rows={d.done} columns={[["label", "Period"], ["value", "Tasks done"]]}
                summary={`Done tasks per period: ${d.done.filter((r) => r.value).map((r) => `${r.label} ${r.value}`).join(", ") || "none"}`}
                empty="No task was finished in this period.">
                <SimpleBars data={d.done} unit="done" color={theme.accent} />
              </ChartPanel>
              <ChartPanel title="Velocity per sprint" icon={TrendingUp} rows={d.sprints.map((s) => ({ ...s, value: s.velocity }))} columns={[["name", "Sprint"], ["velocity", "Velocity (XP)"]]}
                summary={`Velocity per sprint: ${d.sprints.map((s) => `${s.name} ${s.velocity} XP`).join(", ") || "none"}`}
                empty="No closed sprint up to this date.">
                <SimpleBars data={d.sprints} dataKey="velocity" xKey="name" unit="XP" color={theme.accent} />
              </ChartPanel>
            </div>
          )}
        </>
      );
    }}</Guard>
  );
}

// ── People ──────────────────────────────────────────────────────────────────
export function PeopleTab({ query, base, onOpen, emptyAction = { label: "Open Resources", to: "/manager/resources" } }) {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const state = useReport("people", query, base);
  const sort = { key: sp.get("sort") ?? "tasksDone", dir: sp.get("dir") === "asc" ? "asc" : "desc" };
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const set = (patch) => { const q = new URLSearchParams(sp); for (const [k, v] of Object.entries(patch)) (v ? q.set(k, v) : q.delete(k)); setSp(q, { replace: true }); };
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  const rows = sortRows(state.data?.rows ?? [], sort);
  const columns = [
    { key: "name", label: "Member", sortable: true, className: "min-w-[180px]", render: (r) => <span title={r.name} className="block max-w-[280px] truncate font-bold text-text-primary">{r.name}</span> },
    { key: "role", label: "Role", sortable: true, className: "whitespace-nowrap text-text-secondary", render: (r) => r.role },
    { key: "tasksDone", label: "Tasks done", sortable: true, className: "tabular-nums", render: (r) => r.tasksDone },
    { key: "onTimePct", label: "On time", sortable: true, className: "tabular-nums", render: (r) => (r.onTimePct == null ? "—" : `${r.onTimePct}%`) },
    { key: "avgScore", label: "Avg score", sortable: true, className: "tabular-nums", render: (r) => r.avgScore ?? "—" },
    { key: "rework", label: "Rework", sortable: true, className: "tabular-nums", render: (r) => r.rework },
    { key: "xp", label: "XP earned", sortable: true, className: "tabular-nums whitespace-nowrap", render: (r) => `${r.xp} XP` },
  ];
  return (
    <>
      <DataTable label="Team delivery" columns={columns} rows={rows.slice((page - 1) * PAGE, page * PAGE)} loading={!state.data} total={rows.length} page={page} pageSize={PAGE}
        sort={sort} onSort={(k) => set({ sort: k, dir: sort.key === k && sort.dir === "desc" ? "asc" : "desc", page: null })}
        onPage={(n) => set({ page: n > 1 ? String(n) : null })}
        onRowClick={onOpen ?? ((r) => navigate(`?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), tab: "xp", member: r.id })}`))}
        empty={<EmptyState heading="Nobody is on this team yet." action={emptyAction} />} />
      <p className="text-xs text-text-secondary">Delivery numbers only. Rework = times the work was sent back from review. XP is net (adjustments after a review are subtracted). Select a person to see their XP trend.</p>
    </>
  );
}
function sortRows(rows, { key, dir }) {
  const m = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[key], y = b[key];
    if (x == null || y == null) return x == null ? (y == null ? 0 : 1) : -1;
    return (typeof x === "string" ? x.localeCompare(y) : x - y) * m;
  });
}

// ── XP trend ────────────────────────────────────────────────────────────────
function Segmented({ label, value, options, onChange }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-xl border border-ink/[0.08] bg-ink/[0.03] p-0.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={`min-h-8 rounded-[10px] px-3 text-xs font-bold transition-colors ${value === v ? "bg-bg-surface text-accent-text shadow-sm" : "text-text-secondary hover:text-text-primary"}`}>{l}</button>
      ))}
    </div>
  );
}

export function XpTab({ query, base }) {
  const theme = useRoleTheme();
  const [sp, setSp] = useSearchParams();
  const bucket = sp.get("bucket") === "month" ? "month" : "week";
  const state = useReport("xp", query, base);
  const set = (k, v) => { const q = new URLSearchParams(sp); if (v) q.set(k, v); else q.delete(k); setSp(q, { replace: true }); };
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Group XP by" value={bucket} options={[["week", "Weekly"], ["month", "Monthly"]]} onChange={(v) => set("bucket", v === "week" ? null : v)} />
        <label className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-xs font-bold text-text-secondary">Person
          <select value={sp.get("member") ?? ""} onChange={(e) => set("member", e.target.value)} className="h-9 min-w-0 max-w-[240px] rounded-xl px-3 text-sm font-normal" disabled={!state.data}>
            <option value="">Team total</option>
            {(state.data?.members ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
      </div>
      <Guard state={state} label="Loading XP trend">{(d) => (
        <>
          <Panel title={d.memberName ? `XP for ${d.memberName}` : "Team XP"} icon={TrendingUp}>
            <div className="grid grid-cols-1 divide-ink/[0.05] sm:grid-cols-3 sm:divide-x">
              <StatCard label="XP this period" value={`${d.total} XP`} icon={Zap} color={theme.accent} sub="net: adjustments after a review are subtracted" />
              <StatCard label="Period before" value={`${d.previousTotal} XP`} icon={CalendarClock} color={theme.accent} sub="same length, right before" />
              <StatCard label="Change" value={signed(d.total - d.previousTotal, " XP") ?? "0 XP"} icon={TrendingUp} color={theme.accent}
                sub={d.previousTotal ? `${signed(Math.round(((d.total - d.previousTotal) / Math.abs(d.previousTotal)) * 100), "%")}` : "nothing to compare with"} />
            </div>
          </Panel>
          <ChartPanel title={bucket === "month" ? "XP per month" : "XP per week"} icon={BarChart3}
            rows={d.points.map((p) => ({ ...p, label: bucket === "week" ? `Week of ${p.label}` : p.label }))} columns={[["label", "Period"], ["value", "XP (net)"]]}
            summary={`${d.memberName ?? "Team"} XP per ${bucket}: ${d.points.map((p) => `${p.label} ${p.value}`).join(", ")}`}
            empty={d.memberName ? `${d.memberName} earned no XP in this period.` : "No XP was earned in this period."}>
            <SimpleBars data={d.points} unit="XP" color={theme.accent} />
          </ChartPanel>
        </>
      )}</Guard>
    </>
  );
}

// ── Well-being (aggregate only, no names) ───────────────────────────────────
export function WellbeingTab({ query, hasProject }) {
  const theme = useRoleTheme();
  const state = useReport("wellbeing", query);
  return (
    <Guard state={state} label="Loading well-being">{(d) => {
      const c = d.current;
      if (!c.members) return <EmptyState heading="Nobody is on this team yet." action={{ label: "Open Resources", to: "/manager/resources" }} />;
      return (
        <>
          <Panel title="The team today" icon={HeartPulse}>
            <div className="grid grid-cols-2 divide-ink/[0.05] md:grid-cols-4 md:divide-x">
              {CHART.tiers.map(([k, label, color]) => <StatCard key={k} label={label} value={c.tiers[k]} icon={HeartPulse} color={color} sub={`${Math.round((c.tiers[k] / c.members) * 100)}% of ${c.members} people`} />)}
              <StatCard label="Active streaks" value={c.activeStreaks} icon={Flame} color={theme.accent} sub={c.avgStreak != null ? `average ${c.avgStreak} days` : ""} />
            </div>
            <div className="border-t border-ink/[0.05] px-5 py-4">
              <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img"
                aria-label={CHART.tiers.map(([k, label]) => `${label} ${c.tiers[k]}`).join(", ")}>
                {CHART.tiers.map(([k, , color]) => c.tiers[k] > 0 && <span key={k} style={{ width: `${(c.tiers[k] / c.members) * 100}%`, background: color }} />)}
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                {CHART.tiers.map(([k, label, color]) => <li key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />{label}: {c.tiers[k]}</li>)}
              </ul>
            </div>
            <p className="border-t border-ink/[0.05] px-5 py-3 text-xs text-text-secondary">
              Counts only, from HP and daily streaks. To see who needs a lighter load, open Resources. {hasProject ? "Today's counts are for this project's team." : ""}
            </p>
          </Panel>
          <ChartPanel title="Trend" icon={BarChart3} rows={d.trend.map((t) => ({ ...t, value: t.Healthy + t.Tired + t.Low }))}
            columns={[["label", "Day"], ["Healthy", "Doing fine"], ["Tired", "Getting tired"], ["Low", "Needs a lighter load"]]}
            summary={`Team well-being per day: ${d.trend.map((t) => `${t.label}: ${t.Healthy} fine, ${t.Tired} tired, ${t.Low} need a lighter load`).join("; ")}`}
            empty="The trend starts today. One count is saved each night.">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.trend} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="label" tick={CHART.axis} tickLine={false} axisLine={CHART.axisLine} interval="preserveStartEnd" minTickGap={16} />
                <YAxis tick={CHART.axis} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(16,24,40,0.04)" }} contentStyle={CHART.tooltip} />
                {CHART.tiers.map(([k, label, color], i) => <Bar key={k} dataKey={k} name={label} stackId="t" fill={color} stroke="#fff" strokeWidth={1} maxBarSize={36} radius={i === 2 ? [4, 4, 0, 0] : 0} />)}
              </BarChart>
            </ResponsiveContainer>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 px-2 pt-1 text-xs text-text-secondary">
              {CHART.tiers.map(([k, label, color]) => <li key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />{label}</li>)}
            </ul>
          </ChartPanel>
          {hasProject && <p className="-mt-3 text-xs text-text-secondary">The trend covers the whole organisation.</p>}
        </>
      );
    }}</Guard>
  );
}

// ── Lessons learned ─────────────────────────────────────────────────────────
const FACTS = [["lateTasks", "Late tasks"], ["rejectedInReview", "Sent back from review"], ["overloadEvents", "Overload alerts"], ["anomalies", "Anomaly flags"], ["extensions", "Deadline extensions"]];

export function LessonsTab({ query, compact = false }) {
  const addToast = useUiStore((s) => s.addToast);
  const ai = useAiCall();
  const sp = new URLSearchParams(query);
  const state = useReport("lessons", query);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(null); // { id, text }
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { setDraft(""); setEditing(null); setError(null); }, [query]); // eslint-disable-line react-hooks/set-state-in-effect
  // FR08-08: the AI only fills the note box; the Manager edits and saves it as a normal note.
  async function aiDraft() {
    const r = await ai.run("post", `/api/manager/ai/reports/lessons?${query}`);
    if (r?.draft) { setEditing(null); setDraft((t) => (t.trim() ? `${t.trim()}\n${r.draft}` : r.draft)); setError(null); document.getElementById("lesson-new")?.focus(); }
  }

  async function save(e) {
    e.preventDefault();
    if ((editing ? editing.text : draft).trim().length < 3) { setError("Write at least a few words."); document.getElementById("lesson-new")?.focus(); return; }
    setBusy(true); setError(null);
    try {
      if (editing) await api.patch(`/api/manager/reports/lessons/${editing.id}`, { text: editing.text });
      else await api.post("/api/manager/reports/lessons", { project: sp.get("project"), sprint: sp.get("sprint") || undefined, text: draft });
      addToast({ type: "success", message: editing ? "Note saved." : "Note added." });
      setDraft(""); setEditing(null); await state.reload(true).catch(() => {});
    } catch (err) { setError(err?.data?.fields?.text ?? err?.message ?? "Could not save the note."); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { await api.delete(`/api/manager/reports/lessons/${removing.id}`); addToast({ type: "success", message: "Note deleted." }); setRemoving(null); await state.reload(true).catch(() => {}); }
    catch (err) { addToast({ type: "error", message: err?.message ?? "Could not delete the note." }); setRemoving(null); }
    finally { setBusy(false); }
  }

  return (
    <Guard state={state} label="Loading lessons learned">{(d) => (
      <div className={compact ? "flex flex-col gap-6" : "grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"}>
        <Panel title={d.sprint ? `Lessons from ${d.sprint.name}` : "Lessons learned"} icon={NotebookPen}>
          <form onSubmit={save} className="flex flex-col gap-2 border-b border-ink/[0.05] px-5 py-4">
            <label htmlFor="lesson-new" className="text-xs font-bold text-text-secondary">{editing ? "Edit note" : "Add a note"}</label>
            <textarea id="lesson-new" name="lesson" rows={3} maxLength={2000} value={editing ? editing.text : draft}
              onChange={(e) => (editing ? setEditing({ ...editing, text: e.target.value }) : setDraft(e.target.value))}
              placeholder="What worked, what to change next time…" aria-invalid={!!error} aria-describedby={error ? "lesson-err" : undefined}
              className="rounded-xl px-3 py-2 text-sm font-normal" />
            {error && <p id="lesson-err" role="alert" className="text-xs font-semibold text-[#B01F17]">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={BTN.primary} disabled={busy}>{busy ? "Saving…" : editing ? "Save note" : "Add note"}</button>
              {editing && <button type="button" className={BTN.ghost} onClick={() => { setEditing(null); setError(null); }}>Cancel</button>}
              {!editing && <button type="button" className={BTN.secondary} disabled={ai.status === "loading"} onClick={aiDraft}><Sparkles size={14} aria-hidden="true" />Generate lessons with AI</button>}
            </div>
            <AiStatus call={ai} loadingText="Drafting lessons from the facts…" />
            {ai.status === "done" && ai.data?.draft && (
              <p className="flex flex-wrap items-center gap-2 text-xs text-text-secondary"><AiTag />Draft in the box above. Edit it, then add it as a note.
                <AiFeedback feature="mgr_lessons" refId={`${query}:${ai.data.draft.length}`} snippet={ai.data.draft} /></p>
            )}
          </form>
          {d.notes.length === 0
            ? <p className="px-5 py-6 text-sm text-text-secondary">No notes yet. Start with the facts on the right, or write what the team learned.</p>
            : (
              <ul className="divide-y divide-ink/[0.05]">
                {d.notes.map((n) => (
                  <li key={n.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="whitespace-pre-wrap break-words text-sm text-text-primary">{n.text}</p>
                      <p className="mt-1 text-xs text-text-secondary">{n.kind === "auto" ? "Filled in when the project was archived · " : ""}{n.by ? `${n.by} · ` : ""}{fmt(n.updatedAt ?? n.createdAt)}{n.edited ? " · edited" : ""}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" className={BTN.icon} aria-label="Edit note" onClick={() => { setEditing({ id: n.id, text: n.text }); setError(null); document.getElementById("lesson-new")?.focus(); }}><Pencil size={15} aria-hidden="true" /></button>
                      <button type="button" className={BTN.icon} aria-label="Delete note" onClick={() => setRemoving(n)}><Trash2 size={15} aria-hidden="true" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </Panel>
        <Panel title="Auto facts" icon={ClipboardList}>
          <dl className="divide-y divide-ink/[0.05]">
            <div className="flex justify-between px-5 py-2.5 text-sm"><dt className="text-text-secondary">Tasks done</dt><dd className="font-bold tabular-nums text-text-primary">{d.facts.done} of {d.facts.tasks}</dd></div>
            {FACTS.map(([k, label]) => <div key={k} className="flex justify-between px-5 py-2.5 text-sm"><dt className="text-text-secondary">{label}</dt><dd className="font-bold tabular-nums text-text-primary">{d.facts[k]}</dd></div>)}
          </dl>
          <div className="border-t border-ink/[0.05] px-5 py-3">
            <p className="text-xs text-text-secondary">Counted from the {d.sprint ? "sprint's" : "project's"} records, for its whole life. No AI.</p>
            <button type="button" className={`${BTN.secondary} mt-2`} onClick={() => { setEditing(null); setDraft(d.factsText); document.getElementById("lesson-new")?.focus(); }}>Copy into a note</button>
          </div>
        </Panel>
        <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={remove} loading={busy} destructive confirmLabel="Delete note"
          title="Delete this note?" body="The note is removed from this report. The audit log keeps a copy." />
      </div>
    )}</Guard>
  );
}

