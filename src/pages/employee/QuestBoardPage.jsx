// Quest board for Developers, Designers and Testers at /workspace/quests (Batch 3: E13; UC-17, FR07-03/05/06).
// Data: GET /api/workspace/quests → { open, mine, finished }, each card with the reader's own progress only.
// Join = POST /api/workspace/quests/:id/join (safe to press twice). Rewards are paid by the server when the goal is
// reached; this page never sends XP. It re-reads itself when a reward or a task result arrives over the socket.
import { useCallback, useEffect, useState } from "react";
import { Award, CalendarClock, CheckCircle2, Coins, History, Swords, UserPlus, Users, Zap } from "lucide-react";
import api from "@/lib/api";
import socket from "@/utils/socket";
import useAuthStore from "@/stores/authStore";
import useUiStore from "@/stores/uiStore";
import { employeeKind } from "@/utils/employeePortal";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import { BTN } from "@/components/ui/buttons";
import useLoad from "../manager/project/useLoad";
import { fmtShort } from "../manager/project/format";

const SUB = {
  developer: "Extra goals on top of your tasks. Ship the work, the quest pays out on its own.",
  designer: "Extra goals on top of your tasks. Get the designs approved, the quest pays out on its own.",
  tester: "Extra goals on top of your tasks. Finish the checks, the quest pays out on its own.",
};
const num = (v) => (Number(v) || 0).toLocaleString();
const TAG = "inline-flex items-center gap-1 rounded-full border border-ink/[0.08] px-2 py-0.5 text-[11px] font-semibold text-text-secondary";
const left = (q) => (q.daysLeft === 0 ? "Ends today" : q.daysLeft === 1 ? "1 day left" : `${q.daysLeft} days left`);

export function Reward({ q }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm font-bold tabular-nums text-text-primary">
      <span className="inline-flex items-center gap-1"><Zap size={13} aria-hidden="true" className="text-accent-text" />{num(q.reward.xp)} XP</span>
      {q.reward.gold > 0 && <span className="inline-flex items-center gap-1"><Coins size={13} aria-hidden="true" color="#7A5200" />{num(q.reward.gold)} gold</span>}
      {q.reward.badge && <span data-reward-badge className="inline-flex items-center gap-1" title="Badge you get when you finish this quest"><Award size={13} aria-hidden="true" className="text-accent-text" /><span className="sr-only">Badge: </span>{q.reward.badge.name}</span>}
    </span>
  );
}
export function Progress({ q }) {
  const text = `${num(q.value)} of ${num(q.target)} ${q.unit}`;
  return (
    <div className="min-w-0">
      <p className="flex items-baseline justify-between gap-3 text-xs text-text-secondary"><span className="tabular-nums"><strong className="text-text-primary">{text}</strong></span><span className="tabular-nums">{q.pct}%</span></p>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/[0.08]" role="progressbar" aria-label={`${q.title}: ${text}`} aria-valuenow={q.pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${q.pct}%` }} />
      </div>
    </div>
  );
}

