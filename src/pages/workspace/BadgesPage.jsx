import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Lock, Flame, CheckSquare, Zap, Star, Trophy, TrendingUp, BookOpen, RefreshCw, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";

import TallyLoader from "@/components/ui/TallyLoader";
// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: "all",     label: "All",     icon: Award       },
  { key: "streak",  label: "Streak",  icon: Flame       },
  { key: "tasks",   label: "Tasks",   icon: CheckSquare },
  { key: "xp",      label: "XP",      icon: Zap         },
  { key: "special", label: "Special", icon: Star        },
];

const STATUS_FILTERS = [
  { key: "all",         label: "All"         },
  { key: "unlocked",    label: "Earned"      },
  { key: "in_progress", label: "In Progress" },
  { key: "locked",      label: "Locked"      },
];

const RARITY_CFG = {
  legendary: { label: "Legendary", color: "#7A5200", glow: "rgba(255,194,26,0.30)" },
  epic:      { label: "Epic",      color: "#1948BD", glow: "rgba(42,98,236,0.28)" },
  rare:      { label: "Rare",      color: "#1948BD", glow: "rgba(31,87,224,0.25)" },
  common:    { label: "Common",    color: "#4F5B75", glow: "rgba(109,123,153,0.15)" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date) {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30)  return `${d}d ago`;
  const m = Math.floor(d / 30);
  return m < 12 ? `${m}mo ago` : `${Math.floor(m / 12)}y ago`;
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ pct, color, animate: anim = true }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-ink/[0.07] overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: anim ? `${pct}%` : `${pct}%` }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        style={{ background: color }}
      />
    </div>
  );
}

// ── Badge Card ────────────────────────────────────────────────────────────────

function BadgeCard({ badge }) {
  const rarity  = RARITY_CFG[badge.rarity] ?? RARITY_CFG.common;
  const isEarned     = badge.state === "unlocked";
  const isInProgress = badge.state === "in_progress";
  const isLegendary  = badge.rarity === "legendary" && isEarned;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ duration: 0.2 }}
      className="relative flex flex-col gap-3 rounded-2xl p-5 border text-center overflow-hidden"
      style={
        isEarned
          ? {
              background:  `${rarity.color}0d`,
              borderColor: `${rarity.color}35`,
              boxShadow:   "var(--shadow-1)",
            }
          : isInProgress
          ? {
              background:  `${rarity.color}07`,
              borderColor: `${rarity.color}22`,
            }
          : {
              background:  "rgba(20,32,61,0.018)",
              borderColor: "rgba(20,32,61,0.06)",
            }
      }
    >
      {/* Legendary shimmer overlay */}
      {isLegendary && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0, 0.18, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: `linear-gradient(135deg, transparent 30%, ${rarity.color}40 50%, transparent 70%)`,
          }}
        />
      )}

      {/* Lock indicator */}
      {!isEarned && !isInProgress && (
        <div className="absolute top-3 right-3">
          <Lock size={11} className="text-slate-700" strokeWidth={2.5} />
        </div>
      )}

      {/* In-progress indicator */}
      {isInProgress && (
        <div className="absolute top-3 right-3">
          <div className="w-2 h-2 rounded-full" style={{ background: rarity.color }} />
        </div>
      )}

      {/* Icon */}
      <div className="flex justify-center">
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center text-2xl border"
          style={
            isEarned
              ? {
                  background:  `${rarity.color}1a`,
                  borderColor: `${rarity.color}45`,
                  boxShadow:   "var(--shadow-1)",
                }
              : isInProgress
              ? {
                  background:  `${rarity.color}10`,
                  borderColor: `${rarity.color}25`,
                }
              : {
                  background:  "rgba(20,32,61,0.03)",
                  borderColor: "rgba(20,32,61,0.07)",
                  filter:      "grayscale(100%)",
                  opacity:     0.45,
                }
          }
        >
          {badge.emoji}
        </div>
      </div>

      {/* Name + desc */}
      <div>
        <p className={`text-sm font-bold leading-tight ${isEarned ? "text-text-primary" : isInProgress ? "text-slate-300" : "text-slate-600"}`}>
          {badge.name}
        </p>
        <p className="text-[14px] text-slate-600 mt-1 leading-snug px-1">
          {badge.desc}
        </p>
      </div>

      {/* Rarity pill */}
      <div className="flex justify-center">
        <span
          className="text-[14px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border"
          style={
            isEarned
              ? { color: rarity.color, background: `${rarity.color}15`, borderColor: `${rarity.color}35` }
              : { color: "#4F5B75",    background: "rgba(20,32,61,0.03)", borderColor: "rgba(20,32,61,0.07)" }
          }
        >
          {rarity.label}
        </span>
      </div>

      {/* Progress bar (in-progress badges) */}
      {isInProgress && badge.progress && (
        <div className="flex flex-col gap-1.5 px-1">
          <ProgressBar pct={badge.progress.pct} color={rarity.color} />
          <p className="text-[14px] text-slate-500 text-center">
            {badge.progress.current.toLocaleString()} / {badge.progress.target.toLocaleString()}
            <span className="ml-1 font-bold" style={{ color: rarity.color }}>{badge.progress.pct}%</span>
          </p>
        </div>
      )}

      {/* Condition hint (locked / in-progress) */}
      {!isEarned && (
        <p className="text-[14px] text-slate-700 leading-snug px-1 -mt-1">
          {badge.condition}
        </p>
      )}

      {/* Earned timestamp */}
      {isEarned && badge.earnedAt && (
        <p className="text-[14px] text-slate-600 -mt-1">
          <CheckCircle2 size={9} strokeWidth={2.5} className="inline mr-0.5 mb-px" style={{ color: rarity.color }} />
          {timeAgo(badge.earnedAt)}
        </p>
      )}
    </motion.div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="px-4 py-4 rounded-xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18` }}
      >
        <Icon size={16} strokeWidth={2} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600">{label}</p>
        <p className="text-base font-black text-text-primary">{value}</p>
        {sub && <p className="text-[14px] text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const SORT_OPTS = [
  { key: "state",  label: "Status"  },
  { key: "rarity", label: "Rarity"  },
  { key: "name",   label: "Name"    },
];

