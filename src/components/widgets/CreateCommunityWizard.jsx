// Create community, two steps (E-10, D-QA3B-9): 1 name + look (line icon and colour), 2 members. The server adds the three default
// groups (Announcements, General, Leadership) and the Director, so there is nothing else to ask. Rules: server/services/chatRules.js.
import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import { ICON_NAMES, COMMUNITY_COLORS } from "@/lib/chatIconData";
import { CommunityIcon, CommunityTile } from "./ChatIcons";
import { ACCENT, MemberPicker } from "./ChatSettingsDrawers";

const FIELD = "w-full rounded-xl border border-ink/[0.12] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20";

export default function CreateCommunityWizard({ onClose, onCreated }) {
  const addToast = useUiStore((s) => s.addToast);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState("chat");
  const [color, setColor] = useState("indigo");
  const [members, setMembers] = useState([]);

  async function submit() {
    setBusy(true);
    try {
      const result = await api.post("/api/communities", { name: name.trim(), description: desc, icon, color, memberIds: members.map((u) => u._id) });
      addToast({ type: "success", message: `Community "${name.trim()}" created.` });
      onCreated(result); onClose();
    } catch (err) {
      addToast({ type: "error", message: err?.message ?? "Could not create the community." });
    } finally { setBusy(false); }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div role="dialog" aria-modal="true" aria-label="Create community" className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: "90vh" }} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink/[0.08] px-6 py-4">
          <div>
            <h2 className="text-base font-black text-text-primary">Create community</h2>
            <p className="text-xs text-text-secondary">Step {step} of 2: {step === 1 ? "Name and look" : "Members"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-ink/[0.07]"><X size={16} aria-hidden="true" /></button>
        </div>
        <div className="flex gap-1 px-6 pt-3">{[1, 2].map((n) => <div key={n} className="h-1 flex-1 rounded-full" style={{ background: n <= step ? ACCENT : "#E5E7EB" }} />)}</div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {step === 1 ? (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-ink/[0.08] bg-ink/[0.03] p-3">
                <CommunityTile community={{ name: name || "?", icon, color }} size={44} />
                <div className="min-w-0"><p className="truncate text-sm font-bold text-text-primary">{name.trim() || "Community name"}</p><p className="text-xs text-text-secondary">Comes with Announcements, General and Leadership.</p></div>
              </div>
              <label className="block text-xs font-bold text-text-primary">Name (required)
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Design team" maxLength={60} className={`${FIELD} mt-1 font-normal`} autoFocus />
              </label>
              <label className="block text-xs font-bold text-text-primary">Description (optional)
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="What is this community for?" className={`${FIELD} mt-1 resize-none font-normal`} />
              </label>
              <fieldset>
                <legend className="mb-1.5 text-xs font-bold text-text-primary">Icon</legend>
                <div className="flex flex-wrap gap-2">
                  {ICON_NAMES.map((n) => (
                    <button key={n} type="button" onClick={() => setIcon(n)} aria-pressed={icon === n} aria-label={n} title={n}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-text-primary ${icon === n ? "border-accent bg-accent/10" : "border-ink/[0.10] hover:bg-ink/[0.05]"}`}><CommunityIcon name={n} size={18} /></button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1.5 text-xs font-bold text-text-primary">Colour</legend>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(COMMUNITY_COLORS).map(([n, [bg, fg]]) => (
                    <button key={n} type="button" onClick={() => setColor(n)} aria-pressed={color === n} aria-label={n} title={n}
                      className={`h-9 w-9 rounded-full border-2 ${color === n ? "border-accent" : "border-transparent"}`} style={{ background: bg, boxShadow: `inset 0 0 0 5px ${bg}, inset 0 0 0 20px ${bg}`, color: fg }}>
                      <span className="block h-full w-full rounded-full" style={{ background: fg, opacity: color === n ? 1 : 0.55, transform: "scale(0.45)" }} />
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <p className="text-xs text-text-secondary">The Director and every Manager are added automatically. Pick who else joins; you can change this later in the community settings.</p>
              <MemberPicker selected={members} onChange={setMembers} label="Add people" />
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-ink/[0.08] px-6 py-4">
          <button type="button" onClick={() => (step === 1 ? onClose() : setStep(1))} className="min-h-9 text-sm font-semibold text-text-secondary hover:text-text-primary">{step === 1 ? "Cancel" : "Back"}</button>
          {step === 1
            ? <button type="button" onClick={() => setStep(2)} disabled={!name.trim()} className="rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>Next</button>
            : <button type="button" onClick={submit} disabled={busy || !name.trim()} className="rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-40" style={{ background: ACCENT }}>{busy ? "Creating…" : "Create community"}</button>}
        </div>
      </motion.div>
    </motion.div>
  );
}
