// Today, the employee home at /workspace and /workspace/senior (E-2, Employee UX §4.1, D-175). Data: GET /api/workspace/today.
// Role words from ROLE_WORDS. Daily insight = numbers only (cached per day on the server); the AI line comes in E-8.
// ?task=<id> opens the task drawer here; ?trend=month switches the XP chart.
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { ArrowRight, Bug, CalendarClock, ClipboardCheck, Flame, Heart, Lightbulb, ListChecks, ListTodo, MessageSquareQuote, ShieldCheck, Swords, Trophy, TrendingUp, Zap } from "lucide-react";
import api from "@/lib/api";
import socket from "@/utils/socket";
import useAuthStore from "@/stores/authStore";
import { useRoleTheme } from "@/utils/roleTheme";
import { hpTier, HP_BURNOUT } from "@/utils/hpTier";
import { employeeKind, ROLE_WORDS } from "@/utils/employeePortal";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import StartHereCard from "@/components/ui/StartHereCard";
import { BTN } from "@/components/ui/buttons";
import useLoad from "../manager/project/useLoad";
import { fmt, fmtShort } from "../manager/project/format";
import EmployeeTaskDrawer from "./EmployeeTaskDrawer";
import EmployeeAnalytics from "./EmployeeAnalytics";
import QuestStrip from "./QuestStrip";
import { STATUS_CHIP, statusLabel } from "@/utils/employeePortal";
import { Deadline } from "./MyTasksPage";

const SUB = {
  developer: "Build it, ship it, get it reviewed. Here is what needs you today.",
  designer: "Create, iterate, get it approved. Here is what needs you today.",
  tester: "Inspect, verify, report. Here is what needs you today.",
};
const num = (v) => (Number(v) || 0).toLocaleString();

function Insight({ insight }) {
  const [why, setWhy] = useState(false);
  return (
    <Panel title="Daily insight" icon={Lightbulb}>
      <div className="flex flex-col gap-3 px-5 py-4 text-sm">
        <p className="font-semibold text-text-primary">{insight.text}</p>
        <button type="button" className={`${BTN.ghost} self-start`} aria-expanded={why} aria-controls="insight-why" onClick={() => setWhy((v) => !v)}>Why?</button>
        {why && (
          <div id="insight-why">
            <p className="text-xs text-text-secondary">Picked today from these numbers. It is the same line all day.</p>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">{insight.why.map((w) => <div key={w.label} className="contents"><dt className="text-text-secondary">{w.label}</dt><dd className="text-right font-semibold tabular-nums">{num(w.value)}</dd></div>)}</dl>
          </div>
        )}
      </div>
    </Panel>
  );
}

