import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, TrendingUp, AlertTriangle, Users, CheckCircle2,
  FolderKanban, Clock, Flame, Zap, Shield, Activity,
  ChevronDown, ChevronUp, Star,
} from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";
import { avatarUrl } from "@/lib/avatar";

// ── Helpers ────────────────────────────────────────────────────────────────────
function burnoutColor(r) {
  if (r >= 70) return "#B01F17";
  if (r >= 40) return "#9A3A06";
  return "#0E6A30";
}
function burnoutLabel(r) {
  if (r >= 70) return "High";
  if (r >= 40) return "Moderate";
  return "Low";
}
function utilColor(r) {
  if (r >= 80) return "#B01F17";
  if (r >= 50) return "#7A5200";
  return "#0E6A30";
}

const STATUS_COLORS = {
  Planning:    "#4F5B75",
  Scheduled:   "#1948BD",
  Active:      "#0E6A30",
  "In Review": "#1948BD",
  Delayed:     "#9A3A06",
  "On Hold":   "#7A5200",
  Completed:   "var(--accent-text)",
  Archived:    "#4F5B75",
};
const PRIORITY_COLORS = {
  Critical: "#B01F17",
  High:     "#9A3A06",
  Medium:   "#7A5200",
  Low:      "#3A4660",
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div
      className="flex flex-col gap-2 p-5 rounded-2xl border"
      style={{ background: `${color}08`, borderColor: `${color}22` }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-[14px] text-slate-600">{sub}</p>}
    </div>
  );
}

// ── Progress Bar ───────────────────────────────────────────────────────────────
function Bar({ pct, color, height = 6 }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ background: "rgba(20,32,61,0.06)", height }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ background: color, height: "100%", borderRadius: 9999 }}
      />
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, accent }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
        <Icon size={15} style={{ color: accent }} />
      </div>
      <h2 className="text-base font-black text-text-primary">{title}</h2>
    </div>
  );
}

