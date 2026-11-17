// QA4 flow dialogs (Y-6, Y-7, Y-8), built on API_CONTRACT_QA4.md §1-§4. Each dialog asks the server for a preview first,
// shows what will happen, needs a reason where the rules say so, and tells the person what the server answered.
// The server is the lock; these dialogs only make the rules visible. Stacked over a drawer: layer="z-[70]".
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Select from "@/components/ui/Select";
import { fmtDate } from "@/lib/dates";

const REASON_MIN = 5;
const TXT = "w-full rounded-xl px-3 py-2 text-sm font-normal";

function Reason({ id, value, onChange, label = "Reason", hint, required = true }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">{label}{required && <span className="sr-only"> (required)</span>}
      <textarea id={id} rows={3} maxLength={500} value={value} onChange={(e) => onChange(e.target.value)} className={`${TXT} resize-none`} placeholder="Say why, in a sentence." />
      <span className="flex justify-between text-xs font-normal text-text-secondary"><span>{hint ?? (required ? `At least ${REASON_MIN} characters.` : "Optional.")}</span><span className="tabular-nums">{value.length}/500</span></span>
    </label>
  );
}
const Warn = ({ children }) => <p role="alert" className="rounded-xl border border-[#F2A60D]/40 bg-[#FFF0D2] px-3 py-2 text-sm font-semibold text-[#7A4B00]">{children}</p>;
const Fail = ({ children }) => <p role="alert" className="text-sm font-semibold text-[#B01F17]">{children}</p>;
const Skel = () => <div aria-busy="true" className="h-16 animate-pulse rounded-xl bg-ink/[0.05]" />;
const hrs = (n) => `${Math.round(Number(n) * 10) / 10} h`;

// ── Y-6 Change Team Lead (module level) ──────────────────────────────────────
export function ChangeLeadDialog({ projectId, module, candidates, onClose, onDone, layer }) {
  const addToast = useUiStore((s) => s.addToast);
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [prev, setPrev] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const base = `/api/manager/projects/${projectId}/modules/${module?.id}`;

  useEffect(() => {
    if (!to) return undefined;
    let live = true;
    api.get(`${base}/change-lead/preview?newTeamLeadId=${to}`, { silent: true })
      .then((p) => { if (live) { setPrev(p); setErr(""); } })
      .catch((e) => { if (live) { setPrev(null); setErr(e?.message ?? "The preview could not be loaded."); } });
    return () => { live = false; };
  }, [to, base]);

  const options = (candidates ?? []).filter((c) => String(c.id) !== String(module?.teamLead?.id)).map((c) => ({ value: String(c.id), label: c.name, group: c.availability || undefined }));
  const s = prev?.summary, e = prev?.effects;
  async function save() {
    setBusy(true); setErr("");
    try {
      const r = await api.post(`${base}/change-lead`, { newTeamLeadId: to, reason: reason.trim() }, { silent: true });
      addToast({ type: "success", message: `${r.module?.teamLead?.name ?? "The new Team Lead"} now leads "${r.module?.title ?? module.title}". Everyone concerned was told.` });
      onDone?.(r);
    } catch (x) { setErr(x?.data?.code === "CLOSED" ? "This module or project is closed, so its Team Lead cannot change." : x?.message ?? "Could not change the Team Lead."); }
    finally { setBusy(false); }
  }
  return (
    <ConfirmModal open={!!module} onClose={onClose} onConfirm={save} layer={layer} loading={busy}
      title={`Change Team Lead of "${module?.title ?? ""}"`} confirmLabel="Change Team Lead"
      confirmDisabled={!to || !prev || reason.trim().length < REASON_MIN}
      body={module?.teamLead ? `${module.teamLead.name} leads this module now. The new Team Lead gets the rights at once; ${module.teamLead.name} loses them.` : undefined}>
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        <div className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">New Team Lead
          <Select label="New Team Lead" value={to} onChange={(v) => { setTo(v); setPrev(null); }} options={options} placeholder="Choose a Team Lead" />
        </div>
        {to && !prev && !err && <Skel />}
        {prev && (<>
          {prev.candidate.overloaded && <Warn>{prev.candidate.name} is already over their load ({prev.candidate.utilisationPct}%). Think about someone with more room.</Warn>}
          {(prev.warnings ?? []).map((w) => <Warn key={w}>{w}</Warn>)}
          <section aria-label="What changes" className="rounded-xl border border-ink/[0.08] bg-ink/[0.02] p-3 text-sm">
            <p className="font-bold text-text-primary">What happens</p>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-text-secondary">
              <li>{e.inReview} task{e.inReview === 1 ? "" : "s"} waiting for review move to {prev.candidate.name}.</li>
              <li>{e.pendingExtensions} pending extension request{e.pendingExtensions === 1 ? "" : "s"} and {e.openFlags} open flag{e.openFlags === 1 ? "" : "s"} go with the module.</li>
              <li>{prev.candidate.name} {prev.candidate.inProject ? "is already on the project" : "is added to the project"}; leads {prev.candidate.activeModules} other module{prev.candidate.activeModules === 1 ? "" : "s"}.</li>
              <li>Past review work stays credited to {prev.current?.name ?? "the old Team Lead"}.</li>
            </ul>
          </section>
          <section aria-label="Handover summary" className="rounded-xl border border-ink/[0.08] p-3 text-sm">
            <p className="font-bold text-text-primary">Handover {prev.candidate.name} will receive</p>
            <p className="mt-1 text-text-secondary">Progress {s.progress.done}/{s.progress.total} ({s.progress.pct}%) · {s.overdue} overdue · {s.openRisks} open risk{s.openRisks === 1 ? "" : "s"} · {s.openFlags} flag{s.openFlags === 1 ? "" : "s"}{s.dueDate ? ` · due ${fmtDate(s.dueDate)}` : ""}</p>
            {s.inReview?.length > 0 && <p className="mt-1 text-text-secondary">In review: {s.inReview.map((t) => t.title).join("; ")}</p>}
          </section>
        </>)}
        <Reason id="cl-reason" value={reason} onChange={setReason} />
        {(module?.leadHistory?.length ?? 0) > 0 && (
          <details className="text-sm"><summary className="cursor-pointer font-bold text-text-secondary">Earlier changes ({module.leadHistory.length})</summary>
            <ul className="mt-1 space-y-0.5 text-text-secondary">{module.leadHistory.map((h, i) => <li key={i}>{fmtDate(h.at)}: {h.from} → {h.to} by {h.by}. {h.reason}</li>)}</ul>
          </details>
        )}
        {err && <Fail>{err}</Fail>}
      </div>
    </ConfirmModal>
  );
}

