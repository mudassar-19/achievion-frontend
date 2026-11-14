// Create / edit a challenge (UX §8). Draft: everything. Active: title and description only (goal, people,
// reward and dates stay as published). Rewards are capped by the Director's limit (server checks too).
import { useEffect, useState } from "react";
import api from "@/lib/api";
import Drawer from "@/components/ui/Drawer";
import { BTN } from "@/components/ui/buttons";
import { AiTag, AiFeedback } from "@/components/ui/AiParts";
import { fmt } from "../project/format";

const ERR = "text-xs font-semibold text-[#B01F17]";
const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ title: "", description: "", type: "custom", repeat: false, sprintId: "", metric: "tasks_completed", target: "5", scope: "organisation",
  refKind: "project", refId: "", rewardXp: "100", rewardGold: "0", rewardBadgeId: "", startDate: today(), deadline: "" });
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

// Same windows as the server (questRules.periodFor), shown as a hint.
function windowText(type, start) {
  if (!start) return "";
  const d = new Date(`${start}T00:00:00Z`);
  if (type === "daily") return `Runs ${fmt(d)}, resets at midnight (UTC).`;
  if (type === "weekly") { const mon = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 864e5); return `Runs the week of ${fmt(mon)} (Monday to Sunday, UTC).`; }
  return "";
}

