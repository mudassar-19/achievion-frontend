// Manager Projects list (V2 Phase 3 · M-2, UX §5.1). Server-paged (25), filters + search + sort live in the URL.
import { fmt as dFull } from "@/pages/manager/project/format";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Archive, ArchiveRestore, ExternalLink, Search, X, Trash2 } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import StatusChip from "@/components/ui/StatusChip";
import HealthBadge from "@/components/ui/HealthBadge";
import Panel from "@/components/ui/Panel";
import { BTN } from "@/components/ui/buttons";

const STATUS = ["Planning", "Active", "On Hold", "Delayed", "In Review", "Completed"].map((s) => ({ value: s, label: s }));
const PRIORITY = ["Critical", "High", "Medium", "Low"].map((p) => ({ value: p, label: p }));
const PRI_COLOR = { Critical: "#B01F17", High: "#9A3A06", Medium: "#7A4B00", Low: "#3A4659" };
const DRAFT_KEY = "achievion_project_drafts";
const readDrafts = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "[]"); } catch { return []; } };
const writeDrafts = (list) => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(list)); } catch { /* storage blocked */ } };
const fmt = dFull;

export default function ManagerProjectsPage() {
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const [sp, setSp] = useSearchParams();
  const archived = sp.get("archived") === "1";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const sort = { key: sp.get("sort") ?? "deadline", dir: sp.get("dir") === "desc" ? "desc" : "asc" };
  const [search, setSearch] = useState(sp.get("q") ?? "");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState(readDrafts);

  const setParam = useCallback((changes) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(changes)) (v === null || v === "" ? next.delete(k) : next.set(k, v));
    setSp(next, { replace: true });
  }, [sp, setSp]);

  // Debounced search → URL
  useEffect(() => {
    const t = setTimeout(() => { if ((sp.get("q") ?? "") !== search.trim()) setParam({ q: search.trim(), page: null }); }, 300);
    return () => clearTimeout(t);
  }, [search, sp, setParam]);

  const query = sp.toString();
  const load = useCallback(async () => {
    setError(null); setData(null);
    const p = new URLSearchParams(query);
    const params = new URLSearchParams({ page: String(page), sort: sort.key, dir: sort.dir });
    if (p.get("q")) params.set("search", p.get("q"));
    if (p.get("status")) params.set("status", p.get("status"));
    if (p.get("priority")) params.set("priority", p.get("priority"));
    if (archived) params.set("archived", "1");
    try { setData(await api.get(`/api/manager/projects/list?${params}`)); }
    catch (e) { setError(e?.message ?? "Projects could not be loaded."); }
  }, [query, page, sort.key, sort.dir, archived]);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  async function setArchivedState(row, action) {
    try {
      await api.post(`/api/manager/projects/${row.id}/${action}`);
      setData((d) => ({ ...d, items: d.items.filter((x) => x.id !== row.id), total: d.total - 1 }));
      const undo = action === "archive" ? "restore" : "archive";
      addToast({ type: "info", message: action === "archive" ? `"${row.title}" archived.` : `"${row.title}" restored.`, undoAction: async () => {
        try { await api.post(`/api/manager/projects/${row.id}/${undo}`); load(); }
        catch (e) { addToast({ type: "error", message: e?.message ?? "Could not undo." }); }
      } });
    } catch (e) { addToast({ type: "error", message: e?.message ?? "Could not update the project." }); }
  }

  function deleteDraft(id) {
    const all = readDrafts(); writeDrafts(all.filter((d) => d.id !== id)); setDrafts(readDrafts());
    addToast({ type: "info", message: "Draft deleted.", undoAction: () => { writeDrafts(all); setDrafts(all); } });
  }

  const filtered = Boolean(sp.get("q") || sp.get("status") || sp.get("priority"));
  const columns = [
    { key: "title", label: "Name", sortable: true, className: "min-w-[220px]", render: (r) => (
      <span className="flex min-w-0 max-w-[420px] items-center gap-2">
        <span className="min-w-0 truncate font-bold text-text-primary" title={r.title}>{r.title}</span>
        {r.needsSetup && <span className="shrink-0 rounded-md border border-[#F2A60D]/50 bg-[#FFF0D2] px-1.5 py-0.5 text-[11px] font-bold text-[#7A4B00]">Needs setup</span>}
      </span>
    ) },
    { key: "priority", label: "Priority", render: (r) => <span className="text-xs font-bold" style={{ color: PRI_COLOR[r.priority] }}>{r.priority}</span> },
    { key: "status", label: "Status", sortable: true, render: (r) => <StatusChip status={r.status} size="xs" /> },
    { key: "progress", label: "Progress", render: (r) => (
      <span className="flex items-center gap-2 whitespace-nowrap">
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/[0.07]" aria-hidden="true"><span className="block h-full rounded-full bg-accent" style={{ width: `${r.progressPct}%` }} /></span>
        <span className="text-xs tabular-nums text-text-secondary">{r.progressPct}%</span>
      </span>
    ) },
    { key: "health", label: "Health", render: (r) => <HealthBadge score={r.healthScore} band={r.healthBand} /> },
    { key: "team", label: "Team", className: "tabular-nums", render: (r) => r.teamSize },
    { key: "deadline", label: "Due", sortable: true, className: "whitespace-nowrap tabular-nums", render: (r) => fmt(r.deadline) },
    { key: "lead", label: "Team Lead", className: "whitespace-nowrap", render: (r) => r.teamLeads.length ? r.teamLeads.join(", ") : <span className="text-xs font-semibold text-[#9A3A06]">None yet</span> },
  ];

  return (
    <Page>
      <PageHeader title="Projects" subtitle="Every project you run: status, health, team and due date."
        primary={{ label: "New project", onClick: () => navigate("/manager/projects/create") }} />

      {drafts.length > 0 && !archived && (
        <Panel title={`Unfinished drafts (${drafts.length})`} icon={Archive}>
          <ul className="divide-y divide-ink/[0.05] px-5 py-1">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate text-sm font-semibold text-text-primary">{d.title || "Untitled project"}</span>
                <span className="flex shrink-0 items-center gap-1">
                  <button type="button" className={BTN.secondary} onClick={() => navigate(`/manager/projects/create?draft=${d.id}`)}>Continue</button>
                  <button type="button" className={BTN.icon} aria-label={`Delete draft ${d.title || ""}`} onClick={() => deleteDraft(d.id)}><Trash2 size={15} aria-hidden="true" /></button>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="search" name="project-search" autoComplete="off" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…" aria-label="Search projects" className="h-9 w-full rounded-xl pl-9 pr-8 text-sm" />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-text-primary"><X size={13} aria-hidden="true" /></button>}
          </div>
          <div role="tablist" aria-label="Which projects" className="inline-flex rounded-xl border border-ink/[0.08] bg-ink/[0.03] p-0.5">
            {[["Open", false], ["Archived", true]].map(([l, v]) => (
              <button key={l} role="tab" type="button" aria-selected={archived === v} onClick={() => setParam({ archived: v ? "1" : null, page: null, status: null })}
                className={`h-8 rounded-lg px-3 text-xs font-bold transition-colors ${archived === v ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}>{l}</button>
            ))}
          </div>
        </div>
        {!archived && <FilterChips label="Status" param="status" options={STATUS} multi />}
        <FilterChips label="Priority" param="priority" options={PRIORITY} multi />
      </div>

      <DataTable label="Projects" columns={columns} rows={data?.items ?? []} loading={!data && !error} error={error} onRetry={load}
        sort={sort} onSort={(key) => setParam({ sort: key, dir: sort.key === key && sort.dir === "asc" ? "desc" : "asc", page: null })}
        page={page} total={data?.total ?? 0} pageSize={data?.pageSize ?? 25} onPage={(n) => setParam({ page: n > 1 ? String(n) : null })}
        onRowClick={(r) => navigate(`/manager/projects/${r.id}`)}
        rowActions={(r) => [
          { label: "Open", icon: ExternalLink, onClick: () => navigate(`/manager/projects/${r.id}`) },
          archived ? { label: "Restore", icon: ArchiveRestore, onClick: () => setArchivedState(r, "restore") }
                   : { label: "Archive", icon: Archive, onClick: () => setArchivedState(r, "archive") },
        ]}
        empty={filtered
          ? <EmptyState heading="No projects match these filters." action={{ label: "Clear filters", onClick: () => { setSearch(""); setParam({ q: null, status: null, priority: null, page: null }); } }} />
          : archived
            ? <EmptyState heading="No archived projects." action={{ label: "Show open projects", onClick: () => setParam({ archived: null }) }} />
            : <EmptyState heading="No projects yet." action={{ label: "New project", to: "/manager/projects/create" }} />} />
    </Page>
  );
}
