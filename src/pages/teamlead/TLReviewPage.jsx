// Team Lead review page (T-4, D-136; UX TL v4 §8.2). Left: brief, criteria checklist, submission, revisions.
// Right: TL feedback first, score (empty), stars, AI feedback (no score until the review is finished, D-075), decision.
import FileLink from "@/components/ui/FileLink";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, History as HistoryIcon, Paperclip, ShieldCheck, Sparkles, ListChecks, PartyPopper } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Panel from "@/components/ui/Panel";
import ConfirmModal from "@/components/ui/ConfirmModal";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import { BTN } from "@/components/ui/buttons";
import { fmt, fmtDateTime } from "../manager/project/format";
import { QA_LABEL, QA_TONE, stars, scoreToStars } from "./reviewText";

const RUBBER_MS = 2 * 60_000; // server: anomalyRules.RUBBER_STAMP_MS
const Body = ({ children }) => <div className="flex min-w-0 flex-col gap-3 px-5 py-4 text-sm text-text-primary">{children}</div>;
const H3 = "text-xs font-black uppercase tracking-[0.1em] text-text-secondary";

function QaBox({ qa }) {
  if (!qa.required) return null;
  const tone = QA_TONE[qa.state];
  return (
    <div role="status" className="rounded-xl border border-ink/[0.08] px-4 py-3 text-sm" style={{ background: tone?.bg }}>
      <p className="flex items-center gap-1.5 font-black" style={{ color: tone?.fg }}><ShieldCheck size={15} aria-hidden="true" />{QA_LABEL[qa.state]}</p>
      {qa.state === "waiting" && <p className="mt-1 text-text-primary">A Tester must sign this off before you can approve. If it cannot wait, use Conditional approve with a reason.</p>}
      {qa.state === "failed" && <p className="mt-1 font-semibold text-text-primary">QA failed: send it back with Request revision.</p>}
      {qa.latest && <p className="mt-1 break-words text-text-primary">{qa.latest.by ?? "A Tester"}, {fmtDateTime(qa.latest.at)}{qa.latest.note ? `: ${qa.latest.note}` : ""}</p>}
      {qa.conditional && <p className="mt-1 break-words text-text-primary">{qa.conditional.by ?? "The reviewer"} approved without it: {qa.conditional.reason}</p>}
    </div>
  );
}

// T-5 (D-142): at the resubmission limit only the Manager can allow one more try.
const LIMIT_TEXT = { waiting: "Waiting for Manager: the task reached its resubmission limit. They decide in their Inbox.", declined: "Your Manager declined another try on this task.", allowed: "Your Manager allowed one more try." };
export function LimitNote({ state }) {
  return <p role="status" className="rounded-xl border border-[#F2A60D]/40 bg-[#FFF0D2] px-4 py-3 text-sm font-semibold text-[#7A4B00]">{LIMIT_TEXT[state]}</p>;
}

function Result({ r, nextId }) {
  return (
    <Panel title="Review finished" icon={PartyPopper}>
      <Body>
        <p className="text-2xl tracking-wide text-[#8A6100]" aria-label={`${r.stars} stars`}>{stars(r.stars)}</p>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
          <dt className="text-text-secondary">Your score</dt><dd className="font-bold tabular-nums">{r.tlScore}</dd>
          <dt className="text-text-secondary">AI score</dt><dd className="font-bold tabular-nums">{r.aiScore ?? "Not available"}</dd>
          {r.gap != null && (<><dt className="text-text-secondary">Difference</dt><dd className="font-bold tabular-nums">{r.gap}{r.flagged ? " · flagged for your Manager" : ""}</dd></>)}
          <dt className="text-text-secondary">Reviewed</dt><dd className="min-w-0 break-words">{r.by ?? "—"}, {fmtDateTime(r.at)}</dd>
        </dl>
        <div><h3 className={H3}>XP awarded</h3>
          {r.xp.length ? <ul className="mt-1">{r.xp.map((x) => <li key={x.name} className="flex justify-between gap-3"><span className="min-w-0 truncate" title={x.name}>{x.name}</span><strong className="shrink-0 tabular-nums">+{x.amount} XP</strong></li>)}</ul>
            : <p className="mt-1 text-text-secondary">The XP is being added…</p>}
        </div>
        {r.tlXp > 0 && <p className="flex justify-between gap-3"><span className="text-text-secondary">XP for your review</span><strong className="tabular-nums">+{r.tlXp} XP</strong></p>}
        {r.note && <p className="whitespace-pre-wrap break-words rounded-xl bg-ink/[0.03] px-3 py-2">{r.note}</p>}
        <div className="flex flex-wrap gap-2">
          {nextId ? <Link to={`/teamlead/review/${nextId}`} className={BTN.primary}>Next in queue</Link> : <p className="self-center text-text-secondary">The queue is empty.</p>}
          <Link to="/teamlead/review-submissions" className={BTN.secondary}>Back to queue</Link>
        </div>
      </Body>
    </Panel>
  );
}

