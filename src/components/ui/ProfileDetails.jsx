// Skills and phone on the own profile (Batch 5, N4; FR01-06). Saved on their own (PATCH /api/auth/profile-details);
// the Director sees them in the roster. Other employees never see them.
import { useState } from "react";
import { X } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import useAuthStore from "@/stores/authStore";
import useLoad from "@/pages/manager/project/useLoad";
import { BTN } from "./buttons";

const INPUT = "h-10 w-full rounded-xl border border-border-subtle bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-60";
const MAX = 20;

export default function ProfileDetails() {
  const readOnly = useAuthStore((s) => !!s.viewAs);
  const { data, error, setData } = useLoad("/api/auth/profile-details");
  const [draft, setDraft] = useState(null); // { skills, phone } while editing
  const [entry, setEntry] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  if (error) return <p role="alert" className="text-sm text-text-secondary">Your skills and phone could not be loaded.</p>;
  if (!data) return <div aria-busy="true" aria-label="Loading skills and phone" className="h-24 animate-pulse rounded-xl bg-ink/[0.05]" />;
  const v = draft ?? { skills: data.skills, phone: data.phone ?? "" };
  const dirty = !!draft && (JSON.stringify(draft.skills) !== JSON.stringify(data.skills) || (draft.phone ?? "") !== (data.phone ?? ""));
  const edit = (patch) => { setProblem(null); setDraft({ ...v, ...patch }); };
  function add() {
    const s = entry.trim().replace(/ {2,}/g, " ");
    if (!s) return;
    if (v.skills.some((k) => k.toLowerCase() === s.toLowerCase())) { setProblem(`"${s}" is already in your list.`); return; }
    if (v.skills.length >= MAX) { setProblem(`You can list up to ${MAX} skills.`); return; }
    edit({ skills: [...v.skills, s] }); setEntry("");
  }
  async function save() {
    setBusy(true); setProblem(null);
    try {
      const saved = await api.patch("/api/auth/profile-details", { skills: v.skills, phone: v.phone }, { silent: true });
      setData(saved); setDraft(null);
      useUiStore.getState().addToast({ type: "success", message: "Skills and phone saved." });
    } catch (e) { setProblem(e?.message ?? "This could not be saved."); }
    finally { setBusy(false); }
  }
  return (
    <div data-profile-details className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-black text-text-primary">Skills and contact</h3>
        <p className="mt-0.5 text-sm text-text-secondary">Your Director sees these in the team roster. Other team members do not.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="pd-skill" className="text-xs font-bold text-text-secondary">Skills <span className="font-normal tabular-nums">({v.skills.length} of {MAX})</span></label>
          {v.skills.length > 0 && (
            <ul aria-label="Your skills" className="flex flex-wrap gap-1.5">{v.skills.map((s) => (
              <li key={s} className="inline-flex max-w-full items-center gap-1 rounded-full border border-ink/[0.1] bg-bg-surface py-0.5 pl-2.5 pr-1 text-xs font-semibold text-text-primary">
                <span className="truncate">{s}</span>
                <button type="button" disabled={readOnly} onClick={() => edit({ skills: v.skills.filter((k) => k !== s) })} aria-label={`Remove ${s}`} className="flex h-6 w-6 items-center justify-center rounded-full text-text-secondary hover:bg-ink/[0.07] hover:text-text-primary"><X size={12} aria-hidden="true" /></button>
              </li>))}</ul>
          )}
          <div className="flex gap-2">
            <input id="pd-skill" className={INPUT} value={entry} maxLength={30} disabled={readOnly} placeholder="For example React, Figma, API testing" onChange={(e) => { setEntry(e.target.value); setProblem(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
            <button type="button" className={BTN.secondary} disabled={readOnly || !entry.trim()} onClick={add}>Add</button>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="pd-phone" className="text-xs font-bold text-text-secondary">Phone <span className="font-normal">(optional)</span></label>
          <input id="pd-phone" type="tel" autoComplete="tel" className={INPUT} value={v.phone ?? ""} maxLength={24} disabled={readOnly} placeholder="+92 300 1234567" onChange={(e) => edit({ phone: e.target.value })} />
        </div>
      </div>
      {problem && <p role="alert" className="text-sm text-[#B01F17]">{problem}</p>}
      {dirty && (
        <div className="flex gap-2">
          <button type="button" className={BTN.primary} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save skills and phone"}</button>
          <button type="button" className={BTN.ghost} disabled={busy} onClick={() => { setDraft(null); setProblem(null); }}>Discard</button>
        </div>
      )}
    </div>
  );
}
