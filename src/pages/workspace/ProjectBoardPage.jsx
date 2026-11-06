import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, Shield,
  ChevronRight, Users, FolderKanban, CheckCircle2, RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";
import { avatarUrl } from "@/lib/avatar";

// ── Column config ──────────────────────────────────────────────────────────────
const COLUMNS = [
  { key: "Planning",   label: "Planning",    color: "#4F5B75", statuses: ["Planning"]             },
  { key: "Scheduled",  label: "Scheduled",   color: "#1948BD", statuses: ["Scheduled"]            },
  { key: "Active",     label: "Active",      color: "#0E6A30", statuses: ["Active"]               },
  { key: "In Review",  label: "In Review",   color: "#1948BD", statuses: ["In Review"]            },
  { key: "Delayed",    label: "Delayed",     color: "#9A3A06", statuses: ["Delayed"]              },
  { key: "On Hold",    label: "On Hold",     color: "#7A5200", statuses: ["On Hold"]              },
  { key: "Completed",  label: "Completed",   color: "var(--accent-text)", statuses: ["Completed", "Archived"]},
];

const RISK_COLOR = {
  Low:      "#0E6A30",
  Medium:   "#7A5200",
  High:     "#9A3A06",
  Critical: "#B01F17",
};

// Bands from server/services/projectHealth.js (D-077): >=70 On track, 40-69 At risk, <40 Off track.
function healthColor(score) {
  if (score >= 70) return "#0E6A30";
  if (score >= 40) return "#7A5200";
  return "#B01F17";
}

function daysLabel(date) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date) - Date.now()) / 86_400_000);
  if (diff < 0)   return { text: `${Math.abs(diff)}d overdue`, color: "#B01F17", urgent: true };
  if (diff === 0) return { text: "Due today",    color: "#9A3A06", urgent: true };
  if (diff <= 7)  return { text: `${diff}d left`, color: "#7A5200", urgent: false };
  return               { text: `${diff}d left`, color: "#4F5B75", urgent: false };
}

