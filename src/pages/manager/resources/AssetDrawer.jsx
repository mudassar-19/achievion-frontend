// Create / edit an asset (FR11-05): Tool / License / File link, notes, optional expiry, linked projects.
import { useEffect, useState } from "react";
import api from "@/lib/api";
import Drawer from "@/components/ui/Drawer";
import { BTN } from "@/components/ui/buttons";

const TYPES = ["Tool", "License", "File link"];
const ERR = "text-xs font-semibold text-[#B01F17]";
const blank = { name: "", type: "Tool", url: "", notes: "", expiresAt: "", projectIds: [] };

export default function AssetDrawer({ open, onClose, asset = null, projects = [], onSaved }) {
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setErrors({}); // eslint-disable-line react-hooks/set-state-in-effect
    setForm(asset ? { name: asset.name, type: asset.type, url: asset.url ?? "", notes: asset.notes ?? "", expiresAt: asset.expiresAt ? asset.expiresAt.slice(0, 10) : "", projectIds: asset.projects.map((p) => String(p.id)) } : blank);
  }, [open, asset]);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => (e[k] || e.form ? { ...e, [k]: undefined, form: undefined } : e)); };

  async function submit() {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Give the asset a name (2–120 characters).";
    if (form.url.trim() && !/^https?:\/\/\S+$/i.test(form.url.trim())) e.url = "Use a full link that starts with https://";
    if (form.type === "File link" && !form.url.trim()) e.url = "A file link needs the link.";
    setErrors(e);
    const first = ["name", "url"].find((k) => e[k]);
    if (first) { document.getElementById(`as-${first}`)?.focus(); return; }
    setBusy(true);
    try {
      const body = { ...form, name: form.name.trim(), url: form.url.trim(), notes: form.notes.trim(), expiresAt: form.expiresAt || null };
      const r = asset ? await api.patch(`/api/manager/assets/${asset.id}`, body) : await api.post("/api/manager/assets", body);
      onSaved(r, !asset); onClose();
    } catch (err) { setErrors(err?.data?.fields ?? { form: err?.message ?? "The asset could not be saved." }); }
    finally { setBusy(false); }
  }

  const field = "h-10 rounded-xl px-3 font-normal";
  return (
    <Drawer open={open} onClose={onClose} title={asset ? "Edit asset" : "New asset"}
      footer={<div className="flex justify-end gap-2"><button type="button" className={BTN.secondary} onClick={onClose}>Cancel</button>
        <button type="button" className={BTN.primary} disabled={busy} onClick={submit}>{busy ? "Saving…" : asset ? "Save changes" : "Add asset"}</button></div>}>
      <div className="flex flex-col gap-4 p-5 text-sm">
        {errors.form && <p role="alert" className={ERR}>{errors.form}</p>}
        <label htmlFor="as-name" className="flex flex-col gap-1.5 font-bold text-text-primary">Name
          <input id="as-name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} autoComplete="off" placeholder="e.g. Figma team plan" aria-invalid={!!errors.name} className={field} />
          {errors.name && <span className={ERR}>{errors.name}</span>}
        </label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 font-bold text-text-primary">Type</legend>
          <div className="inline-flex w-fit rounded-xl border border-ink/[0.08] bg-ink/[0.03] p-0.5">
            {TYPES.map((t) => (
              <label key={t} className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 ${form.type === t ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"}`}>
                <input type="radio" name="asset-type" value={t} checked={form.type === t} onChange={() => set("type", t)} className="sr-only" />{t}
              </label>
            ))}
          </div>
          {errors.type && <span className={ERR}>{errors.type}</span>}
        </fieldset>
        <label htmlFor="as-url" className="flex flex-col gap-1.5 font-bold text-text-primary">Link {form.type !== "File link" && <span className="sr-only">(optional)</span>}
          <input id="as-url" type="url" inputMode="url" value={form.url} onChange={(e) => set("url", e.target.value)} autoComplete="off" spellCheck={false} placeholder="https://…" aria-invalid={!!errors.url} className={field} />
          <span className={errors.url ? ERR : "text-xs font-normal text-text-secondary"}>{errors.url ?? (form.type === "File link" ? "Required for a file link." : "Optional.")}</span>
        </label>
        <label htmlFor="as-notes" className="flex flex-col gap-1.5 font-bold text-text-primary">Notes <span className="sr-only">(optional)</span>
          <textarea id="as-notes" rows={3} maxLength={1000} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Seats, owner, where the login lives…" className="rounded-xl p-3 font-normal" />
        </label>
        <label htmlFor="as-exp" className="flex flex-col gap-1.5 font-bold text-text-primary">Expires on <span className="sr-only">(optional)</span>
          <input id="as-exp" type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} className={`${field} w-48`} />
          <span className="text-xs font-normal text-text-secondary">Optional. Licences that end within 30 days are marked.</span>
        </label>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 font-bold text-text-primary">Projects</legend>
          {projects.length ? (
            <div className="flex max-h-48 flex-col gap-1 overflow-auto rounded-xl border border-ink/[0.08] p-2">
              {projects.map((p) => (
                <label key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink/[0.03]">
                  <input type="checkbox" checked={form.projectIds.includes(String(p.id))} className="h-4 w-4 accent-[var(--accent)]"
                    onChange={(e) => set("projectIds", e.target.checked ? [...form.projectIds, String(p.id)] : form.projectIds.filter((x) => x !== String(p.id)))} />
                  <span className="truncate">{p.title}</span>
                </label>
              ))}
            </div>
          ) : <p className="text-xs text-text-secondary">No open projects to link yet.</p>}
          {errors.projectIds && <span className={ERR}>{errors.projectIds}</span>}
        </fieldset>
      </div>
    </Drawer>
  );
}
