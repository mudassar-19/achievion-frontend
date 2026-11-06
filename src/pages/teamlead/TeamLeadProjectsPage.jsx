import { useEffect, useState } from "react";
import { Link }               from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FolderKanban, Search, ChevronRight, Users, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

import TallyLoader from "@/components/ui/TallyLoader";
const TEAL = "#08695F";

const STATUS_CFG = {
  Active:      { color: TEAL,      bg: `${TEAL}12`,                border: `${TEAL}25`                },
  Planning:    { color: "#1948BD", bg: "rgba(31,87,224,0.12)",    border: "rgba(31,87,224,0.25)"    },
  Scheduled:   { color: "#7A5200", bg: "rgba(255,194,26,0.12)",     border: "rgba(255,194,26,0.25)"     },
  Delayed:     { color: "#B01F17", bg: "rgba(209,41,31,0.12)",     border: "rgba(209,41,31,0.25)"     },
  "On Hold":   { color: "#3A4660", bg: "rgba(79,91,117,0.12)",   border: "rgba(79,91,117,0.25)"   },
  "In Review": { color: "#1948BD", bg: "rgba(42,98,236,0.12)",    border: "rgba(42,98,236,0.25)"    },
  Completed:   { color: "#0E6A30", bg: "rgba(18,128,59,0.12)",    border: "rgba(18,128,59,0.25)"    },
};
function statusCfg(s) { return STATUS_CFG[s] ?? { color: "#3A4660", bg: "rgba(79,91,117,0.08)", border: "rgba(79,91,117,0.20)" }; }

function ProgressBar({ value = 0, color = TEAL }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full rounded-full bg-ink/[0.06] overflow-hidden">
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color, boxShadow: "var(--shadow-1)" }}
      />
    </div>
  );
}

const RISK_COLOR = { Low: "#0E6A30", Medium: "#7A5200", High: "#9A3A06", Critical: "#B01F17" };

export default function TeamLeadProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");

  useEffect(() => {
    api.get("/api/teamlead/projects")
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filter === "all" || p.status === filter;
    return matchSearch && matchStatus;
  });

  const statuses = ["all", "Active", "Planning", "Delayed", "Completed", "On Hold"];

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1100px] mx-auto flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-text-primary">Projects</h1>
        <p className="text-xs text-slate-500 mt-1">Projects you are assigned to as Team Lead</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2.5 rounded-xl border"
          style={{ background: `${TEAL}05`, borderColor: `${TEAL}20` }}
        >
          <Search size={13} strokeWidth={2} style={{ color: "#08695F" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-slate-600 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => {
            const cfg = statusCfg(s);
            const isActive = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{
                  background:  isActive ? (s === "all" ? `${TEAL}20` : cfg.bg) : "transparent",
                  border:      `1px solid ${isActive ? (s === "all" ? TEAL : cfg.color) : "rgba(20,32,61,0.08)"}`,
                  color:       isActive ? (s === "all" ? "#08695F" : cfg.color) : "#3A4660",
                }}
              >
                {s === "all" ? "All" : s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <TallyLoader />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed"
          style={{ borderColor: `${TEAL}15` }}
        >
          <FolderKanban size={32} className="text-slate-700 mb-3" strokeWidth={1.2} />
          <p className="text-sm text-slate-600 font-medium">
            {search ? "No projects match your search" : "No projects assigned yet"}
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <AnimatePresence>
            {filtered.map((p) => {
              const cfg      = statusCfg(p.status);
              const riskClr  = RISK_COLOR[p.riskLevel] ?? "#3A4660";
              const roles    = [...new Set((p.members ?? []).map((m) => {
                if (m.role?.includes("Developer")) return "Dev";
                if (m.role?.includes("Designer"))  return "Design";
                if (m.role?.includes("Tester"))    return "Testing";
                return null;
              }).filter(Boolean))];

              return (
                <motion.div
                  key={p.id}
                  variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.28 } } }}
                >
                  <Link
                    to={`/teamlead/projects/${p.id}`}
                    className="block p-5 rounded-2xl border transition-all duration-150 hover:border-ink/[0.15] hover:bg-ink/[0.018] group h-full"
                    style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.06)" }}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-text-primary group-hover:text-[#138674] transition-colors truncate">{p.title}</h3>
                        {p.clientName && (
                          <p className="text-[14px] text-slate-600 mt-0.5 truncate">{p.clientName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="px-2 py-0.5 rounded-full text-[14px] font-bold"
                          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                        >
                          {p.status}
                        </span>
                        <ChevronRight size={13} style={{ color: "#08695F" }} strokeWidth={2} />
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[14px] text-slate-600">Progress</span>
                        <span className="text-[14px] font-bold" style={{ color: cfg.color }}>{p.completion}%</span>
                      </div>
                      <ProgressBar value={p.completion} color={cfg.color} />
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-4 text-[14px] text-slate-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Users size={10} strokeWidth={2} /> {p.members?.length ?? 0} members
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={10} strokeWidth={2} />
                        {p.milestones.completed}/{p.milestones.total} milestones
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={10} strokeWidth={2} /> {p.taskCounts.done}/{p.taskCounts.total} tasks
                      </span>
                    </div>

                    {/* Footer tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {roles.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded-md text-[14px] font-bold uppercase tracking-wider"
                          style={{ background: `${TEAL}10`, border: `1px solid ${TEAL}20`, color: "#08695F" }}
                        >
                          {r}
                        </span>
                      ))}
                      {p.riskLevel && p.riskLevel !== "Low" && (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[14px] font-bold uppercase tracking-wider"
                          style={{ background: `${riskClr}10`, border: `1px solid ${riskClr}20`, color: riskClr }}
                        >
                          <AlertTriangle size={8} strokeWidth={2.5} /> {p.riskLevel} Risk
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
