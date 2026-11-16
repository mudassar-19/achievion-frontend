// Director module page (UI-B, master list item 5). Tabs (?tab=): Overview | Tasks | People. READ-ONLY.
// D-027: People shows task and hour counts only; quality is one module-level average, never per person.
// Data: GET /api/director/projects/:id/modules/:moduleId.
import { useParams, useSearchParams } from "react-router-dom";
import { ClipboardList, Gauge, ListChecks, Users, CheckCircle2, CircleDashed } from "lucide-react";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import HealthBadge from "@/components/ui/HealthBadge";
import useLoad from "@/pages/manager/project/useLoad";
import { fmt } from "@/pages/manager/project/format";
import { NotSet, DateText, Field, Summary, Stat, Stats, ProgressBar, TaskStatusBar, ModuleStateChip, TaskStatusChip, PageSkeleton } from "./project/parts";

const TABS = [["overview", "Overview"], ["tasks", "Tasks"], ["people", "People"]];
const PREVIEW = 6;

function TaskRows({ tasks }) {
  return (
    <ul className="divide-y divide-ink/[0.05]">
      {tasks.map((t) => (
        <li key={t.id} className="flex items-center gap-3 px-5 py-3 text-sm">
          <span className="min-w-0 flex-1">
            <span title={t.title} className="block truncate font-semibold text-text-primary">{t.title}</span>
            <span className="block truncate text-xs text-text-secondary" title={t.assignees.join(", ") || undefined}>
              {t.assignees.join(", ") || "Unassigned"}
              {t.status === "Done" ? (t.completedAt ? ` · done ${fmt(t.completedAt)}` : "") : t.deadline ? ` · due ${fmt(t.deadline)}` : " · no deadline"}
              {t.overdue && <strong className="font-semibold text-[#B01F17]"> · overdue</strong>}
            </span>
          </span>
          <TaskStatusChip status={t.status} />
        </li>
      ))}
    </ul>
  );
}

// Work done / work left: the first few titles, the rest is one click away in the Tasks tab.
function WorkList({ title, icon, tasks, empty, onMore }) {
  return (
    <Panel title={`${title} (${tasks.length})`} icon={icon} className="min-w-0">
      {tasks.length ? (
        <>
          <TaskRows tasks={tasks.slice(0, PREVIEW)} />
          {tasks.length > PREVIEW && (
            <button type="button" onClick={onMore} className="w-full border-t border-ink/[0.05] px-5 py-3 text-left text-[13px] font-bold text-accent-text hover:bg-ink/[0.03]">
              See all {tasks.length} in Tasks
            </button>
          )}
        </>
      ) : <p className="px-5 py-4 text-sm text-text-secondary">{empty}</p>}
    </Panel>
  );
}

function Count({ label, value, tone }) {
  return (
    <div className="min-w-0">
      <dt className="whitespace-nowrap text-xs text-text-secondary">{label}</dt>
      <dd className={`text-sm font-bold tabular-nums ${tone === "danger" && value > 0 ? "text-[#B01F17]" : "text-text-primary"}`}>{value}</dd>
    </div>
  );
}

