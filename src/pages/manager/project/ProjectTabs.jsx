// Manager project detail tabs (V2 Phase 3 · M-2, UX §5.4). Each tab loads its own data with the 3 states.
import FileLink from "@/components/ui/FileLink";
import { fmtDateTime as dTime } from "@/pages/manager/project/format";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Activity, Award, CalendarClock, CheckCircle2, ClipboardList, ExternalLink, Gauge, Plus, UserMinus, UserPlus, UserCheck, Unlink } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import useUrlList from "@/components/ui/useUrlList";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import Drawer from "@/components/ui/Drawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import StatusChip from "@/components/ui/StatusChip";
import { healthColor } from "@/components/ui/healthTone";
import { BTN } from "@/components/ui/buttons";
import { useRoleTheme } from "@/utils/roleTheme";
import useLoad from "./useLoad";
import { fmt } from "./format";
import { AssetName, Expiry } from "../resources/AssetsTab";

const ago = (d) => new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(Math.round((new Date(d) - Date.now()) / 86_400_000), "day");
const daysLeft = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 86_400_000) : null);
const ACTION_LABEL = {
  project_created: "Project created", project_updated: "Details changed", project_status_changed: "Status changed",
  project_archived: "Archived", project_restored: "Restored", project_member_added: "Person added", project_member_removed: "Person removed",
  module_lead_assigned: "Module given to a Team Lead", extension_requested: "Deadline extension", extension_approved: "Extension approved",
  extension_rejected: "Extension rejected", extension_counter_proposed: "Director proposed other dates", project_frozen: "Frozen", project_unfrozen: "Unfrozen",
};
const ROLE_LABEL = { Designer: "Design", Developer: "Development", Tester: "Testing", "Team Lead": "Lead" };
const Sel = ({ id, label, value, onChange, children }) => (
  <label htmlFor={id} className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">{label}
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 rounded-xl px-3 text-sm font-normal">{children}</select>
  </label>
);
const Line = ({ text, action }) => (
  <div className="flex flex-col items-start gap-2 px-5 py-4">
    <p className="text-sm text-text-secondary">{text}</p>
    {action && (action.to ? <Link to={action.to} className={BTN.secondary}>{action.label}</Link> : <button type="button" className={BTN.secondary} onClick={action.onClick}>{action.label}</button>)}
  </div>
);
const PanelSkeleton = () => <div className="px-5 py-4"><Skeleton className="h-24 rounded-xl" /></div>;

