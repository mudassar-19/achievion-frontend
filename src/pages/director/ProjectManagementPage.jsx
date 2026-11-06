import { useEffect, useState, useMemo, useCallback } from "react";
import { DIRECTOR_FEATURES as DF } from "@/lib/directorFeatures";
import { motion, AnimatePresence } from "framer-motion";
import { FolderKanban, Search, ChevronUp, ChevronDown, X, Zap, Loader2, Check, Bookmark, Trash2, Plus, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import usePerfLog from "@/hooks/usePerfLog";
import useUiStore from "@/stores/uiStore";
import PageHeader from "@/components/ui/PageHeader";
import Drawer from "@/components/ui/Drawer";
import Skeleton, { SkeletonLine } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import ProjectCelebrationOverlay from "@/components/ui/ProjectCelebrationOverlay";
import { avatarUrl } from "@/lib/avatar";

// ── Config ────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

const STATUS_CFG = {
  Active:      { text: "text-accent-text",  bg: "bg-accent/10",        border: "border-accent/20" },
  Planning:    { text: "text-[#7A5200]",     bg: "bg-[#FFC21A]/10",     border: "border-[#8A6200]/20" },
  Scheduled:   { text: "text-[#4B2FC4]",     bg: "bg-[#4B2FC4]/10",     border: "border-[#4B2FC4]/20" },
  "On Hold":   { text: "text-[#9A3A06]",     bg: "bg-orange-500/10",    border: "border-orange-500/20" },
  Delayed:     { text: "text-[#B01F17]",     bg: "bg-rose-500/10",      border: "border-rose-500/20" },
  "In Review": { text: "text-[#1A5C87]",     bg: "bg-sky-500/10",       border: "border-sky-500/20" },
  Completed:   { text: "text-[#0E6A30]",     bg: "bg-[#12803B]/10",     border: "border-[#12803B]/20" },
  Archived:    { text: "text-slate-500",      bg: "bg-slate-500/10",     border: "border-slate-500/20" },
  Frozen:      { text: "text-[#1A5C87]",     bg: "bg-sky-700/10",       border: "border-sky-700/20" },
  Deleted:     { text: "text-[#B01F17]",     bg: "bg-rose-700/10",      border: "border-rose-700/20" },
};

const ALL_STATUSES = ["Active", "Planning", "Scheduled", "In Review", "On Hold", "Delayed", "Completed", "Archived", "Frozen", "Deleted"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.Active;
  return (
    <span className={["text-[14px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap", cfg.text, cfg.bg, cfg.border].join(" ")}>
      {status}
    </span>
  );
}

function SortIcon({ col, current, dir }) {
  if (current !== col) return <ChevronUp size={11} className="text-slate-600 opacity-0 group-hover:opacity-60" />;
  return dir === "asc"
    ? <ChevronUp size={11} className="text-[#4B2FC4]" />
    : <ChevronDown size={11} className="text-[#4B2FC4]" />;
}

function ProgressBar({ pct }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-ink/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.4,0,0.2,1] }}
          className="h-full rounded-full bg-[#4B2FC4]"
        />
      </div>
      <span className="text-[14px] font-bold text-text-primary tabular-nums">{pct}%</span>
    </div>
  );
}

