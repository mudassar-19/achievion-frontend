import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate }           from "react-router-dom";
import { motion }                           from "framer-motion";
import {
  ChevronLeft, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, Circle,
  Users, TrendingUp, Calendar, Layers,
} from "lucide-react";
import api from "@/lib/api";

import TallyLoader from "@/components/ui/TallyLoader";
const TEAL = "#08695F";

const MS_STATUS_CFG = {
  Pending:       { color: "#3A4660", Icon: Circle,        label: "Pending"     },
  "In Progress": { color: "#1948BD", Icon: Clock,         label: "In Progress" },
  Delayed:       { color: "#B01F17", Icon: AlertTriangle, label: "Delayed"     },
  Completed:     { color: "#0E6A30", Icon: CheckCircle2,  label: "Completed"   },
};
function msCfg(s) { return MS_STATUS_CFG[s] ?? MS_STATUS_CFG["Pending"]; }

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

function ProgressBar({ value = 0, color = TEAL }) {
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

// ── Milestone Navigator Card ──────────────────────────────────────────────────
function MilestoneCard({ milestone, projectId, taskCount, doneCount, navigate }) {
  const cfg = msCfg(milestone.status);
  const pct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : (milestone.progress ?? 0);

  return (
    <motion.div
      variants={fadeUp}
      onClick={() => navigate(`/teamlead/projects/${projectId}/milestones/${milestone._id}`)}
      className="group flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-150 hover:border-ink/[0.15] hover:bg-ink/[0.015]"
      style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.07)" }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}25` }}
      >
        <cfg.Icon size={16} strokeWidth={1.75} style={{ color: cfg.color }} />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-sm font-bold text-text-primary truncate group-hover:text-[#138674] transition-colors">
            {milestone.title}
          </h3>
          <span
            className="px-2 py-0.5 rounded-full text-[14px] font-bold shrink-0"
            style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}25`, color: cfg.color }}
          >
            {cfg.label}
          </span>
          {milestone.activeRoles?.length > 0 && (
            <span className="hidden sm:block text-[14px] text-slate-600 shrink-0">
              {milestone.activeRoles.join(" · ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar value={pct} color={cfg.color} />
          </div>
          <span className="text-[14px] font-bold shrink-0 tabular-nums" style={{ color: cfg.color }}>{pct}%</span>
          <span className="text-[14px] text-slate-600 shrink-0">{doneCount}/{taskCount} tasks</span>
          {milestone.dueDate && (
            <span className="hidden sm:flex items-center gap-1 text-[14px] text-slate-600 shrink-0">
              <Calendar size={9} strokeWidth={2} />
              {new Date(milestone.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={15} className="shrink-0 text-slate-700 group-hover:text-teal-400 transition-colors" />
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TeamLeadProjectDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks,   setTasks]   = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchProject = useCallback(() =>
    api.get(`/api/teamlead/projects/${id}`)
      .then((d) => setProject(d))
      .catch((e) => setError(e.message))
  , [id]);

  const fetchTasks = useCallback(() =>
    api.get(`/api/teamlead/projects/${id}/tasks`)
      .then((d) => setTasks(Array.isArray(d) ? d : []))
      .catch(() => setTasks([]))
  , [id]);

  const fetchMembers = useCallback(() =>
    api.get(`/api/teamlead/projects/${id}/members-workload`)
      .then((d) => setMembers(d.members ?? []))
      .catch(() => setMembers([]))
  , [id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProject(), fetchTasks(), fetchMembers()])
      .finally(() => setLoading(false));
  }, [fetchProject, fetchTasks, fetchMembers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <TallyLoader />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle size={32} className="text-red-400" strokeWidth={1.5} />
        <p className="text-sm text-red-400">{error ?? "Project not found or access denied."}</p>
        <button onClick={() => navigate("/teamlead/projects")} className="text-xs text-slate-400 underline">
          Back to projects
        </button>
      </div>
    );
  }

  const pStatusColors = {
    Active: TEAL, Planning: "#1948BD", Delayed: "#B01F17",
    Completed: "#0E6A30", "On Hold": "#3A4660",
  };
  const pColor = pStatusColors[project.status] ?? "#3A4660";

  const milestones = project.milestones ?? [];

  // Build task counts per milestone
  const tasksByMilestone = {};
  for (const t of tasks) {
    if (!t.milestoneId) continue;
    const key = t.milestoneId.toString();
    if (!tasksByMilestone[key]) tasksByMilestone[key] = { total: 0, done: 0 };
    tasksByMilestone[key].total++;
    if (t.status === "Done") tasksByMilestone[key].done++;
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1100px] mx-auto flex flex-col gap-6">

      {/* ── Back ───────────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate("/teamlead/projects")}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors w-fit"
      >
        <ChevronLeft size={14} strokeWidth={2} /> Back to Projects
      </button>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-7 border"
        style={{
          background:  "linear-gradient(135deg, #F5F6FA 0%, #EAEDF4 40%, #F5F6FA 100%)",
          borderColor: `${pColor}20`,
          boxShadow:   "var(--shadow-1)",
        }}
      >
        <div
          className="absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl pointer-events-none"
          style={{ background: `${pColor}12` }}
        />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-text-primary">{project.title}</h1>
              <span
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: `${pColor}18`, border: `1px solid ${pColor}30`, color: pColor }}
              >
                {project.status}
              </span>
            </div>
            {project.description && <p className="text-sm text-slate-500 mb-1">{project.description}</p>}
            {project.clientName  && <p className="text-xs text-slate-600">Client: {project.clientName}</p>}
          </div>

          <div
            className="flex items-center gap-2 text-xs text-slate-600 bg-ink/[0.03] border border-ink/[0.06] rounded-xl px-4 py-2"
          >
            <Layers size={12} strokeWidth={2} style={{ color: "#08695F" }} />
            <span>Milestones are created by Managers</span>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Stats ─────────────────────────────────────────────────────── */}
      <motion.div
        initial="hidden" animate="show" variants={stagger}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Progress",    value: `${project.completion ?? 0}%`,               color: TEAL      },
          { label: "Milestones",  value: milestones.length,                            color: "#1948BD" },
          { label: "Total Tasks", value: project.taskCounts?.total ?? tasks.length,   color: "#1948BD" },
          { label: "Members",     value: (project.members ?? members).length,          color: "#7A5200" },
        ].map(({ label, value, color }) => (
          <motion.div
            key={label} variants={fadeUp}
            className="p-4 rounded-2xl border flex flex-col gap-0.5"
            style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.06)" }}
          >
            <span className="text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
            <span className="text-[14px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Overall Progress ───────────────────────────────────────────────── */}
      <div
        className="px-5 py-4 rounded-2xl border"
        style={{ background: "rgba(255,255,255,0.4)", borderColor: "rgba(20,32,61,0.06)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-400">Overall Project Progress</span>
          <span className="text-sm font-black tabular-nums" style={{ color: "#08695F" }}>{project.completion ?? 0}%</span>
        </div>
        <ProgressBar value={project.completion ?? 0} color={TEAL} />
      </div>

      {/* ── Team Members ──────────────────────────────────────────────────── */}
      {members.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl border"
          style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.06)" }}
        >
          <h2 className="text-sm font-black text-text-primary mb-3 flex items-center gap-2">
            <Users size={14} strokeWidth={1.75} style={{ color: "#08695F" }} />
            Team Members
          </h2>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const tier = m.workloadTier ?? m.workload ?? "";
              const TIER_COLORS = {
                "Free": "#0E6A30", "Moderate Load": "#7A5200",
                "Busy": "#9A3A06", "Critical Overload": "#B01F17",
              };
              const wlColor = m.workloadColor ?? TIER_COLORS[tier] ?? "#3A4660";
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                  style={{ background: "rgba(20,32,61,0.03)", borderColor: "rgba(20,32,61,0.07)" }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-black text-[#FFFFFF] shrink-0"
                    style={{ background: TEAL }}
                  >
                    {m.name?.[0]?.toUpperCase()}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-text-primary leading-tight">{m.name}</p>
                    <p className="text-[14px] text-slate-600 leading-tight">{m.role}</p>
                  </div>
                  {tier && (
                    <span className="text-[14px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${wlColor}15`, color: wlColor }}>
                      {tier}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Milestones List ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-text-primary flex items-center gap-2">
            <TrendingUp size={15} strokeWidth={1.75} style={{ color: "#08695F" }} />
            Milestones
          </h2>
          <span className="text-xs text-slate-600">
            {milestones.length} milestone{milestones.length !== 1 ? "s" : ""} · click to open
          </span>
        </div>

        {milestones.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-14 rounded-2xl border-2 border-dashed"
            style={{ borderColor: `${TEAL}15` }}
          >
            <TrendingUp size={28} className="text-slate-700 mb-2" strokeWidth={1.2} />
            <p className="text-sm text-slate-600 font-medium">No milestones yet</p>
            <p className="text-xs text-slate-700 mt-1">Milestones are planned by Managers during project setup</p>
          </div>
        ) : (
          <motion.div
            initial="hidden" animate="show" variants={stagger}
            className="flex flex-col gap-3"
          >
            {milestones.map((ms) => {
              const key = ms._id?.toString();
              const mc  = tasksByMilestone[key] ?? { total: 0, done: 0 };
              return (
                <MilestoneCard
                  key={ms._id}
                  milestone={ms}
                  projectId={id}
                  taskCount={mc.total}
                  doneCount={mc.done}
                  navigate={navigate}
                />
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
