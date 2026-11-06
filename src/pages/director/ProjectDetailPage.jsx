// DIR-02.2: Project detail — read-only (status, deadline, manager, progress, risks, extensions, workload)
// D-027: NO individual performance scores.
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FolderOpen, ArrowLeft, User, Calendar, AlertTriangle, RefreshCw, Clock } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import { SkeletonLine } from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";

const STATUS_COLOR = {
  Active:    "bg-emerald-500/10 text-emerald-700",
  Delayed:   "bg-rose-500/10 text-rose-700",
  "On Hold": "bg-amber-500/10 text-amber-700",
  Planning:  "bg-[#4B2FC4]/10 text-[#4B2FC4]",
  Completed: "bg-emerald-500/10 text-emerald-700",
};

function ProgressBar({ pct }) {
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-[#4B2FC4]" : "bg-amber-500";
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2 rounded-full bg-ink/[0.08] overflow-hidden">
        <motion.div className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }} />
      </div>
      <span className="text-xs font-bold tabular-nums text-text-secondary w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get(`/api/director/projects/${id}`)
      .then(d => setData(d))
      .catch(e => setError(e?.message ?? "Failed to load project."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="px-4 sm:px-8 py-8 max-w-[960px] mx-auto flex flex-col gap-6">
      <SkeletonLine width="200px" height={20} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-ink/[0.04] animate-pulse" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="px-4 sm:px-8 py-8"><ErrorState message={error} /></div>
  );

  if (!data) return null;

  const deadlineStr = data.deadline ? new Date(data.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const statusCls = STATUS_COLOR[data.status] ?? "bg-ink/[0.08] text-text-secondary";

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[960px] mx-auto w-full">
      <Link to="/director/projects" aria-label="Back to Portfolio"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-text-primary hover:bg-ink/[0.04] transition-colors min-h-[32px] w-fit">
        <ArrowLeft size={14} /> Portfolio
      </Link>

      <PageHeader
        title={data.title}
        subtitle={data.description || data.category}
        icon={<FolderOpen size={20} />}
        badge={<span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusCls}`}>{data.status}</span>}
      />

      {/* Meta row */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-ink/[0.08] glass-panel p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-400 flex items-center gap-1"><User size={11} /> Manager</span>
          <p className="text-sm font-bold text-text-primary">{data.manager?.name ?? "—"}</p>
        </div>
        <div className="rounded-2xl border border-ink/[0.08] glass-panel p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={11} /> Deadline</span>
          <p className="text-sm font-bold text-text-primary">{deadlineStr}</p>
        </div>
        <div className="rounded-2xl border border-ink/[0.08] glass-panel p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-400">Tasks</span>
          <p className="text-sm font-bold text-text-primary">{data.taskStats?.done ?? 0} / {data.taskStats?.total ?? 0} done</p>
        </div>
        <div className="rounded-2xl border border-ink/[0.08] glass-panel p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={11} /> Open hours</span>
          <p className="text-sm font-bold text-text-primary">{data.taskStats?.openHours ?? 0}h</p>
        </div>
      </motion.div>

      {/* Progress */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-ink/[0.08] glass-panel p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold text-text-primary">Progress</p>
        <ProgressBar pct={data.progress} />
      </motion.div>

      {/* Risks */}
      {data.risks?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-ink/[0.08] glass-panel p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-500" /> Open Risks ({data.risks.length})
          </p>
          <div className="flex flex-col gap-2">
            {data.risks.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs border-b border-ink/[0.05] pb-2 last:border-0 last:pb-0">
                <span className="text-text-primary font-medium">{r.title}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold shrink-0 ${r.severity === "Critical" ? "bg-rose-100 text-rose-700" : r.severity === "High" ? "bg-amber-100 text-amber-700" : "bg-ink/[0.08] text-text-secondary"}`}>
                  {r.severity ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Extension history */}
      {data.extensions?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-ink/[0.08] glass-panel p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <RefreshCw size={14} className="text-[#4B2FC4]" /> Extension History ({data.extensions.length})
          </p>
          <div className="flex flex-col gap-2">
            {data.extensions.map((e, i) => (
              <div key={i} className="text-xs border-b border-ink/[0.05] pb-2 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-text-primary font-medium">{e.taskTitle}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold shrink-0 ${e.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : e.status === "REJECTED" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                    {e.status}
                  </span>
                </div>
                {e.reason && <p className="text-slate-400 mt-0.5 truncate">{e.reason}</p>}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {data.risks?.length === 0 && data.extensions?.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">No risks or extension requests for this project.</p>
      )}
    </div>
  );
}