export default function TLReviewPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const [t, setT] = useState(null);
  const [error, setError] = useState(null);
  const [checked, setChecked] = useState({});
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("");
  const [dialog, setDialog] = useState(null); // approve | conditional | revision
  const [reason, setReason] = useState("");
  const [unmet, setUnmet] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [fast, setFast] = useState(false);
  const retried = useRef(false);

  // A reply for a task no longer on screen ("Next in queue" moved on) is ignored.
  const current = useRef(taskId);
  const load = useCallback(async () => {
    try { const d = await api.get(`/api/teamlead/review/${taskId}`); if (current.current === taskId) { setT(d); setError(null); } }
    catch (e) { if (current.current === taskId) setError({ message: e?.message ?? "This could not be loaded.", status: e?.status }); }
  }, [taskId]);
  useEffect(() => { current.current = taskId; setT(null); setChecked({}); setFeedback(""); setScore(""); setDialog(null); retried.current = false; load(); }, [load, taskId]); // eslint-disable-line react-hooks/set-state-in-effect
  // The XP is added right after the answer; read it once more if it is not there yet.
  useEffect(() => {
    if (!t?.result || t.result.xp.length || retried.current) return undefined;
    retried.current = true;
    const id = setTimeout(load, 1500);
    return () => clearTimeout(id);
  }, [t, load]);

  if (error) return <Page>{error.status === 404 ? <EmptyState heading="This task is not in your projects." action={{ label: "Back to review", to: "/teamlead/review-submissions" }} /> : <ErrorState message={error.message} onRetry={load} />}</Page>;
  if (!t) return <Page><div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading review"><Skeleton className="h-14 w-1/2 rounded-xl" /><Skeleton className="h-96 rounded-2xl" /></div></Page>;

  const valid = /^\d{1,3}$/.test(score) && Number(score) <= 100;
  const star = valid ? scoreToStars(Number(score)) : null;
  const xp = star && t.xpPreview ? t.xpPreview[star] : null;
  const qaOpen = t.qa.state === "waiting" || t.qa.state === "failed";
  const canConditional = t.qa.state === "waiting"; // T-5 (D-141): a failed sign-off leaves only Request revision
  const inReview = t.status === "In-Review";

  function open(kind) {
    setErr(""); setReason("");
    if (kind === "revision") setUnmet(t.acceptanceCriteria.filter((c) => !checked[c]));
    if (kind !== "revision" && !valid) { setErr("Give a score from 0 to 100 first."); document.getElementById("rv-score")?.focus(); return; }
    setFast(star === 5 && Date.now() - new Date(t.submittedAt) < RUBBER_MS);
    setDialog(kind);
  }
  async function send(path, body, done) {
    setBusy(true); setErr("");
    try { const r = await api.post(`/api/teamlead/review/${taskId}/${path}`, body); setDialog(null); if ((await done(r)) !== "left") await load(); }
    catch (e) { setErr(e?.message ?? "That did not work."); } finally { setBusy(false); }
  }
  const approve = () => send("approve", { score: Number(score), feedback }, () => addToast({ type: "success", message: "Approved. The task is Done." }));
  const conditional = () => { if (!reason.trim()) return setErr("Write why this cannot wait for the QA sign-off."); return send("conditional", { score: Number(score), feedback, reason }, () => addToast({ type: "success", message: "Approved without QA sign-off. The reason is logged." })); };
  const revise = () => {
    if (!reason.trim()) return setErr("Write what needs to change.");
    return send("revision", { reason, unmet }, (r) => { addToast({ type: "success", message: r.reachedMax ? "Sent back. Your Manager was told it has come back many times." : "Sent back to the assignee." }); navigate(t.nextId ? `/teamlead/review/${t.nextId}` : "/teamlead/review-submissions"); return "left"; });
  };
  const dlgErr = err && dialog ? <p role="alert" className="text-sm font-semibold text-[#B01F17]">{err}</p> : null;

  return (
    <Page>
      <div>
        <Breadcrumb items={[{ label: "Review", to: "/teamlead/review-submissions" }, { label: t.title }]} />
        <PageHeader title={t.title} subtitle={<span className="inline-flex flex-wrap items-center gap-2"><StatusChip status={t.status} size="xs" /><span>{t.priority} priority · {t.type}{t.deadline ? ` · due ${fmt(t.deadline)}` : ""}{t.isLate ? " · submitted late" : ""}</span></span>} />
      </div>
      {t.mine && inReview && <p role="status" className="rounded-xl border border-[#F2A60D]/40 bg-[#FFF0D2] px-4 py-3 text-sm font-semibold text-[#7A4B00]">You worked on this task, so someone else must review it.</p>}
      {t.limitState && <LimitNote state={t.limitState} />}
      {!inReview && !t.result && !t.limitState && <p role="status" className="rounded-xl border border-border-subtle bg-bg-surface px-4 py-3 text-sm font-semibold text-text-primary">This task is not waiting for review. It is {t.status}.</p>}

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Brief" icon={FileText}>
            <Body>
              <p className="flex min-w-0 flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-text-secondary">
                <span className="min-w-0 max-w-[40ch] truncate font-semibold text-text-primary" title={t.assignees.map((a) => a.name).join(", ")}>{t.assignees.map((a) => `${a.name} (${a.role})`).join(", ") || "Nobody"}</span>
                <span className="min-w-0 max-w-[40ch] truncate" title={t.moduleTitle ?? t.projectTitle}>{t.moduleTitle ?? t.projectTitle}</span>
                <span className="whitespace-nowrap">Submitted {fmtDateTime(t.submittedAt)}</span>
              </p>
              {t.description ? <p className="whitespace-pre-wrap break-words">{t.description}</p> : <p className="text-text-secondary">No description.</p>}
            </Body>
          </Panel>
          <Panel title="Acceptance criteria" icon={ListChecks}>
            <Body>
              {t.acceptanceCriteria.length ? (
                <ul className="flex flex-col gap-1">
                  {t.acceptanceCriteria.map((c) => (
                    <li key={c}><label className="flex min-h-9 cursor-pointer items-start gap-2 rounded-lg px-1 py-1 hover:bg-ink/[0.03]">
                      <input type="checkbox" className="mt-0.5 shrink-0" disabled={!inReview} checked={!!checked[c]} onChange={(e) => setChecked((x) => ({ ...x, [c]: e.target.checked }))} />
                      <span className="min-w-0 break-words">{c}</span></label></li>
                  ))}
                </ul>
              ) : <p className="text-text-secondary">No criteria were written for this task.</p>}
              {t.benchmark && <div><h3 className={H3}>Benchmark</h3><p className="mt-1 whitespace-pre-wrap break-words">{t.benchmark}</p></div>}
            </Body>
          </Panel>
          <Panel title="Submission" icon={Paperclip}>
            <Body>
              {t.submission.note ? <p className="whitespace-pre-wrap break-words">{t.submission.note}</p> : <p className="text-text-secondary">No note.</p>}
              {t.submission.links.length > 0 && <ul className="flex flex-col gap-1">{t.submission.links.map((l, i) => <li key={i} className="min-w-0"><a href={l.url} target="_blank" rel="noopener noreferrer" title={l.url} className="inline-flex min-h-6 max-w-full items-center gap-1 font-semibold underline"><ExternalLink size={13} className="shrink-0" aria-hidden="true" /><span className="truncate">{l.label || l.url}</span></a></li>)}</ul>}
              {t.submission.files.length > 0 && <ul className="flex flex-col gap-1">{t.submission.files.map((f, i) => <li key={i} className="min-w-0"><FileLink href={f.url} target="_blank" rel="noopener noreferrer" title={f.filename} className="inline-flex min-h-6 max-w-full items-center gap-1 font-semibold underline"><Paperclip size={13} className="shrink-0" aria-hidden="true" /><span className="truncate">{f.filename}</span></FileLink></li>)}</ul>}
              {t.submission.checklist.length > 0 && <div><h3 className={H3}>Checklist the assignee ticked</h3><ul className="mt-1 list-inside list-disc break-words">{t.submission.checklist.map((c) => <li key={c}>{c}</li>)}</ul></div>}
              {t.submission.content && <details><summary className="cursor-pointer font-semibold">Text the AI read</summary><pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-ink/[0.04] p-3 text-xs">{t.submission.content}</pre></details>}
            </Body>
          </Panel>
          <Panel title={`Previous revisions (${t.revisions.length})`} icon={HistoryIcon}>
            <Body>
              {t.revisions.length ? <ul className="flex flex-col gap-2">{t.revisions.map((r, i) => (
                <li key={r.id ?? i} className="rounded-xl bg-ink/[0.03] px-3 py-2"><p className="text-xs text-text-secondary">{r.by ?? "—"}, {fmtDateTime(r.at)}</p><p className="whitespace-pre-wrap break-words">{r.comment}</p>
                  {r.unmet.length > 0 && <p className="mt-1 break-words text-[13px] text-text-secondary">Not met: {r.unmet.join("; ")}</p>}</li>))}</ul> : <p className="text-text-secondary">This is the first submission.</p>}
            </Body>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <QaBox qa={t.qa} />
          {t.result ? <Result r={t.result} nextId={t.nextId} /> : t.canReview && (
            <Panel title="Your review" icon={CheckCircle2}>
              <Body>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="rv-feedback" className="font-bold">Your feedback</label>
                  <textarea id="rv-feedback" rows={4} maxLength={2000} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What went well, what to improve…" className="rounded-xl p-3 font-normal" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="rv-score" className="font-bold">Your score (0 to 100)</label>
                  <div className="flex items-center gap-3">
                    <input id="rv-score" inputMode="numeric" autoComplete="off" value={score} onChange={(e) => { setScore(e.target.value.trim()); setErr(""); }} aria-invalid={score !== "" && !valid} className="h-10 w-24 rounded-xl px-3 tabular-nums" />
                    {star ? <span className="text-lg text-[#8A6100]" aria-label={`${star} stars`}>{stars(star)}</span> : <span className="text-[13px] text-text-secondary">{score ? "Use a whole number from 0 to 100." : "The stars follow your score."}</span>}
                  </div>
                  {err && !dialog && <p role="alert" className="text-sm font-semibold text-[#B01F17]">{err}</p>}
                </div>
              </Body>
            </Panel>
          )}
          <Panel title="AI feedback" icon={Sparkles}>
            <Body>
              {t.aiEval?.status === "done" ? (<>
                {t.aiEval.partial && <p className="inline-flex w-fit rounded-md bg-[#FFF0D2] px-2 py-0.5 text-xs font-bold text-[#7A4B00]">Partial review</p>}
                {t.aiEval.strengths?.length > 0 && <div><h3 className={H3}>Strengths</h3><ul className="mt-1 list-inside list-disc break-words">{t.aiEval.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
                {t.aiEval.improvements?.length > 0 && <div><h3 className={H3}>To improve</h3><ul className="mt-1 list-inside list-disc break-words">{t.aiEval.improvements.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
                {inReview && <p className="text-[13px] text-text-secondary">The AI score stays hidden until you finish, so it does not steer your own.</p>}
              </>) : <p className="text-text-secondary">{t.aiEval?.status === "pending" ? "The AI is still reading this." : "No AI feedback for this task. You review it alone."}</p>}
            </Body>
          </Panel>
          {t.canReview && (
            <Panel title="Decision" icon={CheckCircle2}>
              <Body>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={BTN.primary} disabled={qaOpen} title={qaOpen ? (t.qa.state === "failed" ? "QA failed: send it back" : "Needs a QA pass first") : undefined} onClick={() => open("approve")}>Approve</button>
                  <button type="button" className={BTN.secondary} onClick={() => open("revision")}>Request revision</button>
                  {canConditional && <button type="button" className={BTN.secondary} onClick={() => open("conditional")}>Conditional approve</button>}
                </div>
                {t.resubmissionCount > 0 && <p className="text-[13px] text-text-secondary">Sent back {t.resubmissionCount} of {t.maxResubmissions} times so far.</p>}
              </Body>
            </Panel>
          )}
        </div>
      </div>

      <ConfirmModal open={dialog === "approve"} onClose={() => setDialog(null)} onConfirm={approve} loading={busy} title="Approve this task?" body="It moves to Done and the XP is awarded. This cannot be undone here." confirmLabel="Approve">
        <div className="flex flex-col gap-2 text-sm">
          <p>Final score <strong className="tabular-nums">{score}</strong> · <span className="text-[#8A6100]" aria-label={`${star} stars`}>{star ? stars(star) : ""}</span></p>
          {xp != null && <p>XP for the assignee: <strong className="tabular-nums">+{xp}</strong></p>}
          {!fast && t.tlReviewXp > 0 && <p>XP for you: <strong className="tabular-nums">+{t.tlReviewXp}</strong></p>}
          <p className="line-clamp-3 break-words text-text-secondary">{feedback.trim() || "No feedback written."}</p>
          {fast && <p role="alert" className="flex items-start gap-1.5 rounded-xl bg-[#FFF0D2] px-3 py-2 font-semibold text-[#7A4B00]"><AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />Five stars under 2 minutes after the submission. You can continue, but your Manager will see a flag and you earn no review XP.</p>}
          {dlgErr}
        </div>
      </ConfirmModal>
      <ConfirmModal open={dialog === "conditional"} onClose={() => setDialog(null)} onConfirm={conditional} loading={busy} title="Approve without QA sign-off?" body="The task moves to Done and the assignee gets XP. You earn no review XP for this. Your reason is logged and shown on this task." confirmLabel="Conditional approve">
        <div className="flex flex-col gap-2 text-sm">
          <p>Final score <strong className="tabular-nums">{score}</strong>{xp != null ? <> · XP <strong className="tabular-nums">+{xp}</strong></> : null}</p>
          <label htmlFor="rv-reason" className="font-bold">Why can it not wait?</label>
          <textarea id="rv-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-xl p-3 font-normal" />
          {dlgErr}
        </div>
      </ConfirmModal>
      <ConfirmModal open={dialog === "revision"} onClose={() => setDialog(null)} onConfirm={revise} loading={busy} title="Send back to the assignee?" body="The task returns to In-Progress." confirmLabel="Request revision">
        <div className="flex flex-col gap-2 text-sm">
          <label htmlFor="rv-why" className="font-bold">What needs to change?</label>
          <textarea id="rv-why" rows={3} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-xl p-3 font-normal" />
          {t.acceptanceCriteria.length > 0 && (
            <fieldset className="max-h-40 overflow-y-auto"><legend className="font-bold">Criteria not met</legend>
              {t.acceptanceCriteria.map((c) => <label key={c} className="flex items-start gap-2 py-1"><input type="checkbox" className="mt-0.5 shrink-0" checked={unmet.includes(c)} onChange={(e) => setUnmet((u) => (e.target.checked ? [...u, c] : u.filter((x) => x !== c)))} /><span className="min-w-0 break-words">{c}</span></label>)}
            </fieldset>
          )}
          {dlgErr}
        </div>
      </ConfirmModal>
    </Page>
  );
}