// ── Y-7 Manager: Request reallocation / Nudge ────────────────────────────────
export function RequestReallocationDialog({ task, onClose, onDone, layer }) {
  const addToast = useUiStore((s) => s.addToast);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true); setErr("");
    try {
      await api.post(`/api/manager/tasks/${task.id}/request-reallocation`, { reason: reason.trim() }, { silent: true });
      addToast({ type: "success", message: "Request sent to the Team Lead. You will be told their answer." });
      onDone?.();
    } catch (x) { setErr(x?.status === 429 ? `Already asked in the last 24 hours${x.data?.nextAt ? `. You can ask again ${fmtDate(x.data.nextAt)}` : ""}.` : x?.message ?? "Could not send the request."); }
    finally { setBusy(false); }
  }
  return (
    <ConfirmModal open={!!task} onClose={onClose} onConfirm={send} layer={layer} loading={busy}
      title="Request reallocation" confirmLabel="Send to Team Lead" confirmDisabled={reason.trim().length < REASON_MIN}
      body={task ? `Ask the Team Lead to move "${task.title}" to someone else. Only the Team Lead can reassign; they accept or decline and you are told.` : undefined}>
      <div className="flex flex-col gap-3"><Reason id="rr-reason" value={reason} onChange={setReason} hint="Why should it move? For example: over capacity, away, blocked." />{err && <Fail>{err}</Fail>}</div>
    </ConfirmModal>
  );
}

