// One bug: details, files (5-minute links), history and the actions this person may take (E-4, D-188, D-190). The server sends
// `moves` and `canCheck`; this shows only those. Used on the Tester's board, the developer's task drawer and the TL bug page.
import { useState } from "react";
import { Paperclip } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Drawer from "@/components/ui/Drawer";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import FileLink from "@/components/ui/FileLink";
import { BTN } from "@/components/ui/buttons";
import { BUG_CHIP, SEVERITY_CHIP, VALIDITY_LABEL, ACTION_LABEL } from "@/utils/quality";
import useLoad from "../../manager/project/useLoad";
import { fmtDateTime } from "../../manager/project/format";

const H3 = "mb-1 text-xs font-bold text-text-secondary";
const MOVE = { Fixed: "Mark fixed", Verified: "Verify fix", Open: "Reopen", Closed: "Close bug" };
const NOTE = { Fixed: "What did you change?", Open: "What is still wrong?" };

function Actions({ bug, onDone, bugsOfProject }) {
  const addToast = useUiStore((s) => s.addToast);
  const [form, setForm] = useState(null); // { kind: "move", to } | { kind: "check", validity }
  const [note, setNote] = useState("");
  const [dup, setDup] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  async function send() {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      if (form.kind === "move") await api.post(`/api/quality/bugs/${bug.id}/move`, { to: form.to, note: note.trim() });
      else { const r = await api.post(`/api/quality/bugs/${bug.id}/check`, { validity: form.validity, note: note.trim(), duplicateOf: dup || undefined });
        if (r?.xpReason === "daily_cap") addToast({ type: "info", message: "Accepted. No XP for the reporter: 5 bugs were already rewarded today." }); }
      addToast({ type: "success", message: form.kind === "move" ? `Moved to ${form.to}.` : `Bug ${VALIDITY_LABEL[form.validity].toLowerCase()}.` });
      setForm(null); setNote(""); setDup(""); onDone();
    } catch (e) { setErr(e?.message ?? "That did not work."); } finally { setBusy(false); }
  }
  const needsNote = form && (form.kind === "move" ? !!NOTE[form.to] : form.validity !== "valid");
  if (!bug.moves.length && !bug.canCheck) return null;
  return (
    <section aria-label="Actions" className="flex flex-col gap-2 rounded-xl border border-ink/[0.08] p-3">
      {!form && (
        <div className="flex flex-wrap gap-2">
          {bug.canCheck && <>
            <button type="button" className={BTN.primary} onClick={() => setForm({ kind: "check", validity: "valid" })}>Accept (valid)</button>
            <button type="button" className={BTN.secondary} onClick={() => setForm({ kind: "check", validity: "invalid" })}>Not a bug</button>
            <button type="button" className={BTN.secondary} onClick={() => setForm({ kind: "check", validity: "duplicate" })}>Duplicate</button>
          </>}
          {bug.moves.map((to) => <button key={to} type="button" className={to === "Fixed" || to === "Verified" ? BTN.primary : BTN.secondary} onClick={() => setForm({ kind: "move", to })}>{MOVE[to]}</button>)}
        </div>
      )}
      {form && (
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (needsNote && note.trim().length < 3) { setErr("Add a short note (3 characters or more)."); document.getElementById(`bug-note-${bug.id}`)?.focus(); return; } send(); }} className="flex flex-col gap-2">
          <p className="text-sm font-bold">{form.kind === "move" ? MOVE[form.to] : form.validity === "valid" ? "Accept this bug" : form.validity === "invalid" ? "Not a bug" : "Duplicate of another bug"}</p>
          {form.kind === "check" && form.validity === "valid" && <p className="text-xs text-text-secondary">The reporter gets +15 XP (at most 5 bugs a day); the person on the task is asked to fix it.</p>}
          {form.kind === "check" && form.validity === "duplicate" && (
            <label htmlFor={`bug-dup-${bug.id}`} className="flex flex-col gap-1 text-xs font-bold">Duplicate of
              <select id={`bug-dup-${bug.id}`} name="duplicateOf" value={dup} onChange={(e) => setDup(e.target.value)} className="h-10 rounded-xl border border-ink/[0.12] bg-bg-surface px-2 text-sm font-normal text-text-primary">
                <option value="">Pick the earlier bug</option>
                {(bugsOfProject ?? []).filter((b) => b.id !== bug.id).map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select></label>
          )}
          <label htmlFor={`bug-note-${bug.id}`} className="flex flex-col gap-1 text-xs font-bold">{form.kind === "move" ? NOTE[form.to] ?? "Note (optional)" : needsNote ? "Why?" : "Note (optional)"}
            <textarea id={`bug-note-${bug.id}`} name="note" rows={2} maxLength={500} value={note} onChange={(e) => { setNote(e.target.value); setErr(null); }} aria-invalid={!!err} className="rounded-xl p-3 text-sm font-normal" /></label>
          {err && <p role="alert" className="text-xs font-semibold text-[#B01F17]">{err}</p>}
          <span className="flex gap-2"><button type="submit" className={BTN.primary} disabled={busy}>{busy ? "Saving…" : "Confirm"}</button><button type="button" className={BTN.ghost} onClick={() => { setForm(null); setErr(null); }}>Cancel</button></span>
        </form>
      )}
    </section>
  );
}

