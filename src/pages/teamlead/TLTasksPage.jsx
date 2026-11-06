// Team Lead Tasks (V2 Phase 4 · T-1 + T-2, UX TL v4 §6, D-114, D-123..D-125): one page, List | Board.
// URL state: ?view=board, ?tab, ?status, ?assignee, ?module, ?overdue=1, ?tag, ?blocked=1, ?sprint, ?q, ?page, ?task, ?new=1.
// List = server-paged DataTable with row selection + bulk actions. Board = shared Kanban (whole team or one sprint);
// a drop on Done is refused here and on the server. Saved filters (max 10) store the filter part of the URL.
// Socket "task:status_changed" reloads both views. New task / task detail = the T-2 drawers.
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Users, Lock, Trash2 } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import useAuthStore from "@/stores/authStore";
import socket from "@/utils/socket";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import { BTN } from "@/components/ui/buttons";
import KanbanBoard from "@/components/widgets/KanbanBoard";
import { moveVerdict } from "@/utils/boardRules";
import { fmt } from "../manager/project/format";
import TaskFormDrawer from "./task/TaskFormDrawer";
import TaskDetailDrawer from "./task/TaskDetailDrawer";

const TABS = [["all", "All"], ["created", "Created by me"], ["review", "Pending review"], ["done", "Completed"]];
const STATUSES = ["Backlog", "To-Do", "In-Progress", "In-Review", "Done"];
const CHIP = { Backlog: "on_hold", "To-Do": "planned", "In-Progress": "maintenance", "In-Review": "pending", Done: "completed" };
const COLUMNS = STATUSES.map((k) => ({ key: k, label: k.replace("-", " "), color: "var(--text-secondary)" }));
const PRIORITY = { Critical: "#B01F17", High: "#9A3A06", Medium: "#7A5200", Low: "var(--text-secondary)" };
const KEEP = ["module", "q", "sprint"]; // filters shared by both views
const FILTER_KEYS = ["tab", "status", "assignee", "module", "overdue", "q", "tag", "blocked", "sprint", "view"];
const BULK = [["assign", "Assign to"], ["priority", "Set priority"], ["tag", "Add tag"], ["deadline", "Set deadline"], ["sprint", "Add to sprint"]];

function Card({ task, saving, onOpen }) {
  const who = task.assignee?.name ?? task.assignees?.[0]?.name;
  const over = task.deadline && task.status !== "Done" && new Date(task.deadline) < new Date();
  return (
    <div className="flex select-none flex-col gap-2 rounded-xl border border-ink/[0.08] bg-bg-surface p-3" style={{ opacity: saving ? 0.6 : 1 }}>
      <span className="flex items-center justify-between text-xs font-bold"><span style={{ color: PRIORITY[task.priority] }}>{task.priority}</span><span className="font-normal text-text-secondary">{task.type}</span></span>
      <p className="text-sm font-semibold leading-tight text-text-primary">{task.title}</p>
      <span className="flex items-center gap-2 text-xs text-text-secondary">
        {who && <span className="flex min-w-0 items-center gap-1"><Users size={11} aria-hidden="true" className="shrink-0" /><span className="truncate">{who}</span></span>}
        {task.deadline && task.status !== "Done" && <span className="ml-auto shrink-0 font-semibold tabular-nums" style={{ color: over ? "#B01F17" : undefined }}>{over ? "Overdue" : `due ${fmt(task.deadline)}`}</span>}
        {over && <AlertTriangle size={11} aria-hidden="true" className="text-[#B01F17]" />}
      </span>
      {task.status === "In-Review" && <span className="rounded-lg border border-accent/25 bg-accent/[0.06] py-1 text-center text-xs font-semibold text-accent-text">Waiting for your review</span>}
      {onOpen && <button type="button" onClick={() => onOpen(task.id)} onKeyDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
        aria-label={`Details of ${task.title}`} className="min-h-8 self-start rounded-lg px-2 text-xs font-bold text-accent-text underline-offset-2 hover:bg-ink/[0.04] hover:underline">Details</button>}
    </div>
  );
}

