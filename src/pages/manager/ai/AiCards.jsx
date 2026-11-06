// Manager AI suggestion cards (M-7, UX §3/§6/§7/§9/§11, D-105..D-108). Every card: numbers on the page stay as
// they are; AI off / limit / error show one inline line; "Apply" only opens a form or fills a draft — the Manager's
// own click saves, and the server checks permission again at that moment.
import { fmtDateTime as dTime } from "@/pages/manager/project/format";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, RefreshCw, Lightbulb } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Panel from "@/components/ui/Panel";
import Drawer from "@/components/ui/Drawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { BTN } from "@/components/ui/buttons";
import { AiStatus, AiTag, AiFeedback } from "@/components/ui/AiParts";
import { useAiCall } from "@/components/ui/aiCall";

const when = (d) => (d ? dTime(d) : "");
const hours = (n) => `${Math.round((n ?? 0) * 10) / 10} h`;

function Meta({ feature, refId, snippet, cachedAt, children, base }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
      <AiTag />
      {cachedAt && <span>Written {when(cachedAt)}</span>}
      {children}
      <AiFeedback feature={feature} refId={refId} snippet={snippet} base={base} />
    </div>
  );
}

// ── (a) Dashboard insight ────────────────────────────────────────────────────
// T-6: the Team Lead uses the same card with their own API (base, feature) and wording (place).
// checkFirst: ask whether AI is on before the automatic call, so a page with AI off makes no failing request.
export function InsightCard({ base = "/api/manager", feature = "mgr_insight", place = "Dashboard and in Resources", checkFirst = false }) {
  const addToast = useUiStore((s) => s.addToast);
  const call = useAiCall();
  const [whyOpen, setWhyOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { run } = call;
  const [aiOff, setAiOff] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      if (checkFirst) {
        const st = await api.get(`${base}/ai/status`, { silent: true }).catch(() => null);
        if (!live) return;
        if (st && !st.configured) { setAiOff(true); return; }
      }
      const d = await run("get", `${base}/ai/insight`);
      if (live && d) setDismissed(!!d.dismissed);
    })();
    return () => { live = false; };
  }, [run, base, checkFirst]);
  const d = call.data, ins = d?.insight;

  async function dismiss(undo = false) {
    try {
      await api.post(`${base}/ai/insight/dismiss`, { undo }, { silent: true });
      setDismissed(!undo);
      if (!undo) addToast({ type: "info", message: "Insight dismissed for today.", undoAction: () => dismiss(true) });
    } catch (e) { addToast({ type: "error", message: e?.message ?? "Could not dismiss." }); }
  }

  if (call.status === "done" && dismissed) return null;
  if (aiOff) return <Panel title="AI insight" icon={Lightbulb} delay={0.08}><p className="px-5 py-4 text-sm text-text-secondary">AI is not configured. Everything else works as usual.</p></Panel>;
  return (
    <Panel title="AI insight" icon={Lightbulb} delay={0.08}
      action={call.status === "done" ? { label: "Refresh", onClick: () => { setDismissed(false); run("get", `${base}/ai/insight?refresh=1`); } } : undefined}>
      <div className="flex flex-col gap-2.5 px-5 py-4" aria-live="polite">
        <AiStatus call={call} loadingText="Looking for bottlenecks in today's numbers…" />
        {call.status === "done" && (!ins || ins.kind === "none") && <p className="text-sm text-text-secondary">Nothing stands out today. The numbers above look balanced.</p>}
        {call.status === "done" && ins && ins.kind !== "none" && (
          <>
            <p className="text-sm font-bold text-text-primary">{ins.title}</p>
            <p className="max-w-[75ch] text-sm text-text-secondary">{ins.body}</p>
            <div className="flex flex-wrap items-center gap-2">
              {ins.target && <Link to={ins.target.to} className={BTN.primary}>{ins.target.label}</Link>}
              <button type="button" className={BTN.secondary} onClick={() => setWhyOpen(true)}>Why?</button>
              <button type="button" className={BTN.ghost} onClick={() => dismiss()}>Dismiss</button>
            </div>
            <Meta feature={feature} base={base} refId={d.key} snippet={`${ins.title} ${ins.body}`} cachedAt={d.cachedAt} />
          </>
        )}
      </div>
      <Drawer open={whyOpen} onClose={() => setWhyOpen(false)} title="Why this insight?" width={420}>
        <div className="flex flex-col gap-3 p-5 text-sm">
          <p className="text-text-secondary">The AI read today's dashboard and workload numbers. It based this on:</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-text-primary">{(ins?.why ?? []).map((w) => <li key={w}>{w}</li>)}</ul>
          <p className="text-xs text-text-secondary">Check these on the {place} before acting. Nothing changes until you do it yourself.</p>
        </div>
      </Drawer>
    </Panel>
  );
}

