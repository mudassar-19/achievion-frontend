// Team Lead Modules (was "Projects"; V2 Phase 4 · T-1, UX TL §3, D-115). Modules the Manager assigned to the TL,
// plus projects the TL works on without a module. State chips in the URL; 25 per page.
import { useNavigate, useSearchParams } from "react-router-dom";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import useUrlList from "@/components/ui/useUrlList";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";
import useLoad from "../manager/project/useLoad";
import { fmt } from "../manager/project/format";

const STATES = ["New", "In progress", "Completed"].map((v) => ({ value: v, label: v }));
const CHIP = { New: "pending", "In progress": "maintenance", Completed: "completed" };
const PAGE = 25;
const moduleLink = (m) => `/teamlead/modules/${m.projectId}${m.kind === "module" ? `?module=${m.id}` : ""}`;

export default function TLModulesPage() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const states = useUrlList("state");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const { data, error, reload } = useLoad("/api/teamlead/modules");
  const rows = (data?.modules ?? []).filter((m) => !states.length || states.includes(m.state));

  const columns = [
    { key: "title", label: "Module", className: "min-w-[220px]", render: (m) => (
      <span className="flex flex-col"><span className="font-bold text-text-primary">{m.title}</span>{m.kind === "project" && <span className="text-xs text-text-secondary">Whole project</span>}</span>) },
    { key: "project", label: "Project", className: "text-text-secondary", render: (m) => (m.kind === "module" ? m.project : "—") },
    { key: "deadline", label: "Deadline", className: "whitespace-nowrap tabular-nums", render: (m) => (m.deadline ? fmt(m.deadline) : "No deadline") },
    { key: "progress", label: "Progress", className: "min-w-[140px]", render: (m) => (
      <span className="flex items-center gap-2"><span className="h-1.5 w-20 overflow-hidden rounded-full bg-ink/[0.07]" aria-hidden="true"><span className="block h-full rounded-full bg-accent" style={{ width: `${m.progress}%` }} /></span><span className="text-xs tabular-nums text-text-secondary">{m.progress}%</span></span>) },
    { key: "manager", label: "Manager", className: "whitespace-nowrap text-text-secondary", render: (m) => m.manager ?? "—" },
    { key: "state", label: "State", render: (m) => <StatusChip status={CHIP[m.state]} label={m.state} size="xs" /> },
  ];

  return (
    <Page>
      <PageHeader title="Modules" subtitle="The work your Manager gave you. Open one to see its brief, tasks and team." />
      <FilterChips label="State" param="state" options={STATES} multi />
      <DataTable label="Modules" rowKey={(m) => m.key} columns={columns} rows={rows.slice((page - 1) * PAGE, page * PAGE)} loading={!data && !error} error={error} onRetry={reload}
        page={page} total={rows.length} pageSize={PAGE}
        onPage={(n) => { const q = new URLSearchParams(sp); if (n > 1) q.set("page", String(n)); else q.delete("page"); setSp(q, { replace: true }); }}
        onRowClick={(m) => navigate(moduleLink(m))}
        empty={states.length
          ? <EmptyState heading="No modules in this state." action={{ label: "Show all", onClick: () => setSp({}, { replace: true }) }} />
          : <EmptyState heading="No modules assigned yet. Your Manager assigns modules." action={{ label: "Open tasks", to: "/teamlead/tasks" }} />} />
    </Page>
  );
}
