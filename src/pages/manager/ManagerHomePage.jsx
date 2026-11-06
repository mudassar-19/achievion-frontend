// Manager Dashboard (V2 Phase 3 · M-1, UX §3): Command Center + Operations Hub summary in one page.
// Data: GET /api/manager/home (one call) + /api/manager/workforce (overloaded uses the Resources rule).
// M-7: AI insight card (once a day, cached; Apply opens Resources / the project / sprint; Dismiss for today).
import { fmtShort as dShort } from "@/pages/manager/project/format";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TrendingDown, TrendingUp, Minus, FolderKanban, AlertTriangle, Users, CalendarClock, BarChart3, Activity, Timer, Trophy } from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";
import PageHeader from "@/components/ui/PageHeader";
import StartHereCard from "@/components/ui/StartHereCard";
import ErrorState from "@/components/ui/ErrorState";
import Page from "@/components/ui/Page";
import Panel from "@/components/ui/Panel";
import { healthColor } from "@/components/ui/healthTone";
import StatCard from "@/components/ui/StatCard";
import Skeleton from "@/components/ui/Skeleton";
import { BTN } from "@/components/ui/buttons";
import { InsightCard } from "./ai/AiCards";

const fmtDate = (d) => dShort(d);

function Empty({ text, action }) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-2 px-5 py-4">
      <p className="text-sm text-text-secondary">{text}</p>
      {action && (
        <Link to={action.to} className={BTN.secondary}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

function Bar({ pct, color }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]" role="presentation">
      <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}

function Delta({ now, before }) {
  if (!before && !now) return <span className="text-xs text-text-secondary">no activity in either week</span>;
  if (!before) return <span className="text-xs text-text-secondary">nothing the week before</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const color = pct > 0 ? "#0E6A30" : pct < 0 ? "#9A3A06" : "var(--text-secondary)";
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color }}>
      <Icon size={13} aria-hidden="true" />{pct > 0 ? "+" : ""}{pct}% vs previous 7 days
    </span>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-[150px] rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

