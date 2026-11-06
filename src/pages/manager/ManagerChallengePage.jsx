// One challenge (V2 Phase 3 · M-5, UX §8): live progress per member, rewards given, status and actions.
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Users, Trophy, Gift, CalendarClock, History } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import { useRoleTheme } from "@/utils/roleTheme";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { BTN } from "@/components/ui/buttons";
import { fmt } from "./project/format";
import QuestDrawer from "./challenge/QuestDrawer";
import { TYPE_LABEL, STATUS_LABEL, STATUS_KEY, SCOPE_LABEL, goal } from "./challenge/questText";

const DIALOG = {
  publish: { title: "Publish this challenge?", label: "Publish", body: (q) => `Everyone in "${q.scopeName ?? SCOPE_LABEL[q.scope]}" gets a notification and takes part automatically. After publishing, the goal, people, reward and dates cannot change.` },
  end:     { title: "End this challenge now?", label: "End challenge", body: () => "Rewards already earned are kept; nobody loses XP. Progress stops counting and a repeat will not start again." },
  delete:  { title: "Delete this draft?", label: "Delete draft", body: () => "The draft is removed. This cannot be undone.", destructive: true },
};

export default function ManagerChallengePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useRoleTheme();
  const addToast = useUiStore((s) => s.addToast);
  const [q, setQ] = useState(null);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async (quiet) => {
    if (!quiet) { setError(null); setQ(null); }
    try { setQ(await api.get(`/api/manager/quests/${id}`)); } catch (e) { if (!quiet) setError(e); }
  }, [id]);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  async function act() {
    setBusy(true);
    try {
      if (dialog === "publish") { const r = await api.post(`/api/manager/quests/${id}/publish`); addToast({ type: "success", message: `Challenge published. ${r.notified} ${r.notified === 1 ? "person was" : "people were"} notified.` }); }
      if (dialog === "end") { await api.post(`/api/manager/quests/${id}/end`); addToast({ type: "success", message: "Challenge ended. Earned rewards were kept." }); }
      if (dialog === "delete") { await api.delete(`/api/manager/quests/${id}`); addToast({ type: "success", message: "Draft deleted." }); navigate("/manager/challenges?status=draft"); return; }
      setDialog(null); load(true);
    } catch (e) { addToast({ type: "error", message: e?.data?.reasons?.join(" ") ?? e?.message ?? "That did not work." }); setDialog(null); }
    finally { setBusy(false); }
  }
  async function duplicate() {
    try { const c = await api.post(`/api/manager/quests/${id}/duplicate`); addToast({ type: "success", message: `Draft "${c.title}" created.` }); navigate(`/manager/challenges/${c.id}`); }
    catch (e) { addToast({ type: "error", message: e?.message ?? "Could not duplicate." }); }
  }

  if (error) return (
    <Page>{error.status === 404
      ? <EmptyState heading="This challenge does not exist or is not in your organisation." action={{ label: "Back to challenges", to: "/manager/challenges" }} />
      : <ErrorState message={error.message} onRetry={() => load()} />}</Page>
  );
  if (!q) return (
    <Page><div aria-busy="true" aria-label="Loading challenge" className="flex flex-col gap-6"><Skeleton className="h-14 w-1/2 rounded-xl" /><Skeleton className="h-[130px] rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div></Page>
  );

  const d = DIALOG[dialog];
  const primary = q.status === "draft" ? { label: "Publish", onClick: () => setDialog("publish") } : q.status === "active" ? { label: "End early", onClick: () => setDialog("end") } : { label: "Duplicate", onClick: duplicate };
  const columns = [
    { key: "name", label: "Member", className: "min-w-[180px]", render: (m) => <span className="font-bold text-text-primary">{m.name}</span> },
    { key: "role", label: "Role", className: "whitespace-nowrap text-text-secondary", render: (m) => m.role },
    { key: "progress", label: "Progress", className: "min-w-[220px]", render: (m) => (
      <span className="flex items-center gap-2 whitespace-nowrap">
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-ink/[0.07]" aria-hidden="true"><span className="block h-full rounded-full bg-accent" style={{ width: `${m.pct}%` }} /></span>
        <span className="text-xs tabular-nums text-text-secondary">{m.value} / {q.target}{q.metric === "avg_quality" ? ` (${m.tasks} tasks)` : ""}</span>
      </span>) },
    { key: "reward", label: "Reward", className: "whitespace-nowrap tabular-nums", render: (m) => (m.reward
      ? <span className="font-semibold text-[#0E6A30]">+{m.reward.xp} XP{m.reward.gold ? ` · +${m.reward.gold} gold` : ""} · {fmt(m.reward.at)}</span>
      : <span className="text-text-secondary">{q.status === "active" ? "Not yet" : "—"}</span>) },
  ];

  return (
    <Page>
      <div>
        <Breadcrumb items={[{ label: "Challenges", to: `/manager/challenges${q.status === "active" ? "" : `?status=${q.status}`}` }, { label: q.title }]} />
        <PageHeader title={q.title}
          subtitle={<span className="inline-flex flex-wrap items-center gap-2"><StatusChip status={STATUS_KEY[q.status]} label={q.endedEarly ? "Ended early" : STATUS_LABEL[q.status]} size="xs" />
            <span>{TYPE_LABEL[q.type]}{q.repeat ? " · repeats" : ""}{q.sprintName ? ` · ${q.sprintName}` : ""} · {goal(q)} · {SCOPE_LABEL[q.scope]}{q.scopeName ? `: ${q.scopeName}` : ""} · {fmt(q.startDate)} – {fmt(q.deadline)}</span></span>}
          primary={primary}
          secondary={q.editable !== "none" ? { label: q.status === "draft" ? "Edit" : "Edit title", onClick: () => setEditOpen(true) } : undefined}>
          {q.status === "draft" && <button type="button" className={BTN.ghost} onClick={() => setDialog("delete")}>Delete</button>}
          {q.status === "active" && <button type="button" className={BTN.secondary} onClick={duplicate}>Duplicate</button>}
        </PageHeader>
        {q.description && <p className="mt-3 max-w-[70ch] text-sm text-text-primary">{q.description}</p>}
      </div>

      <Panel title="At a glance" icon={Trophy}>
        <div className="grid grid-cols-2 divide-ink/[0.05] lg:grid-cols-4 lg:divide-x">
          <StatCard label="Taking part" value={q.status === "draft" ? null : q.participants} noDataLabel="Set when published" icon={Users} color={theme.accent} sub={SCOPE_LABEL[q.scope]} />
          <StatCard label="Reached the goal" value={q.status === "draft" ? null : q.completed} noDataLabel="—" icon={Trophy} color={theme.accent} sub={`goal: ${goal(q)}`} />
          <StatCard label="Rewards given" value={`${q.rewardsGiven.xp} XP`} icon={Gift} color={theme.accent} sub={`${q.rewardsGiven.people} ${q.rewardsGiven.people === 1 ? "person" : "people"} · ${q.rewardsGiven.gold} gold`} />
          <StatCard label={q.status === "active" ? "Days left" : "Ends"} value={q.status === "active" ? q.daysLeft : fmt(q.closedAt ?? q.deadline)} icon={CalendarClock} color={theme.accent}
            sub={q.status === "expired" ? "Nobody lost XP" : q.status === "active" ? `ends ${fmt(q.deadline)}` : ""} />
        </div>
      </Panel>

      {q.status === "draft"
        ? <Panel title="Participants" icon={Users}><p className="px-5 py-6 text-sm text-text-secondary">People are added from "{q.scopeName ?? SCOPE_LABEL[q.scope]}" when you publish. Progress then counts from approved work.</p></Panel>
        : <DataTable label="Progress per member" columns={columns} rows={q.members} total={q.members.length} pageSize={1000}
            empty={<EmptyState heading="Nobody was in this scope when it was published." action={{ label: "Duplicate with another scope", onClick: duplicate }} />} />}

      {q.history.length > 0 && (
        <Panel title="Earlier rounds" icon={History}>
          <ul className="divide-y divide-ink/[0.05]">
            {q.history.map((h) => (
              <li key={h.id}><button type="button" onClick={() => navigate(`/manager/challenges/${h.id}`)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm hover:bg-ink/[0.03]">
                <span className="font-semibold text-text-primary">{fmt(h.startDate)} – {fmt(h.deadline)}</span>
                <span className="text-xs tabular-nums text-text-secondary">{h.completed} of {h.participants} reached · {STATUS_LABEL[h.status]}</span>
              </button></li>
            ))}
          </ul>
        </Panel>
      )}

      <ConfirmModal open={!!d} onClose={() => setDialog(null)} onConfirm={act} loading={busy} confirmLabel={d?.label} title={d?.title} body={d?.body(q)} destructive={d?.destructive} />
      <QuestDrawer open={editOpen} onClose={() => setEditOpen(false)} quest={q} onSaved={() => { addToast({ type: "success", message: "Challenge saved." }); load(true); }} />
    </Page>
  );
}
