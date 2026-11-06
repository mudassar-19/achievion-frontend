import { useState, useEffect, useMemo } from "react";
import { hpColor } from "@/utils/hpTier";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, Zap, Heart, Flame,
  AlertTriangle, CheckCircle2, CircleDot, Award,
  } from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";

import TallyLoader from "@/components/ui/TallyLoader";
import { avatarUrl } from "@/lib/avatar";
// ── Role color map ────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  Director:          "#1948BD",
  Manager:           "#1948BD",
  "Team Lead":       "#08695F",
  "Senior Developer":"#0E6A30",
  "Junior Developer":"#0E6A30",
  "Senior Designer": "#B01F17",
  "Junior Designer": "#B01F17",
  "Senior Tester":   "#7A5200",
  "Junior Tester":   "#7A5200",
};

function roleColor(role) {
  return ROLE_COLORS[role] ?? "#3A4660";
}

const ROLE_CATEGORIES = ["All", "Director", "Manager", "Team Lead", "Developer", "Designer", "Tester"];

function matchesCategory(role, cat) {
  if (cat === "All") return true;
  return role?.toLowerCase().includes(cat.toLowerCase());
}

// ── HP bar colour ─────────────────────────────────────────────────────────────
// hpColor: shared scale in @/utils/hpTier (V1 1.11g)

// ── Stat bar ──────────────────────────────────────────────────────────────────
function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 rounded-full bg-ink/[0.07] overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

// ── Member card ───────────────────────────────────────────────────────────────
function MemberCard({ member }) {
  const rc = roleColor(member.role);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22 }}
      className="rounded-2xl border border-ink/[0.07] bg-ink/[0.025] hover:bg-ink/[0.05] transition-colors duration-150 p-5 flex flex-col gap-4"
    >
      {/* Top row — avatar + name + role */}
      <div className="flex items-start gap-3">
        <div
          className="h-11 w-11 rounded-xl overflow-hidden flex-shrink-0 border"
          style={{ borderColor: `${rc}40`, boxShadow: "var(--shadow-1)" }}
        >
          <img
            src={avatarUrl("bottts", member.avatarSeed ?? member.name)}
            alt={member.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-text-primary truncate">{member.name}</p>
          <span
            className="text-[14px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5"
            style={{ background: `${rc}18`, color: rc }}
          >
            {member.role}
          </span>
        </div>
        {/* Level badge */}
        <div
          className="flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black border"
          style={{ background: `${rc}15`, borderColor: `${rc}35`, color: rc }}
        >
          {member.level}
        </div>
      </div>

      {/* XP bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-slate-500 flex items-center gap-1">
            <Zap size={9} strokeWidth={2.5} style={{ color: "#7A5200" }} /> XP
          </span>
          <span className="text-[14px] font-bold text-slate-500">
            {member.currentXp.toLocaleString()} / {member.maxXp.toLocaleString()}
          </span>
        </div>
        <MiniBar value={member.currentXp} max={member.maxXp} color={rc} />
      </div>

      {/* HP bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-slate-500 flex items-center gap-1">
            <Heart size={9} strokeWidth={2.5} style={{ color: hpColor(member.hp) }} /> HP
          </span>
          <span className="text-[14px] font-bold" style={{ color: hpColor(member.hp) }}>{member.hp}%</span>
        </div>
        <MiniBar value={member.hp} max={100} color={hpColor(member.hp)} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatPill icon={<CircleDot size={10} strokeWidth={2.5} className="text-[#1948BD]" />} value={member.tasks.inProgress} label="Active" />
        <StatPill icon={<CheckCircle2 size={10} strokeWidth={2.5} className="text-[#0E6A30]" />} value={member.tasks.done} label="Done" />
        <StatPill icon={<AlertTriangle size={10} strokeWidth={2.5} className="text-[#B01F17]" />} value={member.tasks.overdue} label="Late" />
        <StatPill icon={<Flame size={10} strokeWidth={2.5} className="text-[#9A3A06]" />} value={member.streak} label="Streak" />
      </div>

      {/* Footer — email + badges */}
      <div className="flex items-center justify-between border-t border-ink/[0.05] pt-3">
        <p className="text-[14px] text-slate-600 truncate flex-1">{member.email}</p>
        <span className="flex items-center gap-1 text-[14px] font-bold text-[#7A5200] flex-shrink-0">
          <Award size={10} strokeWidth={2.5} />
          {member.badgeCount}
        </span>
      </div>
    </motion.div>
  );
}

