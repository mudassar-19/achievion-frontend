// Create / edit a sprint (UX §6). Drawer with sticky footer. Overlap is a warning; the server enforces the rest.
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import Drawer from "@/components/ui/Drawer";
import { BTN } from "@/components/ui/buttons";
import { fmt } from "../project/format";

const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const blank = (projectId = "") => ({ name: "", goal: "", startDate: "", endDate: "", projectId });
const ERR = "text-xs font-semibold text-[#B01F17]";

export default function SprintDrawer({ open, onClose, sprint = null, projects = [], projectId = "", onSaved, base = "/api/manager" }) {
  const edit = !!sprint;
  const active = sprint?.status === "Active";
  const [form, setForm] = useState(blank(projectId));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [siblings, setSiblings] = useState([]);

  useEffect(() => {
    if (!open) return;
    setErrors({}); // eslint-disable-line react-hooks/set-state-in-effect
    setForm(sprint ? { name: sprint.name, goal: sprint.goal ?? "", startDate: day(sprint.startDate), endDate: day(sprint.endDate), projectId: String(sprint.project?.id ?? "") } : blank(projectId));
  }, [open, sprint, projectId]);

  // Other sprints of the chosen project → live overlap / active warnings.
  useEffect(() => {
    if (!open || !form.projectId) { setSiblings([]); return; } // eslint-disable-line react-hooks/set-state-in-effect
    let live = true;
    api.get(`${base}/projects/${form.projectId}/sprints`).then((r) => live && setSiblings(r.sprints ?? [])).catch(() => live && setSiblings([]));
    return () => { live = false; };
  }, [open, form.projectId, base]);

  const others = siblings.filter((s) => String(s.id) !== String(sprint?.id ?? ""));
  const overlaps = form.startDate && form.endDate ? others.filter((s) => s.status !== "Completed" && s.startDate && s.endDate
    && day(s.startDate) <= form.endDate && day(s.endDate) >= form.startDate) : [];
  const running = others.find((s) => ["Active", "Under Review", "Delayed"].includes(s.status));
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => (x[k] || x.form ? { ...x, [k]: undefined, form: undefined } : x)); };

  function check() {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Give the sprint a name (2–80 characters).";
    if (!edit && !form.projectId) e.projectId = "Choose the project this sprint belongs to.";
    if (!form.startDate) e.startDate = "Pick a start date.";
    if (!form.endDate) e.endDate = "Pick an end date.";
    else if (form.startDate && form.endDate <= form.startDate) e.endDate = "The end date must be after the start date.";
    return e;
  }

  async function submit() {
    const e = check();
    setErrors(e);
    const first = ["name", "projectId", "startDate", "endDate"].find((k) => e[k]);
    if (first) { document.getElementById(`sp-${first}`)?.focus(); return; }
    setBusy(true);
    try {
      const body = { name: form.name.trim(), goal: form.goal.trim(), startDate: form.startDate, endDate: form.endDate };
      const r = edit ? await api.patch(`${base}/sprints/${sprint.id}`, body) : await api.post(`${base}/sprints`, { ...body, projectId: form.projectId });
      onSaved(r.id ?? sprint.id, r.overlaps ?? []);
      onClose();
    } catch (err) {
      setErrors(err?.data?.fields ?? { form: err?.message ?? "The sprint could not be saved." });
    } finally { setBusy(false); }
  }

  const field = "h-10 rounded-xl px-3 font-normal";
  return (
    <Drawer open={open} onClose={onClose} title={edit ? "Edit sprint" : "New sprint"}
      footer={<div className="flex justify-end gap-2"><button type="button" className={BTN.secondary} onClick={onClose}>Cancel</button>
        <button type="button" className={BTN.primary} disabled={busy} onClick={submit}>{busy ? "Saving…" : edit ? "Save changes" : "Create sprint"}</button></div>}>
      <div className="flex flex-col gap-4 p-5 text-sm">
        {errors.form && <p role="alert" className={ERR}>{errors.form}</p>}
        <label htmlFor="sp-projectId" className="flex flex-col gap-1.5 font-bold text-text-primary">Project
          <select id="sp-projectId" value={form.projectId} onChange={set("projectId")} disabled={edit} aria-invalid={!!errors.projectId} className={field}>
            <option value="">Choose a project…</option>
            {edit && sprint.project && !projects.some((p) => String(p.id) === String(sprint.project.id)) && <option value={sprint.project.id}>{sprint.project.title}</option>}
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {errors.projectId && <span className={ERR}>{errors.projectId}</span>}
          {edit && <span className="text-xs font-normal text-text-secondary">A sprint stays in its project.</span>}
        </label>
        <label htmlFor="sp-name" className="flex flex-col gap-1.5 font-bold text-text-primary">Name
          <input id="sp-name" value={form.name} onChange={set("name")} maxLength={80} autoComplete="off" placeholder="e.g. Sprint 4: checkout" aria-invalid={!!errors.name} className={field} />
          {errors.name && <span className={ERR}>{errors.name}</span>}
        </label>
        <label htmlFor="sp-goal" className="flex flex-col gap-1.5 font-bold text-text-primary">Goal <span className="sr-only">(optional)</span>
          <textarea id="sp-goal" rows={3} maxLength={500} value={form.goal} onChange={set("goal")} placeholder="What should be true when this sprint ends?" className="rounded-xl p-3 font-normal" />
          <span className="text-xs font-normal text-text-secondary">Optional · {form.goal.length}/500</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label htmlFor="sp-startDate" className="flex flex-col gap-1.5 font-bold text-text-primary">Start date
            <input id="sp-startDate" type="date" value={form.startDate} onChange={set("startDate")} disabled={active} aria-invalid={!!errors.startDate} className={field} />
            {errors.startDate && <span className={ERR}>{errors.startDate}</span>}
          </label>
          <label htmlFor="sp-endDate" className="flex flex-col gap-1.5 font-bold text-text-primary">End date
            <input id="sp-endDate" type="date" min={form.startDate || undefined} value={form.endDate} onChange={set("endDate")} aria-invalid={!!errors.endDate} className={field} />
            {errors.endDate && <span className={ERR}>{errors.endDate}</span>}
          </label>
        </div>
        {active && <p className="text-xs text-text-secondary">The sprint is running, so its start date is fixed.</p>}
        {(overlaps.length > 0 || (running && !active)) && (
          <div role="status" className="flex gap-2.5 rounded-xl border border-[#8A6200]/25 bg-[#FFC21A]/10 p-3 text-xs text-[#5C3D00]">
            <AlertTriangle size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              {overlaps.length > 0 && <p>These dates overlap {overlaps.map((s) => `"${s.name}" (${fmt(s.startDate)} – ${fmt(s.endDate)})`).join(", ")}. You can still save.</p>}
              {running && !active && <p>"{running.name}" is active in this project. This sprint can start once it is closed.</p>}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