function Seg({ name, value, options, onChange, disabled }) {
  return (
    <div className="inline-flex w-fit flex-wrap rounded-xl border border-ink/[0.08] bg-ink/[0.03] p-0.5">
      {options.map(([v, l]) => (
        <label key={v} className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 ${value === v ? "bg-bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"} ${disabled ? "pointer-events-none opacity-50" : ""}`}>
          <input type="radio" name={name} value={v} checked={value === v} disabled={disabled} onChange={() => onChange(v)} className="sr-only" />{l}
        </label>
      ))}
    </div>
  );
}

// draft (M-7): an AI challenge draft that pre-fills a new challenge; the Manager edits and saves it as usual.
export default function QuestDrawer({ open, onClose, quest = null, onSaved, draft = null }) {
  const [opts, setOpts] = useState(null);
  const [optsError, setOptsError] = useState(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const locked = quest?.status === "active";

  useEffect(() => {
    if (!open) return;
    setErrors({}); setOptsError(null); // eslint-disable-line react-hooks/set-state-in-effect
    setForm(quest ? { title: quest.title, description: quest.description ?? "", type: quest.type, repeat: quest.repeat, sprintId: quest.sprintId ?? "", metric: quest.metric,
      target: String(quest.target), scope: quest.scope, refKind: quest.scopeRef?.kind === "team" ? "team" : "project", refId: quest.scopeRef?.id ?? "",
      rewardXp: String(quest.rewardXp), rewardGold: String(quest.rewardGold), rewardBadgeId: quest.rewardBadgeId ?? "", startDate: day(quest.startDate) || today(), deadline: day(quest.deadline) }
      : draft ? { ...blank(), title: draft.title, description: draft.description ?? "", type: draft.type, metric: draft.metric, target: String(draft.target), rewardXp: String(draft.rewardXp),
        deadline: draft.type === "custom" ? new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) : "" } : blank());
    if (!opts) api.get("/api/manager/quests/options").then(setOpts).catch((e) => setOptsError(e?.message ?? "Options could not be loaded."));
  }, [open, quest, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => (e[k] || e.form ? { ...e, [k]: undefined, form: undefined } : e)); };
  const cap = opts?.cap ?? { xp: 500, gold: 250 };

  function check() {
    const e = {};
    if (form.title.trim().length < 3) e.title = "Give the challenge a title (3–100 characters).";
    if (locked) return e;
    if (!form.startDate) e.startDate = "Pick a start date.";
    if (form.type === "custom" && (!form.deadline || form.deadline <= form.startDate)) e.deadline = "The deadline must be after the start date.";
    if (form.type === "sprint" && !form.sprintId) e.sprintId = "Choose the sprint this challenge follows.";
    const t = Number(form.target);
    if (form.metric === "avg_quality" ? !(t >= 1 && t <= 5) : !(Number.isInteger(t) && t >= 1 && t <= 365)) e.target = form.metric === "avg_quality" ? "Average quality is between 1 and 5 stars." : "Set a whole number from 1 to 365.";
    if (form.scope !== "organisation" && !form.refId) e.scopeRef = form.scope === "individual" ? "Choose the person." : "Choose a project or a team.";
    const xp = Number(form.rewardXp), g = Number(form.rewardGold || 0);
    if (!(Number.isInteger(xp) && xp >= 1 && xp <= cap.xp)) e.rewardXp = `Reward XP must be 1 to ${cap.xp} (the Director's limit).`;
    if (!(Number.isInteger(g) && g >= 0 && g <= cap.gold)) e.rewardGold = `Reward gold must be 0 to ${cap.gold} (the Director's limit).`;
    return e;
  }

  async function submit() {
    const e = check(); setErrors(e);
    const first = ["title", "startDate", "deadline", "sprintId", "target", "scopeRef", "rewardXp", "rewardGold"].find((k) => e[k]);
    if (first) { document.getElementById(`qd-${first}`)?.focus(); return; }
    setBusy(true);
    try {
      const body = locked ? { title: form.title.trim(), description: form.description.trim() } : {
        title: form.title.trim(), description: form.description.trim(), type: form.type, repeat: ["daily", "weekly"].includes(form.type) && form.repeat,
        sprintId: form.type === "sprint" ? form.sprintId : null, metric: form.metric, target: Number(form.target), scope: form.scope,
        scopeRef: form.scope === "organisation" ? null : { kind: form.scope === "individual" ? "user" : form.refKind, id: form.refId },
        rewardXp: Number(form.rewardXp), rewardGold: Number(form.rewardGold || 0), rewardBadgeId: form.rewardBadgeId || null, startDate: form.startDate, deadline: form.type === "custom" ? form.deadline : undefined,
      };
      const r = quest ? await api.patch(`/api/manager/quests/${quest.id}`, body) : await api.post("/api/manager/quests", { ...body, aiDraft: !!draft }); // Batch 3: an AI-made quest enrols people automatically (UC-17)
      onSaved(r, !quest); onClose();
    } catch (err) { setErrors(err?.data?.fields ?? { form: err?.message ?? "The challenge could not be saved." }); }
    finally { setBusy(false); }
  }

  const field = "h-10 rounded-xl px-3 font-normal";
  const lbl = "flex flex-col gap-1.5 font-bold text-text-primary";
  const refList = form.scope === "individual" ? (opts?.people ?? []).map((p) => [p.id, `${p.name} (${p.role})`])
    : form.refKind === "team" ? (opts?.teams ?? []).map((t) => [t.id, t.name]) : (opts?.projects ?? []).map((p) => [p.id, p.title]);
  return (
    <Drawer open={open} onClose={onClose} title={quest ? "Edit challenge" : "New challenge"} width={520}
      footer={<div className="flex justify-end gap-2"><button type="button" className={BTN.secondary} onClick={onClose}>Cancel</button>
        <button type="button" className={BTN.primary} disabled={busy || (!opts && !optsError)} onClick={submit}>{busy ? "Saving…" : quest ? "Save changes" : "Save draft"}</button></div>}>
      <div className="flex flex-col gap-4 p-5 text-sm">
        {(errors.form || optsError) && <p role="alert" className={ERR}>{errors.form ?? optsError}</p>}
        {draft && !quest && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-accent/15 bg-accent/[0.03] p-3">
            <span className="flex flex-wrap items-center gap-2"><AiTag /><span className="text-xs text-text-secondary">Draft from the team's last 30 days. Check every field before saving.</span></span>
            <p className="text-text-primary">{draft.why}</p>
            <AiFeedback feature="mgr_challenge_draft" refId={`${draft.title}:${draft.metric}:${draft.target}`} snippet={`${draft.title} — ${draft.why}`} />
          </div>
        )}
        {locked && <p className="rounded-xl bg-ink/[0.03] p-3 text-text-secondary">This challenge is running, so its goal, people, reward and dates stay as published. You can change the title and description, or end it and duplicate.</p>}
        <label htmlFor="qd-title" className={lbl}>Title
          <input id="qd-title" value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={100} autoComplete="off" placeholder="e.g. Five on-time tasks this week" aria-invalid={!!errors.title} className={field} />
          {errors.title && <span className={ERR}>{errors.title}</span>}
        </label>
        <label htmlFor="qd-desc" className={lbl}>Description <span className="sr-only">(optional)</span>
          <textarea id="qd-desc" rows={2} maxLength={500} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional. Why this challenge matters." className="rounded-xl p-3 font-normal" />
        </label>

        <fieldset className="flex flex-col gap-1.5" disabled={locked}>
          <legend className="mb-1.5 font-bold text-text-primary">Type</legend>
          <Seg name="qd-type" value={form.type} disabled={locked} onChange={(v) => set("type", v)} options={[["daily", "Daily"], ["weekly", "Weekly"], ["sprint", "Sprint"], ["custom", "Custom"]]} />
          {["daily", "weekly"].includes(form.type) && (
            <label className="mt-1 flex items-center gap-2 font-normal text-text-primary">
              <input type="checkbox" checked={form.repeat} onChange={(e) => set("repeat", e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Repeat every {form.type === "daily" ? "day" : "week"} (a new challenge starts from zero; old results stay in history)
            </label>
          )}
        </fieldset>
        {form.type === "sprint" && (
          <label htmlFor="qd-sprintId" className={lbl}>Sprint
            <select id="qd-sprintId" value={form.sprintId} onChange={(e) => set("sprintId", e.target.value)} disabled={locked} aria-invalid={!!errors.sprintId} className={field}>
              <option value="">Choose a sprint…</option>
              {(opts?.sprints ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} (ends {fmt(s.endDate)})</option>)}
            </select>
            <span className={errors.sprintId ? ERR : "text-xs font-normal text-text-secondary"}>{errors.sprintId ?? "The challenge ends with the sprint."}</span>
          </label>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label htmlFor="qd-startDate" className={lbl}>Start date
            <input id="qd-startDate" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} disabled={locked} aria-invalid={!!errors.startDate} className={field} />
            {errors.startDate && <span className={ERR}>{errors.startDate}</span>}
          </label>
          {form.type === "custom" && (
            <label htmlFor="qd-deadline" className={lbl}>Deadline
              <input id="qd-deadline" type="date" min={form.startDate || undefined} value={form.deadline} onChange={(e) => set("deadline", e.target.value)} disabled={locked} aria-invalid={!!errors.deadline} className={field} />
              {errors.deadline && <span className={ERR}>{errors.deadline}</span>}
            </label>
          )}
        </div>
        {windowText(form.type, form.startDate) && <p className="-mt-2 text-xs text-text-secondary">{windowText(form.type, form.startDate)}</p>}

        <div className="grid grid-cols-[1fr_120px] gap-3">
          <label htmlFor="qd-metric" className={lbl}>Measure
            <select id="qd-metric" value={form.metric} onChange={(e) => set("metric", e.target.value)} disabled={locked} className={field}>
              {(opts?.metrics ?? [{ value: "tasks_completed", label: "Tasks completed" }]).map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
          <label htmlFor="qd-target" className={lbl}>Target
            <input id="qd-target" type="number" inputMode="decimal" min={1} max={form.metric === "avg_quality" ? 5 : 365} step={form.metric === "avg_quality" ? 0.1 : 1}
              value={form.target} onChange={(e) => set("target", e.target.value)} disabled={locked} aria-invalid={!!errors.target} className={`${field} tabular-nums`} />
          </label>
        </div>
        {errors.target && <span className={`-mt-2 ${ERR}`}>{errors.target}</span>}
        {form.metric === "avg_quality" && <p className="-mt-2 text-xs text-text-secondary">Counts once a person has at least 3 approved tasks in the window.</p>}

        <fieldset className="flex flex-col gap-2" disabled={locked}>
          <legend className="mb-1.5 font-bold text-text-primary">Who takes part</legend>
          <Seg name="qd-scope" value={form.scope} disabled={locked} onChange={(v) => { set("scope", v); set("refId", ""); }} options={[["individual", "One person"], ["team", "Team"], ["organisation", "Whole organization"]]} />
          {form.scope === "team" && <Seg name="qd-refkind" value={form.refKind} disabled={locked} onChange={(v) => { set("refKind", v); set("refId", ""); }} options={[["project", "A project's team"], ["team", "A team"]]} />}
          {form.scope !== "organisation" && (
            <select id="qd-scopeRef" aria-label={form.scope === "individual" ? "Person" : form.refKind === "team" ? "Team" : "Project"} value={form.refId} onChange={(e) => set("refId", e.target.value)}
              disabled={locked} aria-invalid={!!errors.scopeRef} className={field}>
              <option value="">Choose…</option>
              {refList.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
            </select>
          )}
          <span className={errors.scopeRef ? ERR : "text-xs font-normal text-text-secondary"}>{errors.scopeRef ?? "People join automatically when you publish. Directors and Managers do not take part."}</span>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label htmlFor="qd-rewardXp" className={lbl}>Reward XP
            <input id="qd-rewardXp" type="number" inputMode="numeric" min={1} max={cap.xp} value={form.rewardXp} onChange={(e) => set("rewardXp", e.target.value)} disabled={locked} aria-invalid={!!errors.rewardXp} className={`${field} tabular-nums`} />
            <span className={errors.rewardXp ? ERR : "text-xs font-normal text-text-secondary"}>{errors.rewardXp ?? `Up to ${cap.xp}`}</span>
          </label>
          <label htmlFor="qd-rewardGold" className={lbl}>Reward gold
            <input id="qd-rewardGold" type="number" inputMode="numeric" min={0} max={cap.gold} value={form.rewardGold} onChange={(e) => set("rewardGold", e.target.value)} disabled={locked} aria-invalid={!!errors.rewardGold} className={`${field} tabular-nums`} />
            <span className={errors.rewardGold ? ERR : "text-xs font-normal text-text-secondary"}>{errors.rewardGold ?? `Up to ${cap.gold}`}</span>
          </label>
        </div>
        {!locked && opts?.badges?.length > 0 && (
          <label htmlFor="qd-rewardBadgeId" className={lbl}>Badge reward <span className="text-xs font-normal text-text-secondary">(optional)</span>
            <select id="qd-rewardBadgeId" value={form.rewardBadgeId} onChange={(e) => set("rewardBadgeId", e.target.value)} className={`${field} bg-bg-surface border border-ink/[0.08]`}>
              <option value="">— None —</option>
              {opts.badges.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.rarity})</option>
              ))}
            </select>
            {errors.rewardBadgeId && <span className={ERR}>{errors.rewardBadgeId}</span>}
          </label>
        )}
        <p className="text-xs text-text-secondary">The reward goes through the normal XP system once a person reaches the target. If the challenge expires, nobody loses anything.</p>
      </div>
    </Drawer>
  );
}
