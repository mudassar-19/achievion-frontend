import { useState, useEffect } from "react";
import { hpColor } from "@/utils/hpTier";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, SlidersHorizontal, AlertTriangle,
  Activity, CheckCircle2, Flame,
  ChevronDown, Circle, FolderKanban,
} from "lucide-react";
import api from "@/lib/api";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { useRoleTheme } from "@/utils/roleTheme";
import { avatarUrl } from "@/lib/avatar";

// ── Availability config ────────────────────────────────────────────────────────
const AVAIL_CFG = {
  Available:  { color: "#0E6A30", bg: "rgba(18,128,59,0.12)",  dot: "#0E6A30"  },
  Busy:       { color: "#7A5200", bg: "rgba(255,194,26,0.12)",   dot: "#7A5200"  },
  Overloaded: { color: "#B01F17", bg: "rgba(209,41,31,0.12)",   dot: "#B01F17"  },
};

const ROLES = [
  "All Roles",
  "Director", "Manager", "Team Lead",
  "Senior Developer", "Senior Designer", "Senior Tester",
  "Developer", "Designer", "Tester",
];

const SORT_OPTIONS = [
  { value: "availability", label: "By Availability" },
  { value: "burnout_desc", label: "Burnout Risk ↓"  },
  { value: "utilization",  label: "Utilization ↓"  },
  { value: "projects_desc",label: "Most Projects"  },
  { value: "name_asc",     label: "Name A–Z"        },
  { value: "level_desc",   label: "Level ↓"         },
];

function burnoutColor(risk) {
  if (risk >= 70) return "#B01F17";
  if (risk >= 40) return "#9A3A06";
  return "#0E6A30";
}

function burnoutLabel(risk) {
  if (risk >= 70) return "High Risk";
  if (risk >= 40) return "Moderate";
  return "Low";
}

function utilizationColor(pct) {
  if (pct >= 80) return "#B01F17";
  if (pct >= 50) return "#7A5200";
  return "#0E6A30";
}


