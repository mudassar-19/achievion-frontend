// Manager Sprints list (V2 Phase 3 · M-3, UX §6). All projects, server-paged (25); filters in the URL.
// ?new=1 (optionally &project=<id>) opens the create drawer (Dashboard "New sprint", project Sprints tab).
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ExternalLink, Pencil } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";
import SprintDrawer from "./sprint/SprintDrawer";
import { fmt } from "./project/format";

const STATUS = ["Planned", "Active", "Closed"].map((s) => ({ value: s, label: s }));

export default function ManagerSprintsPage() {
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const [sp, setSp] = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const creating = sp.get("new") === "1";

  const status = sp.get("status") ?? "", project = sp.get("project") ?? "";
  const load = useCallback(async () => {
    setError(null); setData(null);
    const q = new URLSearchParams({ page: String(page) });
    if (status) q.set("status", status);
    if (project) q.set("project", project);
    try { setData(await api.get(`/api/manager/sprints?${q}`)); }
    catch (e) { setError(e?.message ?? "Sprints could not be loaded."); }
  }, [page, status, project]);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  const closeCreate = () => { const n = new URLSearchParams(sp); n.delete("new"); setSp(n, { replace: true }); };
  function saved(id, overlaps) {
    addToast({ type: overlaps.length ? "info" : "success", message: overlaps.length ? `Sprint saved. Its dates overlap ${overlaps.join(", ")}.` : "Sprint saved." });
    if (editing) { setEditing(null); load(); } else navigate(`/manager/sprints/${id}`);
  }

  const filtered = Boolean(status || project);
  const columns = [
    { key: "name", label: "Sprint", className: "min-w-[200px]", render: (s) => <span className="font-bold text-text-primary">{s.name}</span> },
    { key: "project", label: "Project", className: "min-w-[160px]", render: (s) => <span className="text-text-secondary">{s.projectTitle}</span> },
    { key: "status", label: "Status", render: (s) => <StatusChip status={s.status} size="xs" /> },
    { key: "dates", label: "Dates", className: "whitespace-nowrap tabular-nums", render: (s) => `${fmt(s.startDate)} – ${fmt(s.endDate)}` },
    { key: "tasks", label: "Tasks done", className: "whitespace-nowrap tabular-nums", render: (s) => `${s.done} / ${s.total}` },
    { key: "velocity", label: "Velocity", className: "whitespace-nowrap tabular-nums", render: (s) => `${s.velocity} XP` },
  ];

  return (
    <Page>
      <PageHeader title="Sprints" subtitle="Plan, run and close sprints across your projects."
        primary={{ label: "New sprint", onClick: () => { const n = new URLSearchParams(sp); n.set("new", "1"); setSp(n, { replace: true }); } }} />

      <div className="flex flex-col gap-3">
        <FilterChips label="Status" param="status" options={STATUS} multi />
        {(data?.projects?.length ?? 0) > 1 && <FilterChips label="Project" param="project" options={data.projects.map((p) => ({ value: p.id, label: p.title }))} multi />}
      </div>

      <DataTable label="Sprints" columns={columns} rows={data?.items ?? []} loading={!data && !error} error={error} onRetry={load}
        page={page} total={data?.total ?? 0} pageSize={data?.pageSize ?? 25} onPage={(n) => { const q = new URLSearchParams(sp); if (n > 1) q.set("page", String(n)); else q.delete("page"); setSp(q, { replace: true }); }}
        onRowClick={(s) => navigate(`/manager/sprints/${s.id}`)}
        rowActions={(s) => [
          { label: "Open", icon: ExternalLink, onClick: () => navigate(`/manager/sprints/${s.id}`) },
          ...(s.status === "Closed" ? [] : [{ label: "Edit", icon: Pencil, onClick: () => setEditing({ ...s, project: { id: s.projectId, title: s.projectTitle } }) }]),
        ]}
        empty={filtered
          ? <EmptyState heading="No sprints match these filters." action={{ label: "Clear filters", onClick: () => setSp({}, { replace: true }) }} />
          : <EmptyState heading="No sprints yet." action={{ label: "New sprint", onClick: () => setSp({ new: "1" }, { replace: true }) }} />} />

      <SprintDrawer open={creating || !!editing} onClose={() => (editing ? setEditing(null) : closeCreate())} sprint={editing}
        projects={data?.projects ?? []} projectId={sp.get("project")?.split(",").length === 1 ? sp.get("project") : ""} onSaved={saved} />
    </Page>
  );
}
