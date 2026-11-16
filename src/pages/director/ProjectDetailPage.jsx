// Director project page (UI-B, master list item 5): list -> project overview -> module detail. READ-ONLY.
// D-027: no individual performance scores. Data: GET /api/director/projects/:id/overview.
import { Link, useParams } from "react-router-dom";
import { ClipboardList, Gauge, Layers, ListChecks, CalendarRange, ShieldAlert } from "lucide-react";
import { DIRECTOR_FEATURES as DF } from "@/lib/directorFeatures";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import HealthBadge from "@/components/ui/HealthBadge";
import StatusChip from "@/components/ui/StatusChip";
import useLoad from "@/pages/manager/project/useLoad";
import { fmt } from "@/pages/manager/project/format";
import { NotSet, DateText, Field, Summary, Stat, Stats, ProgressBar, TaskStatusBar, ProjectStatusChip, ModuleStateChip, PageSkeleton } from "./project/parts";

const EXT = {
  pending: ["pending", "Waiting for a decision"], approved: ["approved", "Approved"], rejected: ["rejected", "Rejected"],
  counter_proposed: ["pending", "Counter-proposed"], auto_applied: ["approved", "Applied automatically"],
};
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function ModuleRow({ projectId, m }) {
  return (
    <li>
      <Link to={`/director/projects/${projectId}/modules/${m.id}`}
        className="grid grid-cols-1 items-center gap-x-5 gap-y-2 px-5 py-3.5 text-sm hover:bg-ink/[0.03] md:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_auto]">
        <span className="min-w-0">
          <span title={m.title} className="block truncate font-bold text-text-primary">{m.title}</span>
          <span className="mt-1 flex items-center gap-2"><ModuleStateChip state={m.state} />
            {m.overdue > 0 && <span className="text-xs font-semibold text-[#B01F17]">{m.overdue} overdue</span>}</span>
        </span>
        <span className="min-w-0 truncate text-text-primary" title={m.teamLead?.name}>
          <span className="text-text-secondary md:hidden">Team Lead: </span>{m.teamLead?.name ?? <NotSet>No Team Lead yet</NotSet>}
        </span>
        <span className="flex min-w-0 items-center gap-3">
          <ProgressBar pct={m.progressPct} label={`${m.title} progress`} className="flex-1" />
          <span className="min-w-[5.5rem] shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-text-secondary"><strong className="text-sm text-text-primary">{m.progressPct}%</strong> · {m.done}/{m.tasks}</span>
        </span>
        <span className="min-w-0 text-[13px] text-text-secondary">
          {m.startDate || m.dueDate
            ? <span className="tabular-nums">{m.startDate ? fmt(m.startDate) : "No start date"} to {m.dueDate ? fmt(m.dueDate) : "no deadline"}</span>
            : <NotSet>No dates set</NotSet>}
        </span>
        <span className="justify-self-start md:justify-self-end"><HealthBadge score={m.health.score} band={m.health.band} /></span>
      </Link>
    </li>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { data: p, error, reload } = useLoad(`/api/director/projects/${id}/overview`);

  if (error) return (
    <Page>
      {/not found|invalid project id/i.test(error)
        ? <EmptyState heading="This project does not exist or is not in your organization." action={{ label: "Back to Projects", to: "/director/projects" }} />
        : <ErrorState message={error} onRetry={reload} />}
    </Page>
  );
  if (!p) return <Page><PageSkeleton label="Loading project" /></Page>;

  const { tasks: t, modules: mod, hours } = p;
  const leads = p.teamLeads.map((l) => l.name).join(", ");
  return (
    <Page>
      <div>
        <Breadcrumb items={[{ label: "Projects", to: "/director/projects" }, { label: p.title }]} />
        <PageHeader title={p.title}
          subtitle={<span className="inline-flex flex-wrap items-center gap-2"><ProjectStatusChip status={p.status} size="xs" /><HealthBadge score={p.health.score} band={p.health.band} /></span>} />
        {p.description && <p title={p.description} className="mt-2 max-w-[75ch] text-sm leading-relaxed text-text-secondary [overflow-wrap:anywhere] line-clamp-2">{p.description}</p>}
      </div>

      <Panel title="Summary" icon={ClipboardList}>
        <Summary>
          <Field label="Status">{p.status}</Field>
          <Field label="Deadline"><DateText value={p.deadline} empty="No deadline set" /></Field>
          <Field label="Manager" title={p.manager?.name}>{p.manager?.name ?? <NotSet />}</Field>
          <Field label={p.teamLeads.length === 1 ? "Team Lead" : "Team Leads"} title={leads || undefined}>{leads || <NotSet />}</Field>
          <Field label="Category">{p.category ?? <NotSet />}</Field>
          <Field label="Priority">{p.priority ?? <NotSet />}</Field>
        </Summary>
      </Panel>

      <Panel title="Progress" icon={Gauge} delay={0.05}>
        <Stats>
          <Stat label="Complete" value={`${p.progress}%`} detail={t.total ? `${t.done} of ${plural(t.total, "task")} done` : "No tasks yet"}>
            <ProgressBar pct={p.progress} label="Project progress" className="mt-2.5" />
          </Stat>
          <Stat label="Modules done" value={mod.done} unit={`of ${mod.total}`} detail={mod.total ? `${mod.running} running · ${mod.remaining} not started` : "No modules yet"} />
          <Stat label="Tasks overdue" value={t.overdue} tone={t.overdue > 0 ? "danger" : undefined} detail={`${t.inProgress} in progress · ${t.inReview} in review`} />
          <Stat label="Open hours" value={hours.open} unit="h" detail={hours.planned ? `of ${hours.planned} h planned` : "No task has an estimate"} />
        </Stats>
      </Panel>

      <Panel title={`Modules (${mod.total})`} icon={Layers} delay={0.1}>
        {p.moduleList.length
          ? <ul className="divide-y divide-ink/[0.05]">{p.moduleList.map((m) => <ModuleRow key={m.id} projectId={p.id} m={m} />)}</ul>
          : <p className="px-5 py-4 text-sm text-text-secondary">No modules yet. The Manager splits the project into modules and gives each one a Team Lead.</p>}
      </Panel>

      <Panel title="Tasks by status" icon={ListChecks} delay={0.15}>
        <TaskStatusBar counts={t} />
      </Panel>

      {DF.risks && (
        <Panel title={`Open risks (${p.risks.length})`} icon={ShieldAlert} delay={0.2}>
          {p.risks.length ? (
            <ul className="divide-y divide-ink/[0.05]">
              {p.risks.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span title={r.title} className="min-w-0 truncate font-semibold text-text-primary">{r.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-text-secondary">{r.category} · rating {r.rating} of 25</span>
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-4 text-sm text-text-secondary">No open risks on this project.</p>}
        </Panel>
      )}

      <Panel title={`Extension history (${p.extensions.length})`} icon={CalendarRange} delay={0.2}>
        {p.extensions.length ? (
          <ul className="divide-y divide-ink/[0.05]">
            {p.extensions.map((e) => {
              const [chip, label] = EXT[e.status] ?? ["on_hold", e.status];
              return (
                <li key={e.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1 basis-60">
                    <span title={e.subject ?? "Project deadline"} className="block truncate font-semibold text-text-primary">{e.subject ?? "Project deadline"}</span>
                    <span className="block text-xs text-text-secondary [overflow-wrap:anywhere] line-clamp-2" title={e.reason}>
                      {plural(e.requestedDays, "day")} asked on {fmt(e.requestedAt)}{e.reason ? ` · ${e.reason}` : ""}
                    </span>
                  </span>
                  <StatusChip status={chip} label={label} size="xs" />
                </li>
              );
            })}
          </ul>
        ) : <p className="px-5 py-4 text-sm text-text-secondary">No deadline extension was asked for on this project.</p>}
      </Panel>
    </Page>
  );
}