// ── Project Board Card ─────────────────────────────────────────────────────────
function BoardCard({ project, accent, onClick }) {
  const [hov, setHov] = useState(false);
  const hc = healthColor(project.healthScore ?? 100);
  const rc = RISK_COLOR[project.riskLevel] ?? "#4F5B75";
  const dl = daysLabel(project.deadline);
  const ms = project.milestones ?? { total: 0, completed: 0 };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      className="rounded-2xl border p-4 flex flex-col gap-3 cursor-pointer transition-all duration-200"
      style={{
        background:  hov ? "rgba(20,32,61,0.04)" : "rgba(20,32,61,0.025)",
        borderColor: hov ? `${accent}35`             : "rgba(20,32,61,0.08)",
        boxShadow:   hov ? `0 0 20px ${accent}12`    : "none",
      }}
    >
      {/* Title + open arrow */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-text-primary leading-snug truncate">{project.title}</p>
          {project.clientName && (
            <p className="text-[14px] text-slate-600 mt-0.5 truncate">{project.clientName}</p>
          )}
        </div>
        <ChevronRight size={13} className="text-slate-600 shrink-0 mt-0.5 transition-colors"
          style={{ color: hov ? accent : undefined }} />
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[14px]">
          <span className="text-slate-600 uppercase tracking-wider font-medium">Progress</span>
          <span className="font-black text-text-primary">{project.completion ?? 0}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-ink/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${project.completion ?? 0}%` }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accent}70, ${accent})` }}
          />
        </div>
      </div>

      {/* Risk + health row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Shield size={10} style={{ color: rc }} />
          <span className="text-[14px] font-bold" style={{ color: rc }}>{project.riskLevel ?? "Low"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity size={10} style={{ color: hc }} />
          <span className="text-[14px] font-bold" style={{ color: hc }} title={project.healthBand}>{project.healthScore ?? 100} · {project.healthBand}</span>
        </div>
        {dl && (
          <span className="ml-auto text-[14px] font-black" style={{ color: dl.color }}>
            {dl.text}
          </span>
        )}
      </div>

      {/* Stats mini-grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        <div className="text-center py-1.5 rounded-lg bg-ink/[0.03] border border-ink/[0.04]">
          <p className="text-xs font-black text-text-primary">{project.taskCounts?.total ?? 0}</p>
          <p className="text-[14px] text-slate-600 uppercase tracking-wide">Tasks</p>
        </div>
        <div className="text-center py-1.5 rounded-lg bg-ink/[0.03] border border-ink/[0.04]">
          <p className="text-xs font-black text-text-primary">{ms.completed}/{ms.total}</p>
          <p className="text-[14px] text-slate-600 uppercase tracking-wide">Milestones</p>
        </div>
        <div className="text-center py-1.5 rounded-lg bg-ink/[0.03] border border-ink/[0.04]">
          <p className="text-xs font-black" style={{ color: "#7A5200" }}>{(project.xpPool ?? 0) > 999 ? `${((project.xpPool ?? 0)/1000).toFixed(1)}k` : project.xpPool ?? 0}</p>
          <p className="text-[14px] text-slate-600 uppercase tracking-wide">XP</p>
        </div>
      </div>

      {/* Member avatars */}
      {(project.members?.length ?? 0) > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="flex items-center">
            {(project.members ?? []).slice(0, 5).map((m, i) => {
              const seed = typeof m === "object" ? (m.avatarSeed ?? m.name ?? m._id) : m;
              const key  = typeof m === "object" ? (m._id ?? i) : m;
              return (
                <div key={key}
                  className="w-5 h-5 rounded-full overflow-hidden border border-[#FFFFFF] shrink-0"
                  style={{ marginLeft: i === 0 ? 0 : "-4px", zIndex: 10 - i }}
                  title={typeof m === "object" ? m.name : undefined}
                >
                  <img src={avatarUrl("bottts", seed)} alt=""
                    className="w-full h-full object-cover" loading="lazy" />
                </div>
              );
            })}
          </div>
          <span className="text-[14px] text-slate-600">
            {project.members.length} member{project.members.length !== 1 ? "s" : ""}
          </span>
          {project.techStack?.length > 0 && (
            <span className="ml-auto text-[14px] text-slate-600">
              {project.techStack.slice(0, 2).join(", ")}{project.techStack.length > 2 ? ` +${project.techStack.length - 2}` : ""}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Board Column ───────────────────────────────────────────────────────────────
function BoardColumn({ col, projects, accent, navigate }) {
  return (
    <div className="flex flex-col gap-3 min-w-[260px] max-w-[260px]">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1 py-1 sticky top-0">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: col.color }} />
        <span className="text-[14px] font-black uppercase tracking-widest text-slate-400">{col.label}</span>
        <span
          className="ml-auto text-[14px] font-black px-2 py-0.5 rounded-full"
          style={{ background: `${col.color}18`, color: col.color }}
        >
          {projects.length}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px w-full rounded-full" style={{ background: `${col.color}30` }} />

      {/* Cards */}
      <div className="flex flex-col gap-2.5">
        <AnimatePresence>
          {projects.map((p) => (
            <BoardCard
              key={p.id}
              project={p}
              accent={accent}
              onClick={() => navigate(`/workspace/projects/${p.id}`)}
            />
          ))}
        </AnimatePresence>
        {projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-ink/[0.06] h-24 flex items-center justify-center">
            <p className="text-[14px] text-slate-700">No projects</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Resource Panel ─────────────────────────────────────────────────────────────
function ResourcePanel({ data }) {
  const members = data?.members ?? [];
  const overloaded = members.filter((m) => m.availability === "Overloaded");
  const available  = members.filter((m) => m.availability === "Available");

  return (
    <div className="flex flex-col gap-4 w-56 shrink-0">
      <p className="text-[14px] font-black uppercase tracking-widest text-slate-600 px-1">Resource Status</p>

      {/* Quick stats */}
      <div className="flex flex-col gap-2">
        {[
          { label: "Available",  value: data?.counts?.available  ?? 0, color: "#0E6A30" },
          { label: "Busy",       value: data?.counts?.busy       ?? 0, color: "#7A5200" },
          { label: "Overloaded", value: data?.counts?.overloaded ?? 0, color: "#B01F17" },
        ].map(({ label, value, color }) => (
          <div key={label}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
            style={{ background: `${color}08`, borderColor: `${color}20` }}>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span className="flex-1 text-[14px] text-slate-400 font-medium">{label}</span>
            <span className="text-sm font-black" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Overloaded members */}
      {overloaded.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle size={10} /> Overloaded
          </p>
          {overloaded.slice(0, 5).map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-rose-500/15 bg-rose-500/05">
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                <img src={avatarUrl("bottts", m.avatarSeed)} alt={m.name}
                  className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-text-primary truncate">{m.name}</p>
                <p className="text-[14px] text-slate-500 truncate">{m.tasks.inProgress} active tasks</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available members */}
      {available.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 size={10} /> Available
          </p>
          {available.slice(0, 5).map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-emerald-500/15 bg-emerald-500/04">
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
                <img src={avatarUrl("bottts", m.avatarSeed)} alt={m.name}
                  className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-text-primary truncate">{m.name}</p>
                <p className="text-[14px] text-slate-500 truncate">{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ProjectBoardPage ──────────────────────────────────────────────────────────
export default function ProjectBoardPage() {
  const navigate = useNavigate();
  const theme    = useRoleTheme();
  const accent   = theme.accent;

  const [projects,  setProjects]  = useState([]);
  const [workforce, setWorkforce] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,     setError]     = useState("");
  const [showResource, setShowResource] = useState(true);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const [proj, wf] = await Promise.all([
        api.get("/api/manager/projects"),
        api.get("/api/manager/workforce").catch(() => null),
      ]);
      setProjects(Array.isArray(proj) ? proj : []);
      setWorkforce(wf);
    } catch (err) {
      setError(err.message ?? "Failed to load board.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  // Group projects into columns
  const grouped = {};
  for (const col of COLUMNS) grouped[col.key] = [];
  for (const p of projects) {
    const col = COLUMNS.find((c) => c.statuses.includes(p.status));
    if (col) grouped[col.key].push(p);
  }

  const total   = projects.length;
  const active  = (grouped["Active"]?.length ?? 0);
  const delayed = (grouped["Delayed"]?.length ?? 0);
  const done    = (grouped["Completed"]?.length ?? 0);

  return (
    <div className="flex flex-col gap-5 px-4 sm:px-8 py-7 min-h-full">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600 mb-1">Execution</p>
          <h1 className="text-3xl font-black text-text-primary">Project Board</h1>
          <p className="text-sm text-slate-500 mt-0.5">Operational execution board — project flow by stage</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Resource panel toggle */}
          <button
            onClick={() => setShowResource((v) => !v)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all"
            style={{
              background:  showResource ? `${accent}12` : "rgba(20,32,61,0.04)",
              borderColor: showResource ? `${accent}40`  : "rgba(20,32,61,0.08)",
              color:       showResource ? accent          : "#4F5B75",
            }}
          >
            <Users size={13} /> Resources
          </button>

          {/* Refresh */}
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-ink/[0.08] text-slate-500 hover:text-text-primary hover:border-ink/20 transition-all"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* ── KPI strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.06 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Total Projects", value: total,   color: accent,    icon: FolderKanban },
          { label: "Active",         value: active,  color: "#0E6A30", icon: Activity     },
          { label: "Delayed",        value: delayed, color: "#9A3A06", icon: AlertTriangle },
          { label: "Completed",      value: done,    color: "var(--accent-text)", icon: CheckCircle2  },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
            style={{ background: `${color}07`, borderColor: `${color}22` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-black leading-none" style={{ color }}>{value}</p>
              <p className="text-[14px] text-slate-500 font-medium mt-0.5 uppercase tracking-wider">{label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Board body ── */}
      {loading ? (
        <div className="flex items-center justify-center flex-1 py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: `${accent}40`, borderTopColor: accent }} />
            <p className="text-sm text-slate-600">Loading board...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-rose-500/20">
          <AlertTriangle size={28} className="text-rose-400 mb-3" />
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      ) : (
        <div className="flex gap-5 min-h-0">

          {/* ── Kanban columns ── */}
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {COLUMNS.map((col) => (
                <BoardColumn
                  key={col.key}
                  col={col}
                  projects={grouped[col.key] ?? []}
                  accent={accent}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>

          {/* ── Resource panel ── */}
          <AnimatePresence>
            {showResource && (
              <motion.div
                initial={{ opacity: 0, x: 20, width: 0 }}
                animate={{ opacity: 1, x: 0, width: "auto" }}
                exit={{ opacity: 0, x: 20, width: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden shrink-0"
              >
                <div className="w-56 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                  <ResourcePanel data={workforce} accent={accent} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