// ── Narrative paragraph (sprint summary, reports) ────────────────────────────
// auto: ask straight away (sprint: one call per closed sprint, then cached). Otherwise show a cached one if any.
export function NarrativeCard({ path, feature, title = "Summary in plain words", auto = false, buttonLabel = "Summarise with AI" }) {
  const call = useAiCall();
  const { run } = call;
  useEffect(() => { run("post", path, auto ? {} : { cacheOnly: true }); }, [run, path, auto]);
  const d = call.data;
  const has = call.status === "done" && d?.narrative;
  return (
    <section aria-label={title} aria-live="polite" className="flex flex-col gap-2 rounded-2xl border border-accent/15 bg-accent/[0.03] px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary"><Sparkles size={14} aria-hidden="true" className="text-accent-text" />{title}</h2>
        {has && <button type="button" className={BTN.ghost} onClick={() => run("post", path, { refresh: true })}><RefreshCw size={13} aria-hidden="true" />Write again</button>}
        {call.status === "done" && !d?.narrative && <button type="button" className={BTN.secondary} onClick={() => run("post", path, {})}>{buttonLabel}</button>}
      </div>
      <AiStatus call={call} loadingText="Writing a short summary of these numbers…" />
      {call.status === "done" && !d?.narrative && <p className="text-xs text-text-secondary">The numbers below are complete without it. Ask the AI for a short paragraph that explains them.</p>}
      {has && (
        <>
          <p className="max-w-[80ch] text-sm leading-relaxed text-text-primary">{d.narrative}</p>
          <Meta feature={feature} refId={d.key} snippet={d.narrative} cachedAt={d.cachedAt} />
        </>
      )}
    </section>
  );
}

// ── (b) Planning: capacity-fit scope ─────────────────────────────────────────
export function ScopeCard({ sprint, onApplied }) {
  const addToast = useUiStore((s) => s.addToast);
  const call = useAiCall();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const d = call.data;
  const changes = d ? d.add.length + d.remove.length : 0;

  async function apply() {
    setBusy(true);
    let done = 0;
    try {
      for (const t of d.add) { await api.post(`/api/manager/sprints/${sprint.id}/tasks`, { taskId: t.id }); done++; }
      for (const t of d.remove) { await api.delete(`/api/manager/sprints/${sprint.id}/tasks/${t.id}`); done++; }
      addToast({ type: "success", message: `Sprint updated: ${done} ${done === 1 ? "change" : "changes"}.` });
      call.reset();
    } catch (e) {
      addToast({ type: "error", message: `${done} of ${changes} changes saved. ${e?.message ?? "The rest could not be saved."}` });
    } finally { setBusy(false); setConfirm(false); onApplied(); }
  }

  const list = (rows, label) => rows.length > 0 && (
    <div><p className="text-xs font-bold text-text-secondary">{label}</p>
      <ul className="mt-1 flex flex-col gap-0.5">{rows.map((t) => <li key={t.id} className="flex justify-between gap-3 text-sm"><span className="truncate text-text-primary">{t.title}</span><span className="shrink-0 tabular-nums text-text-secondary">{hours(t.hours)}</span></li>)}</ul></div>
  );

  return (
    <section aria-label="AI scope suggestion" aria-live="polite" className="flex flex-col gap-3 rounded-2xl border border-accent/15 bg-accent/[0.03] px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary"><Sparkles size={14} aria-hidden="true" className="text-accent-text" />Scope that fits the capacity</h2>
        {call.status !== "loading" && <button type="button" className={BTN.secondary} onClick={() => call.run("post", `/api/manager/ai/sprints/${sprint.id}/scope`)}>{d ? "Suggest again" : "Suggest with AI"}</button>}
      </div>
      <AiStatus call={call} loadingText="Comparing the backlog with the team's hours…" />
      {call.status === "idle" && <p className="text-xs text-text-secondary">The AI picks tasks so the plan fits {hours(sprint.capacity.hours)} of team capacity. You confirm every change.</p>}
      {call.status === "done" && d && (
        <>
          <p className="text-sm text-text-primary">{d.why}</p>
          {list(d.add, "Add from the backlog")}{list(d.remove, "Take out of the sprint")}
          <p className="text-xs tabular-nums text-text-secondary">Planned after the change: {hours(d.hoursAfter)} of {hours(d.capacity)}.</p>
          <div className="flex flex-wrap items-center gap-2">
            {changes > 0 ? <button type="button" className={BTN.primary} onClick={() => setConfirm(true)}>Apply…</button> : <span className="text-sm text-text-secondary">No change needed.</span>}
            <button type="button" className={BTN.ghost} onClick={call.reset}>Dismiss</button>
          </div>
          <Meta feature="mgr_sprint_scope" refId={`${sprint.id}:${[...d.add, ...d.remove].map((t) => t.id).join(",")}`} snippet={d.why} />
        </>
      )}
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} onConfirm={apply} loading={busy} confirmLabel={`Make ${changes} ${changes === 1 ? "change" : "changes"}`}
        title="Change the sprint plan?" body={`${d?.add.length ?? 0} added, ${d?.remove.length ?? 0} taken out. Planned hours become ${hours(d?.hoursAfter)} of ${hours(d?.capacity)}. Tasks themselves do not change.`} />
    </section>
  );
}

