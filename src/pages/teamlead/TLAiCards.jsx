// Team Lead AI hints (T-6, D-150..D-152). Each one only fills a selection or shows words; nothing is saved by the AI (FR08-06).
import { Sparkles } from "lucide-react";
import { AiStatus, AiTag, AiFeedback } from "@/components/ui/AiParts";
import { useAiCall } from "@/components/ui/aiCall";
import { BTN } from "@/components/ui/buttons";

const BASE = "/api/teamlead";
const STATUS = `${BASE}/ai/status`;
const hours = (n) => `${Math.round((n ?? 0) * 10) / 10} h`;
const Box = ({ label, children }) => <section aria-label={label} aria-live="polite" className="flex min-w-0 flex-col gap-2 rounded-xl border border-accent/15 bg-accent/[0.03] p-3 text-sm">{children}</section>;

// Task form Assign. The T-2 "Suggest assignee (most room)" button next to it needs no AI and stays available.
export function AssignHint({ projectId, type, title, hours: h, onApply, picked }) {
  const call = useAiCall();
  const d = call.data;
  return (
    <Box label="AI assign suggestion">
      {call.status !== "done" && call.status !== "loading" && (
        <button type="button" className={`${BTN.secondary} self-start`} onClick={() => call.runIfOn(STATUS, "post", `${BASE}/ai/assign-hint`, { projectId, type, title, hours: h })}><Sparkles size={14} aria-hidden="true" />Suggest with AI</button>
      )}
      <AiStatus call={call} loadingText="Comparing the team's load…" />
      {call.status === "done" && d && (
        <>
          <p className="break-words text-text-primary"><span className="font-bold">AI suggests {d.name}.</span> {d.reason}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={BTN.secondary} disabled={picked === String(d.candidateId)} onClick={() => onApply(String(d.candidateId))}>{picked === String(d.candidateId) ? "Selected" : "Select this person"}</button>
            <button type="button" className={BTN.ghost} onClick={call.reset}>Dismiss</button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary"><AiTag /><AiFeedback feature="tl_assign_hint" refId={`${projectId}:${d.candidateId}`} snippet={d.reason} base={BASE} /></div>
        </>
      )}
    </Box>
  );
}

// Sprint planning: Apply marks the tasks; the Team Lead moves them with a separate click.
export function TLScopeCard({ sprint, onApply }) {
  const call = useAiCall();
  const d = call.data;
  const list = (rows, label) => rows.length > 0 && (
    <div><p className="text-xs font-bold text-text-secondary">{label}</p>
      <ul className="mt-1 flex flex-col gap-0.5">{rows.map((t) => <li key={t.id} className="flex min-w-0 justify-between gap-3"><span title={t.title} className="min-w-0 truncate text-text-primary">{t.title}</span><span className="shrink-0 tabular-nums text-text-secondary">{hours(t.hours)}</span></li>)}</ul></div>
  );
  return (
    <section aria-label="AI scope suggestion" aria-live="polite" className="flex flex-col gap-3 rounded-2xl border border-accent/15 bg-accent/[0.03] px-5 py-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-text-primary"><Sparkles size={14} aria-hidden="true" className="text-accent-text" />Scope that fits the capacity</h2>
        {call.status !== "loading" && <button type="button" className={BTN.secondary} onClick={() => call.runIfOn(STATUS, "post", `${BASE}/ai/sprints/${sprint.id}/scope`)}>{d ? "Suggest again" : "Suggest with AI"}</button>}
      </div>
      <AiStatus call={call} loadingText="Comparing the backlog with the team's hours…" />
      {call.status === "idle" && <p className="text-xs text-text-secondary">The AI picks tasks so the plan fits {hours(sprint.capacity.hours)} of team capacity. It only marks them; you move them.</p>}
      {call.status === "done" && d && (
        <>
          <p className="break-words text-text-primary">{d.why}</p>
          {list(d.add, "Add from the backlog")}{list(d.remove, "Take out of the sprint")}
          <p className="text-xs tabular-nums text-text-secondary">Planned after the change: {hours(d.hoursAfter)} of {hours(d.capacity)}.</p>
          <div className="flex flex-wrap items-center gap-2">
            {d.add.length + d.remove.length > 0 ? <button type="button" className={BTN.primary} onClick={() => onApply(d)}>Mark these tasks</button> : <span className="text-text-secondary">No change needed.</span>}
            <button type="button" className={BTN.ghost} onClick={() => { call.reset(); onApply(null); }}>Dismiss</button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary"><AiTag /><AiFeedback feature="tl_sprint_scope" refId={`${sprint.id}:${[...d.add, ...d.remove].map((t) => t.id).join(",")}`.slice(0, 200)} snippet={d.why} base={BASE} /></div>
        </>
      )}
    </section>
  );
}

// Breakdown realism panel: the engine's numbers in words.
export function RealismExplain({ projectId, moduleId, rows }) {
  const call = useAiCall();
  const d = call.data;
  return (
    <Box label="AI explanation of the realism check">
      {call.status !== "loading" && <button type="button" className={`${BTN.secondary} self-start`} onClick={() => call.runIfOn(STATUS, "post", `${BASE}/ai/realism-explain`, { projectId, moduleId: moduleId || undefined, rows })}><Sparkles size={14} aria-hidden="true" />{d ? "Explain again" : "Explain"}</button>}
      <AiStatus call={call} loadingText="Putting the numbers into words…" />
      {call.status === "done" && d && (
        <>
          <p className="break-words text-text-primary">{d.explanation}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary"><AiTag /><AiFeedback feature="tl_realism_explain" refId={`${projectId}:${moduleId ?? ""}:${d.explanation.length}`} snippet={d.explanation} base={BASE} /></div>
        </>
      )}
    </Box>
  );
}
