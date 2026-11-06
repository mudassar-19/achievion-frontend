// Team Lead Performance (T-5, D-144; UX TL v4 §11, FR10-03/05, TL-11). Same numbers as the Manager's reports, only the TL's
// own team. Tabs in the URL. Filters: module, sprint, 7d / 30d / this month. PDF after a preview.
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Activity, Gauge } from "lucide-react";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import FilterChips from "@/components/ui/FilterChips";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import useLoad from "../manager/project/useLoad";
import { fmt, fmtDateTime } from "../manager/project/format";
import { reportQuery } from "../manager/report/useReport";
import { DeliveryTab, PeopleTab, XpTab } from "../manager/report/ReportTabs";
import ExportDrawer from "../manager/report/ExportDrawer";
import MemberDrawer from "../manager/resources/MemberDrawer";
import TaskDetailDrawer from "./task/TaskDetailDrawer";

const BASE = "/api/teamlead/performance";
const TABS = [["delivery", "Delivery"], ["people", "People"], ["xp", "XP trend"], ["activity", "Activity"], ["sprints", "Sprint health"]];
const EXTRA = { people: ["sort", "dir"], xp: ["bucket", "member"], activity: ["kind"] };
const RANGES = [{ value: "7d", label: "Last 7 days" }, { value: "30d", label: "Last 30 days" }, { value: "month", label: "This month" }];
const KINDS = [["status", "Status changes"], ["submitted", "Submissions"], ["reviewed", "Reviews"], ["comment", "Comments"], ["edited", "Edits"], ["time", "Time logs"], ["extension", "Extensions"]].map(([value, label]) => ({ value, label }));
const HEALTH = { planned: ["Planned", "#3A4659"], closed: ["Closed", "#3A4659"], empty: ["No tasks", "#7A4B00"], on_track: ["On track", "#0E6A30"], behind: ["Behind", "#7A4B00"], overdue: ["Past its end date", "#B01F17"] };
const KIND_LABEL = { status: "Status", submitted: "Submitted", reviewed: "Review", comment: "Comment", edited: "Edit", time: "Time", extension: "Extension", escalated: "Escalated", created: "Created" };
const select = "h-9 min-w-0 max-w-[240px] truncate rounded-xl border border-border-subtle bg-bg-surface px-3 text-sm font-semibold text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-50";

function ActivityTab({ query, onOpen }) {
  const { data, error, reload } = useLoad(`${BASE}/activity?${query}`);
  return (
    <>
      <FilterChips label="Show" param="kind" options={KINDS} />
      <Panel title={data ? `Activity (${data.total > data.items.length ? `latest ${data.items.length} of ${data.total}` : data.total})` : "Activity"} icon={Activity}>
        {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <div className="p-5"><Skeleton className="h-40 rounded-xl" /></div>
          : !data.items.length ? <EmptyState heading="Nothing happened in this period." body="Try a longer period or clear the filter." />
          : <ul className="divide-y divide-ink/[0.05]">{data.items.map((a, i) => (
            <li key={`${a.taskId}-${a.at}-${i}`}><button type="button" onClick={() => onOpen(a.taskId)} className="flex w-full min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-5 py-2.5 text-left text-sm hover:bg-ink/[0.03]">
              <span className="min-w-0 flex-1"><strong className="font-semibold text-text-primary">{a.who}</strong> <span className="text-text-secondary">· {KIND_LABEL[a.kind] ?? a.kind} ·</span> <span title={a.task} className="inline-block max-w-[40ch] truncate align-bottom font-semibold text-text-primary">{a.task}</span>
                {a.text && <span title={a.text} className="block truncate text-[13px] text-text-secondary">{a.text}</span>}</span>
              <time dateTime={a.at} className="shrink-0 whitespace-nowrap text-xs tabular-nums text-text-secondary">{fmtDateTime(a.at)}</time>
            </button></li>))}</ul>}
      </Panel>
    </>
  );
}

function SprintsTab({ query }) {
  const { data, error, reload } = useLoad(`${BASE}/sprints?${query}`);
  const columns = [
    { key: "name", label: "Sprint", className: "min-w-[200px]", render: (r) => <Link to={`/teamlead/sprints/${r.id}`} title={r.name} className="block min-h-6 max-w-[300px] truncate font-bold leading-6 text-text-primary hover:underline">{r.name}</Link> },
    { key: "project", label: "Project", render: (r) => <span title={r.project} className="block max-w-[220px] truncate text-text-secondary">{r.project}</span> },
    { key: "state", label: "Health", className: "whitespace-nowrap", render: (r) => <span className="font-bold" style={{ color: HEALTH[r.state]?.[1] }}>{HEALTH[r.state]?.[0] ?? r.state}</span> },
    { key: "done", label: "Done", className: "whitespace-nowrap tabular-nums", render: (r) => `${r.done} / ${r.total}` },
    { key: "progress", label: "Progress", className: "whitespace-nowrap tabular-nums", render: (r) => `${r.progressPct}%` },
    { key: "time", label: "Time used", className: "whitespace-nowrap tabular-nums", render: (r) => `${r.elapsedPct}%` },
    { key: "velocity", label: "Velocity", className: "whitespace-nowrap tabular-nums", render: (r) => `${r.velocity} XP` },
    { key: "dates", label: "Dates", className: "whitespace-nowrap tabular-nums", render: (r) => `${fmt(r.startDate)} – ${fmt(r.endDate)}` },
  ];
  const rows = data?.rows ?? [];
  return <DataTable label="Sprint health" columns={columns} rows={rows} rowKey={(r) => r.id} loading={!data && !error} error={error} onRetry={reload} total={rows.length} pageSize={Math.max(rows.length, 1)}
    empty={<EmptyState heading="No sprints in this period." action={{ label: "Open Sprints", to: "/teamlead/sprints" }} />} />;
}

