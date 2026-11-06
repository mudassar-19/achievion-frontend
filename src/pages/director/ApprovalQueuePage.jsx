import { useEffect, useState, useCallback, useRef } from "react";
import { DIRECTOR_FEATURES as DF } from "@/lib/directorFeatures";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck, CheckCircle2, XCircle, Clock,
  Loader2, UserPlus, UserMinus, ShieldOff, ShieldCheck, RefreshCw, MessageSquare, AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import useAuthStore from "@/stores/authStore";
import useUiStore from "@/stores/uiStore";
import ConfirmModal from "@/components/ui/ConfirmModal";
import PageHeader from "@/components/ui/PageHeader";
import socket from "@/utils/socket";
import { useRoleTheme } from "@/utils/roleTheme";
import Skeleton, { SkeletonLine } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return "—";
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)    return "just now";
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ── Type config ───────────────────────────────────────────────────────────────
const ACCOUNT_META = {
  CREATE_EMPLOYEE:     { label: "Create Employee",     icon: UserPlus,    color: "text-emerald-700", bg: "bg-emerald-500/10 border-emerald-500/20" },
  DELETE_EMPLOYEE:     { label: "Delete Employee",     icon: UserMinus,   color: "text-rose-700",    bg: "bg-rose-500/10 border-rose-500/20" },
  SUSPEND_EMPLOYEE:    { label: "Suspend Employee",    icon: ShieldOff,   color: "text-amber-700",   bg: "bg-amber-500/10 border-amber-500/20" },
  REACTIVATE_EMPLOYEE: { label: "Reactivate Employee", icon: ShieldCheck, color: "text-emerald-700", bg: "bg-emerald-500/10 border-emerald-500/20" },
  ROLE_CHANGE:         { label: "Role Change",         icon: RefreshCw,   color: "text-[#4B2FC4]",   bg: "bg-[#4B2FC4]/10 border-[#4B2FC4]/20" },
};

