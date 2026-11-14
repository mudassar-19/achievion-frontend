// "Your results" on Today (Batch 4, N12; UC-16): completion and quality per week for the last 8 weeks from
// GET /api/workspace/analytics (no AI), then MomentumCoach's summary and recommendations from /ai/analytics-summary.
// The charts never wait for the AI: with the AI off or busy they stay, and one line says so. Quality = the Team Lead's
// review score; the AI score is never shown here (D-075).
import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { BarChart3, RefreshCw } from "lucide-react";
import { aiGet } from "./employeeAi";
import useAuthStore from "@/stores/authStore";
import Panel from "@/components/ui/Panel";
import Skeleton from "@/components/ui/Skeleton";
import { AiTag } from "@/components/ui/AiParts";
import { aiError } from "@/components/ui/aiCall";
import { fmtShort } from "../manager/project/format";
import useLoad from "../manager/project/useLoad";

const WORDS = {
  developer: { done: "Tasks shipped", none: "Ship your first task and the charts fill in." },
  designer: { done: "Designs approved", none: "Get your first design approved and the charts fill in." },
  tester: { done: "Checks finished", none: "Finish your first task and the charts fill in." },
};
const AXIS = { fontSize: 11, fill: "#5B6576" };
const TIP = { borderRadius: 12, border: "1px solid rgba(16,24,40,0.08)", fontSize: 12 };
const show = (v, unit = "") => (v === null || v === undefined ? "—" : `${v}${unit}`);

function Chart({ title, note, label, empty, children }) {
  return (
    <figure className="min-w-0">
      <figcaption className="px-2 text-sm font-bold text-text-primary">{title}<span className="block text-xs font-normal text-text-secondary">{note}</span></figcaption>
      {empty ? <p className="flex h-[180px] items-center justify-center px-4 text-center text-sm text-text-secondary">{empty}</p>
        : <div className="mt-2 h-[180px]" role="img" aria-label={label}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>}
    </figure>
  );
}

function Summary() {
  const isViewAs = useAuthStore((s) => !!s.viewAs);
  const [state, setState] = useState({ status: "loading" });
  async function load(refresh) {
    setState({ status: "loading" });
    try { setState({ status: "done", d: await aiGet(`/api/workspace/ai/analytics-summary${refresh ? "?refresh=1" : ""}`) }); }
    catch (e) { setState(aiError(e)); }
  }
  useEffect(() => { if (!isViewAs) load(false); }, [isViewAs]); // eslint-disable-line react-hooks/set-state-in-effect
  if (isViewAs) return null;
  return (
    <div className="border-t border-ink/[0.05] px-5 py-4 text-sm">
      <h3 className="flex flex-wrap items-center gap-2 font-black text-text-primary">Summary and recommendations{state.status === "done" && state.d.aiGenerated && <AiTag />}</h3>
      {state.status === "loading" ? <div aria-busy="true" aria-label="Writing your summary" className="mt-2 flex flex-col gap-2"><Skeleton className="h-4 w-full rounded" /><Skeleton className="h-4 w-2/3 rounded" /></div>
        : state.status !== "done" ? <p role={state.status === "error" ? "alert" : "status"} className="mt-1.5 text-text-secondary">{state.status === "off" ? "The AI summary is off because AI is not configured. Your charts above are complete without it." : state.message}{state.status === "error" && <button type="button" className="ml-2 font-bold text-accent-text underline underline-offset-2" onClick={() => load(false)}>Retry</button>}</p>
        : (<>
          <p className="mt-1.5 max-w-[72ch] text-text-primary [overflow-wrap:anywhere]">{state.d.summary}</p>
          {state.d.recommendations.length > 0 && <ul className="mt-2 flex max-w-[72ch] list-disc flex-col gap-1 pl-5 text-text-secondary marker:text-accent-text">{state.d.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-text-secondary">
            <span>{state.d.aiGenerated ? "A suggestion from MomentumCoach, built from the numbers above. You decide what to do with it." : state.d.note ?? "Written from the numbers above."}</span>
            {state.d.aiGenerated && <button type="button" className="inline-flex min-h-8 items-center gap-1 font-bold text-accent-text underline underline-offset-2" onClick={() => load(true)}><RefreshCw size={11} aria-hidden="true" />Write again</button>}
          </p>
        </>)}
    </div>
  );
}

export default function EmployeeAnalytics({ kind = "developer", accent }) {
  const { data: d, error } = useLoad("/api/workspace/analytics");
  const w = WORDS[kind] ?? WORDS.developer;
  if (error) return <Panel title="Your results" icon={BarChart3}><p role="alert" className="px-5 py-4 text-sm text-text-secondary">Your results could not be loaded. The rest of Today is unaffected.</p></Panel>;
  if (!d) return <Skeleton className="h-80 rounded-2xl" />;
  const t = d.totals, weeks = d.weeks.map((x) => ({ ...x, label: fmtShort(`${x.weekStart}T12:00:00`) }));
  const facts = [[w.done, `${t.done} of ${t.total}`], ["Completion", show(t.completionPct, "%")], ["On time", show(t.onTimePct, "%")], ["Review score", t.avgQuality === null ? "—" : `${t.avgQuality} / 100`]];
  return (
    <Panel title="Your results" icon={BarChart3}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-ink/[0.05] px-5 py-4 sm:grid-cols-4">
        {facts.map(([k, v]) => <div key={k} className="min-w-0"><dt className="truncate text-xs text-text-secondary">{k}</dt><dd className="text-lg font-black tabular-nums text-text-primary">{v}</dd></div>)}
      </dl>
      <div className="grid gap-x-4 gap-y-6 px-3 py-4 md:grid-cols-2">
        <Chart title="Completion rate" note="Finished share of the tasks due each week" empty={weeks.some((x) => x.due) ? null : t.total ? "No task had a deadline in the last 8 weeks." : w.none}
          label={`Completion rate per week for the last 8 weeks: ${weeks.map((x) => `${x.label} ${show(x.completionPct, "%")}`).join(", ")}`}>
          <BarChart data={weeks} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(16,24,40,0.06)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "rgba(16,24,40,0.12)" }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={AXIS} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} />
            <Tooltip cursor={{ fill: "rgba(16,24,40,0.04)" }} contentStyle={TIP} formatter={(v, _n, p) => [`${v}% (${p.payload.done} of ${p.payload.due})`, "Finished"]} />
            <Bar dataKey="completionPct" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </Chart>
        <Chart title="Quality score" note="Average Team Lead review score each week, out of 100" empty={weeks.some((x) => x.quality !== null) ? null : t.reviewed ? "No task was reviewed in the last 8 weeks." : "Your first reviewed task shows here."}
          label={`Average review score per week for the last 8 weeks: ${weeks.map((x) => `${x.label} ${show(x.quality)}`).join(", ")}`}>
          <LineChart data={weeks} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(16,24,40,0.06)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "rgba(16,24,40,0.12)" }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={AXIS} tickLine={false} axisLine={false} width={40} />
            <Tooltip contentStyle={TIP} formatter={(v) => [`${v} / 100`, "Review score"]} />
            <Line type="monotone" dataKey="quality" stroke={accent} strokeWidth={2} dot={{ r: 3, fill: accent }} connectNulls isAnimationActive={false} />
          </LineChart>
        </Chart>
      </div>
      <Summary />
    </Panel>
  );
}