function Quest({ q, onJoin, busy, error, readOnly }) {
  const over = q.state === "done" || q.state === "expired";
  return (
    <li data-quest={q.id} data-state={q.state} className="grid gap-x-6 gap-y-3 px-5 py-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <h3 className="text-base font-bold text-text-primary [overflow-wrap:anywhere]">{q.title}</h3>
        <p className="mt-0.5 text-sm text-text-secondary [overflow-wrap:anywhere]">{q.goal}{q.description ? `. ${q.description}` : ""}</p>
        <p className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={TAG}>{q.typeLabel}</span>
          <span className={TAG}><Users size={11} aria-hidden="true" />{q.scopeLabel}{q.scope !== "individual" && ` · ${num(q.people)} in`}</span>
          {q.entry === "auto" && q.state === "joined" && <span className={TAG}>Added automatically</span>}
        </p>
      </div>
      <div className="min-w-0">
        {q.state === "open" ? <p className="text-sm text-text-secondary">Join to start counting. Work approved from now on counts toward the goal.</p> : <Progress q={q} />}
        {error && <p role="alert" className="mt-2 text-sm text-[#B01F17]">{error}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 md:flex-col md:items-end md:justify-center">
        <Reward q={q} />
        {q.state === "done" ? <span className="inline-flex items-center gap-1 text-sm font-bold text-[#0E6A30]"><CheckCircle2 size={14} aria-hidden="true" />Completed{q.finishedAt ? ` ${fmtShort(q.finishedAt)}` : ""}</span>
          : q.state === "expired" ? <span className="text-sm text-text-secondary">Ended {fmtShort(q.endedAt ?? q.deadline)}. No XP was lost.</span>
          : <span className="inline-flex items-center gap-1 text-sm text-text-secondary"><CalendarClock size={13} aria-hidden="true" /><span className="tabular-nums">{left(q)}</span> · {fmtShort(q.deadline)}</span>}
        {q.state === "open" && !over && (
          <button type="button" className={BTN.primary} disabled={busy || readOnly} onClick={() => onJoin(q)} aria-label={`Join the quest ${q.title}`}>
            <UserPlus size={14} aria-hidden="true" />{busy ? "Joining…" : "Join quest"}
          </button>
        )}
      </div>
    </li>
  );
}

export default function QuestBoardPage() {
  const user = useAuthStore((s) => s.user);
  const readOnly = useAuthStore((s) => !!s.viewAs);
  const kind = employeeKind(user?.role) ?? "developer";
  const { data: d, error, reload, setData } = useLoad("/api/workspace/quests");
  const [joining, setJoining] = useState(null);
  const [failed, setFailed] = useState({}); // quest id → message
  const refresh = useCallback(() => { api.get("/api/workspace/quests", { silent: true }).then(setData).catch(() => {}); }, [setData]);
  useEffect(() => {
    const events = ["quest:completed", "xp:awarded", "task:status_changed"];
    events.forEach((e) => socket.on(e, refresh));
    return () => events.forEach((e) => socket.off(e, refresh));
  }, [refresh]);

  async function join(q) {
    setJoining(q.id); setFailed((f) => ({ ...f, [q.id]: null }));
    try {
      await api.post(`/api/workspace/quests/${q.id}/join`, {}, { silent: true });
      useUiStore.getState().addToast({ type: "success", message: `You joined "${q.title}".` });
    } catch (e) { setFailed((f) => ({ ...f, [q.id]: e?.message ?? "Could not join. Try again." })); }
    finally { setJoining(null); refresh(); }
  }

  const header = <PageHeader title="Quests" subtitle={SUB[kind]} />;
  if (error) return <Page>{header}<ErrorState message={error} onRetry={reload} /></Page>;
  if (!d) return <Page>{header}<div aria-busy="true" aria-label="Loading your quests" className="flex flex-col gap-6"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div></Page>;
  const list = (items) => <ul className="divide-y divide-ink/[0.05]">{items.map((q) => <Quest key={q.id} q={q} onJoin={join} busy={joining === q.id} error={failed[q.id]} readOnly={readOnly} />)}</ul>;
  const nothing = !d.open.length && !d.mine.length;
  return (
    <Page>
      {header}
      {d.open.length > 0 && <Panel title={`Open to join (${d.open.length})`} icon={UserPlus}>{list(d.open)}</Panel>}
      <Panel title={`Your quests${d.mine.length ? ` (${d.mine.length})` : ""}`} icon={Swords}>
        {d.mine.length ? list(d.mine) : (
          <EmptyState heading={nothing ? "No quests right now" : "You have not joined a quest yet"}
            body={nothing ? "Your Manager publishes quests. Until then, every approved task still earns XP." : "Pick one from Open to join above. It starts counting the moment you join."}
            action={nothing ? { label: "Open My tasks", to: "/workspace/tasks" } : undefined} />
        )}
      </Panel>
      {d.finished.length > 0 && <Panel title="Finished" icon={History}>{list(d.finished)}</Panel>}
    </Page>
  );
}
