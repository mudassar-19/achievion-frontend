import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox, MessageSquare, ChevronRight, Loader2, Send,
  ArrowUpCircle, CheckCircle2, RefreshCw, Clock,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton, { SkeletonLine } from "@/components/ui/Skeleton";
import useUiStore from "@/stores/uiStore";
import { useRoleTheme } from "@/utils/roleTheme";

function timeAgo(iso) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const STATUS_META = {
  open:               { label: "Open",              color: "#7A5200", bg: "#7A520015" },
  in_progress:        { label: "In Progress",       color: "#4B2FC4", bg: "#4B2FC415" },
  awaiting_response:  { label: "Awaiting Response", color: "#0369A1", bg: "#0369A115" },
  resolved:           { label: "Resolved",          color: "#047857", bg: "#04785715" },
  escalated:          { label: "Escalated",         color: "#B01F17", bg: "#B01F1715" },
  closed:             { label: "Closed",            color: "#0E6A30", bg: "#0E6A3015" },
};

const PRIORITY_COLOR = { low: "#64748b", medium: "#7A5200", high: "#B01F17", critical: "#9b1c1c" };
const TABS = ["open", "in_progress", "awaiting_response", "resolved", "escalated", "closed", "all"];
const TAB_LABELS = {
  open: "Open", in_progress: "In Progress", awaiting_response: "Awaiting",
  resolved: "Resolved", escalated: "Escalated", closed: "Closed", all: "All",
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? STATUS_META.open;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border"
      style={{ color: m.color, background: m.bg, borderColor: m.color + "30" }}>
      {m.label}
    </span>
  );
}

