// Bug board (E-4, Employee UX §5.4, D-188, D-190). Tester: /workspace/bugs. Team Lead: /teamlead/bugs (not in the rail; reached from
// Requests and the notification) with `lead`. URL: ?view=board, ?project, ?status, ?severity, ?mine=1, ?bug (drawer), ?new=1&project=&task=.
// Board drops follow the allowed edges; a move that needs a note opens the bug instead. The server decides every move.
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bug as BugIcon } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import KanbanBoard from "@/components/widgets/KanbanBoard";
import { BUG_COLUMNS, BUG_CHIP, SEVERITY_CHIP, VALIDITY_LABEL, boardVerdict } from "@/utils/quality";
import useLoad from "../../manager/project/useLoad";
import { fmt } from "../../manager/project/format";
import BugDrawer from "./BugDetail";
import BugComposer from "./BugComposer";

const PAGE = 25;
function Card({ b, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(b.id)} className="flex w-full flex-col gap-1.5 rounded-xl border border-ink/[0.08] bg-bg-surface p-3 text-left text-sm shadow-[0_1px_2px_rgba(20,32,61,0.05)] hover:border-ink/20">
      <span className="font-semibold text-text-primary [overflow-wrap:anywhere]">{b.title}</span>
      <span className="flex flex-wrap items-center gap-1.5"><StatusChip status={SEVERITY_CHIP[b.severity]} label={b.severity} size="xs" />{b.validity !== "valid" && <span className="text-[11px] font-semibold text-text-secondary">{VALIDITY_LABEL[b.validity]}</span>}</span>
      <span className="truncate text-xs text-text-secondary" title={b.task ?? b.project}>{b.task ?? b.project}</span>
    </button>
  );
}

