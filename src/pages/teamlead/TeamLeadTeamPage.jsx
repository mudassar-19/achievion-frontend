import { useEffect, useState, useCallback } from "react";
import { hpColor } from "@/utils/hpTier";
import { motion }          from "framer-motion";
import { Users, Loader2, RefreshCw, AlertTriangle, Heart, FolderKanban, ChevronRight, CheckCircle2, Layers, ArrowLeft } from "lucide-react";
import api from "@/lib/api";

import TallyLoader from "@/components/ui/TallyLoader";
const TEAL = "#08695F";

const TIER_CFG = {
  "Free":              { color: "#0E6A30", bg: "rgba(18,128,59,0.10)"  },
  "Moderate Load":     { color: "#7A5200", bg: "rgba(234,179,8,0.10)"   },
  "Busy":              { color: "#9A3A06", bg: "rgba(232,89,12,0.10)"  },
  "Critical Overload": { color: "#B01F17", bg: "rgba(209,41,31,0.10)"   },
};
function tierCfg(w) { return TIER_CFG[w] ?? TIER_CFG["Free"]; }

const STATUS_COLOR = {
  active:      "#0E6A30",
  "in-progress": "#1948BD",
  planning:    "#1948BD",
  completed:   "#08695F",
  on_hold:     "#7A5200",
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

// ── Util bar ──────────────────────────────────────────────────────────────────
function UtilBar({ value, color }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-ink/[0.06] overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color, boxShadow: "var(--shadow-1)" }}
      />
    </div>
  );
}

function HpBar({ hp = 100 }) {
  const color = hpColor(hp);
  return (
    <div className="flex items-center gap-2">
      <Heart size={10} strokeWidth={2} style={{ color }} />
      <div className="h-1 flex-1 rounded-full bg-ink/[0.06] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${hp}%`, background: color }} />
      </div>
      <span className="text-[14px] tabular-nums" style={{ color }}>{hp}</span>
    </div>
  );
}

