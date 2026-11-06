// My tasks (E-2, Employee UX §4.2, D-175). URL state: ?view=list|board|sprint, ?status, ?type, ?priority, ?sprint (id | none),
// ?blocked=1, ?page, ?task (drawer). Board: forward moves only, Done is never draggable (the server refuses it too).
// Live: "task:status_changed" (sent to the task's people, S-3) refreshes in place.
import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Lock, Timer } from "lucide-react";
import api from "@/lib/api";
import socket from "@/utils/socket";
import useAuthStore from "@/stores/authStore";
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
import { moveVerdict, SUBMIT } from "@/utils/boardRules";
import { filterMyTasks } from "@/utils/employeePortal";
import useLoad from "../manager/project/useLoad";
import { fmt } from "../manager/project/format";
import EmployeeTaskDrawer from "./EmployeeTaskDrawer";
import { STATUS_CHIP, statusLabel } from "@/utils/employeePortal";

const PAGE = 25;
const COLUMNS = [
  { key: "To-Do", label: "To do", color: "#4F5B75" }, { key: "In-Progress", label: "In progress", color: "#1948BD" },
  { key: "In-Review", label: "In review", color: "#7A5200" }, { key: "Done", label: "Done", color: "#0E6A30" },
];
const overdue = (r) => r.deadline && r.status !== "Done" && new Date(r.deadline) < new Date();

export function Deadline({ r }) {
  if (!r.deadline) return <span className="text-text-secondary">No deadline</span>;
  return <span className={`tabular-nums ${overdue(r) ? "font-bold text-[#B01F17]" : ""}`}>{fmt(r.deadline)}{overdue(r) ? " · late" : ""}</span>;
}
const Blocked = () => <span className="inline-flex items-center gap-1 rounded-full border border-[#8A6200]/30 bg-[#FFC21A]/10 px-2 py-0.5 text-[11px] font-semibold text-[#5C3D00]"><Lock size={11} aria-hidden="true" />Blocked</span>;
const Revision = () => <span className="rounded-full border border-[#B01F17]/30 bg-[#B01F17]/[0.06] px-2 py-0.5 text-[11px] font-semibold text-[#B01F17]">Revision</span>;

function Card({ r, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(r.id)} className="flex w-full flex-col gap-1.5 rounded-xl border border-ink/[0.08] bg-bg-surface p-3 text-left text-sm shadow-[0_1px_2px_rgba(20,32,61,0.05)] hover:border-ink/20">
      <span className="font-semibold text-text-primary [overflow-wrap:anywhere]">{r.title}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
        <span>{r.priority}</span>·<Deadline r={r} />·<span className="tabular-nums">{r.xp} XP</span>
      </span>
      {(r.blocked || r.revision) && <span className="flex flex-wrap gap-1">{r.blocked && <Blocked />}{r.revision && <Revision />}</span>}
    </button>
  );
}

function SprintView({ data, rows, onOpen }) {
  const groups = [...data.sprints.map((s) => ({ ...s, rows: rows.filter((r) => r.sprint?.id === s.id) })), { id: "none", name: "Not in a sprint", rows: rows.filter((r) => !r.sprint) }].filter((g) => g.rows.length);
  if (!groups.length) return <EmptyState heading="No tasks match these filters" body="Clear a filter to see more." action={{ label: "Show all", to: "?view=sprint" }} />;
  return groups.map((g) => {
    const done = g.rows.filter((r) => r.status === "Done").length, pct = Math.round((done / g.rows.length) * 100);
    return (
      <Panel key={g.id} title={g.name} icon={Timer}>
        <div className="flex flex-col gap-3 px-5 py-4">
          {g.id !== "none" && (
            <div>
              <p className="flex flex-wrap justify-between gap-2 text-xs text-text-secondary"><span>{g.project ?? ""}{g.startDate ? ` · ${fmt(g.startDate)} → ${fmt(g.endDate)}` : ""} · {g.status === "Planning" ? "Planned" : g.status}</span><span className="tabular-nums">{done} of {g.rows.length} of your tasks done</span></p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.08]" role="progressbar" aria-label={`${g.name}: your progress`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div>
            </div>
          )}
          <ul className="grid gap-2 md:grid-cols-2">{g.rows.map((r) => <li key={r.id} className="min-w-0"><Card r={r} onOpen={onOpen} /></li>)}</ul>
        </div>
      </Panel>
    );
  });
}