function Board({ module, q, sprint, onOpen }) {
  const user = useAuthStore((s) => s.user);
  const [tasks, setTasks] = useState(null);
  const [only, setOnly] = useState(null); // task ids of the chosen sprint
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      const [all, sp] = await Promise.all([api.get("/api/teamlead/tasks?tab=all"), sprint ? api.get(`/api/teamlead/sprints/${sprint}`) : null]);
      setTasks(all.tasks ?? []); setOnly(sp ? new Set(sp.tasks.map((t) => String(t.id))) : null);
    } catch (e) { setError(e?.message ?? "The board could not be loaded."); }
  }, [sprint]);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { socket.on("task:status_changed", load); return () => socket.off("task:status_changed", load); }, [load]);
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!tasks) return <div aria-busy="true" aria-label="Loading board" className="grid gap-3 md:grid-cols-5">{STATUSES.map((s) => <Skeleton key={s} className="h-64 rounded-2xl" />)}</div>;
  const shown = tasks.filter((t) => (!module || String(t.projectId) === module) && (!only || only.has(String(t.id))) && (!q || t.title.toLowerCase().includes(q.toLowerCase())));
  if (!tasks.length) return <EmptyState heading="No tasks yet." action={{ label: "New task", to: "/teamlead/tasks?view=board&new=1" }} />;
  return (
    <>
      <p className="text-xs text-text-secondary">{sprint ? "Sprint board: only this sprint's tasks. " : ""}Drag to plan Backlog, To Do and In Progress. Tasks reach Done only when you approve them on the review screen. Showing up to 200 tasks.</p>
      <KanbanBoard columns={COLUMNS} tasks={shown} getId={(t) => String(t.id)}
        renderCard={(t, { saving, dragging }) => <Card task={t} saving={saving} onOpen={dragging ? null : onOpen} />}
        canDrag={(t) => !["In-Review", "Done"].includes(t.status)}
        decide={(t, to) => moveVerdict({ role: user?.role, roleCategory: "team_lead", task: t, to, isAssignee: false })}
        onMove={async (t, to) => { await api.patch(`/api/teamlead/tasks/${t.id}/status`, { status: to }); setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, status: to } : x))); }}
        onRefuse={(reason) => useUiStore.getState().addToast({ type: "error", message: reason })} />
    </>
  );
}

function SavedFilters({ sp, setSp }) {
  const addToast = useUiStore((s) => s.addToast);
  const [list, setList] = useState(null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => { api.get("/api/teamlead/filters").then(setList).catch(() => setList({ filters: [], max: 10 })); }, []);
  const current = new URLSearchParams([...sp].filter(([k]) => FILTER_KEYS.includes(k))).toString();
  async function save(e) {
    e.preventDefault();
    try { setList(await api.post("/api/teamlead/filters", { name, query: current })); setNaming(false); setName(""); addToast({ type: "success", message: "Filter saved." }); }
    catch (err) { addToast({ type: "error", message: err?.message ?? "Could not save the filter." }); }
  }
  async function remove(id) { try { setList(await api.delete(`/api/teamlead/filters/${id}`)); } catch (err) { addToast({ type: "error", message: err?.message ?? "Could not delete." }); } }
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-text-secondary">
      <span>Saved filters</span>
      {(list?.filters ?? []).map((f) => (
        <span key={f.id} className="inline-flex items-center rounded-full border border-ink/[0.1] bg-bg-surface">
          <button type="button" onClick={() => setSp(new URLSearchParams(f.query), { replace: true })} className="min-h-8 rounded-l-full px-3 text-text-primary hover:bg-ink/[0.04]">{f.name}</button>
          <button type="button" aria-label={`Delete saved filter ${f.name}`} onClick={() => remove(f.id)} className="flex h-8 w-8 items-center justify-center rounded-r-full hover:bg-ink/[0.06]"><Trash2 size={12} aria-hidden="true" /></button>
        </span>
      ))}
      {naming ? (
        <form onSubmit={save} className="flex items-center gap-2"><label htmlFor="sf-name" className="sr-only">Filter name</label>
          <input id="sf-name" name="filter-name" autoComplete="off" autoFocus maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. My overdue…" className="h-8 w-44 rounded-xl px-3 text-sm font-normal" />
          <button type="submit" className={BTN.secondary} disabled={!name.trim()}>Save</button><button type="button" className={BTN.ghost} onClick={() => setNaming(false)}>Cancel</button></form>
      ) : <button type="button" className={BTN.ghost} disabled={!current || (list?.filters?.length ?? 0) >= (list?.max ?? 10)} onClick={() => setNaming(true)}
        title={!current ? "Set some filters first." : (list?.filters?.length ?? 0) >= (list?.max ?? 10) ? "You can keep 10 saved filters. Delete one first." : undefined}>Save current filters</button>}
    </div>
  );
}

