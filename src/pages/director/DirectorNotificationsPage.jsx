// Director notifications (UI-E2, master list item 34): one filter row (All, Critical, Needs action, FYI) with the unread
// number of each, words instead of raw codes, a labelled link to notification settings. The server's types are not changed.
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertOctagon, CheckSquare, Inbox, CheckCheck, Settings, Clock, ListFilter } from "lucide-react";
import { Link } from "react-router-dom";
import { notifRedirectPath } from "@/utils/notifRoutes";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import { FILTERS, tierOf, humanText, unreadCounts, filterList } from "@/lib/notifFormat";
import { isKey, notifTitle } from "@/lib/humanize";

const TIER = {
  critical:     { label: "Critical",     color: "#B01F17", bg: "#B01F1714", icon: AlertOctagon },
  needs_action: { label: "Needs action", color: "#7A5200", bg: "#E8590C14", icon: CheckSquare },
  fyi:          { label: "FYI",          color: "#136386", bg: "#13638614", icon: Inbox },
};
const TITLE_BY_TYPE = {
  approval_pending: "Approval waiting", approval_required: "Approval waiting", escalation: "Escalation raised", project_at_risk: "Project at risk",
  org_health_drop: "Organization health dropped", recap_ready: "Recap ready", system_incident: "System incident", xp_milestone: "XP milestone reached",
};
const EMPTY = {
  all: "No notifications yet. Critical alerts and things that need your action will appear here.",
  critical: "Nothing critical right now.",
  needs_action: "Nothing waits for your action. Approval requests and projects at risk appear here.",
  fyi: "No FYI updates. Recaps and low-priority news land here.",
};

