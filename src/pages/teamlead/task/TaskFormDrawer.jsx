// Team Lead task create / edit drawer, 560px (V2 Phase 4 · T-2, UX TL v4 §5, D-012, D-118). Sections: Basics, Plan,
// Assign (one person or a group → one separate task each), Quality, Structure, Files. AI suggest (existing task-suggest)
// fills description / estimate / tags only after Accept. Inline errors; closing with unsaved changes asks first.
// The server re-checks everything (POST /api/teamlead/tasks/create, PATCH /api/teamlead/tasks/:id/edit).
import { AssignHint } from "../TLAiCards";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, X, Plus } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Drawer from "@/components/ui/Drawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { BTN } from "@/components/ui/buttons";
import { TONE } from "../../manager/resources/tone";

const TYPES = ["Feature", "Bug", "Design", "Testing", "DevOps", "Documentation"];
const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Critical"];
const ERR = "text-xs font-semibold text-[#B01F17]";
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const blank = (preset = {}) => ({ sprintId: "", projectId: "", title: "", description: "", type: "Feature", priority: "Medium", difficulty: "Medium", estimatedHours: "", startDate: "", deadline: "",
  tags: [], xpValue: "", acceptanceCriteria: [], benchmark: "", qaRequired: false, parentId: "", dependsOn: [], mode: "single", userId: "", userIds: [], ...preset });

// Same checks as the server (taskFormRules.validateTaskInput), shown before sending.
function check(f, editing) {
  const e = {};
  if (!editing && !f.projectId) e.projectId = "Pick the module or project.";
  if (f.title.trim().length < 3 || f.title.trim().length > 120) e.title = "Write a title of 3 to 120 characters.";
  const h = Number(f.estimatedHours);
  if (f.estimatedHours === "" || Number.isNaN(h)) e.estimatedHours = "Give an estimate in hours (1 to 14).";
  else if (h < 1) e.estimatedHours = "Estimate 1 to 14 hours. Smaller work: merge it into another task.";
  else if (h > 14) e.estimatedHours = "Estimate 1 to 14 hours. Bigger work: split it into smaller tasks.";
  if (f.startDate && f.deadline && f.deadline < f.startDate) e.deadline = "The deadline cannot be before the start date.";
  if (f.xpValue !== "" && !(Number.isInteger(Number(f.xpValue)) && Number(f.xpValue) >= 10 && Number(f.xpValue) <= 1000)) e.xpValue = "XP is a whole number from 10 to 1000, or empty for the default.";
  if (!editing && f.mode === "single" && !f.userId) e.assign = "Pick the person who does this task, or choose Unassigned.";
  if (!editing && f.mode === "group" && f.userIds.length < 2) e.assign = "Pick at least two people for a group task.";
  if (f.acceptanceCriteria.filter((c) => c.trim()).length > 10) e.acceptanceCriteria = "Up to 10 criteria.";
  return e;
}

function Section({ title, children }) {
  return (
    <fieldset className="flex flex-col gap-3 border-t border-ink/[0.06] pt-4 first:border-t-0 first:pt-0">
      <legend className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{title}</legend>
      {children}
    </fieldset>
  );
}