// ── Y-7 Team Lead: Reassign (also how a Manager's request is accepted) ───────
export function ReassignDialog({ task, request, people, onClose, onDone, layer }) {
  const addToast = useUiStore((s) => s.addToast);
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [share, setShare] = useState(0);
  const [prev, setPrev] = useState(null);
  const [tight, setTight] = useState(null);   // { remainingHours, hoursUntilDue } after DEADLINE_TOO_TIGHT
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const id = task?.id;

  useEffect(() => {
    if (!to || !id) return undefined;
    let live = true;
    api.get(`/api/teamlead/tasks/${id}/reassign/preview?toUserId=${to}`, { silent: true })
      .then((p) => { if (live) { setPrev(p); setErr(""); setTight(null); } })
      .catch((e) => { if (live) { setPrev(null); setErr(e?.message ?? "The preview could not be loaded."); } });
    return () => { live = false; };
  }, [to, id]);

  const options = useMemo(() => (people ?? []).map((p) => ({ value: String(p.id), label: p.name, group: p.role })), [people]);
  const shareOk = Number.isInteger(Number(share)) && share >= 0 && share <= 50;
  async function save(ack = false) {
    setBusy(true); setErr("");
    try {
      const r = await api.post(`/api/teamlead/tasks/${id}/reassign`, { toUserId: to, reason: reason.trim(), handoverSharePct: Number(share) || 0, acknowledgeDeadline: ack || undefined, requestId: request?.id }, { silent: true });
      addToast({ type: "success", message: `"${task.title}" moved to ${r.task?.assignee?.name ?? prev?.candidate?.name}. They were told, with your reason and the hours done.` });
      onDone?.(r);
    } catch (x) {
      if (x?.data?.code === "DEADLINE_TOO_TIGHT") setTight({ remainingHours: x.data.remainingHours, hoursUntilDue: x.data.hoursUntilDue });
      else setErr(x?.message ?? "Could not reassign this task.");
    } finally { setBusy(false); }
  }
  const t = prev?.task, c = prev?.candidate;
  return (
    <ConfirmModal open={!!task} onClose={onClose} onConfirm={() => save(false)} layer={layer} loading={busy}
      title={`Reassign "${task?.title ?? ""}"`} confirmLabel="Reassign" confirmDisabled={!to || !prev || reason.trim().length < REASON_MIN || !shareOk || !!tight}>
      <div className="flex max-h-[62vh] flex-col gap-4 overflow-y-auto pr-1">
        {request && <p className="rounded-xl bg-ink/[0.04] px-3 py-2 text-sm text-text-secondary">The Manager asked for this: {request.reason}</p>}
        <div className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">New assignee
          <Select label="New assignee" value={to} onChange={(v) => { setTo(v); setPrev(null); setTight(null); }} options={options} placeholder="Choose a person" />
        </div>
        {to && !prev && !err && <Skel />}
        {prev && (<>
          <section aria-label="Time on the task" className="rounded-xl border border-ink/[0.08] bg-ink/[0.02] p-3 text-sm">
            <p className="font-bold text-text-primary">{prev.previous.name} has done {hrs(t.loggedHours)} of {hrs(t.estimatedHours)}</p>
            <p className="mt-1 text-text-secondary">The logged time stays on the task. {c.name} has {hrs(t.remainingHours)} left to do, and {t.hoursUntilDue != null ? `${hrs(t.hoursUntilDue)} of working time until the due date` : "no due date"}.</p>
            {prev.previous.notes && <p className="mt-1 text-text-secondary">Notes: {prev.previous.notes}</p>}
          </section>
          <p className="text-sm text-text-secondary">{c.name}: {hrs(c.freeHoursPerDay)} free per day, load {c.utilisationPct}%.{c.inProject ? "" : " Not on this project yet."}</p>
          {c.overCapacity && <Warn>{c.name} is over capacity. This move adds to it.</Warn>}
          {prev.reassignCount >= 2 && <Warn>This task has moved {prev.reassignCount} times. One more raises a flag for repeated reassignment.</Warn>}
          {(t.needsExtension || tight) && (
            <Warn>The remaining {hrs(tight?.remainingHours ?? t.remainingHours)} does not fit before the deadline ({hrs(tight?.hoursUntilDue ?? t.hoursUntilDue ?? 0)} left). The deadline has to move.{" "}
              <Link to="/teamlead/requests" className="underline">Open the extension flow</Link>, or reassign anyway and handle the date after.
              {tight && <button type="button" onClick={() => save(true)} disabled={busy || reason.trim().length < REASON_MIN} className="ml-2 rounded-lg border border-[#7A4B00]/40 px-2 py-0.5 text-xs font-bold hover:bg-white/60 disabled:opacity-40">Reassign anyway</button>}
            </Warn>
          )}
        </>)}
        <Reason id="ra-reason" value={reason} onChange={setReason} hint="Why is it moving? The new person sees this." />
        <label htmlFor="ra-share" className="flex flex-col gap-1.5 text-sm font-bold text-text-primary">Handover share (XP, optional)
          <input id="ra-share" type="number" inputMode="numeric" min={0} max={50} step={1} value={share} onChange={(e) => setShare(e.target.value)} aria-invalid={!shareOk} className="h-10 w-28 rounded-xl px-3 text-sm font-normal tabular-nums" />
          <span className={`text-xs font-normal ${shareOk ? "text-text-secondary" : "text-[#B01F17]"}`}>{shareOk ? `0 to 50%. ${prev?.previous?.name ?? "The previous person"} gets ${Number(share) || 0}% of this task's XP, the person who finishes gets the rest. The share is recorded in the audit log.` : "Use a whole number from 0 to 50."}</span>
        </label>
        {err && <Fail>{err}</Fail>}
      </div>
    </ConfirmModal>
  );
}

