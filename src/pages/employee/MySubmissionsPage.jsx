// My submissions (E-3, Employee UX §4.5, D-181). Tabs Waiting | Needs revision | Approved and a project filter, both in the URL.
// Score, stars and feedback only after the Team Lead's review; never an AI score (D-075). A row opens the task drawer on
// Submission & review. Data: GET /api/workspace/submissions.
import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { FileCheck2 } from "lucide-react";
import api from "@/lib/api";
import socket from "@/utils/socket";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import useLoad from "../manager/project/useLoad";
import { fmtDateTime } from "../manager/project/format";
import EmployeeTaskDrawer, { Stars } from "./EmployeeTaskDrawer";

const PAGE = 25;
const TABS = [["waiting", "Waiting"], ["revision", "Needs revision"], ["approved", "Approved"]];
const CHIP = { waiting: ["pending", "Waiting for review"], revision: ["at_risk", "Revision requested"], approved: ["approved", "Approved"] };
const EMPTY = {
  waiting: ["Nothing is waiting for review", "When you submit a task, it waits here until your Team Lead reviews it."],
  revision: ["Nothing to fix", "Tasks sent back with feedback show here, with what to change."],
  approved: ["No approved work yet", "Approved tasks show here with your score and feedback."],
};

export default function MySubmissionsPage() {
  const [sp, setSp] = useSearchParams();
  const tab = TABS.some(([k]) => k === sp.get("tab")) ? sp.get("tab") : "waiting";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const { data, error, reload, setData } = useLoad("/api/workspace/submissions");
  const refresh = useCallback(() => { api.get("/api/workspace/submissions").then(setData).catch(() => {}); }, [setData]);
  useEffect(() => { socket.on("task:status_changed", refresh); return () => socket.off("task:status_changed", refresh); }, [refresh]);
  const set = (patch) => { const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k); } setSp(n, { replace: !("task" in patch) }); };

  const projects = useMemo(() => [...new Set((data?.rows ?? []).map((r) => r.project).filter(Boolean))].sort(), [data]);
  const project = sp.get("project");
  const rows = useMemo(() => (data?.rows ?? []).filter((r) => r.tab === tab && (!project || r.project === project)), [data, tab, project]);

  const columns = [
    { key: "title", label: "Task", render: (r) => <span className="flex min-w-0 flex-col"><span className="truncate font-semibold text-text-primary" title={r.title}>{r.title}</span>{r.project && <span className="truncate text-xs text-text-secondary" title={r.project}>{r.project}</span>}</span> },
    { key: "submittedAt", label: "Sent", render: (r) => <span className="whitespace-nowrap tabular-nums">{fmtDateTime(r.submittedAt)}</span> },
    { key: "revision", label: "Revision", render: (r) => <span className="tabular-nums">{r.revision ? `#${r.revision + 1}` : "First"}</span> },
    { key: "decision", label: "Decision", render: (r) => <StatusChip status={CHIP[r.tab][0]} label={CHIP[r.tab][1]} size="xs" /> },
    { key: "score", label: "Score", render: (r) => (r.score != null ? <span className="flex items-center gap-1.5 tabular-nums"><strong>{r.score}</strong>{r.stars != null && <Stars n={r.stars} />}</span> : <span className="text-text-secondary">—</span>) },
    { key: "feedback", label: tab === "revision" ? "What to change" : "Feedback", render: (r) => {
      const text = tab === "revision" ? [r.reason, r.unmet.length ? `Not met: ${r.unmet.join("; ")}` : ""].filter(Boolean).join(" ") : r.feedback;
      return text ? <span className="line-clamp-2 max-w-[42ch] text-text-secondary [overflow-wrap:anywhere]" title={text}>{text}</span> : <span className="text-text-secondary">—</span>;
    } },
  ];

  let content;
  if (error) content = <ErrorState message={error} onRetry={reload} />;
  else if (!data) content = <div aria-busy="true" aria-label="Loading your submissions" className="flex flex-col gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>;
  else if (!data.rows.length) content = <Panel title="My submissions" icon={FileCheck2}><EmptyState heading="You have not submitted anything yet" body="Open a task in progress and press Submit work." action={{ label: "Open My tasks", to: "/workspace/tasks?status=In-Progress" }} /></Panel>;
  else content = (
    <DataTable label={`Submissions: ${TABS.find(([k]) => k === tab)[1]}`} columns={columns} rows={rows.slice((page - 1) * PAGE, page * PAGE)} rowKey={(r) => r.id} page={page} total={rows.length} pageSize={PAGE}
      onPage={(n) => set({ page: n > 1 ? String(n) : null })} onRowClick={(r) => set({ task: r.id })}
      empty={<EmptyState heading={EMPTY[tab][0]} body={project ? "Clear the project filter to see more." : EMPTY[tab][1]} action={project ? { label: "Show all projects", to: `?tab=${tab}` } : { label: "Open My tasks", to: "/workspace/tasks" }} />} />
  );

  return (
    <Page>
      <PageHeader title="My submissions" subtitle="What you sent for review and what came back. Scores and feedback appear once your Team Lead has reviewed." />
      {data?.rows.length > 0 && (
        <div className="flex flex-col gap-3">
          <div role="tablist" aria-label="Submissions" className="flex flex-wrap gap-1 border-b border-border-subtle">
            {TABS.map(([k, l]) => (
              <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => set({ tab: k === "waiting" ? null : k, page: null })}
                className={`min-h-10 border-b-2 px-3 text-sm font-bold transition-colors ${tab === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
                {l} <span className="tabular-nums">({data.counts[k]})</span>
              </button>
            ))}
          </div>
          {projects.length > 1 && <FilterChips label="Project" param="project" options={projects.map((p) => ({ value: p, label: p }))} />}
        </div>
      )}
      {content}
      <EmployeeTaskDrawer taskId={sp.get("task")} initialTab="review" onClose={() => set({ task: null, compose: null })} onOpenTask={(id) => set({ task: id })} onChanged={refresh}
        compose={sp.get("compose") === "1"} onComposeChange={(on) => set({ compose: on ? "1" : null })} />
    </Page>
  );
}
