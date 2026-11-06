import { fmt as dFull, fmtShort as dShort } from "@/pages/manager/project/format";
import { useEffect, useState, useCallback } from "react";
import { motion }           from "framer-motion";
import {
  Zap, Star, Shield, Crown, TrendingUp,
  Award, Clock, CheckCircle2, Target, Flag,
  ChevronRight, Activity,
} from "lucide-react";
import { Link }    from "react-router-dom";
import api         from "@/lib/api";
import useTLSocket from "@/hooks/useTLSocket";

import TallyLoader from "@/components/ui/TallyLoader";
const TEAL = "#08695F";

const RARITY_COLOR = {
  legendary: { bg: "rgba(255,194,26,0.12)", text: "#7A5200", border: "rgba(255,194,26,0.25)" },
  epic:      { bg: "rgba(167,139,250,0.12)", text: "#1948BD", border: "rgba(167,139,250,0.25)" },
  rare:      { bg: "rgba(31,87,224,0.12)",  text: "#1948BD", border: "rgba(31,87,224,0.25)"  },
  common:    { bg: "rgba(79,91,117,0.10)", text: "#3A4660", border: "rgba(79,91,117,0.20)" },
};
function rc(r) { return RARITY_COLOR[r] ?? RARITY_COLOR.common; }

const XP_SOURCE_ICONS = {
  tl_milestone_delivered:     { icon: Flag,         color: "#0E6A30" },
  tl_milestone_on_time:       { icon: Flag,         color: "#08695F"      },
  tl_sprint_completed:        { icon: Target,       color: "#1948BD" },
  tl_sprint_on_time:          { icon: Target,       color: "#08695F"      },
  tl_sprint_high_completion:  { icon: TrendingUp,   color: "#1948BD" },
  tl_sprint_perfect:          { icon: CheckCircle2, color: "#0E6A30" },
  tl_review_efficiency:       { icon: Shield,       color: "#7A5200" },
  tl_team_stability:          { icon: Activity,     color: "#9A3A06" },
  tl_delivery_consistency:    { icon: Clock,        color: "#3A4660" },
};

function LevelRing({ level, currentXp, maxXp }) {
  const pct = maxXp > 0 ? Math.min(100, Math.round((currentXp / maxXp) * 100)) : 0;
  const r = 44, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={110} height={110} className="-rotate-90">
        <circle cx={55} cy={55} r={r} fill="none" stroke="rgba(20,32,61,0.05)" strokeWidth={8} />
        <motion.circle cx={55} cy={55} r={r} fill="none" strokeWidth={8}
          stroke={TEAL} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ - dash}
          initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${TEAL}70)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-black" style={{ color: "#08695F" }}>{level}</span>
        <span className="text-[14px] font-bold uppercase tracking-widest text-slate-500">LEVEL</span>
      </div>
    </div>
  );
}