export default function BugsPage({ lead = false }) {
  const [sp, setSp] = useSearchParams();
  const addToast = useUiStore((s) => s.addToast);
  const view = sp.get("view") === "board" ? "board" : "list";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const qs = new URLSearchParams(["project", "severity", "mine"].filter((k) => sp.get(k)).map((k) => [k, sp.get(k)])).toString();
  const url = `/api/quality/bugs${qs ? `?${qs}` : ""}`;
  const { data, error, reload, setData } = useLoad(url);
  const [composerKey, setComposerKey] = useState(0);
  const openComposer = () => { setComposerKey((k) => k + 1); set({ new: "1" }, true); };
  const refresh = useCallback(() => { api.get(url).then(setData).catch(() => {}); }, [url, setData]);
  const set = (patch, push = false) => { const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k); } setSp(n, { replace: !push }); };
  const status = sp.get("status");
  const rows = useMemo(() => (data?.rows ?? []).filter((r) => !status || r.status === status), [data, status]);
  const open = sp.get("bug");
  const projectBugs = useMemo(() => { const b = (data?.rows ?? []).find((r) => r.id === open); return b ? data.rows.filter((r) => r.projectId === b.projectId) : []; }, [data, open]);

  const columns = [
    { key: "title", label: "Bug", render: (r) => <span className="flex min-w-0 flex-col"><span className="truncate font-semibold text-text-primary" title={r.title}>{r.title}</span><span className="truncate text-xs text-text-secondary" title={r.task ?? r.project}>{r.task ?? r.project}</span></span> },
    { key: "severity", label: "Severity", render: (r) => <StatusChip status={SEVERITY_CHIP[r.severity]} label={r.severity} size="xs" /> },
    { key: "status", label: "Status", render: (r) => <StatusChip status={BUG_CHIP[r.status]} label={r.status} size="xs" /> },
    { key: "validity", label: "Check", render: (r) => <span className="text-xs">{VALIDITY_LABEL[r.validity]}</span> },
    { key: "reporter", label: "Reported by", render: (r) => <span className="text-xs">{r.reporter} · {fmt(r.createdAt)}</span> },
  ];

  let content;
  if (error) content = <ErrorState message={error} onRetry={reload} />;
  else if (!data) content = <div aria-busy="true" aria-label="Loading bugs" className="flex flex-col gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>;
  else if (!data.rows.length) content = <Panel title="Bugs" icon={BugIcon}><EmptyState pose="cheer" heading={qs ? "No bugs match these filters" : "No bugs yet"} body={qs ? "Clear a filter to see more." : lead ? "Bugs your Testers report on your projects show here." : "When you find one, report it with clear steps."}
    action={qs ? { label: "Show all", to: "?" } : data.canReport ? { label: "Report a bug", onClick: openComposer } : undefined} /></Panel>;
  else if (view === "board") content = (
    <>
      <p className="text-xs text-text-secondary">Open → Fixed (the person on the task, with a note) → Verified (a Tester) → Closed (the Team Lead). A fix that does not hold goes back to Open.</p>
      <KanbanBoard columns={BUG_COLUMNS} tasks={rows} getId={(r) => r.id} renderCard={(b) => <Card b={b} onOpen={(id) => set({ bug: id }, true)} />}
        canDrag={(b) => b.status !== "Closed"} decide={(b, to) => boardVerdict(b, to)}
        onMove={async (b, to, action) => { if (action === "note") { set({ bug: b.id }, true); return; } await api.post(`/api/quality/bugs/${b.id}/move`, { to }); refresh(); }}
        onRefuse={(reason) => addToast({ type: "error", message: reason })} />
    </>
  );
  else content = (
    <DataTable label="Bugs" columns={columns} rows={rows.slice((page - 1) * PAGE, page * PAGE)} rowKey={(r) => r.id} page={page} total={rows.length} pageSize={PAGE}
      onPage={(n) => set({ page: n > 1 ? String(n) : null })} onRowClick={(r) => set({ bug: r.id }, true)}
      empty={<EmptyState heading="No bugs with this status" body="Pick another status or clear the filter." action={{ label: "Show all", to: "?" }} />} />
  );

  return (
    <Page>
      <PageHeader title={lead ? "Bugs on your projects" : "Bug board"} subtitle={lead ? "Check new bugs (valid, not a bug, duplicate) and close verified ones." : "Report, follow and verify bugs on your projects."}
        primary={data?.canReport ? { label: "Report a bug", onClick: openComposer } : undefined}>
        <div role="radiogroup" aria-label="View" className="flex rounded-xl border border-ink/[0.08] bg-ink/[0.03] p-0.5">
          {[["list", "List"], ["board", "Board"]].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={view === k} onClick={() => set({ view: k === "list" ? null : k })}
            className={`min-h-8 rounded-[10px] px-3 text-xs font-bold transition-colors ${view === k ? "bg-bg-surface text-accent-text shadow-[0_1px_2px_rgba(20,32,61,0.08)]" : "text-text-secondary hover:text-text-primary"}`}>{l}</button>)}
        </div>
      </PageHeader>
      {data?.rows.length > 0 && (
        <div className="flex flex-col gap-2">
          {view === "list" && <FilterChips label="Status" param="status" options={BUG_COLUMNS.map((c) => ({ value: c.key, label: `${c.label} (${data.counts[c.key] ?? 0})` }))} />}
          <FilterChips label="Severity" param="severity" options={["Critical", "High", "Medium", "Low"].map((s) => ({ value: s, label: s }))} />
          {data.projects.length > 1 && <FilterChips label="Project" param="project" options={data.projects.map((p) => ({ value: p.id, label: p.title }))} />}
          {!lead && <FilterChips label="Only" param="mine" options={[{ value: "1", label: "Reported by me" }]} />}
        </div>
      )}
      {content}
      <BugDrawer id={open} title="Bug" onClose={() => set({ bug: null })} onChanged={refresh} bugsOfProject={projectBugs} />
      {data?.canReport && <BugComposer key={composerKey} open={sp.get("new") === "1"} projects={data.projects} preset={{ projectId: sp.get("project") ?? undefined, taskId: sp.get("task") ?? undefined }}
        onClose={() => set({ new: null, task: null })} onSent={(id) => { addToast({ type: "success", message: "Bug reported. Your Team Lead checks it next." }); set({ new: null, task: null, bug: id }); refresh(); }} />}
    </Page>
  );
}
