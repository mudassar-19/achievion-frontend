import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, Clock, CheckCircle2,
  FolderKanban, Shield, Flame,
  XCircle, ArrowRight,
  Layers, Bell, CheckSquare, Inbox,
} from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";
import { avatarUrl } from "@/lib/avatar";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import { fmtDateTime } from "@/pages/manager/project/format";

const SENT_LABEL = { pending: "Waiting", approved: "Approved", auto_applied: "Applied", rejected: "Declined", counter_proposed: "Other dates proposed" };
const SENT_TONE = {
  pending:          { color: "#7A4B00", background: "#FFF0D2", borderColor: "rgba(242,166,13,0.4)" },
  approved:         { color: "#0E6A30", background: "#DFF5E6", borderColor: "rgba(18,128,59,0.3)" },
  auto_applied:     { color: "#0E6A30", background: "#DFF5E6", borderColor: "rgba(18,128,59,0.3)" },
  rejected:         { color: "#B01F17", background: "#FFE6E3", borderColor: "rgba(209,41,31,0.3)" },
  counter_proposed: { color: "#1948BD", background: "#E6EEFF", borderColor: "rgba(31,87,224,0.3)" },
};
import PageHeader from "@/components/ui/PageHeader";
import ErrorState from "@/components/ui/ErrorState";

// ── Severity config ────────────────────────────────────────────────────────────
const SEV_CFG = {
  Critical: { color: "#B01F17", bg: "rgba(209,41,31,0.12)",  border: "rgba(209,41,31,0.25)"  },
  High:     { color: "#9A3A06", bg: "rgba(232,89,12,0.12)", border: "rgba(232,89,12,0.25)" },
  Medium:   { color: "#7A5200", bg: "rgba(255,194,26,0.12)",  border: "rgba(255,194,26,0.25)"  },
  Low:      { color: "#4F5B75", bg: "rgba(109,123,153,0.12)",border: "rgba(109,123,153,0.20)"},
};

const PRIORITY_CFG = {
  Critical: { color: "#B01F17" },
  High:     { color: "#9A3A06" },
  Medium:   { color: "#7A5200" },
  Low:      { color: "#3A4660" },
};

const STATUS_DOT = {
  Pending:     "#7A5200",
  "In Progress":"#1948BD",
  Resolved:    "#0E6A30",
  Rejected:    "#B01F17",
};

const ALERT_ICON = {
  project_delayed:    AlertTriangle,
  health_critical:    Shield,
  milestone_overdue:  Clock,
  member_overloaded:  Flame,
  member_overdue:     Clock,
  review_queue_high:  CheckSquare,
};

const ACTION_LABELS = {
  project_created:       "created project",
  project_updated:       "updated project",
  project_status_changed:"changed project status",
  project_xp_updated:    "updated XP pool",
  role_change:           "role changed",
  account_status_change: "account status updated",
  employee_created:      "employee created",
  workspace_updated:     "updated workspace",
};

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)     return "just now";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// U-1: recent = "3h ago"; older = "Nov 5, 2026, 11:42 AM".
const whenLabel = (d) => (Date.now() - new Date(d) < 86_400_000 ? timeAgo(d) : fmtDateTime(d));

function daysLabel(date) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date) - Date.now()) / 86_400_000);
  if (diff < 0)   return { text: `${Math.abs(diff)}d overdue`, color: "#B01F17" };
  if (diff === 0) return { text: "Due today",    color: "#9A3A06" };
  if (diff <= 3)  return { text: `${diff}d left`, color: "#9A3A06" };
  if (diff <= 7)  return { text: `${diff}d left`, color: "#7A5200" };
  return               { text: `${diff}d left`, color: "#4F5B75" };
}

