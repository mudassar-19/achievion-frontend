// The three bodies of a sprint page (UX §6): Planning (Planned), Active board, Summary (Closed).
// Manager never edits tasks here (D-027): planning only adds/removes tasks from the sprint.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Minus, Gauge, Zap, CalendarClock, ListChecks, Clock, Sparkles, Users, AlertTriangle, BarChart3, Inbox, ListTodo } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import { useRoleTheme } from "@/utils/roleTheme";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { BTN } from "@/components/ui/buttons";
import useLoad from "../project/useLoad";
import { NarrativeCard, ScopeCard } from "../ai/AiCards";
import { TLScopeCard } from "../../teamlead/TLAiCards";
import { fmt } from "../project/format";

const RED = "#B01F17";
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const hours = (n) => `${Math.round(n * 10) / 10} h`;

function Line({ text, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <p className="text-sm text-text-secondary">{text}</p>
      {action && (action.to
        ? <Link to={action.to} className={BTN.secondary}>{action.label}</Link>
        : <button type="button" onClick={action.onClick} className={BTN.secondary}>{action.label}</button>)}
    </div>
  );
}

function Meter({ pct, color }) {
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-ink/[0.07]" aria-hidden="true">
      <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </span>
  );
}

function TaskRow({ t, action, marked }) {
  const who = t.assignees.map((a) => a.name).join(", ") || "Unassigned";
  return (
    <li className={`flex items-center gap-3 px-5 py-3 ${marked ? "bg-accent/[0.06]" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary" title={t.title}>{marked && <span className="mr-1.5 rounded bg-accent-tint px-1.5 py-0.5 text-[11px] font-bold text-accent-text">AI suggests</span>}{t.title}</p>
        <p className="truncate text-xs text-text-secondary tabular-nums">
          {t.priority} · {t.estimatedHours != null ? hours(t.estimatedHours) : "no estimate"} · {who}{t.deadline ? ` · due ${fmt(t.deadline)}` : ""}
        </p>
      </div>
      {action}
    </li>
  );
}

// ── Planned: backlog ⇄ sprint, capacity bar ─────────────────────────────────
export function PlanningView({ sprint, onChanged, base = "/api/manager", readOnly = false }) {
  const theme = useRoleTheme();
  const addToast = useUiStore((s) => s.addToast);
  const isManager = base === "/api/manager";
  const [marks, setMarks] = useState(null); // T-6 (D-151): AI selection; the Team Lead moves it with a separate click
  const backlog = useLoad(readOnly ? null : `${base}/sprints/${sprint.id}/backlog`);
  const [busy, setBusy] = useState(null);
  const { capacity: cap, stats } = sprint;
  const pct = cap.hours ? (stats.estimatedHours / cap.hours) * 100 : 0;
  const over = stats.estimatedHours - cap.hours;

  async function moveMarked() {
    const rows = [...marks.add.map((t) => [t, true]), ...marks.remove.map((t) => [t, false])];
    setMarks(null);
    for (const [t, add] of rows) {
      const full = (add ? backlog.data?.tasks : sprint.tasks)?.find((x) => String(x.id) === String(t.id)) ?? { id: t.id };
      await move(full, add);
    }
  }

  async function move(task, add) {
    setBusy(task.id);
    try {
      if (add) await api.post(`${base}/sprints/${sprint.id}/tasks`, { taskId: task.id });
      else await api.delete(`${base}/sprints/${sprint.id}/tasks/${task.id}`);
      backlog.setData((d) => ({ tasks: add ? d.tasks.filter((x) => x.id !== task.id) : [task, ...d.tasks] }));
      await onChanged();
    } catch (e) {
      addToast({ type: "error", message: e?.message ?? "The sprint could not be changed." });
      backlog.reload();
    } finally { setBusy(null); }
  }

  const button = (t, add) => (
    <button type="button" className={`${BTN.secondary} shrink-0`} disabled={busy === t.id} onClick={() => move(t, add)} aria-label={`${add ? "Add" : "Remove"} ${t.title}`}>
      {add ? <Plus size={14} aria-hidden="true" /> : <Minus size={14} aria-hidden="true" />}{add ? "Add" : "Remove"}
    </button>
  );

  return (
    <>
      <Panel title="Capacity" icon={Gauge}>
        <div className="flex flex-col gap-2.5 px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <p className="text-text-primary"><strong className="tabular-nums">{hours(stats.estimatedHours)}</strong> planned of <strong className="tabular-nums">{hours(cap.hours)}</strong> team capacity</p>
            {cap.hours > 0 && <p className="text-xs font-bold tabular-nums" style={{ color: over > 0 ? RED : "var(--text-secondary)" }}>{over > 0 ? `Over by ${hours(over)}` : `${hours(-over)} free`}</p>}
          </div>
          <Meter pct={pct} color={over > 0 ? RED : theme.accent} />
          <p className="text-xs text-text-secondary">
            {cap.people ? `${cap.people === 1 ? "1 person" : `${cap.people} people`} × ${plural(cap.days, "working day")} × ${cap.hoursPerDay} h (organisation working hours).` : "No team members on this project yet, so capacity is 0. Add people on the project's Team tab."}
            {stats.unestimated > 0 && ` ${plural(stats.unestimated, "task")} in the sprint ${stats.unestimated === 1 ? "has" : "have"} no estimate and count as 0 h.`}
          </p>
        </div>
      </Panel>

      {isManager && <ScopeCard sprint={sprint} onApplied={() => { backlog.reload(); onChanged(); }} />}
      {!isManager && !readOnly && <TLScopeCard sprint={sprint} onApply={setMarks} />}
      {marks && marks.add.length + marks.remove.length > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/25 bg-accent/[0.05] px-5 py-3 text-sm">
          <p className="font-semibold text-text-primary">Marked: {marks.add.length} to add, {marks.remove.length} to take out. Nothing has changed yet.</p>
          <span className="flex gap-2">
            <button type="button" className={BTN.primary} disabled={!!busy} onClick={moveMarked}>Move marked tasks</button>
            <button type="button" className={BTN.ghost} onClick={() => setMarks(null)}>Clear</button>
          </span>
        </div>
      )}

      <div className={readOnly ? "" : "grid gap-6 lg:grid-cols-2"}>
        {!readOnly && <Panel title={`Backlog${backlog.data ? ` (${backlog.data.tasks.length})` : ""}`} icon={Inbox}>
          {backlog.error ? <ErrorState message={backlog.error} onRetry={backlog.reload} />
            : !backlog.data ? <div className="flex flex-col gap-3 p-5" aria-busy="true" aria-label="Loading backlog">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
            : !backlog.data.tasks.length ? <Line text="No open tasks are waiting in this project." action={sprint.project && { label: "Open project tasks", to: isManager ? `/manager/projects/${sprint.project.id}?tab=tasks` : `/teamlead/modules/${sprint.project.id}?tab=tasks` }} />
            : <ul id="sprint-backlog" className="max-h-[60vh] divide-y divide-ink/[0.05] overflow-auto">{backlog.data.tasks.map((t) => <TaskRow key={t.id} t={t} action={button(t, true)} marked={marks?.add.some((x) => String(x.id) === String(t.id))} />)}</ul>}
        </Panel>}
        <Panel title={`In this sprint (${sprint.tasks.length})`} icon={ListTodo}>
          {!sprint.tasks.length
            ? <Line text="No tasks yet. Add them from the backlog." action={{ label: "Go to backlog", onClick: () => document.querySelector("#sprint-backlog button")?.focus() }} />
            : <ul className="max-h-[60vh] divide-y divide-ink/[0.05] overflow-auto">{sprint.tasks.map((t) => <TaskRow key={t.id} t={t} action={readOnly ? null : button(t, false)} marked={marks?.remove.some((x) => String(x.id) === String(t.id))} />)}</ul>}
        </Panel>
      </div>
      {isManager && <p className="text-xs text-text-secondary">Tasks are created and changed by the Team Lead. Here you only choose which ones go into the sprint.</p>}
    </>
  );
}

// ── Active: numbers + read-only board ───────────────────────────────────────
const COLUMNS = ["Backlog", "To-Do", "In-Progress", "In-Review", "Done"];
export function ActiveView({ sprint, onOpenTask }) {
  const theme = useRoleTheme();
  const { stats, capacity: cap } = sprint;
  return (
    <>
      <Panel title="This sprint" icon={Gauge}>
        <div className="grid grid-cols-2 divide-ink/[0.05] lg:grid-cols-4 lg:divide-x">
          <StatCard label="Velocity" value={`${stats.velocity} XP`} sub={`from ${plural(stats.done, "done task")}`} icon={Zap} color={theme.accent} />
          <StatCard label="Days left" value={stats.daysLeft} sub={`ends ${fmt(sprint.endDate)}`} icon={CalendarClock} color={stats.daysLeft <= 2 && stats.done < stats.total ? RED : theme.accent} />
          <StatCard label="Progress" value={`${stats.progressPct}%`} sub={`${stats.done} of ${plural(stats.total, "task")} done`} icon={ListChecks} color={theme.accent} />
          <StatCard label="Planned hours" value={hours(stats.estimatedHours)} sub={`of ${hours(cap.hours)} capacity`} icon={Clock} color={theme.accent} />
        </div>
        <div className="border-t border-ink/[0.05] px-5 py-4"><Meter pct={stats.progressPct} color={theme.accent} /></div>
      </Panel>

      <section aria-label="Sprint board (read-only)" className="flex flex-col gap-2">
        <div className="grid gap-3 overflow-x-auto pb-1 md:grid-cols-5">
          {COLUMNS.map((c) => {
            const list = sprint.tasks.filter((t) => t.status === c);
            return (
              <div key={c} className="flex min-w-[200px] flex-col gap-2 rounded-2xl border border-ink/[0.06] bg-ink/[0.025] p-2.5">
                <h3 className="flex items-center justify-between px-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{c.replace("-", " ")}<span className="tabular-nums">{list.length}</span></h3>
                {list.length ? list.map((t) => (
                  <button key={t.id} type="button" onClick={() => onOpenTask(t.id)}
                    className="glass-panel flex flex-col gap-1 rounded-xl border border-ink/[0.07] p-3 text-left transition-colors hover:border-accent/30">
                    <span className="line-clamp-2 text-sm font-semibold text-text-primary">{t.title}</span>
                    <span className="truncate text-xs text-text-secondary">{t.assignees.map((a) => a.name).join(", ") || "Unassigned"} · {t.xpValue} XP</span>
                  </button>
                )) : <p className="px-1 py-2 text-xs text-slate-400">None</p>}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-text-secondary">Read-only. The Team Lead moves tasks; open a card to see its details.</p>
      </section>
    </>
  );
}

// ── Closed: summary + velocity history ──────────────────────────────────────
// base: API prefix (Team Lead: "/api/teamlead"); ai: the AI paragraph (Manager only).
export function SummaryView({ sprint, base = "/api/manager", ai = true }) {
  const theme = useRoleTheme();
  const { data, error, reload } = useLoad(`${base}/sprints/${sprint.id}/summary`);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading summary">
      <Skeleton className="h-[150px] rounded-2xl" /><Skeleton className="h-64 rounded-2xl" />
    </div>
  );
  const s = data.summary;
  return (
    <>
      <Panel title="Summary" icon={ListChecks}>
        <div className="grid grid-cols-2 divide-ink/[0.05] lg:grid-cols-4 lg:divide-x">
          <StatCard label="Done vs planned" value={`${s.done} / ${s.planned}`} sub={s.planned ? `${Math.round((s.done / s.planned) * 100)}% of the plan` : "nothing was planned"} icon={ListChecks} color={theme.accent} />
          <StatCard label="Velocity" value={`${s.velocity} XP`} sub="XP of the done tasks" icon={Zap} color={theme.accent} />
          <StatCard label="On time" value={s.onTimePct != null ? `${s.onTimePct}%` : null} noDataLabel="No deadlines to judge" sub="done tasks finished by their deadline" icon={CalendarClock} color={theme.accent} />
          <StatCard label="Average AI quality" value={s.avgAiScore} noDataLabel="Not scored yet" sub="AI score where the Team Lead also scored" icon={Sparkles} color={theme.accent} />
        </div>
        {s.unfinishedMovedTo && <p className="border-t border-ink/[0.05] px-5 py-3 text-xs text-text-secondary">{plural(s.unfinished, "unfinished task")} moved to {s.unfinishedMovedTo === "Backlog" ? "the backlog" : `"${s.unfinishedMovedTo}"`}.</p>}
      </Panel>

      {ai && <NarrativeCard path={`/api/manager/ai/sprints/${sprint.id}/narrative`} feature="mgr_sprint_narrative" title="How the sprint went" auto />}

      <Panel title="Velocity history" icon={BarChart3}>
        <div className="px-3 py-4" role="img" aria-label={`Velocity per sprint: ${data.history.map((h) => `${h.name} ${h.velocity} XP`).join(", ")}`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.history} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#5B6576" }} tickLine={false} axisLine={{ stroke: "rgba(16,24,40,0.12)" }} interval={0} />
              <YAxis tick={{ fontSize: 12, fill: "#5B6576" }} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(16,24,40,0.04)" }} formatter={(v) => [`${v} XP`, "Velocity"]} contentStyle={{ borderRadius: 12, border: "1px solid rgba(16,24,40,0.08)", fontSize: 12 }} />
              <Bar dataKey="velocity" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {data.history.map((h) => <Cell key={h.id} fill={h.current ? theme.accent : "#B8C0CC"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="border-t border-ink/[0.05] px-5 py-3 text-xs text-text-secondary">Last {plural(data.history.length, "closed sprint")} of this project. This sprint is highlighted.</p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top contributors" icon={Users}>
          {s.topContributors.length ? (
            <ol className="divide-y divide-ink/[0.05]">
              {s.topContributors.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="w-5 text-xs font-bold tabular-nums text-slate-400">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-text-primary">{c.name}</span>
                  <span className="text-xs tabular-nums text-text-secondary">{plural(c.tasksDone, "task")} · {c.xp} XP</span>
                </li>
              ))}
            </ol>
          ) : <Line text="No task was finished in this sprint." />}
        </Panel>
        <Panel title="Delays" icon={AlertTriangle} iconColor={s.delays.length ? RED : undefined}>
          {s.delays.length ? (
            <ul className="divide-y divide-ink/[0.05]">
              {s.delays.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold text-text-primary">{d.title}</span>
                  <span className="whitespace-nowrap text-xs tabular-nums text-text-secondary">due {fmt(d.deadline)} · {d.done ? `finished ${plural(d.daysLate, "day")} late` : `not finished, ${plural(d.daysLate, "day")} over`}</span>
                </li>
              ))}
            </ul>
          ) : <Line text="No delays in this sprint." />}
        </Panel>
      </div>
    </>
  );
}