export function BugDetail({ id, onChanged, bugsOfProject }) {
  const { data: b, error, reload, setData } = useLoad(id ? `/api/quality/bugs/${id}` : null);
  const refresh = () => { api.get(`/api/quality/bugs/${id}`).then(setData).catch(reload); onChanged?.(); };
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!b) return <div aria-busy="true" aria-label="Loading the bug" className="flex flex-col gap-3"><Skeleton className="h-8 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>;
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={BUG_CHIP[b.status]} label={b.status} size="xs" />
        <StatusChip status={SEVERITY_CHIP[b.severity]} label={b.severity} size="xs" />
        <span className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[11px] font-semibold">{VALIDITY_LABEL[b.validity]}</span>
      </div>
      <p className="text-xs text-text-secondary [overflow-wrap:anywhere]">{b.project}{b.task ? ` · ${b.task}` : ""} · reported by {b.reporter}, {fmtDateTime(b.createdAt)}</p>
      <Actions bug={b} onDone={refresh} bugsOfProject={bugsOfProject} />
      <section><h3 className={H3}>Steps to reproduce</h3><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{b.steps}</p></section>
      <div className="grid gap-3 sm:grid-cols-2">
        <section><h3 className={H3}>Expected</h3><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{b.expected}</p></section>
        <section><h3 className={H3}>Actual</h3><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{b.actual}</p></section>
      </div>
      {b.environment && <section><h3 className={H3}>Environment</h3><p className="[overflow-wrap:anywhere]">{b.environment}</p></section>}
      {b.files.length > 0 && <section><h3 className={H3}>Files</h3><ul className="flex flex-col gap-1">{b.files.map((f, i) => (
        <li key={i} className="flex min-w-0 items-center gap-2"><Paperclip size={13} aria-hidden="true" className="shrink-0 text-text-secondary" /><FileLink href={f.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate font-semibold underline">{f.name}</FileLink></li>))}</ul></section>}
      <section><h3 className={H3}>History</h3>
        <ol className="flex flex-col divide-y divide-ink/[0.05]">{b.history.map((h, i) => (
          <li key={i} className="flex justify-between gap-3 py-2"><span className="min-w-0 [overflow-wrap:anywhere]"><strong className="font-semibold">{h.by}</strong> · {ACTION_LABEL[h.action] ?? h.action}{h.note ? ` · "${h.note}"` : ""}</span><span className="shrink-0 tabular-nums text-text-secondary">{fmtDateTime(h.at)}</span></li>))}</ol>
      </section>
    </div>
  );
}

export default function BugDrawer({ id, onClose, onChanged, bugsOfProject, title }) {
  return (
    <Drawer open={!!id} onClose={onClose} title={title ?? "Bug"} width={560}>
      <div className="p-5">{id && <BugDetail key={id} id={id} onChanged={onChanged} bugsOfProject={bugsOfProject} />}</div>
    </Drawer>
  );
}
