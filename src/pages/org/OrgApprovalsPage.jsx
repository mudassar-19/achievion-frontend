import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, UserPlus, UserMinus, ShieldOff, ShieldCheck, RefreshCw, Clock, CheckCircle2, XCircle, FileDown } from "lucide-react";
import api from "@/lib/api";
import useOrgAuthStore from "@/stores/orgAuthStore";
import socket from "@/utils/socket";
import ApprovalExportModal from "@/components/org/ApprovalExportModal";

import TallyLoader from "@/components/ui/TallyLoader";
// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return "—";
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)    return "just now";
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const ACTION_META = {
  CREATE_EMPLOYEE:     { label: "Create Employee",    icon: UserPlus,    color: "text-emerald-400", bg: "bg-emerald-500/12 border-emerald-500/25" },
  DELETE_EMPLOYEE:     { label: "Delete Employee",    icon: UserMinus,   color: "text-rose-400",    bg: "bg-rose-500/12 border-rose-500/25" },
  SUSPEND_EMPLOYEE:    { label: "Suspend Employee",   icon: ShieldOff,   color: "text-amber-400",   bg: "bg-amber-500/12 border-amber-500/25" },
  REACTIVATE_EMPLOYEE: { label: "Reactivate Account", icon: ShieldCheck, color: "text-cyan-400",    bg: "bg-cyan-500/12 border-cyan-500/25" },
  ROLE_CHANGE:         { label: "Role Change",        icon: RefreshCw,   color: "text-blue-400",    bg: "bg-blue-500/12 border-blue-500/25" },
};

const STATUS_META = {
  PENDING:  { label: "Pending",  icon: Clock,         cls: "bg-amber-500/12 text-amber-400 border-amber-500/25" },
  APPROVED: { label: "Approved", icon: CheckCircle2,  cls: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25" },
  REJECTED: { label: "Rejected", icon: XCircle,       cls: "bg-rose-500/12 text-rose-400 border-rose-500/25" },
};

function ActionBadge({ type }) {
  const meta = ACTION_META[type] ?? { label: type, color: "text-slate-400", bg: "bg-slate-500/12 border-slate-500/25" };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[14px] font-bold uppercase tracking-wider border ${meta.bg} ${meta.color}`}>
      {Icon && <Icon size={10} strokeWidth={2.5} />}
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDING;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[14px] font-bold border ${meta.cls}`}>
      <Icon size={10} strokeWidth={2.5} />
      {meta.label}
    </span>
  );
}

function describeApproval(a) {
  const { actionType, payload, targetEmployeeId } = a;
  const target = targetEmployeeId?.name ?? payload?.name ?? "—";
  switch (actionType) {
    case "CREATE_EMPLOYEE":
      return `Create account for ${payload?.name ?? "—"} as ${payload?.role ?? ""}`;
    case "DELETE_EMPLOYEE":
      return `Delete ${target}${payload?.reason ? ` — "${payload.reason}"` : ""}`;
    case "SUSPEND_EMPLOYEE":
      return `Suspend ${target}`;
    case "REACTIVATE_EMPLOYEE":
      return `Reactivate ${target}'s account`;
    case "ROLE_CHANGE":
      return `${target}: ${payload?.oldRole} → ${payload?.newRole}`;
    default:
      return actionType;
  }
}

// ── Tab button ────────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border",
        active
          ? "bg-accent/12 border-accent/25 text-accent-text"
          : "border-ink/8 text-slate-400 hover:text-text-primary hover:bg-ink/5",
      ].join(" ")}
    >
      <Icon size={14} strokeWidth={1.75} />
      {label}
      {count != null && (
        <span className={`text-[14px] font-black px-1.5 py-0.5 rounded-md ${active ? "bg-accent/20 text-accent-text" : "bg-white/8 text-slate-400"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ── Approval card ─────────────────────────────────────────────────────────────
function ApprovalCard({ approval }) {
  

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-xl border border-ink/[0.06] bg-ink/[0.02] hover:bg-ink/[0.04] transition-colors"
    >
      <div className="flex items-start gap-4 px-5 py-4">
        {/* Type icon */}
        {(() => {
          const meta = ACTION_META[approval.actionType];
          const Icon = meta?.icon ?? ClipboardList;
          return (
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${meta?.bg ?? "bg-slate-500/12 border-slate-500/25"}`}>
              <Icon size={16} className={meta?.color ?? "text-slate-400"} strokeWidth={1.75} />
            </div>
          );
        })()}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <ActionBadge type={approval.actionType} />
            <StatusBadge status={approval.status} />
          </div>
          <p className="text-sm font-semibold text-text-primary">{describeApproval(approval)}</p>
          <p className="text-xs text-text-disabled mt-0.5">Submitted {timeAgo(approval.createdAt)}</p>

          {/* Rejection reason / resolved date inline */}
          {approval.status === "REJECTED" && approval.rejectionReason && (
            <div className="mt-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
              <p className="text-xs text-rose-300"><span className="font-bold">Reason: </span>{approval.rejectionReason}</p>
            </div>
          )}
          {approval.resolvedAt && (
            <p className="text-[14px] text-text-disabled mt-1.5">
              {approval.status === "APPROVED" ? "Approved" : "Resolved"} on {formatDate(approval.resolvedAt)}
            </p>
          )}
        </div>

        {/* Date */}
        <span className="text-[14px] text-text-disabled shrink-0 hidden sm:block">{formatDate(approval.createdAt)}</span>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: "PENDING",  label: "Pending",  icon: Clock },
  { key: "APPROVED", label: "Approved", icon: CheckCircle2 },
  { key: "REJECTED", label: "Rejected", icon: XCircle },
];

