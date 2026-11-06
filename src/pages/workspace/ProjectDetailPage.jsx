import FileLink from "@/components/ui/FileLink";
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, AlertTriangle, Clock,
  Paperclip, BarChart3, FileText,
  Calendar, Tag, Globe, Lock, ExternalLink,
  Users, TrendingUp, Activity, Flag, Circle,
  ChevronDown, ChevronUp, Download, Layers,
  Snowflake, Trash2, Play, Loader2,
} from "lucide-react";
import api, { API_URL } from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";
import useAuthStore from "@/stores/authStore";
import { avatarUrl } from "@/lib/avatar";

// ── Config ─────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  Planning:    { color: "#4F5B75", bg: "rgba(109,123,153,0.12)", dot: "#4F5B75" },
  Scheduled:   { color: "#1948BD", bg: "rgba(31,87,224,0.12)",  dot: "#1948BD" },
  Active:      { color: "#0E6A30", bg: "rgba(18,128,59,0.12)",  dot: "#0E6A30" },
  "On Hold":   { color: "#7A5200", bg: "rgba(255,194,26,0.12)",  dot: "#7A5200" },
  Delayed:     { color: "#9A3A06", bg: "rgba(232,89,12,0.12)",  dot: "#9A3A06" },
  "In Review": { color: "#1948BD", bg: "rgba(42,98,236,0.12)",  dot: "#1948BD" },
  Completed:   { color: "var(--accent-text)", bg: "rgba(6,182,212,0.12)",   dot: "var(--accent-text)" },
  Archived:    { color: "#4F5B75", bg: "rgba(71,85,105,0.12)",   dot: "#4F5B75" },
  Frozen:      { color: "#134986", bg: "rgba(147,197,253,0.12)", dot: "#134986" },
  Deleted:     { color: "#B01F17", bg: "rgba(209,41,31,0.10)",   dot: "#B01F17" },
};

