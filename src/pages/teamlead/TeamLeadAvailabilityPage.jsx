import { useEffect, useState, useCallback } from "react";
import { hpColor } from "@/utils/hpTier";
import { motion }                           from "framer-motion";
import { RefreshCw, AlertTriangle, Users, Heart, TrendingUp, CheckCircle2, Activity } from "lucide-react";
import api from "@/lib/api";

import TallyLoader from "@/components/ui/TallyLoader";
import { utilisationLabel, utilisationBar } from "@/utils/utilisation";
const TEAL = "#08695F";

const TIER_CFG = {
  "Free":              { color: "#0E6A30", label: "Free",             bg: "rgba(18,128,59,0.10)"  },
  "Moderate Load":     { color: "#7A5200", label: "Moderate Load",    bg: "rgba(234,179,8,0.10)"   },
  "Busy":              { color: "#9A3A06", label: "Busy",             bg: "rgba(232,89,12,0.10)"  },
  "Critical Overload": { color: "#B01F17", label: "Critical",         bg: "rgba(209,41,31,0.10)"   },
};
function tierCfg(t) { return TIER_CFG[t] ?? TIER_CFG["Free"]; }

const BURNOUT_COLOR = { Low: "#0E6A30", Moderate: "#7A5200", High: "#9A3A06", Critical: "#B01F17" };

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

// ── Bars ──────────────────────────────────────────────────────────────────────
function UtilBar({ value, color }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-ink/[0.06] overflow-hidden">
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color, boxShadow: "var(--shadow-1)" }}
      />
    </div>
  );
}

function HpBar({ hp }) {
  const color = hpColor(hp);
  return (
    <div className="flex items-center gap-2">
      <Heart size={10} strokeWidth={2} style={{ color }} />
      <div className="h-1 flex-1 rounded-full bg-ink/[0.06] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${hp ?? 100}%`, background: color }} />
      </div>
      <span className="text-[14px] tabular-nums" style={{ color }}>{hp ?? 100}</span>
    </div>
  );
}