// ── Breakdown Bar Chart ────────────────────────────────────────────────────────
function BreakdownChart({ items, colorMap, labelKey, countKey }) {
  const total = items.reduce((s, i) => s + (i[countKey] ?? 0), 0);
  if (total === 0) return <p className="text-sm text-slate-600 py-2">No data</p>;
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => {
        const pct   = total > 0 ? Math.round(((item[countKey] ?? 0) / total) * 100) : 0;
        const color = colorMap[item[labelKey]] ?? "#4F5B75";
        return (
          <div key={item[labelKey]} className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-[14px] text-slate-400 truncate">{item[labelKey]}</div>
            <div className="flex-1"><Bar pct={pct} color={color} height={8} /></div>
            <div className="w-8 text-right text-[14px] font-bold text-slate-300 shrink-0">{item[countKey] ?? 0}</div>
            <div className="w-9 text-right text-[14px] text-slate-600 shrink-0">{pct}%</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Employee Row ───────────────────────────────────────────────────────────────
function EmployeeRow({ emp, rank, accent }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div layout className="rounded-xl border border-ink/[0.07] overflow-hidden" style={{ background: "rgba(20,32,61,0.025)" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 w-full px-4 py-3 text-left">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[14px] font-black shrink-0" style={{ background: `${accent}18`, color: accent }}>{rank}</div>
        <div className="w-8 h-8 rounded-xl overflow-hidden border border-ink/10 shrink-0">
          <img src={avatarUrl("bottts", emp.avatarSeed ?? emp.name)} alt={emp.name} className="w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-text-primary truncate">{emp.name}</p>
          <p className="text-[14px] text-slate-500">{emp.role}</p>
        </div>
        <div className="text-right shrink-0 mr-2">
          <p className="text-sm font-black" style={{ color: accent }}>{emp.completionRate}%</p>
          <p className="text-[14px] text-slate-600">completion</p>
        </div>
        {open ? <ChevronUp size={13} className="text-slate-500 shrink-0" /> : <ChevronDown size={13} className="text-slate-500 shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 border-t border-ink/[0.06] grid grid-cols-2 gap-3">
              <div>
                <p className="text-[14px] text-slate-500 mb-1">Utilization</p>
                <div className="flex items-center gap-2">
                  <Bar pct={emp.utilization} color={utilColor(emp.utilization)} height={6} />
                  <span className="text-[14px] font-bold shrink-0" style={{ color: utilColor(emp.utilization) }}>{emp.utilization}%</span>
                </div>
              </div>
              <div>
                <p className="text-[14px] text-slate-500 mb-1">Burnout Risk</p>
                <div className="flex items-center gap-2">
                  <Bar pct={emp.burnoutRisk} color={burnoutColor(emp.burnoutRisk)} height={6} />
                  <span className="text-[14px] font-bold shrink-0" style={{ color: burnoutColor(emp.burnoutRisk) }}>{burnoutLabel(emp.burnoutRisk)}</span>
                </div>
              </div>
              <div>
                <p className="text-[14px] text-slate-500 mb-1">Tasks</p>
                <p className="text-xs text-text-primary font-bold">
                  {emp.tasks?.done ?? 0}/{emp.tasks?.total ?? 0} done · {emp.tasks?.inProgress ?? 0} active · {emp.tasks?.overdue ?? 0} overdue
                </p>
              </div>
              <div>
                <p className="text-[14px] text-slate-500 mb-1">Level</p>
                <p className="text-xs text-text-primary font-bold">Lvl {emp.level ?? 1}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Burnout Card ───────────────────────────────────────────────────────────────
function BurnoutCard({ emp }) {
  const color = burnoutColor(emp.burnoutRisk);
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: `${color}08`, borderColor: `${color}22` }}>
      <div className="w-7 h-7 rounded-xl overflow-hidden border border-ink/10 shrink-0">
        <img src={avatarUrl("bottts", emp.avatarSeed ?? emp.name)} alt={emp.name} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-text-primary truncate">{emp.name}</p>
        <p className="text-[14px] text-slate-500">{emp.role}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black" style={{ color }}>{emp.burnoutRisk}%</p>
        <p className="text-[14px]" style={{ color }}>{burnoutLabel(emp.burnoutRisk)} Risk</p>
      </div>
    </div>
  );
}

// ── ReportsPage ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const theme  = useRoleTheme();
  const accent = theme.accent;

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.get("/api/manager/reports")
      .then((d) => setData(d))
      .catch((e) => setError(e.message ?? "Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: accent, borderTopColor: "transparent" }}
          />
          <p className="text-sm text-slate-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <AlertTriangle size={16} className="text-rose-400" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      </div>
    );
  }

  const { projectStats: ps, milestoneStats: ms, employeeStats: es } = data ?? {};

  return (
    <div className="flex flex-col gap-8 px-6 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text-primary">Reports &amp; Intelligence</h1>
        <p className="text-sm text-slate-500 mt-1">
          Live operational metrics — project health, workforce performance, and risk signals.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={ps?.total ?? 0}     color={accent}    icon={FolderKanban}  />
        <StatCard label="Active"         value={ps?.active ?? 0}    color="#0E6A30"   icon={Activity}      sub={`${ps?.planning ?? 0} in planning`} />
        <StatCard label="Completed"      value={ps?.completed ?? 0} color="var(--accent-text)"   icon={CheckCircle2}  sub={`${ps?.successRate ?? 0}% success rate`} />
        <StatCard label="Delayed"        value={ps?.delayed ?? 0}   color="#B01F17"   icon={AlertTriangle} sub={`${ps?.highRisk ?? 0} high-risk`} />
      </div>

      {/* Project Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-ink/[0.08] p-5" style={{ background: "rgba(20,32,61,0.02)" }}>
          <SectionHeader icon={BarChart3} title="Projects by Status" accent={accent} />
          <BreakdownChart items={ps?.byStatus ?? []} colorMap={STATUS_COLORS} labelKey="status" countKey="count" />
        </div>
        <div className="rounded-2xl border border-ink/[0.08] p-5" style={{ background: "rgba(20,32,61,0.02)" }}>
          <SectionHeader icon={Shield} title="Projects by Priority" accent={accent} />
          <BreakdownChart items={ps?.byPriority ?? []} colorMap={PRIORITY_COLORS} labelKey="priority" countKey="count" />
        </div>
      </div>

      {/* Milestone Stats */}
      <div className="rounded-2xl border border-ink/[0.08] p-5" style={{ background: "rgba(20,32,61,0.02)" }}>
        <SectionHeader icon={Zap} title="Milestone Performance" accent={accent} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Milestones" value={ms?.total ?? 0}        color={accent}    icon={Zap}          />
          <StatCard label="Completed"        value={ms?.completed ?? 0}    color="#0E6A30"   icon={CheckCircle2} sub={`${ms?.completionRate ?? 0}% rate`} />
          <StatCard label="Delayed"          value={ms?.delayed ?? 0}      color="#B01F17"   icon={Clock}        />
          <StatCard label="Completion Rate"  value={`${ms?.completionRate ?? 0}%`} color="var(--accent-text)" icon={TrendingUp} />
        </div>
      </div>

      {/* Workforce Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Employees" value={es?.total ?? 0}      color={accent}    icon={Users}  />
        <StatCard label="Overloaded"      value={es?.overloaded ?? 0} color="#B01F17"   icon={Flame}  sub="≥ 80% utilization" />
        <StatCard label="Avg Completion"  value={`${es?.avgCompletion ?? 0}%`} color="#0E6A30" icon={Star} sub="task completion rate" />
      </div>

      {/* Top Performers + Burnout Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-ink/[0.08] p-5" style={{ background: "rgba(20,32,61,0.02)" }}>
          <SectionHeader icon={Star} title="Top Performers" accent={accent} />
          {(es?.topPerformers ?? []).length === 0 ? (
            <p className="text-sm text-slate-600 py-2">No employee data yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(es?.topPerformers ?? []).map((emp, i) => (
                <EmployeeRow key={emp.id} emp={emp} rank={i + 1} accent={accent} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-ink/[0.08] p-5" style={{ background: "rgba(20,32,61,0.02)" }}>
          <SectionHeader icon={Flame} title="Burnout Risk Alerts" accent="#B01F17" />
          {(es?.burnoutRisks ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle2 size={28} className="text-emerald-500 opacity-60" />
              <p className="text-sm text-slate-500">No burnout risks detected</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(es?.burnoutRisks ?? []).map((emp) => (
                <BurnoutCard key={emp.id} emp={emp} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Employee Table */}
      <div className="rounded-2xl border border-ink/[0.08] p-5" style={{ background: "rgba(20,32,61,0.02)" }}>
        <SectionHeader icon={Users} title="All Employees — Performance Overview" accent={accent} />
        {(es?.all ?? []).length === 0 ? (
          <p className="text-sm text-slate-600 py-4 text-center">No employee data available.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...(es?.all ?? [])]
              .sort((a, b) => b.completionRate - a.completionRate)
              .map((emp, i) => (
                <EmployeeRow key={emp.id} emp={emp} rank={i + 1} accent={accent} />
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