function Trend({ trend, accent }) {
  const [sp, setSp] = useSearchParams();
  const month = sp.get("trend") === "month";
  const points = (month ? trend.month : trend.week).map((p) => ({ ...p, label: fmtShort(`${p.date}T12:00:00`) }));
  const total = points.reduce((s, p) => s + p.xp, 0);
  const pick = (m) => { const n = new URLSearchParams(sp); if (m) n.set("trend", "month"); else n.delete("trend"); setSp(n, { replace: true }); };
  return (
    <Panel title="XP trend" icon={TrendingUp}>
      <div className="px-3 pb-3 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2">
          <p className="text-sm text-text-secondary"><strong className="tabular-nums text-text-primary">{num(total)} XP</strong> in the last {month ? "30" : "7"} days</p>
          <div role="radiogroup" aria-label="Period" className="flex rounded-xl border border-ink/[0.08] bg-ink/[0.03] p-0.5">
            {[[false, "Week"], [true, "Month"]].map(([m, l]) => <button key={l} type="button" role="radio" aria-checked={month === m} onClick={() => pick(m)} className={`min-h-8 rounded-[10px] px-3 text-xs font-bold ${month === m ? "bg-bg-surface text-accent-text shadow-[0_1px_2px_rgba(20,32,61,0.08)]" : "text-text-secondary hover:text-text-primary"}`}>{l}</button>)}
          </div>
        </div>
        <div className="mt-2 h-[180px]" role="img" aria-label={`XP per day for the last ${month ? 30 : 7} days, ${total} XP in total`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs><linearGradient id="xpfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accent} stopOpacity={0.22} /><stop offset="100%" stopColor={accent} stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5B6576" }} tickLine={false} axisLine={{ stroke: "rgba(16,24,40,0.12)" }} interval={month ? 6 : 0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5B6576" }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}k` : v)} />
              <Tooltip formatter={(v) => [`${v} XP`, "Net"]} contentStyle={{ borderRadius: 12, border: "1px solid rgba(16,24,40,0.08)", fontSize: 12 }} />
              <Area type="monotone" dataKey="xp" stroke={accent} strokeWidth={2} fill="url(#xpfill)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  );
}

export default function TodayPage() {
  const user     = useAuthStore((s) => s.user);
  const isViewAs = useAuthStore((s) => !!s.viewAs);
  const kind = employeeKind(user?.role) ?? "developer";
  const { accent } = useRoleTheme();
  const [sp, setSp] = useSearchParams();
  const { data: d, error, reload, setData } = useLoad("/api/workspace/today");
  const { data: qd } = useLoad(kind === "tester" ? "/api/quality/today" : null); // E-4: the Tester's Quality numbers
  const refresh = useCallback(() => { api.get("/api/workspace/today").then(setData).catch(() => {}); }, [setData]);
  useEffect(() => { socket.on("task:status_changed", refresh); return () => socket.off("task:status_changed", refresh); }, [refresh]);
  const openTask = (id) => { const n = new URLSearchParams(sp); n.delete("compose"); if (id) n.set("task", id); else n.delete("task"); setSp(n); };
  const setCompose = (on) => { const n = new URLSearchParams(sp); if (on) n.set("compose", "1"); else n.delete("compose"); setSp(n); };
  const words = ROLE_WORDS[kind];

  const header = <PageHeader title="Today" subtitle={SUB[kind]} />;
  if (error) return <Page>{header}<ErrorState message={error} onRetry={reload} /></Page>;
  if (!d) return (
    <Page>{header}<div aria-busy="true" aria-label="Loading your day" className="flex flex-col gap-6">
      <Skeleton className="h-[148px] rounded-2xl" /><div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-72 rounded-2xl lg:col-span-2" /><Skeleton className="h-72 rounded-2xl" /></div>
    </div></Page>
  );
  const t = d.tiles, hp = hpTier(d.hp), low = d.hp < HP_BURNOUT;
  return (
    <Page>
      {header}
      <StartHereCard storageKey={`employee-${user?.id ?? "me"}`} steps={[
        { label: "Open a task", hint: `Start one of your tasks: ${words[0]} it.`, to: "/workspace/tasks" },
        { label: "Submit your work", hint: "In the task, press Submit work. Your Team Lead reviews it.", to: "/workspace/tasks?status=In-Progress" },
        { label: "Check the board", hint: "See your XP and your place on the leaderboard.", to: "/workspace/leaderboard" },
      ]} />

      <Panel title="Your day" icon={CalendarClock}>
        <div className="grid grid-cols-2 divide-ink/[0.05] lg:grid-cols-4 lg:divide-x">
          <StatCard label="Due today" value={num(t.dueToday)} icon={CalendarClock} color={accent} to="/workspace/tasks" sub={t.dueToday ? "Start with the nearest" : "Nothing due today"} />
          <StatCard label="Open tasks" value={num(t.open)} icon={ListChecks} color={accent} to="/workspace/tasks" />
          <StatCard label={`XP to level ${t.level + 1}`} value={num(t.xpToNext)} icon={Zap} color={accent} to="/workspace/profile" sub={`${num(t.currentXp)} of ${num(t.maxXp)} XP`} />
          <StatCard label="Day streak" value={num(t.streak)} icon={Flame} color={accent} sub={t.streak >= 7 ? "On fire" : t.streak ? "Keep it going" : "Finish a task to start one"} />
        </div>
      </Panel>

      {kind === "tester" && (
        <Panel title="Quality today" icon={ShieldCheck}>
          {qd ? (
            <div className="grid grid-cols-2 divide-ink/[0.05] lg:grid-cols-4 lg:divide-x">
              <StatCard label="Waiting for your QA" value={num(qd.qaWaiting)} icon={ClipboardCheck} color={accent} to="/workspace/qa" sub="Inspect and sign off" />
              <StatCard label="Your open bugs" value={num(qd.myOpenBugs)} icon={Bug} color={accent} to="/workspace/bugs?mine=1" sub="Reported by you, not closed" />
              <StatCard label="Fixed, to verify" value={num(qd.fixedToVerify)} icon={ShieldCheck} color={accent} to="/workspace/bugs?status=Fixed" sub="Verify or reopen" />
              <StatCard label="Test runs this week" value={`${num(qd.week.Pass)} / ${num(qd.week.Fail)}`} icon={ListTodo} color={accent} to="/workspace/test-cases" sub={`passed / failed${qd.week.Blocked ? ` · ${qd.week.Blocked} blocked` : ""}`} />
            </div>
          ) : <div aria-busy="true" aria-label="Loading your Quality numbers" className="p-5"><Skeleton className="h-24 rounded-xl" /></div>}
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Panel title="Next best action" icon={ArrowRight}>
            {d.next ? (
              <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1 basis-60">
                  <p className="text-base font-bold text-text-primary [overflow-wrap:anywhere]">{d.next.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-text-secondary"><StatusChip status={STATUS_CHIP[d.next.status]} label={statusLabel(d.next.status)} size="xs" /><span>{d.next.priority} priority</span>·<Deadline r={d.next} />·<span className="tabular-nums">{d.next.xp} XP</span></p>
                  <p className="mt-1 text-xs text-text-secondary">Picked by the nearest deadline, then priority.</p>
                </div>
                <button type="button" className={BTN.primary} onClick={() => openTask(d.next.id)}>{d.next.status === "To-Do" ? "Open and start" : "Continue"}</button>
              </div>
            ) : <EmptyState heading="Nothing to start right now" body="Tasks waiting for review or for a prerequisite are not listed here." action={{ label: "Open My tasks", to: "/workspace/tasks" }} />}
          </Panel>

          <Panel title="My tasks today" icon={ListChecks} action={{ label: "All tasks", to: "/workspace/tasks" }}>
            {d.today.length ? (
              <ul className="divide-y divide-ink/[0.05]">{d.today.map((r) => (
                <li key={r.id}><button type="button" onClick={() => openTask(r.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-left text-sm hover:bg-ink/[0.03]">
                  <span className="min-w-0 flex-1 basis-48 truncate font-semibold text-text-primary" title={r.title}>{r.title}</span>
                  <StatusChip status={STATUS_CHIP[r.status]} label={statusLabel(r.status)} size="xs" />
                  <span className="text-xs"><Deadline r={r} /></span>
                  <span className="w-14 text-right text-xs font-semibold tabular-nums text-text-secondary">{r.xp} XP</span>
                </button></li>))}</ul>
            ) : <EmptyState heading="No open tasks" body="Your Team Lead assigns them; check Quests meanwhile." action={{ label: "Open Quests", to: "/workspace/quests" }} />}
          </Panel>

          <Trend trend={d.trend} accent={accent} />
          <EmployeeAnalytics kind={kind} accent={accent} />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Insight insight={d.insight} />

          <Panel title="Health" icon={Heart}>
            {isViewAs ? (
              <p className="px-5 py-4 text-sm italic text-slate-400">Hidden in View as</p>
            ) : (
              <div className="flex flex-col gap-2 px-5 py-4 text-sm">
                <p className="flex justify-between"><span className="font-semibold">{hp.label}</span><span className="tabular-nums text-text-secondary">{num(d.hp)} / 100 HP</span></p>
                <div className="h-2 overflow-hidden rounded-full bg-ink/[0.08]" role="progressbar" aria-label="HP" aria-valuenow={d.hp} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, d.hp))}%`, background: hp.color }} /></div>
                {low ? <p role="status" className="text-text-primary">Your HP is low. Take short breaks and finish one task at a time. If the load is too much, tell your Team Lead in a task comment.</p>
                  : <p className="text-xs text-text-secondary">HP drops with missed deadlines and comes back as you deliver.</p>}
              </div>
            )}
          </Panel>

          <Panel title="Your rank" icon={Trophy} action={{ label: "Leaderboard", to: "/workspace/leaderboard" }}>
            {d.rank ? (
              <div className="px-5 py-4 text-sm">
                <p className="text-2xl font-black tabular-nums text-text-primary">#{d.rank.rank} <span className="text-sm font-semibold text-text-secondary">of {d.rank.total} in your team</span></p>
                <p className="mt-1 text-text-secondary">{d.rank.gap ? <><strong className="tabular-nums text-text-primary">{num(d.rank.gap)} XP</strong> to reach #{d.rank.nextRank}{d.rank.ahead ? ` (${d.rank.ahead})` : ""}.</> : "You lead your team. Keep it up."}</p>
              </div>
            ) : <p className="px-5 py-4 text-sm text-text-secondary">Your team rank shows once at least two people on your projects have XP.</p>}
          </Panel>

          <Panel title="Latest feedback" icon={MessageSquareQuote} action={{ label: "My submissions", to: "/workspace/submissions" }}>
            {d.feedback ? (
              <button type="button" onClick={() => openTask(d.feedback.taskId)} className="flex w-full flex-col gap-1 px-5 py-4 text-left text-sm hover:bg-ink/[0.03]">
                <span className="flex flex-wrap items-center gap-2"><StatusChip status={d.feedback.kind === "approved" ? "approved" : "at_risk"} label={d.feedback.kind === "approved" ? "Approved" : "Revision requested"} size="xs" /><span className="text-xs text-text-secondary">{fmt(d.feedback.at)}</span></span>
                <span className="truncate font-semibold text-text-primary" title={d.feedback.title}>{d.feedback.title}</span>
                <span className="text-text-secondary [overflow-wrap:anywhere]">{d.feedback.kind === "approved" ? (d.feedback.score != null ? `Score ${d.feedback.score}${d.feedback.stars ? ` · ${d.feedback.stars} of 5 stars` : ""}` : "Approved.") : d.feedback.reason || "Open the task to see what to change."}</span>
              </button>
            ) : <p className="px-5 py-4 text-sm text-text-secondary">No reviews yet. Your first result shows here.</p>}
          </Panel>

          <Panel title="Quests" icon={Swords}>
            <QuestStrip />
          </Panel>
        </div>
      </div>

      <EmployeeTaskDrawer taskId={sp.get("task")} onClose={() => openTask(null)} onOpenTask={openTask} onChanged={refresh} compose={sp.get("compose") === "1"} onComposeChange={setCompose} />
    </Page>
  );
}