// ── Overview ─────────────────────────────────────────────────────────────────
// U-1 (D-132): setup checklist for Planning projects; disappears once a module has a Team Lead and the team has a member.
const SETUP_LINK = { modules: "?tab=modules", lead: "?tab=modules", team: "?tab=team" };
function SetupPanel({ project, onChanged }) {
  const addToast = useUiStore((s) => s.addToast);
  const [busy, setBusy] = useState(false);
  const steps = project.setup;
  if (!steps) return null;
  const done = steps.every((s) => s.done);
  async function start() {
    setBusy(true);
    try { await api.patch(`/api/manager/projects/${project._id}/status`, { status: "Active" }); addToast({ type: "success", message: "Project started. It is now Active." }); onChanged?.(); }
    catch (e) { addToast({ type: "error", message: e?.message ?? "The project could not be started." }); } finally { setBusy(false); }
  }
  return (
    <section aria-label={done ? "Ready to start" : "Needs setup"} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F2A60D]/40 bg-[#FFF7E6] px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-black text-[#7A4B00]">{done ? "Ready to start" : "Needs setup"}</h2>
        <p className="mt-0.5 text-[13px] text-[#6B4300]">{done ? "Everything is in place. Start the project when the team is ready." : "The project stays in Planning until these are done."}</p>
        {!done && (
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
            {steps.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 text-sm font-semibold">
                {s.done ? <CheckCircle2 size={15} className="text-[#0E6A30]" aria-hidden /> : <span aria-hidden className="h-3.5 w-3.5 rounded-full border-2 border-[#9A6400]" />}
                {s.done ? <span className="text-text-secondary line-through">{s.label}</span> : <Link to={SETUP_LINK[s.key]} className="text-[#6B4300] underline underline-offset-2 hover:text-text-primary">{s.label}</Link>}
                <span className="sr-only">{s.done ? "(done)" : "(to do)"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {done && <button type="button" className={BTN.primary} onClick={start} disabled={busy}>{busy ? "Starting…" : "Start project"}</button>}
    </section>
  );
}

export function OverviewTab({ project, onChanged }) {
  const { data, error, reload } = useLoad(`/api/manager/projects/${project._id}/overview`);
  const theme = useRoleTheme();
  const tc = project.taskCounts ?? {};
  const open = (tc.total ?? 0) - (tc.done ?? 0);
  const left = daysLeft(project.deadline);
  const pending = data?.extensions?.find((e) => e.status === "pending");
  return (
    <div className="flex flex-col gap-6">
      <SetupPanel project={project} onChanged={onChanged} />
      {pending && (
        <p role="status" className="rounded-xl border border-[#F2A60D]/40 bg-[#FFF0D2] px-4 py-3 text-sm font-semibold text-[#7A4B00]">
          Waiting for the Director: +{pending.requestedDays} day{pending.requestedDays === 1 ? "" : "s"} on the deadline ({pending.reason}).
        </p>
      )}
      <Panel title="Snapshot" icon={Gauge}>
        <div className="grid grid-cols-2 divide-x divide-ink/[0.05] lg:grid-cols-4">
          <StatCard label="Done" value={`${project.completion ?? 0}%`} icon={CheckCircle2} color={theme.accent} sub={`${tc.done ?? 0} of ${tc.total ?? 0} tasks`} />
          <StatCard label="Health" value={project.healthScore} noDataLabel="Not started" icon={Activity} color={healthColor(project.healthBand)} sub={project.healthScore == null ? "no tasks yet" : project.healthBand} />
          <StatCard label="Open tasks" value={open} icon={ClipboardList} color={theme.accent} sub={`${tc.todo ?? 0} to do · ${tc.inProgress ?? 0} in progress · ${tc.inReview ?? 0} in review`} />
          <StatCard label="Deadline" value={fmt(project.deadline)} icon={CalendarClock} color={left != null && left < 0 ? "#B01F17" : theme.accent}
            sub={left == null ? "No deadline" : left < 0 ? `${-left} days late` : `${left} days left`} />
        </div>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent activity" icon={Activity} action={{ to: "?tab=history", label: "Full history" }}>
          {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <PanelSkeleton /> : data.recentActivity.length ? (
            <ul className="divide-y divide-ink/[0.05] px-5 py-1">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
                  <span className="min-w-0"><span className="block text-sm font-semibold text-text-primary">{ACTION_LABEL[a.action] ?? a.action}</span><span className="block truncate text-xs text-text-secondary">{a.detail}</span></span>
                  <span className="shrink-0 text-xs text-text-secondary">{ago(a.at)}</span>
                </li>
              ))}
            </ul>
          ) : <Line text="Nothing has happened on this project yet." />}
        </Panel>
        <Panel title="Top contributors" icon={Award}>
          {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <PanelSkeleton /> : data.topContributors.length ? (
            <ol className="divide-y divide-ink/[0.05] px-5 py-1">
              {data.topContributors.map((c, i) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-sm font-semibold text-text-primary"><span className="mr-2 tabular-nums text-text-secondary">{i + 1}.</span>{c.name} <span className="text-xs font-normal text-text-secondary">· {c.role}</span></span>
                  <span className="text-sm font-bold tabular-nums text-[#7A5200]">{c.xp.toLocaleString()} XP</span>
                </li>
              ))}
            </ol>
          ) : <Line text="No XP earned on this project yet." />}
        </Panel>
      </div>
    </div>
  );
}