export default function ManagerHomePage() {
  const navigate = useNavigate();
  const theme = useRoleTheme();
  const [home, setHome] = useState(null);
  const [overloaded, setOverloaded] = useState(null); // { count, names }
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null); setHome(null);
    try {
      const [h, wf] = await Promise.all([api.get("/api/manager/home"), api.get("/api/manager/workforce")]);
      setHome(h);
      const over = (wf.members ?? []).filter((m) => m.availability === "Overloaded");
      setOverloaded({ count: wf.counts?.overloaded ?? over.length, names: over.slice(0, 3).map((m) => m.name) });
    } catch (e) {
      setError(e?.message ?? "The dashboard could not be loaded.");
    }
  }, []);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  const projects = home?.projects ?? [];
  const atRisk = projects.filter((p) => p.healthBand === "At risk" || p.healthBand === "Off track").length;
  const dl = home?.deadlinesThisWeek;
  const team = home?.teamActivity;

  const tone = (n, hex) => (n ? hex : theme.accent);

  return (
    <Page>
      <PageHeader title="Dashboard" subtitle="Delivery, capacity and team activity across your projects."
        primary={{ label: "New project", onClick: () => navigate("/manager/projects/create") }}
        secondary={{ label: "Open reports", onClick: () => navigate("/manager/reports") }}>
        <button type="button" onClick={() => navigate("/manager/sprints?new=1")} className={BTN.secondary}>New sprint</button>
        <button type="button" onClick={() => navigate("/manager/challenges?new=1")} className={BTN.secondary}>New challenge</button>
      </PageHeader>

      {error ? <ErrorState message={error} onRetry={load} /> : !home ? <HomeSkeleton /> : (
        <>
          {home.isNewOrg && (
            <StartHereCard title="Getting started" storageKey="manager-home" steps={[
              { label: "Create a project", hint: "Name it, set dates and add the team.", to: "/manager/projects/create" },
              { label: "Plan a sprint", hint: "Pick the tasks for the next one or two weeks.", to: "/manager/sprints?new=1" },
              { label: "Check team load", hint: "See who has room before you assign work.", to: "/manager/resources" },
            ]} />
          )}

          <Panel title="Snapshot" icon={BarChart3} delay={0.05}>
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-ink/[0.05]">
              <StatCard label="Active projects" value={projects.length} icon={FolderKanban} to="/manager/projects"
                color={tone(atRisk, "#7A5200")} sub={projects.length ? (atRisk ? `${atRisk} need attention` : "All on track") : "None yet"} />
              <StatCard label="Overdue tasks" value={home.tasks.overdue} icon={AlertTriangle} to="/manager/tasks"
                color={tone(home.tasks.overdue, "#B01F17")} sub={`${home.tasks.pending} pending · ${home.tasks.active} active`} />
              <StatCard label="Overloaded members" value={overloaded?.count ?? 0} icon={Users} to="/manager/resources"
                color={tone(overloaded?.count, "#B01F17")} sub={overloaded?.names?.length ? overloaded.names.join(", ") : "Everyone has room"} />
              <StatCard label="Due this week" value={dl.tasks + dl.projects.length} icon={CalendarClock} to="/manager/tasks"
                color={theme.accent} sub={`${dl.tasks} task${dl.tasks === 1 ? "" : "s"} · ${dl.projects.length} project${dl.projects.length === 1 ? "" : "s"}`} />
            </div>
          </Panel>

          {!home.isNewOrg && <InsightCard />}

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Project health" icon={Activity} delay={0.1} className="lg:col-span-2" action={{ to: "/manager/projects", label: "View all" }}>
              {projects.length ? (
                <ul className="divide-y divide-ink/[0.05] px-5 py-1">
                  {projects.slice(0, 6).map((p) => (
                    <li key={p.id}>
                      <Link to={`/manager/projects/${p.id}`} className="-mx-2 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 rounded-lg px-2 py-3 hover:bg-ink/[0.03]">
                        <span className="truncate text-sm font-semibold text-text-primary">{p.title}</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: healthColor(p.healthBand) }}>{p.healthScore == null ? p.healthBand : `${p.healthScore} · ${p.healthBand}`}</span>
                        <Bar pct={p.progressPct} color={healthColor(p.healthBand)} />
                        <span className="text-xs text-text-secondary tabular-nums">
                          {p.progressPct}% done{p.overdueTasks ? ` · ${p.overdueTasks} overdue` : ""}{p.deadline ? ` · due ${fmtDate(p.deadline)}` : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <Empty text="No active projects yet." action={{ label: "New project", to: "/manager/projects/create" }} />}
            </Panel>

            <div className="flex flex-col gap-6">
              <Panel title="Active sprints" icon={Timer} delay={0.15}>
                {home.sprints.length ? (
                  <ul className="flex flex-col gap-3 px-5 py-4">
                    {home.sprints.slice(0, 4).map((s) => (
                      <li key={s.id} className="flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <Link to={`/manager/sprints/${s.id}`} className="truncate text-sm font-semibold text-text-primary underline-offset-2 hover:underline">{s.name}</Link>
                          <span className="text-xs tabular-nums text-text-secondary">{s.done}/{s.total} tasks</span>
                        </div>
                        <Bar pct={s.pct} color={theme.accent} />
                      </li>
                    ))}
                  </ul>
                ) : <Empty text="No sprint is running." action={{ label: "New sprint", to: "/manager/sprints?new=1" }} />}
              </Panel>

              <Panel title="Team activity" icon={Trophy} delay={0.2} action={{ to: "/manager/leaderboard", label: "Top contributors" }}>
                <dl className="grid grid-cols-2 gap-4 px-5 py-4">
                  <div className="col-span-2">
                    <dt className="text-xs font-semibold text-text-secondary">XP earned, last 7 days</dt>
                    <dd className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-2xl font-black tabular-nums text-text-primary">{team.xpThisWeek.toLocaleString()}</span>
                      <Delta now={team.xpThisWeek} before={team.xpLastWeek} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-text-secondary">Active streaks</dt>
                    <dd className="mt-1 text-2xl font-black tabular-nums text-text-primary">{team.activeStreaks}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-text-secondary">Running challenges</dt>
                    <dd className="mt-1 text-2xl font-black tabular-nums text-text-primary"><Link to="/manager/challenges?status=active" className="underline-offset-2 hover:underline">{home.runningChallenges ?? 0}</Link></dd>
                  </div>
                  <div className="col-span-2 border-t border-ink/[0.05] pt-3">
                    <dt className="text-xs font-semibold text-text-secondary">Open anomalies</dt>
                    <dd className="mt-1 flex items-baseline justify-between gap-3">
                      <span className="text-2xl font-black tabular-nums" style={{ color: home.openAnomalies ? "#B01F17" : "var(--text-primary)" }}>{home.openAnomalies ?? 0}</span>
                      <Link to="/manager/anomalies" className="text-sm font-semibold text-text-secondary underline-offset-2 hover:text-text-primary hover:underline">{home.openAnomalies ? "Review them" : "Open Anomalies"}</Link>
                    </dd>
                  </div>
                </dl>
              </Panel>
            </div>
          </div>

          <Panel title="Due this week" icon={CalendarClock} delay={0.25} action={{ to: "/manager/tasks", label: "All tasks" }}>
            {dl.next.length || dl.projects.length ? (
              <ul className="divide-y divide-ink/[0.05] px-5 py-1">
                {dl.projects.map((p) => (
                  <li key={`p-${p.id}`} className="flex items-center justify-between gap-3 py-2.5">
                    <Link to={`/manager/projects/${p.id}`} className="truncate text-sm font-semibold text-text-primary hover:underline">Project: {p.title}</Link>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-text-secondary">{fmtDate(p.deadline)}</span>
                  </li>
                ))}
                {dl.next.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 truncate text-sm text-text-primary">{t.title}{t.project && <span className="text-text-secondary"> · {t.project}</span>}</span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-text-secondary">{fmtDate(t.deadline)}</span>
                  </li>
                ))}
              </ul>
            ) : <Empty text="Nothing is due in the next 7 days." action={{ label: "Open projects", to: "/manager/projects" }} />}
          </Panel>
        </>
      )}
    </Page>
  );
}