// ── Y-7 Team Lead: decline a Manager's request ───────────────────────────────
export function DeclineDialog({ request, onClose, onDone }) {
  const addToast = useUiStore((s) => s.addToast);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true); setErr("");
    try { await api.post(`/api/teamlead/reallocation-requests/${request.id}/decline`, { reason: reason.trim() }, { silent: true }); addToast({ type: "info", message: "Declined. The Manager was told why." }); onDone?.(); }
    catch (x) { setErr(x?.message ?? "Could not decline."); } finally { setBusy(false); }
  }
  return (
    <ConfirmModal open={!!request} onClose={onClose} onConfirm={send} loading={busy} title="Decline this request" confirmLabel="Decline" confirmDisabled={reason.trim().length < REASON_MIN}
      body={request ? `"${request.task?.title}" stays with its assignee. The Manager sees your reason.` : undefined}>
      <div className="flex flex-col gap-3"><Reason id="dc-reason" value={reason} onChange={setReason} />{err && <Fail>{err}</Fail>}</div>
    </ConfirmModal>
  );
}

// ── Y-8 Remove member from a project ─────────────────────────────────────────
export function RemoveMemberDialog({ projectId, member, onClose, onDone }) {
  const addToast = useUiStore((s) => s.addToast);
  const [check, setCheck] = useState(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const base = `/api/manager/projects/${projectId}/members/${member?.id}`;

  useEffect(() => {
    if (!member) return undefined;
    let live = true;
    api.get(`${base}/remove-check`, { silent: true }).then((c) => { if (live) setCheck(c); }).catch((e) => { if (live) setErr(e?.message ?? "Could not check this person."); });
    return () => { live = false; setCheck(null); setErr(""); setReason(""); };
  }, [member, base]);

  async function remove() {
    setBusy(true); setErr("");
    try {
      await api.delete(base, { body: JSON.stringify({ reason: reason.trim() || undefined }), silent: true });
      addToast({ type: "info", message: `${member.name} removed. Their past work stays in the project as "Former member".` });
      onDone?.();
    } catch (x) { if (x?.data?.code === "BLOCKED") setCheck((c) => ({ ...(c ?? {}), canRemove: false, blockers: x.data.blockers ?? c?.blockers ?? [] })); else setErr(x?.message ?? "Could not remove this person."); }
    finally { setBusy(false); }
  }
  const blocked = check && !check.canRemove;
  return (
    <ConfirmModal open={!!member} onClose={onClose} onConfirm={remove} loading={busy} destructive
      title={blocked ? `${member?.name} cannot be removed yet` : `Remove ${member?.name ?? ""} from this project?`}
      confirmLabel="Remove from project" cancelLabel={blocked ? "Close" : "Cancel"} confirmDisabled={!check || blocked}>
      <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
        {!check && !err && <Skel />}
        {blocked && check.blockers.map((b, i) => (
          <section key={i} aria-label={b.type === "team_lead" ? "Team Lead role" : "Open tasks"} className="rounded-xl border border-[#F2A60D]/40 bg-[#FFF0D2] p-3 text-sm text-[#7A4B00]">
            <p className="font-bold">{b.message}</p>
            {b.tasks?.length > 0 && <ul className="mt-1 list-disc space-y-0.5 pl-5">{b.tasks.map((t) => <li key={t.id}>{t.title} <span className="opacity-75">({String(t.status).replace("-", " ")}{t.module ? `, ${t.module}` : ""})</span></li>)}</ul>}
            {b.modules?.length > 0 && <ul className="mt-1 list-disc space-y-0.5 pl-5">{b.modules.map((m) => <li key={m.id}>{m.title}</li>)}</ul>}
            <p className="mt-1.5 text-xs">{b.type === "team_lead" ? "Change the Team Lead of these modules first (Modules tab)." : "Ask the Team Lead to reassign these tasks first."}</p>
          </section>
        ))}
        {check?.canRemove && (<>
          <section aria-label="What stays" className="rounded-xl border border-ink/[0.08] bg-ink/[0.02] p-3 text-sm text-text-secondary">
            <p className="font-bold text-text-primary">What stays with {member.name}</p>
            <p className="mt-1">{(check.willKeep ?? []).join(", ")}. They leave the project chat (old messages stay) and no longer count in the project's capacity. Adding them again brings their history back.</p>
          </section>
          <Reason id="rm-reason" value={reason} onChange={setReason} required={false} label="Reason (optional)" />
        </>)}
        {err && <Fail>{err}</Fail>}
      </div>
    </ConfirmModal>
  );
}