// ── Modules ──────────────────────────────────────────────────────────────────
export function ModulesTab({ project, onChanged }) {
  const { data, error, reload } = useLoad(`/api/manager/projects/${project._id}/modules`);
  const addToast = useUiStore((s) => s.addToast);
  const [assign, setAssign] = useState(null);       // module being assigned
  const [adding, setAdding] = useState(false);
  const leads = useLoad("/api/manager/team-availability");
  const tls = (leads.data?.members ?? []).filter((m) => m.role === "Team Lead");
  const [form, setForm] = useState({ teamLeadId: "", dueDate: "", title: "", roles: ["Developer"] });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const maxDue = project.deadline?.slice(0, 10);

  async function saveLead() {
    if (!form.teamLeadId) { setErr("Choose a Team Lead."); return; }
    setBusy(true); setErr(null);
    try {
      await api.patch(`/api/manager/projects/${project._id}/modules/${assign.id}/lead`, { teamLeadId: form.teamLeadId, dueDate: form.dueDate || undefined });
      addToast({ type: "success", message: `${tls.find((t) => t.id === form.teamLeadId)?.name ?? "Team Lead"} now leads "${assign.title}". They got a notification.` });
      setAssign(null); reload(); onChanged?.();
    } catch (e) { setErr(e?.message ?? "Could not assign the module."); } finally { setBusy(false); }
  }
  async function addModule() {
    if (!form.title.trim()) { setErr("Give the module a name."); return; }
    setBusy(true); setErr(null);
    try {
      await api.post(`/api/manager/projects/${project._id}/milestones`, { title: form.title.trim(), activeRoles: form.roles });
      setAdding(false); reload();
    } catch (e) { setErr(e?.message ?? "Could not add the module."); } finally { setBusy(false); }
  }

  const columns = [
    { key: "title", label: "Module", className: "min-w-[200px]", render: (m) => <span className="font-bold text-text-primary">{m.title}</span> },
    { key: "roles", label: "Work types", render: (m) => m.roles.length ? m.roles.map((r) => ROLE_LABEL[r] ?? r).join(" · ") : "—" },
    { key: "progress", label: "Progress", render: (m) => <span className="text-sm tabular-nums">{m.progressPct}% <span className="text-xs text-text-secondary">({m.done}/{m.tasks})</span></span> },
    { key: "lead", label: "Team Lead", render: (m) => m.teamLead?.name ?? <span className="text-xs font-semibold text-[#9A3A06]">Not assigned</span> },
    { key: "due", label: "Due", className: "whitespace-nowrap", render: (m) => fmt(m.dueDate) },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end"><button type="button" className={BTN.secondary} onClick={() => { setForm((f) => ({ ...f, title: "", roles: ["Developer"] })); setErr(null); setAdding(true); }}><Plus size={14} aria-hidden="true" /> Add module</button></div>
      <DataTable label="Modules" columns={columns} rows={data?.modules ?? []} loading={!data && !error} error={error} onRetry={reload}
        total={data?.modules?.length ?? 0} pageSize={1000}
        rowActions={(m) => [{ label: m.teamLead ? "Change Team Lead" : "Assign Team Lead", icon: UserCheck, onClick: () => { setForm((f) => ({ ...f, teamLeadId: m.teamLead?.id ?? "", dueDate: m.dueDate?.slice(0, 10) ?? "" })); setErr(null); setAssign(m); } }]}
        empty={<EmptyState heading="No modules yet." action={{ label: "Add module", onClick: () => setAdding(true) }} />} />

      <Drawer open={!!assign} onClose={() => setAssign(null)} title={`Team Lead for "${assign?.title ?? ""}"`}
        footer={<div className="flex justify-end gap-2"><button type="button" className={BTN.secondary} onClick={() => setAssign(null)}>Cancel</button><button type="button" className={BTN.primary} disabled={busy} onClick={saveLead}>{busy ? "Saving…" : "Assign"}</button></div>}>
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-text-secondary">One Team Lead per module. They get a notification and the module shows up in their portal.</p>
          {leads.error ? <ErrorState message={leads.error} onRetry={leads.reload} /> : !leads.data ? <Skeleton className="h-10 rounded-xl" /> : (
            <Sel id="mod-lead" label="Team Lead" value={form.teamLeadId} onChange={(v) => setForm((f) => ({ ...f, teamLeadId: v }))}>
              <option value="">Choose a Team Lead</option>{tls.map((t) => <option key={t.id} value={t.id}>{t.name}{t.availability ? ` (${t.availability})` : ""}</option>)}
            </Sel>
          )}
          <label htmlFor="mod-due" className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">Module deadline <span className="text-xs font-normal text-text-secondary">Optional, not after the project deadline ({fmt(project.deadline)}).</span>
            <input id="mod-due" type="date" max={maxDue} value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="h-10 rounded-xl px-3 text-sm font-normal" />
          </label>
          {err && <p role="alert" className="text-sm font-semibold text-[#B01F17]">{err}</p>}
        </div>
      </Drawer>

      <Drawer open={adding} onClose={() => setAdding(false)} title="Add module"
        footer={<div className="flex justify-end gap-2"><button type="button" className={BTN.secondary} onClick={() => setAdding(false)}>Cancel</button><button type="button" className={BTN.primary} disabled={busy} onClick={addModule}>{busy ? "Adding…" : "Add module"}</button></div>}>
        <div className="flex flex-col gap-4 p-5">
          <label htmlFor="mod-title" className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">Name
            <input id="mod-title" autoComplete="off" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Payments…" className="h-10 rounded-xl px-3 text-sm font-normal" />
          </label>
          <fieldset><legend className="mb-1.5 text-sm font-bold text-text-primary">Work types</legend>
            <div className="flex gap-1.5">{["Designer", "Developer", "Tester"].map((r) => { const on = form.roles.includes(r); return (
              <button key={r} type="button" aria-pressed={on} onClick={() => setForm((f) => ({ ...f, roles: on ? f.roles.filter((x) => x !== r) : [...f.roles, r] }))}
                className={`h-9 rounded-xl border px-3 text-sm font-bold ${on ? "border-accent/30 bg-accent/10 text-accent-text" : "border-ink/[0.08] text-text-secondary"}`}>{ROLE_LABEL[r]}</button>); })}
            </div>
          </fieldset>
          {err && <p role="alert" className="text-sm font-semibold text-[#B01F17]">{err}</p>}
        </div>
      </Drawer>
    </div>
  );
}

