// Resources → Workload (UX §7). Replaces Workforce + Availability + Team Overview with one table.
// Numbers come from the workload engine (D-072); filters live in the URL; ?member=<id> opens the drawer.
import { useSearchParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import useUrlList from "@/components/ui/useUrlList";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";
import LoadBar from "./LoadBar";
import { STATUS_KEY } from "./tone";

const ROLES = [["developer", "Developers"], ["designer", "Designers"], ["tester", "Testers"], ["team_lead", "Team Leads"]].map(([value, label]) => ({ value, label }));
const PAGE = 25;

// roleOptions / emptyAction: the Team Lead's Team page passes its own (no Team Leads chip, its own empty action).
export default function WorkloadTab({ data, error, reload, roleOptions = ROLES, emptyAction = { label: "Open projects", to: "/manager/projects" } }) {
  const [sp, setSp] = useSearchParams();
  const projects = useUrlList("project"), roles = useUrlList("role");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const set = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };

  const rows = (data?.members ?? []).filter((m) => (!projects.length || m.projectIds.some((p) => projects.includes(p)))
    && (!roles.length || roles.includes(m.roleCategory)));
  const over = (data?.members ?? []).filter((m) => m.status === "Overloaded").length;

  const columns = [
    { key: "name", label: "Member", className: "min-w-[180px]", render: (m) => <span className="font-bold text-text-primary">{m.name}</span> },
    { key: "role", label: "Role", className: "whitespace-nowrap text-text-secondary", render: (m) => m.role },
    { key: "active", label: "Active tasks", className: "tabular-nums", render: (m) => m.activeTasks },
    { key: "due", label: "Due this week", className: "tabular-nums", render: (m) => m.dueThisWeek },
    { key: "load", label: "Utilisation", render: (m) => <LoadBar pct={m.barPct} label={m.label} tone={m.tone} /> },
    { key: "status", label: "Status", render: (m) => <StatusChip status={STATUS_KEY[m.status]} label={m.status} size="xs" /> },
  ];

  return (
    <>
      {data && over > 0 && (
        <p role="status" className="flex items-center gap-2 text-sm text-[#B01F17]">
          <AlertTriangle size={15} aria-hidden="true" />
          {over} {over === 1 ? "person is" : "people are"} above your limit of {data.threshold.pct}%. Open a row to reassign work.
        </p>
      )}
      <div className="flex flex-col gap-3">
        <FilterChips label="Role" param="role" options={roleOptions} multi />
        {(data?.projects?.length ?? 0) > 0 && <FilterChips label="Project" param="project" options={data.projects.map((p) => ({ value: String(p.id), label: p.title }))} multi />}
      </div>
      <DataTable label="Workload" columns={columns} rows={rows.slice((page - 1) * PAGE, page * PAGE)} loading={!data && !error} error={error} onRetry={reload}
        page={page} total={rows.length} pageSize={PAGE} onPage={(n) => set("page", n > 1 ? String(n) : null)}
        onRowClick={(m) => set("member", String(m.id))}
        empty={projects.length || roles.length
          ? <EmptyState heading="Nobody matches these filters." action={{ label: "Clear filters", onClick: () => setSp({}, { replace: true }) }} />
          : <EmptyState heading="No team members yet." action={emptyAction} />} />
      {data && <p className="text-xs text-text-secondary">Utilisation = planned hours per day ÷ {data.workTime.hoursPerDay} working hours. Amber above 85%, red above 100%. Your limit for "Overloaded": {data.threshold.pct}%{data.threshold.override == null ? " (Director default)" : ""}.</p>}
    </>
  );
}
