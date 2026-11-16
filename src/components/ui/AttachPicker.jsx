// File chooser for project and task creation (item 49): picking more files adds to the list, every file has a Remove
// button, a count shows "3 of 5", and a refused file says why. Limits live in lib/attachPick (same as the server).
import { useState } from "react";
import { X } from "lucide-react";
import { addPicked, ACCEPT, MAX_FILES } from "@/lib/attachPick";

export default function AttachPicker({ id, files, onChange, max = MAX_FILES }) {
  const [errors, setErrors] = useState([]);
  const pick = (e) => {
    const r = addPicked(files, [...e.target.files], max);
    setErrors(r.errors); onChange(r.files);
    e.target.value = ""; // so the same file can be chosen again after removing it
  };
  return (
    <div className="flex flex-col gap-2">
      <input id={id} type="file" multiple accept={ACCEPT} onChange={pick} className="text-sm font-normal" disabled={files.length >= max} aria-describedby={`${id}-count`} />
      <p id={`${id}-count`} className="text-xs text-text-secondary">{files.length} of {max} files · PDF, DOC, DOCX, CSV, PNG, JPG · 5 MB each</p>
      {errors.length > 0 && <ul role="alert" className="flex flex-col gap-0.5 text-xs font-semibold text-danger">{errors.map((m) => <li key={m}>{m}</li>)}</ul>}
      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-ink/[0.07] bg-bg-surface px-2.5 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate" title={f.name}>{f.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-text-secondary">{Math.max(1, Math.round(f.size / 1024))} KB</span>
              <button type="button" onClick={() => { onChange(files.filter((_, j) => j !== i)); setErrors([]); }} aria-label={`Remove ${f.name}`} className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-bg-muted hover:text-danger"><X size={14} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
