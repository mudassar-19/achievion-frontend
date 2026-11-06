import { Link } from "react-router-dom";

// One number + label (extracted from the Director "Org Snapshot"). Put several in
// <div className="grid grid-cols-N divide-x divide-ink/[0.05]"> inside a Panel. `color` must be a hex value.
export default function StatCard({ label, value, noDataLabel, sub, icon: Icon, color, to }) {
  const content = (
    <div className="flex flex-col items-start px-5 py-5 gap-1 h-full">
      <span className="h-8 w-8 flex items-center justify-center rounded-xl" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        <Icon size={15} style={{ color }} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="text-2xl font-black text-text-primary leading-none mt-2">
        {value ?? <span className="text-sm font-semibold text-slate-400">{noDataLabel}</span>}
      </p>
      <p className="text-[13px] font-semibold text-slate-500 leading-tight">{label}</p>
      {sub && <p className="text-xs text-text-secondary leading-snug">{sub}</p>}
    </div>
  );
  return to
    ? <Link to={to} className="hover:bg-ink/[0.06] transition-colors">{content}</Link>
    : <div>{content}</div>;
}
