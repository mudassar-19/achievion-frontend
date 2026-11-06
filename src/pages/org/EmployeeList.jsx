import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronLeft, ChevronRight,
  Loader2, Users, Trash2, ShieldOff, ShieldCheck, AlertTriangle, Lock,
} from "lucide-react";
import useOrgAuthStore from "@/stores/orgAuthStore";
import useUiStore from "@/stores/uiStore";
import api from "@/lib/api";

import TallyLoader from "@/components/ui/TallyLoader";
// ── Role enum for filter ──────────────────────────────────────────────────────
const ROLE_CATEGORIES = [
  { value: "", label: "All Roles" },
  { value: "Director", label: "Director" },
  { value: "Manager",  label: "Manager"  },
  { value: "Team Lead", label: "Team Lead" },
  { value: "Senior Developer",   label: "Senior Developer"   },
  { value: "Junior Developer",   label: "Junior Developer"   },
  { value: "Senior Designer",    label: "Senior Designer"    },
  { value: "Junior Designer",    label: "Junior Designer"    },
  { value: "Senior Tester",      label: "Senior Tester"      },
  { value: "Junior Tester",      label: "Junior Tester"      },
];

// ── Badge helpers ─────────────────────────────────────────────────────────────


function StatusBadge({ status }) {
  const cls = {
    active:           "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    suspended:        "bg-amber-500/15 text-amber-400 border-amber-500/25",
    under_review:     "bg-amber-500/15 text-amber-400 border-amber-500/25",
    pending_approval: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  };
  const label = {
    active:           "Active",
    suspended:        "Suspended",
    under_review:     "Under Review",
    pending_approval: "Pending Approval",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[14px] font-bold border ${cls[status] ?? cls.active}`}>
      {label[status] ?? status}
    </span>
  );
}

// ── Confirm Modal (shared) ────────────────────────────────────────────────────
function ConfirmModal({ icon: Icon, iconCls, iconBg, title, body, confirmLabel, confirmCls, onConfirm, onCancel, loading: isBusy }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-2xl border border-ink/10 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] p-6 flex flex-col gap-5 shadow-2xl"
      >
        <div className="flex flex-col gap-2">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${iconBg}`}>
            <Icon size={20} className={iconCls} strokeWidth={1.75} />
          </div>
          <h3 className="text-base font-black text-text-primary">{title}</h3>
          <p className="text-sm text-text-secondary leading-snug">{body}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-ink/10 text-sm font-semibold text-slate-400 hover:text-text-primary hover:bg-ink/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isBusy}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2 ${confirmCls}`}
          >
            {isBusy && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function InitialsAvatar({ name }) {
  const initials = name?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  return (
    <div className="h-8 w-8 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center shrink-0">
      <span className="text-[14px] font-black text-accent-text">{initials}</span>
    </div>
  );
}

// (DeleteModal replaced by shared ConfirmModal above)

// ── Select dropdown shared style ─────────────────────────────────────────────
const SELECT_CLS = "w-full rounded-xl border border-slate-600 bg-[#FFFFFF] py-2 px-3 text-sm text-text-primary outline-none focus:border-accent focus:shadow-card-hover transition-all";

export default function EmployeeList() {
  const orgToken = useOrgAuthStore((s) => s.orgToken);
  
  const addToast = useUiStore((s) => s.addToast);

  const [employees, setEmployees] = useState([]);
  const [meta,      setMeta]      = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  // Filters
  const [search, setSearch]   = useState("");
  const [role,   setRole]     = useState("");
  const [status, setStatus]   = useState("");
  const [page,   setPage]     = useState(1);

  // Mutation state
  const [actionLoading,    setActionLoading]    = useState({});
  const [deleteTarget,     setDeleteTarget]      = useState(null);
  const [suspendTarget,    setSuspendTarget]     = useState(null);
  const [reactivateTarget, setReactivateTarget] = useState(null);
  const [pendingRoleChange, setPendingRoleChange] = useState(null); // { emp, newRole }

  const authHeaders = { Authorization: `Bearer ${orgToken}` };

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search.trim()) params.set("search",  search.trim());
      if (role)          params.set("role",     role);
      if (status)        params.set("status",   status);

      const res = await api.get(`/api/org/employees?${params}`, { headers: authHeaders });
      setEmployees(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err.message ?? "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }, [orgToken, search, role, status, page]); // eslint-disable-line

  useEffect(() => { setTimeout(fetchEmployees, 0); }, [fetchEmployees]);

  // Reset page when filters change
  useEffect(() => { setTimeout(() => setPage(1), 0); }, [search, role, status]);

  // Execute suspend — sends request to Director, does NOT change status immediately
  async function executeSuspend(emp) {
    setActionLoading((p) => ({ ...p, [emp.id]: "status" }));
    try {
      await api.patch(`/api/org/employees/${emp.id}/status`, { status: "suspended" }, { headers: authHeaders });
      setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, pendingSuspension: true } : e));
      addToast({ type: "info", message: `Suspension request for ${emp.name} sent to Director for approval.` });
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Failed to send suspension request." });
    } finally {
      setActionLoading((p) => ({ ...p, [emp.id]: null }));
      setSuspendTarget(null);
    }
  }

  // Execute reactivate — sends request to Director, does NOT change status immediately
  async function executeReactivate(emp) {
    setActionLoading((p) => ({ ...p, [emp.id]: "status" }));
    try {
      await api.patch(`/api/org/employees/${emp.id}/status`, { status: "active" }, { headers: authHeaders });
      setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, pendingReactivation: true } : e));
      addToast({ type: "info", message: `Reactivation request for ${emp.name} sent to Director for approval.` });
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Failed to send reactivation request." });
    } finally {
      setActionLoading((p) => ({ ...p, [emp.id]: null }));
      setReactivateTarget(null);
    }
  }

  async function confirmRoleChange() {
    if (!pendingRoleChange) return;
    const { emp, newRole } = pendingRoleChange;
    setActionLoading((p) => ({ ...p, [emp.id]: "role" }));
    try {
      await api.patch(`/api/org/employees/${emp.id}/role`, { role: newRole }, { headers: authHeaders });
      if (isRankChange(emp.role, newRole)) {
        setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, pendingRole: newRole } : e));
        addToast({ type: "info", message: `Role change request for ${emp.name} sent to Director for approval.` });
      } else {
        setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, role: newRole } : e));
        addToast({ type: "success", message: `${emp.name}'s role updated to ${newRole}.` });
      }
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Failed to change role." });
    } finally {
      setActionLoading((p) => ({ ...p, [emp.id]: null }));
      setPendingRoleChange(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionLoading((p) => ({ ...p, [deleteTarget.id]: "delete" }));
    try {
      await api.delete(`/api/org/employees/${deleteTarget.id}`, { headers: authHeaders });
      if (deleteTarget.status === "suspended") {
        // Suspended employees are hard-deleted immediately — remove from list
        setEmployees((prev) => prev.filter((e) => e.id !== deleteTarget.id));
        addToast({ type: "success", message: `${deleteTarget.name} has been deleted.` });
      } else {
        // Active employees go through Director approval — stay in UI with pending state
        setEmployees((prev) => prev.map((e) => e.id === deleteTarget.id ? { ...e, pendingDeletion: true } : e));
        addToast({ type: "info", message: `Deletion request for ${deleteTarget.name} sent to Director for approval.` });
      }
      setDeleteTarget(null);
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Failed to delete employee." });
    } finally {
      setActionLoading((p) => ({ ...p, [deleteTarget?.id]: null }));
    }
  }

  // Role rank helpers — mirror backend ROLE_RANK
  const ROLE_RANK = {
    "Junior Developer": 1, "Junior Designer": 1, "Junior Tester": 1,
    Developer: 2, Designer: 2, Tester: 2,
    "Senior Developer": 3, "Senior Designer": 3, "Senior Tester": 3,
    "Team Lead": 4, Manager: 5, Director: 6,
  };
  
  // Any rank change (up or down) goes through Director approval
  function isRankChange(oldRole, newRole) {
    return (ROLE_RANK[oldRole] ?? 0) !== (ROLE_RANK[newRole] ?? 0);
  }

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 min-h-full">

      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent-text mb-1">Admin Panel</p>
        <h1 className="text-3xl font-black text-text-primary">Employees</h1>
        <p className="text-sm text-text-secondary mt-1">{meta.total} total members</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${SELECT_CLS} pl-8`}
          />
        </div>

        {/* Role filter */}
        <select value={role} onChange={(e) => setRole(e.target.value)} className={SELECT_CLS}>
          {ROLE_CATEGORIES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>

        {/* Status filter */}
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT_CLS}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="under_review">Under Review</option>
          <option value="pending_approval">Pending Approval</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-ink/8 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_2fr_2fr_1fr_auto] gap-3 px-5 py-3 border-b border-ink/[0.05] bg-ink/[0.02]">
          {["Name", "Email", "Role", "Status", "Actions"].map((h) => (
            <span key={h} className="text-[14px] font-bold uppercase tracking-widest text-text-disabled">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <TallyLoader />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-danger">{error}</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users size={32} className="text-text-disabled" strokeWidth={1.5} />
            <p className="text-sm text-slate-600">No employees found.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-ink/[0.04]">
            {employees.map((emp) => {
              const busy       = actionLoading[emp.id];
              const isDirector = emp.role === "Director";
              return (
                <div key={emp.id} className="grid grid-cols-[2fr_2fr_2fr_1fr_auto] gap-3 items-center px-5 py-3.5">
                  {/* Name + avatar + status dot */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <InitialsAvatar name={emp.name} />
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-text-primary truncate">{emp.name}</span>
                      {emp.status === "under_review" && (
                        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" title="Under review" />
                      )}
                      {emp.status === "pending_approval" && (
                        <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse shrink-0" title="Pending Director approval" />
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <span className="text-xs text-slate-400 truncate">{emp.email}</span>

                  {/* Role */}
                  <div>
                    {emp.status === "pending_approval" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[14px] font-bold border bg-orange-500/10 border-orange-500/20 text-orange-400">
                        {emp.role}
                      </span>
                    ) : isDirector ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[14px] font-bold border bg-violet-500/12 border-violet-500/25 text-violet-400">
                        <Lock size={9} strokeWidth={2.5} />
                        Director
                      </span>
                    ) : emp.pendingRole ? (
                      // Role change awaiting Director approval
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14px] font-bold text-text-primary">{emp.role}</span>
                        <span className="inline-flex items-center gap-1 text-[14px] font-bold text-amber-400">
                          <Lock size={8} strokeWidth={2.5} />
                          → {emp.pendingRole} pending
                        </span>
                      </div>
                    ) : busy === "role" ? (
                      <Loader2 size={14} className="animate-spin text-accent-text" />
                    ) : (
                      <select
                        value={emp.role}
                        onChange={(e) => {
                          const newRole = e.target.value;
                          if (!newRole || newRole === emp.role) return;
                          setPendingRoleChange({ emp, newRole });
                        }}
                        className="rounded-lg border border-slate-700 bg-transparent text-[14px] font-bold py-1 px-2 text-text-primary outline-none focus:border-accent cursor-pointer"
                        title="Change role"
                      >
                        {ROLE_CATEGORIES.filter((r) => r.value && r.value !== "Director").map((r) => (
                          <option key={r.value} value={r.value} className="bg-[#FFFFFF]">{r.label}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex flex-col gap-0.5">
                    <StatusBadge status={emp.status} />
                    {emp.pendingSuspension && (
                      <span className="inline-flex items-center gap-1 text-[14px] font-bold text-amber-400">
                        <Lock size={8} strokeWidth={2.5} />
                        → Suspension pending
                      </span>
                    )}
                    {emp.pendingReactivation && (
                      <span className="inline-flex items-center gap-1 text-[14px] font-bold text-emerald-400">
                        <Lock size={8} strokeWidth={2.5} />
                        → Reactivation pending
                      </span>
                    )}
                    {emp.pendingDeletion && (
                      <span className="inline-flex items-center gap-1 text-[14px] font-bold text-[#B01F17]">
                        <Lock size={8} strokeWidth={2.5} />
                        → Deletion pending
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {emp.status === "pending_approval" ? (
                      <span title="Awaiting Director approval" className="p-1.5 text-orange-700">
                        <Lock size={13} strokeWidth={2} />
                      </span>
                    ) : isDirector ? (
                      <span title="Director cannot be modified" className="p-1.5 text-slate-700">
                        <Lock size={13} strokeWidth={2} />
                      </span>
                    ) : (
                      <>
                        {/* Suspend / Activate */}
                        <button
                          onClick={() => emp.status === "active" ? setSuspendTarget(emp) : setReactivateTarget(emp)}
                          disabled={!!busy || !!emp.pendingSuspension || !!emp.pendingReactivation || !!emp.pendingDeletion}
                          title={
                            emp.pendingDeletion      ? "Deletion pending Director approval" :
                            emp.pendingSuspension    ? "Suspension pending Director approval" :
                            emp.pendingReactivation  ? "Reactivation pending Director approval" :
                            emp.status === "active"  ? "Request suspension" : "Request reactivation"
                          }
                          className={[
                            "p-1.5 rounded-lg transition-all border",
                            emp.status === "active"
                              ? "text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
                              : "text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10",
                            (busy || emp.pendingSuspension || emp.pendingReactivation || emp.pendingDeletion) ? "opacity-40 cursor-not-allowed" : "",
                          ].join(" ")}
                        >
                          {busy === "status"
                            ? <Loader2 size={13} className="animate-spin" />
                            : emp.status === "active"
                              ? <ShieldOff size={13} strokeWidth={2} />
                              : <ShieldCheck size={13} strokeWidth={2} />
                          }
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(emp)}
                          disabled={!!busy || !!emp.pendingDeletion}
                          title={emp.pendingDeletion ? "Deletion pending Director approval" : "Delete employee"}
                          className="p-1.5 rounded-lg border border-[#D1291F]/20 text-[#B01F17] hover:bg-[#D1291F]/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {busy === "delete"
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={13} strokeWidth={2} />
                          }
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-disabled">
            Page {meta.page} of {meta.totalPages} · {meta.total} total
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page <= 1}
              className="p-2 rounded-lg border border-ink/10 text-slate-400 hover:text-text-primary hover:border-ink/20 transition-all disabled:opacity-30"
            >
              <ChevronLeft size={15} strokeWidth={2} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={meta.page >= meta.totalPages}
              className="p-2 rounded-lg border border-ink/10 text-slate-400 hover:text-text-primary hover:border-ink/20 transition-all disabled:opacity-30"
            >
              <ChevronRight size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Suspend confirmation modal */}
      <AnimatePresence>
        {suspendTarget && (
          <ConfirmModal
            icon={ShieldOff}
            iconCls="text-amber-400"
            iconBg="bg-amber-500/10 border-amber-500/20"
            title="Request Suspension"
            body={<>Suspending <strong className="text-text-primary">{suspendTarget.name}</strong> requires Director approval. A request will be sent to the Director.</>}
            confirmLabel="Send for Approval"
            confirmCls="bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25"
            onConfirm={() => executeSuspend(suspendTarget)}
            onCancel={() => setSuspendTarget(null)}
            loading={!!actionLoading[suspendTarget?.id]}
          />
        )}
      </AnimatePresence>

      {/* Reactivation confirmation modal */}
      <AnimatePresence>
        {reactivateTarget && (
          <ConfirmModal
            icon={ShieldCheck}
            iconCls="text-emerald-400"
            iconBg="bg-emerald-500/10 border-emerald-500/20"
            title="Request Reactivation"
            body={<>Reactivating <strong className="text-text-primary">{reactivateTarget.name}</strong> requires Director approval. A request will be sent to the Director.</>}
            confirmLabel="Send for Approval"
            confirmCls="bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25"
            onConfirm={() => executeReactivate(reactivateTarget)}
            onCancel={() => setReactivateTarget(null)}
            loading={!!actionLoading[reactivateTarget?.id]}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmModal
            icon={AlertTriangle}
            iconCls="text-[#B01F17]"
            iconBg="bg-[#D1291F]/10 border-[#D1291F]/20"
            title={deleteTarget.status === "suspended" ? "Delete Employee?" : "Delete Active Employee?"}
            body={
              deleteTarget.status === "suspended"
                ? <><strong className="text-text-primary">{deleteTarget.name}</strong> will be permanently deleted. This cannot be undone.</>
                : <>Deleting an active employee requires Director approval. A request will be sent.<br /><strong className="text-text-primary">{deleteTarget.name}</strong></>
            }
            confirmLabel="Delete"
            confirmCls="bg-[#D1291F]/15 border border-[#D1291F]/25 text-[#B01F17] hover:bg-[#D1291F]/25"
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
            loading={!!actionLoading[deleteTarget?.id]}
          />
        )}
      </AnimatePresence>

      {/* Role change confirmation modal */}
      <AnimatePresence>
        {pendingRoleChange && (
          <ConfirmModal
            icon={AlertTriangle}
            iconCls="text-blue-400"
            iconBg="bg-blue-500/10 border-blue-500/20"
            title="Role Change Request"
            body={
              <>
                Change <strong className="text-text-primary">{pendingRoleChange.emp.name}</strong>'s role from{" "}
                <strong className="text-text-primary">{pendingRoleChange.emp.role}</strong> to{" "}
                <strong className="text-text-primary">{pendingRoleChange.newRole}</strong>?
                <span className="block mt-1.5 text-xs" style={{ color: isRankChange(pendingRoleChange.emp.role, pendingRoleChange.newRole) ? "#7A5200" : "#0E6A30" }}>
                  {isRankChange(pendingRoleChange.emp.role, pendingRoleChange.newRole)
                    ? "This change requires Director approval."
                    : "This change will be applied immediately."}
                </span>
              </>
            }
            confirmLabel="Confirm"
            confirmCls="bg-blue-500/15 border border-blue-500/25 text-blue-400 hover:bg-blue-500/25"
            onConfirm={confirmRoleChange}
            onCancel={() => setPendingRoleChange(null)}
            loading={!!actionLoading[pendingRoleChange?.emp?.id]}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
