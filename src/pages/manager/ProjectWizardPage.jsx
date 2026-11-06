// Create / edit project wizard (V2 Phase 3 · M-2, UX §5.2; U-1 D-132): Details → Modules → Team (a Team Lead per
// module, D-016) → Review. New projects start in Planning. Inline validation per step; server field errors jump back.
// Edit: the deadline changes only through "Extend deadline", people through the Team tab.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Check, Plus, Trash2, X } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import { BTN } from "@/components/ui/buttons";

const STEPS_CREATE = ["details", "modules", "team", "review"];
const STEPS_EDIT = ["details", "review"];
const STEP_LABEL = { details: "Details", modules: "Modules", team: "Team", review: "Review" };
const CATEGORIES = ["Web Application", "Mobile App", "API / Backend", "Design", "QA / Testing", "DevOps", "Data / Analytics", "Other"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const ROLE_MIX = [["Designer", "Design"], ["Developer", "Development"], ["Tester", "Testing"]];
const FIELD_STEP = { title: "details", priority: "details", clientName: "details", description: "details", startDate: "details", deadline: "details", workingHoursPerDay: "details", techStack: "details", modules: "modules", teamLeadId: "team" };
const DRAFT_KEY = "achievion_project_drafts";
const today = () => new Date().toISOString().slice(0, 10);
const blank = { title: "", clientName: "", category: "Other", priority: "Medium", description: "", businessContext: "", startDate: "", deadline: "", workingHoursPerDay: 7, riskLevel: "Low", visibility: "team_only", modules: [], techStack: [], memberIds: [] };

const newModule = () => ({ title: "", roles: ["Developer"], dueDate: "", teamLeadId: "" });

function validate(f, step, mode) {
  const e = {};
  if (step === "details") {
    if (f.title.trim().length < 3) e.title = "Give the project a name (at least 3 characters).";
    else if (f.title.trim().length > 80) e.title = "Keep the name to 80 characters or fewer.";
    if (f.description.trim().length > 2000) e.description = "Keep the description to 2000 characters or fewer.";
    if (!f.startDate) e.startDate = "Pick a start date.";
    else if (mode === "create" && f.startDate < today()) e.startDate = "The start date cannot be in the past.";
    if (mode === "create") {
      if (!f.deadline) e.deadline = "Pick a deadline.";
      else if (f.startDate && f.deadline <= f.startDate) e.deadline = "The deadline must be after the start date.";
    }
    const h = Number(f.workingHoursPerDay);
    if (!(h >= 1 && h <= 24)) e.workingHoursPerDay = "Use 1 to 24 hours.";
  }
  if (step === "modules") {
    if (!f.modules.length) e.modules = "Add at least one module. Each module gets its own Team Lead.";
    else if (f.modules.some((m) => !m.title.trim())) e.modules = "Give every module a name, or remove the empty one.";
    else if (f.modules.some((m) => m.title.trim().length > 80)) e.modules = "Keep module names to 80 characters or fewer.";
    else if (f.modules.some((m) => !m.dueDate)) e.modules = "Give every module a deadline.";
    else if (f.modules.some((m) => (f.startDate && m.dueDate < f.startDate) || (f.deadline && m.dueDate > f.deadline))) e.modules = "Module deadlines must fall between the project start date and deadline.";
    else if (f.modules.some((m) => !m.roles.length)) e.modules = "Pick at least one kind of work for every module.";
  }
  if (step === "team" && mode === "create" && f.modules.some((m) => !m.teamLeadId)) e.teamLeadId = "Choose a Team Lead for every module.";
  return e;
}

function Field({ id, label, hint, error, children, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-text-primary">{label}{required && <span className="text-[#B01F17]"> *</span>}</label>
      {children}
      {error ? <p id={`${id}-err`} className="text-xs font-semibold text-[#B01F17]">{error}</p> : hint ? <p className="text-xs text-text-secondary">{hint}</p> : null}
    </div>
  );
}
const inputCls = (err) => `h-10 w-full rounded-xl px-3 text-sm ${err ? "!border-[#B01F17]" : ""}`;

export default function ProjectWizardPage() {
  const { id } = useParams();
  const mode = id ? "edit" : "create";
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const addToast = useUiStore((s) => s.addToast);
  const [f, setF] = useState(blank);
  const STEPS = mode === "edit" ? STEPS_EDIT : STEPS_CREATE;
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];
  const setStep = (k) => setStepIdx(typeof k === "string" ? Math.max(0, STEPS.indexOf(k)) : k);
  const [errors, setErrors] = useState({});
  const [people, setPeople] = useState(null);
  const [files, setFiles] = useState([]);
  const [techInput, setTechInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loaded, setLoaded] = useState(mode === "create");
  const dirty = useRef(false);
  const draftId = useRef(sp.get("draft") ?? null);
  const set = (k, v) => { dirty.current = true; setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  // Load project (edit) or draft (create)
  useEffect(() => {
    if (mode === "edit") {
      api.get(`/api/manager/projects/${id}`).then((p) => {
        setF({ ...blank, title: p.title ?? "", clientName: p.clientName ?? "", category: p.category ?? "Other", priority: p.priority ?? "Medium",
          description: p.description ?? "", businessContext: p.businessContext ?? "", startDate: p.startDate?.slice(0, 10) ?? "", deadline: p.deadline?.slice(0, 10) ?? "",
          workingHoursPerDay: p.workingHoursPerDay ?? 7, riskLevel: p.riskLevel ?? "Low", visibility: p.visibility ?? "team_only", techStack: p.techStack ?? [] });
        setLoaded(true);
      }).catch((e) => setLoadError(e?.message ?? "The project could not be loaded."));
      return;
    }
    if (draftId.current) {
      try {
        const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "[]").find((x) => x.id === draftId.current);
        if (d) { setF({ ...blank, ...d.form, modules: (d.form?.modules ?? []).map((m) => ({ ...newModule(), ...m })) }); setStepIdx(Number.isInteger(d.step) ? Math.min(d.step, 2) : 0); }
      } catch { /* bad draft: start clean */ }
    }
  }, [mode, id]);

  // People for the Team step
  useEffect(() => {
    if (mode !== "create" || step !== "team" || people) return;
    api.get("/api/manager/team-availability").then((d) => setPeople((d.members ?? []).filter((m) => !["Director", "Manager"].includes(m.role))))
      .catch(() => setPeople([]));
  }, [mode, step, people]);

  // Autosave draft (create only)
  useEffect(() => {
    if (mode !== "create" || !dirty.current || !f.title.trim()) return undefined;
    const t = setTimeout(() => {
      try {
        const all = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "[]");
        draftId.current ??= `draft_${Date.now()}`;
        const entry = { id: draftId.current, title: f.title, savedAt: new Date().toISOString(), step: stepIdx, form: f };
        localStorage.setItem(DRAFT_KEY, JSON.stringify([entry, ...all.filter((d) => d.id !== draftId.current)]));
      } catch { /* storage blocked */ }
    }, 1500);
    return () => clearTimeout(t);
  }, [f, stepIdx, mode]);

  // Unsaved changes warning
  useEffect(() => {
    const h = (e) => { if (dirty.current && !saving) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [saving]);

  const teamLeads = useMemo(() => (people ?? []).filter((p) => p.role === "Team Lead"), [people]);
  const others = useMemo(() => (people ?? []).filter((p) => p.role !== "Team Lead"), [people]);

  function next() {
    const e = validate(f, step, mode);
    setErrors(e);
    if (Object.keys(e).length) { document.getElementById(Object.keys(e)[0])?.focus(); return; }
    setStepIdx((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function addTech() {
    const v = techInput.trim().replace(/,$/, "");
    if (v && v.length <= 40 && !f.techStack.includes(v) && f.techStack.length < 30) set("techStack", [...f.techStack, v]);
    setTechInput("");
  }

  async function submit() {
    for (const s of STEPS) { const e = validate(f, s, mode); if (Object.keys(e).length) { setErrors(e); setStep(s); return; } }
    setSaving(true);
    try {
      if (mode === "edit") {
        await api.patch(`/api/manager/projects/${id}`, {
          title: f.title.trim(), clientName: f.clientName, category: f.category, priority: f.priority, description: f.description, businessContext: f.businessContext,
          startDate: f.startDate, workingHoursPerDay: Number(f.workingHoursPerDay), riskLevel: f.riskLevel, visibility: f.visibility, techStack: f.techStack,
        });
        dirty.current = false;
        addToast({ type: "success", message: "Project saved." });
        navigate(`/manager/projects/${id}`);
        return;
      }
      const form = new FormData();
      for (const k of ["title", "clientName", "category", "priority", "description", "businessContext", "startDate", "deadline", "riskLevel", "visibility"]) form.append(k, String(f[k]).trim?.() ?? f[k]);
      form.append("teamLeadId", f.modules[0]?.teamLeadId ?? "");
      form.append("workingHoursPerDay", String(f.workingHoursPerDay));
      form.append("techStack", JSON.stringify(f.techStack));
      form.append("memberIds", JSON.stringify(f.memberIds));
      form.append("milestones", JSON.stringify(f.modules.map((m) => ({ title: m.title.trim(), activeRoles: m.roles, dueDate: m.dueDate, teamLeadId: m.teamLeadId }))));
      files.forEach((file) => form.append("attachments", file));
      const res = await api.upload("/api/manager/projects", form);
      dirty.current = false;
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "[]").filter((d) => d.id !== draftId.current))); } catch { /* */ }
      addToast({ type: "success", message: `"${f.title.trim()}" created.` });
      navigate(`/manager/projects/${res.id}`);
    } catch (e) {
      const fields = e?.data?.fields;
      if (fields) { setErrors(fields); setStep(STEPS.find((s) => Object.keys(fields).some((k) => FIELD_STEP[k] === s)) ?? "review"); }
      addToast({ type: "error", message: e?.message ?? "The project could not be saved." });
    } finally { setSaving(false); }
  }

  const title = mode === "edit" ? "Edit project" : "New project";
  if (loadError) return <Page><ErrorState message={loadError} onRetry={() => window.location.reload()} /></Page>;

  return (
    <Page>
      <div>
        <Breadcrumb items={[{ label: "Projects", to: "/manager/projects" }, ...(mode === "edit" ? [{ label: f.title || "Project", to: `/manager/projects/${id}` }] : []), { label: title }]} />
        <PageHeader title={title} subtitle={mode === "edit" ? "Change the details. The deadline moves with Extend deadline, people on the Team tab." : "Four short steps. The project starts in Planning; you can leave and come back, a draft is kept on this device."} />
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => i < stepIdx && setStepIdx(i)} disabled={i > stepIdx} aria-current={i === stepIdx ? "step" : undefined}
              className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-bold transition-colors ${i === stepIdx ? "border-accent/30 bg-accent/10 text-accent-text" : i < stepIdx ? "border-ink/[0.08] bg-bg-surface text-text-primary hover:bg-bg-muted" : "border-ink/[0.06] text-text-secondary"}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${i < stepIdx ? "bg-accent text-accent-on" : "bg-ink/[0.07]"}`}>{i < stepIdx ? <Check size={11} aria-hidden="true" /> : i + 1}</span>
              {STEP_LABEL[s]}
            </button>
          </li>
        ))}
      </ol>

      <section className="glass-panel flex flex-col gap-5 rounded-2xl border border-ink/[0.07] p-6" aria-label={STEP_LABEL[step]}>
        {!loaded ? <Skeleton className="h-64 rounded-2xl" /> : (<>
          {step === "details" && (<>
            <Field id="title" label="Project name" required error={errors.title} hint={`${f.title.trim().length}/80`}>
              <input id="title" name="title" maxLength={80} autoComplete="off" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Client portal…" className={inputCls(errors.title)} aria-invalid={!!errors.title} aria-describedby={errors.title ? "title-err" : undefined} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="clientName" label="Client" hint="Optional.">
                <input id="clientName" name="clientName" autoComplete="organization" value={f.clientName} onChange={(e) => set("clientName", e.target.value)} placeholder="e.g. Acme Ltd…" className={inputCls()} />
              </Field>
              <Field id="category" label="Type of work">
                <select id="category" value={f.category} onChange={(e) => set("category", e.target.value)} className={inputCls()}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
              </Field>
            </div>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-bold text-text-primary">Priority</legend>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map((p) => (
                  <label key={p} className={`inline-flex h-9 cursor-pointer items-center rounded-xl border px-4 text-sm font-bold ${f.priority === p ? "border-accent/30 bg-accent/10 text-accent-text" : "border-ink/[0.08] text-text-secondary hover:text-text-primary"}`}>
                    <input type="radio" name="priority" value={p} checked={f.priority === p} onChange={() => set("priority", p)} className="sr-only" />{p}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field id="description" label="What is this project?" error={errors.description} hint={`A few lines the team will read first. ${f.description.length}/2000`}>
              <textarea id="description" rows={4} maxLength={2000} value={f.description} onChange={(e) => set("description", e.target.value)} className="w-full rounded-xl p-3 text-sm" />
            </Field>
            <Field id="businessContext" label="Background for the team" hint="Optional: why the client wants it, constraints, links.">
              <textarea id="businessContext" rows={3} value={f.businessContext} onChange={(e) => set("businessContext", e.target.value)} className="w-full rounded-xl p-3 text-sm" />
            </Field>
            {mode === "create" && (
              <Field id="files" label="Files" hint="Optional: brief, contract, designs (up to 10 files).">
                <input id="files" type="file" multiple onChange={(e) => setFiles([...e.target.files].slice(0, 10))} className="text-sm" />
              </Field>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="startDate" label="Start date" required error={errors.startDate}>
                <input id="startDate" type="date" min={mode === "create" ? today() : undefined} value={f.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputCls(errors.startDate)} aria-invalid={!!errors.startDate} />
              </Field>
              <Field id="deadline" label="Deadline" required={mode === "create"} error={errors.deadline}
                hint={mode === "edit" ? "To move the deadline, use Extend deadline on the project page." : undefined}>
                <input id="deadline" type="date" min={f.startDate || today()} value={f.deadline} disabled={mode === "edit"} onChange={(e) => set("deadline", e.target.value)} className={inputCls(errors.deadline)} aria-invalid={!!errors.deadline} />
              </Field>
              <Field id="workingHoursPerDay" label="Working hours per day" error={errors.workingHoursPerDay}>
                <input id="workingHoursPerDay" type="number" inputMode="numeric" min={1} max={24} value={f.workingHoursPerDay} onChange={(e) => set("workingHoursPerDay", e.target.value)} className={inputCls(errors.workingHoursPerDay)} />
              </Field>
              <Field id="riskLevel" label="Risk">
                <select id="riskLevel" value={f.riskLevel} onChange={(e) => set("riskLevel", e.target.value)} className={inputCls()}>{["Low", "Medium", "High", "Critical"].map((r) => <option key={r}>{r}</option>)}</select>
              </Field>
            </div>
            <Field id="tech" label="Tech stack" hint="Press Enter after each one. Optional.">
              <input id="tech" autoComplete="off" value={techInput} onChange={(e) => setTechInput(e.target.value)} placeholder="e.g. React, Node.js…"
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTech(); } }} className={inputCls(errors.techStack)} />
              {f.techStack.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {f.techStack.map((t) => (
                    <li key={t} className="inline-flex h-8 items-center gap-1 rounded-lg border border-accent/25 bg-accent/10 pl-2.5 text-xs font-bold text-accent-text">
                      {t}<button type="button" aria-label={`Remove ${t}`} onClick={() => set("techStack", f.techStack.filter((x) => x !== t))} className="inline-flex h-8 w-7 items-center justify-center"><X size={11} aria-hidden="true" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </Field>
          </>)}

          {step === "modules" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary">Modules</p>
                  <p className="text-xs text-text-secondary">Parts of the project. At least one; each gets its own Team Lead on the next step.</p>
                </div>
                <button type="button" className={BTN.secondary} onClick={() => set("modules", [...f.modules, newModule()])}><Plus size={14} aria-hidden="true" /> Add module</button>
              </div>
              {f.modules.length === 0 && <p className="rounded-xl border border-dashed border-ink/[0.12] px-4 py-6 text-center text-sm text-text-secondary">No modules yet. Add the first one, e.g. "Login and accounts".</p>}
              {f.modules.map((m, i) => {
                const upd = (patch) => set("modules", f.modules.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-ink/[0.07] p-3">
                    <input aria-label={`Module ${i + 1} name`} value={m.title} maxLength={80} placeholder="e.g. Login and accounts…" autoComplete="off"
                      onChange={(e) => upd({ title: e.target.value })} className="h-9 min-w-[200px] flex-1 rounded-xl px-3 text-sm" />
                    <input type="date" aria-label={`Module ${i + 1} deadline`} value={m.dueDate} min={f.startDate || undefined} max={f.deadline || undefined}
                      onChange={(e) => upd({ dueDate: e.target.value })} className="h-9 rounded-xl px-3 text-sm" />
                    <span className="flex gap-1" role="group" aria-label={`Module ${i + 1} work types`}>
                      {ROLE_MIX.map(([val, lbl]) => {
                        const on = m.roles.includes(val);
                        return <button key={val} type="button" aria-pressed={on} onClick={() => upd({ roles: on ? m.roles.filter((r) => r !== val) : [...m.roles, val] })}
                          className={`h-8 rounded-lg border px-2.5 text-xs font-bold ${on ? "border-accent/30 bg-accent/10 text-accent-text" : "border-ink/[0.08] text-text-secondary"}`}>{lbl}</button>;
                      })}
                    </span>
                    <button type="button" className={BTN.icon} aria-label={`Remove module ${i + 1}`} onClick={() => set("modules", f.modules.filter((_, j) => j !== i))}><Trash2 size={15} aria-hidden="true" /></button>
                  </div>
                );
              })}
              {errors.modules && <p id="modules" tabIndex={-1} className="text-xs font-semibold text-[#B01F17]">{errors.modules}</p>}
            </div>
          )}

          {step === "team" && (!people ? <Skeleton className="h-48 rounded-2xl" /> : (<>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-bold text-text-primary">Team Lead per module <span className="text-[#B01F17]">*</span></legend>
              <p className="-mt-1 text-xs text-text-secondary">Each Team Lead runs the day-to-day work of their module and reviews its tasks.</p>
              {teamLeads.length ? f.modules.map((m, i) => (
                <div key={i} className="grid items-center gap-2 rounded-xl border border-ink/[0.07] p-3 sm:grid-cols-[minmax(0,1fr)_280px]">
                  <p className="min-w-0 truncate text-sm font-semibold text-text-primary" title={m.title}>{m.title}</p>
                  <select id={i === 0 ? "teamLeadId" : undefined} aria-label={`Team Lead for ${m.title}`} value={m.teamLeadId} aria-invalid={!!errors.teamLeadId && !m.teamLeadId}
                    onChange={(e) => { set("modules", f.modules.map((x, j) => (j === i ? { ...x, teamLeadId: e.target.value } : x))); setErrors((er) => ({ ...er, teamLeadId: undefined })); }}
                    className={`${inputCls(errors.teamLeadId && !m.teamLeadId)} min-w-0`}>
                    <option value="">Choose a Team Lead</option>
                    {teamLeads.map((p) => <option key={p.id} value={p.id}>{p.name}{p.availability ? ` (${p.availability})` : ""}</option>)}
                  </select>
                </div>
              )) : <p className="text-sm font-semibold text-[#B01F17]">Your organisation has no Team Lead yet. Ask the Director to add one.</p>}
              {errors.teamLeadId && <p className="text-xs font-semibold text-[#B01F17]">{errors.teamLeadId}</p>}
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-bold text-text-primary">Team members <span className="font-normal text-text-secondary">({f.memberIds.length} chosen)</span></legend>
              {others.length ? (
                <ul className="grid max-h-80 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  {others.map((p) => (
                    <li key={p.id}>
                      <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl border border-ink/[0.07] px-3 py-2 hover:bg-ink/[0.03]">
                        <input type="checkbox" checked={f.memberIds.includes(p.id)} onChange={(e) => set("memberIds", e.target.checked ? [...f.memberIds, p.id] : f.memberIds.filter((x) => x !== p.id))} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{p.name}</span>
                        <span className="text-xs text-text-secondary">{p.role}</span>
                        {p.availability === "Overloaded" && <span className="text-xs font-bold text-[#B01F17]">needs a lighter load</span>}
                      </label>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-text-secondary">No other people to add yet.</p>}
              <p className="mt-2 text-xs text-text-secondary">The project can start (Active) once a module has a Team Lead and at least one member.</p>
            </fieldset>
          </>))}

          {step === "review" && (
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[180px_1fr]">
              {[["Name", f.title], ["Client", f.clientName || "—"], ["Type", f.category], ["Priority", f.priority],
                ["Dates", `${f.startDate || "—"} → ${f.deadline || "—"}`], ["Hours per day", f.workingHoursPerDay],
                ...(mode === "create" ? [["Modules", f.modules.map((m) => `${m.title} (${teamLeads.find((p) => p.id === m.teamLeadId)?.name ?? "no Team Lead"}, due ${m.dueDate || "—"})`).join(" · ") || "None"],
                  ["Members", `${f.memberIds.length} chosen`], ["Files", `${files.length}`], ["Starts as", "Planning"]] : []),
                ["Tech stack", f.techStack.join(", ") || "—"]].map(([k, v]) => (
                <div key={k} className="contents"><dt className="font-semibold text-text-secondary">{k}</dt><dd className="min-w-0 break-words font-semibold text-text-primary">{v}</dd></div>
              ))}
            </dl>
          )}
        </>)}
      </section>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-ink/[0.06] bg-[#F5F6FA]/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="button" className={BTN.ghost} onClick={() => (stepIdx ? setStepIdx(stepIdx - 1) : navigate(mode === "edit" ? `/manager/projects/${id}` : "/manager/projects"))}>
          {stepIdx ? "Back" : "Cancel"}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary tabular-nums">Step {stepIdx + 1} of {STEPS.length}</span>
          {stepIdx < STEPS.length - 1
            ? <button type="button" className={BTN.primary} onClick={next}>Continue</button>
            : <button type="button" className={BTN.primary} onClick={submit} disabled={saving}>{saving ? "Saving…" : mode === "edit" ? "Save changes" : "Create project"}</button>}
        </div>
      </div>
    </Page>
  );
}