export default function TLPerformancePage() {
  const [sp, setSp] = useSearchParams();
  const tab = TABS.some(([k]) => k === sp.get("tab")) ? sp.get("tab") : "delivery";
  const { data: opts, error, reload } = useLoad(`${BASE}/options`);
  const [exporting, setExporting] = useState(false);
  const [member, setMember] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const project = sp.get("project") ?? "";
  const set = (patch) => { const q = new URLSearchParams(sp); for (const [k, v] of Object.entries(patch)) (v ? q.set(k, v) : q.delete(k)); q.delete("page"); setSp(q, { replace: true }); };
  const go = (k) => { const q = new URLSearchParams(sp); for (const x of ["sort", "dir", "bucket", "member", "kind", "page"]) q.delete(x); if (k === "delivery") q.delete("tab"); else q.set("tab", k); setSp(q, { replace: true }); };

  if (error) return <Page><ErrorState message={error} onRetry={reload} /></Page>;
  if (!opts) return <Page><div aria-busy="true" aria-label="Loading performance" className="flex flex-col gap-6"><Skeleton className="h-14 w-1/3 rounded-xl" /><Skeleton className="h-[130px] rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div></Page>;
  if (!opts.projects.length) return <Page><PageHeader title="Performance" /><EmptyState heading="You are on no project yet." body="Numbers appear here once your team finishes work." action={{ label: "Open Modules", to: "/teamlead/modules" }} /></Page>;

  const query = reportQuery(sp, EXTRA[tab] ?? []);
  const dataQuery = tab === "people" ? reportQuery(sp) : query;
  const modules = opts.modules.filter((m) => String(m.projectId) === project);
  const sprints = opts.sprints.filter((s) => String(s.projectId) === project);

  return (
    <Page>
      <PageHeader title="Performance" subtitle="How your team is delivering. Only the people and projects you lead." primary={{ label: "Export PDF", onClick: () => setExporting(true) }} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-3">
        <label className="flex min-w-0 items-center gap-2 text-xs font-bold text-text-secondary">Project
          <select className={select} value={project} onChange={(e) => set({ project: e.target.value, module: null, sprint: null, member: null })}>
            <option value="">All my projects</option>{opts.projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select></label>
        <label className="flex min-w-0 items-center gap-2 text-xs font-bold text-text-secondary">Module
          <select className={select} value={sp.get("module") ?? ""} disabled={!project} onChange={(e) => set({ module: e.target.value })} title={project ? undefined : "Pick a project first"}>
            <option value="">{project ? "All modules" : "Pick a project"}</option>{modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select></label>
        <label className="flex min-w-0 items-center gap-2 text-xs font-bold text-text-secondary">Sprint
          <select className={select} value={sp.get("sprint") ?? ""} disabled={!project} onChange={(e) => set({ sprint: e.target.value })} title={project ? undefined : "Pick a project first"}>
            <option value="">{project ? "All sprints" : "Pick a project"}</option>{sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
        <FilterChips label="Period" param="range" fallback="30d" options={RANGES} />
      </div>
      <div role="tablist" aria-label="Performance sections" className="flex gap-1 overflow-x-auto border-b border-border-subtle">
        {TABS.map(([k, l]) => <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => go(k)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${tab === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}>{l}</button>)}
      </div>
      {tab === "delivery" && <DeliveryTab query={dataQuery} base={BASE} showRework />}
      {tab === "people" && <PeopleTab query={dataQuery} base={BASE} onOpen={(r) => setMember(r.id)} emptyAction={{ label: "Open Team", to: "/teamlead/team" }} />}
      {tab === "xp" && <XpTab query={dataQuery} base={BASE} />}
      {tab === "activity" && <ActivityTab query={dataQuery} onOpen={setTaskId} />}
      {tab === "sprints" && <SprintsTab query={dataQuery} />}
      <p className="flex items-center gap-1.5 text-xs text-text-secondary"><Gauge size={13} aria-hidden="true" />Same calculations as your Manager's reports.</p>
      <ExportDrawer open={exporting} onClose={() => setExporting(false)} tab={tab} query={query} base={BASE} />
      <MemberDrawer memberId={member} onClose={() => setMember(null)} onChanged={() => {}} base="/api/teamlead" memberPath="/team/members" />
      <TaskDetailDrawer taskId={taskId} onClose={() => setTaskId(null)} onOpenTask={setTaskId} />
    </Page>
  );
}