export default function OrgApprovalsPage() {
  const orgToken = useOrgAuthStore((s) => s.orgToken);
  const org      = useOrgAuthStore((s) => s.org);
  const authHeaders = { Authorization: `Bearer ${orgToken}` };

  const [activeTab,   setActiveTab]   = useState("PENDING");
  const [allData,     setAllData]     = useState({ PENDING: [], APPROVED: [], REJECTED: [] });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [showExport,  setShowExport]  = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/org/approvals", { headers: authHeaders });
      const approvals = res.data ?? [];
      setAllData({
        PENDING:  approvals.filter((a) => a.status === "PENDING"),
        APPROVED: approvals.filter((a) => a.status === "APPROVED"),
        REJECTED: approvals.filter((a) => a.status === "REJECTED"),
      });
    } catch (err) {
      setError(err.message ?? "Failed to load approvals.");
    } finally {
      setLoading(false);
    }
  }, [orgToken]); // eslint-disable-line

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Move an approval from PENDING → APPROVED/REJECTED the moment the Director acts
  useEffect(() => {
    function handleApprovalResolved({ approvalId, status, rejectionReason }) {
      setAllData((prev) => {
        const id = String(approvalId);
        const approval = prev.PENDING.find((a) => String(a._id) === id);
        if (!approval) return prev;
        const resolved = {
          ...approval,
          status,
          rejectionReason: rejectionReason ?? null,
          resolvedAt: new Date().toISOString(),
        };
        return {
          PENDING:  prev.PENDING.filter((a) => String(a._id) !== id),
          APPROVED: status === "APPROVED" ? [resolved, ...prev.APPROVED] : prev.APPROVED,
          REJECTED: status === "REJECTED" ? [resolved, ...prev.REJECTED] : prev.REJECTED,
        };
      });
    }
    socket.on("approval:resolved", handleApprovalResolved);
    return () => socket.off("approval:resolved", handleApprovalResolved);
  }, []);

  const list = allData[activeTab] ?? [];

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 min-h-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent-text mb-1">Admin Panel</p>
          <h1 className="text-3xl font-black text-text-primary">Approval Requests</h1>
          <p className="text-sm text-text-secondary mt-1">
            Track all requests submitted for Director approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExport(true)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-accent/20 bg-accent/5 text-xs font-semibold text-accent-text hover:text-accent-text hover:border-accent/35 hover:bg-accent/10 transition-colors disabled:opacity-40"
          >
            <FileDown size={13} strokeWidth={2} />
            Export PDF
          </button>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-ink/10 text-xs font-semibold text-slate-400 hover:text-text-primary hover:bg-ink/5 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} strokeWidth={2} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <TabBtn
            key={t.key}
            active={activeTab === t.key}
            onClick={() => setActiveTab(t.key)}
            icon={t.icon}
            label={t.label}
            count={loading ? null : allData[t.key]?.length ?? 0}
          />
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <TallyLoader />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink/8 bg-ink/[0.03]">
            <ClipboardList size={24} className="text-text-disabled" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-slate-500">No {activeTab.toLowerCase()} requests.</p>
        </div>
      ) : (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-2"
        >
          <AnimatePresence mode="popLayout">
            {list.map((a) => (
              <ApprovalCard key={a._id} approval={a} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Export modal */}
      {showExport && (
        <ApprovalExportModal
          allData={allData}
          orgName={org?.name ?? "Organization"}
          orgCreatedAt={org?.createdAt ?? null}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