function ActionBadge({ type }) {
  const meta = ACCOUNT_META[type] ?? { label: type, color: "text-slate-500", bg: "bg-ink/5 border-ink/10", icon: ClipboardCheck };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[14px] font-bold uppercase tracking-wide border w-fit ${meta.bg} ${meta.color}`}>
      <Icon size={10} strokeWidth={2.5}/>
      {meta.label}
    </span>
  );
}

function accountDesc(a) {
  const name = a.targetEmployeeId?.name ?? a.payload?.name ?? "—";
  switch (a.actionType) {
    case "CREATE_EMPLOYEE":  return `Creating account for ${a.payload?.name ?? "—"} (${a.payload?.role ?? ""})`;
    case "DELETE_EMPLOYEE":  return `Delete ${name}${a.payload?.reason ? ` — "${a.payload.reason}"` : ""}`;
    case "SUSPEND_EMPLOYEE": return `Suspend ${name}`;
    case "REACTIVATE_EMPLOYEE": return `Reactivate ${name}`;
    case "ROLE_CHANGE": {
      const from = a.payload?.oldRole ?? a.payload?.previousRole;
      const to   = a.payload?.newRole;
      return `${name}: ${from ?? "Current role unknown"} → ${to ?? "Unknown role"}`;
    }
    default: return "—";
  }
}

// ── Inline Reject Form ─────────────────────────────────────────────────────────
function RejectForm({ onConfirm, onCancel, busy }) {
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= 10;
  return (
    <div className="flex flex-col gap-2 border-t border-ink/[0.06] pt-3 mt-3">
      <label htmlFor="reject-reason" className="text-xs font-semibold text-slate-500">
        Reason <span className="text-rose-500">*</span> <span className="text-slate-600 font-normal">(min 10 characters)</span>
      </label>
      <textarea
        id="reject-reason"
        autoFocus
        rows={2}
        value={reason}
        onChange={e=>setReason(e.target.value)}
        placeholder="Explain why this request is being rejected…"
        className="w-full rounded-xl border border-ink/[0.12] bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-slate-500 focus:outline-none focus:border-rose-400/50 transition-colors resize-none"
      />
      {reason.trim().length > 0 && !valid && (
        <p className="text-xs text-rose-500" role="alert">{10 - reason.trim().length} more characters needed</p>
      )}
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 px-3 py-2 rounded-xl border border-ink/10 text-xs font-semibold text-slate-500 hover:text-text-primary hover:bg-ink/5 transition-colors">
          Cancel
        </button>
        <button onClick={()=>valid && onConfirm(reason.trim())} disabled={!valid || busy}
          className="flex-1 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-700 hover:bg-rose-500/20 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
          {busy && <Loader2 size={12} className="animate-spin"/>}
          Reject
        </button>
      </div>
    </div>
  );
}

// ── Animation variants ────────────────────────────────────────────────────────
const rowV = {
  hidden: {opacity:0,y:14},
  show:   {opacity:1,y:0, transition:{duration:0.28,ease:[0.4,0,0.2,1]}},
  exit:   {opacity:0,x:60,transition:{duration:0.2}},
};
const listV = { hidden:{}, show:{transition:{staggerChildren:0.05}} };

// ── Skeleton ──────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <>
      {Array.from({length:3}).map((_,i)=>(
        <div key={i} className="rounded-2xl border border-ink/[0.07] p-5 flex flex-col gap-4">
          <div className="flex justify-between">
            <Skeleton className="h-7 w-36"/>
            <Skeleton className="h-4 w-20"/>
          </div>
          <SkeletonLine width="60%" height={13}/>
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-xl"/>
            <Skeleton className="h-10 flex-1 rounded-xl"/>
          </div>
        </div>
      ))}
    </>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────
function SectionHeading({ label, count }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">{label}</p>
      {count > 0 && (
        <span className="text-[14px] font-black px-2 py-0.5 rounded-full bg-[#4B2FC4]/10 text-[#4B2FC4]">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-ink/[0.06]"/>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ApprovalQueuePage() {
  const theme    = useRoleTheme();
  const token    = useAuthStore(s=>s.token);
  const addToast = useUiStore(s=>s.addToast);

  const [accounts,    setAccounts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [busy,        setBusy]        = useState({});
  const [rejectOpen,  setRejectOpen]  = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Pending actions with Undo (id → setTimeout handle)
  const pendingActions = useRef({});

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const accs = await api.get("/api/approvals");
      setAccounts(accs?.approvals ?? []);
    } catch(e) {
      setError(e?.message ?? "Failed to load approvals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{ load(); }, [load]);

  // Socket: re-fetch when new approval request arrives
  useEffect(() => {
    function onNew() {
      api.get("/api/approvals").then(d=>setAccounts(d?.approvals??[])).catch(()=>{});
    }
    socket.on("approval:new", onNew);
    return () => socket.off("approval:new", onNew);
  }, []);

  // Flush all pending decisions on unmount or page-unload so no decision is silently lost
  useEffect(() => {
    function flushAll() {
      Object.values(pendingActions.current).forEach(({handle, commit}) => {
        clearTimeout(handle);
        commit();
      });
      pendingActions.current = {};
    }
    window.addEventListener("beforeunload", flushAll);
    return () => {
      window.removeEventListener("beforeunload", flushAll);
      flushAll(); // flush on unmount (route change)
    };
  }, []);

  // ── Commit helpers (called after Undo window) ─────────────────────────────
  async function commitApproveAccount(acc) {
    try {
      await api.post(`/api/approvals/${acc._id}/approve`, {}, {headers:{Authorization:`Bearer ${token}`}});
    } catch(e) {
      addToast({type:"error", message:e?.message??"Approval failed."});
      setAccounts(prev=>[acc,...prev]);
    }
  }
  async function commitRejectAccount(acc, reason) {
    try {
      await api.post(`/api/approvals/${acc._id}/reject`, {reason}, {headers:{Authorization:`Bearer ${token}`}});
    } catch(e) {
      addToast({type:"error", message:e?.message??"Rejection failed."});
      setAccounts(prev=>[acc,...prev]);
    }
  }

  // ── Optimistic remove + Undo toast (10s window from ToastContainer) ────────
  function withUndo(id, optimisticRemove, commit, undoRestore, label) {
    optimisticRemove();
    let committed = false;
    const handle = setTimeout(() => {
      committed = true;
      delete pendingActions.current[id];
      commit();
    }, 10000);
    // Store both handle and commit so flushAll can commit immediately on unmount/beforeunload
    pendingActions.current[id] = { handle, commit };
    addToast({
      type:"info",
      message: label,
      undoAction: () => {
        if (!committed) {
          clearTimeout(handle);
          delete pendingActions.current[id];
          undoRestore();
        }
      },
    });
  }

  // ── Account request actions ───────────────────────────────────────────────
  function handleApproveAcc(acc) {
    if (acc.actionType === 'DELETE_EMPLOYEE') {
      setDeleteConfirm(acc);
      return;
    }
    const key = `acc-${acc._id}`;
    if (busy[key]) return;
    setBusy(b=>({...b,[key]:"approve"}));
    withUndo(
      key,
      () => setAccounts(prev=>prev.filter(a=>a._id!==acc._id)),
      () => commitApproveAccount(acc),
      () => { setAccounts(prev=>[acc,...prev]); setBusy(b=>({...b,[key]:false})); },
      `${accountDesc(acc)} — approved.`
    );
    setBusy(b=>({...b,[key]:false}));
  }

  async function handleDeleteConfirmed() {
    const acc = deleteConfirm;
    if (!acc) return;
    setDeleteConfirm(null);
    const key = `acc-${acc._id}`;
    setBusy(b=>({...b,[key]:"approve"}));
    setAccounts(prev=>prev.filter(a=>a._id!==acc._id));
    try {
      await commitApproveAccount(acc);
    } finally {
      setBusy(b=>({...b,[key]:false}));
    }
  }

  function handleRejectAcc(acc, reason) {
    const key = `acc-${acc._id}`;
    setBusy(b=>({...b,[key]:"reject"}));
    withUndo(
      key,
      () => { setAccounts(prev=>prev.filter(a=>a._id!==acc._id)); setRejectOpen(r=>({...r,[key]:false})); },
      () => commitRejectAccount(acc, reason),
      () => { setAccounts(prev=>[acc,...prev]); setBusy(b=>({...b,[key]:false})); },
      `${accountDesc(acc)} — rejected.`
    );
    setBusy(b=>({...b,[key]:false}));
  }

  const totalPending = accounts.length;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[1280px] mx-auto w-full">
        <div className="flex flex-col gap-1">
          <SkeletonLine width="160px" height={32}/>
          <SkeletonLine width="100px" height={14} className="mt-2"/>
        </div>
        <CardSkeleton/>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[1280px] mx-auto w-full">
        <PageHeader title="Approvals" />
        <ErrorState message={error} onRetry={load}/>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[1280px] mx-auto w-full">

      {/* Header */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.34}}>
        <PageHeader
          title="Approvals"
          subtitle={`${totalPending} pending decision${totalPending !== 1 ? "s" : ""}`}
        >
          <AnimatePresence>
            {totalPending > 0 && (
              <motion.span key="badge" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}
                className="flex h-7 min-w-[1.75rem] px-1 items-center justify-center rounded-full text-white text-xs font-black"
                style={{background:theme.accent}}>
                {totalPending}
              </motion.span>
            )}
          </AnimatePresence>
        </PageHeader>
      </motion.div>

      {/* Empty state */}
      {totalPending === 0 && (
        <EmptyState
          heading="No approvals waiting."
          body="Account requests from managers will appear here."
          action={{label:"Refresh", onClick:load}}
        />
      )}


      {/* ── Delete account confirmation (irreversible — no Undo toast) ─── */}
      <ConfirmModal
        open={!!deleteConfirm}
        onClose={()=>setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirmed}
        title={`Delete ${deleteConfirm?.targetEmployeeId?.name ?? deleteConfirm?.payload?.name ?? "this account"}'s account?`}
        body="This will permanently delete the employee's account. This action cannot be undone."
        confirmLabel="Delete account"
        cancelLabel="Keep account"
        destructive
      />

      {/* ── Account Requests ── */}
      {accounts.length > 0 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1}}
          className="flex flex-col gap-4">
          <SectionHeading label="Account Requests" count={accounts.length}/>
          <motion.div variants={listV} initial="hidden" animate="show" className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {accounts.map(acc => {
                const key = `acc-${acc._id}`;
                const isRejectOpen = rejectOpen[key];
                const isBusy = !!busy[key];
                return (
                  <motion.div key={acc._id} variants={rowV} layout exit="exit"
                    className="rounded-2xl border border-ink/[0.08] glass-panel p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex flex-col gap-1.5">
                        <ActionBadge type={acc.actionType}/>
                        <p className="text-sm font-semibold text-text-primary leading-snug">{accountDesc(acc)}</p>
                        {acc.actionType==='CREATE_EMPLOYEE' && acc.payload?.email && (
                          <p className="text-xs text-slate-500">{acc.payload.email}</p>
                        )}
                        {/* DIR-05.3: escalation → voice thread link */}
                        {DF.voice && acc.payload?.voiceReportId && (
                          <Link
                            to={`/director/voice`}
                            state={{ openThread: acc.payload.voiceReportId }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#4B2FC4] hover:underline mt-0.5 min-h-[32px]"
                          >
                            <MessageSquare size={12} strokeWidth={2}/>
                            View Voice Thread
                          </Link>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={10} strokeWidth={2}/>{timeAgo(acc.createdAt)}
                        </span>
                        {acc.requestedBy && (
                          <span className="text-[14px] text-slate-500">
                            by {acc.requestedBy.name} ({acc.requestedBy.role})
                          </span>
                        )}
                      </div>
                    </div>
                    {!isRejectOpen && (
                      <div className="flex flex-col gap-2 pt-2 border-t border-ink/[0.05]">
                        {acc.actionType === 'DELETE_EMPLOYEE' && (
                          <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                            <AlertTriangle size={11} strokeWidth={2}/> Approving this will permanently delete the employee account.
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button onClick={()=>handleApproveAcc(acc)} disabled={isBusy}
                            className={[
                              "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors disabled:opacity-40",
                              acc.actionType === 'DELETE_EMPLOYEE'
                                ? "bg-rose-500/10 border-rose-500/25 text-rose-700 hover:bg-rose-500/20"
                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20",
                            ].join(" ")}>
                            {busy[key]==='approve' ? <Loader2 size={12} className="animate-spin"/> : <CheckCircle2 size={12} strokeWidth={2}/>}
                            {acc.actionType === 'DELETE_EMPLOYEE' ? 'Delete Account' : 'Approve'}
                          </button>
                          <button onClick={()=>setRejectOpen(r=>({...r,[key]:true}))} disabled={isBusy}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink/[0.03] border border-ink/[0.08] text-xs font-bold text-slate-500 hover:bg-ink/[0.07] transition-colors disabled:opacity-40">
                            <XCircle size={12} strokeWidth={2}/>
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                    {isRejectOpen && (
                      <RejectForm
                        onConfirm={reason=>handleRejectAcc(acc,reason)}
                        onCancel={()=>setRejectOpen(r=>({...r,[key]:false}))}
                        busy={busy[key]==='reject'}
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
