// Module Handoff tab + QA checklist (T-4, D-137, D-138; UX TL v4 §7, TL-09, FR03-11). Read-only; click opens the task drawer.
import { ArrowRight, CheckCircle2, Hourglass, ShieldCheck } from "lucide-react";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import { QA_LABEL, QA_TONE } from "./reviewText";

const QA_CHECK = { passed: "Signed", conditional: "Conditional", waiting: "Waiting", failed: "Failed" };

function TaskCard({ t, onOpen }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen(t.id)} className={`flex w-full min-w-0 flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors hover:bg-ink/[0.03] ${t.blocked ? "border-[#F2A60D]/60 bg-[#FFF7E6]" : "border-ink/[0.08] bg-bg-surface"}`}>
        <span className="flex min-w-0 items-start justify-between gap-2"><span className="line-clamp-2 min-w-0 font-bold text-text-primary [overflow-wrap:anywhere]" title={t.title}>{t.title}</span><span className="shrink-0"><StatusChip status={t.status} size="xs" /></span></span>
        {t.assignees?.length > 0 && <span className="truncate text-xs text-text-secondary" title={t.assignees.join(", ")}>{t.assignees.join(", ")}</span>}
        {t.blocked && <span className="flex min-w-0 items-start gap-1 text-xs font-semibold text-[#7A4B00]"><Hourglass size={12} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="line-clamp-2 min-w-0 [overflow-wrap:anywhere]" title={t.waitingFor.map((w) => w.title).join(", ")}>Waiting for: {t.waitingFor.map((w) => w.title).join(", ")}</span></span>}
        {t.unblocked && <span className="flex items-center gap-1 text-xs font-semibold text-[#0E6A30]"><CheckCircle2 size={12} aria-hidden="true" />Unblocked</span>}
        {t.qaRequired && <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: QA_TONE[t.qa]?.fg }}><ShieldCheck size={12} aria-hidden="true" />{QA_LABEL[t.qa]}</span>}
      </button>
    </li>
  );
}

export function QaChecklist({ data, error, reload, onOpen }) {
  return (
    <Panel title="QA checklist" icon={ShieldCheck}>
      {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <div className="p-5"><Skeleton className="h-12 rounded-xl" /></div>
        : data.qaStep.required === 0 ? <p className="px-5 py-4 text-sm text-text-secondary">No task here needs a QA sign-off.</p> : (
          <>
            <p className="px-5 pt-4 text-sm font-semibold text-text-primary">{data.qaStep.signed} of {data.qaStep.required} signed</p>
            <ul className="divide-y divide-ink/[0.05] px-2 py-2">
              {data.qaStep.tasks.map((t) => (
                <li key={t.id}><button type="button" onClick={() => onOpen(t.id)} className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-ink/[0.03]">
                  <span className="min-w-0 truncate font-semibold text-text-primary" title={t.title}>{t.title}</span>
                  <span className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold" style={{ color: QA_TONE[t.qa]?.fg, background: QA_TONE[t.qa]?.bg }}>{QA_CHECK[t.qa]}</span>
                </button></li>
              ))}
            </ul>
          </>
        )}
    </Panel>
  );
}

export default function Handoff({ data, error, reload, onOpen }) {
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <div className="grid gap-4 md:grid-cols-3" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>;
  if (!data.stages.some((s) => s.tasks.length)) return <EmptyState heading="No tasks to hand off yet" body="Break the work into tasks and add dependencies. The chain from design to testing shows here." />;
  return (
    <div className="flex flex-col gap-4">
      <ol className="grid min-w-0 gap-4 md:grid-cols-3" aria-label="Handoff chain">
        {data.stages.map((s, i) => (
          <li key={s.key} className="min-w-0 rounded-2xl border border-ink/[0.07] bg-ink/[0.02] p-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-text-primary">{s.label} <span className="font-semibold text-text-secondary">({s.tasks.length})</span>{i < 2 && <ArrowRight size={14} className="ml-auto hidden text-text-secondary md:block" aria-hidden="true" />}</h3>
            {s.tasks.length ? <ul className="flex flex-col gap-2">{s.tasks.map((t) => <TaskCard key={t.id} t={t} onOpen={onOpen} />)}</ul> : <p className="px-1 text-[13px] text-text-secondary">No {s.label.toLowerCase()} tasks.</p>}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink/[0.07] bg-bg-surface px-4 py-3 text-sm">
        <ShieldCheck size={15} className="text-text-secondary" aria-hidden="true" /><strong>QA sign-off</strong>
        <span className="text-text-secondary">{data.qaStep.required ? `${data.qaStep.signed} of ${data.qaStep.required} required tasks signed.` : "No task needs a QA sign-off."}</span>
      </div>
    </div>
  );
}
