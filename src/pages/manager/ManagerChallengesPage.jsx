// Manager Challenges list (V2 Phase 3 · M-5, UX §8). Tabs Draft | Active | Completed | Expired in the URL; 25/page.
// ?new=1 opens the create drawer (Dashboard quick action, M-8).
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Copy, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import { fmt } from "./project/format";
import QuestDrawer from "./challenge/QuestDrawer";
import { TYPE_LABEL, SCOPE_LABEL, goal, reward } from "./challenge/questText";
import { AiStatus } from "@/components/ui/AiParts";
import { useAiCall } from "@/components/ui/aiCall";

const TABS = [["draft", "Draft"], ["active", "Active"], ["completed", "Completed"], ["expired", "Expired"]];
const EMPTY = {
  draft: ["No drafts.", "New challenge"], active: ["No challenge is running.", "New challenge"],
  completed: ["No challenge has been completed yet.", "See active challenges"], expired: ["No expired challenges.", "See active challenges"],
};

export default function ManagerChallengesPage() {
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const [sp, setSp] = useSearchParams();
  const status = TABS.some(([k]) => k === sp.get("status")) ? sp.get("status") : "active";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(() => sp.get("new") === "1"); // Dashboard "New challenge" → ?new=1
  const ai = useAiCall(); // FR07-02: AI challenge draft → the normal form, pre-filled
  const [draft, setDraft] = useState(null);
  async function aiDraft() { const r = await ai.run("post", "/api/manager/ai/challenge-draft"); if (r?.draft) { setDraft(r.draft); setCreating(true); } }

  const load = useCallback(async () => {
    setError(null); setData(null);
    try { setData(await api.get(`/api/manager/quests?status=${status}&page=${page}`)); }
    catch (e) { setError(e?.message ?? "Challenges could not be loaded."); }
  }, [status, page]);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect
  const go = (k) => setSp(k === "active" ? {} : { status: k }, { replace: true });

  async function duplicate(q) {
    try { const c = await api.post(`/api/manager/quests/${q.id}/duplicate`); addToast({ type: "success", message: `Draft "${c.title}" created.` }); navigate(`/manager/challenges/${c.id}`); }
    catch (e) { addToast({ type: "error", message: e?.message ?? "Could not duplicate." }); }
  }

  const columns = [
    { key: "title", label: "Challenge", className: "min-w-[220px]", render: (q) => <span className="font-bold text-text-primary">{q.title}</span> },
    { key: "type", label: "Type", className: "whitespace-nowrap text-text-secondary", render: (q) => `${TYPE_LABEL[q.type]}${q.repeat ? " · repeats" : ""}` },
    { key: "goal", label: "Goal", className: "whitespace-nowrap", render: (q) => goal(q) },
    { key: "who", label: "Who", className: "whitespace-nowrap text-text-secondary", render: (q) => SCOPE_LABEL[q.scope] },
    { key: "done", label: "Reached", className: "whitespace-nowrap tabular-nums", render: (q) => (q.status === "draft" ? "—" : `${q.completed} / ${q.participants}`) },
    { key: "reward", label: "Reward", className: "whitespace-nowrap tabular-nums", render: (q) => reward(q) },
    { key: "deadline", label: status === "expired" || status === "completed" ? "Ended" : "Ends", className: "whitespace-nowrap tabular-nums",
      render: (q) => (q.endedEarly ? `${fmt(q.closedAt)} (ended early)` : fmt(q.closedAt ?? q.deadline)) },
  ];
  const [emptyText, emptyAction] = EMPTY[status];

  return (
    <Page>
      <PageHeader title="Challenges" subtitle="Short goals with an XP reward. Progress counts automatically from approved work."
        primary={{ label: "New challenge", onClick: () => { setDraft(null); setCreating(true); } }}
        secondary={{ label: ai.status === "loading" ? "Drafting…" : "Draft with AI", onClick: aiDraft, disabled: ai.status === "loading" }} />
      <AiStatus call={ai} loadingText="Looking at the team's weakest numbers to draft a challenge…" />
      <div role="tablist" aria-label="Challenge status" className="flex gap-1 overflow-x-auto border-b border-border-subtle"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const i = TABS.findIndex(([k]) => k === status), n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
          go(n); requestAnimationFrame(() => document.getElementById(`qtab-${n}`)?.focus());
        }}>
        {TABS.map(([k, label]) => (
          <button key={k} id={`qtab-${k}`} role="tab" type="button" aria-selected={status === k} tabIndex={status === k ? 0 : -1} onClick={() => go(k)}
            className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${status === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            {label}{data?.counts && <span className="rounded-full bg-ink/[0.06] px-1.5 text-[11px] tabular-nums">{data.counts[k]}</span>}
          </button>
        ))}
      </div>
      <DataTable label="Challenges" columns={columns} rows={data?.items ?? []} loading={!data && !error} error={error} onRetry={load}
        page={page} total={data?.total ?? 0} pageSize={data?.pageSize ?? 25}
        onPage={(n) => { const q = new URLSearchParams(sp); if (n > 1) q.set("page", String(n)); else q.delete("page"); setSp(q, { replace: true }); }}
        onRowClick={(q) => navigate(`/manager/challenges/${q.id}`)}
        rowActions={(q) => [{ label: "Open", icon: ExternalLink, onClick: () => navigate(`/manager/challenges/${q.id}`) }, { label: "Duplicate", icon: Copy, onClick: () => duplicate(q) }]}
        empty={<EmptyState heading={emptyText} action={emptyAction === "New challenge" ? { label: emptyAction, onClick: () => { setDraft(null); setCreating(true); } } : { label: emptyAction, onClick: () => go("active") }} />} />
      <QuestDrawer open={creating} draft={draft} onClose={() => { setCreating(false); setDraft(null); ai.reset(); if (sp.get("new")) { const n = new URLSearchParams(sp); n.delete("new"); setSp(n, { replace: true }); } }} onSaved={(q) => { addToast({ type: "success", message: "Draft saved. Publish it when ready." }); navigate(`/manager/challenges/${q.id}`); }} />
    </Page>
  );
}
