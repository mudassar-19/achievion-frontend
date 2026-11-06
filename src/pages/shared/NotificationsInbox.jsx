// Notifications on the universal shell (S-3, D-168). Built for any portal: pass the viewer's role and the settings path.
// Used by the Team Lead now; Manager and employee portals keep their own page until they move (Phase 5).
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bell, CalendarDays, Check, ClipboardList, FolderKanban, Trash2, Users, Zap, Info } from "lucide-react";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import { BTN } from "@/components/ui/buttons";
import api from "@/lib/api";
import { toCategory, notifRedirectPath } from "@/stores/notificationStore";
import useLoad from "@/pages/manager/project/useLoad";
import { fmtDateTime } from "@/pages/manager/project/format";

const KIND = {
  task:         { label: "Task",    icon: ClipboardList },
  project:      { label: "Module",  icon: FolderKanban },
  team:         { label: "Team",    icon: Users },
  gamification: { label: "XP",      icon: Zap },
  system:       { label: "Other",   icon: Info },
};
// Older notifications have no title; their type ("review_requested") becomes words.
const titleOf = (n) => n.title || (n.type === "review_requested" ? "Submission waiting for review" : String(n.type ?? "Notification").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()));
const dayKey = (d) => { const x = new Date(d); return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
function groupLabel(key) {
  const today = dayKey(Date.now());
  if (key === today) return "Today";
  if (key === today - 864e5) return "Yesterday";
  return "Earlier";
}

function Row({ n, to, onRead, onDelete }) {
  const kind = KIND[toCategory(n.type)] ?? KIND.system;
  const Icon = kind.icon;
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-2 px-5 py-3.5">
      <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-text">
        <Icon size={15} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1 basis-[14rem]">
        <p className="flex min-w-0 items-center gap-2">
          {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
          <span className={`truncate text-sm ${n.read ? "font-semibold text-text-secondary" : "font-bold text-text-primary"}`} title={titleOf(n)}>{titleOf(n)}</span>
          {!n.read && <span className="sr-only">(unread)</span>}
        </p>
        {n.message && <p className="mt-0.5 text-sm leading-snug text-text-secondary [overflow-wrap:anywhere]">{n.message}</p>}
        <p className="mt-1 text-xs tabular-nums text-text-secondary">{kind.label} · {fmtDateTime(n.createdAt)}</p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {to && <Link to={to} onClick={() => !n.read && onRead(n)} className={BTN.ghost}>Open</Link>}
        {!n.read && <button type="button" className={BTN.icon} onClick={() => onRead(n)} aria-label={`Mark "${titleOf(n)}" as read`} title="Mark as read"><Check size={16} aria-hidden="true" /></button>}
        <button type="button" className={BTN.icon} onClick={() => onDelete(n)} aria-label={`Delete "${titleOf(n)}"`} title="Delete"><Trash2 size={15} aria-hidden="true" /></button>
      </div>
    </li>
  );
}

export default function NotificationsInbox({ role, settingsPath, ownPath }) {
  const [sp] = useSearchParams();
  const show = sp.get("show") ?? "";
  const { data, error, reload, setData } = useLoad("/api/notifications?limit=100");
  const all = useMemo(() => data?.notifications ?? [], [data]);
  const unread = all.filter((n) => !n.read).length;

  const list = all.filter((n) => !show || (show === "unread" ? !n.read : toCategory(n.type) === show || (show === "system" && !["task", "project", "team"].includes(toCategory(n.type)))));
  const groups = [];
  for (const n of list) {
    const label = groupLabel(dayKey(n.createdAt));
    if (groups.at(-1)?.label !== label) groups.push({ label, items: [] });
    groups.at(-1).items.push(n);
  }

  const patch = (fn) => setData((d) => ({ ...d, notifications: fn(d?.notifications ?? []) }));
  const markRead = (n) => { patch((l) => l.map((x) => (x._id === n._id ? { ...x, read: true } : x))); api.patch(`/api/notifications/${n._id}/read`, {}).catch(() => {}); };
  const remove = (n) => { patch((l) => l.filter((x) => x._id !== n._id)); api.delete(`/api/notifications/${n._id}`).catch(reload); };
  const markAll = () => { patch((l) => l.map((x) => ({ ...x, read: true }))); api.patch("/api/notifications/read-all", {}).catch(reload); };
  const target = (n) => { const to = notifRedirectPath(n, role); return to && to !== ownPath ? to : null; };

  return (
    <Page>
      <PageHeader title="Notifications" subtitle="What needs you and what changed on your work. Needs-action alerts cannot be turned off."
        secondary={data && unread ? { label: "Mark all as read", onClick: markAll } : undefined}>
        {settingsPath && <Link to={settingsPath} className={BTN.ghost}>Notification settings</Link>}
      </PageHeader>
      <FilterChips label="Show" param="show" options={[
        { value: "unread", label: data ? `Unread (${unread})` : "Unread" },
        { value: "task", label: "Tasks" }, { value: "project", label: "Modules" }, { value: "team", label: "Team" }, { value: "system", label: "Other" },
      ]} />
      {error ? <ErrorState message={error} onRetry={reload} /> : !data ? (
        <div aria-busy="true" aria-label="Loading notifications" className="flex flex-col gap-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[68px] rounded-2xl" />)}</div>
      ) : !all.length ? (
        <Panel title="Notifications" icon={Bell}>
          <EmptyState pose="cheer" heading="No notifications yet" body="Reviews, deadlines and module news will show up here." action={settingsPath ? { label: "Choose what you hear about", to: settingsPath } : undefined} />
        </Panel>
      ) : !list.length ? (
        <Panel title="Notifications" icon={Bell}>
          <EmptyState heading={show === "unread" ? "You are all caught up" : "Nothing here for this filter"} body="Clear the filter to see everything." action={{ label: "Show all", to: "?" }} />
        </Panel>
      ) : groups.map((g) => (
        <Panel key={g.label} title={g.label} icon={CalendarDays}>
          <ul className="divide-y divide-ink/[0.05]">{g.items.map((n) => <Row key={n._id} n={n} to={target(n)} onRead={markRead} onDelete={remove} />)}</ul>
        </Panel>
      ))}
    </Page>
  );
}
