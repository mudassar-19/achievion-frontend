import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Award, AlertTriangle, Zap } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";

import TallyLoader from "@/components/ui/TallyLoader";
import ErrorState from "@/components/ui/ErrorState";
import { avatarUrl } from "@/lib/avatar";
const RANK_MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };

function deptBarColor(score) {
  if (score >= 85) return "#0E6A30";
  if (score >= 70) return "var(--accent-text)";
  return "#7A5200";
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.4, 0, 0.2, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

export default function TeamAnalyticsPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    api.get("/api/director/analytics")
      .then((d) => { if (live) { setData(d); setError(null); } })
      .catch((e) => { if (live) setError(e.message ?? "Request failed."); }) // FE-R009 / FE-R023
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [attempt]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center py-24">
        <TallyLoader />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => { setLoading(true); setAttempt((n) => n + 1); }} />;
  }

  const { stats = {}, departments = [], topEarners = [] } = data ?? {};

  const statCards = [
    {
      label:    "Total Members",
      value:    stats.totalMembers ?? 0,
      sub:      "active in org",
      delta:    `${stats.completionRate ?? 0}% task completion`,
      positive: true,
      icon:     TrendingUp,
      color:    "#131E86",
      glow:     "rgba(129,140,248,0.14)",
      bg:       "rgba(79,70,229,0.07)",
      border:   "rgba(79,70,229,0.22)",
    },
    {
      label:    "Pending Approvals",
      value:    stats.pendingApprovals ?? 0,
      sub:      "awaiting director",
      delta:    `${stats.completionRate ?? 0}% done rate`,
      positive: true,
      icon:     Award,
      color:    "var(--accent-text)",
      glow:     "rgb(var(--c-accent) / 0.11)",
      bg:       "rgb(var(--c-accent) / 0.06)",
      border:   "rgb(var(--c-accent) / 0.18)",
    },
    {
      label:    "At-Risk Members",
      value:    stats.atRisk ?? 0,
      sub:      "HP below 30%",
      delta:    "burnout risk",
      positive: false,
      icon:     AlertTriangle,
      color:    "#B01F17",
      glow:     "rgba(209,41,31,0.13)",
      bg:       "rgba(209,41,31,0.06)",
      border:   "rgba(209,41,31,0.22)",
    },
  ];

  return (
    <div className="flex flex-col gap-7 px-4 sm:px-8 py-8 max-w-[1280px] mx-auto min-h-full w-full">

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34 }}
      >
        <PageHeader title="Team Analytics" />
      </motion.div>

      {/* ── Stat cards ── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-5"
      >
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              variants={fadeUp}
              className="glass-panel rounded-2xl p-6 flex flex-col gap-3 border"
              style={{ borderColor: card.border, boxShadow: "var(--shadow-1)" }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={{ background: card.bg, borderColor: card.border }}
                >
                  <Icon size={18} style={{ color: card.color }} strokeWidth={1.75} />
                </span>
                <span className={["text-[14px] font-bold px-2 py-0.5 rounded-full", card.positive ? "text-[#0E6A30] bg-[#12803B]/10" : "text-[#B01F17] bg-[#D1291F]/10"].join(" ")}>
                  {card.delta}
                </span>
              </div>
              <div>
                <p className="text-[14px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {card.label}
                </p>
                <p className="text-3xl font-black text-text-primary mt-0.5" style={{ color: card.color }}>
                  {card.value}
                  <span className="text-base font-semibold text-slate-600 ml-1">{card.sub}</span>
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Department Performance */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.12 }}
          className="lg:col-span-3 glass-panel rounded-2xl border border-ink/[0.07] flex flex-col"
        >
          <div className="px-6 py-4 border-b border-ink/[0.05]">
            <h2 className="text-sm font-black text-text-primary">Department Performance</h2>
            <p className="text-[14px] text-slate-600 mt-0.5">Average XP score by department</p>
          </div>

          {departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-slate-600">No department data yet.</p>
              <p className="text-xs text-slate-700 mt-1">Assign employees to departments in the admin panel.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5 px-6 py-5">
              {departments.map((dept, i) => {
                const color = deptBarColor(dept.score);
                return (
                  <motion.div
                    key={dept.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 + i * 0.07 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary">{dept.name}</span>
                        <span className="text-[14px] text-slate-700 bg-ink/[0.04] border border-ink/[0.07] px-2 py-0.5 rounded-full">
                          {dept.members} members · {dept.avgXp.toLocaleString()} avg XP
                        </span>
                      </div>
                      <span className="text-xs font-black" style={{ color }}>{dept.score}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-ink/[0.05] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, dept.score)}%` }}
                        transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1], delay: 0.2 + i * 0.06 }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Org Leaderboard Snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.18 }}
          className="lg:col-span-2 glass-panel rounded-2xl border border-ink/[0.07] flex flex-col"
        >
          <div className="px-5 py-4 border-b border-ink/[0.05]">
            <h2 className="text-sm font-black text-text-primary">Top Earners</h2>
            <p className="text-[14px] text-slate-600 mt-0.5">Org-wide XP leaders</p>
          </div>

          {topEarners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-slate-600">No XP data yet.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-ink/[0.04]">
              {topEarners.map((u) => (
                <div key={u.rank} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="w-5 text-center text-sm shrink-0">
                    {RANK_MEDAL[u.rank] ?? (
                      <span className="text-[14px] font-black text-slate-600">#{u.rank}</span>
                    )}
                  </span>
                  <div className="h-8 w-8 rounded-full overflow-hidden border border-ink/[0.10] bg-bg-base shrink-0">
                    <img
                      src={avatarUrl("bottts", u.name)}
                      alt={u.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">{u.name}</p>
                    <p className="text-[14px] text-slate-600 truncate">{u.role}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="flex items-center gap-1 text-[14px] font-black text-accent-text">
                      <Zap size={9} strokeWidth={2.5} />
                      {u.xp.toLocaleString()}
                    </span>
                    <span className="text-[14px] text-slate-700">Lvl {u.level}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

    </div>
  );
}
