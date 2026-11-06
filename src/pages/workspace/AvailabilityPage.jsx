import { useState, useEffect } from "react";
import { hpColor } from "@/utils/hpTier";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Users, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronUp, Zap, Heart, Search,
  Clock,
} from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";

import TallyLoader from "@/components/ui/TallyLoader";
import { avatarUrl } from "@/lib/avatar";
// ── Config ────────────────────────────────────────────────────────────────────
const AVAIL_CFG = {
  Available: { color: "#0E6A30", bg: "#12803B18", border: "#12803B30", label: "Available"  },
  Busy:      { color: "#9A3A06", bg: "#E8590C18", border: "#E8590C30", label: "Busy"       },
  Overloaded:{ color: "#B01F17", bg: "#D1291F18", border: "#D1291F30", label: "Overloaded" },
};

const PRIORITY_DOT = { Critical: "#B01F17", High: "#9A3A06", Medium: "#7A5200", Low: "#1948BD" };

const ROLE_COLORS = {
  Director:           "#1948BD", Manager:            "#1948BD",
  "Team Lead":        "#08695F", "Senior Developer":  "#0E6A30",
  "Junior Developer": "#0E6A30", "Senior Designer":   "#B01F17",
  "Junior Designer":  "#B01F17", "Senior Tester":     "#7A5200",
  "Junior Tester":    "#7A5200",
};

