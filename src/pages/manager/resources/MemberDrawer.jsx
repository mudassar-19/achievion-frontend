// Member drawer (UX §7): workload and well-being only (no XP or scores), plus Reassign:
// task → candidates (engine order + reason) → new load preview → confirm → both notified + AuditLog.
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, HeartPulse, Repeat } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Drawer from "@/components/ui/Drawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import { BTN } from "@/components/ui/buttons";
import useLoad from "../project/useLoad";
import { fmt } from "../project/format";
import LoadBar from "./LoadBar";
import { STATUS_KEY, TONE } from "./tone";
import { RebalanceHint } from "../ai/AiCards";

function Fact({ label, children }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-ink/[0.06] bg-ink/[0.02] px-3 py-2.5">
      <dt className="text-xs font-semibold text-text-secondary">{label}</dt>
      <dd className="text-sm font-bold text-text-primary tabular-nums">{children}</dd>
    </div>
  );
}

const Change = ({ from, to, tone }) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs tabular-nums">
    <span className="text-text-secondary">{from}</span><ArrowRight size={12} aria-hidden="true" className="text-slate-400" />
    <span className="font-bold" style={{ color: TONE[tone]?.text }}>{to}</span>
  </span>
);

function Reassign({ task, member, onBack, onDone, base, ai }) {
  const addToast = useUiStore((s) => s.addToast);
  const { data, error, reload } = useLoad(`${base}/tasks/${task.id}/candidates?from=${member.id}`);
  const [pick, setPick] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const chosen = data?.candidates.find((c) => String(c.id) === pick);

  async function go() {
    setBusy(true);
    try {
      const r = await api.post(`${base}/tasks/${task.id}/reassign`, { fromUserId: member.id, toUserId: pick });
      addToast({ type: "success", message: `"${task.title}" moved to ${r.to.name}. Both were notified.` });
      setConfirm(false); onDone();
    } catch (e) {
      addToast({ type: "error", message: e?.message ?? "The task could not be reassigned." });
      setConfirm(false); reload();
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-4 p-5 text-sm">
      <button type="button" onClick={onBack} className={`${BTN.ghost} -ml-3 self-start`}><ArrowLeft size={14} aria-hidden="true" />Back to {member.name}</button>
      <div>
        <p className="font-bold text-text-primary">{task.title}</p>
        <p className="text-xs text-text-secondary">{task.project?.title ?? "No project"} · {task.status.replace("-", " ")}{task.deadline ? ` · due ${fmt(task.deadline)}` : ""}</p>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} />
        : !data ? <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading people">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        : (
          <>
            <p className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">{data.from.name} after the move: <Change from={data.from.label} to={data.from.afterLabel} tone={data.from.afterTone} /></p>
            {ai && data.candidates.length > 1 && <RebalanceHint taskId={task.id} fromId={member.id} picked={pick} onApply={setPick} teamLead={base === "/api/teamlead"} />}
            {data.candidates.length ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 font-bold text-text-primary">Who should take it?</legend>
                {data.candidates.map((c, i) => (
                  <label key={c.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${pick === String(c.id) ? "border-accent/40 bg-accent/[0.06]" : "border-ink/[0.08] hover:bg-ink/[0.03]"}`}>
                    <input type="radio" name="reassign-to" value={c.id} checked={pick === String(c.id)} onChange={() => setPick(String(c.id))} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-semibold text-text-primary">{c.name}{i === 0 && <span className="ml-2 text-xs font-bold text-accent-text">Best fit</span>}</span>
                        <Change from={c.label} to={c.afterLabel} tone={c.afterTone} />
                      </span>
                      <span className="text-xs text-text-secondary">{c.role} · {c.reason}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : <p className="rounded-xl bg-ink/[0.03] p-3 text-text-secondary">Nobody on this project can take a "{data.task.type}" task. Add someone on the project's Team tab first.</p>}
            {data.notEligible > 0 && <p className="text-xs text-text-secondary">{data.notEligible} other {data.notEligible === 1 ? "person on the project is" : "people on the project are"} not shown: their role does not take "{data.task.type}" tasks.</p>}
            <div className="flex justify-end gap-2 border-t border-ink/[0.06] pt-4">
              <button type="button" className={BTN.secondary} onClick={onBack}>Cancel</button>
              <button type="button" className={BTN.primary} disabled={!chosen} onClick={() => setConfirm(true)}>{chosen ? `Reassign to ${chosen.name}` : "Pick a person"}</button>
            </div>
          </>
        )}
      <ConfirmModal open={confirm} layer="z-[70]" onClose={() => setConfirm(false)} onConfirm={go} loading={busy} confirmLabel="Reassign"
        title={`Move "${task.title}" to ${chosen?.name}?`}
        body={`${member.name} goes ${data?.from.label} → ${data?.from.afterLabel}; ${chosen?.name} goes ${chosen?.label} → ${chosen?.afterLabel}. Both get a notification. Only who works on the task changes; the Team Lead's details stay as they are.`} />
    </div>
  );
}

// base: API prefix (Manager default; Team Lead "/api/teamlead" with memberPath "/team/members"). ai: show the AI hint (Manager only).
export default function MemberDrawer({ memberId, onClose, onChanged, base = "/api/manager", memberPath = "/resources/members", ai = true }) {
  const { data: m, error, reload } = useLoad(memberId ? `${base}${memberPath}/${memberId}` : null);
  const [task, setTask] = useState(null);
  useEffect(() => { setTask(null); }, [memberId]); // eslint-disable-line react-hooks/set-state-in-effect

  return (
    <Drawer open={!!memberId} onClose={onClose} title={task ? "Reassign task" : m?.name ?? "Team member"}>
      {!memberId ? null : error ? <ErrorState message={error} onRetry={reload} />
        : !m ? <div className="flex flex-col gap-3 p-5" aria-busy="true" aria-label="Loading person"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>
        : task ? <Reassign task={task} member={m} base={base} ai={ai} onBack={() => setTask(null)} onDone={() => { setTask(null); reload(); onChanged(); }} />
        : (
          <div className="flex flex-col gap-5 p-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-text-secondary">{m.role}</span>
              <StatusChip status={STATUS_KEY[m.status]} label={m.status} size="xs" />
              {m.needsLighterLoad && <span className="inline-flex items-center gap-1 rounded-full border border-[#D1291F]/30 bg-[#D1291F]/10 px-2 py-0.5 text-[11px] font-semibold text-[#B01F17]"><HeartPulse size={11} aria-hidden="true" />Needs a lighter load</span>}
            </div>
            <dl className="grid grid-cols-2 gap-2">
              <div className="col-span-2"><Fact label={`Utilisation (limit ${m.threshold}%)`}><LoadBar pct={m.barPct} label={m.label} tone={m.tone} wide /></Fact></div>
              <Fact label="Hours this week">{m.hoursPerWeek} h of {m.capacityPerWeek} h</Fact>
              <Fact label="Due this week">{m.dueThisWeek} {m.dueThisWeek === 1 ? "task" : "tasks"}</Fact>
              <Fact label="Health (HP)">{m.hp} · {m.hpTier}</Fact>
              <Fact label="Daily streak">{m.streak} {m.streak === 1 ? "day" : "days"}</Fact>
              <div className="col-span-2"><Fact label="Availability">{m.accountStatus === "active" ? m.status : "Account not active"} · <span className="font-normal text-text-secondary">leave is not recorded in Achievion yet</span></Fact></div>
            </dl>
            <section aria-labelledby="mt-head" className="flex flex-col gap-2">
              <h3 id="mt-head" className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Active tasks ({m.tasks.length})</h3>
              {m.tasks.length ? (
                <ul className="divide-y divide-ink/[0.05] rounded-xl border border-ink/[0.06]">
                  {m.tasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-text-primary">{t.title}</p>
                        <p className="truncate text-xs text-text-secondary">{t.project?.title ?? "No project"} · {t.status.replace("-", " ")}{t.deadline ? ` · due ${fmt(t.deadline)}` : ""}</p>
                      </div>
                      {t.reassignable
                        ? <button type="button" className={`${BTN.secondary} shrink-0`} onClick={() => setTask(t)} aria-label={`Reassign ${t.title}`}><Repeat size={14} aria-hidden="true" />Reassign</button>
                        : <span className="shrink-0 text-xs text-text-secondary">{t.note ?? "In review"}</span>}
                    </li>
                  ))}
                </ul>
              ) : <p className="rounded-xl bg-ink/[0.03] p-3 text-text-secondary">No active tasks right now.</p>}
            </section>
          </div>
        )}
    </Drawer>
  );
}
