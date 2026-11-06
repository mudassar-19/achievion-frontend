import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, FolderKanban,
  CheckCircle2, Clock, Flame, FileEdit, Trash2, BarChart3,
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
import useUiStore from "@/stores/uiStore";
import { avatarUrl } from "@/lib/avatar";

const DRAFT_KEY = "achievion_project_drafts";

function loadDraftsFromStorage() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "[]"); }
  catch { return []; }
}

function removeDraftFromStorage(id) {
  const remaining = loadDraftsFromStorage().filter((d) => d.id !== id);
  localStorage.setItem(DRAFT_KEY, JSON.stringify(remaining));
}

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  Planning:   { color: "#4F5B75", bg: "rgba(109,123,153,0.12)", label: "Planning" },
  Scheduled:  { color: "#1948BD", bg: "rgba(31,87,224,0.12)",  label: "Scheduled" },
  Active:     { color: "#0E6A30", bg: "rgba(18,128,59,0.12)",  label: "Active" },
  "On Hold":  { color: "#7A5200", bg: "rgba(255,194,26,0.12)",  label: "On Hold" },
  Delayed:    { color: "#9A3A06", bg: "rgba(232,89,12,0.12)",  label: "Delayed" },
  "In Review":{ color: "#1948BD", bg: "rgba(42,98,236,0.12)",  label: "In Review" },
  Completed:  { color: "var(--accent-text)", bg: "rgba(6,182,212,0.12)",   label: "Completed" },
  Archived:   { color: "#4F5B75", bg: "rgba(71,85,105,0.12)",   label: "Archived" },
};

const PRIORITY_CFG = {
  Critical: { color: "#B01F17", bg: "rgba(209,41,31,0.12)" },
  High:     { color: "#9A3A06", bg: "rgba(232,89,12,0.12)" },
  Medium:   { color: "#7A5200", bg: "rgba(255,194,26,0.12)" },
  Low:      { color: "#0E6A30", bg: "rgba(18,128,59,0.12)" },
};

const PRIORITIES    = ["Critical", "High", "Medium", "Low"];
const STATUSES      = ["", "Planning", "Scheduled", "Active", "On Hold", "Delayed", "In Review", "Completed", "Archived"];
const SORT_OPTIONS  = [
  { value: "createdAt_desc", label: "Newest First" },
  { value: "createdAt_asc",  label: "Oldest First" },
  { value: "deadline_asc",   label: "Deadline (Soonest)" },
  { value: "title_asc",      label: "Title A–Z" },
];

// Workload badge for team member selection

// Bands from server/services/projectHealth.js (D-077): >=70 On track, 40-69 At risk, <40 Off track.
function healthColor(score) {
  if (score >= 70) return "#0E6A30";
  if (score >= 40) return "#7A5200";
  return "#B01F17";
}

function daysUntil(date) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date) - Date.now()) / 86_400_000);
  return diff;
}

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}