function fmtDeadlineBadge(d) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d) - Date.now()) / 86400000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d late`, color: "#B01F17" };
  if (diff === 0) return { label: "Due today",               color: "#9A3A06" };
  if (diff <= 2)  return { label: `${diff}d left`,           color: "#7A5200" };
  return null;
}

// ── HP bar color ───────────────────────────────────────────────────────────────
// hpColor: shared scale in @/utils/hpTier (V1 1.11g)

// ── Capacity Ring ──────────────────────────────────────────────────────────────
function CapacityRing({ score, avail }) {
  const cfg = AVAIL_CFG[avail] ?? AVAIL_CFG.Available;
  const r   = 18;
  const circ = 2 * Math.PI * r;
  const fill = circ - (score / 100) * circ;

  return (
    <svg width={44} height={44} viewBox="0 0 44 44" className="flex-shrink-0">
      <circle cx={22} cy={22} r={r} fill="none" stroke="rgba(20,32,61,0.06)" strokeWidth={4} />
      <circle
        cx={22} cy={22} r={r} fill="none"
        stroke={cfg.color} strokeWidth={4}
        strokeDasharray={circ}
        strokeDashoffset={fill}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x={22} y={26} textAnchor="middle" fontSize={9} fontWeight={800} fill={cfg.color}>
        {score}%
      </text>
    </svg>
  );
}

// ── Member Card ────────────────────────────────────────────────────────────────
function MemberCard({ member, accent }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = AVAIL_CFG[member.availability] ?? AVAIL_CFG.Available;
  const rc  = ROLE_COLORS[member.role] ?? "#3A4660";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-2xl border bg-ink/[0.02] overflow-hidden hover:border-ink/[0.12] transition-colors"
      style={{ borderColor: `${cfg.color}30` }}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Capacity ring */}
        <CapacityRing score={member.capacityScore} avail={member.availability} />

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="h-10 w-10 rounded-xl overflow-hidden border" style={{ borderColor: `${rc}45` }}>
            <img
              src={avatarUrl("bottts", member.avatarSeed)}
              alt={member.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          {/* Online dot */}
          <div
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#FFFFFF]"
            style={{ background: cfg.color }}
          />
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-text-primary truncate">{member.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[14px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${rc}18`, color: rc }}>
              {member.role}
            </span>
            {member.department && (
              <span className="text-[14px] text-slate-600 truncate">{member.department}</span>
            )}
          </div>
        </div>

        {/* Availability badge */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span
            className="text-[14px] font-black px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
          >
            {cfg.label}
          </span>
          <button
            onClick={() => setExpanded((o) => !o)}
            className="text-slate-600 hover:text-slate-700 transition-colors"
          >
            {expanded ? <ChevronUp size={13} strokeWidth={2.5} /> : <ChevronDown size={13} strokeWidth={2.5} />}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-ink/[0.05] border-t border-ink/[0.05]">
        {[
          { label: "Total",    value: member.tasks.total,      color: "#4F5B75" },
          { label: "Active",   value: member.tasks.inProgress, color: accent    },
          { label: "Overdue",  value: member.tasks.overdue,    color: member.tasks.overdue > 0 ? "#B01F17" : "#4F5B75" },
          { label: "Due Today",value: member.tasks.dueToday,   color: member.tasks.dueToday > 0 ? "#9A3A06" : "#4F5B75" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center py-2">
            <p className="text-sm font-black" style={{ color }}>{value}</p>
            <p className="text-[14px] font-bold uppercase tracking-wider text-slate-700">{label}</p>
          </div>
        ))}
      </div>

      {/* HP + XP bars */}
      <div className="px-4 py-3 border-t border-ink/[0.05] flex flex-col gap-2">
        {/* HP */}
        <div className="flex items-center gap-2">
          <Heart size={10} strokeWidth={2} style={{ color: hpColor(member.hp) }} className="flex-shrink-0" />
          <div className="flex-1 h-1.5 rounded-full bg-ink/[0.05]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${member.hp}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
              style={{ background: hpColor(member.hp) }}
            />
          </div>
          <span className="text-[14px] font-bold flex-shrink-0" style={{ color: hpColor(member.hp) }}>
            {member.hp}%
          </span>
        </div>
        {/* XP */}
        <div className="flex items-center gap-2">
          <Zap size={10} strokeWidth={2.5} style={{ color: accent }} className="flex-shrink-0" />
          <div className="flex-1 h-1.5 rounded-full bg-ink/[0.05]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (member.currentXp / member.maxXp) * 100)}%` }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="h-full rounded-full"
              style={{ background: accent }}
            />
          </div>
          <span className="text-[14px] font-bold text-slate-500 flex-shrink-0">Lv{member.level}</span>
        </div>
      </div>

      {/* Expanded task list */}
      <AnimatePresence>
        {expanded && member.tasks.list.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-ink/[0.05]"
          >
            <div className="px-4 py-3 flex flex-col gap-1.5">
              <p className="text-[14px] font-black uppercase tracking-widest text-slate-600 mb-1">Active Tasks</p>
              {member.tasks.list.map((t) => {
                const dl  = fmtDeadlineBadge(t.deadline);
                const pdot = PRIORITY_DOT[t.priority] ?? "#4F5B75";
                return (
                  <div key={String(t.id)} className="flex items-center gap-2 py-1.5 border-b border-ink/[0.04] last:border-0">
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: pdot }} />
                    <p className="text-[14px] text-slate-300 flex-1 truncate">{t.title}</p>
                    <span
                      className="text-[14px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                      style={{
                        background: t.status === "In-Progress" ? `${accent}18` : "rgba(20,32,61,0.05)",
                        color:      t.status === "In-Progress" ? accent          : "#4F5B75",
                      }}
                    >
                      {t.status}
                    </span>
                    {dl && (
                      <span className="text-[14px] font-bold flex-shrink-0" style={{ color: dl.color }}>
                        {dl.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── AvailabilityPage ──────────────────────────────────────────────────────────
export default function AvailabilityPage() {
  const theme = useRoleTheme();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [availF,  setAvailF]  = useState("");   // "Available" | "Busy" | "Overloaded" | ""
  const [deptF,   setDeptF]   = useState("");

  useEffect(() => {
    api.get("/api/manager/team-availability")
      .then((r) => setData(r.data ?? r))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const members = data?.members ?? [];
  const counts  = data?.counts  ?? { available: 0, busy: 0, overloaded: 0 };

  // Derive unique departments
  const depts = [...new Set(members.map((m) => m.department).filter(Boolean))].sort();

  // Filter + search
  const filtered = members.filter((m) => {
    if (availF && m.availability !== availF) return false;
    if (deptF  && m.department   !== deptF)  return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !m.role.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 min-h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600 mb-1 flex items-center gap-1.5">
          <Activity size={11} strokeWidth={2.5} style={{ color: theme.text }} />
          Team Lead
        </p>
        <h1 className="text-3xl font-black text-text-primary">Team Availability</h1>
        <p className="text-xs text-slate-500 mt-1">Real-time workload and capacity across your team.</p>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-24">
          <TallyLoader />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: "Total Members", value: data?.total ?? 0,   color: theme.text, icon: Users          },
              { label: "Available",     value: counts.available,   color: "#0E6A30",    icon: CheckCircle2   },
              { label: "Busy",          value: counts.busy,        color: "#9A3A06",    icon: Clock          },
              { label: "Overloaded",    value: counts.overloaded,  color: "#B01F17",    icon: AlertTriangle  },
            ].map(({ label, value, color, icon: Icon }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="rounded-2xl border border-ink/[0.07] bg-ink/[0.02] p-4 flex items-center gap-3 cursor-pointer hover:border-ink/[0.12] transition-colors"
                onClick={() => setAvailF((f) => (f === label && label !== "Total Members") ? "" : (label !== "Total Members" ? label : ""))}
                style={availF === label ? { borderColor: `${color}40`, background: `${color}08` } : {}}
              >
                <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                  <Icon size={16} strokeWidth={2} style={{ color }} />
                </div>
                <div>
                  <p className="text-2xl font-black" style={{ color }}>{value}</p>
                  <p className="text-[14px] font-black uppercase tracking-wider text-slate-600">{label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-wrap gap-3 items-center"
          >
            {/* Search */}
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" strokeWidth={2} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or role…"
                className="bg-ink/[0.04] border border-ink/[0.08] rounded-xl pl-8 pr-4 py-2 text-xs text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20 transition-colors w-48"
              />
            </div>

            {/* Availability filter */}
            <div className="flex gap-1.5">
              {["Available", "Busy", "Overloaded"].map((a) => {
                const cfg = AVAIL_CFG[a];
                return (
                  <button
                    key={a}
                    onClick={() => setAvailF((f) => f === a ? "" : a)}
                    className="text-[14px] font-bold px-3 py-1.5 rounded-xl border transition-all"
                    style={availF === a
                      ? { background: cfg.bg, color: cfg.color, borderColor: cfg.border }
                      : { color: "#4F5B75", borderColor: "rgba(20,32,61,0.07)", background: "rgba(20,32,61,0.02)" }}
                  >
                    {a}
                  </button>
                );
              })}
            </div>

            {/* Department filter */}
            {depts.length > 0 && (
              <select
                value={deptF}
                onChange={(e) => setDeptF(e.target.value)}
                className="bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-ink/20 transition-colors"
              >
                <option value="" className="bg-[#FFFFFF]">All Departments</option>
                {depts.map((d) => <option key={d} value={d} className="bg-[#FFFFFF]">{d}</option>)}
              </select>
            )}

            {(search || availF || deptF) && (
              <button
                onClick={() => { setSearch(""); setAvailF(""); setDeptF(""); }}
                className="text-[14px] font-bold text-slate-600 hover:text-slate-700 transition-colors"
              >
                Clear filters
              </button>
            )}

            <p className="ml-auto text-xs text-slate-600">
              {filtered.length} of {members.length} members
            </p>
          </motion.div>

          {/* Member grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Users size={36} className="text-slate-700" strokeWidth={1.5} />
              <p className="text-sm font-black text-text-primary">No members match your filters</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              <AnimatePresence>
                {filtered.map((member, i) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                  >
                    <MemberCard member={member} accent={theme.accent} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