// ── Employee Card ──────────────────────────────────────────────────────────────
function EmployeeCard({ member, accent }) {
  const [expanded, setExpanded] = useState(false);
  const av = AVAIL_CFG[member.availability] ?? AVAIL_CFG.Available;
  const uc = utilizationColor(member.utilization);
  const bc = burnoutColor(member.burnoutRisk);
  const xpPct = member.maxXp > 0 ? Math.round((member.currentXp / member.maxXp) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl border overflow-hidden transition-all duration-200"
      style={{ borderColor: member.burnoutRisk >= 70 ? "rgba(209,41,31,0.20)" : "rgba(20,32,61,0.07)" }}
    >
      {/* ── Card body ── */}
      <div className="p-4 flex flex-col gap-3.5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-ink/10">
              <img
                src={avatarUrl("bottts", member.avatarSeed)}
                alt={member.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#FFFFFF]"
              style={{ background: av.dot }}
              title={member.availability}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-text-primary truncate">{member.name}</p>
            <p className="text-[14px] text-slate-500 truncate">{member.role}</p>
            {member.department && (
              <p className="text-[14px] text-slate-600 truncate">{member.department}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className="text-[14px] font-black px-2 py-0.5 rounded-full"
              style={{ color: av.color, background: av.bg }}
            >
              {member.availability}
            </span>
            <span className="text-[14px] font-bold text-slate-600">
              Lv.{member.level}
            </span>
          </div>
        </div>

        {/* Utilization bar */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-slate-500 font-medium uppercase tracking-wider">Utilization</span>
            <span className="font-black" style={{ color: uc }}>{member.utilization}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-ink/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${member.utilization}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${uc}80, ${uc})` }}
            />
          </div>
        </div>

        {/* XP bar */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-slate-500 font-medium uppercase tracking-wider">XP Progress</span>
            <span className="font-bold text-[#7A5200]">{member.currentXp.toLocaleString()} / {member.maxXp.toLocaleString()}</span>
          </div>
          <div className="h-1 w-full rounded-full bg-ink/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${xpPct}%`, background: "linear-gradient(90deg, #FFC21Aaa, #FFC21A)" }}
            />
          </div>
        </div>

        {/* HP bar */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-slate-500 font-medium uppercase tracking-wider">HP</span>
            <span className="font-bold" style={{ color: hpColor(member.hp) }}>
              {member.hp}/100
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-ink/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${member.hp}%`,
                background: hpColor(member.hp),
              }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {[
            { label: "Active",    value: member.tasks.inProgress, color: "#1948BD" },
            { label: "Overdue",   value: member.tasks.overdue,    color: "#B01F17" },
            { label: "Done",      value: member.tasks.done,       color: "#0E6A30" },
            { label: "Projects",  value: member.projects.length,  color: accent    },
          ].map(({ label, value, color }) => (
            <div key={label}
              className="flex flex-col items-center py-2 rounded-xl border border-ink/[0.05] bg-ink/[0.02] text-center">
              <p className="text-sm font-black leading-none" style={{ color }}>{value}</p>
              <p className="text-[14px] text-slate-600 mt-0.5 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        {/* Burnout + streak row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {member.burnoutRisk >= 40 && (
              <AlertTriangle size={11} style={{ color: bc }} />
            )}
            <span className="text-[14px] font-bold" style={{ color: bc }}>
              {burnoutLabel(member.burnoutRisk)} Burnout Risk
            </span>
            <span className="text-[14px] text-slate-600">
              ({member.burnoutRisk}%)
            </span>
          </div>
          {member.streak > 0 && (
            <div className="flex items-center gap-1 text-[14px] text-orange-400 font-bold">
              <Flame size={10} /> {member.streak}d streak
            </div>
          )}
        </div>

        {/* Projects list + expand */}
        {member.projects.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center justify-between w-full text-[14px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <FolderKanban size={10} /> {member.projects.length} Project{member.projects.length !== 1 ? "s" : ""}
              </span>
              <ChevronDown
                size={12}
                className="transition-transform duration-200"
                style={{ transform: expanded ? "rotate(180deg)" : "none" }}
              />
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-1 pt-1">
                    {member.projects.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-[14px]">
                        <Circle size={5} className="text-slate-600 shrink-0" />
                        <span className="text-slate-400 truncate flex-1">{p.title}</span>
                        <span className="text-slate-600 shrink-0">{p.status}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Active tasks preview */}
        {member.tasks.list.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-bold text-slate-600 uppercase tracking-wider">Active Tasks</p>
            {member.tasks.list.slice(0, 3).map((t) => {
              const overdue = t.deadline && new Date(t.deadline) < new Date();
              return (
                <div key={t.id} className="flex items-center gap-2 text-[14px]">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: t.status === "In-Progress" ? "#1F57E0" : t.status === "Blocked" ? "#B01F17" : "#4F5B75" }} />
                  <span className="text-slate-400 truncate flex-1">{t.title}</span>
                  {overdue && <AlertTriangle size={9} className="text-rose-400 shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── WorkforcePage ──────────────────────────────────────────────────────────────
export default function WorkforcePage() {
  const theme  = useRoleTheme();
  const accent = theme.accent;

  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [roleFilter,  setRoleFilter]  = useState("All Roles");
  const [availFilter, setAvailFilter] = useState("");
  const [sort,        setSort]        = useState("availability");
  const [showFilters, setShowFilters] = useState(false);

  const load = () => {
    setLoading(true); setError("");
    api.get("/api/manager/workforce")
      .then((d) => setData(d))
      .catch((err) => setError(err.message ?? "Failed to load workforce."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/set-state-in-effect

  const members = data?.members ?? [];

  // Filter
  const filtered = members.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) &&
        !m.role.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== "All Roles" && m.role !== roleFilter) return false;
    if (availFilter && m.availability !== availFilter) return false;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const ORDER = { Overloaded: 0, Busy: 1, Available: 2 };
    switch (sort) {
      case "availability":  return (ORDER[a.availability] ?? 3) - (ORDER[b.availability] ?? 3);
      case "burnout_desc":  return b.burnoutRisk - a.burnoutRisk;
      case "utilization":   return b.utilization - a.utilization;
      case "projects_desc": return b.projects.length - a.projects.length;
      case "name_asc":      return a.name.localeCompare(b.name);
      case "level_desc":    return b.level - a.level;
      default: return 0;
    }
  });

  return (
    <Page>
      <PageHeader title="Resources" subtitle="Team workload and capacity: who has room and who needs a lighter load." />

      {data && (
        <Panel title="Capacity" icon={Users} delay={0.05}>
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-ink/[0.05]">
            <StatCard label="Total members" value={data.total}             icon={Users}         color={accent} />
            <StatCard label="Available"     value={data.counts.available}  icon={CheckCircle2}  color="#0E6A30" />
            <StatCard label="Busy"          value={data.counts.busy}       icon={Activity}      color="#7A5200" />
            <StatCard label="Overloaded"    value={data.counts.overloaded} icon={AlertTriangle} color="#B01F17" />
          </div>
        </Panel>
      )}

      {/* ── Burnout alert ── */}
      {(data?.counts?.burnoutRisk ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#D1291F]/10 border border-[#D1291F]/25"
        >
          <AlertTriangle size={15} className="text-[#B01F17] shrink-0" />
          <p className="text-sm text-[#B01F17] font-medium">
            <span className="font-black">{data.counts.burnoutRisk}</span> team member{data.counts.burnoutRisk !== 1 ? "s" : ""} at elevated burnout risk — review their workload before assigning new tasks.
          </p>
        </motion.div>
      )}

      {/* ── Search + Filters ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or role..."
              className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20 transition-colors"
            />
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2.5 text-xs font-medium text-text-primary focus:outline-none focus:border-ink/20"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#FFFFFF]">{o.label}</option>
            ))}
          </select>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all"
            style={{
              background:  showFilters ? `${accent}12` : "rgba(20,32,61,0.04)",
              borderColor: showFilters ? `${accent}40`  : "rgba(20,32,61,0.08)",
              color:       showFilters ? accent          : "#4F5B75",
            }}
          >
            <SlidersHorizontal size={13} /> Filters
            {(roleFilter !== "All Roles" || availFilter) && (
              <span className="w-4 h-4 rounded-full text-[14px] font-black flex items-center justify-center"
                style={{ background: accent, color: "var(--on-accent)" }}>
                {(roleFilter !== "All Roles" ? 1 : 0) + (availFilter ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Expanded filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-6 flex-wrap pt-1">
                {/* Availability */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[14px] font-bold text-slate-500 uppercase tracking-wider">Availability:</span>
                  {["", "Available", "Busy", "Overloaded"].map((s) => {
                    const cfg = AVAIL_CFG[s];
                    return (
                      <button
                        key={s || "all"}
                        onClick={() => setAvailFilter(s)}
                        className="px-2.5 py-1 rounded-lg text-[14px] font-bold border transition-all"
                        style={{
                          background:  availFilter === s ? `${cfg?.color ?? accent}18` : "rgba(20,32,61,0.03)",
                          borderColor: availFilter === s ? `${cfg?.color ?? accent}40`  : "rgba(20,32,61,0.07)",
                          color:       availFilter === s ? (cfg?.color ?? accent)        : "#6D7B99",
                        }}
                      >
                        {s || "All"}
                      </button>
                    );
                  })}
                </div>
                {/* Role */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[14px] font-bold text-slate-500 uppercase tracking-wider">Role:</span>
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoleFilter(r)}
                      className="px-2.5 py-1 rounded-lg text-[14px] font-bold border transition-all"
                      style={{
                        background:  roleFilter === r ? `${accent}18` : "rgba(20,32,61,0.03)",
                        borderColor: roleFilter === r ? `${accent}40`  : "rgba(20,32,61,0.07)",
                        color:       roleFilter === r ? accent          : "#4F5B75",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result count */}
        <p className="text-[14px] text-slate-600">
          {sorted.length} of {members.length} members
          {search || roleFilter !== "All Roles" || availFilter ? " (filtered)" : ""}
        </p>
      </motion.div>

      {/* ── Content ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4" aria-busy="true" aria-label="Loading team">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-[380px] rounded-2xl" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : sorted.length === 0 ? (
        search || roleFilter !== "All Roles" || availFilter
          ? <EmptyState heading="No members match your filters." action={{ label: "Clear filters", onClick: () => { setSearch(""); setRoleFilter("All Roles"); setAvailFilter(""); } }} />
          : <EmptyState heading="No team members yet." action={{ label: "Open projects", to: "/manager/projects" }} />
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {sorted.map((m) => (
              <EmployeeCard key={m.id} member={m} accent={accent} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </Page>
  );
}