// ── Team ─────────────────────────────────────────────────────────────────────
export function TeamTab({ project, onChanged }) {
  const { data, error, reload } = useLoad(`/api/manager/projects/${project._id}/team`);
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const people = useLoad("/api/manager/team-availability");
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState("");
  const [blocked, setBlocked] = useState(null);   // { name, openTasks }
  const [busy, setBusy] = useState(false);
  const memberIds = new Set((data?.members ?? []).map((m) => String(m.id)));
  const candidates = (people.data?.members ?? []).filter((p) => !["Director", "Manager"].includes(p.role) && !memberIds.has(String(p.id)));

  async function add(userId, quiet) {
    await api.post(`/api/manager/projects/${project._id}/members`, { userId });
    reload(); onChanged?.();
    if (!quiet) addToast({ type: "success", message: "Added to the project. They got a notification." });
  }
  async function remove(m) {
    if (m.openTasks > 0) { setBlocked(m); return; }
    try {
      await api.delete(`/api/manager/projects/${project._id}/members/${m.id}`);
      reload(); onChanged?.();
      addToast({ type: "info", message: `${m.name} removed from the project.`, undoAction: () => add(m.id, true).catch((e) => addToast({ type: "error", message: e?.message ?? "Could not undo." })) });
    } catch (e) {
      if (e?.data?.openTasks) setBlocked({ ...m, openTasks: e.data.openTasks });
      else addToast({ type: "error", message: e?.message ?? "Could not remove this person." });
    }
  }

  const columns = [
    { key: "name", label: "Name", render: (m) => <span className="font-bold text-text-primary">{m.name}</span> },
    { key: "role", label: "Role", render: (m) => m.role === "Team Lead" ? <span className="font-bold text-accent-text">Team Lead</span> : m.role },
    { key: "open", label: "Open tasks", className: "tabular-nums", render: (m) => m.openTasks },
    { key: "email", label: "Email", render: (m) => <span className="text-text-secondary">{m.email}</span> },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end"><button type="button" className={BTN.secondary} onClick={() => { setPick(""); setAdding(true); }}><UserPlus size={14} aria-hidden="true" /> Add person</button></div>
      <DataTable label="Team" columns={columns} rows={data?.members ?? []} loading={!data && !error} error={error} onRetry={reload} total={data?.members?.length ?? 0} pageSize={1000}
        rowActions={() => [{ label: "Remove from project", icon: UserMinus, onClick: remove }]}
        empty={<EmptyState heading="Nobody is on this project yet." action={{ label: "Add person", onClick: () => setAdding(true) }} />} />

      <Drawer open={adding} onClose={() => setAdding(false)} title="Add a person"
        footer={<div className="flex justify-end gap-2"><button type="button" className={BTN.secondary} onClick={() => setAdding(false)}>Cancel</button>
          <button type="button" className={BTN.primary} disabled={!pick || busy} onClick={async () => { setBusy(true); try { await add(pick); setAdding(false); } catch (e) { addToast({ type: "error", message: e?.message ?? "Could not add." }); } finally { setBusy(false); } }}>{busy ? "Adding…" : "Add"}</button></div>}>
        <div className="flex flex-col gap-3 p-5">
          {people.error ? <ErrorState message={people.error} onRetry={people.reload} /> : !people.data ? <Skeleton className="h-10 rounded-xl" /> : candidates.length ? (
            <Sel id="add-person" label="Person" value={pick} onChange={setPick}>
              <option value="">Choose a person</option>
              {candidates.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}{p.availability === "Overloaded" ? " · needs a lighter load" : ""}</option>)}
            </Sel>
          ) : <p className="text-sm text-text-secondary">Everyone in your organisation is already on this project.</p>}
          <p className="text-xs text-text-secondary">Adding a Team Lead makes them a Team Lead of this project.</p>
        </div>
      </Drawer>

      <ConfirmModal open={!!blocked} onClose={() => setBlocked(null)} onConfirm={() => navigate(`/manager/resources?member=${blocked.id}`)}
        title={`${blocked?.name ?? "This person"} still has open work`} confirmLabel="Reassign tasks" cancelLabel="Close"
        body={`${blocked?.openTasks} open task${blocked?.openTasks === 1 ? "" : "s"} on this project. Reassign them first, then remove the person.`} />
    </div>
  );
}

