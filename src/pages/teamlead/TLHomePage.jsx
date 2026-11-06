// Team Lead Dashboard (V2 Phase 4 · T-1, UX TL §3, D-113). One call: GET /api/teamlead/home.
// One alert count (the Smart Alerts list), 8 numbers, active modules, task activity, getting started.
import { useNavigate, Link } from "react-router-dom";
import { ListChecks, Activity, ClipboardCheck, AlertTriangle, Users, UserX, Layers, Timer, Bell, BarChart3 } from "lucide-react";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import StartHereCard from "@/components/ui/StartHereCard";
import { BTN } from "@/components/ui/buttons";
import { InsightCard } from "../manager/ai/AiCards";
import useLoad from "../manager/project/useLoad";
import { fmt } from "../manager/project/format";

const RED = "#B01F17", AMBER = "#7A5200";
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const ago = (d) => {
  const m = Math.round((Date.now() - new Date(d)) / 60_000);
  return m < 60 ? `${Math.max(1, m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

function Line({ text, action }) {
  return (
    <div className="flex flex-col items-start gap-2 px-5 py-4">
      <p className="text-sm text-text-secondary">{text}</p>
      {action && <Link to={action.to} className={BTN.secondary}>{action.label}</Link>}
    </div>
  );
}

export default function TLHomePage() {
  const navigate = useNavigate();
  const { data: d, error, reload } = useLoad("/api/teamlead/home");
  const tone = (n, c) => (n ? c : "var(--accent)");

  return (
    <Page>
      <PageHeader title="Dashboard" subtitle="Your modules, tasks and how loaded your team is."
        primary={{ label: "New task", onClick: () => navigate("/teamlead/tasks?new=1") }}
        secondary={{ label: "Open review", onClick: () => navigate("/teamlead/review-submissions") }} />

      {error ? <ErrorState message={error} onRetry={reload} /> : !d ? (
        <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
          <Skeleton className="h-[230px] rounded-2xl" />
          <div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-72 rounded-2xl lg:col-span-2" /><Skeleton className="h-72 rounded-2xl" /></div>
        </div>
      ) : (
        <>
          {d.isNew && (
            <StartHereCard title="Getting started" storageKey="teamlead-home" steps={[
              { label: "Open your modules", hint: "See what your Manager assigned and accept it.", to: "/teamlead/modules" },
              { label: "Create tasks", hint: "Break the work into tasks of 1 to 14 hours.", to: "/teamlead/tasks?new=1" },
              { label: "Check team load", hint: "See who has room before you assign.", to: "/teamlead/team" },
            ]} />
          )}

          {!d.isNew && <InsightCard base="/api/teamlead" feature="tl_insight" place="Dashboard and on Team" checkFirst />}
          <Panel title="Snapshot" icon={BarChart3} delay={0.05}>
            <div className="grid grid-cols-2 divide-ink/[0.05] lg:grid-cols-4 lg:divide-x">
              <StatCard label="Total tasks" value={d.tasks.total} icon={ListChecks} to="/teamlead/tasks" color="var(--accent)" sub={`${d.tasks.done} done`} />
              <StatCard label="In progress" value={d.tasks.inProgress} icon={Activity} to="/teamlead/tasks?status=In-Progress" color="var(--accent)" sub="being worked on" />
              <StatCard label="In review" value={d.tasks.inReview} icon={ClipboardCheck} to="/teamlead/tasks?tab=review" color="var(--accent)" sub="submitted by the team" />
              <StatCard label="Overdue" value={d.tasks.overdue} icon={AlertTriangle} to="/teamlead/tasks?overdue=1" color={tone(d.tasks.overdue, RED)} sub="past the deadline" />
            </div>
            <div className="grid grid-cols-2 divide-ink/[0.05] border-t border-ink/[0.05] lg:grid-cols-4 lg:divide-x">
              <StatCard label="Review queue" value={d.reviewQueue} icon={ClipboardCheck} to="/teamlead/review-submissions" color={tone(d.reviewQueue, AMBER)} sub={d.reviewQueue ? "waiting for you" : "nothing waiting"} />
              <StatCard label="Overloaded members" value={d.overloaded} icon={Users} to="/teamlead/team" color={tone(d.overloaded, RED)} sub={d.overloaded ? "over the limit" : "everyone has room"} />
              <StatCard label="Unassigned tasks" value={d.unassigned} icon={UserX} to="/teamlead/tasks?assignee=none" color={tone(d.unassigned, AMBER)} sub="open, nobody on them" />
              <StatCard label="New modules" value={d.newModules} icon={Layers} to="/teamlead/modules?state=New" color={tone(d.newModules, AMBER)} sub={d.newModules ? "waiting for you to accept" : "all accepted"} />
            </div>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Active modules" icon={Layers} delay={0.1} className="lg:col-span-2" action={{ to: "/teamlead/modules", label: "View all" }}>
              {d.activeModules.length ? (
                <ul className="divide-y divide-ink/[0.05] px-5 py-1">
                  {d.activeModules.map((m) => (
                    <li key={m.key}>
                      <Link to={`/teamlead/modules/${m.projectId}${m.kind === "module" ? `?module=${m.id}` : ""}`} className="-mx-2 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-lg px-2 py-3 hover:bg-ink/[0.03]">
                        <span className="min-w-0 truncate text-sm font-semibold text-text-primary">{m.title}{m.kind === "module" && <span className="font-normal text-text-secondary"> · {m.project}</span>}</span>
                        <span className="text-xs font-bold" style={{ color: m.state === "New" ? AMBER : "var(--text-secondary)" }}>{m.state === "New" ? "New, not accepted" : `${m.progress}% done`}</span>
                        <span className="h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]" aria-hidden="true"><span className="block h-full rounded-full bg-accent" style={{ width: `${m.progress}%` }} /></span>
                        <span className="text-xs tabular-nums text-text-secondary">{m.deadline ? `due ${fmt(m.deadline)}` : "no deadline"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <Line text="No modules assigned yet. Your Manager assigns modules." action={{ label: "Open modules", to: "/teamlead/modules" }} />}
            </Panel>

            <div className="flex flex-col gap-6">
              <Panel title={`Alerts · ${plural(d.alerts.count, "alert")}`} icon={Bell} iconColor={d.alerts.critical ? RED : undefined} delay={0.15}>
                {d.alerts.count ? (
                  <ul className="flex flex-col gap-2 px-5 py-4">
                    {d.alerts.top.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle size={14} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: a.severity === "Critical" ? RED : AMBER }} />
                        {a.to ? <Link to={a.to} className="font-semibold text-text-primary underline-offset-2 hover:underline">{a.message}</Link> : <span className="text-text-primary">{a.message}</span>}
                      </li>
                    ))}
                    {d.alerts.count > d.alerts.top.length && <li className="text-xs text-text-secondary">and {d.alerts.count - d.alerts.top.length} more</li>}
                  </ul>
                ) : <Line text="No alerts. Nothing overdue or overloaded." />}
              </Panel>

              <Panel title="Task activity" icon={Timer} delay={0.2} action={{ to: "/teamlead/tasks", label: "All tasks" }}>
                {d.activity.length ? (
                  <ul className="flex flex-col gap-3 px-5 py-4">
                    {d.activity.map((e) => (
                      <li key={e.id} className="flex flex-col">
                        <span className="text-sm text-text-primary">{e.who ? <strong className="font-semibold">{e.who}</strong> : null}{e.who ? " · " : ""}{e.subject}</span>
                        <span className="text-xs text-text-secondary">{ago(e.at)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <Line text="No task activity in the last two weeks." action={{ label: "Open tasks", to: "/teamlead/tasks" }} />}
              </Panel>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
