import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Trophy, TrendingUp, TrendingDown, Minus, Flame, Zap, CheckCircle2, ChevronRight, X, BarChart2, RefreshCw, Flag, Star } from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";

import TallyLoader from "@/components/ui/TallyLoader";
import { avatarUrl } from "@/lib/avatar";
// ── Helpers ───────────────────────────────────────────────────────────────────
const RANK_MEDAL = { 1: "🥇", 2: "🥈", 3: "🥉" };

function Avatar({ name, size = 32 }) {
  const s = encodeURIComponent(name ?? "user");
  return (
    <div
      className="rounded-full overflow-hidden border border-ink/[0.10] bg-[#FFFFFF] shrink-0 relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <span className="text-[14px] font-bold text-slate-600 absolute">
        {(name ?? "?")[0]?.toUpperCase()}
      </span>
      <img
        src={avatarUrl("bottts", s)}
        alt={name}
        className="relative z-10 h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

function MovementBadge({ movement }) {
  if (movement === "rising")  return <TrendingUp  size={11} strokeWidth={2.5} className="text-emerald-400 shrink-0" />;
  if (movement === "falling") return <TrendingDown size={11} strokeWidth={2.5} className="text-red-400 shrink-0" />;
  return <Minus size={11} strokeWidth={2.5} className="text-slate-600 shrink-0" />;
}

function MiniBar({ value, max = 100, color }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div className="h-1 rounded-full bg-ink/[0.07] overflow-hidden w-full">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Podium ────────────────────────────────────────────────────────────────────
function Podium({ rows, onSelect }) {
  if (!rows?.length) return null;
  const order = [
    rows.find((r) => r.rank === 2),
    rows.find((r) => r.rank === 1),
    rows.find((r) => r.rank === 3),
  ].filter(Boolean);
  const heights = { 1: "h-24", 2: "h-16", 3: "h-12" };
  const glows   = { 1: "#7A5200", 2: "#3A4660", 3: "#7B4C1E" };
  return (
    <div className="flex items-end justify-center gap-3 pt-8 pb-6 px-4">
      {order.map((row) => (
        <button key={row.rank} onClick={() => onSelect(row)} className="flex flex-col items-center gap-2 group focus:outline-none">
          <div className="text-lg">{RANK_MEDAL[row.rank]}</div>
          <Avatar name={row.name} size={row.rank === 1 ? 52 : 40} />
          <div className="text-center">
            <p className="text-xs font-bold text-text-primary truncate max-w-[80px]">{row.name}</p>
            <p className="text-[14px] font-black text-[#7A5200] flex items-center justify-center gap-0.5 mt-0.5">
              <Star size={9} strokeWidth={2.5} />
              {row.deliveryScore ?? 0}
            </p>
          </div>
          <div
            className={`rounded-t-lg w-16 ${heights[row.rank] ?? "h-10"} border border-ink/[0.06]`}
            style={{
              background:  `linear-gradient(to top, ${glows[row.rank]}22, ${glows[row.rank]}08)`,
              borderColor: `${glows[row.rank]}30`,
              boxShadow:   `0 -4px 24px ${glows[row.rank]}22`,
            }}
          />
        </button>
      ))}
    </div>
  );
}

// ── Detail Side Panel ─────────────────────────────────────────────────────────
function DetailPanel({ row, accent, onClose }) {
  return (
    <motion.div
      key="panel"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="w-[320px] shrink-0 rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.08] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-ink/[0.06]" style={{ background: `${accent}08` }}>
        <div className="flex items-center gap-3">
          <Avatar name={row.name} size={44} />
          <div>
            <p className="text-sm font-bold text-text-primary">{row.name}</p>
            <p className="text-xs text-slate-400 capitalize">{row.role?.replace(/_/g, " ") ?? "Team Lead"}</p>
            <p className="text-[14px] text-slate-600 mt-0.5">Rank #{row.rank}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink/[0.07] text-slate-500 hover:text-slate-700 transition-colors">
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        {/* Delivery Score */}
        <div>
          <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600 mb-2">Delivery Score</p>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-black text-text-primary">{row.deliveryScore ?? 0}</span>
          </div>
          <MiniBar value={row.deliveryScore ?? 0} max={100} color={accent} />
          <div className="flex items-center gap-1.5 mt-1.5">
            <MovementBadge movement={row.movement} />
            <span className="text-[14px] text-slate-500 capitalize">{row.movement ?? "stable"}</span>
          </div>
        </div>

        {/* XP */}
        <div>
          <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600 mb-2">Experience</p>
          <div className="flex items-center justify-between py-1.5 border-b border-ink/[0.04]">
            <span className="text-xs text-slate-400">Total XP</span>
            <span className="text-xs font-bold flex items-center gap-1 text-[#7A5200]">
              <Zap size={9} strokeWidth={2.5} />
              {(row.totalXp ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* TL-specific stats */}
        <div>
          <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600 mb-2">Operational Stats</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Flag,         label: "Milestones",      value: row.milestones ?? 0,            color: accent        },
              { icon: CheckCircle2, label: "On-Time Rate",    value: `${row.sprintRate ?? 0}%`,      color: "#0E6A30"     },
              { icon: BarChart2,    label: "Sprints Done",    value: row.sprintsCompleted ?? 0,      color: "#1948BD"     },
              { icon: TrendingUp,   label: "High Completion", value: row.sprintsHighCompletion ?? 0, color: "#1948BD"     },
              { icon: Star,         label: "Reviews",         value: row.reviewsApproved ?? 0,       color: "#7A5200"     },
              { icon: Flame,        label: "Consec. On-Time", value: row.consecutiveOnTime ?? 0,     color: "#9A3A06"     },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="px-3 py-2.5 rounded-xl bg-ink/[0.03] border border-ink/[0.06]">
                <Icon size={13} strokeWidth={2} style={{ color }} className="mb-1" />
                <p className="text-sm font-bold text-text-primary">{value}</p>
                <p className="text-[14px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        {row.badges?.length > 0 && (
          <div>
            <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600 mb-2">Badges ({row.badgeCount ?? row.badges.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {row.badges.slice(0, 8).map((b, i) => (
                <span key={i} title={b.name ?? b} className="text-[14px] leading-none">{b.emoji ?? "🏅"}</span>
              ))}
              {(row.badgeCount ?? 0) > 8 && (
                <span className="text-[14px] text-slate-600">+{row.badgeCount - 8}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Table Row ─────────────────────────────────────────────────────────────────
function TableRow({ row, accent, onSelect, isSelected }) {
  const isTop3   = row.rank <= 3;
  const topColor = { 1: "#7A5200", 2: "#3A4660", 3: "#7B4C1E" }[row.rank];
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      onClick={() => onSelect(row)}
      className="w-full items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 focus:outline-none border"
      style={{
        display: "grid",
        gridTemplateColumns: "2.5rem 1fr 5rem 6rem 5rem 5rem 5.5rem 1.5rem",
        gap: "0.75rem",
        ...(isSelected
          ? { background: `${accent}12`, borderColor: `${accent}40` }
          : isTop3
          ? { background: `${topColor}0a`, borderColor: `${topColor}28` }
          : { background: "rgba(20,32,61,0.025)", borderColor: "rgba(20,32,61,0.04)" }),
      }}
    >
      {/* Rank */}
      <div className="flex items-center gap-1">
        <MovementBadge movement={row.movement} />
        <span className="text-sm font-black tabular-nums" style={{ color: isTop3 ? topColor : row.isUser ? accent : "#4F5B75" }}>
          {isTop3 ? RANK_MEDAL[row.rank] : `#${row.rank}`}
        </span>
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar name={row.name} size={30} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-sm truncate font-semibold ${row.isUser ? "text-text-primary font-bold" : "text-slate-300"}`}>{row.name}</span>
            {row.isUser && (
              <span className="shrink-0 text-[14px] font-black px-1.5 py-0.5 rounded-full border" style={{ color: accent, background: `${accent}18`, borderColor: `${accent}35` }}>YOU</span>
            )}
          </div>
          <span className="text-[14px] text-slate-600 truncate block capitalize">{row.role?.replace(/_/g, " ") ?? "Team Lead"}</span>
        </div>
      </div>

      {/* Delivery Score */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-slate-300 tabular-nums">{row.deliveryScore ?? 0}</span>
        <MiniBar value={row.deliveryScore ?? 0} max={100} color={accent} />
      </div>

      {/* XP */}
      <div className="flex items-center justify-end gap-1 text-xs font-bold text-[#7A5200] tabular-nums">
        <Zap size={9} strokeWidth={2.5} />
        {(row.totalXp ?? 0).toLocaleString()}
      </div>

      {/* Milestones */}
      <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-400">
        <Flag size={10} className="text-slate-600" />
        {row.milestones ?? 0}
      </div>

      {/* Sprint rate */}
      <div className="flex flex-col gap-1">
        <span className="text-[14px] text-slate-500 tabular-nums">{row.sprintRate ?? 0}%</span>
        <MiniBar value={row.sprintRate ?? 0} max={100} color="#0E6A30" />
      </div>

      {/* Badges preview */}
      <div className="flex items-center gap-0.5">
        {(row.badges ?? []).slice(0, 3).map((b, i) => (
          <span key={i} className="text-[14px] leading-none">{b.emoji ?? "🏅"}</span>
        ))}
        {(row.badgeCount ?? 0) > 3 && (
          <span className="text-[14px] text-slate-600 ml-0.5">+{row.badgeCount - 3}</span>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight size={12} strokeWidth={2} className="text-slate-700" />
    </motion.button>
  );
}

// ── Column Headers ────────────────────────────────────────────────────────────
function TableHeaders() {
  return (
    <div
      className="px-4 py-2"
      style={{ display: "grid", gridTemplateColumns: "2.5rem 1fr 5rem 6rem 5rem 5rem 5.5rem 1.5rem", gap: "0.75rem" }}
    >
      {["Rank", "Operator", "Score", "XP", "Milestones", "On-Time", "Badges", ""].map((h) => (
        <span key={h} className="text-[14px] font-black uppercase tracking-[0.14em] text-slate-600">{h}</span>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: "org",    label: "Org Rankings",      icon: Globe    },
  { key: "sprint", label: "Sprint Performance", icon: BarChart2 },
];

export default function TeamLeadLeaderboardPage() {
  const theme = useRoleTheme();
  

  const [tab,        setTab]        = useState("org");
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async (t) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/teamlead/gamification/leaderboard?tab=${t}`);
      setRows(res.leaderboard ?? res.rows ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, refreshKey, load]);

  const top3 = rows.filter((r) => r.rank <= 3);
  

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
            <Trophy size={11} strokeWidth={2.5} style={{ color: theme.text }} />
            Gamification
          </p>
          <h1 className="text-3xl font-black text-text-primary">Leaderboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Delivery-score rankings — weighted by milestone delivery, sprint rate &amp; operational consistency.
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

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-ink/[0.04] border border-ink/[0.06] w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200",
              tab === key ? "text-accent-on shadow-md" : "text-slate-500 hover:text-slate-700 hover:bg-ink/[0.05]",
            ].join(" ")}
            style={tab === key ? { background: theme.accent, boxShadow: "var(--shadow-1)" } : {}}
          >
            <Icon size={12} strokeWidth={2.5} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <TallyLoader />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <Trophy size={36} className="text-slate-700" strokeWidth={1.2} />
          <p className="text-sm text-slate-500 font-medium">No leaderboard data yet.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex gap-5"
          >
            {/* Main content */}
            <div className="flex-1 flex flex-col gap-4 min-w-0">

              {/* Podium */}
              {top3.length >= 2 && (
                <div
                  className="rounded-2xl border border-ink/[0.07] overflow-hidden"
                  style={{ background: "linear-gradient(180deg,#EAEDF4,#FFFFFF)" }}
                >
                  <Podium rows={top3} accent={theme.accent} onSelect={setSelected} />
                </div>
              )}

              {/* Table */}
              <div className="rounded-2xl border border-ink/[0.07] overflow-hidden" style={{ background: "linear-gradient(180deg,#EAEDF4,#FFFFFF)" }}>
                <div className="px-4 pt-4 pb-2 border-b border-ink/[0.06]">
                  <p className="text-[14px] font-black uppercase tracking-[0.15em] text-slate-600">All Rankings</p>
                </div>
                <TableHeaders />
                <div className="flex flex-col gap-1.5 p-3">
                  {rows.map((row) => (
                    <TableRow
                      key={row.userId ?? row._id}
                      row={row}
                      accent={theme.accent}
                      onSelect={setSelected}
                      isSelected={selected?.userId === row.userId}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Detail panel */}
            <AnimatePresence>
              {selected && (
                <DetailPanel
                  key="detail"
                  row={selected}
                  accent={theme.accent}
                  onClose={() => setSelected(null)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}