const PRIORITY_CFG = {
  Critical: { color: "#B01F17", bg: "rgba(209,41,31,0.10)" },
  High:     { color: "#9A3A06", bg: "rgba(232,89,12,0.10)" },
  Medium:   { color: "#7A5200", bg: "rgba(255,194,26,0.10)"  },
  Low:      { color: "#0E6A30", bg: "rgba(18,128,59,0.10)" },
};

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
  if (diff < 0)   return { text: `${Math.abs(diff)}d overdue`, color: "#B01F17" };
  if (diff === 0) return { text: "Due today",    color: "#9A3A06" };
  if (diff <= 7)  return { text: `${diff}d left`, color: "#7A5200" };
  return               { text: `${diff}d left`, color: "#3A4660" };
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatBytes(b) {
  if (!b) return "";
  if (b < 1024)        return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function fileTypeIcon(mime) {
  if (mime?.includes("pdf"))   return "📄";
  if (mime?.includes("image")) return "🖼️";
  if (mime?.includes("word") || mime?.includes("doc")) return "📝";
  if (mime?.includes("csv"))   return "📊";
  return "📎";
}

function phaseStatus(ms) {
  if (ms.status) return ms.status;
  const now = Date.now();
  const end = ms.endDate ? new Date(ms.endDate).getTime() : null;
  const start = ms.startDate ? new Date(ms.startDate).getTime() : null;
  if (end && now > end)         return "Completed";
  if (start && now >= start)    return "Active";
  if (start && now < start)     return "Scheduled";
  return "Planning";
}

// ── Milestone Card ─────────────────────────────────────────────────────────────────
function PhaseCard({ ms, index, isActive, accent }) {
  const [expanded, setExpanded] = useState(isActive);
  const sc  = STATUS_CFG[phaseStatus(ms)] ?? STATUS_CFG.Planning;
  const dl  = daysLabel(ms.endDate ?? ms.dueDate);
  const progress = ms.progress ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: isActive ? `${accent}35` : "rgba(20,32,61,0.07)",
        background:  isActive ? `${accent}05` : "rgba(20,32,61,0.025)",
        boxShadow:   isActive ? `0 0 20px ${accent}10` : "none",
      }}
    >
      {/* Card header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {/* Index pill */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[14px] font-black shrink-0"
          style={{ background: isActive ? `${accent}20` : "rgba(20,32,61,0.06)", color: isActive ? accent : "#4F5B75" }}
        >
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-text-primary">{ms.title}</span>
            {isActive && (
              <span className="text-[14px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ background: `${accent}20`, color: accent }}>
                Active
              </span>
            )}
            <span
              className="text-[14px] font-black px-2 py-0.5 rounded-full border"
              style={{ color: sc.color, background: sc.bg, borderColor: `${sc.color}30` }}
            >
              {phaseStatus(ms)}
            </span>
          </div>
          {/* Progress bar inline */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 rounded-full bg-ink/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: isActive ? accent : sc.color }}
              />
            </div>
            <span className="text-[14px] font-black shrink-0" style={{ color: isActive ? accent : "#4F5B75" }}>
              {progress}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {dl && (
            <span className="text-[14px] font-bold hidden sm:block" style={{ color: dl.color }}>
              {dl.text}
            </span>
          )}
          {expanded ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
        </div>
      </button>

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 flex flex-col gap-3 border-t border-ink/[0.06]">
              {/* Description */}
              {ms.description && (
                <p className="text-[14px] text-slate-400 leading-relaxed break-words">{ms.description}</p>
              )}

              {/* Date range */}
              <div className="flex items-center gap-2 text-[14px]">
                <Calendar size={11} className="text-slate-600" />
                <span className="text-slate-500">
                  {formatDate(ms.startDate)} → {formatDate(ms.endDate ?? ms.dueDate)}
                </span>
                {dl && (
                  <span className="font-bold ml-1" style={{ color: dl.color }}>{dl.text}</span>
                )}
              </div>

              {/* Active roles */}
              {ms.activeRoles?.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[14px] font-bold text-slate-600 uppercase tracking-wider">Active Roles</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ms.activeRoles.map((r) => (
                      <span
                        key={r}
                        className="text-[14px] font-bold px-2.5 py-1 rounded-lg border"
                        style={{ color: accent, background: `${accent}10`, borderColor: `${accent}25` }}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliverables */}
              {ms.deliverables?.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[14px] font-bold text-slate-600 uppercase tracking-wider">Deliverables</p>
                  <div className="flex flex-col gap-1">
                    {ms.deliverables.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-[14px] text-slate-400">
                        <Circle size={7} className="text-slate-600 shrink-0" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── ProjectDetailPage ──────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const theme     = useRoleTheme();
  const accent    = theme.accent;
  const user      = useAuthStore((s) => s.user);
  const isManager = user?.role === "Manager";

  const [project,   setProject]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Freeze modal
  const [showFreeze,   setShowFreeze]   = useState(false);
  const [freezeReason, setFreezeReason] = useState("");
  const [freezing,     setFreezing]     = useState(false);
  const [freezeError,  setFreezeError]  = useState("");

  // Delete modal
  const [showDelete,   setShowDelete]   = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    api.get(`/api/manager/projects/${id}`)
      .then((d) => setProject(d))
      .catch((err) => setError(err.message ?? "Failed to load project."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFreeze = async () => {
    setFreezing(true); setFreezeError("");
    try {
      const data = await api.post(`/api/manager/projects/${id}/freeze`, { reason: freezeReason });
      setProject((p) => ({ ...p, isFrozen: data.isFrozen, status: data.project?.status ?? p.status, deadline: data.project?.deadline ?? p.deadline }));
      setShowFreeze(false); setFreezeReason("");
    } catch (e) {
      setFreezeError(e.message ?? "Failed to update freeze state.");
    } finally {
      setFreezing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteReason.trim()) { setDeleteError("Reason is required."); return; }
    setDeleting(true); setDeleteError("");
    try {
      await api.delete(`/api/manager/projects/${id}`, { body: JSON.stringify({ reason: deleteReason }) });
      navigate("/manager/projects");
    } catch (e) {
      setDeleteError(e.message ?? "Failed to delete project.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${accent}40`, borderTopColor: accent }} />
          <p className="text-sm text-slate-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-3">
        <AlertTriangle size={28} className="text-rose-400" />
        <p className="text-sm text-rose-400">{error || "Project not found."}</p>
        <button onClick={() => navigate("/manager/projects")}
          className="text-xs text-slate-500 hover:text-text-primary underline">
          Back to Projects
        </button>
      </div>
    );
  }

  const sc  = STATUS_CFG[project.status]    ?? STATUS_CFG.Planning;
  const pc  = PRIORITY_CFG[project.priority] ?? PRIORITY_CFG.Medium;
  const hc  = healthColor(project.healthScore ?? 100);
  const dl  = daysLabel(project.deadline);

  const milestones = project.milestones ?? [];
  const activeMsIdx = milestones.findIndex((m) => phaseStatus(m) === "Active");
  const upcoming = milestones
    .filter((m) => {
      const s = phaseStatus(m);
      return s !== "Completed" && s !== "Archived";
    })
    .sort((a, b) => new Date(a.endDate ?? a.dueDate ?? 0) - new Date(b.endDate ?? b.dueDate ?? 0))
    .slice(0, 3);

  const tc = project.taskCounts ?? {};
  const totalTasks = Object.values(tc).reduce((s, n) => s + (n ?? 0), 0);

  const TABS = [
    { key: "overview",    label: "Overview",     icon: Activity  },
    { key: "phases",      label: `Milestones (${milestones.length})`, icon: Layers  },
    { key: "team",        label: `Team (${project.members?.length ?? 0})`, icon: Users },
    { key: "attachments", label: `Files (${project.attachments?.length ?? 0})`, icon: Paperclip },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Page header ── */}
      <div className="px-4 sm:px-8 pt-6 pb-0 border-b border-ink/[0.06]">
        <button
          onClick={() => navigate("/manager/projects")}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-text-primary transition-colors mb-4"
        >
          <ChevronLeft size={14} /> All Projects
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 flex-wrap mb-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span
                className="text-[14px] font-black px-2.5 py-1 rounded-full border"
                style={{ color: sc.color, background: sc.bg, borderColor: `${sc.color}30` }}
              >
                {project.status}
              </span>
              <span
                className="text-[14px] font-bold px-2 py-0.5 rounded-md border"
                style={{ color: pc.color, background: pc.bg, borderColor: `${pc.color}30` }}
              >
                {project.priority}
              </span>
              {project.category && (
                <span className="text-[14px] text-slate-500 bg-ink/[0.04] border border-ink/[0.06] px-2 py-0.5 rounded-md">
                  {project.category}
                </span>
              )}
              {project.visibility === "org_wide"
                ? <Globe size={13} className="text-slate-500" title="Organisation Wide" />
                : <Lock  size={13} className="text-slate-500" title="Team Only" />
              }
              {project.isFrozen && (
                <span className="flex items-center gap-1 text-[14px] font-black px-2 py-0.5 rounded-full border border-blue-400/30 bg-blue-400/10 text-blue-300">
                  <Snowflake size={9} strokeWidth={2.5} /> Frozen
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-text-primary leading-snug">{project.title}</h1>
            {project.internalRef && (
              <p className="text-[14px] text-slate-600 mt-0.5 font-mono">{project.internalRef}</p>
            )}
          </div>

          {/* Manager action buttons */}
          {isManager && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { setFreezeReason(""); setFreezeError(""); setShowFreeze(true); }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-150 hover:opacity-80"
                style={project.isFrozen
                  ? { background: "rgba(147,197,253,0.12)", borderColor: "rgba(147,197,253,0.35)", color: "#134986" }
                  : { background: "rgba(147,197,253,0.07)", borderColor: "rgba(147,197,253,0.20)", color: "#134986" }}
              >
                {project.isFrozen ? <Play size={12} strokeWidth={2.5} /> : <Snowflake size={12} strokeWidth={2.5} />}
                {project.isFrozen ? "Unfreeze" : "Freeze"}
              </button>
              <button
                onClick={() => { setDeleteReason(""); setDeleteError(""); setShowDelete(true); }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-500/25 bg-rose-500/07 text-rose-400 hover:opacity-80 transition-all duration-150"
              >
                <Trash2 size={12} strokeWidth={2.5} />
                Delete
              </button>
            </div>
          )}
        </motion.div>

        {/* ── Quick KPI strip ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-5"
        >
          {/* Health */}
          <div className="flex flex-col gap-1 px-3 py-2.5 rounded-xl border"
            style={{ background: `${hc}07`, borderColor: `${hc}25` }}>
            <p className="text-[14px] font-bold text-slate-500 uppercase tracking-wider">Health</p>
            <p className="text-xl font-black" style={{ color: hc }}>{project.healthScore ?? 100}<span className="text-xs font-normal text-text-secondary">/100 · {project.healthBand}</span></p>
          </div>
          {/* Completion */}
          <div className="flex flex-col gap-1 px-3 py-2.5 rounded-xl border border-ink/[0.07] bg-ink/[0.025]">
            <p className="text-[14px] font-bold text-slate-500 uppercase tracking-wider">Done</p>
            <p className="text-xl font-black text-text-primary">{project.completion ?? 0}<span className="text-xs font-normal text-slate-600">%</span></p>
          </div>
          {/* Tasks */}
          <div className="flex flex-col gap-1 px-3 py-2.5 rounded-xl border border-ink/[0.07] bg-ink/[0.025]">
            <p className="text-[14px] font-bold text-slate-500 uppercase tracking-wider">Tasks</p>
            <p className="text-xl font-black text-text-primary">{totalTasks}</p>
          </div>
          {/* Milestones */}
          <div className="flex flex-col gap-1 px-3 py-2.5 rounded-xl border border-ink/[0.07] bg-ink/[0.025]">
            <p className="text-[14px] font-bold text-slate-500 uppercase tracking-wider">Milestones</p>
            <p className="text-xl font-black text-text-primary">{milestones.length}</p>
          </div>
          {/* XP Pool */}
          <div className="flex flex-col gap-1 px-3 py-2.5 rounded-xl border"
            style={{ background: "rgba(255,194,26,0.06)", borderColor: "rgba(255,194,26,0.20)" }}>
            <p className="text-[14px] font-bold text-slate-500 uppercase tracking-wider">XP Pool</p>
            <p className="text-xl font-black text-[#7A5200]">{(project.xpPool ?? 0).toLocaleString()}</p>
          </div>
          {/* Risk */}
          <div className="flex flex-col gap-1 px-3 py-2.5 rounded-xl border"
            style={{ background: `${RISK_COLOR[project.riskLevel] ?? "#6D7B99"}07`, borderColor: `${RISK_COLOR[project.riskLevel] ?? "#6D7B99"}25` }}>
            <p className="text-[14px] font-bold text-slate-500 uppercase tracking-wider">Risk</p>
            <p className="text-xl font-black" style={{ color: RISK_COLOR[project.riskLevel] ?? "#3A4660" }}>
              {project.riskLevel ?? "Low"}
            </p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all duration-150 border-b-2"
              style={{
                borderBottomColor: activeTab === t.key ? accent : "transparent",
                color:             activeTab === t.key ? accent : "#4F5B75",
              }}
            >
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Left — main */}
              <div className="lg:col-span-2 flex flex-col gap-5">
                {/* Description */}
                {project.description && (
                  <div className="glass-panel rounded-2xl p-5 border border-ink/[0.06]">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={14} style={{ color: accent }} />
                      <p className="text-[14px] font-black text-slate-400 uppercase tracking-widest">Description</p>
                    </div>
                    <div
                      className="prose-sm text-slate-300 leading-relaxed text-sm [&_h2]:text-base [&_h2]:font-black [&_h2]:text-text-primary [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-text-primary [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 break-words overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: project.description }}
                    />
                  </div>
                )}

                {/* Task breakdown */}
                <div className="glass-panel rounded-2xl p-5 border border-ink/[0.06]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={14} style={{ color: accent }} />
                      <p className="text-[14px] font-black text-slate-400 uppercase tracking-widest">Task Breakdown</p>
                    </div>
                    <Link
                      to={`/workspace/board?project=${id}`}
                      className="flex items-center gap-1 text-[14px] text-slate-500 hover:text-text-primary transition-colors"
                    >
                      Open Board <ExternalLink size={10} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                    {[
                      { label: "Backlog",     value: tc.backlog    ?? 0, color: "#4F5B75" },
                      { label: "To-Do",       value: tc.todo       ?? 0, color: "#1948BD" },
                      { label: "In Progress", value: tc.inProgress ?? 0, color: "#7A5200" },
                      { label: "In Review",   value: tc.inReview   ?? 0, color: "#1948BD" },
                      { label: "Done",        value: tc.done       ?? 0, color: "#0E6A30" },
                    ].map(({ label, value, color }) => (
                      <div key={label}
                        className="flex flex-col items-center py-3 rounded-xl border text-center"
                        style={{ background: `${color}08`, borderColor: `${color}25` }}>
                        <p className="text-xl font-black" style={{ color }}>{value}</p>
                        <p className="text-[14px] text-slate-600 mt-0.5 uppercase tracking-wide leading-tight">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[14px]">
                      <span className="text-slate-600">Overall Completion</span>
                      <span className="font-black text-text-primary">{project.completion ?? 0}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-ink/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${project.completion ?? 0}%` }}
                        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${accent}80, ${accent})` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Upcoming phases */}
                {upcoming.length > 0 && (
                  <div className="glass-panel rounded-2xl p-5 border border-ink/[0.06]">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock size={14} style={{ color: accent }} />
                      <p className="text-[14px] font-black text-slate-400 uppercase tracking-widest">Upcoming Deadlines</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {upcoming.map((ms, i) => {
                        const d = daysLabel(ms.endDate ?? ms.dueDate);
                        const pSt = phaseStatus(ms);
                        const c = STATUS_CFG[pSt]?.color ?? "#4F5B75";
                        return (
                          <div key={ms._id ?? i} className="flex items-center gap-3 py-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
                            <span className="flex-1 text-sm text-text-primary font-medium truncate">{ms.title}</span>
                            <span className="text-[14px] font-bold px-2 py-0.5 rounded"
                              style={{ color: c, background: `${c}15` }}>
                              {pSt}
                            </span>
                            {d && <span className="text-[14px] font-bold shrink-0" style={{ color: d.color }}>{d.text}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tech stack */}
                {project.techStack?.length > 0 && (
                  <div className="glass-panel rounded-2xl p-5 border border-ink/[0.06]">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag size={14} style={{ color: accent }} />
                      <p className="text-[14px] font-black text-slate-400 uppercase tracking-widest">Tech Stack</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.techStack.map((t) => (
                        <span key={t}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border"
                          style={{ color: accent, background: `${accent}10`, borderColor: `${accent}30` }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right — sidebar */}
              <div className="flex flex-col gap-4">
                {/* Timeline */}
                <div className="glass-panel rounded-2xl p-4 border border-ink/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={13} style={{ color: accent }} />
                    <p className="text-[14px] font-black text-slate-500 uppercase tracking-wider">Timeline</p>
                  </div>
                  <div className="flex flex-col gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Start</span>
                      <span className="text-text-primary font-medium">{formatDate(project.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Deadline</span>
                      <span className="text-text-primary font-medium">{formatDate(project.deadline)}</span>
                    </div>
                    {dl && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Status</span>
                        <span className="font-black" style={{ color: dl.color }}>{dl.text}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Milestone progress */}
                <div className="glass-panel rounded-2xl p-4 border border-ink/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={13} style={{ color: accent }} />
                    <p className="text-[14px] font-black text-slate-500 uppercase tracking-wider">Milestone Progress</p>
                  </div>
                  {milestones.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {[
                        { label: "Completed", color: "var(--accent-text)",  count: milestones.filter((m) => phaseStatus(m) === "Completed").length },
                        { label: "Active",    color: "#0E6A30",  count: milestones.filter((m) => phaseStatus(m) === "Active").length },
                        { label: "Scheduled", color: "#1948BD",  count: milestones.filter((m) => phaseStatus(m) === "Scheduled").length },
                        { label: "Delayed",   color: "#9A3A06",  count: milestones.filter((m) => phaseStatus(m) === "Delayed").length },
                      ].filter((r) => r.count > 0).map(({ label, color, count }) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                          <span className="flex-1 text-[14px] text-slate-400">{label}</span>
                          <span className="text-[14px] font-black text-text-primary">{count}</span>
                        </div>
                      ))}
                      <div className="mt-1 h-1.5 w-full rounded-full bg-ink/[0.06] overflow-hidden flex">
                        {milestones.length > 0 && (() => {
                          const comp = milestones.filter((m) => phaseStatus(m) === "Completed").length;
                          const pct  = Math.round((comp / milestones.length) * 100);
                          return (
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                              className="h-full rounded-full"
                              style={{ background: "var(--accent)" }}
                            />
                          );
                        })()}
                      </div>
                      <p className="text-[14px] text-slate-600 text-right">
                        {milestones.filter((m) => phaseStatus(m) === "Completed").length}/{milestones.length} complete
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">No phases defined.</p>
                  )}
                </div>

                {/* Project lead */}
                {project.managerId && (
                  <div className="glass-panel rounded-2xl p-4 border border-ink/[0.06]">
                    <div className="flex items-center gap-2 mb-3">
                      <Flag size={13} style={{ color: accent }} />
                      <p className="text-[14px] font-black text-slate-500 uppercase tracking-wider">Project Lead</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl overflow-hidden border border-ink/10 shrink-0">
                        <img
                          src={avatarUrl("bottts", project.managerId?.avatarSeed ?? project.managerId?.name ?? project.managerId)}
                          alt="manager"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-text-primary">{project.managerId?.name ?? "Manager"}</p>
                        <p className="text-[14px] text-slate-500">{project.managerId?.role ?? "Manager"}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick links */}
                <div className="glass-panel rounded-2xl p-4 border border-ink/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={13} style={{ color: accent }} />
                    <p className="text-[14px] font-black text-slate-500 uppercase tracking-wider">Quick Access</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      { to: `/workspace/board?project=${id}`,  label: "Task Board"     },
                      { to: `/manager/sprints?project=${id}`,  label: "Sprints"        },
                      { to: `/manager/reports?project=${id}`,  label: "Reports"        },
                    ].map(({ to, label }) => (
                      <Link
                        key={label}
                        to={to}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-text-primary hover:bg-ink/[0.04] border border-transparent hover:border-ink/[0.07] transition-all"
                      >
                        <ExternalLink size={11} /> {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PHASES ── */}
          {activeTab === "phases" && (
            <motion.div
              key="phases"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-black text-text-primary">Project Milestones</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {milestones.length} phase{milestones.length !== 1 ? "s" : ""} · click a phase to expand details
                  </p>
                </div>
                {activeMsIdx >= 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[14px] font-bold"
                    style={{ background: `${accent}15`, color: accent }}>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent }} />
                    Milestone {activeMsIdx + 1} active
                  </div>
                )}
              </div>

              {milestones.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {milestones.map((ms, i) => (
                    <PhaseCard
                      key={ms._id ?? i}
                      ms={ms}
                      index={i}
                      isActive={i === activeMsIdx}
                      accent={accent}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center rounded-2xl border-2 border-dashed border-ink/[0.06]">
                  <Layers size={28} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">No phases defined for this project.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── TEAM ── */}
          {activeTab === "team" && (
            <motion.div
              key="team"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-5">
                <h2 className="text-lg font-black text-text-primary">Team Members</h2>
                <p className="text-xs text-slate-500 mt-0.5">{project.members?.length ?? 0} members assigned to this project</p>
              </div>

              {(project.members?.length ?? 0) > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.members.map((m) => {
                    const member = typeof m === "object" ? m : { _id: m };
                    const seed   = member.avatarSeed ?? member.name ?? member._id;
                    return (
                      <div
                        key={member._id}
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-ink/[0.07] bg-ink/[0.025] hover:border-ink/[0.12] transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-ink/10 shrink-0">
                          <img
                            src={avatarUrl("bottts", seed)}
                            alt={member.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-text-primary truncate">{member.name ?? "Team Member"}</p>
                          <p className="text-[14px] text-slate-500">{member.role ?? "—"}</p>
                        </div>
                        {member.email && (
                          <p className="text-[14px] text-slate-600 truncate max-w-[120px]">{member.email}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center rounded-2xl border-2 border-dashed border-ink/[0.06]">
                  <Users size={28} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">No team members assigned yet.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── ATTACHMENTS ── */}
          {activeTab === "attachments" && (
            <motion.div
              key="attachments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-5">
                <h2 className="text-lg font-black text-text-primary">Project Files</h2>
                <p className="text-xs text-slate-500 mt-0.5">{project.attachments?.length ?? 0} files attached</p>
              </div>

              {(project.attachments?.length ?? 0) > 0 ? (
                <div className="flex flex-col gap-2">
                  {project.attachments.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-ink/[0.07] bg-ink/[0.025] hover:border-ink/[0.12] transition-all"
                    >
                      <span className="text-xl shrink-0">{fileTypeIcon(a.mimetype)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">{a.name}</p>
                        <p className="text-[14px] text-slate-500">
                          {a.mimetype?.split("/").pop()?.toUpperCase() ?? "FILE"} · {formatBytes(a.size)}
                          {a.uploadedAt && ` · ${formatDate(a.uploadedAt)}`}
                        </p>
                      </div>
                      <FileLink
                        href={`${API_URL}${a.filePath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-ink/[0.08] text-slate-400 hover:text-text-primary hover:border-ink/20 transition-all shrink-0"
                      >
                        <Download size={11} /> Download
                      </FileLink>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center rounded-2xl border-2 border-dashed border-ink/[0.06]">
                  <Paperclip size={28} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">No files attached to this project.</p>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Freeze Modal ── */}
      <AnimatePresence>
        {showFreeze && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(20,32,61,0.80)" }}
            onClick={(e) => e.target === e.currentTarget && setShowFreeze(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="w-full max-w-md rounded-2xl border p-6 flex flex-col gap-4"
              style={{ background: "linear-gradient(180deg,#EAEDF4,#FFFFFF)", borderColor: "rgba(147,197,253,0.25)" }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(147,197,253,0.12)" }}>
                  {project.isFrozen ? <Play size={18} className="text-blue-300" /> : <Snowflake size={18} className="text-blue-300" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-text-primary">{project.isFrozen ? "Unfreeze Project" : "Freeze Project"}</h3>
                  <p className="text-[14px] text-slate-500">{project.isFrozen ? "All systems resume from current state." : "All tasks, XP, streaks and deadlines pause."}</p>
                </div>
              </div>

              {!project.isFrozen && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[14px] font-bold text-slate-400 uppercase tracking-wider">Reason <span className="text-slate-600">(optional)</span></label>
                  <textarea
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value)}
                    placeholder="Why are you freezing this project?"
                    rows={3}
                    className="bg-ink/[0.04] border border-ink/[0.10] rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-slate-600 resize-none focus:outline-none focus:border-ink/25 transition-colors"
                  />
                </div>
              )}

              {freezeError && <p className="text-xs text-rose-400">{freezeError}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowFreeze(false)} className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-ink/[0.10] text-slate-400 hover:text-text-primary transition-all">Cancel</button>
                <button
                  onClick={handleFreeze} disabled={freezing}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: "rgba(147,197,253,0.18)", color: "#134986", border: "1px solid rgba(147,197,253,0.35)" }}
                >
                  {freezing ? <Loader2 size={13} className="animate-spin" /> : (project.isFrozen ? <Play size={13} /> : <Snowflake size={13} />)}
                  {freezing ? "Processing…" : (project.isFrozen ? "Unfreeze" : "Freeze Project")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Modal ── */}
      <AnimatePresence>
        {showDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(20,32,61,0.85)" }}
            onClick={(e) => e.target === e.currentTarget && setShowDelete(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="w-full max-w-md rounded-2xl border p-6 flex flex-col gap-4"
              style={{ background: "linear-gradient(180deg,#EAEDF4,#FFFFFF)", borderColor: "rgba(209,41,31,0.25)" }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(209,41,31,0.12)" }}>
                  <Trash2 size={18} className="text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-text-primary">Delete Project</h3>
                  <p className="text-[14px] text-slate-500">Project will be moved to Deleted Log. This cannot be undone.</p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-bold text-slate-400 uppercase tracking-wider">Reason <span className="text-rose-500">*</span></label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Explain why this project is being deleted…"
                  rows={3}
                  className="bg-ink/[0.04] border border-ink/[0.10] rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-slate-600 resize-none focus:outline-none focus:border-ink/25 transition-colors"
                />
              </div>

              {deleteError && <p className="text-xs text-rose-400">{deleteError}</p>}

              <div className="rounded-xl border border-rose-500/20 bg-rose-500/05 p-3">
                <p className="text-[14px] text-rose-300 font-semibold">⚠️ All active tasks will be paused. An audit trail entry will be created for the Director.</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-ink/[0.10] text-slate-400 hover:text-text-primary transition-all">Cancel</button>
                <button
                  onClick={handleDelete} disabled={deleting || !deleteReason.trim()}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: "rgba(209,41,31,0.15)", color: "#B01F17", border: "1px solid rgba(209,41,31,0.35)" }}
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  {deleting ? "Deleting…" : "Delete Project"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