function XpBar({ currentXp, maxXp }) {
  const pct = maxXp > 0 ? Math.min(100, Math.round((currentXp / maxXp) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[14px] text-slate-500 mb-1.5">
        <span>{currentXp.toLocaleString()} XP</span>
        <span>{pct}% to next level</span>
        <span>{maxXp.toLocaleString()} XP</span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(20,32,61,0.06)" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="h-full rounded-full" style={{ background: `linear-gradient(90deg,${TEAL},var(--accent))`, boxShadow: "var(--shadow-1)" }}
        />
      </div>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center py-3 px-4 rounded-xl" style={{ background: "rgba(20,32,61,0.03)", border: "1px solid rgba(20,32,61,0.06)" }}>
      <span className="text-lg font-black tabular-nums" style={{ color }}>{value ?? 0}</span>
      <span className="text-[14px] font-semibold uppercase tracking-wider text-slate-600 mt-0.5">{label}</span>
    </div>
  );
}

export default function TeamLeadGamificationHubPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profile, tl] = await Promise.all([
        api.get("/api/teamlead/gamification/profile"),
        api.get("/api/teamlead/gamification/timeline"),
      ]);
      setData(profile);
      setTimeline(tl.events ?? []);
    } catch { setData(null); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useTLSocket({ onRefresh: load });

  if (loading) return <div className="flex justify-center py-20"><TallyLoader /></div>;
  if (!data)   return <div className="text-center py-20 text-slate-600 text-sm">Could not load gamification data.</div>;

  const { level, currentXp, maxXp, totalXp, gold, hp, badges, titles, activeTitle, tlStats, recentXpEvents } = data;
  const tlS = tlStats ?? {};

  // Top 3 recent badges
  const recentBadges = [...badges].reverse().slice(0, 3);

  return (
    <div className="px-4 sm:px-8 py-8 flex flex-col gap-6 min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text-primary">Gamification Hub</h1>
        <p className="text-xs text-slate-500 mt-1">Your leadership progression, badges, and achievements</p>
      </div>

      {/* Main XP card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border p-6"
        style={{ background: `linear-gradient(135deg,#EAEDF4 0%,#F5F6FA 100%)`, borderColor: `${TEAL}25` }}>
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Level ring */}
          <div className="shrink-0">
            <LevelRing level={level} currentXp={currentXp} maxXp={maxXp} />
          </div>

          {/* XP info */}
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-black text-text-primary">Team Lead Commander</span>
              {activeTitle && (
                <span className="text-[14px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${TEAL}18`, color: TEAL, border: `1px solid ${TEAL}30` }}>
                  {activeTitle.replace(/tl_/g, "").replace(/_/g, " ")}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-4">{totalXp.toLocaleString()} total XP earned through leadership</p>
            <XpBar currentXp={currentXp} maxXp={maxXp} />

            {/* Economy */}
            <div className="flex items-center gap-3 mt-4">
              <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#7A5200" }}>
                <Star size={12} /> {gold ?? 0} Gold
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
                ❤️ {hp ?? 100} HP
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#08695F" }}>
                <Award size={12} /> {badges.length} Badges
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-purple-400">
                <Crown size={12} /> {titles.length} Titles
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* TL Stat pills */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        <StatPill label="Milestones" value={tlS.milestonesDelivered} color={TEAL} />
        <StatPill label="On Time"    value={tlS.milestonesOnTime}    color="#0E6A30" />
        <StatPill label="Sprints"    value={tlS.sprintsCompleted}    color="#1948BD" />
        <StatPill label="Perfect"    value={tlS.perfectSprints}      color="#1948BD" />
        <StatPill label="Reviews"    value={tlS.reviewsApproved}     color="#7A5200" />
        <StatPill label="Streak"     value={tlS.consecutiveOnTime}   color="#9A3A06" />
      </div>

      {/* Bottom grid: XP events + badges + timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent XP Events */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(20,32,61,0.06)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(20,32,61,0.05)" }}>
            <p className="text-xs font-black text-text-primary">Recent XP Events</p>
            <Zap size={13} style={{ color: "#08695F" }} />
          </div>
          <div className="flex flex-col divide-y" style={{ divideColor: "rgba(20,32,61,0.04)" }}>
            {recentXpEvents.length === 0 ? (
              <p className="text-xs text-slate-700 text-center py-8">No XP events yet. Complete milestones or sprints!</p>
            ) : recentXpEvents.map((ev, i) => {
              const cfg = XP_SOURCE_ICONS[ev.source] ?? { icon: Zap, color: "#08695F" };
              const Icon = cfg.icon;
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${cfg.color}15` }}>
                    <Icon size={12} style={{ color: cfg.color }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-text-primary truncate">{ev.label}</p>
                    <p className="text-[14px] text-slate-600">
                      {dShort(ev.timestamp)}
                    </p>
                  </div>
                  <span className="text-xs font-black tabular-nums shrink-0" style={{ color: "#08695F" }}>+{ev.amount}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Badges */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(20,32,61,0.06)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(20,32,61,0.05)" }}>
            <p className="text-xs font-black text-text-primary">Recent Badges</p>
            <Link to="/teamlead/badges" className="text-[14px] font-bold flex items-center gap-0.5" style={{ color: "#08695F" }}>
              View all <ChevronRight size={10} />
            </Link>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {recentBadges.length === 0 ? (
              <p className="text-xs text-slate-700 text-center py-8">No badges yet — start delivering milestones!</p>
            ) : recentBadges.map((b, i) => {
              const colors = rc(b.rarity);
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
                  style={{ background: colors.bg, borderColor: colors.border }}>
                  <span className="text-base">{b.emoji ?? "🏅"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold truncate" style={{ color: colors.text }}>{b.name}</p>
                    <p className="text-[14px] text-slate-600 capitalize">{b.rarity}</p>
                  </div>
                </div>
              );
            })}
            {badges.length > 3 && (
              <p className="text-[14px] text-slate-600 text-center">+{badges.length - 3} more badges</p>
            )}
          </div>
        </div>

        {/* Achievement Timeline */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "rgba(20,32,61,0.06)", background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(20,32,61,0.05)" }}>
            <p className="text-xs font-black text-text-primary">Achievement Timeline</p>
            <Clock size={13} className="text-slate-600" />
          </div>
          <div className="flex flex-col divide-y max-h-72 overflow-y-auto" style={{ divideColor: "rgba(20,32,61,0.04)" }}>
            {timeline.length === 0 ? (
              <p className="text-xs text-slate-700 text-center py-8">No achievements yet.</p>
            ) : timeline.slice(0, 10).map((ev, i) => (
              <div key={i} className="flex items-start gap-2.5 px-4 py-2.5">
                <span className="text-sm shrink-0 mt-0.5">{ev.emoji ?? "⭐"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-text-primary truncate">{ev.name}</p>
                  <p className="text-[14px] text-slate-600 capitalize">{ev.type}
                    {ev.amount && <span className="ml-1" style={{ color: "#08695F" }}>+{ev.amount} XP</span>}
                  </p>
                  <p className="text-[14px] text-slate-700">
                    {ev.timestamp ? dFull(ev.timestamp) : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nav links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { to: "/teamlead/leaderboard", label: "TL Leaderboard", icon: TrendingUp, color: "#08695F" },
          { to: "/teamlead/badges",      label: "My Badges",      icon: Award,      color: "#7A5200" },
          { to: "/teamlead/titles",      label: "My Titles",      icon: Crown,      color: "#1948BD" },
          { to: "/teamlead/profile",     label: "My Profile",     icon: Star,       color: "#9A3A06" },
        ].map(({ to, label, icon: Icon, color }) => (
          <Link key={to} to={to}
            className="flex items-center gap-3 p-4 rounded-2xl border transition-all hover:border-opacity-60"
            style={{ background: "linear-gradient(135deg,#FFFFFF,#F5F6FA)", borderColor: `${color}25` }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}15` }}>
              <Icon size={16} style={{ color }} />
            </span>
            <span className="text-sm font-bold text-text-primary">{label}</span>
            <ChevronRight size={13} className="ml-auto text-slate-700" />
          </Link>
        ))}
      </div>
    </div>
  );
}
