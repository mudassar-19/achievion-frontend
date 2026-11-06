// "AI suggest" for the Team Lead task form (V2 2.2, D-075). Nothing is applied until the TL accepts.
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import api from "@/lib/api";

const BTN = "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors";

export default function AiTaskSuggest({ form, projectId, onApply }) {
  const [state, setState] = useState("idle"); // idle | loading | shown | editing
  const [s, setS]         = useState(null);
  const [err, setErr]     = useState(null);

  async function ask() {
    setState("loading"); setErr(null);
    try {
      const r = await api.post("/api/teamlead/ai/task-suggest", {
        title: form.title, type: form.type, priority: form.priority, difficulty: form.difficulty, description: form.description, projectId,
      });
      setS({ ...r.suggestion, tagsText: r.suggestion.tags.join(", ") });
      setState("shown");
    } catch (e) {
      setErr(e?.message ?? "AI suggestion is not available right now.");
      setState("idle");
    }
  }

  function apply() {
    const hours = Number(s.estimatedHours);
    onApply({
      description: s.description.trim(),
      estimatedHours: Number.isFinite(hours) && hours >= 0.25 && hours <= 200 ? String(hours) : "",
      tags: s.tagsText,
    });
    setState("idle"); setS(null);
  }

  const field = "w-full rounded-lg border border-border-subtle bg-bg-surface px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#2A62EC]/60";

  return (
    <div className="flex flex-col gap-2">
      {state !== "shown" && state !== "editing" && (
        <div className="flex items-center gap-2">
          <button type="button" onClick={ask} disabled={!form.title.trim() || state === "loading"}
            className={`${BTN} inline-flex items-center gap-1.5 border border-[#2A62EC]/30 text-[#1948BD] hover:bg-[#2A62EC]/[0.06] disabled:opacity-40 disabled:cursor-not-allowed`}>
            {state === "loading" ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />}
            {state === "loading" ? "Thinking…" : "AI suggest"}
          </button>
          <span className="text-xs text-text-tertiary">{form.title.trim() ? "Description, estimate and tags from the title" : "Write a title first"}</span>
        </div>
      )}
      {err && <p role="alert" className="text-xs text-[#9A3A06]">{err}</p>}

      {(state === "shown" || state === "editing") && s && (
        <section aria-label="AI suggestion" className="rounded-xl border border-[#2A62EC]/25 bg-[#2A62EC]/[0.03] p-3 flex flex-col gap-2">
          <p className="text-xs font-bold text-[#1948BD] flex items-center gap-1.5"><Sparkles size={12} aria-hidden="true" />AI suggestion · nothing changes until you accept</p>
          {state === "editing" ? (
            <>
              <label className="text-xs font-semibold text-text-secondary">Description
                <textarea rows={3} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} className={`${field} mt-1`} style={{ resize: "vertical" }} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-text-secondary">Estimate (hours)
                  <input type="number" min={0.25} max={200} step={0.25} value={s.estimatedHours} onChange={(e) => setS({ ...s, estimatedHours: e.target.value })} className={`${field} mt-1`} />
                </label>
                <label className="text-xs font-semibold text-text-secondary">Tags
                  <input value={s.tagsText} onChange={(e) => setS({ ...s, tagsText: e.target.value })} className={`${field} mt-1`} />
                </label>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-text-primary leading-relaxed">{s.description}</p>
              <p className="text-xs text-text-secondary"><span className="font-bold text-text-primary tabular-nums">{s.estimatedHours} h</span>
                {s.tags.length > 0 && <> · {s.tags.map((t) => <span key={t} className="ml-1 rounded-full bg-ink/[0.06] px-2 py-0.5">{t}</span>)}</>}
              </p>
            </>
          )}
          <p className="text-xs text-text-secondary"><span className="font-semibold">Why:</span> {s.why}</p>
          <div className="flex gap-2">
            <button type="button" onClick={apply} className={`${BTN} bg-[#1948BD] text-white hover:opacity-90`}>{state === "editing" ? "Use edited" : "Accept"}</button>
            {state === "shown" && <button type="button" onClick={() => setState("editing")} className={`${BTN} border border-border-subtle text-text-primary hover:bg-ink/[0.04]`}>Edit</button>}
            <button type="button" onClick={() => { setState("idle"); setS(null); }} className={`${BTN} text-text-secondary hover:bg-ink/[0.04]`}>Decline</button>
          </div>
        </section>
      )}
    </div>
  );
}
