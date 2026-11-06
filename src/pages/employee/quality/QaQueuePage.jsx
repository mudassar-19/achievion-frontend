// QA queue for Testers (E-4, Employee UX §5.1, D-189): QA tasks on the Tester's projects. Tabs Waiting | Signed off | Failed and a
// project filter in the URL. A row opens the QA page. Your own tasks are marked: someone else signs those off.
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import useLoad from "../../manager/project/useLoad";
import { fmtDateTime } from "../../manager/project/format";

const TABS = [["waiting", "Waiting"], ["signed", "Signed off"], ["failed", "Failed"]];
const EMPTY = { waiting: ["Nothing waits for QA", "When a task that needs QA is submitted, it shows here."], signed: ["Nothing signed off yet", "Tasks you or another Tester passed show here."], failed: ["No failed tasks", "Tasks that failed QA show here until they are submitted again."] };

export default function QaQueuePage() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const tab = TABS.some(([k]) => k === sp.get("tab")) ? sp.get("tab") : "waiting";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const qs = new URLSearchParams([["tab", tab], ...(sp.get("project") ? [["project", sp.get("project")]] : [])]).toString();
  const { data, error, reload } = useLoad(`/api/quality/qa?${qs}`);
  const set = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); n.delete("page"); setSp(n, { replace: true }); };

  const columns = [
    { key: "title", label: "Task", render: (r) => <span className="flex min-w-0 flex-col"><span className="truncate font-semibold text-text-primary" title={r.title}>{r.title}</span><span className="truncate text-xs text-text-secondary" title={r.project}>{r.project}</span></span> },
    { key: "builtBy", label: "Built by", render: (r) => <span className="text-sm">{r.builtBy || "—"}{r.yours && <span className="ml-1 rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-[11px] font-semibold">You</span>}</span> },
    { key: "priority", label: "Priority" },
    { key: "readySince", label: tab === "waiting" ? "Waiting since" : "Signed", render: (r) => <span className="whitespace-nowrap tabular-nums">{fmtDateTime(tab === "waiting" ? r.readySince : r.signedAt)}</span> },
  ];

  let content;
  if (error) content = <ErrorState message={error} onRetry={reload} />;
  else if (!data) content = <div aria-busy="true" aria-label="Loading the QA queue" className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>;
  else if (!data.rows.length) content = <Panel title={TABS.find(([k]) => k === tab)[1]} icon={ClipboardCheck}><EmptyState pose="cheer" heading={EMPTY[tab][0]} body={EMPTY[tab][1]} action={{ label: "Open the bug board", to: "/workspace/bugs" }} /></Panel>;
  else content = <DataTable label="QA queue" columns={columns} rows={data.rows.slice((page - 1) * 25, page * 25)} rowKey={(r) => r.id} page={page} total={data.rows.length} pageSize={25}
    onPage={(n) => { const x = new URLSearchParams(sp); if (n > 1) x.set("page", String(n)); else x.delete("page"); setSp(x, { replace: true }); }} onRowClick={(r) => navigate(`/workspace/qa/${r.id}`)} />;

  return (
    <Page>
      <PageHeader title="QA queue" subtitle="Inspect and verify: tasks on your projects that need a QA sign-off before the Team Lead can approve them." />
      <div className="flex flex-col gap-3">
        <div role="tablist" aria-label="QA queue" className="flex flex-wrap gap-1 border-b border-border-subtle">
          {TABS.map(([k, l]) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => set("tab", k === "waiting" ? null : k)}
              className={`min-h-10 border-b-2 px-3 text-sm font-bold transition-colors ${tab === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
              {l}{data ? <span className="tabular-nums"> ({data.counts[k]})</span> : null}
            </button>
          ))}
        </div>
        {data?.projects.length > 1 && <FilterChips label="Project" param="project" options={data.projects.map((p) => ({ value: p.id, label: p.title }))} />}
      </div>
      {content}
    </Page>
  );
}