// ── Project selector card ─────────────────────────────────────────────────────
function ProjectCard({ project, onSelect }) {
  const sc = STATUS_COLOR[project.status?.toLowerCase()] ?? TEAL;
  const progress = project.progress ?? 0;
  return (
    <motion.div
      variants={fadeUp}
      onClick={() => onSelect(project)}
      className="group cursor-pointer rounded-2xl border p-5 transition-all hover:border-ink/20"
      style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.07)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0" style={{ background: `${TEAL}12` }}>
          <FolderKanban size={16} strokeWidth={1.75} style={{ color: "#08695F" }} />
        </div>
        <span
          className="text-[14px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0"
          style={{ background: `${sc}15`, color: sc, border: `1px solid ${sc}25` }}
        >
          {project.status ?? "active"}
        </span>
      </div>

      <h3 className="text-sm font-bold text-text-primary mb-1 leading-snug">{project.title}</h3>
      {project.description && (
        <p className="text-[14px] text-slate-600 line-clamp-2 mb-3">{project.description}</p>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[14px] mb-1">
          <span className="text-slate-600">Progress</span>
          <span className="font-bold" style={{ color: "#08695F" }}>{progress}%</span>
        </div>
        <UtilBar value={progress} color={TEAL} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[14px] text-slate-600">
          {project.memberCount !== undefined && (
            <span className="flex items-center gap-1">
              <Users size={9} strokeWidth={2} /> {project.memberCount} members
            </span>
          )}
          {project.milestoneCount !== undefined && (
            <span className="flex items-center gap-1">
              <Layers size={9} strokeWidth={2} /> {project.milestoneCount} milestones
            </span>
          )}
        </div>
        <ChevronRight size={13} strokeWidth={2} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
      </div>
    </motion.div>
  );
}

// ── Per-project member card ────────────────────────────────────────────────────
function MemberCard({ m }) {
  const workloadKey = m.workloadTier ?? m.workload ?? "Free";
  const cfg  = tierCfg(workloadKey);
  const util = m.utilisation ?? m.workloadPct ?? 0;

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl border p-4 flex flex-col gap-3"
      style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: `${cfg.color}18` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black shrink-0"
            style={{ background: cfg.color, color: "var(--on-accent)" }}
          >
            {m.name?.[0]?.toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">{m.name}</p>
            <p className="text-[14px] text-slate-500 truncate">{m.role}</p>
          </div>
        </div>
        <span
          className="text-[14px] font-bold px-2 py-1 rounded-lg shrink-0"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25` }}
        >
          {workloadKey}
        </span>
      </div>

      {/* Util bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[14px] text-slate-500">Utilisation</span>
          <span className="text-[14px] font-bold tabular-nums" style={{ color: cfg.color }}>{util}%</span>
        </div>
        <UtilBar value={util} color={cfg.color} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { label: "Tasks",   value: m.openTasks ?? m.activeTaskCount ?? 0, color: "#3A4660" },
          { label: "Free",    value: `${m.remainingH ?? m.availableHours ?? 0}h`, color: "#0E6A30" },
          { label: "Level",   value: `Lv${m.level ?? 1}`, color: "#1948BD" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg py-2 text-center" style={{ background: "rgba(20,32,61,0.03)", border: "1px solid rgba(20,32,61,0.04)" }}>
            <p className="text-xs font-black tabular-nums" style={{ color }}>{value}</p>
            <p className="text-[14px] text-slate-600">{label}</p>
          </div>
        ))}
      </div>

      <HpBar hp={m.hp ?? 100} />
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeamLeadTeamPage() {
  const [projects,       setProjects]       = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [members,        setMembers]        = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMembers,  setLoadingMembers]  = useState(false);
  const [error,          setError]          = useState(null);

  // Load projects list
  const loadProjects = useCallback(() => {
    setLoadingProjects(true);
    api.get("/api/teamlead/projects")
      .then((d) => setProjects(d.projects ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingProjects(false));
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // Load members for selected project
  const loadMembers = useCallback((projectId) => {
    setLoadingMembers(true);
    api.get(`/api/teamlead/projects/${projectId}/members-workload`)
      .then((d) => setMembers(d.members ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingMembers(false));
  }, []);

  function selectProject(project) {
    setSelectedProject(project);
    setMembers([]);
    loadMembers(project.id ?? project._id);
  }

  function goBack() {
    setSelectedProject(null);
    setMembers([]);
    setError(null);
  }

  // Summary for selected project members
  const free     = members.filter((m) => (m.workloadTier ?? m.workload) === "Free").length;
  const highLoad = members.filter((m) => ["Busy", "Critical Overload"].includes(m.workloadTier ?? m.workload ?? m.workload)).length;

  // ── Render: project-member drill-down ──
  if (selectedProject) {
    return (
      <div className="px-4 sm:px-8 py-8 max-w-[1100px] mx-auto flex flex-col gap-6">
        {/* Back header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button onClick={goBack} className="flex items-center gap-2 text-xs text-slate-500 hover:text-teal-400 transition-colors mb-1.5">
              <ArrowLeft size={13} strokeWidth={2} /> All Projects
            </button>
            <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
              <Users size={20} strokeWidth={1.75} style={{ color: "#08695F" }} />
              {selectedProject.title}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Team members assigned to this project</p>
          </div>
          <button
            onClick={() => loadMembers(selectedProject.id ?? selectedProject._id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-ink/10 text-slate-400 hover:text-text-primary hover:border-ink/20 transition-all"
          >
            <RefreshCw size={13} strokeWidth={2} /> Refresh
          </button>
        </div>

        {/* Member summary chips */}
        {!loadingMembers && members.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {[
              { icon: Users,        label: "Total Members",    value: members.length, color: "#08695F"       },
              { icon: CheckCircle2, label: "Available",         value: free,           color: "#0E6A30"  },
              { icon: AlertTriangle,label: "High / Critical",   value: highLoad,       color: "#7A5200"  },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border" style={{ background: `${color}08`, borderColor: `${color}20` }}>
                <Icon size={13} strokeWidth={1.75} style={{ color }} />
                <span className="text-sm font-black tabular-nums" style={{ color }}>{value}</span>
                <span className="text-[14px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Members grid */}
        {loadingMembers ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={26} className="animate-spin" style={{ color: "#08695F" }} strokeWidth={1.5} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertTriangle size={26} className="text-red-400" strokeWidth={1.5} />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users size={26} className="text-slate-700" strokeWidth={1.2} />
            <p className="text-sm text-slate-600">No members found for this project.</p>
          </div>
        ) : (
          <motion.div
            initial="hidden" animate="show" variants={stagger}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {members.map((m) => <MemberCard key={m.id} m={m} />)}
          </motion.div>
        )}
      </div>
    );
  }

  // ── Render: project list ──
  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1100px] mx-auto flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2.5">
            <Users size={20} strokeWidth={1.75} style={{ color: "#08695F" }} />
            Team Overview
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Select a project to view its team members and workload.</p>
        </div>
        <button
          onClick={loadProjects}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-ink/10 text-slate-400 hover:text-text-primary hover:border-ink/20 transition-all"
        >
          <RefreshCw size={13} strokeWidth={2} /> Refresh
        </button>
      </div>

      {loadingProjects ? (
        <div className="flex items-center justify-center py-24">
          <TallyLoader />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertTriangle size={26} className="text-red-400" strokeWidth={1.5} />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={loadProjects} className="text-xs text-teal-500 underline">Retry</button>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <FolderKanban size={28} className="text-slate-700" strokeWidth={1.2} />
          <p className="text-sm text-slate-600 font-medium">No projects assigned yet.</p>
        </div>
      ) : (
        <motion.div
          initial="hidden" animate="show" variants={stagger}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {projects.map((p) => (
            <ProjectCard key={p.id ?? p._id} project={p} onSelect={selectProject} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