export default function TLTasksPage() {
  const addToast = useUiStore((s) => s.addToast);
  const [sp, setSp] = useSearchParams();
  const view = sp.get("view") === "board" ? "board" : "list";
  const tab = TABS.some(([k]) => k === sp.get("tab")) ? sp.get("tab") : "all";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [opts, setOpts] = useState(null); // filter choices stay while the list reloads
  const [picked, setPicked] = useState(new Set());
  const [bulk, setBulk] = useState({ action: "priority", value: "" });
  const [bulkBusy, setBulkBusy] = useState(false);
  const set = (patch, keepPage = false) => { const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(patch)) (v ? n.set(k, v) : n.delete(k)); if (!keepPage) n.delete("page"); setSp(n, { replace: true }); };
  const query = ["tab", "status", "assignee", "module", "overdue", "q", "tag", "blocked", "sprint", "page"].filter((k) => sp.get(k)).map((k) => `${k}=${encodeURIComponent(sp.get(k))}`).join("&");

  const load = useCallback(async (quiet) => {
    setError(null); if (quiet !== true) setData(null);
    try { setData(await api.get(`/api/teamlead/tasks/list?${query}`)); } catch (e) { if (quiet !== true) setError(e?.message ?? "Tasks could not be loaded."); }
  }, [query]);
  useEffect(() => { if (view === "list") load(); setPicked(new Set()); }, [load, view]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { if (view !== "list") return undefined; const h = () => load(true); socket.on("task:status_changed", h); return () => socket.off("task:status_changed", h); }, [load, view]);
  useEffect(() => { if (data?.options) setOpts(data.options); }, [data]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { if (!opts) api.get("/api/teamlead/tasks/list?page=1").then((d) => setOpts(d.options)).catch(() => {}); }, [opts]);

  const items = data?.items ?? [];
  const allOnPage = items.length > 0 && items.every((t) => picked.has(String(t.id)));
  const toggle = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  async function applyBulk() {
    if (!bulk.value) { addToast({ type: "error", message: "Pick a value first." }); return; }
    setBulkBusy(true);
    try {
      const r = await api.post("/api/teamlead/tasks/bulk", { ids: [...picked], action: bulk.action, value: bulk.value });
      addToast({ type: r.skipped.length ? "info" : "success", message: `${r.updated} updated${r.skipped.length ? `, ${r.skipped.length} skipped (${r.skipped[0].title}: ${r.skipped[0].reason})` : ""}.` });
      setPicked(new Set()); load(true);
    } catch (e) { addToast({ type: "error", message: e?.message ?? "Bulk change failed." }); }
    finally { setBulkBusy(false); }
  }

  const filtered = ["status", "assignee", "module", "overdue", "q", "tag", "blocked", "sprint"].some((k) => sp.get(k));
  const columns = [
    { key: "pick", label: <input type="checkbox" aria-label="Select all tasks on this page" checked={allOnPage} onChange={() => setPicked(allOnPage ? new Set() : new Set(items.map((t) => String(t.id))))} className="h-4 w-4 accent-[var(--accent)]" />,
      className: "w-10", render: (t) => <span onClick={(e) => e.stopPropagation()} className="flex"><input type="checkbox" aria-label={`Select ${t.title}`} checked={picked.has(String(t.id))} onChange={() => toggle(String(t.id))} className="h-4 w-4 accent-[var(--accent)]" /></span> },
    { key: "title", label: "Task", className: "min-w-[220px]", render: (t) => (
      <span className="flex flex-col"><span className="font-bold text-text-primary">{t.title}</span>
        {(t.tags.length > 0 || t.groupTag) && <span className="text-xs text-text-secondary">{[t.groupTag && "group", ...t.tags].filter(Boolean).join(" · ")}</span>}</span>) },
    { key: "project", label: "Module", className: "text-text-secondary", render: (t) => t.project.title },
    { key: "who", label: "Assignee", className: "whitespace-nowrap", render: (t) => t.assignees.map((a) => a.name).join(", ") || <span className="text-text-secondary">Unassigned</span> },
    { key: "status", label: "Status", render: (t) => <span className="inline-flex items-center gap-1.5"><StatusChip status={CHIP[t.status]} label={t.status.replace("-", " ")} size="xs" />{t.waitingManager && <span className="whitespace-nowrap rounded-md bg-[#FFC21A]/15 px-1.5 py-0.5 text-[11px] font-semibold text-[#5C3D00]">Waiting for Manager</span>}{t.hasDependencies && t.status !== "Done" && sp.get("blocked") === "1" && <Lock size={12} aria-label="Blocked" className="text-[#7A5200]" />}</span> },
    { key: "deadline", label: "Due", className: "whitespace-nowrap tabular-nums", render: (t) => (t.deadline ? <span style={{ color: t.status !== "Done" && new Date(t.deadline) < new Date() ? "#B01F17" : undefined }}>{fmt(t.deadline)}</span> : "—") },
    { key: "priority", label: "Priority", className: "whitespace-nowrap text-text-secondary", render: (t) => t.priority },
  ];
  const select = "h-9 rounded-xl px-3 text-sm font-normal";

  return (
    <Page>
      <PageHeader title="Tasks" subtitle="Every task in your modules. Open one to see its details, subtasks, dependencies, comments, time and history."
        primary={{ label: "New task", onClick: () => set({ new: "1" }, true) }} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="View" className="inline-flex rounded-xl border border-ink/[0.08] bg-ink/[0.03] p-0.5">
          {[["list", "List"], ["board", "Board"]].map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={view === k} onClick={() => { const n = new URLSearchParams(); for (const x of KEEP) if (sp.get(x)) n.set(x, sp.get(x)); if (k === "board") n.set("view", "board"); setSp(n, { replace: true }); }}
              className={`min-h-9 rounded-lg px-4 text-sm font-bold transition-colors ${view === k ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}>{l}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-text-secondary">
          <label className="flex items-center gap-2">Module
            <select value={sp.get("module") ?? ""} onChange={(e) => set({ module: e.target.value })} className={`${select} max-w-[200px]`}>
              <option value="">All modules</option>{(opts?.modules ?? []).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">Sprint
            <select value={sp.get("sprint") ?? ""} onChange={(e) => set({ sprint: e.target.value })} className={`${select} max-w-[200px]`}>
              <option value="">{view === "board" ? "Whole team" : "Any sprint"}</option>{(opts?.sprints ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} · {s.project}</option>)}
            </select>
          </label>
          {view === "list" && (
            <label className="flex items-center gap-2">Assignee
              <select value={sp.get("assignee") ?? ""} onChange={(e) => set({ assignee: e.target.value })} className={`${select} max-w-[180px]`}>
                <option value="">Anyone</option><option value="none">Unassigned</option>{(opts?.assignees ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2"><span className="sr-only">Search tasks</span>
            <input type="search" name="q" autoComplete="off" defaultValue={sp.get("q") ?? ""} placeholder="Search by title…" onKeyDown={(e) => { if (e.key === "Enter") set({ q: e.currentTarget.value.trim() }); }} onBlur={(e) => { if ((sp.get("q") ?? "") !== e.target.value.trim()) set({ q: e.target.value.trim() }); }} className={`${select} w-44`} />
          </label>
        </div>
      </div>
      <SavedFilters sp={sp} setSp={setSp} />

      {view === "list" ? (
        <>
          <div role="tablist" aria-label="Task lists" className="flex gap-1 overflow-x-auto border-b border-border-subtle"
            onKeyDown={(e) => { if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return; const i = TABS.findIndex(([k]) => k === tab), n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0]; set({ tab: n === "all" ? null : n, status: null }); requestAnimationFrame(() => document.getElementById(`ttab-${n}`)?.focus()); }}>
            {TABS.map(([k, l]) => (
              <button key={k} id={`ttab-${k}`} role="tab" type="button" aria-selected={tab === k} tabIndex={tab === k ? 0 : -1} onClick={() => set({ tab: k === "all" ? null : k, status: null })}
                className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${tab === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}>{l}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            {tab === "all" && <FilterChips label="Status" param="status" options={STATUSES.map((s) => ({ value: s, label: s.replace("-", " ") }))} />}
            <FilterChips label="Show" param="overdue" options={[{ value: "1", label: "Overdue only" }]} />
            <FilterChips label="Dependency" param="blocked" options={[{ value: "1", label: "Blocked by a dependency" }]} />
            <label className="flex items-center gap-2 text-xs font-bold text-text-secondary">Tag
              <input name="tag" autoComplete="off" defaultValue={sp.get("tag") ?? ""} placeholder="e.g. login…" maxLength={24} onKeyDown={(e) => { if (e.key === "Enter") set({ tag: e.currentTarget.value.trim().toLowerCase() }); }} onBlur={(e) => { if ((sp.get("tag") ?? "") !== e.target.value.trim().toLowerCase()) set({ tag: e.target.value.trim().toLowerCase() }); }} className="h-8 w-32 rounded-xl px-3 text-sm font-normal" />
            </label>
          </div>
          {picked.size > 0 && (
            <div role="region" aria-label="Bulk actions" className="flex flex-wrap items-center gap-2 rounded-2xl border border-accent/25 bg-accent/[0.04] px-4 py-2.5 text-sm">
              <span className="font-bold">{picked.size} selected</span>
              <label className="sr-only" htmlFor="bulk-action">Bulk action</label>
              <select id="bulk-action" value={bulk.action} onChange={(e) => setBulk({ action: e.target.value, value: "" })} className={select}>{BULK.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <label className="sr-only" htmlFor="bulk-value">Value</label>
              {bulk.action === "assign" ? <select id="bulk-value" value={bulk.value} onChange={(e) => setBulk({ ...bulk, value: e.target.value })} className={select}><option value="">Pick a person…</option>{(opts?.assignees ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                : bulk.action === "sprint" ? <select id="bulk-value" value={bulk.value} onChange={(e) => setBulk({ ...bulk, value: e.target.value })} className={`${select} max-w-[260px]`}><option value="">Pick a sprint…</option>{(opts?.sprints ?? []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                : bulk.action === "priority" ? <select id="bulk-value" value={bulk.value} onChange={(e) => setBulk({ ...bulk, value: e.target.value })} className={select}><option value="">Pick…</option>{["Critical", "High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}</select>
                : bulk.action === "deadline" ? <input id="bulk-value" type="date" value={bulk.value} onChange={(e) => setBulk({ ...bulk, value: e.target.value })} className={select} />
                : <input id="bulk-value" maxLength={24} autoComplete="off" value={bulk.value} onChange={(e) => setBulk({ ...bulk, value: e.target.value })} placeholder="Tag…" className={`${select} w-32`} />}
              <button type="button" className={BTN.primary} disabled={bulkBusy} onClick={applyBulk}>{bulkBusy ? "Applying…" : "Apply"}</button>
              <button type="button" className={BTN.ghost} onClick={() => setPicked(new Set())}>Clear</button>
              <span className="text-xs text-text-secondary">Adding to a sprint comes with sprint planning.</span>
            </div>
          )}
          <DataTable label="Tasks" columns={columns} rows={items} loading={!data && !error} error={error} onRetry={load}
            page={page} total={data?.total ?? 0} pageSize={data?.pageSize ?? 25} onPage={(n) => set({ page: n > 1 ? String(n) : null }, true)}
            onRowClick={(t) => set({ task: String(t.id) }, true)}
            empty={filtered
              ? <EmptyState heading="No tasks match these filters." action={{ label: "Clear filters", onClick: () => setSp(tab === "all" ? {} : { tab }, { replace: true }) }} />
              : tab === "review" ? <EmptyState heading="Nothing is waiting for your review." action={{ label: "Show all tasks", onClick: () => setSp({}, { replace: true }) }} />
              : <EmptyState heading="No tasks here yet." action={{ label: "New task", onClick: () => set({ new: "1" }, true) }} />} />
        </>
      ) : <Board module={sp.get("module")} q={sp.get("q")} sprint={sp.get("sprint")} onOpen={(id) => set({ task: String(id) }, true)} />}

      <TaskFormDrawer open={sp.get("new") === "1"} preset={sp.get("module") ? { projectId: sp.get("module") } : null} onClose={() => set({ new: null }, true)}
        onSaved={(r) => { addToast({ type: "success", message: r.created > 1 ? `${r.created} tasks created.` : "Task created." }); load(true); }} />
      <TaskDetailDrawer taskId={sp.get("task")} onClose={() => set({ task: null }, true)} onOpenTask={(id) => set({ task: String(id) }, true)} onChanged={() => load(true)} />
    </Page>
  );
}