export default function MyTasksPage() {
  const [sp, setSp] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const addToast = useUiStore((s) => s.addToast);
  const view = ["board", "sprint"].includes(sp.get("view")) ? sp.get("view") : "list";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const taskId = sp.get("task");
  const { data, error, reload, setData } = useLoad("/api/workspace/tasks");

  const refresh = useCallback(() => { api.get("/api/workspace/tasks").then(setData).catch(() => {}); }, [setData]);
  useEffect(() => { socket.on("task:status_changed", refresh); return () => socket.off("task:status_changed", refresh); }, [refresh]);

  const set = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: k !== "task" }); };
  const rows = useMemo(() => (data ? filterMyTasks(data.rows, sp) : []), [data, sp]);
  const types = useMemo(() => [...new Set((data?.rows ?? []).map((r) => r.type))].sort(), [data]);
  const openTask = (id) => set("task", id);
  const closeTask = () => { const n = new URLSearchParams(sp); n.delete("task"); n.delete("compose"); setSp(n); };
  const compose = (id, on) => { const n = new URLSearchParams(sp); n.set("task", id); if (on) n.set("compose", "1"); else n.delete("compose"); setSp(n); };

  const filtered = ["status", "type", "priority", "sprint", "blocked"].some((k) => sp.get(k));
  const columns = [
    { key: "title", label: "Task", render: (r) => <span className="flex min-w-0 flex-col"><span className="truncate font-semibold text-text-primary" title={r.title}>{r.title}</span>{r.project && <span className="truncate text-xs text-text-secondary" title={r.project}>{r.project}</span>}</span> },
    { key: "type", label: "Type", render: (r) => <span className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[11px] font-semibold">{r.type}</span> },
    { key: "priority", label: "Priority" },
    { key: "deadline", label: "Deadline", render: (r) => <Deadline r={r} /> },
    { key: "xp", label: "XP", render: (r) => <span className="tabular-nums">{r.xp}</span> },
    { key: "status", label: "Status", render: (r) => <span className="flex flex-wrap items-center gap-1"><StatusChip status={STATUS_CHIP[r.status]} label={statusLabel(r.status)} size="xs" />{r.blocked && <Blocked />}{r.revision && <Revision />}</span> },
  ];

  let content;
  if (error) content = <ErrorState message={error} onRetry={reload} />;
  else if (!data) content = <div aria-busy="true" aria-label="Loading your tasks" className="flex flex-col gap-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>;
  else if (!data.rows.length) content = <Panel title="My tasks" icon={Timer}><EmptyState heading="No tasks yet" body="Your Team Lead assigns them; check Quests meanwhile." action={{ label: "Open Quests", to: "/workspace/quests" }} /></Panel>;
  else if (view === "board") content = (
    <>
      <p className="text-xs text-text-secondary">Drag forward: To do → In progress → In review (opens Submit work). Done comes only when your Team Lead approves.</p>
      <KanbanBoard columns={[...(rows.some((r) => r.status === "Backlog") ? [{ key: "Backlog", label: "Backlog", color: "#4F5B75" }] : []), ...COLUMNS]} tasks={rows} getId={(r) => r.id}
        renderCard={(r) => <Card r={r} onOpen={openTask} />}
        canDrag={(r) => r.status !== "Done" && r.status !== "Backlog"}
        decide={(r, to) => moveVerdict({ role: user?.role, roleCategory: user?.roleCategory, task: r, to, isAssignee: true })}
        onMove={async (r, to, action) => { if (action === SUBMIT) { compose(r.id, true); return; } await api.patch(`/api/tasks/${r.id}/status`, { status: to }); refresh(); }}
        onRefuse={(reason) => addToast({ type: "error", message: reason })} />
    </>
  );
  else if (view === "sprint") content = <SprintView data={data} rows={rows} onOpen={openTask} />;
  else content = (
    <DataTable label="My tasks" columns={columns} rows={rows.slice((page - 1) * PAGE, page * PAGE)} rowKey={(r) => r.id} page={page} total={rows.length} pageSize={PAGE}
      onPage={(n) => set("page", n > 1 ? String(n) : null)} onRowClick={(r) => openTask(r.id)}
      empty={<EmptyState heading="No tasks match these filters" body="Clear a filter to see more." action={{ label: "Show all", to: "?" }} />} />
  );

  return (
    <Page>
      <PageHeader title="My tasks" subtitle="Everything assigned to you. Open a task to start it, log time, talk to your Team Lead or see its review.">
        <div role="radiogroup" aria-label="View" className="flex rounded-xl border border-ink/[0.08] bg-ink/[0.03] p-0.5">
          {[["list", "List"], ["board", "Board"], ["sprint", "Sprint"]].map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={view === k} onClick={() => set("view", k === "list" ? null : k)}
              className={`min-h-8 rounded-[10px] px-3 text-xs font-bold transition-colors ${view === k ? "bg-bg-surface text-accent-text shadow-[0_1px_2px_rgba(20,32,61,0.08)]" : "text-text-secondary hover:text-text-primary"}`}>{l}</button>
          ))}
        </div>
      </PageHeader>
      {data?.rows.length > 0 && (
        <div className="flex flex-col gap-2">
          <FilterChips label="Status" param="status" options={["To-Do", "In-Progress", "In-Review", "Done"].map((s) => ({ value: s, label: statusLabel(s) }))} />
          <FilterChips label="Priority" param="priority" options={["Critical", "High", "Medium", "Low"].map((p) => ({ value: p, label: p }))} />
          {types.length > 1 && <FilterChips label="Type" param="type" options={types.map((t) => ({ value: t, label: t }))} />}
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="mt-sprint" className="flex min-w-0 items-center gap-2 text-xs font-bold text-text-secondary">Sprint
              <select id="mt-sprint" value={sp.get("sprint") ?? ""} onChange={(e) => set("sprint", e.target.value || null)} className="h-8 min-w-0 max-w-[260px] truncate rounded-xl border border-ink/[0.08] bg-bg-surface px-2 text-xs font-semibold text-text-primary">
                <option value="">Any sprint</option>
                {data.sprints.map((s) => <option key={s.id} value={s.id}>{s.name}{s.project ? ` · ${s.project}` : ""}</option>)}
                <option value="none">Not in a sprint</option>
              </select></label>
            <FilterChips label="Only" param="blocked" options={[{ value: "1", label: "Blocked" }]} />
            {filtered && <span className="text-xs text-text-secondary" aria-live="polite">{rows.length} of {data.rows.length} tasks</span>}
          </div>
        </div>
      )}
      {content}
      <EmployeeTaskDrawer taskId={taskId} onClose={closeTask} onOpenTask={openTask} onChanged={refresh}
        compose={sp.get("compose") === "1"} onComposeChange={(on) => compose(taskId, on)} />
    </Page>
  );
}