// ── Sprints (read-only; planning arrives in M-3) ─────────────────────────────
const SPRINT_LABEL = { Planning: "Planned", Completed: "Closed" };
export function SprintsTab({ project }) {
  const { data, error, reload } = useLoad(`/api/manager/projects/${project._id}/sprints`);
  const navigate = useNavigate();
  const columns = [
    { key: "name", label: "Sprint", render: (s) => <span className="font-bold text-text-primary">{s.name}</span> },
    { key: "status", label: "Status", render: (s) => <StatusChip status={SPRINT_LABEL[s.status] ?? "Active"} size="xs" /> },
    { key: "dates", label: "Dates", className: "whitespace-nowrap", render: (s) => `${fmt(s.startDate)} → ${fmt(s.endDate)}` },
    { key: "done", label: "Done", className: "tabular-nums", render: (s) => `${s.done}/${s.total} tasks` },
  ];
  return (
    <DataTable label="Sprints" columns={columns} rows={data?.sprints ?? []} loading={!data && !error} error={error} onRetry={reload} total={data?.sprints?.length ?? 0} pageSize={1000}
      onRowClick={(s) => navigate(`/manager/sprints/${s.id}`)} rowActions={(s) => [{ label: "Open sprint", icon: ExternalLink, onClick: () => navigate(`/manager/sprints/${s.id}`) }]}
      empty={<EmptyState heading="No sprints for this project yet." action={{ label: "New sprint", to: `/manager/sprints?new=1&project=${project._id}` }} />} />
  );
}