const RARITY_ORDER = { legendary: 0, epic: 1, rare: 2, common: 3 };
const STATE_ORDER  = { unlocked: 0, in_progress: 1, locked: 2 };

export default function BadgesPage() {
  const theme = useRoleTheme();

  const [catalog,      setCatalog]      = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [sortBy,       setSortBy]       = useState("state");
  const [refreshKey,   setRefreshKey]   = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.get("/api/gamification/badges")
      .then((d) => {
        setCatalog(d.catalog ?? []);
        setStats(d.stats ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // ── Filtering + sorting ───────────────────────────────────────────────────
  const filtered = catalog
    .filter((b) => tab === "all"         || b.category === tab)
    .filter((b) => statusFilter === "all" || b.state === statusFilter)
    .filter((b) => rarityFilter === "all" || b.rarity === rarityFilter)
    .sort((a, b) => {
      if (sortBy === "rarity") return (RARITY_ORDER[a.rarity] ?? 4) - (RARITY_ORDER[b.rarity] ?? 4);
      if (sortBy === "name")   return a.name.localeCompare(b.name);
      // default: by state then rarity
      const sd = (STATE_ORDER[a.state] ?? 3) - (STATE_ORDER[b.state] ?? 3);
      return sd !== 0 ? sd : (RARITY_ORDER[a.rarity] ?? 4) - (RARITY_ORDER[b.rarity] ?? 4);
    });

  const earnedInView     = filtered.filter((b) => b.state === "unlocked").length;
  const inProgressInView = filtered.filter((b) => b.state === "in_progress").length;
  const completionPct    = stats?.totalInCatalog
    ? Math.round(((stats.total ?? 0) / stats.totalInCatalog) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6 px-6 py-8 min-h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600 mb-1 flex items-center gap-1.5">
            <Award size={11} strokeWidth={2.5} style={{ color: theme.text }} />
            Gamification
          </p>
          <h1 className="text-3xl font-black text-text-primary">Badges &amp; Achievements</h1>
          <p className="text-sm text-slate-500 mt-1">
            Behavior-driven rewards — earned by performance, consistency &amp; delivery.
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-ink/[0.07] bg-ink/[0.03] text-slate-500 hover:text-slate-700 hover:bg-ink/[0.06] transition-all disabled:opacity-40 text-xs font-semibold"
        >
          <RefreshCw size={12} strokeWidth={2} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </motion.div>

      {/* Stats Strip */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-3"
        >
          <StatCard icon={Trophy}      label="Total Earned" value={`${stats.total} / ${stats.totalInCatalog}`} sub={`${completionPct}% complete`} color={theme.accent} />
          <StatCard icon={Flame}       label="Streak"       value={stats.streak}  sub="streak badges"  color="#9A3A06" />
          <StatCard icon={CheckSquare} label="Tasks"        value={stats.tasks}   sub="task badges"    color="#0E6A30" />
          <StatCard icon={Zap}         label="XP"           value={stats.xp}      sub="xp badges"      color="#7A5200" />
          <StatCard icon={Star}        label="Special"      value={stats.special} sub="special badges" color="#1948BD" />
        </motion.div>
      )}

      {/* Rarity Breakdown */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 rounded-xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07]"
        >
          <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600 shrink-0">Rarity Earned</p>
          <div className="flex flex-1 items-center gap-4 flex-wrap">
            {["legendary", "epic", "rare", "common"].map((r) => {
              const cfg   = RARITY_CFG[r];
              const count = stats.rarity?.[r] ?? 0;
              return (
                <div key={r} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                  <span className="text-xs font-bold" style={{ color: cfg.color }}>{count}</span>
                  <span className="text-[14px] text-slate-600">{cfg.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <TrendingUp size={12} strokeWidth={2} style={{ color: theme.text }} />
            <span className="font-semibold" style={{ color: theme.text }}>{stats.inProgress}</span>
            in progress
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-ink/[0.04] border border-ink/[0.06] overflow-x-auto max-w-full">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={[
                "flex shrink-0 items-center gap-1.5 px-2 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200",
                tab === key
                  ? "text-accent-on shadow-md"
                  : "text-slate-500 hover:text-slate-700 hover:bg-ink/[0.05]",
              ].join(" ")}
              style={tab === key ? { background: theme.accent, boxShadow: "var(--shadow-1)" } : {}}
            >
              <Icon size={12} strokeWidth={2.5} />
              {label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex gap-1 p-1 rounded-xl bg-ink/[0.04] border border-ink/[0.06] overflow-x-auto max-w-full">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={[
                "shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200",
                statusFilter === key
                  ? "bg-ink/[0.10] text-text-primary"
                  : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Rarity chips */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setRarityFilter("all")}
            className={[
              "px-3 py-1.5 rounded-lg text-[14px] font-bold border transition-all",
              rarityFilter === "all"
                ? "border-ink/[0.15] bg-ink/[0.08] text-text-primary"
                : "border-ink/[0.05] text-slate-500 hover:text-slate-700",
            ].join(" ")}
          >
            All Rarity
          </button>
          {["legendary", "epic", "rare", "common"].map((r) => {
            const cfg = RARITY_CFG[r];
            return (
              <button
                key={r}
                onClick={() => setRarityFilter(r)}
                className={[
                  "px-3 py-1.5 rounded-lg text-[14px] font-bold border transition-all",
                  rarityFilter === r ? "" : "border-ink/[0.05] text-slate-500 hover:text-slate-700",
                ].join(" ")}
                style={rarityFilter === r
                  ? { background: `${cfg.color}18`, borderColor: `${cfg.color}40`, color: cfg.color }
                  : {}}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[14px] text-slate-600 font-semibold uppercase tracking-widest">Sort</span>
          {SORT_OPTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={[
                "px-3 py-1.5 rounded-lg text-[14px] font-bold border transition-all",
                sortBy === key
                  ? "border-ink/[0.15] bg-ink/[0.08] text-text-primary"
                  : "border-ink/[0.05] text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary line */}
      <p className="text-xs text-slate-600 font-semibold -mb-2">
        <span className="text-text-primary font-bold">{earnedInView}</span> earned
        {inProgressInView > 0 && (
          <>
            <span className="mx-1.5 text-slate-700">·</span>
            <span style={{ color: theme.text }} className="font-bold">{inProgressInView}</span> in progress
          </>
        )}
        <span className="mx-1.5 text-slate-700">·</span>
        {filtered.length} showing
      </p>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <TallyLoader />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <BookOpen size={36} className="text-slate-700" />
          <p className="text-sm text-slate-400 font-semibold">No badges match these filters.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${tab}-${statusFilter}-${rarityFilter}-${sortBy}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          >
            {filtered.map((badge) => (
              <BadgeCard key={badge.name} badge={badge} accent={theme.accent} />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
