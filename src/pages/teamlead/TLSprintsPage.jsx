// Team Lead Sprints (V2 Phase 4 · T-1, T-5, D-143, D-121): sprints of the TL's projects, New sprint drawer.
// Status chips in the URL; 25 per page.
import { useNavigate, useSearchParams } from "react-router-dom";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import useUrlList from "@/components/ui/useUrlList";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";
import SprintDrawer from "../manager/sprint/SprintDrawer";
import useUiStore from "@/stores/uiStore";
import useLoad from "../manager/project/useLoad";
import { fmt } from "../manager/project/format";

const STATES = ["Active", "Planned", "Closed"].map((v) => ({ value: v, label: v }));
const CHIP = { Active: "active", Planned: "planned", Closed: "completed" };
const PAGE = 25;

export default function TLSprintsPage() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const states = useUrlList("status");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const addToast = useUiStore((s) => s.addToast);
  const creating = sp.get("new") === "1";
  const closeCreate = () => { const n = new URLSearchParams(sp); n.delete("new"); setSp(n, { replace: true }); };
  const openCreate = () => { const n = new URLSearchParams(sp); n.set("new", "1"); setSp(n, { replace: true }); };
  const { data, error, reload } = useLoad("/api/teamlead/sprints");
  const rows = (data?.sprints ?? []).filter((s) => !states.length || states.includes(s.status));
  const columns = [
    { key: "name", label: "Sprint", className: "min-w-[180px]", render: (s) => <span title={s.name} className="block max-w-[320px] truncate font-bold text-text-primary">{s.name}</span> },
    { key: "project", label: "Project", className: "text-text-secondary", render: (s) => <span title={s.project.title} className="block max-w-[280px] truncate">{s.project.title}</span> },
    { key: "status", label: "Status", render: (s) => <StatusChip status={CHIP[s.status]} label={s.status} size="xs" /> },
    { key: "dates", label: "Dates", className: "whitespace-nowrap tabular-nums", render: (s) => `${fmt(s.startDate)} – ${fmt(s.endDate)}` },
    { key: "done", label: "Done", className: "whitespace-nowrap tabular-nums", render: (s) => `${s.done} / ${s.total}` },
  ];
  return (
    <Page>
      <PageHeader title="Sprints" subtitle="Plan, start and close the sprints of your projects." primary={{ label: "New sprint", onClick: openCreate }} />
      <FilterChips label="Status" param="status" options={STATES} multi />
      <DataTable label="Sprints" columns={columns} rows={rows.slice((page - 1) * PAGE, page * PAGE)} loading={!data && !error} error={error} onRetry={reload}
        page={page} total={rows.length} pageSize={PAGE}
        onPage={(n) => { const q = new URLSearchParams(sp); if (n > 1) q.set("page", String(n)); else q.delete("page"); setSp(q, { replace: true }); }}
        onRowClick={(s) => navigate(`/teamlead/sprints/${s.id}`)}
        empty={states.length
          ? <EmptyState heading="No sprints with this status." action={{ label: "Show all", onClick: () => setSp({}, { replace: true }) }} />
          : <EmptyState heading="No sprints in your projects yet." action={{ label: "New sprint", onClick: openCreate }} />} />
      <SprintDrawer base="/api/teamlead" open={creating} onClose={closeCreate} projects={data?.projects ?? []}
        onSaved={(id, overlaps) => { addToast({ type: overlaps.length ? "info" : "success", message: overlaps.length ? `Sprint saved. Its dates overlap ${overlaps.join(", ")}.` : "Sprint saved." }); navigate(`/teamlead/sprints/${id}`); }} />
    </Page>
  );
}
