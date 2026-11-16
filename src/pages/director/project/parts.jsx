// Read-only building blocks shared by the Director project page and module page (UI-B).
// Components only (constants stay inside them) so fast refresh keeps working.
import StatusChip from "@/components/ui/StatusChip";
import { fmt } from "@/pages/manager/project/format";

// A missing value is said in words, in a lighter grey, never as a dash (UIB-3).
export function NotSet({ children = "Not set" }) {
  return <span className="font-normal text-slate-500">{children}</span>;
}

export function DateText({ value, empty = "Not set" }) {
  return value ? <span className="tabular-nums">{fmt(value)}</span> : <NotSet>{empty}</NotSet>;
}

// One label + value pair of a summary <dl>. Long values wrap; `title` gives the full text on hover.
export function Field({ label, title, children }) {
  return (
    <div className="min-w-0 px-5 py-3.5">
      <dt className="text-[13px] font-semibold text-slate-500">{label}</dt>
      <dd title={title} className="mt-0.5 text-sm font-bold text-text-primary [overflow-wrap:anywhere] line-clamp-2">{children}</dd>
    </div>
  );
}

export function Summary({ children }) {
  return <dl className="grid grid-cols-1 divide-y divide-ink/[0.05] min-[480px]:grid-cols-2 min-[480px]:divide-y-0 lg:grid-cols-3">{children}</dl>;
}

// One number with its unit and a line of detail. `tone="danger"` marks a count that needs attention.
export function Stat({ label, value, unit, detail, tone, children }) {
  return (
    <div className="min-w-0 px-5 py-4">
      <dt className="text-[13px] font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1">
        <span className={`text-2xl font-black leading-none tabular-nums ${tone === "danger" ? "text-[#B01F17]" : "text-text-primary"}`}>{value}</span>
        {unit && <span className="ml-1.5 text-sm font-semibold text-text-secondary">{unit}</span>}
        {children}
        {detail && <span className="mt-1.5 block text-xs leading-snug text-text-secondary">{detail}</span>}
      </dd>
    </div>
  );
}

export function Stats({ children }) {
  return <dl className="grid grid-cols-2 divide-ink/[0.05] lg:grid-cols-4 lg:divide-x">{children}</dl>;
}

export function ProgressBar({ pct, label, className = "" }) {
  return (
    <span role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}
      className={`block h-1.5 overflow-hidden rounded-full bg-ink/[0.08] ${className}`}>
      <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
    </span>
  );
}

// Tasks by status as one stacked bar + a legend with the counts. `counts` = { done, inReview, inProgress, todo, backlog }.
export function TaskStatusBar({ counts }) {
  const parts = [
    ["done", "Done", "#12803B"], ["inReview", "In review", "#B7791F"], ["inProgress", "In progress", "#2A62EC"],
    ["todo", "To do", "#7C879B"], ["backlog", "Backlog", "#C3CAD6"],
  ].map(([k, label, color]) => ({ label, color, n: counts[k] ?? 0 })).filter((p) => p.n > 0);
  const total = parts.reduce((a, p) => a + p.n, 0);
  if (!total) return <p className="px-5 py-4 text-sm text-text-secondary">No tasks yet, so there is nothing to chart.</p>;
  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      <div role="img" aria-label={`Tasks by status: ${parts.map((p) => `${p.n} ${p.label.toLowerCase()}`).join(", ")}`}
        className="flex h-3 gap-0.5 overflow-hidden rounded-full">
        {parts.map((p) => <span key={p.label} style={{ width: `${(p.n / total) * 100}%`, background: p.color }} className="min-w-[3px]" />)}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-text-secondary">
        {parts.map((p) => (
          <li key={p.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label} <strong className="font-bold tabular-nums text-text-primary">{p.n}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProjectStatusChip({ status, size }) {
  const key = { Delayed: "at_risk", "In Review": "pending", Scheduled: "planned", Frozen: "maintenance" }[status] ?? status;
  return <StatusChip status={key} label={status} size={size} />;
}

export function ModuleStateChip({ state }) {
  return <StatusChip status={{ Done: "completed", Running: "maintenance" }[state] ?? "on_hold"} label={state} size="xs" />;
}

export function TaskStatusChip({ status }) {
  const key = { Backlog: "on_hold", "To-Do": "planned", "In-Progress": "maintenance", "In-Review": "pending", Done: "completed" }[status];
  return <StatusChip status={key} label={status.replace("-", " ")} size="xs" />;
}

export function PageSkeleton({ label }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex flex-col gap-6">
      <div className="h-14 w-2/3 max-w-md rounded-xl shimmer-bg" />
      <div className="h-36 rounded-2xl shimmer-bg" />
      <div className="h-28 rounded-2xl shimmer-bg" />
      <div className="h-64 rounded-2xl shimmer-bg" />
    </div>
  );
}