// open, task (edit: the full task detail), preset ({ projectId, parentId }), onClose, onSaved(result)
export default function TaskFormDrawer({ open, task = null, preset = null, onClose, onSaved }) {
  const addToast = useUiStore((s) => s.addToast);
  const editing = !!task;
  const [f, setF] = useState(blank());
  const [start, setStart] = useState(blank());
  const [errors, setErrors] = useState({});
  const [modules, setModules] = useState(null);
  const [ctx, setCtx] = useState(null); // module detail: team (with load) + tasks
  const [sprintRows, setSprintRows] = useState({ projectId: "", list: [] }); // T-5 (D-143): open sprints of the project
  const [tagInput, setTagInput] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmGroup, setConfirmGroup] = useState(false);
  const [ai, setAi] = useState({ status: "idle" });
  const [bench, setBench] = useState({ status: "idle" }); // T-3: benchmark suggestion (D-019)

  useEffect(() => {
    if (!open) return;
    const init = editing ? blank({ projectId: String(task.projectId ?? ""), title: task.title, description: task.description ?? "", type: task.type, priority: task.priority, difficulty: task.difficulty ?? "Medium",
      estimatedHours: task.estimatedHours ?? "", startDate: day(task.startDate), deadline: day(task.deadline), tags: task.tags ?? [], xpValue: task.xpValue ?? "",
      acceptanceCriteria: task.acceptanceCriteria ?? [], benchmark: task.benchmark ?? "", qaRequired: !!task.qaRequired, parentId: task.parent?.id ? String(task.parent.id) : "",
      dependsOn: (task.dependsOn ?? []).map((d) => String(d.id)), sprintId: task.sprint?.id ? String(task.sprint.id) : "" }) : blank(preset ?? {});
    setF(init); setStart(init); setErrors({}); setFiles([]); setTagInput(""); setAi({ status: "idle" }); setBench({ status: "idle" }); // eslint-disable-line react-hooks/set-state-in-effect
    if (!editing) api.get("/api/teamlead/modules").then((d) => setModules(d.modules.filter((m) => m.state !== "Completed"))).catch(() => setModules([]));
  }, [open, task]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCtx(null); // eslint-disable-line react-hooks/set-state-in-effect
    if (open && f.projectId) api.get(`/api/teamlead/modules/${f.projectId}`).then(setCtx).catch(() => setCtx({ team: [], tasks: [] }));
  }, [open, f.projectId]);
  useEffect(() => {
    if (!open || !f.projectId) return undefined;
    let live = true;
    api.get(`/api/teamlead/projects/${f.projectId}/sprints`).then((r) => live && setSprintRows({ projectId: f.projectId, list: (r.sprints ?? []).filter((x) => x.status !== "Completed") })).catch(() => live && setSprintRows({ projectId: f.projectId, list: [] }));
    return () => { live = false; };
  }, [open, f.projectId]);
  const sprints = sprintRows.projectId === f.projectId ? sprintRows.list : [];

  const dirty = useMemo(() => JSON.stringify(f) !== JSON.stringify(start) || files.length > 0, [f, start, files]);
  // Changing who does it clears the Assign error too (it is shown under the whole section).
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); const also = ["mode", "userId", "userIds"].includes(k) ? "assign" : k; setErrors((e) => (e[k] || e[also] || e.form ? { ...e, [k]: undefined, [also]: undefined, form: undefined } : e)); };
  const close = () => (dirty && !busy ? setLeaving(true) : onClose());
  const team = (ctx?.team ?? []).filter((m) => !/Team Lead/.test(m.role));
  const projectTasks = (ctx?.tasks ?? []).filter((t) => String(t.id) !== String(task?.id ?? ""));

  function suggestAssignee() {
    const best = [...team].sort((a, b) => (a.status === "Overloaded") - (b.status === "Overloaded") || a.activeTasks - b.activeTasks)[0];
    if (best) set("userId", String(best.id));
  }
  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    if (t.length > 24) { setErrors((e) => ({ ...e, tags: "A tag has at most 24 characters." })); return; }
    if (f.tags.length >= 5 && !f.tags.includes(t)) { setErrors((e) => ({ ...e, tags: "Use at most 5 tags." })); return; }
    set("tags", [...new Set([...f.tags, t])]); setTagInput("");
  }
  async function askAi() {
    if (f.title.trim().length < 3) { setErrors((e) => ({ ...e, title: "Write a title first; the AI suggests from it." })); document.getElementById("tf-title")?.focus(); return; }
    setAi({ status: "loading" });
    try {
      const r = await api.post("/api/teamlead/ai/task-suggest", { title: f.title, type: f.type, priority: f.priority, difficulty: f.difficulty, description: f.description, projectId: f.projectId }, { silent: true });
      setAi({ status: "done", s: r.suggestion });
    } catch (e) { setAi({ status: "error", message: e?.status === 503 ? "AI is not configured. Fill the fields yourself." : e?.message ?? "AI is unavailable right now. Try again." }); }
  }
  async function suggestBenchmark() {
    if (f.title.trim().length < 3) { setErrors((e) => ({ ...e, title: "Write a title first; the AI suggests from it." })); document.getElementById("tf-title")?.focus(); return; }
    setBench({ status: "loading" });
    try { const r = await api.post("/api/teamlead/ai/benchmark", { projectId: f.projectId, title: f.title, description: f.description, type: f.type, acceptanceCriteria: f.acceptanceCriteria }, { silent: true }); setBench({ status: "done", text: r.benchmark }); }
    catch (e) { setBench({ status: "error", message: e?.status === 503 ? "AI is not configured. Write the benchmark yourself." : e?.message ?? "AI is unavailable right now. Try again." }); }
  }
  function acceptAi(focusDescription) {
    const s = ai.s;
    setF((x) => ({ ...x, description: s.description, estimatedHours: Math.min(14, Math.max(1, s.estimatedHours)), tags: [...new Set([...x.tags, ...s.tags])].slice(0, 5) }));
    setAi({ status: "idle" });
    if (focusDescription) setTimeout(() => document.getElementById("tf-desc")?.focus(), 0);
  }

  async function submit(groupConfirmed = false) {
    const e = check(f, editing); setErrors(e);
    const first = ["projectId", "title", "estimatedHours", "deadline", "xpValue", "assign", "acceptanceCriteria"].find((k) => e[k]);
    if (first) { document.getElementById(`tf-${first}`)?.focus(); return; }
    if (!editing && f.mode === "group" && !groupConfirmed) { setConfirmGroup(true); return; }
    setConfirmGroup(false); setBusy(true);
    const body = { title: f.title.trim(), description: f.description.trim(), type: f.type, priority: f.priority, difficulty: f.difficulty, estimatedHours: Number(f.estimatedHours),
      startDate: f.startDate || null, deadline: f.deadline || null, tags: f.tags, xpValue: f.xpValue === "" ? undefined : Number(f.xpValue),
      acceptanceCriteria: f.acceptanceCriteria.map((c) => c.trim()).filter(Boolean), benchmark: f.benchmark.trim(), qaRequired: f.qaRequired,
      parentId: f.parentId || null, dependsOn: f.dependsOn, ...(editing || f.sprintId ? { sprintId: f.sprintId } : {}) };
    try {
      let result;
      if (editing) result = await api.patch(`/api/teamlead/tasks/${task.id}/edit`, body);
      else {
        result = await api.post("/api/teamlead/tasks/create", { ...body, projectId: f.projectId, assign: f.mode === "none" ? { mode: "none" } : f.mode === "single" ? { mode: "single", userId: f.userId } : { mode: "group", userIds: f.userIds } });
        if (files.length) for (const t of result.tasks) { const fd = new FormData(); files.forEach((x) => fd.append("files", x)); await api.upload(`/api/teamlead/tasks/${t.id}/attachments`, fd).catch(() => addToast({ type: "error", message: `Files could not be added to "${t.title}".` })); }
        if (result.warnings?.length) addToast({ type: "info", message: result.warnings[0] });
      }
      onSaved(result); onClose();
    } catch (err) {
      const fields = err?.data?.fields ?? {};
      setErrors({ ...fields, ...(Object.keys(fields).length ? {} : { form: err?.message ?? "The task could not be saved." }) });
    } finally { setBusy(false); }
  }

  const field = "h-10 rounded-xl px-3 font-normal";
  const lbl = "flex flex-col gap-1.5 font-bold text-text-primary";
  const groupN = f.userIds.length;
  return (
    <>
      <Drawer open={open} onClose={close} title={editing ? "Edit task" : "New task"} width={560}
        footer={<div className="flex items-center justify-between gap-2">
          <span className="text-xs text-text-secondary">{!editing && f.mode === "group" && groupN >= 2 ? `${groupN} separate tasks will be created.` : ""}</span>
          <span className="flex gap-2"><button type="button" className={BTN.secondary} onClick={close}>Cancel</button>
            <button type="button" className={BTN.primary} disabled={busy} onClick={() => submit()}>{busy ? "Saving…" : editing ? "Save changes" : f.mode === "group" && groupN >= 2 ? `Create ${groupN} tasks` : "Create task"}</button></span>
        </div>}>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-5 p-5 text-sm" noValidate>
          {errors.form && <p role="alert" className={ERR}>{errors.form}</p>}

          <Section title="Basics">
            {!editing && (
              <label htmlFor="tf-projectId" className={lbl}>Module or project
                <select id="tf-projectId" value={f.projectId} onChange={(e) => { set("projectId", e.target.value); set("userId", ""); set("userIds", []); set("dependsOn", []); set("parentId", ""); }} aria-invalid={!!errors.projectId} className={field} disabled={!!preset?.projectId}>
                  <option value="">{modules ? "Choose…" : "Loading…"}</option>
                  {[...new Map((modules ?? []).map((m) => [String(m.projectId), m])).values()].map((m) => <option key={m.projectId} value={m.projectId}>{m.kind === "module" ? `${m.title} · ${m.project}` : m.title}</option>)}
                </select>
                {errors.projectId && <span className={ERR}>{errors.projectId}</span>}
              </label>
            )}
            <label htmlFor="tf-title" className={lbl}>Title
              <input id="tf-title" name="title" autoComplete="off" maxLength={120} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Login form with inline errors…" aria-invalid={!!errors.title} className={field} />
              {errors.title && <span className={ERR}>{errors.title}</span>}
            </label>
            <div className="flex flex-col gap-2 rounded-xl border border-accent/15 bg-accent/[0.03] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-xs font-bold text-text-primary"><Sparkles size={13} aria-hidden="true" className="text-accent-text" />AI suggest: description, estimate, tags</span>
                <button type="button" className={BTN.secondary} disabled={ai.status === "loading"} onClick={askAi}>{ai.status === "loading" ? "Asking…" : "Suggest"}</button></div>
              {ai.status === "error" && <p role="status" className="text-xs text-text-secondary">{ai.message}</p>}
              {ai.status === "done" && (
                <div className="flex flex-col gap-2 text-xs" aria-live="polite">
                  <p className="whitespace-pre-wrap text-text-primary">{ai.s.description}</p>
                  <p className="text-text-secondary">Estimate {ai.s.estimatedHours} h{ai.s.estimatedHours > 14 ? " (over 14 h: split the task)" : ""} · tags {ai.s.tags.join(", ") || "none"} · {ai.s.why}</p>
                  <span className="flex flex-wrap gap-2"><button type="button" className={BTN.primary} onClick={() => acceptAi(false)}>Accept</button><button type="button" className={BTN.secondary} onClick={() => acceptAi(true)}>Edit</button><button type="button" className={BTN.ghost} onClick={() => setAi({ status: "idle" })}>Decline</button></span>
                  <span className="text-[11px] text-text-secondary">AI-generated. Nothing changes until you accept.</span>
                </div>
              )}
            </div>
            <label htmlFor="tf-desc" className={lbl}>Description <span className="sr-only">(optional)</span>
              <textarea id="tf-desc" name="description" rows={4} maxLength={4000} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="What to build and how it is checked…" className="rounded-xl p-3 font-normal" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="tf-type" className={lbl}>Category<select id="tf-type" value={f.type} onChange={(e) => set("type", e.target.value)} className={field}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
              <label htmlFor="tf-priority" className={lbl}>Priority<select id="tf-priority" value={f.priority} onChange={(e) => set("priority", e.target.value)} className={field}>{PRIORITIES.map((t) => <option key={t}>{t}</option>)}</select></label>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tf-tags" className="font-bold text-text-primary">Tags <span className="font-normal text-text-secondary">(up to 5)</span></label>
              <div className="flex flex-wrap items-center gap-1.5">
                {f.tags.map((t) => <span key={t} className="inline-flex items-center gap-1 rounded-full bg-ink/[0.05] py-0.5 pl-2.5 pr-1 text-xs font-semibold">{t}<button type="button" aria-label={`Remove tag ${t}`} onClick={() => set("tags", f.tags.filter((x) => x !== t))} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-ink/[0.08]"><X size={11} aria-hidden="true" /></button></span>)}
                <input id="tf-tags" name="tag" autoComplete="off" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }} placeholder="Type a tag and press Enter…" className="h-9 min-w-[160px] flex-1 rounded-xl px-3 font-normal" />
              </div>
              {errors.tags && <span className={ERR}>{errors.tags}</span>}
            </div>
            <label htmlFor="tf-xpValue" className={lbl}>XP <span className="font-normal text-text-secondary">(empty = default for the priority)</span>
              <input id="tf-xpValue" type="number" inputMode="numeric" min={10} max={1000} value={f.xpValue} onChange={(e) => set("xpValue", e.target.value)} aria-invalid={!!errors.xpValue} className={`${field} w-40 tabular-nums`} />
              {errors.xpValue && <span className={ERR}>{errors.xpValue}</span>}
            </label>
          </Section>

          <Section title="Plan">
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="tf-estimatedHours" className={lbl}>Estimate (hours)
                <input id="tf-estimatedHours" type="number" inputMode="decimal" min={1} max={14} step={0.25} value={f.estimatedHours} onChange={(e) => set("estimatedHours", e.target.value)} aria-invalid={!!errors.estimatedHours} aria-describedby="tf-hours-help" className={`${field} tabular-nums`} />
              </label>
              <label htmlFor="tf-difficulty" className={lbl}>Difficulty<select id="tf-difficulty" value={f.difficulty} onChange={(e) => set("difficulty", e.target.value)} className={field}>{DIFFICULTIES.map((t) => <option key={t}>{t}</option>)}</select></label>
            </div>
            <span id="tf-hours-help" className={errors.estimatedHours ? ERR : "-mt-1 text-xs text-text-secondary"}>{errors.estimatedHours ?? "A task is 1 to 14 hours of work (D-012)."}</span>
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="tf-startDate" className={lbl}>Start<input id="tf-startDate" type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} className={field} /></label>
              <label htmlFor="tf-deadline" className={lbl}>Deadline<input id="tf-deadline" type="date" min={f.startDate || undefined} value={f.deadline} onChange={(e) => set("deadline", e.target.value)} aria-invalid={!!errors.deadline} className={field} />
                {errors.deadline && <span className={ERR}>{errors.deadline}</span>}</label>
            </div>
            <label htmlFor="tf-sprintId" className={lbl}>Sprint
              <select id="tf-sprintId" value={f.sprintId} onChange={(e) => set("sprintId", e.target.value)} disabled={!f.projectId} className={field}>
                <option value="">No sprint</option>
                {sprints.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              {errors.sprintId && <span className={ERR}>{errors.sprintId}</span>}
              <span className="text-xs font-normal text-text-secondary">Open sprints of this project. Planning is on the Sprints page.</span></label>
          </Section>

          {!editing && (
            <Section title="Assign">
              <div role="radiogroup" aria-label="Who does it" className="inline-flex w-fit rounded-xl border border-ink/[0.08] bg-ink/[0.03] p-0.5">
                {[["single", "One person"], ["group", "Group"], ["none", "Unassigned"]].map(([k, l]) => (
                  <button key={k} type="button" role="radio" aria-checked={f.mode === k} onClick={() => set("mode", k)} className={`min-h-9 rounded-lg px-3 text-xs font-bold ${f.mode === k ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}>{l}</button>
                ))}
              </div>
              {f.mode !== "none" && !f.projectId && <p className="text-xs text-text-secondary">Pick the module first to see who is on it.</p>}
              {f.mode !== "none" && f.projectId && !ctx && <p role="status" className="text-xs text-text-secondary">Loading the team…</p>}
              {f.mode !== "none" && ctx && !team.length && <p className="text-xs text-text-secondary">Nobody is on this project yet. Ask your Manager to add people, or leave it unassigned.</p>}
              {f.mode === "single" && team.length > 0 && <AssignHint projectId={f.projectId} type={f.type} title={f.title} hours={f.estimatedHours} picked={f.userId} onApply={(id) => set("userId", id)} />}
              {f.mode !== "none" && team.length > 0 && (
                <ul id="tf-assign" tabIndex={-1} className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-xl border border-ink/[0.08] p-1" aria-label="Team members">
                  {team.map((m) => {
                    const id = String(m.id), on = f.mode === "single" ? f.userId === id : f.userIds.includes(id);
                    return (
                      <li key={id}>
                        <label className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 ${on ? "bg-accent/[0.07]" : "hover:bg-ink/[0.03]"}`}>
                          <input type={f.mode === "single" ? "radio" : "checkbox"} name="tf-person" checked={on} className="h-4 w-4 accent-[var(--accent)]"
                            onChange={() => (f.mode === "single" ? set("userId", id) : set("userIds", on ? f.userIds.filter((x) => x !== id) : [...f.userIds, id]))} />
                          <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{m.name}</span><span className="block text-xs text-text-secondary">{m.role} · {m.activeTasks} active</span></span>
                          <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: TONE[m.tone]?.text }}>{m.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {f.mode === "single" && team.length > 0 && <button type="button" className={`${BTN.ghost} self-start`} onClick={suggestAssignee}>Suggest assignee (most room)</button>}
              {f.mode === "group" && <p className="text-xs text-text-secondary">Each person gets their own task, with its own status, submission, score and XP. The tasks share a group tag.</p>}
              {errors.assign && <span role="alert" className={ERR}>{errors.assign}</span>}
              <p className="text-xs text-text-secondary">You can assign anyone on this project; the server warns when someone is over capacity.</p>
            </Section>
          )}

          <Section title="Quality">
            <div className="flex flex-col gap-1.5" id="tf-acceptanceCriteria" tabIndex={-1}>
              <span className="font-bold text-text-primary">Acceptance criteria</span>
              {f.acceptanceCriteria.map((c, i) => (
                <span key={i} className="flex items-center gap-2">
                  <input aria-label={`Criterion ${i + 1}`} value={c} maxLength={200} onChange={(e) => set("acceptanceCriteria", f.acceptanceCriteria.map((x, j) => (j === i ? e.target.value : x)))} className={`${field} flex-1`} />
                  <button type="button" aria-label={`Remove criterion ${i + 1}`} className={BTN.icon} onClick={() => set("acceptanceCriteria", f.acceptanceCriteria.filter((_, j) => j !== i))}><X size={14} aria-hidden="true" /></button>
                </span>
              ))}
              {f.acceptanceCriteria.length < 10 && <button type="button" className={`${BTN.ghost} self-start`} onClick={() => set("acceptanceCriteria", [...f.acceptanceCriteria, ""])}><Plus size={14} aria-hidden="true" />Add criterion</button>}
              {errors.acceptanceCriteria && <span className={ERR}>{errors.acceptanceCriteria}</span>}
            </div>
            <label htmlFor="tf-benchmark" className={lbl}>Benchmark <span className="font-normal text-text-secondary">(what "good" looks like)</span>
              <textarea id="tf-benchmark" rows={2} maxLength={1000} value={f.benchmark} onChange={(e) => set("benchmark", e.target.value)} placeholder="e.g. Page loads in under 2 s; no console errors…" className="rounded-xl p-3 font-normal" />
            </label>
            <div className="-mt-1 flex flex-wrap items-center gap-2">
              <button type="button" className={BTN.ghost} disabled={bench.status === "loading" || !f.projectId} onClick={suggestBenchmark}><Sparkles size={13} aria-hidden="true" />{bench.status === "loading" ? "Asking…" : "Suggest benchmark"}</button>
              {bench.status === "error" && <span role="status" className="text-xs text-text-secondary">{bench.message}</span>}
            </div>
            {bench.status === "done" && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-accent/15 bg-accent/[0.03] p-3 text-xs" aria-live="polite">
                <p className="text-text-primary">{bench.text}</p>
                <span className="flex gap-2"><button type="button" className={BTN.primary} onClick={() => { set("benchmark", bench.text); setBench({ status: "idle" }); }}>Accept</button>
                  <button type="button" className={BTN.secondary} onClick={() => { set("benchmark", bench.text); setBench({ status: "idle" }); setTimeout(() => document.getElementById("tf-benchmark")?.focus(), 0); }}>Edit</button>
                  <button type="button" className={BTN.ghost} onClick={() => setBench({ status: "idle" })}>Decline</button></span>
                <span className="text-[11px] text-text-secondary">AI-generated. Nothing changes until you accept.</span>
              </div>
            )}
            <label className="flex items-center gap-2 font-normal"><input type="checkbox" checked={f.qaRequired} onChange={(e) => set("qaRequired", e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />QA required (a Tester signs off before you approve)</label>
          </Section>

          <Section title="Structure">
            <label htmlFor="tf-parent" className={lbl}>Parent task <span className="font-normal text-text-secondary">(makes this a subtask)</span>
              <select id="tf-parent" value={f.parentId} onChange={(e) => set("parentId", e.target.value)} className={field} disabled={!f.projectId}>
                <option value="">None</option>{projectTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-text-primary">Depends on <span className="font-normal text-text-secondary">(cannot start until these are Done)</span></span>
              {projectTasks.length ? (
                <ul className="flex max-h-40 flex-col overflow-y-auto rounded-xl border border-ink/[0.08] p-1">
                  {projectTasks.filter((t) => t.status !== "Done" || f.dependsOn.includes(String(t.id))).slice(0, 60).map((t) => (
                    <li key={t.id}><label className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-normal hover:bg-ink/[0.03]">
                      <input type="checkbox" checked={f.dependsOn.includes(String(t.id))} onChange={(e) => set("dependsOn", e.target.checked ? [...f.dependsOn, String(t.id)] : f.dependsOn.filter((x) => x !== String(t.id)))} className="h-4 w-4 accent-[var(--accent)]" />
                      <span className="min-w-0 flex-1 truncate">{t.title}</span><span className="shrink-0 text-xs text-text-secondary">{t.status.replace("-", " ")}</span></label></li>
                  ))}
                </ul>
              ) : <p className="text-xs text-text-secondary">{f.projectId ? "No other tasks in this project yet." : "Pick the module first."}</p>}
              {errors.dependsOn && <span className={ERR}>{errors.dependsOn}</span>}
            </div>
          </Section>

          {!editing && (
            <Section title="Files">
              <label htmlFor="tf-files" className={lbl}>Attach files <span className="font-normal text-text-secondary">(PDF, DOC, DOCX, CSV, PNG, JPG; up to 5 files of 5 MB)</span>
                <input id="tf-files" type="file" multiple accept=".pdf,.doc,.docx,.csv,.png,.jpg,.jpeg" onChange={(e) => setFiles([...e.target.files].slice(0, 5))} className="text-sm font-normal" />
              </label>
              {files.length > 0 && <p className="text-xs text-text-secondary">{files.length} file{files.length === 1 ? "" : "s"} will be added after the task is created{f.mode === "group" ? ", to each task" : ""}.</p>}
            </Section>
          )}
          {editing && <p className="text-xs text-text-secondary">Files, subtasks and reassigning are on the task's own tabs.</p>}
        </form>
        {/* Inside the Drawer so the dialogs stack above it (M-4 pattern, layer z-[70]). */}
      <ConfirmModal open={leaving} layer="z-[70]" onClose={() => setLeaving(false)} onConfirm={() => { setLeaving(false); onClose(); }} destructive confirmLabel="Discard changes"
        title="Discard your changes?" body="What you typed in this task is not saved yet." />
      <ConfirmModal open={confirmGroup} layer="z-[70]" onClose={() => setConfirmGroup(false)} onConfirm={() => submit(true)} loading={busy} confirmLabel={`Create ${groupN} tasks`}
        title={`Create ${groupN} separate tasks?`} body={`"${f.title.trim()}" is created once for each of the ${groupN} people. Each task has its own status, submission, score and XP; they share a group tag.`} />
      </Drawer>
    </>
  );
}
