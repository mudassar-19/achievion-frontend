// Submit composer, a step inside the employee task drawer (E-3, Employee UX §4.4, D-178). Fields by role; acceptance criteria
// self-check; files per D-164/D-165 (JPG, JPEG, PNG, PDF, ZIP, DOCX, XLSX, TXT, MD; 10 MB; 5 files). Step 1 form → step 2
// review summary → send once (button locked while sending; the server also claims the task atomically) → step 3 what happens next.
import { useState } from "react";
import { Check, FileUp, Link2, Paperclip, X } from "lucide-react";
import api from "@/lib/api";
import { BTN } from "@/components/ui/buttons";

const ACCEPT = [".jpg", ".jpeg", ".png", ".pdf", ".zip", ".docx", ".xlsx", ".txt", ".md"];
const MAX_FILES = 5, MAX_BYTES = 10 * 1024 * 1024;
const DESIGN_CHECKLIST = [["brief", "Matches the task brief"], ["hierarchy", "Clear visual hierarchy"], ["consistency", "Consistent spacing, colour and type"], ["contrast", "Text contrast and size checked"], ["states", "All screens and states included"]];
// Copy uses the role words (ROLE_WORDS): ship / review, approve, verify / report.
const ROLE = {
  developer: { title: "Ship it for review", link: "Pull request or repository", linkHint: "https://github.com/…/pull/12", text: "summary", textLabel: "Summary", textHint: "What you built and anything the reviewer should know first." },
  designer: { title: "Send it for approval", link: "Design file or prototype", linkHint: "https://www.figma.com/file/…", text: "rationale", textLabel: "Rationale", textHint: "Why it looks and works this way." },
  tester: { title: "Report what you verified", link: "Test report link", linkHint: "https://…", text: "summary", textLabel: "Summary", textHint: "What you verified and what you found." },
};
const LABEL = "flex flex-col gap-1 text-xs font-bold text-text-primary";
const INPUT = "h-10 rounded-xl px-3 text-sm font-normal";
const AREA = "rounded-xl p-3 text-sm font-normal";
const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Err({ id, msg }) { return msg ? <span id={id} className="text-xs font-semibold text-[#B01F17]">{msg}</span> : null; }

