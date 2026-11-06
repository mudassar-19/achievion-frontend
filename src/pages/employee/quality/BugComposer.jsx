// Bug composer for Testers (E-4, Employee UX §5.3, D-188): title, steps, expected / actual, severity, project and optional task,
// environment, up to 5 files (D-164 / D-165 rules, 5-minute links). Server checks everything again. Sends once.
import { useEffect, useState } from "react";
import { FileUp, X } from "lucide-react";
import api from "@/lib/api";
import Drawer from "@/components/ui/Drawer";
import { BTN } from "@/components/ui/buttons";

const ACCEPT = [".jpg", ".jpeg", ".png", ".pdf", ".zip", ".docx", ".xlsx", ".txt", ".md"];
const SEV = [["Low", "Small; a workaround exists"], ["Medium", "Gets in the way"], ["High", "A main flow is broken"], ["Critical", "Data loss, security or nothing works"]];
const LABEL = "flex flex-col gap-1 text-xs font-bold text-text-primary";
const FIELD = "rounded-xl px-3 text-sm font-normal";
const Err = ({ id, msg }) => (msg ? <span id={id} className="text-xs font-semibold text-[#B01F17]">{msg}</span> : null);

export default function BugComposer({ open, onClose, onSent, projects, preset = {} }) {
  const blank = { projectId: preset.projectId ?? projects?.[0]?.id ?? "", taskId: preset.taskId ?? "", title: "", steps: "", expected: "", actual: "", severity: "", environment: "" };
  const [f, setF] = useState(blank);
  const [files, setFiles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open || !f.projectId) return undefined;
    let live = true;
    api.get(`/api/quality/projects/${f.projectId}/tasks`).then((r) => live && setTasks(r.rows)).catch(() => live && setTasks([]));
    return () => { live = false; };
  }, [open, f.projectId]);
  const set = (k) => (e) => { const v = e.target.value; setF((x) => ({ ...x, [k]: v, ...(k === "projectId" ? { taskId: "" } : {}) })); setErr((x) => ({ ...x, [k]: null })); };

  function check() {
    const e = {};
    if (!f.projectId) e.projectId = "Pick a project.";
    if (f.title.trim().length < 3) e.title = "Title: at least 3 characters.";
    if (f.steps.trim().length < 5) e.steps = "Write the steps (at least 5 characters).";
    if (!f.expected.trim()) e.expected = "Expected result is needed.";
    if (!f.actual.trim()) e.actual = "Actual result is needed.";
    if (!f.severity) e.severity = "Pick a severity.";
    setErr(e);
    const first = Object.keys(e)[0];
    if (first) document.getElementById(`bc-${first}`)?.focus();
    return !first;
  }
  async function send(e) {
    e.preventDefault();
    if (busy || !check()) return;
    setBusy(true);
    const fd = new FormData();
    for (const [k, v] of Object.entries(f)) if (String(v).trim()) fd.append(k, String(v).trim());
    files.forEach((x) => fd.append("files", x));
    try { const r = await api.upload("/api/quality/bugs", fd); onSent(r.id); }
    catch (x) { setErr(x?.data?.field ? { [x.data.field]: x.message } : { form: x?.message ?? "It could not be sent." }); }
    finally { setBusy(false); }
  }
  function addFiles(picked) {
    const next = [...files]; let e = null;
    for (const file of picked) {
      if (!ACCEPT.some((x) => file.name.toLowerCase().endsWith(x))) e = `"${file.name}" is not allowed.`;
      else if (file.size > 10 * 1024 * 1024) e = `"${file.name}" is over 10 MB.`;
      else if (next.length >= 5) e = "At most 5 files.";
      else next.push(file);
    }
    setFiles(next); setErr((x) => ({ ...x, files: e }));
  }

  return (
    <Drawer open={open} onClose={onClose} title="Report a bug" width={560}>
      <form noValidate onSubmit={send} className="flex flex-col gap-4 p-5 text-sm">
        <p className="text-xs text-text-secondary">Inspect, then report: clear steps let the developer see the bug in a minute. Your Team Lead checks it first.</p>
        {err.form && <p role="alert" className="rounded-xl bg-[#B01F17]/[0.06] px-3 py-2 font-semibold text-[#B01F17]">{err.form}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label htmlFor="bc-projectId" className={LABEL}>Project
            <select id="bc-projectId" name="projectId" value={f.projectId} onChange={set("projectId")} aria-invalid={!!err.projectId} className={`${FIELD} h-10 border border-ink/[0.12] bg-bg-surface text-text-primary`}>
              <option value="">Pick a project</option>{(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select><Err msg={err.projectId} /></label>
          <label htmlFor="bc-taskId" className={LABEL}>Task (optional)
            <select id="bc-taskId" name="taskId" value={f.taskId} onChange={set("taskId")} aria-invalid={!!err.taskId} className={`${FIELD} h-10 border border-ink/[0.12] bg-bg-surface text-text-primary`}>
              <option value="">No task</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select><Err msg={err.taskId} /></label>
        </div>
        <label htmlFor="bc-title" className={LABEL}>Title<input id="bc-title" name="title" autoComplete="off" maxLength={120} value={f.title} onChange={set("title")} aria-invalid={!!err.title} placeholder="e.g. Sign in button does nothing…" className={`${FIELD} h-10`} /><Err msg={err.title} /></label>
        <label htmlFor="bc-steps" className={LABEL}>Steps to reproduce<textarea id="bc-steps" name="steps" rows={4} maxLength={2000} value={f.steps} onChange={set("steps")} aria-invalid={!!err.steps} placeholder={"1. Open the login page\n2. Type a valid email and password\n3. Press Sign in…"} className={`${FIELD} py-2`} /><Err msg={err.steps} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label htmlFor="bc-expected" className={LABEL}>Expected result<textarea id="bc-expected" name="expected" rows={2} maxLength={1000} value={f.expected} onChange={set("expected")} aria-invalid={!!err.expected} className={`${FIELD} py-2`} /><Err msg={err.expected} /></label>
          <label htmlFor="bc-actual" className={LABEL}>Actual result<textarea id="bc-actual" name="actual" rows={2} maxLength={1000} value={f.actual} onChange={set("actual")} aria-invalid={!!err.actual} className={`${FIELD} py-2`} /><Err msg={err.actual} /></label>
        </div>
        <fieldset className="flex flex-col gap-1.5"><legend className="mb-1 text-xs font-bold text-text-primary">Severity</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">{SEV.map(([v, hint]) => (
            <label key={v} className={`flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 ${f.severity === v ? "border-accent/50 bg-accent/[0.06]" : "border-ink/[0.08] hover:bg-ink/[0.03]"}`}>
              <input id={v === "Low" ? "bc-severity" : undefined} type="radio" name="severity" value={v} checked={f.severity === v} onChange={set("severity")} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
              <span><span className="font-bold">{v}</span><span className="block text-xs text-text-secondary">{hint}</span></span></label>))}</div>
          <Err msg={err.severity} /></fieldset>
        <label htmlFor="bc-environment" className={LABEL}>Environment (optional)<input id="bc-environment" name="environment" autoComplete="off" maxLength={300} value={f.environment} onChange={set("environment")} placeholder="e.g. Chrome 130, macOS, staging…" className={`${FIELD} h-10`} /></label>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bc-files" className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 px-3 py-2 font-semibold text-text-secondary hover:border-ink/40 hover:text-text-primary focus-within:ring-2 focus-within:ring-accent/50">
            <FileUp size={15} aria-hidden="true" />Add a screenshot or file<span className="font-normal">{" · up to 5, 10 MB each"}</span>
            <input id="bc-files" type="file" multiple accept={ACCEPT.join(",")} className="sr-only" onChange={(e) => { addFiles([...e.target.files]); e.target.value = ""; }} /></label>
          <Err msg={err.files} />
          {files.length > 0 && <ul className="flex flex-col gap-1">{files.map((x, i) => (
            <li key={x.name + i} className="flex min-w-0 items-center gap-2 rounded-lg bg-ink/[0.03] px-2 py-1"><span className="min-w-0 flex-1 truncate" title={x.name}>{x.name}</span>
              <button type="button" className={BTN.icon} aria-label={`Remove ${x.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={14} aria-hidden="true" /></button></li>))}</ul>}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-ink/[0.06] pt-4">
          <button type="submit" className={BTN.primary} disabled={busy} aria-busy={busy}>{busy ? "Sending…" : "Report bug"}</button>
          <button type="button" className={BTN.ghost} onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Drawer>
  );
}