// ── Tasks (read-only) ────────────────────────────────────────────────────────
const TASK_STATUS = ["Backlog", "To-Do", "In-Progress", "In-Review", "Done"].map((s) => ({ value: s, label: s.replace("-", " ") }));
export function TasksTab({ project, onOpenTask }) {
  const { data, error, reload } = useLoad(`/api/manager/projects/${project._id}/tasks`);
  const [sp, setSp] = useSearchParams();
  const statuses = useUrlList("tstatus");
  const who = sp.get("assignee") ?? "";
  const page = Math.max(1, Number(sp.get("tpage")) || 1);
  const people = useMemo(() => {
    const m = new Map();
    for (const t of data ?? []) for (const a of [...(t.assignees ?? []), ...(t.assignee ? [t.assignee] : [])]) m.set(String(a.id), a.name);
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);
  const rows = (data ?? []).filter((t) => (!statuses.length || statuses.includes(t.status))
    && (!who || [...(t.assignees ?? []), ...(t.assignee ? [t.assignee] : [])].some((a) => String(a.id) === who)));
  const setQ = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== "tpage") n.delete("tpage"); setSp(n, { replace: true }); };
  const names = (t) => [...new Map([...(t.assignees ?? []), ...(t.assignee ? [t.assignee] : [])].map((a) => [String(a.id), a.name])).values()].join(", ") || "Unassigned";
  const columns = [
    { key: "title", label: "Task", className: "min-w-[220px]", render: (t) => <span className="font-bold text-text-primary">{t.title}</span> },
    { key: "status", label: "Status", render: (t) => <span className="text-xs font-bold text-text-secondary">{t.status.replace("-", " ")}</span> },
    { key: "assignee", label: "Assignee", render: names },
    { key: "priority", label: "Priority", render: (t) => t.priority },
    { key: "deadline", label: "Due", className: "whitespace-nowrap", render: (t) => fmt(t.deadline) },
  ];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-secondary">Read-only. The Team Lead creates, assigns and reviews tasks.</p>
      <div className="flex flex-wrap items-center gap-4">
        <FilterChips label="Status" param="tstatus" options={TASK_STATUS} multi />
        <label htmlFor="assignee" className="flex items-center gap-2 text-xs font-bold text-text-secondary">Assignee
          <select id="assignee" value={who} onChange={(e) => setQ("assignee", e.target.value)} className="h-8 rounded-lg px-2 text-sm font-normal">
            <option value="">Everyone</option>{people.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
          </select>
        </label>
      </div>
      <DataTable label="Tasks" columns={columns} rows={rows.slice((page - 1) * 25, page * 25)} loading={!data && !error} error={error} onRetry={reload}
        page={page} total={rows.length} pageSize={25} onPage={(n) => setQ("tpage", n > 1 ? String(n) : "")}
        onRowClick={(t) => onOpenTask(t.id)} rowActions={(t) => [{ label: "Open task", icon: ExternalLink, onClick: () => onOpenTask(t.id) }]}
        empty={statuses.length || who
          ? <EmptyState heading="No tasks match these filters." action={{ label: "Clear filters", onClick: () => { const n = new URLSearchParams(sp); n.delete("tstatus"); n.delete("assignee"); n.delete("tpage"); setSp(n, { replace: true }); } }} />
          : <EmptyState heading="No tasks yet. The Team Lead adds them." action={{ label: "See the team", to: "?tab=team" }} />} />
    </div>
  );
}

// ── History (AuditLog) ───────────────────────────────────────────────────────
export function HistoryTab({ project }) {
  const [page, setPage] = useState(1);
  const { data, error, reload } = useLoad(`/api/manager/projects/${project._id}/history?page=${page}`);
  const columns = [
    { key: "at", label: "When", className: "whitespace-nowrap tabular-nums", render: (r) => dTime(r.at) },
    { key: "by", label: "Who" },
    { key: "action", label: "What", render: (r) => <span className="font-semibold text-text-primary">{ACTION_LABEL[r.action] ?? r.action}</span> },
    { key: "detail", label: "Details", render: (r) => <span className="text-text-secondary">{r.detail}</span> },
  ];
  return (
    <DataTable label="History" columns={columns} rows={data?.items ?? []} loading={!data && !error} error={error} onRetry={reload}
      page={page} total={data?.total ?? 0} pageSize={25} onPage={setPage}
      empty={<EmptyState heading="No history yet." action={{ label: "Back to overview", to: "?tab=overview" }} />} />
  );
}