function StatPill({ icon, value, label }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-ink/[0.04] py-1.5 px-1">
      {icon}
      <p className="text-xs font-black text-text-primary leading-none">{value}</p>
      <p className="text-[14px] text-slate-600 font-semibold">{label}</p>
    </div>
  );
}

// ── Top stats strip ───────────────────────────────────────────────────────────
function TopStat({ label, value, sub, accent }) {
  return (
    <div
      className="flex-1 min-w-[110px] rounded-xl border px-4 py-3 flex flex-col gap-0.5"
      style={{ background: `${accent}09`, borderColor: `${accent}22` }}
    >
      <p className="text-[14px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-2xl font-black text-text-primary">{value}</p>
      {sub && <p className="text-[14px] text-slate-600 font-semibold">{sub}</p>}
    </div>
  );
}

// ── TeamOverviewPage ──────────────────────────────────────────────────────────
export default function TeamOverviewPage() {
  const theme = useRoleTheme();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [catTab,  setCatTab]  = useState("All");

  useEffect(() => {
    api.get("/api/manager/team-full")
      .then((r) => setMembers(Array.isArray(r) ? r : (r.data ?? [])))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => {
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q) || (m.department ?? "").toLowerCase().includes(q);
      const matchCat    = matchesCategory(m.role, catTab);
      return matchSearch && matchCat;
    });
  }, [members, search, catTab]);

  // Aggregate stats
  const totalMembers   = members.length;
  const activeMembers  = members.filter((m) => m.status === "active").length;
  const avgLevel       = totalMembers > 0 ? (members.reduce((s, m) => s + m.level, 0) / totalMembers).toFixed(1) : 0;
  const totalOverdue   = members.reduce((s, m) => s + (m.tasks?.overdue ?? 0), 0);
  const totalInProgress = members.reduce((s, m) => s + (m.tasks?.inProgress ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 min-h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600 mb-1 flex items-center gap-1.5">
            <Users size={11} strokeWidth={2.5} style={{ color: theme.text }} />
            Manager · Team Lead
          </p>
          <h1 className="text-3xl font-black text-text-primary">Team Overview</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" strokeWidth={2} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members…"
            className="bg-ink/[0.05] border border-ink/[0.10] rounded-xl pl-8 pr-4 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/30 transition-colors w-56"
          />
        </div>
      </motion.div>

      {/* Stats strip */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} className="flex gap-3 flex-wrap">
        <TopStat label="Total Members"  value={totalMembers}   sub={`${activeMembers} active`}          accent={theme.accent} />
        <TopStat label="In Progress"    value={totalInProgress} sub="open tasks across team"             accent={theme.accent} />
        <TopStat label="Overdue Tasks"  value={totalOverdue}   sub={totalOverdue > 0 ? "needs attention" : "all on time"} accent={theme.accent} />
        <TopStat label="Avg Level"      value={avgLevel}       sub="team experience"                    accent={theme.accent} />
      </motion.div>

      {/* Category filter tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex gap-2 flex-wrap">
        {ROLE_CATEGORIES.map((cat) => {
          const isActive = catTab === cat;
          return (
            <button
              key={cat}
              onClick={() => setCatTab(cat)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border transition-all duration-150"
              style={isActive ? {
                background:  theme.accent,
                color:       "var(--on-accent)",
                borderColor: theme.accent,
              } : {
                background:  "rgba(20,32,61,0.03)",
                color:       "#4F5B75",
                borderColor: "rgba(20,32,61,0.07)",
              }}
            >
              {cat}
            </button>
          );
        })}
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <TallyLoader />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <Users size={36} className="text-slate-700" />
          <p className="text-sm text-slate-500">{search || catTab !== "All" ? "No members match your filters." : "No team members found."}</p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence>
            {filtered.map((m) => (
              <MemberCard key={String(m.id ?? m._id)} member={m} accent={theme.accent} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
