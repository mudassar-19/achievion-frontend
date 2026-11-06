// QA page for Testers (E-4, Employee UX §5.2, D-189): brief, acceptance criteria, the submission (5-minute links), linked test
// cases and bugs, earlier sign-offs; sign-off Pass / Pass with notes / Fail with evidence files. Once per submission (the server
// claims it atomically). A fail sends the task back to the assignee through the Team Lead's revision path.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bug, CheckCircle2, ClipboardCheck, FileUp, ListTodo, Paperclip, X } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import FileLink from "@/components/ui/FileLink";
import { BTN } from "@/components/ui/buttons";
import { BUG_CHIP, SEVERITY_CHIP, RESULT_CHIP } from "@/utils/quality";
import useLoad from "../../manager/project/useLoad";
import { fmtDateTime } from "../../manager/project/format";

const ACCEPT = [".jpg", ".jpeg", ".png", ".pdf", ".zip", ".docx", ".xlsx", ".txt", ".md"];
const RESULTS = [["pass", "Pass", "Meets the criteria."], ["pass_notes", "Pass with notes", "Good enough to approve; small points noted."], ["fail", "Fail", "Goes back to the assignee as a revision."]];
const H3 = "mb-1.5 text-xs font-bold text-text-secondary";

function SignOff({ t, onDone }) {
  const addToast = useUiStore((s) => s.addToast);
  const [result, setResult] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState([]);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  function addFiles(picked) {
    const next = [...files]; let e = null;
    for (const f of picked) { if (!ACCEPT.some((x) => f.name.toLowerCase().endsWith(x))) e = `"${f.name}" is not allowed.`; else if (f.size > 10 * 1024 * 1024) e = `"${f.name}" is over 10 MB.`; else if (next.length >= 5) e = "At most 5 files."; else next.push(f); }
    setFiles(next); setErr((x) => ({ ...x, files: e }));
  }
  async function send(e) {
    e.preventDefault();
    if (busy) return;
    const x = {};
    if (!result) x.result = "Choose Pass, Pass with notes or Fail.";
    else if (result !== "pass" && note.trim().length < 3) x.note = result === "fail" ? "Write what failed." : "Write the notes.";
    setErr(x);
    if (Object.keys(x).length) { document.getElementById(x.result ? "qa-r-pass" : "qa-note")?.focus(); return; }
    setBusy(true);
    const fd = new FormData(); fd.append("result", result); if (note.trim()) fd.append("note", note.trim()); files.forEach((f) => fd.append("files", f));
    try {
      const r = await api.upload(`/api/quality/qa/${t.id}/signoff`, fd);
      addToast({ type: "success", message: r.result === "fail" ? "QA failed. The task went back to the assignee." : "QA signed off. The Team Lead can approve now." });
      onDone();
    } catch (e2) { setErr(e2?.data?.field ? { [e2.data.field]: e2.message } : { form: e2?.message ?? "It could not be sent." }); }
    finally { setBusy(false); }
  }
  return (
    <form noValidate onSubmit={send} className="flex flex-col gap-3 px-5 py-4 text-sm" aria-label="QA sign-off">
      {err.form && <p role="alert" className="rounded-xl bg-[#B01F17]/[0.06] px-3 py-2 font-semibold text-[#B01F17]">{err.form}</p>}
      <fieldset className="flex flex-col gap-1.5"><legend className="mb-1 text-xs font-bold">Result</legend>
        {RESULTS.map(([v, l, hint]) => (
          <label key={v} className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 ${result === v ? "border-accent/50 bg-accent/[0.06]" : "border-ink/[0.08] hover:bg-ink/[0.03]"}`}>
            <input id={`qa-r-${v}`} type="radio" name="result" value={v} checked={result === v} onChange={() => { setResult(v); setErr({}); }} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
            <span><span className="font-bold">{l}</span><span className="block text-xs text-text-secondary">{hint}</span></span></label>
        ))}
        {err.result && <span className="text-xs font-semibold text-[#B01F17]">{err.result}</span>}
      </fieldset>
      <label htmlFor="qa-note" className="flex flex-col gap-1 text-xs font-bold">{result === "fail" ? "What failed" : result === "pass_notes" ? "Notes" : "Note (optional)"}
        <textarea id="qa-note" name="note" rows={3} maxLength={2000} value={note} onChange={(e) => { setNote(e.target.value); setErr((x) => ({ ...x, note: null })); }} aria-invalid={!!err.note} className="rounded-xl p-3 text-sm font-normal" placeholder="Steps, browser, what you saw…" />
        {err.note && <span className="font-semibold text-[#B01F17]">{err.note}</span>}</label>
      <label htmlFor="qa-files" className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 px-3 py-2 font-semibold text-text-secondary hover:border-ink/40 hover:text-text-primary focus-within:ring-2 focus-within:ring-accent/50">
        <FileUp size={15} aria-hidden="true" />Add evidence<span className="font-normal">{" · up to 5, 10 MB each"}</span>
        <input id="qa-files" type="file" multiple accept={ACCEPT.join(",")} className="sr-only" onChange={(e) => { addFiles([...e.target.files]); e.target.value = ""; }} /></label>
      {err.files && <span className="text-xs font-semibold text-[#B01F17]">{err.files}</span>}
      {files.length > 0 && <ul className="flex flex-col gap-1">{files.map((f, i) => <li key={f.name + i} className="flex min-w-0 items-center gap-2 rounded-lg bg-ink/[0.03] px-2 py-1"><span className="min-w-0 flex-1 truncate" title={f.name}>{f.name}</span><button type="button" className={BTN.icon} aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={14} aria-hidden="true" /></button></li>)}</ul>}
      <button type="submit" className={`${BTN.primary} self-start`} disabled={busy} aria-busy={busy}>{busy ? "Signing off…" : "Sign off"}</button>
    </form>
  );
}

export default function QaPage() {
  const { taskId } = useParams();
  const { data: t, error, reload, setData } = useLoad(`/api/quality/qa/${taskId}`);
  const refresh = () => api.get(`/api/quality/qa/${taskId}`).then(setData).catch(reload);
  const back = { label: "QA queue", to: "/workspace/qa" };
  if (error) return <Page><PageHeader title="QA" back={back} /><ErrorState message={error} onRetry={reload} /></Page>;
  if (!t) return <Page><div aria-busy="true" aria-label="Loading the QA page" className="flex flex-col gap-6"><Skeleton className="h-12 w-1/2 rounded-xl" /><div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-96 rounded-2xl lg:col-span-2" /><Skeleton className="h-80 rounded-2xl" /></div></div></Page>;
  return (
    <Page>
      <PageHeader title={t.title} subtitle={`${t.project.title} · built by ${t.builtBy.join(", ") || "—"} · attempt ${t.attempt}`} back={back} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Panel title="What to check" icon={ClipboardCheck}>
            <div className="flex flex-col gap-4 px-5 py-4 text-sm">
              <section><h3 className={H3}>Brief</h3><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{t.description || <span className="text-text-secondary">No description.</span>}</p></section>
              <section><h3 className={H3}>Acceptance criteria</h3>{t.acceptanceCriteria.length ? <ul className="flex flex-col gap-1.5">{t.acceptanceCriteria.map((c, i) => <li key={i} className="flex gap-2"><CheckCircle2 size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-text-secondary" /><span className="[overflow-wrap:anywhere]">{c}</span></li>)}</ul> : <p className="text-text-secondary">No criteria written.</p>}</section>
              {t.benchmark && <section><h3 className={H3}>Benchmark</h3><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{t.benchmark}</p></section>}
              <section><h3 className={H3}>Submission{t.submittedAt ? ` · ${fmtDateTime(t.submittedAt)}` : ""}</h3>
                {t.submission.note && <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{t.submission.note}</p>}
                <ul className="mt-1 flex flex-col gap-1">
                  {t.submission.links.map((l, i) => <li key={`l${i}`} className="min-w-0 truncate"><a href={l.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline" title={l.url}>{l.label || l.url}</a></li>)}
                  {t.submission.files.map((f, i) => <li key={`f${i}`} className="flex min-w-0 items-center gap-2"><Paperclip size={13} aria-hidden="true" className="shrink-0 text-text-secondary" /><FileLink href={f.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate font-semibold underline">{f.name}</FileLink></li>)}
                </ul>
                {!t.submission.note && !t.submission.links.length && !t.submission.files.length && <p className="text-text-secondary">Nothing was submitted yet.</p>}
              </section>
            </div>
          </Panel>
          {t.signoffs.length > 0 && (
            <Panel title="Earlier sign-offs" icon={ClipboardCheck}>
              <ul className="divide-y divide-ink/[0.05]">{t.signoffs.map((s, i) => (
                <li key={i} className="flex flex-col gap-1 px-5 py-3 text-sm">
                  <span className="flex flex-wrap items-center gap-2"><StatusChip status={s.result === "pass" ? "approved" : "rejected"} label={s.result === "pass" ? (s.withNotes ? "Passed with notes" : "Passed") : "Failed"} size="xs" /><span className="text-xs text-text-secondary">{s.by} · {fmtDateTime(s.at)}</span></span>
                  {s.note && <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{s.note}</p>}
                  {s.files.map((f, j) => <span key={j} className="flex min-w-0 items-center gap-2"><Paperclip size={13} aria-hidden="true" className="shrink-0 text-text-secondary" /><FileLink href={f.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate font-semibold underline">{f.name}</FileLink></span>)}
                </li>))}</ul>
            </Panel>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Sign off" icon={CheckCircle2}>
            {t.canSign ? <SignOff t={t} onDone={refresh} /> : <p className="px-5 py-4 text-sm text-text-secondary">{t.why}</p>}
          </Panel>
          <Panel title={`Test cases (${t.testCases.length})`} icon={ListTodo} action={{ label: "Manage", to: `/workspace/test-cases?project=${t.project.id}&task=${t.id}` }}>
            {t.testCases.length ? <ul className="divide-y divide-ink/[0.05]">{t.testCases.map((c) => <li key={c.id} className="flex items-center gap-2 px-5 py-2.5 text-sm"><span className="min-w-0 flex-1 truncate" title={c.title}>{c.title}</span>{c.lastResult ? <StatusChip status={RESULT_CHIP[c.lastResult]} label={c.lastResult} size="xs" /> : <span className="text-xs text-text-secondary">Not run</span>}</li>)}</ul>
              : <p className="px-5 py-4 text-sm text-text-secondary">No test cases on this task yet.</p>}
          </Panel>
          <Panel title={`Bugs (${t.bugs.length})`} icon={Bug}>
            {t.bugs.length > 0 && <ul className="divide-y divide-ink/[0.05]">{t.bugs.map((b) => <li key={b.id}><Link to={`/workspace/bugs?bug=${b.id}`} className="flex items-center gap-2 px-5 py-2.5 text-sm hover:bg-ink/[0.03]"><span className="min-w-0 flex-1 truncate" title={b.title}>{b.title}</span><StatusChip status={SEVERITY_CHIP[b.severity]} label={b.severity} size="xs" /><StatusChip status={BUG_CHIP[b.status]} label={b.status} size="xs" /></Link></li>)}</ul>}
            <div className="px-5 py-3"><Link to={`/workspace/bugs?new=1&project=${t.project.id}&task=${t.id}`} className={BTN.secondary}>Report a bug on this task</Link></div>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
