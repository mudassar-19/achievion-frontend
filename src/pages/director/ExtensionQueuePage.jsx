import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ArrowLeftRight, Loader2, CalendarRange } from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton, { SkeletonLine } from "@/components/ui/Skeleton";
import useUiStore from "@/stores/uiStore";

function timeAgo(iso) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_BADGE = {
  pending:          { label: "Pending",         color: "#7A5200", bg: "#7A520015" },
  approved:         { label: "Approved",         color: "#0E6A30", bg: "#0E6A3015" },
  rejected:         { label: "Rejected",         color: "#B01F17", bg: "#B01F1715" },
  counter_proposed: { label: "Counter-proposed", color: "#4B2FC4", bg: "#4B2FC415" },
  auto_applied:     { label: "Auto-applied",     color: "#0E6A30", bg: "#0E6A3015" },
};

const TABS = ["pending", "history"];
const PAGE_SIZE = 25;

export default function ExtensionQueuePage() {
  const theme    = useRoleTheme();
  const addToast = useUiStore((s) => s.addToast);
  const [tab,     setTab]     = useState("pending");
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [showN,   setShowN]   = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [busy,    setBusy]    = useState({});
  const [counter, setCounter] = useState({});  // id → { open, days }
  const [rejectState, setRejectState] = useState({});  // id → { open, reason }

  const load = useCallback(async () => {
    setLoading(true); setError(null); setShowN(PAGE_SIZE);
    try {
      const data = await api.get(`/api/director/extensions?status=${tab}&limit=100`);
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
    } catch (e) {
      setError(e?.message ?? "Failed to load extensions.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function decide(id, action, extra = {}) {
    setBusy((b) => ({ ...b, [id]: action }));
    try {
      await api.patch(`/api/director/extensions/${id}`, { action, ...extra });
      addToast({ type: "success", message: `Extension ${action === "counter_propose" ? "counter-proposed" : action + "d"}.` });
      load();
    } catch (e) {
      addToast({ type: "error", message: e?.message ?? "Action failed." });
    } finally {
      setBusy((b) => ({ ...b, [id]: null }));
    }
  }

  if (loading) return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[1280px] mx-auto w-full">
      <SkeletonLine width="200px" height={32} />
      <div className="flex flex-col gap-3">{[0,1,2].map(i=><Skeleton key={i} height={100}/>)}</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[1280px] mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <PageHeader title="Extension Requests" subtitle={`${total} request${total !== 1 ? "s" : ""}`} />
      </motion.div>

      {error && <ErrorState message={error} onRetry={load} />}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-ink/[0.04] border border-ink/[0.06] w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${
              tab === t ? "bg-white dark:bg-white/10 shadow-sm text-text-primary" : "text-slate-500 hover:text-text-primary"
            }`}>
            {t === "history" ? "History" : "Pending"}
          </button>
        ))}
      </div>

      {!error && items.length === 0 && (
        <EmptyState heading={`No ${tab} extension requests.`} body="Extension requests from managers will appear here." action={{ label: "Refresh", onClick: load }} />
      )}

      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {items.slice(0, showN).map((ext) => {
            const st = STATUS_BADGE[ext.status] ?? STATUS_BADGE.pending;
            const isB = !!busy[ext.id ?? ext._id];
            const id  = ext.id ?? ext._id;
            const ctr = counter[id] ?? { open: false, days: "" };
            return (
              <motion.div key={id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl border border-ink/[0.08] glass-panel p-5 flex flex-col gap-3">

                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border"
                      style={{ color: st.color, background: st.bg, borderColor: st.color + "30" }}>
                      <CalendarRange size={10} strokeWidth={2.5} /> {st.label}
                    </span>
                    <p className="text-sm font-bold text-text-primary mt-1">{ext.taskId?.title ?? "Task"}</p>
                    <p className="text-xs text-slate-500">
                      {ext.requestedBy?.name} · {ext.requestedBy?.role} · requested +{ext.requestedDays}d
                    </p>
                    {ext.originalDeadline && (
                      <p className="text-xs text-slate-400">Original deadline: {fmt(ext.originalDeadline)}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{timeAgo(ext.createdAt)}</span>
                </div>

                {ext.reason && (
                  <p className="text-xs text-slate-500 italic border-l-2 pl-3" style={{ borderColor: theme.accent + "60" }}>
                    "{ext.reason}"
                  </p>
                )}

                {ext.status === "pending" && (
                  <>
                    {!ctr.open && !rejectState[id]?.open && (
                      <div className="flex gap-2 pt-1 border-t border-ink/[0.05]">
                        <button onClick={() => decide(id, "approve")} disabled={isB}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm font-bold text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors">
                          {busy[id] === "approve" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                          Approve
                        </button>
                        <button onClick={() => setRejectState((r) => ({ ...r, [id]: { open: true, reason: "" } }))} disabled={isB}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm font-bold text-rose-700 hover:bg-rose-500/20 disabled:opacity-40 transition-colors"
                          aria-label="Reject extension">
                          <XCircle size={13} /> Reject
                        </button>
                        <button onClick={() => setCounter((c) => ({ ...c, [id]: { open: true, days: "" } }))} disabled={isB}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm font-bold text-violet-700 hover:bg-violet-500/20 disabled:opacity-40 transition-colors">
                          <ArrowLeftRight size={13} /> Counter
                        </button>
                      </div>
                    )}
                    {ctr.open && (
                      <div className="flex flex-col gap-2 pt-1 border-t border-ink/[0.05]">
                        <p className="text-xs font-semibold text-slate-500">Counter-propose days:</p>
                        <div className="flex gap-2">
                          <input type="number" min={1} max={365} placeholder="Days"
                            value={ctr.days}
                            onChange={(e) => setCounter((c) => ({ ...c, [id]: { ...c[id], days: e.target.value } }))}
                            className="flex-1 px-3 py-2 rounded-xl border border-ink/[0.12] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30" />
                          <button onClick={() => { decide(id, "counter_propose", { counterDays: Number(ctr.days) }); setCounter((c) => ({ ...c, [id]: { open: false, days: "" } })); }}
                            disabled={!ctr.days || isB}
                            className="px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-sm font-bold text-violet-700 hover:bg-violet-500/20 disabled:opacity-40 transition-colors">
                            Send
                          </button>
                          <button onClick={() => setCounter((c) => ({ ...c, [id]: { open: false, days: "" } }))}
                            className="px-3 py-2 rounded-xl border border-ink/[0.08] text-sm text-slate-500 hover:bg-ink/[0.04] transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {rejectState[id] && rejectState[id].open && (
                      <div className="flex flex-col gap-2 pt-1 border-t border-ink/[0.05]" role="form" aria-label="Reject extension">
                        <p className="text-xs font-semibold text-rose-600">Reason for rejection (required, min 10 chars):</p>
                        <textarea
                          value={rejectState[id].reason ?? ""}
                          onChange={(e) => setRejectState((r) => ({ ...r, [id]: { ...r[id], reason: e.target.value } }))}
                          rows={3}
                          aria-label="Rejection reason"
                          className="px-3 py-2 rounded-xl border border-rose-300/60 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 resize-none"
                          placeholder="Explain why this extension is rejected…"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const reason = rejectState[id].reason?.trim() ?? "";
                              if (reason.length < 10) return;
                              decide(id, "reject", { directorNote: reason });
                              setRejectState((r2) => ({ ...r2, [id]: { open: false, reason: "" } }));
                            }}
                            disabled={!rejectState[id].reason || rejectState[id].reason.trim().length < 10 || isB}
                            className="flex-1 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm font-bold text-rose-700 hover:bg-rose-500/20 disabled:opacity-40 transition-colors">
                            Reject extension
                          </button>
                          <button onClick={() => setRejectState((r2) => ({ ...r2, [id]: { open: false, reason: "" } }))}
                            className="px-3 py-2 rounded-xl border border-ink/[0.08] text-sm text-slate-500 hover:bg-ink/[0.04] transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {ext.directorNote && (
                  <p className="text-xs text-slate-500 pt-1 border-t border-ink/[0.05]">
                    Director note: {ext.directorNote}
                  </p>
                )}
                {ext.counterDays && (
                  <p className="text-xs font-semibold text-violet-600">Counter-proposed: +{ext.counterDays}d</p>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {items.length > showN && (
        <button
          onClick={() => setShowN((n) => n + PAGE_SIZE)}
          className="self-center px-5 py-2 rounded-xl border border-ink/[0.12] text-xs font-bold text-slate-600 hover:bg-ink/[0.04] transition-colors min-h-[36px]">
          Load More ({items.length - showN} remaining)
        </button>
      )}
    </div>
  );
}
