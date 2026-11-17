// Shared AI answer parts (QA4 Y-1, M-1/M-2): the answer text is short and carries no names; the people, tasks, projects, sprints and flags
// it talks about come as cards. A card opens the EXISTING screen for that item in this portal (utils/entityRoutes.js). No new screens.
// entity (server-validated, API_CONTRACT_QA4 §5): { type, id, name|label|title, ...card data }; entityView() turns it into name, line and chips.
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, CheckSquare, FolderKanban, Flag, Gavel, Timer, User } from "lucide-react";
import useAuthStore from "@/stores/authStore";
import { entityPath, entityView } from "@/utils/entityRoutes";
import { fmtDate } from "@/lib/dates";

const ICON = { person: User, task: CheckSquare, project: FolderKanban, sprint: Timer, flag: Flag, request: CalendarClock, approval: Gavel, extension: CalendarClock };

export function EntityCard({ entity, role }) {
  const Icon = ICON[entity.type] ?? User;
  const to = entityPath(entity, role);
  const { name, sub, stats } = entityView(entity);
  const body = (
    <>
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/[0.1] text-accent-text"><Icon size={15} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-text-primary" title={name}>{name}</span>
        {sub && <span className="block truncate text-[11px] text-text-secondary" title={sub}>{sub}</span>}
        {stats.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {stats.map((s) => <span key={s.label} className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[11px] font-semibold text-text-secondary">{s.label}: {/^\d{4}-\d{2}-\d{2}$/.test(s.value) ? fmtDate(`${s.value}T12:00:00`) : s.value}</span>)}
          </span>
        )}
      </span>
      {to && <ArrowRight size={13} aria-hidden="true" className="shrink-0 text-slate-500" />}
    </>
  );
  const cls = "flex w-full items-center gap-2.5 rounded-xl border border-ink/[0.08] bg-white px-3 py-2";
  return to
    ? <Link to={to} className={`${cls} transition-colors hover:border-accent/40 hover:bg-accent/[0.04]`} aria-label={`Open ${name}`}>{body}</Link>
    : <div className={cls}>{body}</div>;
}

// A list of cards under an AI answer. Renders nothing when the answer has no entities.
export default function AiEntities({ entities }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!entities?.length) return null;
  return <ul aria-label="Mentioned in this answer" className="flex w-full flex-col gap-1.5">{entities.map((e) => <li key={`${e.type}-${e.id}`}><EntityCard entity={e} role={role} /></li>)}</ul>;
}