// ── Task drawer (read-only) ──────────────────────────────────────────────────
// base: API prefix (Team Lead: "/api/teamlead"). full: also time log entries and history (Team Lead drawer, T-1).
export function TaskDrawer({ taskId, onClose, base = "/api/manager", full = false }) {
  const { data, error, reload } = useLoad(taskId ? `${base}/tasks/${taskId}/detail` : null);
  const t = data;
  const h = (n) => `${Math.floor(n / 60)}h ${n % 60}m`;
  return (
    <Drawer open={!!taskId} onClose={onClose} title={t?.title ?? "Task"}>
      {!taskId ? null : error ? <ErrorState message={error} onRetry={reload} /> : !t ? <div className="p-5"><Skeleton className="h-64 rounded-xl" /></div> : (
        <div className="flex flex-col gap-5 p-5 text-sm">
          <dl className="grid grid-cols-[110px_1fr] gap-y-2">
            <dt className="text-text-secondary">Status</dt><dd className="font-semibold">{t.status.replace("-", " ")}{t.isLate ? " · late" : ""}</dd>
            <dt className="text-text-secondary">Assignee</dt><dd className="font-semibold">{t.assignees.map((a) => a.name).join(", ") || "Unassigned"}</dd>
            <dt className="text-text-secondary">Priority</dt><dd>{t.priority} · {t.type}</dd>
            <dt className="text-text-secondary">Due</dt><dd>{fmt(t.deadline)}</dd>
            <dt className="text-text-secondary">Time logged</dt><dd>{h(t.time.minutes)}</dd>
          </dl>
          {t.description && <section><h3 className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Details</h3><p className="whitespace-pre-wrap text-text-primary">{t.description}</p></section>}

          <section aria-labelledby="scores-h">
            <h3 id="scores-h" className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Scores</h3>
            {t.review.tlScore == null ? <p className="text-text-secondary">Not reviewed yet. Scores show after the Team Lead gives the final score.</p> : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-xl border border-ink/[0.08] px-3 py-2"><span className="block text-xs text-text-secondary">Team Lead (final)</span><span className="text-lg font-black tabular-nums">{t.review.tlScore}</span></span>
                <span className="rounded-xl border border-ink/[0.08] px-3 py-2"><span className="block text-xs text-text-secondary">AI</span><span className="text-lg font-black tabular-nums">{t.review.aiScore ?? "—"}</span></span>
                {t.review.disagree && <span className="rounded-full border border-[#D1291F]/30 bg-[#D1291F]/10 px-2.5 py-1 text-xs font-bold text-[#B01F17]">AI/TL disagree</span>}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Submission</h3>
            {t.submission.links.length || t.submission.files.length || t.submission.note ? (
              <ul className="flex flex-col gap-1">
                {t.submission.note && <li className="text-text-primary">{t.submission.note}</li>}
                {[...t.submission.links.map((l) => ({ name: l.label || l.url, url: l.url })), ...t.submission.files].filter((x) => x.url).map((x, i) => (
                  <li key={i}><FileLink href={x.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">{x.name}</FileLink></li>
                ))}
              </ul>
            ) : <p className="text-text-secondary">Nothing submitted yet.</p>}
          </section>

          <section>
            <h3 className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Comments ({t.comments.length})</h3>
            {t.comments.length ? (
              <ul className="flex flex-col gap-2">{t.comments.map((c) => <li key={c.id} className="rounded-xl bg-ink/[0.03] px-3 py-2"><span className="text-xs font-bold">{c.author}</span> <span className="text-xs text-text-secondary">· {fmt(c.at)}</span><p className="mt-0.5 whitespace-pre-wrap">{c.text}</p></li>)}</ul>
            ) : <p className="text-text-secondary">No comments.</p>}
          </section>
          {full && (
            <>
              <section>
                <h3 className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Time log ({t.time.logs.length})</h3>
                {t.time.logs.length ? (
                  <ul className="flex flex-col gap-1">{t.time.logs.map((l, i) => <li key={i} className="flex justify-between gap-3"><span className="min-w-0 truncate">{l.who}{l.note ? ` · ${l.note}` : ""}</span><span className="shrink-0 tabular-nums text-text-secondary">{h(l.minutes)} · {fmt(l.at)}</span></li>)}</ul>
                ) : <p className="text-text-secondary">No time logged.</p>}
              </section>
              <section>
                <h3 className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">History</h3>
                {t.history?.length ? (
                  <ol className="flex flex-col gap-1">{t.history.map((a, i) => <li key={i} className="flex justify-between gap-3"><span className="min-w-0">{a.who} · {a.kind === "status" ? `${a.from ?? "—"} → ${a.to}` : a.kind}</span><span className="shrink-0 tabular-nums text-text-secondary">{fmt(a.at)}</span></li>)}</ol>
                ) : <p className="text-text-secondary">No history yet.</p>}
              </section>
            </>
          )}
        </div>
      )}
    </Drawer>
  );
}


// ── Assets (M-4): assets linked to this project; link / unlink (Undo) ───────
export function ProjectAssetsTab({ project }) {
  const addToast = useUiStore((s) => s.addToast);
  const linked = useLoad(`/api/manager/projects/${project._id}/assets`);
  const all = useLoad("/api/manager/assets");
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const linkedIds = new Set((linked.data?.assets ?? []).map((a) => a.id));
  const free = (all.data?.assets ?? []).filter((a) => !linkedIds.has(a.id));

  async function change(assetId, link, quiet) {
    setBusy(true);
    try {
      if (link) await api.post(`/api/manager/projects/${project._id}/assets`, { assetId });
      else await api.delete(`/api/manager/projects/${project._id}/assets/${assetId}`);
      await linked.reload(); setPick("");
      const a = (all.data?.assets ?? []).find((x) => x.id === assetId);
      if (!quiet) addToast({ type: "info", message: link ? `"${a?.name}" linked.` : `"${a?.name}" unlinked.`, undoAction: () => change(assetId, !link, true) });
    } catch (e) { addToast({ type: "error", message: e?.message ?? "That did not work." }); }
    finally { setBusy(false); }
  }

  const columns = [
    { key: "name", label: "Name", className: "min-w-[200px]", render: (a) => <AssetName a={a} /> },
    { key: "type", label: "Type", className: "whitespace-nowrap text-text-secondary", render: (a) => a.type },
    { key: "expiry", label: "Expires", render: (a) => <Expiry a={a} /> },
    { key: "notes", label: "Notes", className: "max-w-[280px] truncate text-text-secondary", render: (a) => a.notes || "—" },
  ];
  return (
    <div className="flex flex-col gap-4">
      {all.data && free.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <label htmlFor="link-asset" className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">Link an asset
            <select id="link-asset" value={pick} onChange={(e) => setPick(e.target.value)} className="h-9 min-w-[240px] rounded-xl px-3 font-normal">
              <option value="">Choose…</option>
              {free.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </label>
          <button type="button" className={BTN.secondary} disabled={!pick || busy} onClick={() => change(pick, true)}>Link</button>
        </div>
      )}
      <DataTable label="Project assets" columns={columns} rows={linked.data?.assets ?? []} loading={!linked.data && !linked.error} error={linked.error} onRetry={linked.reload}
        total={linked.data?.assets?.length ?? 0} pageSize={1000}
        rowActions={(a) => [{ label: "Unlink", icon: Unlink, onClick: () => change(a.id, false) }]}
        empty={<EmptyState heading="No assets linked to this project." action={{ label: "Open Assets", to: "/manager/resources?tab=assets" }} />} />
    </div>
  );
}