// ── (e) Rebalance hint inside the Reassign view ─────────────────────────────
export function RebalanceHint({ taskId, fromId, onApply, picked, teamLead = false }) {
  const call = useAiCall();
  const d = call.data;
  return (
    <div aria-live="polite" className="flex flex-col gap-2 rounded-xl border border-accent/15 bg-accent/[0.03] p-3">
      {call.status === "idle" && <button type="button" className={`${BTN.secondary} self-start`} onClick={() => (teamLead ? call.runIfOn("/api/teamlead/ai/status", "post", "/api/teamlead/ai/assign-hint", { taskId, from: fromId }) : call.run("post", `/api/manager/ai/tasks/${taskId}/rebalance?from=${fromId}`))}><Sparkles size={14} aria-hidden="true" />Ask AI who fits best</button>}
      <AiStatus call={call} loadingText="Comparing the candidates' load…" />
      {call.status === "done" && d && (
        <>
          <p className="text-sm text-text-primary"><span className="font-bold">AI suggests {d.name}.</span> {d.reason}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={BTN.secondary} disabled={picked === String(d.candidateId)} onClick={() => onApply(String(d.candidateId))}>{picked === String(d.candidateId) ? "Selected below" : `Select ${d.name}`}</button>
            <button type="button" className={BTN.ghost} onClick={call.reset}>Dismiss</button>
          </div>
          <Meta feature={teamLead ? "tl_assign_hint" : "mgr_rebalance"} base={teamLead ? "/api/teamlead" : undefined} refId={`${taskId}:${fromId}:${d.candidateId}`} snippet={d.reason} />
        </>
      )}
    </div>
  );
}

// ── (f) Anomaly explain ──────────────────────────────────────────────────────
export function ExplainFlag({ flagId }) {
  const call = useAiCall();
  const { run } = call;
  useEffect(() => { run("post", `/api/manager/ai/anomalies/${flagId}/explain`, { cacheOnly: true }); }, [run, flagId]);
  const d = call.data;
  return (
    <section aria-label="Explanation" aria-live="polite" className="flex flex-col gap-2 rounded-xl border border-accent/15 bg-accent/[0.03] p-3">
      {call.status === "done" && !d?.explanation && <button type="button" className={`${BTN.secondary} self-start`} onClick={() => run("post", `/api/manager/ai/anomalies/${flagId}/explain`, {})}><Sparkles size={14} aria-hidden="true" />Explain</button>}
      <AiStatus call={call} loadingText="Putting the reason into plain words…" />
      {call.status === "done" && d?.explanation && (
        <>
          <p className="text-sm leading-relaxed text-text-primary">{d.explanation}</p>
          <Meta feature="mgr_anomaly_explain" refId={d.key} snippet={d.explanation} cachedAt={d.cachedAt} />
        </>
      )}
    </section>
  );
}
