// DIR-03.2: Team workload page — workload bars only (D-027: no performance scores/leaderboard)
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton, { SkeletonLine } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";

function WorkloadBar({ pct }) {
  const capped = Math.min(pct, 100);
  const color =
    pct > 100 ? "bg-rose-500" :
    pct > 85  ? "bg-amber-500" :
    pct > 60  ? "bg-emerald-500" :
                "bg-[#4B2FC4]";
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2.5 rounded-full bg-ink/[0.08] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${capped}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums w-10 text-right ${pct > 100 ? "text-rose-600" : "text-text-secondary"}`}>
        {pct}%
      </span>
    </div>
  );
}

function teamWorkloadFromHeatmap(rows) {
  // Derive current-week workload per team from heatmap rows
  return rows.map(row => {
    // Use the first (current) week cell for "current" workload
    const current = row.cells?.[0];
    const pct = current?.pct ?? null;
    return {
      teamId:   row.teamId,
      teamName: row.teamName,
      pct:      pct == null ? null : Math.round(pct),
      noMembers: pct == null,
      planned:  current?.plannedHours ?? 0,
      available: current?.availableHours ?? 0,
      tasksTotal: row.cells?.length ?? 0,
    };
  }).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
}

export default function TeamWorkloadPage() {
  const [teams,   setTeams]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get("/api/director/capacity-heatmap")
      .then(d => {
        const rows = d?.rows ?? [];
        setTeams(teamWorkloadFromHeatmap(rows));
      })
      .catch(e => setError(e?.message ?? "Failed to load team workload."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[960px] mx-auto w-full">
      <div className="flex items-center gap-3">
        <Link to="/director/capacity" aria-label="Back to Capacity Heatmap"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-text-primary hover:bg-ink/[0.04] transition-colors min-h-[32px]">
          <ArrowLeft size={14}/>
          Capacity Heatmap
        </Link>
      </div>

      <PageHeader
        title="Team Workload"
        subtitle="Current-week hours planned vs. available per team"
        icon={<Users size={20}/>}
      />

      {loading && (
        <div className="flex flex-col gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-2xl border border-ink/[0.07] p-5 flex flex-col gap-3">
              <SkeletonLine width="180px" height={16}/>
              <Skeleton className="h-2.5 w-full rounded-full"/>
            </div>
          ))}
        </div>
      )}

      {error && !loading && <ErrorState message={error}/>}

      {!loading && !error && teams.length === 0 && (
        <EmptyState heading="No team data" body="Teams appear here once capacity data is available."/>
      )}

      {!loading && !error && teams.length > 0 && (
        <motion.div className="flex flex-col gap-3"
          initial="hidden" animate="show"
          variants={{ hidden:{}, show:{ transition:{ staggerChildren:0.05 } } }}>
          {teams.map(t => (
            <motion.div key={t.teamId}
              variants={{ hidden:{opacity:0,y:10}, show:{opacity:1,y:0} }}
              className="rounded-2xl border border-ink/[0.08] glass-panel p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-text-primary">{t.teamName}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  t.noMembers ? "bg-ink/[0.06] text-text-secondary" :
                  t.pct > 100 ? "bg-rose-500/10 text-rose-700" :
                  t.pct > 85  ? "bg-amber-500/10 text-amber-700" :
                                "bg-emerald-500/10 text-emerald-700"
                }`}>
                  {t.noMembers ? "No members" : t.pct > 100 ? "Overloaded" : t.pct > 85 ? "High load" : "Healthy"}
                </span>
              </div>
              {!t.noMembers && <WorkloadBar pct={t.pct}/>}
              <p className="text-xs text-slate-400">
                {t.planned}h planned · {t.available}h available this week
              </p>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
