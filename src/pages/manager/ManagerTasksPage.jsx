// Manager Tasks (QA4 M-28, D-QA4-1): ONE read-only list of the tasks in the Manager's projects. Replaces the employee Kanban.
// Filters live in the URL (?filter=overdue|due-today|due-week, project, assignee, status, module). Dashboard cards link here with a preset.
// The Manager cannot change a task: the Team Lead does. Row click opens the read-only task drawer.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import api from "@/lib/api";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import useUrlList from "@/components/ui/useUrlList";
import { TaskDrawer } from "./project/ProjectTabs";
import { fmt } from "./project/format";
import { matchesPreset } from "@/lib/taskFilters";

const PRESETS = [
  { value: "overdue", label: "Overdue" },
  { value: "due-today", label: "Due today" },
  { value: "due-week", label: "Due this week" },
];
const STATUS = ["Backlog", "To-Do", "In-Progress", "In-Review", "Done"].map((s) => ({ value: s, label: s.replace("-", " ") }));
const PAGE = 25;

const people = (t) => [...new Map([...(t.assignees ?? []), ...(t.assignee ? [t.assignee] : [])].map((a) => [String(a.id), a.name])).values()];

export default function ManagerTasksPage() {
  const [sp, setSp] = useSearchParams();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const statuses = useUrlList("tstatus");
  const preset = sp.get("filter") ?? "";
  const project = sp.get("project") ?? "";
  const who = sp.get("assignee") ?? "";
  const mod = sp.get("module") ?? "";
  const open = sp.get("task");
  const page = Math.max(1, Number(sp.get("page")) || 1);

  async function load() {
    setError(null); setRows(null);
    try {
      const list = [];
      for (let p = 1; p <= 10; p++) {
        const r = await api.get(`/api/manager/projects/list?page=${p}`);
        list.push(...(r.items ?? []));
        if (list.length >= (r.total ?? 0) || !(r.items ?? []).length) break;
      }
      const live = list.filter((p) => p.status !== "Archived");
      const per = await Promise.all(live.map(async (p) => {
        const [tasks, mods] = await Promise.all([
          api.get(`/api/manager/projects/${p.id}/tasks`),
          api.get(`/api/manager/projects/${p.id}/modules`).catch(() => ({ modules: [] })),
        ]);
        const name = new Map((mods.modules ?? []).map((m) => [String(m.id), m.title]));
        return tasks.map((t) => ({ ...t, projectId: String(p.id), projectName: p.title, moduleName: name.get(String(t.milestoneId)) ?? "" }));
      }));
      setRows(per.flat());
    } catch (e) { setError(e?.message ?? "Tasks could not be loaded."); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const set = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== "task") n.delete("page"); setSp(n, { replace: true }); };

  const opts = useMemo(() => {
    const proj = new Map(), pe = new Map(), mo = new Set();
    for (const t of rows ?? []) {
      proj.set(t.projectId, t.projectName);
      for (const a of [...(t.assignees ?? []), ...(t.assignee ? [t.assignee] : [])]) pe.set(String(a.id), a.name);
      if (t.moduleName) mo.add(t.moduleName);
    }
    const sorted = (m) => [...m].sort((a, b) => a[1].localeCompare(b[1]));
    return { proj: sorted(proj), pe: sorted(pe), mo: [...mo].sort() };
  }, [rows]);

  const shown = useMemo(() => (rows ?? []).filter((t) =>
    matchesPreset(t, preset)
    && (!statuses.length || statuses.includes(t.status))
    && (!project || t.projectId === project)
    && (!mod || t.moduleName === mod)
    && (!who || [...(t.assignees ?? []), ...(t.assignee ? [t.assignee] : [])].some((a) => String(a.id) === who))
  ).sort((a, b) => (a.deadline ? new Date(a.deadline) : Infinity) - (b.deadline ? new Date(b.deadline) : Infinity)), [rows, preset, statuses, project, who, mod]);

  const counts = useMemo(() => Object.fromEntries(PRESETS.map((p) => [p.value, (rows ?? []).filter((t) => matchesPreset(t, p.value)).length])), [rows]);
  const filtered = !!(preset || statuses.length || project || who || mod);
  const clear = () => setSp(new URLSearchParams(), { replace: true });

  const columns = [
    { key: "title", label: "Task", className: "min-w-[220px]", render: (t) => <span className="font-bold text-text-primary">{t.title}</span> },
    { key: "project", label: "Project", render: (t) => t.projectName },
    { key: "module", label: "Module", render: (t) => t.moduleName || "—" },
    { key: "status", label: "Status", render: (t) => <span className="whitespace-nowrap text-xs font-bold text-text-secondary">{t.status.replace("-", " ")}</span> },
    { key: "assignee", label: "Assignee", render: (t) => people(t).join(", ") || "Unassigned" },
    { key: "deadline", label: "Due", className: "whitespace-nowrap", render: (t) => fmt(t.deadline) },
  ];

  return (
    <Page>
      <PageHeader title="Tasks" subtitle="Every task in your projects. Read-only: the Team Lead creates, assigns and reviews them." />
      <div className="flex flex-col gap-3">
        <FilterChips label="Show" param="filter" allLabel="All"
          options={PRESETS.map((p) => ({ ...p, label: rows ? `${p.label} (${counts[p.value]})` : p.label }))} />
        <FilterChips label="Status" param="tstatus" options={STATUS} multi />
        <div className="flex flex-wrap items-center gap-4">
          {[["Project", "project", project, opts.proj.map(([v, l]) => [v, l]), "All projects"],
            ["Assignee", "assignee", who, opts.pe, "Everyone"],
            ["Module", "module", mod, opts.mo.map((m) => [m, m]), "All modules"]].map(([label, key, val, list, all]) => (
            <div key={key} className="flex items-center gap-2 text-xs font-bold text-text-secondary">{label}
              <Select className="w-48 font-normal" label={label} value={val} onChange={(v) => set(key, v)} placeholder={all}
                options={[{ value: "", label: all }, ...list.map(([v, l]) => ({ value: v, label: l }))]} />
            </div>
          ))}
          {filtered && <button type="button" onClick={clear} className="text-xs font-bold text-accent-text underline">Clear filters</button>}
        </div>
        <DataTable label="Tasks" columns={columns} rows={shown.slice((page - 1) * PAGE, page * PAGE)} loading={!rows && !error} error={error} onRetry={load}
          page={page} total={shown.length} pageSize={PAGE} onPage={(n) => set("page", n > 1 ? String(n) : "")}
          onRowClick={(t) => set("task", t.id)} rowActions={(t) => [{ label: "Open task", icon: ExternalLink, onClick: () => set("task", t.id) }]}
          empty={filtered
            ? <EmptyState heading="No tasks match these filters." action={{ label: "Clear filters", onClick: clear }} />
            : <EmptyState heading="No tasks yet." action={{ label: "Open projects", to: "/manager/projects" }} />} />
      </div>
      <TaskDrawer taskId={open} onClose={() => set("task", "")} />
    </Page>
  );
}