// ── Thread panel ──────────────────────────────────────────────────────────────
function ThreadPanel({ reportId, onClose, onUpdated }) {
  const addToast = useUiStore((s) => s.addToast);
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [reply,     setReply]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [acting,    setActing]    = useState(null);
  const [resolution, setResolution] = useState("");

  const loadThread = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const d = await api.get(`/api/director/voice/${reportId}`);
      setData(d);
    } catch (e) {
      setError(e?.message ?? "Failed to load thread.");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => { loadThread(); }, [loadThread]);

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/api/director/voice/${reportId}/message`, { content: reply.trim() });
      setReply("");
      loadThread();
      onUpdated?.();
    } catch (e) {
      addToast({ type: "error", message: e?.message ?? "Send failed." });
    } finally {
      setSending(false);
    }
  }

  async function doAction(action) {
    if (action === "close" && !resolution.trim()) {
      addToast({ type: "error", message: "Resolution note is required to close." });
      return;
    }
    setActing(action);
    try {
      await api.patch(`/api/director/voice/${reportId}`, {
        action,
        ...(action === "close" ? { resolution: resolution.trim() } : {}),
      });
      addToast({ type: "success", message: `Report ${action === "close" ? "closed" : "escalated"}.` });
      loadThread();
      onUpdated?.();
    } catch (e) {
      addToast({ type: "error", message: e?.message ?? "Action failed." });
    } finally {
      setActing(null);
    }
  }

  if (loading) return (
    <div className="flex flex-col gap-4 p-6">
      <SkeletonLine width="180px" height={24} />
      <Skeleton height={80} />
      <Skeleton height={80} />
    </div>
  );

  if (error) return <ErrorState message={error} onRetry={loadThread} />;

  const { report, messages } = data ?? {};
  const canAct = report && !["closed"].includes(report.status);
  const ticketId = report?._id ? `#${report._id.toString().slice(-6).toUpperCase()}` : "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-ink/[0.06]">
        <button onClick={onClose} aria-label="Close ticket" className="shrink-0 mt-0.5 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronRight size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-mono font-bold text-slate-400">{ticketId}</span>
            <span className="text-[11px] text-slate-300">·</span>
            <span className="text-[11px] text-slate-400 capitalize">{report?.category}</span>
          </div>
          <p className="text-sm font-bold text-text-primary truncate">{report?.subject}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusBadge status={report?.status} />
            {report?.priority && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ color: PRIORITY_COLOR[report.priority], background: PRIORITY_COLOR[report.priority] + "18" }}>
                {report.priority.toUpperCase()}
              </span>
            )}
          </div>
          {report?.reporter && !report?.anonymous && (
            <p className="text-[11px] text-slate-400 mt-1">
              Submitted by: <span className="font-semibold">{report.reporter.name}</span> ({report.reporter.role})
            </p>
          )}
          {report?.anonymous && (
            <p className="text-[11px] text-slate-400 mt-1 italic">Anonymous submission</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="px-5 py-3 bg-ink/[0.02] border-b border-ink/[0.04]">
        <p className="text-xs text-slate-600 leading-relaxed">{report?.description}</p>
        {report?.target && (
          <p className="text-[11px] text-slate-400 mt-1">
            Regarding: {report.target.name} ({report.target.role})
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 min-h-0">
        {messages?.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center mt-4">No replies yet.</p>
        )}
        {(messages ?? []).map((msg) => {
          const isDir = msg.senderRole === "Director";
          return (
            <div key={msg._id} className={`flex flex-col gap-1 ${isDir ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                isDir
                  ? "bg-[#4B2FC4]/10 text-[#4B2FC4] rounded-br-sm"
                  : "bg-ink/[0.06] text-text-primary rounded-bl-sm"
              }`}>
                {msg.content}
              </div>
              <p className="text-[10px] text-slate-400 px-1">
                {msg.senderId?.name ?? "Unknown"} · {timeAgo(msg.createdAt)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {canAct && (
        <div className="px-5 py-4 border-t border-ink/[0.06] flex flex-col gap-3">
          {/* Reply */}
          <div className="flex gap-2">
            <input
              aria-label="Reply message"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
              placeholder="Reply to ticket…"
              className="flex-1 px-3 py-2 rounded-xl border border-ink/[0.12] bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-[#4B2FC4]/20"
            />
            <button onClick={sendReply} aria-label="Send reply" disabled={sending || !reply.trim()}
              className="p-2 rounded-xl bg-[#4B2FC4]/10 border border-[#4B2FC4]/20 text-[#4B2FC4] hover:bg-[#4B2FC4]/20 disabled:opacity-40 transition-colors">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>

          {/* Status quick-actions */}
          <div className="flex flex-wrap gap-2">
            {report?.status === "open" && (
              <button onClick={() => doAction("set_in_progress")} disabled={!!acting}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#4B2FC4]/10 border border-[#4B2FC4]/20 text-xs font-bold text-[#4B2FC4] hover:bg-[#4B2FC4]/20 disabled:opacity-40 transition-colors">
                {acting === "set_in_progress" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                In Progress
              </button>
            )}
            {["open", "in_progress"].includes(report?.status) && (
              <button onClick={() => doAction("set_awaiting")} disabled={!!acting}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs font-bold text-sky-700 hover:bg-sky-500/20 disabled:opacity-40 transition-colors">
                {acting === "set_awaiting" ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
                Awaiting Response
              </button>
            )}
            {["in_progress", "awaiting_response"].includes(report?.status) && (
              <button onClick={() => doAction("resolve")} disabled={!!acting}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors">
                {acting === "resolve" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Mark Resolved
              </button>
            )}
            {!["escalated"].includes(report?.status) && (
              <button onClick={() => doAction("escalate")} disabled={!!acting}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-700 hover:bg-rose-500/20 disabled:opacity-40 transition-colors">
                {acting === "escalate" ? <Loader2 size={12} className="animate-spin" /> : <ArrowUpCircle size={12} />}
                Escalate
              </button>
            )}
          </div>

          {/* Close with resolution */}
          {["resolved", "escalated"].includes(report?.status) && (
            <div className="flex flex-col gap-2">
              <input
                aria-label="Resolution note"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Resolution note (required to close ticket)"
                className="px-3 py-2 rounded-xl border border-ink/[0.12] bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
              />
              <button onClick={() => doAction("close")} disabled={!!acting || !resolution.trim()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors">
                {acting === "close" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Close Ticket
              </button>
            </div>
          )}
        </div>
      )}
      {report?.resolution && (
        <div className="px-5 py-3 bg-emerald-500/5 border-t border-emerald-500/20">
          <p className="text-[11px] text-emerald-700 font-semibold">Resolution:</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">{report.resolution}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VoiceInboxPage() {
  const theme    = useRoleTheme();
  const location = useLocation();
  const [tab,     setTab]     = useState("open");
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [selected, setSelected] = useState(
    // DIR-05.3: auto-open thread when navigated from approval escalation link
    location.state?.openThread ?? null
  );

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const d = await api.get(`/api/director/voice?status=${tab}&limit=50`);
      setItems(d?.items ?? []);
      setTotal(d?.total ?? 0);
    } catch (e) {
      setError(e?.message ?? "Failed to load voice reports.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[1280px] mx-auto w-full">
      <SkeletonLine width="160px" height={32} />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        <div className="flex flex-col gap-3">{[0,1,2].map(i=><Skeleton key={i} height={90}/>)}</div>
        <Skeleton height={400} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[1280px] mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <PageHeader title="Feedback & Complaints" subtitle={`${total} ticket${total !== 1 ? "s" : ""}`} />
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-ink/[0.04] border border-ink/[0.06] w-fit overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => { setTab(t); setSelected(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === t ? "bg-white dark:bg-white/10 shadow-sm text-text-primary" : "text-slate-500 hover:text-text-primary"
            }`}>
            {TAB_LABELS[t] ?? t}
          </button>
        ))}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 min-h-[500px]">
        {/* List */}
        <div className="flex flex-col gap-3">
          {!error && items.length === 0 && (
            <EmptyState heading="No tickets." body="Feedback and complaints submitted by team members will appear here." action={{ label: "Refresh", onClick: load }} />
          )}
          <AnimatePresence initial={false}>
            {items.map((r) => (
              <motion.button
                key={r.id}
                onClick={() => setSelected(r.id)}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`text-left rounded-2xl border p-4 flex flex-col gap-2 transition-colors ${
                  selected === r.id
                    ? "border-[#4B2FC4]/30 bg-[#4B2FC4]/5"
                    : "border-ink/[0.08] glass-panel hover:border-ink/[0.14]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        #{r.id?.toString().slice(-6).toUpperCase()}
                      </span>
                      <StatusBadge status={r.status} />
                      <span className="text-[11px] text-slate-400 capitalize">{r.category}</span>
                      {r.priority && (
                        <span className="text-[11px] font-bold" style={{ color: PRIORITY_COLOR[r.priority] }}>
                          {r.priority.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-text-primary truncate">{r.subject}</p>
                    <p className="text-[11px] text-slate-400">
                      {r.anonymous ? "Anonymous" : (r.reporter?.name ?? "—")}
                      {r.target ? ` → re: ${r.target.name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400">{timeAgo(r.createdAt)}</span>
                    <MessageSquare size={14} className="text-slate-400" />
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Thread */}
        <div className="rounded-2xl border border-ink/[0.08] bg-white/60 dark:bg-white/5 overflow-hidden flex flex-col min-h-[400px]">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                <ThreadPanel reportId={selected} onClose={() => setSelected(null)} onUpdated={load} />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full gap-3 px-8 py-12 text-center">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: `${theme.accent}18` }}>
                  <Inbox size={22} style={{ color: theme.accent }} strokeWidth={1.5} />
                </div>
                <p className="text-sm font-bold text-text-primary">Select a ticket</p>
                <p className="text-xs text-slate-400">Click a ticket to view details and respond.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