function RequestCard({ req, onUpdate, onLimit }) {
  const isLimit = req.type === "Resubmission limit reached"; // T-5 (D-142)
  const [expanded,  setExpanded]  = useState(false);
  const [note,      setNote]      = useState(req.managerNote ?? "");
  const [saving,    setSaving]    = useState(false);
  const pc = PRIORITY_CFG[req.priority] ?? PRIORITY_CFG.Medium;

  async function decide(decision) {
    setSaving(true);
    try { await onLimit(req._id, { decision, note }); } finally { setSaving(false); }
  }

  async function respond(status) {
    setSaving(true);
    try {
      await onUpdate(req._id, { status, managerNote: note });
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{
        background: "rgba(20,32,61,0.025)",
        borderColor: req.priority === "Critical" ? "rgba(209,41,31,0.25)"
                   : req.priority === "High"     ? "rgba(232,89,12,0.20)"
                   : "rgba(20,32,61,0.07)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
      >
        {/* Status dot */}
        <div className="w-2 h-2 rounded-full shrink-0 mt-1.5"
          style={{ background: STATUS_DOT[req.status] ?? "#6D7B99" }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[14px] font-black px-2 py-0.5 rounded-full border"
              style={{ color: pc.color, background: `${pc.color}12`, borderColor: `${pc.color}30` }}>
              {req.priority}
            </span>
            <span className="text-[14px] text-slate-600 font-medium">{req.type}</span>
          </div>
          <p className="text-sm font-bold text-text-primary leading-snug">{req.title}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {req.requesterId && (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full overflow-hidden border border-ink/10 shrink-0">
                  <img src={avatarUrl("bottts", req.requesterId.avatarSeed ?? req.requesterId.name)}
                    alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <span className="text-[14px] text-slate-500">{req.requesterId.name}</span>
                <span className="text-[14px] text-slate-600">·</span>
                <span className="text-[14px] text-slate-600">{req.requesterId.role}</span>
              </div>
            )}
            {req.projectId && (
              <span className="text-[14px] text-slate-600 flex items-center gap-1">
                <FolderKanban size={9} /> {req.projectId.title}
              </span>
            )}
            <span className="text-[14px] text-slate-600">{timeAgo(req.createdAt)}</span>
          </div>
        </div>

        <span className="text-[14px] font-bold px-2 py-1 rounded-lg shrink-0"
          style={{ background: `${STATUS_DOT[req.status] ?? "#6D7B99"}15`, color: STATUS_DOT[req.status] ?? "#4F5B75" }}>
          {req.status}
        </span>
      </button>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 flex flex-col gap-3 border-t border-ink/[0.06]">
              {req.message && !isLimit && (
                <p className="text-xs text-slate-400 leading-relaxed">{req.message}</p>
              )}
              {req.milestoneId && (
                <p className="text-[14px] text-slate-500 flex items-center gap-1.5">
                  <Layers size={10} /> Milestone: {req.milestoneId.title}
                </p>
              )}

              {isLimit && req.taskId && (
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[13px]">
                  <dt className="text-slate-500">Task</dt><dd className="min-w-0 truncate font-semibold text-text-primary" title={req.taskId.title}>{req.taskId.title}</dd>
                  <dt className="text-slate-500">Assignee</dt><dd className="min-w-0 truncate" title={req.taskId.assignee?.name}>{req.taskId.assignee?.name ?? "Nobody"}</dd>
                  <dt className="text-slate-500">Team Lead</dt><dd className="min-w-0 truncate" title={req.requesterId?.name}>{req.requesterId?.name ?? "—"}</dd>
                  <dt className="text-slate-500">Attempts</dt><dd className="tabular-nums">{req.attempts ?? "—"}</dd>
                </dl>
              )}
              {/* Manager note */}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add a note or response..."
                className="w-full bg-ink/[0.03] border border-ink/[0.07] rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-ink/20 resize-none"
              />

              {/* Actions */}
              {isLimit ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" onClick={() => decide("allow")} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-bold border border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 transition-all disabled:opacity-40"><CheckCircle2 size={10} /> Allow another try</button>
                  <button type="button" onClick={() => decide("decline")} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-bold border border-rose-500/30 text-rose-700 hover:bg-rose-500/10 transition-all disabled:opacity-40"><XCircle size={10} /> Decline</button>
                </div>
              ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => respond("In Progress")}
                  disabled={saving || req.status === "In Progress"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-bold border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 disabled:opacity-40 transition-all"
                >
                  <ArrowRight size={10} /> Acknowledge
                </button>
                <button
                  onClick={() => respond("Resolved")}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-bold border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40 transition-all"
                >
                  <CheckCircle2 size={10} /> Resolve
                </button>
                <button
                  onClick={() => respond("Rejected")}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-bold border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 disabled:opacity-40 transition-all"
                >
                  <XCircle size={10} /> Reject
                </button>
              </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Alert Card ─────────────────────────────────────────────────────────────────
function AlertCard({ alert }) {
  const cfg  = SEV_CFG[alert.severity] ?? SEV_CFG.Low;
  const Icon = ALERT_ICON[alert.type] ?? AlertTriangle;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 px-4 py-3.5 rounded-xl border"
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}35` }}>
        <Icon size={13} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[14px] font-black uppercase tracking-wider" style={{ color: cfg.color }}>
            {alert.severity}
          </span>
          <span className="text-[14px] text-slate-500 font-medium">{alert.title}</span>
        </div>
        <p className="text-[14px] text-slate-300 leading-relaxed">{alert.message}</p>
        {alert.subject?.type === "member" && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="w-4 h-4 rounded-full overflow-hidden">
              <img src={avatarUrl("bottts", alert.subject.avatarSeed ?? alert.subject.name)}
                alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <span className="text-[14px] text-slate-500">{alert.subject.name} · {alert.subject.role}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Alert groups (U-1): one row per alert type, Critical first, expandable ───────
const SEV_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };
function groupAlerts(alerts) {
  const by = new Map();
  for (const a of alerts) { const g = by.get(a.type) ?? { type: a.type, title: a.title, items: [] }; g.items.push(a); by.set(a.type, g); }
  for (const g of by.values()) { g.items.sort((x, y) => (SEV_RANK[x.severity] ?? 9) - (SEV_RANK[y.severity] ?? 9)); g.severity = g.items[0].severity; }
  return [...by.values()].sort((x, y) => (SEV_RANK[x.severity] ?? 9) - (SEV_RANK[y.severity] ?? 9) || y.items.length - x.items.length);
}
function AlertGroup({ group }) {
  const [open, setOpen] = useState(false);
  if (group.items.length === 1) return <AlertCard alert={group.items[0]} />;
  const cfg = SEV_CFG[group.severity] ?? SEV_CFG.Low;
  return (
    <div className="rounded-xl border" style={{ background: cfg.bg, borderColor: cfg.border }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <span className="text-[14px] font-black uppercase tracking-wider" style={{ color: cfg.color }}>{group.severity}</span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-text-primary">{group.items.length} × {group.title}</span>
        <span className="shrink-0 text-[13px] font-semibold text-text-secondary">{open ? "Hide" : "Show all"}</span>
      </button>
      {open && <div className="flex flex-col gap-2 px-3 pb-3">{group.items.map((a) => <AlertCard key={a.id} alert={a} />)}</div>}
    </div>
  );
}

// Audit text sometimes carries raw ISO times ("2026-11-05T11:42:00.000Z"); show them as "Nov 5, 2026, 11:42 AM".
const readableIso = (s) => String(s).replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g, (m) => fmtDateTime(m));

// ── Activity Item ──────────────────────────────────────────────────────────────
function ActivityItem({ item, accent }) {
  const label = ACTION_LABELS[item.action] ?? item.action?.replace(/_/g, " ");

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-ink/[0.04] last:border-0">
      <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-2" style={{ background: accent }} />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-slate-300 leading-relaxed">
          {item.actor ? (
            <span className="font-bold text-text-primary">{item.actor.name}</span>
          ) : (
            <span className="text-slate-500">System</span>
          )}{" "}
          <span className="text-slate-400">{label}</span>
          {item.projectTitle && (
            <span className="text-slate-500"> — <span className="font-medium text-slate-400">{item.projectTitle}</span></span>
          )}
          {item.detail && (
            <span className="text-slate-600 break-words"> · {readableIso(item.detail)}</span>
          )}
        </p>
      </div>
      <time dateTime={item.createdAt} title={fmtDateTime(item.createdAt)} className="text-[14px] text-slate-600 shrink-0 mt-0.5 whitespace-nowrap">
        {whenLabel(item.createdAt)}
      </time>
    </div>
  );
}

// ── OperationsHubPage ──────────────────────────────────────────────────────────
// Manager Inbox (V2 Phase 3 · M-1, UX §4). Order fixed by the UX doc.
const TABS = [
  { key: "requests", label: "Requests",  icon: Inbox       },
  { key: "alerts",   label: "Alerts",    icon: Bell        },
  { key: "review",   label: "In Review", icon: CheckSquare },
  { key: "activity", label: "Activity",  icon: Activity    },
];

function TabEmpty({ text, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-subtle py-12 text-center">
      <p className="text-sm text-text-secondary">{text}</p>
      {action && (
        <button type="button" onClick={action.onClick}
          className="h-9 rounded-xl border border-border-subtle bg-bg-surface px-4 text-sm font-bold text-text-primary hover:bg-bg-muted transition-colors">
          {action.label}
        </button>
      )}
    </div>
  );
}

// In Review is read-only for Managers (the Team Lead approves, D-027); they can send a reminder.
function ReviewRow({ t, onNudge, nudging, nudged }) {
  const dl = t.deadline ? daysLabel(t.deadline) : null;
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-text-primary">{t.title}</p>
        <p className="mt-0.5 text-xs text-text-secondary">
          {(t.assignees ?? []).map((a) => a.name).join(", ") || "Unassigned"}
          {t.submittedAt && ` · submitted ${timeAgo(t.submittedAt)}`}
          {dl && <span style={{ color: dl.color }}> · {dl.text}</span>}
        </p>
      </div>
      <button type="button" onClick={() => onNudge(t)} disabled={nudging || nudged}
        className="h-9 shrink-0 rounded-xl border border-border-subtle bg-bg-surface px-3.5 text-xs font-bold text-text-primary hover:bg-bg-muted disabled:opacity-50 transition-colors">
        {nudged ? "Reminder sent" : nudging ? "Sending…" : "Nudge Team Lead"}
      </button>
    </li>
  );
}

function InboxSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading inbox">
      <div className="h-10 w-full max-w-md rounded-xl bg-ink/[0.05] animate-pulse" />
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-ink/[0.04] animate-pulse" />)}
    </div>
  );
}

export default function OperationsHubPage() {
  const navigate   = useNavigate();
  const theme      = useRoleTheme();
  const accent     = theme.accent;

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState("");
  const [activeTab,  setActiveTab]  = useState("requests");
  const refreshRef = useRef(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const d = await api.get("/api/manager/ops-hub");
      setData(d);
    } catch (err) {
      setError(err.message ?? "Failed to load operations hub.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll every 90 seconds for live feel
  useEffect(() => {
    refreshRef.current = setInterval(() => loadData(true), 90_000);
    return () => clearInterval(refreshRef.current);
  }, [loadData]);

  async function handleLimitDecision(id, body) {
    try {
      await api.post(`/api/manager/requests/${id}/limit-decision`, body);
      addToast({ type: "success", message: body.decision === "allow" ? "One more try allowed. The assignee and Team Lead were told." : "Declined. The assignee and Team Lead were told." });
      setData((prev) => (prev ? { ...prev, requests: prev.requests.filter((r) => r._id !== id) } : prev));
    } catch (e) { addToast({ type: "error", message: e?.message ?? "That did not work." }); }
  }

  async function handleUpdateRequest(id, body) {
    const updated = await api.patch(`/api/manager/requests/${id}`, body);
    setData((prev) => {
      if (!prev) return prev;
      // Remove resolved/rejected from pending list
      const newRequests = ["Resolved", "Rejected"].includes(body.status)
        ? prev.requests.filter((r) => r._id !== id)
        : prev.requests.map((r) => r._id === id ? { ...r, ...updated } : r);
      return {
        ...prev,
        requests: newRequests,
        stats: {
          ...prev.stats,
          pendingRequests: newRequests.length,
        },
      };
    });
  }

  const addToast = useUiStore((st) => st.addToast);
  const [nudge, setNudge] = useState({}); // taskId → "sending" | "sent"
  async function handleNudge(t) {
    setNudge((n) => ({ ...n, [t._id]: "sending" }));
    try {
      await api.post(`/api/manager/tasks/${t._id}/nudge`);
      setNudge((n) => ({ ...n, [t._id]: "sent" }));
      addToast({ type: "success", message: "The Team Lead was reminded." });
    } catch (err) {
      setNudge((n) => ({ ...n, [t._id]: err?.status === 429 ? "sent" : undefined }));
      addToast({ type: "error", message: err?.message ?? "Reminder not sent." });
    }
  }

  const requests = data?.requests ?? [];
  const sent = data?.myExtensions ?? []; // M-2: my project deadline extensions waiting on / decided by the Director
  const alerts   = data?.alerts   ?? [];
  const activity = data?.activity ?? [];
  const review   = data?.tasksInReview ?? [];

  const tabCounts = {
    requests: requests.length,
    alerts:   alerts.length,
    activity: activity.length,
    review:   review.length,
  };

  return (
    <Page>
      <PageHeader title="Inbox" subtitle="Requests, alerts and work waiting for review."
        secondary={{ label: refreshing ? "Updating…" : "Refresh", onClick: () => loadData(true), disabled: refreshing }} />

      {loading ? <InboxSkeleton /> : error ? (
        <ErrorState message={error} onRetry={() => loadData()} />
      ) : (
        <div className="flex flex-col gap-4">
          <div role="tablist" aria-label="Inbox sections" className="flex gap-1 overflow-x-auto border-b border-border-subtle">
            {TABS.map((t) => (
              <button key={t.key} role="tab" aria-selected={activeTab === t.key} onClick={() => setActiveTab(t.key)}
                className="flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors"
                style={{ borderBottomColor: activeTab === t.key ? accent : "transparent", color: activeTab === t.key ? theme.text : "var(--text-secondary)" }}>
                <t.icon size={14} aria-hidden="true" />
                {t.label}
                {tabCounts[t.key] > 0 && (
                  <span className="rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
                    style={{ background: activeTab === t.key ? theme.accentLight : "rgba(20,32,61,0.07)", color: activeTab === t.key ? theme.text : "var(--text-secondary)" }}>
                    {tabCounts[t.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "requests" && (<>
            {requests.length ? (
              <div className="flex flex-col gap-3">
                {requests.map((r) => <RequestCard key={r._id} req={r} accent={accent} onUpdate={handleUpdateRequest} onLimit={handleLimitDecision} />)}
              </div>
            ) : <TabEmpty text="No requests are waiting for you." action={{ label: "Open projects", onClick: () => navigate("/manager/projects") }} />}
            {sent.length > 0 && (
              <section aria-labelledby="sent-h" className="flex flex-col gap-2">
                <h2 id="sent-h" className="mt-2 text-sm font-black text-text-primary">Sent to the Director</h2>
                <ul className="glass-panel divide-y divide-ink/[0.05] rounded-2xl border border-ink/[0.07]">
                  {sent.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <span className="min-w-0">
                        <button type="button" onClick={() => navigate(`/manager/projects/${e.projectId}`)} className="text-sm font-bold text-text-primary hover:underline">{e.projectTitle}</button>
                        <span className="block text-xs text-text-secondary">Deadline +{e.days} day{e.days === 1 ? "" : "s"} · {e.reason}{e.note ? ` · Director: ${e.note}` : ""}</span>
                      </span>
                      <span className="rounded-full border px-2.5 py-0.5 text-xs font-bold" style={SENT_TONE[e.status] ?? SENT_TONE.pending}>{SENT_LABEL[e.status] ?? e.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>)}

          {activeTab === "alerts" && (alerts.length ? (
            <div className="flex flex-col gap-2">{groupAlerts(alerts).map((g) => <AlertGroup key={g.type} group={g} />)}</div>
          ) : <TabEmpty text="No alerts right now." action={{ label: "Open resources", onClick: () => navigate("/manager/resources") }} />)}

          {activeTab === "review" && (review.length ? (
            <>
              <p className="text-xs text-text-secondary">Team Leads approve these. You can send a reminder.</p>
              <ul className="flex flex-col gap-2">
                {review.map((t) => (
                  <ReviewRow key={t._id} t={t} onNudge={handleNudge} nudging={nudge[t._id] === "sending"} nudged={nudge[t._id] === "sent"} />
                ))}
              </ul>
            </>
          ) : <TabEmpty text="Nothing is waiting for review." action={{ label: "Open projects", onClick: () => navigate("/manager/projects") }} />)}

          {activeTab === "activity" && (activity.length ? (
            <div className="rounded-2xl border border-border-subtle bg-bg-surface p-4">
              {activity.map((item) => <ActivityItem key={item.id} item={item} accent={accent} />)}
            </div>
          ) : <TabEmpty text="No recent activity." action={{ label: "Refresh", onClick: () => loadData(true) }} />)}
        </div>
      )}
    </Page>
  );
}
