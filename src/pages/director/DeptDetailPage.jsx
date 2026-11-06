// DIR-04.2: Department detail — delivery on-time, rework rate, quality, workload
// D-038: No ranking or leaderboard.
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, ArrowLeft, Users, CheckCircle, RefreshCw, Star, Clock } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton, { SkeletonLine } from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";

function MetricCard({ icon, label, value, subtext, color = "text-text-primary" }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
      className="rounded-2xl border border-ink/[0.08] glass-panel p-5 flex flex-col gap-2"
    >
      <div className="flex items-center gap-2 text-text-secondary text-xs font-semibold uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>
        {value ?? <span className="text-text-secondary text-xl">—</span>}
      </p>
      {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
    </motion.div>
  );
}

export default function DeptDetailPage() {
  const { deptName } = useParams();
  const decoded = decodeURIComponent(deptName ?? "");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get(`/api/director/dept/${encodeURIComponent(decoded)}`)
      .then(d => setData(d))
      .catch(e => setError(e?.message ?? "Failed to load department data."))
      .finally(() => setLoading(false));
  }, [decoded]);

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[960px] mx-auto w-full">
      <div className="flex items-center gap-3">
        <Link to="/director/org-health" aria-label="Back to Org Health"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-text-primary hover:bg-ink/[0.04] transition-colors min-h-[32px]">
          <ArrowLeft size={14} />
          Org Health
        </Link>
      </div>

      <PageHeader
        title={decoded || "Department"}
        subtitle="Delivery, quality and workload metrics for this department"
        icon={<Building2 size={20} />}
      />

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl border border-ink/[0.07] p-5 flex flex-col gap-3">
              <SkeletonLine width="100px" height={12} />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {error && !loading && <ErrorState message={error} />}

      {!loading && !error && data && (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        >
          <MetricCard
            icon={<Users size={14} />}
            label="Members"
            value={data.memberCount}
            color="text-[#4B2FC4]"
          />
          <MetricCard
            icon={<CheckCircle size={14} />}
            label="On-time delivery"
            value={data.deliveryOnTime != null ? `${data.deliveryOnTime}%` : null}
            subtext={`${data.taskStats?.done ?? 0} of ${data.taskStats?.total ?? 0} tasks done`}
            color={data.deliveryOnTime >= 80 ? "text-emerald-600" : data.deliveryOnTime >= 60 ? "text-amber-600" : "text-rose-600"}
          />
          <MetricCard
            icon={<RefreshCw size={14} />}
            label="Rework rate"
            value={data.reworkRate != null ? `${data.reworkRate}%` : null}
            subtext="Tasks with ≥1 resubmission"
            color={data.reworkRate <= 20 ? "text-emerald-600" : data.reworkRate <= 40 ? "text-amber-600" : "text-rose-600"}
          />
          <MetricCard
            icon={<Star size={14} />}
            label="Quality score"
            value={data.qualityAvg != null ? `${data.qualityAvg}` : null}
            subtext="Normalized 0–100"
            color={data.qualityAvg >= 75 ? "text-emerald-600" : data.qualityAvg >= 50 ? "text-amber-600" : "text-rose-600"}
          />
        </motion.div>
      )}

      {!loading && !error && data && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl border border-ink/[0.08] glass-panel p-5 flex items-center gap-4"
        >
          <Clock size={18} className="text-text-secondary shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Open workload</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {data.workloadHours > 0
                ? `${data.workloadHours}h estimated across active tasks`
                : "No estimated hours on open tasks"}
            </p>
          </div>
          <p className="ml-auto text-xl font-bold tabular-nums text-[#4B2FC4]">
            {data.workloadHours > 0 ? `${data.workloadHours}h` : "—"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