// ── Enriched Project Card ──────────────────────────────────────────────────────
function ProjectCard({ project, accent, onClick }) {
  const [hov, setHov] = useState(false);
  const sc = STATUS_CFG[project.status]   ?? STATUS_CFG.Planning;
  const pc = PRIORITY_CFG[project.priority] ?? PRIORITY_CFG.Medium;
  const days = daysUntil(project.deadline);
  const hc   = healthColor(project.healthScore ?? 100);
  const ms   = project.milestones ?? { total: 0, completed: 0 };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      className="glass-panel rounded-2xl p-5 flex flex-col gap-3.5 border cursor-pointer transition-all duration-200"
      style={{
        borderColor: hov ? `${accent}40` : "rgba(20,32,61,0.06)",
        boxShadow:   hov ? `0 0 28px ${accent}18` : "none",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-text-primary leading-snug truncate">{project.title}</h3>
          {project.clientName && (
            <p className="text-[14px] text-slate-500 mt-0.5 truncate">{project.clientName}</p>
          )}
        </div>
        <span
          className="shrink-0 text-[14px] font-black px-2.5 py-1 rounded-full border whitespace-nowrap"
          style={{ color: sc.color, background: sc.bg, borderColor: `${sc.color}30` }}
        >
          {project.status}
        </span>
      </div>

      {/* ── Meta chips ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-[14px] font-bold px-2 py-0.5 rounded-md border"
          style={{ color: pc.color, background: pc.bg, borderColor: `${pc.color}30` }}
        >
          {project.priority}
        </span>
        <span className="text-[14px] text-slate-500 bg-ink/[0.04] border border-ink/[0.06] px-2 py-0.5 rounded-md font-medium">
          {project.category}
        </span>
      </div>

      {/* ── Description ── */}
      {project.description && (
        <p className="text-[14px] text-slate-400 leading-relaxed line-clamp-2 break-words">
          {stripHtml(project.description)}
        </p>
      )}

      {/* ── Health bar ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold uppercase tracking-widest text-slate-600">Health</span>
          <span className="text-[14px] font-black" style={{ color: hc }}>
            {project.healthScore ?? 100} · {project.healthBand ?? ""}
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-ink/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${project.healthScore ?? 100}%` }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
            className="h-full rounded-full"
            style={{ background: hc }}
          />
        </div>
      </div>

      {/* ── Progress / Completion ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold uppercase tracking-widest text-slate-600">Progress</span>
          <span className="text-[14px] font-black text-text-primary">{project.completion}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-ink/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${project.completion}%` }}
            transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accent}80, ${accent})` }}
          />
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="text-center rounded-xl bg-ink/[0.03] border border-ink/[0.05] p-2">
          <p className="text-[14px] font-black text-text-primary leading-none">{project.taskCounts?.total ?? 0}</p>
          <p className="text-[14px] text-slate-600 mt-0.5 uppercase tracking-wider">Tasks</p>
        </div>
        <div className="text-center rounded-xl bg-ink/[0.03] border border-ink/[0.05] p-2">
          <p className="text-[14px] font-black text-text-primary leading-none">
            {ms.completed}/{ms.total}
          </p>
          <p className="text-[14px] text-slate-600 mt-0.5 uppercase tracking-wider">Milestones</p>
        </div>
        <div className="text-center rounded-xl bg-ink/[0.03] border border-ink/[0.05] p-2">
          <p className="text-[14px] font-black leading-none" style={{ color: hov ? accent : "#7A5200" }}>
            {(project.xpPool ?? 0).toLocaleString()}
          </p>
          <p className="text-[14px] text-slate-600 mt-0.5 uppercase tracking-wider">XP Pool</p>
        </div>
      </div>

      {/* ── Tech stack ── */}
      {project.techStack?.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {project.techStack.slice(0, 4).map((t) => (
            <span
              key={t}
              className="text-[14px] text-slate-400 bg-ink/[0.04] border border-ink/[0.06] px-2 py-0.5 rounded-md"
            >
              {t}
            </span>
          ))}
          {project.techStack.length > 4 && (
            <span className="text-[14px] text-slate-600">+{project.techStack.length - 4}</span>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between pt-2 border-t border-ink/[0.05]">
        {/* Team avatars */}
        <div className="flex items-center">
          {(project.members ?? []).slice(0, 4).map((m, i) => {
            const seed = typeof m === "object" ? (m.avatarSeed ?? m.name ?? m._id) : m;
            const key  = typeof m === "object" ? (m._id ?? i) : m;
            return (
              <div
                key={key}
                className="h-6 w-6 rounded-full overflow-hidden bg-bg-base border-2 border-[#FFFFFF] shrink-0"
                style={{ marginLeft: i === 0 ? 0 : "-6px", zIndex: 10 - i }}
                title={typeof m === "object" ? m.name : undefined}
              >
                <img
                  src={avatarUrl("bottts", seed)}
                  alt="member"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            );
          })}
          {(project.members?.length ?? 0) === 0 && (
            <span className="text-[14px] text-slate-600">No members</span>
          )}
          {(project.members?.length ?? 0) > 0 && (
            <span className="ml-2 text-[14px] text-slate-600 font-medium">
              {project.members.length} member{project.members.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Deadline */}
        {days !== null && (
          <span
            className="text-[14px] font-bold"
            style={{ color: days < 0 ? "#B01F17" : days <= 7 ? "#9A3A06" : "#4F5B75" }}
          >
            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
          </span>
        )}
      </div>
    </motion.div>
  );
}
// ── Draft Card ─────────────────────────────────────────────────────────────────
const STEP_NAMES = ["Identity", "Timeline", "Milestones", "Team & Tech"];

function DraftCard({ draft, accent, onContinue, onDelete }) {
  const [now] = useState(() => Date.now()); // fixed at mount
  const age = (() => {
    const diff = Math.floor((now - new Date(draft.savedAt)) / 60_000);
    if (diff < 1)   return "just now";
    if (diff < 60)  return `${diff}m ago`;
    const h = Math.floor(diff / 60);
    if (h < 24)     return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-xl border border-ink/[0.07] bg-ink/[0.025] hover:border-ink/[0.12] transition-all group"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
      >
        <FileEdit size={15} style={{ color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-text-primary truncate">{draft.title || "Untitled Project"}</p>
        <p className="text-[14px] text-slate-500 mt-0.5">
          Step {(draft.step ?? 0) + 1}/4 · {STEP_NAMES[draft.step ?? 0]} · saved {age}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onContinue}
          className="px-3 py-1.5 rounded-lg text-[14px] font-black transition-all"
          style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}35` }}
        >
          Continue
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete draft"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:text-[#B01F17] hover:bg-[#D1291F]/10 transition-[color,background-color,opacity] opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ── ProjectsPage ───────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const navigate = useNavigate();
  const theme    = useRoleTheme();
  const accent   = theme.accent;

  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const addToast = useUiStore((s) => s.addToast);
  const [drafts,   setDrafts]   = useState(() => loadDraftsFromStorage());

  // Reversible, so no confirm dialog: delete now, offer Undo in the toast (UNIVERSAL_SHELL.md patterns).
  function deleteDraft(id) {
    const all = loadDraftsFromStorage();
    removeDraftFromStorage(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    addToast({ type: "info", message: "Draft deleted.", undoAction: () => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(all)); } catch { /* storage blocked */ }
      setDrafts(all);
    } });
  }

  // Filters
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");
  const [priority, setPriority] = useState("");
  const [sort,     setSort]     = useState("createdAt_desc");
  const [showFilters, setShowFilters] = useState(false);

  const debounceRef = useRef(null);

  const loadProjects = useCallback(async (s, st, pr, so) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (s)  params.set("search",   s);
      if (st) params.set("status",   st);
      if (pr) params.set("priority", pr);
      if (so) params.set("sort",     so);
      const data = await api.get(`/api/manager/projects?${params}`);
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message ?? "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadProjects(search, status, priority, sort);
    }, search ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [search, status, priority, sort, loadProjects]);


  // Summary stats
  const total     = projects.length;
  const active    = projects.filter((p) => p.status === "Active").length;
  const inReview  = projects.filter((p) => p.status === "In Review").length;
  const completed = projects.filter((p) => p.status === "Completed").length;

  return (
    <Page>
      <PageHeader title="Projects" subtitle="Every project you run, with its health and progress."
        primary={{ label: "New project", onClick: () => navigate("/manager/projects/create") }} />

      <Panel title="Summary" icon={BarChart3} delay={0.05}>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-ink/[0.05]">
          <StatCard label="Total projects" value={total}     icon={FolderKanban} color={accent} />
          <StatCard label="Active"         value={active}    icon={Flame}        color="#0E6A30" />
          <StatCard label="In review"      value={inReview}  icon={Clock}        color="#1948BD" />
          <StatCard label="Completed"      value={completed} icon={CheckCircle2} color={theme.text} />
        </div>
      </Panel>

      {/* ── Search + Filter bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.1 }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-ink/[0.04] border border-ink/[0.08] rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-text-primary placeholder-slate-600 focus:outline-none focus:border-ink/20 transition-colors"
            />
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2.5 text-xs font-medium text-text-primary focus:outline-none focus:border-ink/20 transition-colors"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#FFFFFF]">{o.label}</option>
            ))}
          </select>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all duration-150"
            style={{
              background:  showFilters ? `${accent}12` : "rgba(20,32,61,0.04)",
              borderColor: showFilters ? `${accent}40`  : "rgba(20,32,61,0.08)",
              color:       showFilters ? accent          : "#4F5B75",
            }}
          >
            <SlidersHorizontal size={13} /> Filters
            {(status || priority) && (
              <span
                className="w-4 h-4 rounded-full text-[14px] font-black flex items-center justify-center"
                style={{ background: accent, color: "var(--on-accent)" }}
              >
                {(status ? 1 : 0) + (priority ? 1 : 0)}
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
              exit={{   opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
                  {STATUSES.map((s) => (
                    <button
                      key={s || "all"}
                      onClick={() => setStatus(s)}
                      className="px-2.5 py-1 rounded-lg text-[14px] font-bold border transition-all duration-100"
                      style={{
                        background:  status === s ? `${STATUS_CFG[s]?.color ?? accent}18` : "rgba(20,32,61,0.03)",
                        borderColor: status === s ? `${STATUS_CFG[s]?.color ?? accent}40`  : "rgba(20,32,61,0.07)",
                        color:       status === s ? (STATUS_CFG[s]?.color ?? accent)        : "#4F5B75",
                      }}
                    >
                      {s || "All"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-slate-500 uppercase tracking-wider">Priority:</span>
                  {["", ...PRIORITIES].map((p) => (
                    <button
                      key={p || "all"}
                      onClick={() => setPriority(p)}
                      className="px-2.5 py-1 rounded-lg text-[14px] font-bold border transition-all duration-100"
                      style={{
                        background:  priority === p ? `${PRIORITY_CFG[p]?.color ?? accent}18` : "rgba(20,32,61,0.03)",
                        borderColor: priority === p ? `${PRIORITY_CFG[p]?.color ?? accent}40`  : "rgba(20,32,61,0.07)",
                        color:       priority === p ? (PRIORITY_CFG[p]?.color ?? accent)        : "#4F5B75",
                      }}
                    >
                      {p || "All"}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Draft projects ── */}
      <AnimatePresence>
        {drafts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-2">
              <FileEdit size={14} className="text-slate-500" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Drafts
                <span className="ml-2 px-1.5 py-0.5 rounded text-[14px] font-black bg-ink/[0.05] text-slate-400">
                  {drafts.length}
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              {drafts.map((d) => (
                <DraftCard
                  key={d.id}
                  draft={d}
                  accent={accent}
                  onContinue={() => navigate(`/manager/projects/create?draft=${d.id}`)}
                  onDelete={() => deleteDraft(d.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Project grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading projects">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-[340px] rounded-2xl" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadProjects(search, status, priority, sort)} />
      ) : projects.length === 0 ? (
        search || status || priority
          ? <EmptyState heading="No projects match your filters." action={{ label: "Clear filters", onClick: () => { setSearch(""); setStatus(""); setPriority(""); } }} />
          : <EmptyState heading="No projects yet." action={{ label: "New project", to: "/manager/projects/create" }} />
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                accent={accent}
                onClick={() => navigate(`/manager/projects/${p.id}`)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

    </Page>
  );
}