// ── Member Card ────────────────────────────────────────────────────────────────
function MemberCard({ m }) {
  const cfg  = tierCfg(m.workload ?? m.workloadTier);
  const util = m.utilisation ?? 0;
  const burnoutColor = BURNOUT_COLOR[m.burnoutRisk] ?? "#3A4660";

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl border p-4 flex flex-col gap-3"
      style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: `${cfg.color}18` }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-[#FFFFFF] shrink-0"
            style={{ background: cfg.color }}
          >
            {m.name?.[0]?.toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">{m.name}</p>
            <p className="text-[14px] text-slate-500 truncate">{m.role}</p>
          </div>
        </div>
        <span
          className="text-[14px] font-bold px-2 py-1 rounded-lg shrink-0"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25` }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Utilisation bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[14px] text-slate-500">Utilisation</span>
          <span className="text-[14px] font-bold tabular-nums" style={{ color: cfg.color }} title={`${util}% of daily capacity`}>{utilisationLabel(util)}</span>
        </div>
        <UtilBar value={utilisationBar(util)} color={cfg.color} />
      </div>

      {/* Hours row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg p-2.5" style={{ background: "rgba(20,32,61,0.03)", border: "1px solid rgba(20,32,61,0.06)" }}>
          <p className="text-[14px] text-slate-600 mb-0.5">Allocated</p>
          <p className="text-sm font-black tabular-nums" style={{ color: cfg.color }}>
            {m.allocatedH ?? m.allocatedHours ?? 0}h
          </p>
        </div>
        <div className="rounded-lg p-2.5" style={{ background: "rgba(20,32,61,0.03)", border: "1px solid rgba(20,32,61,0.06)" }}>
          <p className="text-[14px] text-slate-600 mb-0.5">Free Today</p>
          <p className="text-sm font-black tabular-nums" style={{ color: (m.remainingH ?? m.availableHours ?? 0) > 0 ? "#0E6A30" : "#B01F17" }}>
            {m.remainingH ?? m.availableHours ?? 0}h
          </p>
        </div>
      </div>

      {/* HP + burnout */}
      <div className="flex flex-col gap-1.5">
        <HpBar hp={m.hp ?? 100} />
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-slate-600">Open tasks: <strong className="text-slate-400">{m.openTasks ?? m.activeTaskCount ?? 0}</strong></span>
          {m.burnoutRisk && m.burnoutRisk !== "Low" && (
            <span className="text-[14px] font-bold" style={{ color: burnoutColor }}>
              Burnout: {m.burnoutRisk}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Summary Stat ──────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
      style={{ background: `${color}08`, borderColor: `${color}20` }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl shrink-0" style={{ background: `${color}15` }}>
        <Icon size={14} strokeWidth={1.75} style={{ color }} />
      </span>
      <div>
        <p className="text-lg font-black tabular-nums" style={{ color }}>{value}</p>
        <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600">{label}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeamLeadAvailabilityPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tierFilter, setTierFilter] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    api.get("/api/teamlead/team-workload")
      .then((d) => setMembers(d.members ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const free     = members.filter((m) => m.workload === "Free" || m.workload === "Moderate Load").length;
  const highLoad = members.filter((m) => m.workload === "Busy").length;
  const critical = members.filter((m) => m.workload === "Critical Overload").length;
  const avgUtil  = members.length
    ? Math.round(members.reduce((s, m) => s + (m.utilisation ?? 0), 0) / members.length)
    : 0;

  const tiers = ["all", "Free", "Moderate Load", "Busy", "Critical Overload"];
  const visible = tierFilter === "all"
    ? members
    : members.filter((m) => (m.workload ?? m.workloadTier) === tierFilter);

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1100px] mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2.5">
            <Activity size={20} strokeWidth={1.75} style={{ color: "#08695F" }} />
            Team Availability
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time workforce capacity across all your active projects.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-ink/10 text-slate-400 hover:text-text-primary hover:border-ink/20 transition-all"
        >
          <RefreshCw size={13} strokeWidth={2} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      {!loading && !error && members.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill icon={Users}        label="Team Size"    value={members.length} color={TEAL}      />
          <StatPill icon={CheckCircle2} label="Available"    value={free}           color="#0E6A30"   />
          <StatPill icon={TrendingUp}   label="Busy"         value={highLoad}       color="#9A3A06"   />
          <StatPill icon={AlertTriangle}label="Critical"     value={critical}       color="#B01F17"   />
        </div>
      )}

      {/* Avg utilisation bar */}
      {!loading && members.length > 0 && (
        <div className="px-5 py-4 rounded-2xl border" style={{ background: "rgba(255,255,255,0.5)", borderColor: "rgba(20,32,61,0.06)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Team Average Utilisation</span>
            <span className="text-sm font-black tabular-nums" style={{ color: avgUtil > 80 ? "#B01F17" : avgUtil > 60 ? "#7A5200" : "#08695F" }}>
              {utilisationLabel(avgUtil)}
            </span>
          </div>
          <UtilBar value={utilisationBar(avgUtil)} color={avgUtil > 80 ? "#B01F17" : avgUtil > 60 ? "#7A5200" : TEAL} />
        </div>
      )}

      {/* Tier filter chips */}
      {!loading && members.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tiers.map((t) => {
            const cfg   = t === "all" ? { color: "#08695F" } : tierCfg(t);
            const count = t === "all" ? members.length : members.filter((m) => (m.workload ?? m.workloadTier) === t).length;
            return (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                style={{
                  background: tierFilter === t ? `${cfg.color}18` : "rgba(20,32,61,0.03)",
                  border:     `1px solid ${tierFilter === t ? cfg.color : "rgba(20,32,61,0.08)"}`,
                  color:      tierFilter === t ? cfg.color : "#4F5B75",
                }}
              >
                {t === "all" ? "All" : t}
                <span className="text-[14px] font-black px-1.5 py-0.5 rounded-full" style={{ background: `${cfg.color}20`, color: cfg.color }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <TallyLoader />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertTriangle size={28} className="text-red-400" strokeWidth={1.5} />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={load} className="text-xs text-teal-500 underline">Retry</button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Users size={28} className="text-slate-700" strokeWidth={1.2} />
          <p className="text-sm text-slate-600 font-medium">No members in this tier</p>
        </div>
      ) : (
        <motion.div
          key={tierFilter}
          initial="hidden" animate="show" variants={stagger}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((m) => (
            <MemberCard key={m.id} m={m} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