export default function ProjectModulePage() {
  const { id, moduleId } = useParams();
  const [sp, setSp] = useSearchParams();
  const tab = TABS.some(([k]) => k === sp.get("tab")) ? sp.get("tab") : "overview";
  const go = (k) => setSp(k === "overview" ? {} : { tab: k }, { replace: true });
  const { data: m, error, reload } = useLoad(`/api/director/projects/${id}/modules/${moduleId}`);

  if (error) return (
    <Page>
      {/not found|invalid (project|module) id/i.test(error)
        ? <EmptyState heading="This module does not exist or is not in your organization." action={{ label: "Back to the project", to: `/director/projects/${id}` }} />
        : <ErrorState message={error} onRetry={reload} />}
    </Page>
  );
  if (!m) return <Page><PageSkeleton label="Loading module" /></Page>;

  const pr = m.progress;
  const done = m.tasks.filter((t) => t.status === "Done");
  const left = m.tasks.filter((t) => t.status !== "Done");
  return (
    <Page>
      <div>
        <Breadcrumb items={[{ label: "Projects", to: "/director/projects" }, { label: m.project.title, to: `/director/projects/${m.project.id}` }, { label: m.title }]} />
        <PageHeader title={m.title}
          subtitle={<span className="inline-flex flex-wrap items-center gap-2"><ModuleStateChip state={m.state} /><HealthBadge score={m.health.score} band={m.health.band} /></span>} />
        {m.description && <p title={m.description} className="mt-2 max-w-[75ch] text-sm leading-relaxed text-text-secondary [overflow-wrap:anywhere] line-clamp-2">{m.description}</p>}
      </div>

      <div role="tablist" aria-label="Module sections" className="flex gap-1 overflow-x-auto border-b border-border-subtle"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const i = TABS.findIndex(([k]) => k === tab), n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
          go(n); requestAnimationFrame(() => document.getElementById(`dmtab-${n}`)?.focus());
        }}>
        {TABS.map(([k, l]) => (
          <button key={k} id={`dmtab-${k}`} role="tab" type="button" aria-selected={tab === k} aria-controls="dmtab-panel" tabIndex={tab === k ? 0 : -1} onClick={() => go(k)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${tab === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            {l}{k === "tasks" ? ` (${m.tasks.length})` : k === "people" ? ` (${m.people.length})` : ""}
          </button>
        ))}
      </div>

      <div id="dmtab-panel" role="tabpanel" aria-labelledby={`dmtab-${tab}`} className="flex flex-col gap-6">
        {tab === "overview" && (
          <>
            <Panel title="Summary" icon={ClipboardList}>
              <Summary>
                <Field label="Start date"><DateText value={m.startDate} /></Field>
                <Field label="End date"><DateText value={m.dueDate} empty="No deadline set" /></Field>
                <Field label="Team Lead" title={m.teamLead?.name}>{m.teamLead?.name ?? <NotSet>No Team Lead yet</NotSet>}</Field>
                <Field label="Accepted by the Team Lead"><DateText value={m.acceptedAt} empty="Not accepted yet" /></Field>
                <Field label="Average quality (whole module)">
                  {m.avgQuality ? <>{m.avgQuality.avg} of 100 <span className="font-normal text-text-secondary">· {m.avgQuality.count} reviewed tasks</span></> : <NotSet>Not enough reviewed tasks</NotSet>}
                </Field>
                <Field label="Finished"><DateText value={m.completedAt} empty="Not finished yet" /></Field>
              </Summary>
            </Panel>
            <Panel title="Progress" icon={Gauge} delay={0.05}>
              <Stats>
                <Stat label="Complete" value={`${pr.pct}%`} detail={pr.total ? `${pr.done} of ${pr.total} task${pr.total === 1 ? "" : "s"} done` : "No tasks yet"}>
                  <ProgressBar pct={pr.pct} label="Module progress" className="mt-2.5" />
                </Stat>
                <Stat label="Tasks left" value={pr.total - pr.done} detail={`${pr.inProgress} in progress · ${pr.inReview} in review`} />
                <Stat label="Tasks overdue" value={pr.overdue} tone={pr.overdue > 0 ? "danger" : undefined} detail="open and past the deadline" />
                <Stat label="Open hours" value={m.hours.open} unit="h" detail={`${m.hours.planned} h planned · ${m.hours.logged} h logged`} />
              </Stats>
              <div className="border-t border-ink/[0.05]"><TaskStatusBar counts={pr} /></div>
            </Panel>
            <div className="grid gap-6 lg:grid-cols-2">
              <WorkList title="Work left" icon={CircleDashed} tasks={left} onMore={() => go("tasks")}
                empty={m.tasks.length ? "Nothing left. Every task of this module is done." : "No tasks yet. The Team Lead breaks the module into tasks."} />
              <WorkList title="Work done" icon={CheckCircle2} tasks={done} onMore={() => go("tasks")} empty="No task is finished yet." />
            </div>
          </>
        )}

        {tab === "tasks" && (
          <Panel title={`Tasks (${m.tasks.length})`} icon={ListChecks}>
            {m.tasks.length ? <TaskRows tasks={[...left, ...done]} />
              : <p className="px-5 py-4 text-sm text-text-secondary">No tasks yet. The Team Lead breaks the module into tasks.</p>}
          </Panel>
        )}

        {tab === "people" && (
          <Panel title={`People (${m.people.length})`} icon={Users}>
            {m.people.length ? (
              <>
                <ul className="divide-y divide-ink/[0.05]">
                  {m.people.map((p) => (
                    <li key={p.id} className="grid grid-cols-1 items-center gap-x-6 gap-y-2.5 px-5 py-3.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                      <span className="min-w-0">
                        <span title={p.name} className="block truncate text-sm font-bold text-text-primary">{p.name}</span>
                        <span className="block truncate text-xs text-text-secondary">{p.role}</span>
                      </span>
                      <dl className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-6">
                        <Count label="Tasks" value={p.tasks.total} />
                        <Count label="Done" value={p.tasks.done} />
                        <Count label="Open" value={p.tasks.open} />
                        <Count label="Overdue" value={p.tasks.overdue} tone="danger" />
                        <Count label="Planned" value={`${p.hours.planned} h`} />
                        <Count label="Logged" value={`${p.hours.logged} h`} />
                      </dl>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-ink/[0.05] px-5 py-3 text-xs text-text-secondary">Task and hour counts only. A shared task's hours are split between its people. Individual performance scores are not shown here.</p>
              </>
            ) : <p className="px-5 py-4 text-sm text-text-secondary">Nobody has a task in this module yet.</p>}
          </Panel>
        )}
      </div>
    </Page>
  );
}