function timeAgo(d) {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

function NotifItem({ notif, onRead }) {
  const tier = TIER[tierOf(notif)], Icon = tier.icon;
  const title = isKey(notif.title?.trim()) ? notifTitle(notif) : (notif.title?.trim() || TITLE_BY_TYPE[notif.type] || notifTitle(notif));
  const text = humanText(notif);
  return (
    <motion.li layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 border-b border-ink/[0.05] px-4 py-4 last:border-0 ${notif.read ? "opacity-70" : ""}`}>
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: tier.bg, border: `1px solid ${tier.color}30` }}>
        <Icon size={15} strokeWidth={1.75} style={{ color: tier.color }} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 text-sm font-bold text-text-primary [overflow-wrap:anywhere]">{title}</span>
          <span className="rounded-full border px-2 py-0.5 text-[11px] font-bold" style={{ background: tier.bg, borderColor: `${tier.color}30`, color: tier.color }}>{tier.label}</span>
          {!notif.read && <span className="text-[11px] font-bold text-accent-text">Unread</span>}
        </p>
        {text && <p title={text} className="mt-0.5 text-sm text-text-secondary [overflow-wrap:anywhere] line-clamp-2">{text}</p>}
        {<Link to={notifRedirectPath(notif, "Director")} className="mt-1 inline-block text-sm font-semibold text-accent-text underline-offset-2 hover:underline">Open</Link>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="flex items-center gap-1 text-xs text-text-secondary"><Clock size={11} aria-hidden="true" /> {timeAgo(notif.createdAt)}</span>
        {!notif.read && (
          <button type="button" onClick={() => onRead(notif._id)} aria-label={`Mark "${title}" as read`}
            className="min-h-8 rounded-lg px-2 text-xs font-semibold text-text-secondary hover:bg-ink/[0.05] hover:text-text-primary">Mark read</button>
        )}
      </div>
    </motion.li>
  );
}

export default function DirectorNotificationsPage() {
  const addToast = useUiStore((s) => s.addToast);
  const [tab, setTab] = useState("all");
  const [notifs, setNotifs] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error

  // The server's unread total (the list below holds the newest 200). The per-filter numbers are counted from the list with
  // the screen's own mapping (approvals = Needs action), because the server's count follows the stored tier. When the list
  // does not hold every unread one, the filter numbers get a "+".
  const [serverUnread, setServerUnread] = useState(null);
  const load = () => {
    setState("loading");
    api.get("/api/director/notifications?limit=200", { silent: true })
      .then((d) => { setNotifs(Array.isArray(d) ? d : d?.data ?? []); setState("ready"); })
      .catch(() => setState("error"));
    api.get("/api/director/notifications/count", { silent: true }).then((c) => setServerUnread(c.unread ?? null)).catch(() => setServerUnread(null));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/set-state-in-effect

  function handleRead(id) {
    const n = notifs.find((x) => x._id === id);
    setNotifs((prev) => prev.map((x) => (x._id === id ? { ...x, read: true } : x)));
    if (n && !n.read) setServerUnread((u) => (u === null ? u : Math.max(0, u - 1)));
    api.patch(`/api/director/notifications/${id}/read`).catch(() => {});
  }
  function handleMarkAll() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setServerUnread(0);
    api.post("/api/director/notifications/mark-all-read").catch(() => {});
    addToast({ type: "success", message: "All notifications marked as read." });
  }

  const listCounts = useMemo(() => unreadCounts(notifs), [notifs]);
  const more = serverUnread !== null && serverUnread > listCounts.all; // unread ones beyond the 200 loaded
  const counts = { ...listCounts, all: serverUnread ?? listCounts.all };
  const shown = useMemo(() => filterList(notifs, tab), [notifs, tab]);

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-8">
      <PageHeader title="All notifications" subtitle="Alerts, approvals and updates for you."
        secondary={undefined}>
        <Link to="/director/account-settings?tab=settings" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border-subtle bg-bg-surface px-4 text-sm font-bold text-text-primary hover:bg-bg-muted">
          <Settings size={17} aria-hidden="true" /> Notification settings
        </Link>
      </PageHeader>

      <div className="overflow-hidden rounded-2xl border border-ink/[0.07] bg-bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.07] px-4 py-3">
          <div role="group" aria-label="Filter notifications" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const t = TIER[f.id], on = tab === f.id, color = t?.color ?? "#4B2FC4", Icon = t?.icon ?? ListFilter;
              return (
                <button key={f.id} type="button" aria-pressed={on} onClick={() => setTab(f.id)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-bold transition-colors"
                  style={on ? { background: color, borderColor: color, color: "#fff" } : { background: t?.bg ?? "#4B2FC40F", borderColor: `${color}40`, color }}>
                  <Icon size={14} aria-hidden="true" />
                  {f.label}
                  <span className={`text-xs font-semibold tabular-nums ${on ? "text-white/90" : ""}`}>{counts[f.id]}{more && f.id !== "all" ? "+" : ""} unread</span>
                </button>
              );
            })}
          </div>
          {counts.all > 0 && (
            <button type="button" onClick={handleMarkAll} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-text-secondary hover:bg-ink/[0.05] hover:text-text-primary">
              <CheckCheck size={14} aria-hidden="true" /> Mark all read
            </button>
          )}
        </div>

        {state === "loading" ? (
          <div aria-busy="true" aria-label="Loading notifications">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 border-b border-ink/[0.05] px-4 py-4">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-ink/[0.05]" />
                <div className="flex flex-1 flex-col gap-2"><div className="h-3 w-40 animate-pulse rounded bg-ink/[0.05]" /><div className="h-3 w-64 max-w-full animate-pulse rounded bg-ink/[0.05]" /></div>
              </div>
            ))}
          </div>
        ) : state === "error" ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <p className="text-sm font-semibold text-text-primary">Notifications could not be loaded.</p>
            <button type="button" onClick={load} className="h-10 rounded-xl border border-border-subtle bg-bg-surface px-5 text-sm font-bold text-text-primary hover:bg-bg-muted">Try again</button>
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-text-secondary">
            <Bell size={30} strokeWidth={1.3} aria-hidden="true" />
            <p className="max-w-xs text-center text-sm">{EMPTY[tab]}</p>
          </div>
        ) : (
          <ul>
            <AnimatePresence initial={false}>{shown.map((n) => <NotifItem key={n._id} notif={n} onRead={handleRead} />)}</AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