// ── Inline XP pool editor (unused in drawer; kept for Slice 2b / DIR-12) ──────
// eslint-disable-next-line no-unused-vars
function XpPoolEditor({ projectId, current, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(String(current));
  const [saving,  setSaving]  = useState(false);

  function startEdit() { setDraft(String(current)); setEditing(true); }

  async function commit() {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed !== current) {
      setSaving(true);
      await onSave(projectId, parsed);
      setSaving(false);
    }
    setEditing(false);
  }

  function cancel() { setEditing(false); }

  if (editing) return (
    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FFC21A]/[0.06] border border-[#8A6200]/30">
      <Zap size={12} className="text-[#7A5200] shrink-0" strokeWidth={2.5} />
      <input
        autoFocus
        type="number" min={0} value={draft}
        onChange={e=>setDraft(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter')commit();if(e.key==='Escape')cancel();}}
        onBlur={commit}
        className="w-24 bg-transparent text-xs font-black text-[#7A5200] focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="XP pool amount"
      />
      <span className="text-[14px] text-slate-500">XP</span>
      <div className="flex items-center gap-1 ml-auto">
        <button onMouseDown={commit} disabled={saving} aria-label="Save XP pool"
          className="flex h-5 w-5 items-center justify-center rounded text-[#0E6A30] hover:bg-[#12803B]/20 transition-colors">
          {saving ? <Loader2 size={10} className="animate-spin"/> : <Check size={11} strokeWidth={2.5}/>}
        </button>
        <button onMouseDown={cancel} aria-label="Cancel"
          className="flex h-5 w-5 items-center justify-center rounded text-[#B01F17] hover:bg-[#D1291F]/20 transition-colors">
          <X size={11} strokeWidth={2.5}/>
        </button>
      </div>
    </div>
  );

  return (
    <button onClick={startEdit} title="Click to adjust XP pool"
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FFC21A]/[0.06] border border-[#8A6200]/15 hover:border-[#8A6200]/35 hover:bg-[#FFC21A]/10 transition-[border-color,background-color] duration-150 w-full text-left">
      <Zap size={12} className="text-[#7A5200]" strokeWidth={2.5}/>
      <span className="text-[14px] text-slate-500">XP pool:</span>
      <span className="text-xs font-black text-[#7A5200]">{current.toLocaleString()} XP</span>
    </button>
  );
}

// ── Project Drawer (read-only — UX 3.2 no edits in Portfolio) ─────────────────
function ProjectDrawer({ proj, onClose }) {
  // Keep Drawer always mounted (open={!!proj}) so its useEffect([open])
  // can restore focus to the trigger row on close. If we returned null here,
  // the Drawer would unmount before the close-effect runs.
  return (
    <Drawer open={!!proj} onClose={onClose} title={proj?.title ?? ""} width={440}>
      {proj && (
        <div className="flex flex-col gap-6 px-6 py-5">

          {/* Status + lead */}
          <div className="flex items-center gap-3">
            <StatusChip status={proj.status} />
            <div className="flex items-center gap-2 ml-auto">
              <div className="h-7 w-7 rounded-full overflow-hidden border border-ink/10 bg-bg-base shrink-0">
                <img src={avatarUrl("bottts", proj.leadName)}
                  alt={proj.leadName} className="h-full w-full object-cover" loading="lazy"/>
              </div>
              <div>
                <p className="text-[14px] text-slate-500 leading-none">Manager</p>
                <p className="text-xs font-bold text-text-primary leading-snug mt-0.5">{proj.leadName}</p>
              </div>
            </div>
          </div>

          {/* Completion */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Completion</p>
              <span className="text-sm font-black text-text-primary">{proj.completion}%</span>
            </div>
            <div className="h-2 rounded-full bg-ink/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${proj.completion}%` }}
                transition={{ duration: 1, ease: [0.4,0,0.2,1] }}
                className="h-full rounded-full bg-[#4B2FC4]"
              />
            </div>
          </div>

          {/* XP pool — read-only; editing moves to Settings (DIR-12, Slice 2b) */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FFC21A]/[0.06] border border-[#8A6200]/15">
            <Zap size={12} className="text-[#7A5200]" strokeWidth={2.5}/>
            <span className="text-[14px] text-slate-500">XP pool:</span>
            <span className="text-xs font-black text-[#7A5200]">{proj.xpPool?.toLocaleString()} XP</span>
          </div>

          {/* Link to full project detail page (DIR-02.2) */}
          <Link to={`/director/projects/${proj.id}`}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#4B2FC4]/20 text-xs font-bold text-[#4B2FC4] hover:bg-[#4B2FC4]/[0.05] transition-colors">
            <ExternalLink size={12} /> View full detail
          </Link>
        </div>
      )}
    </Drawer>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <>
      {Array.from({length:5}).map((_,i)=>(
        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-6 py-4 border-b border-ink/[0.05]">
          <SkeletonLine width="70%" height={14}/>
          <SkeletonLine width="60%" height={14}/>
          <div className="flex items-center gap-2"><Skeleton className="h-1.5 w-16"/><SkeletonLine width="2rem" height={14}/></div>
          <SkeletonLine width="50%" height={14}/>
        </div>
      ))}
    </>
  );
}

const ACCENT = "#4B2FC4";

// ── Saved Views panel ─────────────────────────────────────────────────────────
function SavedViewsPanel({ currentFilters, onApply }) {
  const [views,   setViews]   = useState(null); // null = loading
  const [newName, setNewName] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");

  useEffect(() => {
    api.get("/api/director/portfolio/views").then(setViews).catch(() => setViews([]));
  }, []);

  async function saveView() {
    if (!newName.trim()) return;
    setSaving(true); setErr("");
    try {
      const v = await api.post("/api/director/portfolio/views", { name: newName.trim(), filters: currentFilters });
      setViews(prev => [v, ...(prev ?? [])]);
      setNewName("");
    } catch (e) { setErr(e.message ?? "Save failed"); }
    finally { setSaving(false); }
  }

  async function removeView(id) {
    try {
      await api.delete(`/api/director/portfolio/views/${id}`);
      setViews(prev => (prev ?? []).filter(v => String(v.id) !== String(id)));
    } catch { /* silent */ }
  }

  return (
    <div className="rounded-2xl border border-ink/[0.07] bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Bookmark size={13} style={{ color: ACCENT }} strokeWidth={1.75} />
        <h3 className="text-sm font-bold text-text-primary">Saved Views</h3>
      </div>
      <div className="flex gap-2">
        <input
          value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && saveView()}
          placeholder="Name current filters…"
          aria-label="Saved view name"
          className="flex-1 h-8 rounded-xl border border-ink/[0.10] px-3 text-sm bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:border-[#4B2FC4]/40 transition-colors"
        />
        <button onClick={saveView} disabled={saving || !newName.trim()}
          aria-label="Save current view"
          className="h-8 px-3 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-colors flex items-center gap-1"
          style={{ background: ACCENT }}>
          <Plus size={11} /> Save
        </button>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      {views === null && <p className="text-xs text-slate-400">Loading…</p>}
      {views?.length === 0 && <p className="text-xs text-slate-400 text-center py-1">No saved views yet.</p>}
      {(views ?? []).map(v => (
        <div key={v.id} className="flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-ink/[0.04] transition-colors">
          <button onClick={() => onApply(v.filters)} className="flex-1 text-left text-[13px] font-semibold text-text-primary truncate" aria-label={`Apply view ${v.name}`}>
            {v.name}
          </button>
          <button onClick={() => removeView(v.id)} aria-label={`Delete view ${v.name}`}
            className="shrink-0 text-slate-400 hover:text-red-600 transition-colors p-1">
            <Trash2 size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProjectManagementPage() {
  const addToast = useUiStore(s => s.addToast);
  const { log } = usePerfLog();

  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const [search,       setSearch]       = useState("");
  const [statusF,      setStatusF]      = useState("");      // "" = all
  const [managerF,     setManagerF]     = useState("");      // "" = all managers
  const [deadlineFrom, setDeadlineFrom] = useState("");
  const [deadlineTo,   setDeadlineTo]   = useState("");
  const [sortCol,   setSortCol]   = useState("title");
  const [sortDir,   setSortDir]   = useState("asc");
  const [page,      setPage]      = useState(1);
  const [drawer,    setDrawer]    = useState(null);
  const [celebrateProject, setCelebrateProject] = useState(null);

  const CELEBRATED_KEY = "achievion-dir-celebrated-projects";
  function getCelebrated() {
    try { return JSON.parse(localStorage.getItem(CELEBRATED_KEY) ?? "[]"); } catch { return []; }
  }
  function markCelebrated(id) {
    try { localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...getCelebrated(), id])); } catch { /* non-fatal */ }
  }

  const load = useCallback(() => {
    setLoading(true); setError(null);
    const t0 = performance.now();
    api.get("/api/director/projects")
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setProjects(list);
        // FL-06: show celebration for the first Done project not yet celebrated
        const celebrated = getCelebrated();
        const newDone = list.find(p => p.status === "Completed" && !celebrated.includes(String(p.id ?? p._id)));
        if (newDone) { markCelebrated(String(newDone.id ?? newDone._id)); setCelebrateProject(newDone); }
      })
      .catch(e => setError(e?.message ?? "Failed to load projects."))
      .finally(() => { setLoading(false); log("open_portfolio", performance.now() - t0, "/director/projects"); });
  }, [log]);

  useEffect(load, [load]);

  // Unique managers derived from loaded projects
  const managers = useMemo(() => {
    const seen = new Map();
    projects.forEach(p => { if (p.managerId && p.managerName) seen.set(String(p.managerId), p.managerName); });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [projects]);

  const filtered = useMemo(() => {
    let list = projects;
    if (statusF) list = list.filter(p => p.status === statusF);
    if (managerF) list = list.filter(p => String(p.managerId) === managerF);
    if (deadlineFrom) list = list.filter(p => p.deadline && new Date(p.deadline) >= new Date(deadlineFrom));
    if (deadlineTo)   list = list.filter(p => p.deadline && new Date(p.deadline) <= new Date(deadlineTo + "T23:59:59"));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || (p.leadName ?? "").toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol];
      if (typeof av === "string") av = av.toLowerCase(), bv = bv.toLowerCase();
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [projects, statusF, managerF, deadlineFrom, deadlineTo, search, sortCol, sortDir]);

  function applyView(filters = {}) {
    setStatusF(filters.status ?? "");
    setManagerF(filters.managerId ?? "");
    setDeadlineFrom(filters.deadlineFrom ?? "");
    setDeadlineTo(filters.deadlineTo ?? "");
    setSearch(filters.search ?? "");
    setPage(1);
  }

  const currentFilters = { status: statusF, managerId: managerF, deadlineFrom, deadlineTo, search };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  }

  function applyFilter(s) { setStatusF(s); setPage(1); }
  function handleSearch(v) { setSearch(v); setPage(1); }
  function clearAll() { setSearch(""); setStatusF(""); setManagerF(""); setDeadlineFrom(""); setDeadlineTo(""); setPage(1); }

  // eslint-disable-next-line no-unused-vars
  async function handleXpSave(projectId, newXp) {
    try {
      await api.patch(`/api/director/projects/${projectId}/xp-pool`, { xpPool: newXp });
      setProjects(prev => prev.map(p => p.id === projectId ? {...p, xpPool: newXp} : p));
      if (drawer?.id === projectId) setDrawer(d => ({...d, xpPool: newXp}));
      addToast({ type: "xp", message: `XP pool updated to ${newXp.toLocaleString()} XP.` });
    } catch (err) {
      addToast({ type: "error", message: err?.message ?? "Failed to update XP pool." });
    }
  }

  const COLS = [
    { key: "title",      label: "Project",    flex: "2fr" },
    { key: "status",     label: "Status",     flex: "1fr" },
    { key: "completion", label: "Completion", flex: "1fr" },
    { key: "leadName",   label: "Lead",       flex: "1fr" },
    { key: "deadline",   label: "Deadline",   flex: "1fr" },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 min-h-full max-w-[1280px] mx-auto w-full">

      {/* Header */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.34}}>
        <PageHeader
          title="Portfolio"
          subtitle={!loading && !error ? `${projects.length} project${projects.length !== 1 ? "s" : ""}` : undefined}
        />
      </motion.div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={load}/>}

      {!error && (
        <>
          {/* Saved Views panel */}
          {DF.savedViews && <SavedViewsPanel currentFilters={currentFilters} onApply={applyView} />}

          {/* Toolbar */}
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.05}}
            className="flex flex-wrap items-center gap-3">

            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" strokeWidth={2}/>
              <input
                value={search} onChange={e=>handleSearch(e.target.value)}
                placeholder="Search projects…"
                aria-label="Search projects"
                className="bg-ink/[0.05] border border-ink/[0.10] rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-slate-500 focus:outline-none focus:border-[#4B2FC4]/40 transition-colors w-52"
              />
              {search && (
                <button onClick={()=>handleSearch("")} aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-text-primary">
                  <X size={13}/>
                </button>
              )}
            </div>

            {/* Manager filter */}
            {managers.length > 0 && (
              <select value={managerF} onChange={e=>{setManagerF(e.target.value);setPage(1);}}
                aria-label="Filter by manager"
                className="h-9 rounded-xl border border-ink/[0.10] bg-ink/[0.05] px-3 text-sm text-text-primary focus:outline-none focus:border-[#4B2FC4]/40 transition-colors">
                <option value="">All managers</option>
                {managers.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}

            {/* Deadline range */}
            <div className="flex items-center gap-1.5">
              <input type="date" value={deadlineFrom} onChange={e=>{setDeadlineFrom(e.target.value);setPage(1);}}
                aria-label="Deadline from"
                className="h-9 rounded-xl border border-ink/[0.10] bg-ink/[0.05] px-3 text-sm text-text-primary focus:outline-none focus:border-[#4B2FC4]/40 transition-colors w-[9rem]"
              />
              <span className="text-xs text-slate-400">–</span>
              <input type="date" value={deadlineTo} onChange={e=>{setDeadlineTo(e.target.value);setPage(1);}}
                aria-label="Deadline to"
                className="h-9 rounded-xl border border-ink/[0.10] bg-ink/[0.05] px-3 text-sm text-text-primary focus:outline-none focus:border-[#4B2FC4]/40 transition-colors w-[9rem]"
              />
            </div>

            {/* Status filter chips */}
            <div className="flex gap-1.5 flex-wrap">
              {["", ...ALL_STATUSES].map(s => {
                const active = statusF === s;
                const cfg = s ? STATUS_CFG[s] : null;
                return (
                  <button key={s||"all"} onClick={()=>applyFilter(s)}
                    className={["px-3 py-1.5 rounded-xl text-xs font-bold border transition-[background-color,color,border-color]",
                      active && cfg ? `${cfg.text} ${cfg.bg} ${cfg.border}` :
                      active ? "bg-[#4B2FC4]/10 text-[#4B2FC4] border-[#4B2FC4]/25" :
                      "text-slate-500 bg-ink/[0.03] border-ink/[0.07] hover:text-text-primary"
                    ].join(" ")}>
                    {s || "All"}
                  </button>
                );
              })}
            </div>

            {/* Clear all */}
            {(search || statusF || managerF || deadlineFrom || deadlineTo) && (
              <button onClick={clearAll}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-text-primary transition-colors">
                <X size={11}/> Clear all
              </button>
            )}
          </motion.div>

          {/* Table */}
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.08}}
            className="glass-panel rounded-2xl border border-ink/[0.07] overflow-hidden">

            {/* Column headers */}
            <div className="grid gap-4 px-6 py-3 border-b border-ink/[0.06] bg-ink/[0.025]"
              style={{gridTemplateColumns: COLS.map(c=>c.flex).join(" ")}}>
              {COLS.map(col => (
                <button key={col.key} onClick={()=>toggleSort(col.key)}
                  className="flex items-center gap-1.5 text-left group min-h-[2rem]">
                  <span className="text-[14px] font-black uppercase tracking-[0.18em] text-slate-600">
                    {col.label}
                  </span>
                  <SortIcon col={col.key} current={sortCol} dir={sortDir}/>
                </button>
              ))}
            </div>

            {/* Rows */}
            {loading ? (
              <TableSkeleton/>
            ) : visible.length === 0 ? (
              search || statusF || managerF || deadlineFrom || deadlineTo ? (
                <EmptyState
                  heading="No projects match your filters."
                  body="Try a different search or status filter."
                  action={{label:"Clear filters", onClick:clearAll}}
                />
              ) : (
                <EmptyState
                  pose="thinking"
                  heading="No projects yet."
                  body="Projects assigned to this workspace will appear here."
                />
              )
            ) : (
              <AnimatePresence initial={false}>
                {visible.map((proj, i) => (
                  <motion.button
                    key={proj.id}
                    initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}
                    transition={{duration:0.22, delay:i*0.03}}
                    onClick={()=>setDrawer(proj)}
                    className="grid gap-4 px-6 py-4 border-b border-ink/[0.04] hover:bg-ink/[0.03] transition-colors w-full text-left"
                    style={{gridTemplateColumns: COLS.map(c=>c.flex).join(" ")}}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FolderKanban size={14} className="text-[#4B2FC4] shrink-0" strokeWidth={2}/>
                      <span className="text-sm font-bold text-text-primary truncate">{proj.title}</span>
                    </div>
                    <div><StatusChip status={proj.status}/></div>
                    <ProgressBar pct={proj.completion}/>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-full overflow-hidden border border-ink/10 bg-bg-base shrink-0">
                        <img src={avatarUrl("bottts", proj.leadName)}
                          alt={proj.leadName} className="h-full w-full object-cover" loading="lazy"/>
                      </div>
                      <span className="text-sm text-text-primary truncate">{proj.leadName}</span>
                    </div>
                    <div className="flex items-center min-w-0">
                      {proj.deadline
                        ? <span className="text-sm text-text-primary tabular-nums">
                            {new Date(proj.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        : <span className="text-xs text-slate-500">—</span>
                      }
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            )}
          </motion.div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}
                  className="px-3 py-1.5 rounded-lg border border-ink/[0.10] text-xs font-bold text-slate-500 hover:text-text-primary disabled:opacity-40 transition-colors">
                  ← Prev
                </button>
                {Array.from({length:totalPages},(_,i)=>i+1).map(pg=>(
                  <button key={pg} onClick={()=>setPage(pg)}
                    className={["h-8 w-8 rounded-lg text-xs font-bold transition-colors",
                      pg===page ? "bg-[#4B2FC4] text-white" : "text-slate-500 hover:text-text-primary"
                    ].join(" ")}>
                    {pg}
                  </button>
                ))}
                <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}
                  className="px-3 py-1.5 rounded-lg border border-ink/[0.10] text-xs font-bold text-slate-500 hover:text-text-primary disabled:opacity-40 transition-colors">
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Project drawer */}
      <ProjectDrawer proj={drawer} onClose={()=>setDrawer(null)}/>

      {/* FL-06 project-complete celebration */}
      <ProjectCelebrationOverlay project={celebrateProject} onClose={()=>setCelebrateProject(null)}/>
    </div>
  );
}
