import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, AlertOctagon, CheckSquare, Inbox,
  AlertTriangle, TrendingDown, RefreshCw, FileText,
  Zap, CheckCheck, Settings, Clock,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import api        from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import { Link } from "react-router-dom";

const ACCENT = "#4B2FC4";

// ── Tier config ───────────────────────────────────────────────────────────────
const TIER = {
  critical:     { label: "Critical",     color: "#B01F17", bg: "#B01F1718", icon: AlertOctagon },
  needs_action: { label: "Needs action", color: "#7A5200", bg: "#E8590C18", icon: CheckSquare  },
  fyi:          { label: "FYI digest",   color: "#136386", bg: "#136386  18", icon: Inbox      },
};

// ── Type → icon + label ───────────────────────────────────────────────────────
const TYPE_CFG = {
  approval_pending:  { icon: CheckSquare,  label: "Approval pending",     tier: "needs_action" },
  escalation:        { icon: AlertTriangle,label: "Escalation raised",    tier: "critical"     },
  project_at_risk:   { icon: TrendingDown, label: "Project at risk",      tier: "needs_action" },
  org_health_drop:   { icon: AlertOctagon, label: "Org health drop",      tier: "critical"     },
  recap_ready:       { icon: FileText,     label: "Recap ready",          tier: "fyi"          },
  system_incident:   { icon: RefreshCw,    label: "System incident",      tier: "critical"     },
  xp_milestone:      { icon: Zap,          label: "XP milestone reached", tier: "fyi"          },
};

function timeAgo(d) {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Tier badge ────────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const cfg = TIER[tier];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ background: cfg.bg, borderColor: `${cfg.color}30`, color: cfg.color }}
    >
      <Icon size={9} /> {cfg.label}
    </span>
  );
}

// ── Notification item ─────────────────────────────────────────────────────────
function NotifItem({ notif, onRead }) {
  const cfg  = TYPE_CFG[notif.type] ?? { icon: Bell, label: notif.type, tier: "fyi" };
  const tier = TIER[cfg.tier ?? notif.tier] ?? TIER.fyi;
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
      className={[
        "flex items-start gap-3 px-4 py-4 border-b border-ink/[0.05] last:border-0 transition-colors",
        notif.read ? "opacity-60" : "",
      ].join(" ")}
    >
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: tier.bg, border: `1px solid ${tier.color}30` }}
      >
        <Icon size={15} strokeWidth={1.75} style={{ color: tier.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-bold text-text-primary">{notif.title ?? cfg.label}</span>
          <TierBadge tier={cfg.tier ?? notif.tier} />
        </div>
        <p className="text-[11px] text-slate-400 line-clamp-2">{notif.message}</p>
        {notif.deepLink && (
          <Link to={notif.deepLink} className="text-[11px] font-semibold mt-0.5 inline-block"
            style={{ color: ACCENT }}
          >
            View →
          </Link>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="flex items-center gap-1 text-[10px] text-slate-500">
          <Clock size={9} /> {timeAgo(notif.createdAt)}
        </span>
        {!notif.read && (
          <button
            onClick={() => onRead(notif._id)}
            className="text-[10px] font-semibold text-slate-500 hover:text-text-primary transition-colors"
            aria-label={`Mark ${notif.title ?? cfg.label} as read`}
            style={{ minHeight: "2rem", minWidth: "2rem" }}
          >
            Mark read
          </button>
        )}
      </div>

      {!notif.read && (
        <div className="h-2 w-2 rounded-full shrink-0 mt-1.5" style={{ background: tier.color }} />
      )}
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ tab }) {
  const msgs = {
    all:          "No notifications yet. Critical alerts and action items will appear here.",
    needs_action: "No pending actions. Approvals and escalations will appear here.",
    fyi:          "FYI digest is empty. Recap notifications and low-priority updates land here (max 1 digest / day).",
  };
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
      <Bell size={32} strokeWidth={1.2} />
      <p className="text-xs font-medium text-center max-w-xs px-4">{msgs[tab] ?? msgs.all}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DirectorNotificationsPage() {
  const addToast  = useUiStore((s) => s.addToast);
  const [tab,     setTab]     = useState("all");
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/director/notifications")
      .then((d) => setNotifs(Array.isArray(d) ? d : d?.data ?? []))
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  }, []);

  function handleRead(id) {
    setNotifs((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
    api.patch(`/api/director/notifications/${id}/read`).catch(() => {});
  }

  function handleMarkAll() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    api.post("/api/director/notifications/mark-all-read").catch(() => {});
    addToast({ type: "success", message: "All notifications marked as read." });
  }

  const filtered = tab === "all"
    ? notifs
    : notifs.filter((n) => {
        const cfg  = TYPE_CFG[n.type];
        const tier = cfg?.tier ?? n.tier ?? "fyi";
        if (tab === "needs_action") return tier === "needs_action" || tier === "critical";
        if (tab === "fyi")          return tier === "fyi";
        return true;
      });

  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1280px] mx-auto flex flex-col gap-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <PageHeader
          title="Notifications"
          subtitle="Director-level alerts, approvals, and FYI digest."
        />
      </motion.div>

      {/* Tier legend */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex flex-wrap gap-3"
      >
        {Object.entries(TIER).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const cnt  = key === "all" ? notifs.length
            : notifs.filter((n) => {
                const tc = TYPE_CFG[n.type];
                return (tc?.tier ?? n.tier) === key;
              }).length;
          return (
            <div
              key={key}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs"
              style={{ background: cfg.bg, borderColor: `${cfg.color}30`, color: cfg.color }}
            >
              <Icon size={12} strokeWidth={2} />
              <span className="font-bold">{cfg.label}</span>
              {cnt > 0 && <span className="font-black tabular-nums">{cnt}</span>}
            </div>
          );
        })}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/[0.07] bg-ink/[0.03] text-xs text-slate-500">
          <Inbox size={11} /> FYI rate cap: max 1 digest / day
        </div>
      </motion.div>

      {/* Main panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] overflow-hidden"
      >
        {/* Tab bar + actions */}
        <div className="flex items-center justify-between px-4 pt-2 border-b border-ink/[0.07]">
          <div className="flex gap-1">
            {[
              { id: "all",          label: "All" },
              { id: "needs_action", label: "Needs action" },
              { id: "fyi",          label: "FYI" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={[
                  "px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors",
                  tab === t.id
                    ? "border-current"
                    : "border-transparent text-slate-500 hover:text-text-primary",
                ].join(" ")}
                style={tab === t.id ? { color: ACCENT, borderColor: ACCENT } : {}}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pb-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-text-primary transition-colors min-h-[2rem] px-1"
              >
                <CheckCheck size={11} /> Mark all read
              </button>
            )}
            <Link
              to="/director/settings"
              className="flex items-center justify-center min-h-[2rem] min-w-[2rem] text-slate-500 hover:text-text-primary transition-colors rounded"
              aria-label="Open notification settings"
            >
              <Settings size={13} />
            </Link>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col gap-0">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-4 border-b border-ink/[0.05]">
                <div className="h-9 w-9 rounded-xl bg-ink/[0.05] animate-pulse shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 w-40 rounded bg-ink/[0.05] animate-pulse" />
                  <div className="h-3 w-64 rounded bg-ink/[0.05] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((n) => (
              <NotifItem key={n._id} notif={n} onRead={handleRead} />
            ))}
          </AnimatePresence>
        )}
      </motion.div>

    </div>
  );
}