export default function SubmitComposer({ t, kind, onCancel, onDone }) {
  const R = ROLE[kind] ?? ROLE.developer;
  const [f, setF] = useState({ link: "", branch: "", summary: "", tests: "", version: "", rationale: "", handoff: "" });
  const [criteria, setCriteria] = useState([]);
  const [design, setDesign] = useState([]);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState("form");
  const [sending, setSending] = useState(false);
  const evidenceNeeded = kind === "tester" && (t.qaRequired || t.type === "Testing");
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setErrors((x) => (x[k] ? { ...x, [k]: null } : x)); }; // an edited field drops its old error
  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function addFiles(picked) {
    const next = [...files], er = [];
    for (const file of picked) {
      if (!ACCEPT.some((ext) => file.name.toLowerCase().endsWith(ext))) er.push(`"${file.name}" is not allowed.`);
      else if (file.size > MAX_BYTES) er.push(`"${file.name}" is over 10 MB.`);
      else if (next.length >= MAX_FILES) er.push(`At most ${MAX_FILES} files.`);
      else next.push(file);
    }
    setFiles(next); setErrors((x) => ({ ...x, files: er[0] ?? null }));
  }

  function check() {
    const er = {};
    if (f.link && !/^https?:\/\/\S+$/i.test(f.link.trim())) er.link = "Use a full web address that starts with https://.";
    if (f.branch && !/^[\w./-]+$/.test(f.branch.trim())) er.branch = "A branch name has no spaces.";
    if (!f.link.trim() && !files.length && !f[R.text].trim()) er[R.text] = "Add a link, a file or a short text.";
    if (evidenceNeeded && !f.link.trim() && !files.length) er.files = "Attach the test report or evidence (a file or a link).";
    setErrors(er);
    const first = Object.keys(er)[0];
    if (first) requestAnimationFrame(() => document.getElementById({ link: "sc-link", branch: "sc-branch", files: "sc-files", summary: "sc-text", rationale: "sc-text" }[first])?.focus());
    return !first;
  }

  async function send() {
    if (sending) return;
    setSending(true);
    const fd = new FormData();
    for (const [k, v] of Object.entries(f)) if (v.trim()) fd.append(k, v.trim());
    fd.append("criteria", JSON.stringify(criteria));
    fd.append("design", JSON.stringify(design));
    files.forEach((x) => fd.append("files", x));
    try { await api.upload(`/api/workspace/tasks/${t.id}/submit`, fd); setStep("done"); }
    catch (e) {
      const field = e?.data?.field;
      setErrors(field ? { [field]: e.message } : { form: e?.message ?? "It could not be sent. Try again." });
      setStep("form");
    } finally { setSending(false); }
  }

  if (step === "done") return (
    <div className="flex flex-col gap-4 p-5 text-sm" role="status">
      <p className="flex items-center gap-2 text-base font-bold text-text-primary"><Check size={18} aria-hidden="true" className="text-[#0E6A30]" />Sent for review</p>
      <div><h3 className="text-xs font-bold text-text-secondary">What happens next</h3>
        <ol className="mt-1.5 list-decimal pl-5 leading-relaxed">
          <li>Your Team Lead reviews it and gives a score with feedback.</li>
          <li>You get a notification with the result: approved, or what to change.</li>
          <li>XP is paid on approval. AI feedback, if any, shows after the review as advice.</li>
        </ol></div>
      <button type="button" className={`${BTN.primary} self-start`} onClick={onDone}>Done</button>
    </div>
  );

  const ticked = criteria.length, n = t.acceptanceCriteria.length;
  if (step === "review") return (
    <div className="flex flex-col gap-4 p-5 text-sm">
      <h3 className="text-base font-bold text-text-primary">Check before you send</h3>
      <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2">
        <dt className="text-text-secondary">{R.link}</dt><dd className="min-w-0 [overflow-wrap:anywhere]">{f.link.trim() || "—"}</dd>
        <dt className="text-text-secondary">Files</dt><dd className="min-w-0">{files.length ? files.map((x) => <span key={x.name + x.size} className="block truncate" title={x.name}>{x.name} · {kb(x.size)}</span>) : "—"}</dd>
        {kind === "developer" && <><dt className="text-text-secondary">Branch</dt><dd className="min-w-0 [overflow-wrap:anywhere]">{f.branch.trim() || "—"}</dd></>}
        {kind === "designer" && <><dt className="text-text-secondary">Version</dt><dd>{f.version.trim() || "—"}</dd></>}
        <dt className="text-text-secondary">{R.textLabel}</dt><dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{f[R.text].trim() || "—"}</dd>
        {kind === "developer" && f.tests.trim() && <><dt className="text-text-secondary">Tests</dt><dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{f.tests.trim()}</dd></>}
        {kind === "designer" && f.handoff.trim() && <><dt className="text-text-secondary">Handoff note</dt><dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{f.handoff.trim()}</dd></>}
        {n > 0 && <><dt className="text-text-secondary">Self-check</dt><dd className={ticked < n ? "font-semibold text-[#7A4B00]" : ""}>{ticked} of {n} criteria ticked{ticked < n ? ". You can still send it." : ""}</dd></>}
      </dl>
      <p className="text-xs text-text-secondary">{t.triesLeft > 0 ? `${t.triesLeft} ${t.triesLeft === 1 ? "try" : "tries"} left on this task after a send-back.` : ""}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BTN.primary} disabled={sending} aria-busy={sending} onClick={send}>{sending ? "Sending…" : "Send for review"}</button>
        <button type="button" className={BTN.secondary} disabled={sending} onClick={() => setStep("form")}>Back to edit</button>
      </div>
    </div>
  );

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); if (check()) setStep("review"); }} className="flex flex-col gap-4 p-5 text-sm">
      <div><h3 className="text-base font-bold text-text-primary">{R.title}</h3>
        <p className="text-xs text-text-secondary">Add at least a link, a file or a short text. Your Team Lead sees exactly what you send here.</p></div>
      {errors.form && <p role="alert" className="rounded-xl bg-[#B01F17]/[0.06] px-3 py-2 text-sm font-semibold text-[#B01F17]">{errors.form}</p>}

      <label htmlFor="sc-link" className={LABEL}><span className="flex items-center gap-1.5"><Link2 size={13} aria-hidden="true" />{R.link}</span>
        <input id="sc-link" name="link" autoComplete="off" type="url" inputMode="url" maxLength={500} value={f.link} onChange={set("link")} placeholder={R.linkHint} aria-invalid={!!errors.link} aria-describedby="sc-link-e" className={INPUT} /><Err id="sc-link-e" msg={errors.link} /></label>
      {kind === "developer" && <label htmlFor="sc-branch" className={LABEL}>Branch (optional)<input id="sc-branch" maxLength={100} value={f.branch} onChange={set("branch")} name="branch" autoComplete="off" placeholder="e.g. feat/login-form…" spellCheck={false} aria-invalid={!!errors.branch} aria-describedby="sc-branch-e" className={INPUT} /><Err id="sc-branch-e" msg={errors.branch} /></label>}
      {kind === "designer" && <label htmlFor="sc-version" className={LABEL}>Version (optional)<input id="sc-version" name="version" autoComplete="off" maxLength={40} value={f.version} onChange={set("version")} placeholder="e.g. v3…" className={`${INPUT} w-40`} /></label>}

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary"><Paperclip size={13} aria-hidden="true" />{kind === "tester" ? "Test report or evidence" : "Files"}{evidenceNeeded ? " (needed for this task)" : " (optional)"}</span>
        <label htmlFor="sc-files" className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 px-3 py-2 text-sm font-semibold text-text-secondary hover:border-ink/40 hover:text-text-primary focus-within:ring-2 focus-within:ring-accent/50">
          <FileUp size={15} aria-hidden="true" />Choose files<span className="font-normal">{"· up to 5, 10\u00a0MB each"}</span>
          <input id="sc-files" type="file" multiple accept={ACCEPT.join(",")} className="sr-only" aria-describedby="sc-files-e sc-files-h" onChange={(e) => { addFiles([...e.target.files]); e.target.value = ""; }} /></label>
        <span id="sc-files-h" className="text-[11px] text-text-secondary">JPG, PNG, PDF, ZIP, DOCX, XLSX, TXT or MD. Files open only through 5-minute links.</span>
        <Err id="sc-files-e" msg={errors.files} />
        {files.length > 0 && <ul className="flex flex-col gap-1">{files.map((x, i) => (
          <li key={x.name + x.size + i} className="flex min-w-0 items-center gap-2 rounded-lg bg-ink/[0.03] px-2 py-1"><span className="min-w-0 flex-1 truncate" title={x.name}>{x.name}</span><span className="shrink-0 text-xs tabular-nums text-text-secondary">{kb(x.size)}</span>
            <button type="button" className={BTN.icon} aria-label={`Remove ${x.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={14} aria-hidden="true" /></button></li>))}</ul>}
      </div>

      <label htmlFor="sc-text" className={LABEL}>{R.textLabel}<textarea id="sc-text" name={R.text} rows={4} maxLength={2000} value={f[R.text]} onChange={set(R.text)} placeholder={R.textHint} aria-invalid={!!errors[R.text]} aria-describedby="sc-text-e" className={AREA} /><Err id="sc-text-e" msg={errors[R.text]} /></label>
      {kind === "developer" && <label htmlFor="sc-tests" className={LABEL}>Tests (optional)<textarea id="sc-tests" name="tests" rows={2} maxLength={1000} value={f.tests} onChange={set("tests")} placeholder="Which tests you ran or added." className={AREA} /></label>}
      {kind === "designer" && <label htmlFor="sc-handoff" className={LABEL}>Handoff note for the developer (optional)<textarea id="sc-handoff" name="handoff" rows={2} maxLength={1000} value={f.handoff} onChange={set("handoff")} placeholder="Spacing, states, assets: what the developer needs to build it." aria-invalid={!!errors.handoff} className={AREA} /><Err msg={errors.handoff} /></label>}

      {t.acceptanceCriteria.length > 0 && (
        <fieldset className="flex flex-col gap-1.5"><legend className="mb-1 text-xs font-bold text-text-primary">Self-check: acceptance criteria</legend>
          {t.acceptanceCriteria.map((c, i) => (
            <label key={i} className="flex min-h-9 cursor-pointer items-start gap-2 rounded-lg px-1 py-1 hover:bg-ink/[0.03]">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]" checked={criteria.includes(i)} onChange={() => toggle(criteria, setCriteria, i)} />
              <span className="[overflow-wrap:anywhere]">{c}</span></label>))}
        </fieldset>
      )}
      {kind === "designer" && (
        <fieldset className="flex flex-col gap-1.5"><legend className="mb-1 text-xs font-bold text-text-primary">Design checklist</legend>
          {DESIGN_CHECKLIST.map(([k, l]) => <label key={k} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-1 hover:bg-ink/[0.03]"><input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={design.includes(k)} onChange={() => toggle(design, setDesign, k)} />{l}</label>)}
        </fieldset>
      )}

      <div className="flex flex-wrap gap-2 border-t border-ink/[0.06] pt-4">
        <button type="submit" className={BTN.primary}>Review before sending</button>
        <button type="button" className={BTN.ghost} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
