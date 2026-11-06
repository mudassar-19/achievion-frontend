import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Search, ChevronLeft, ChevronRight,
  UserCog, UserCheck, UserX, UserPlus,
  Building2, Settings, RefreshCw, FolderKanban,
  FolderPlus, FolderEdit, Zap, Activity,
  Users, X as XIcon, Lock, Unlock, Trash2,
  CalendarRange,
} from "lucide-react";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";
import PageHeader from "@/components/ui/PageHeader";
import Drawer from "@/components/ui/Drawer";
import Skeleton, { SkeletonLine } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { avatarUrl } from "@/lib/avatar";

// ── Event configuration ────────────────────────────────────────────────────────
// NOTE: 'performedBy' is NOT returned by GET /api/director/audit-log (backend gap).
// Actor is therefore always derived from context (target name, org, system).
// See docs/design/AUDIT_BEFORE_AFTER_GAP.md for full backend dependency list.

const ACTION_CFG = {
  role_change:            { category:"employee",     label:"Role Changed",       color:"#4B2FC4", icon:UserCog,
    sentence: l => l.targetName
      ? `${l.targetName} changed from ${l.oldRole??"(unknown)"} to ${l.newRole??"(unknown)"}`
      : `Role changed: ${l.oldRole??"?"} → ${l.newRole??"?"}` },

  account_status_change:  { category:"employee",     label:"Status Changed",    color:"#9A3A06", icon:UserCheck,
    sentence: l => l.targetName
      ? `${l.targetName}'s account status set to ${l.newStatus??"unknown"}`
      : `Account status changed to ${l.newStatus??"unknown"}` },

  account_deleted:        { category:"employee",     label:"Account Deleted",   color:"#B01F17", icon:UserX,
    sentence: l => `${l.targetName??"Account"} was removed from the organization` },

  employee_created:       { category:"employee",     label:"Employee Created",  color:"#0E6A30", icon:UserPlus,
    sentence: l => `${l.targetName??"New member"} joined as ${l.newRole??"employee"}` },

  DIRECTOR_CREATED:       { category:"employee",     label:"Director Created",  color:"#4B2FC4", icon:ShieldCheck,
    sentence: l => `${l.targetName??"Director"} was created as director` },

  DIRECTOR_SETUP:         { category:"employee",     label:"Director Setup",    color:"#4B2FC4", icon:ShieldCheck,
    sentence: l => `${l.targetName??"Director"} account was initialized` },

  ORG_CREATED:            { category:"organization", label:"Org Created",       color:"#4B2FC4", icon:Building2,
    sentence: ()  => "Organization was registered" },

  workspace_updated:      { category:"organization", label:"Workspace Updated", color:"#4B2FC4", icon:Settings,
    sentence: l => {
      const diffs = humanDiff(l.before, l.after);
      if (!diffs.length) return "Workspace settings were updated";
      const first = diffs[0];
      const extra = diffs.length > 1 ? ` (+${diffs.length - 1} more)` : "";
      return `${first.label}: ${first.before} → ${first.after}${extra}`;
    } },

  GAMIFICATION_RESET:     { category:"organization", label:"Gamification Reset",color:"#B01F17", icon:RefreshCw,
    sentence: ()  => "All XP, levels, badges and streaks were reset" },

  project_created:        { category:"project",      label:"Project Created",   color:"#0E6A30", icon:FolderPlus,
    sentence: l => `"${l.projectTitle??"Project"}" was created` },

  project_updated:        { category:"project",      label:"Project Updated",   color:"#4B2FC4", icon:FolderEdit,
    sentence: l => `"${l.projectTitle??"Project"}" settings were updated` },

  project_xp_updated:     { category:"project",      label:"XP Pool Updated",   color:"#7A5200", icon:Zap,
    sentence: l => `XP pool${l.projectTitle ? ` for "${l.projectTitle}"` : ""} was updated` },

  project_status_changed: { category:"project",      label:"Status Changed",    color:"#4B2FC4", icon:FolderKanban,
    sentence: l => `"${l.projectTitle??"Project"}" status changed to ${l.newStatus??"unknown"}` },

  project_frozen:         { category:"project",      label:"Project Frozen",    color:"#1A5C87", icon:Lock,
    sentence: l => `"${l.projectTitle??"Project"}" was frozen${l.detail ? `: ${l.detail}` : ""}` },

  project_unfrozen:       { category:"project",      label:"Project Unfrozen",  color:"#0E6A30", icon:Unlock,
    sentence: l => `"${l.projectTitle??"Project"}" was unfrozen` },

  project_deleted:        { category:"project",      label:"Project Deleted",   color:"#B01F17", icon:Trash2,
    sentence: l => `"${l.projectTitle??"Project"}" was deleted` },
};

function cfgFor(action) {
  return ACTION_CFG[action] ?? {
    category:"organization",
    label: String(action??"").replace(/_/g," ").replace(/^./,c=>c.toUpperCase()),
    color: "#4F5B75",
    icon: Activity,
    sentence: l => l.detail ?? String(action??"").replace(/_/g," "),
  };
}

// ── Category filters ──────────────────────────────────────────────────────────
const CATEGORY_FILTERS = [
  { key:"",             label:"All Events",    icon:Activity,     color:null },
  { key:"employee",     label:"Employee & HR", icon:Users,        color:"#4B2FC4" },
  { key:"organization", label:"Organization",  icon:Building2,    color:"#4B2FC4" },
  { key:"project",      label:"Projects",      icon:FolderKanban, color:"#0E6A30" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDateFull(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
}

// Human-readable key labels for settings diffs
const KEY_LABELS = {
  workingHoursPerDay: "Working Hours/Day",
  weekdays:           "Workdays",
  extensionCumCapPct: "Extension Cap %",
  streakBonus:        "Streak Bonus",
  streak7:            "7-Day Streak Threshold",
  streak30:           "30-Day Streak Threshold",
  orgName:            "Organization Name",
  celebrationEnabled: "Celebration Enabled",
  recapEnabled:       "Recap Enabled",
  xpMultipliers:      "XP Multipliers",
  badgeThresholds:    "Badge Thresholds",
};
function humanKey(k) {
  return KEY_LABELS[k] ?? k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
}
function flattenObj(obj, prefix = "") {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { [prefix || "value"]: obj };
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(acc, flattenObj(v, path));
    else acc[path] = v;
    return acc;
  }, {});
}
function humanDiff(before, after) {
  const b = flattenObj(before ?? {});
  const a = flattenObj(after ?? {});
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  return keys
    .filter(k => JSON.stringify(b[k]) !== JSON.stringify(a[k]))
    .map(k => ({
      label: k.split(".").map(humanKey).join(" → "),
      before: b[k] === undefined ? "—" : Array.isArray(b[k]) ? b[k].join(", ") : String(b[k]),
      after:  a[k] === undefined ? "—" : Array.isArray(a[k]) ? a[k].join(", ") : String(a[k]),
    }));
}
function fmtTimeOnly(d) {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
}
function fmtDay(d) {
  const dt = new Date(d);
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
  const copy = new Date(dt); copy.setHours(0,0,0,0);
  if (copy.getTime()===today.getTime()) return "Today";
  if (copy.getTime()===yesterday.getTime()) return "Yesterday";
  return dt.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
}
function dayKey(iso) { return iso.slice(0,10); }
function toISODate(d) { return d ? new Date(d).toISOString().slice(0,10) : ""; }

function groupByDay(logs) {
  const groups = [];
  let current = null;
  for (const log of logs) {
    const day = dayKey(log.createdAt);
    if (!current || current.day !== day) {
      current = {day, label:fmtDay(log.createdAt), logs:[]};
      groups.push(current);
    }
    current.logs.push(log);
  }
  return groups;
}

// ── Log Row ───────────────────────────────────────────────────────────────────
function LogRow({ log, onOpen }) {
  const cfg      = cfgFor(log.action);
  const Icon     = cfg.icon;
  const sentence = cfg.sentence(log);

  return (
    <motion.button
      layout
      initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-8}}
      transition={{duration:0.18}}
      onClick={()=>onOpen(log)}
      className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-1 px-5 py-3.5 border-b border-ink/[0.04] hover:bg-ink/[0.02] transition-colors w-full text-left group"
      aria-label={sentence}
    >
      {/* Icon */}
      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
        style={{background:`${cfg.color}18`, border:`1px solid ${cfg.color}30`}}>
        <Icon size={15} strokeWidth={2} style={{color:cfg.color}}/>
      </div>

      {/* Avatar/category icon + subject */}
      <div className="flex items-center gap-3 w-48 shrink-0 min-w-0">
        {cfg.category==="employee" && log.targetName ? (
          <div className="h-8 w-8 rounded-lg overflow-hidden border border-ink/10 shrink-0 bg-white">
            <img src={avatarUrl("bottts", log.avatarSeed??log.targetName??"user")}
              alt="" role="presentation" className="h-full w-full object-cover" loading="lazy"/>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{background:`${cfg.color}08`, border:`1px solid ${cfg.color}15`}}>
            <span className="h-2 w-2 rounded-full" style={{background:cfg.color}}/>
          </div>
        )}
        <div className="min-w-0">
          {log.targetName
            ? <p className="text-sm font-bold text-text-primary truncate">{log.targetName}</p>
            : log.projectTitle
              ? <p className="text-sm font-bold text-text-primary truncate">{log.projectTitle}</p>
              : <p className="text-sm font-bold text-text-primary truncate capitalize">{cfg.category}</p>
          }
          {log.targetRole && <p className="text-[13px] text-slate-500 truncate">{log.targetRole}</p>}
        </div>
      </div>

      {/* Event badge */}
      <div className="w-36 shrink-0">
        <span className="inline-block max-w-full text-[13px] font-bold px-2.5 py-1 rounded-full truncate"
          style={{background:`${cfg.color}18`, color:cfg.color}}>
          {cfg.label}
        </span>
      </div>

      {/* Action sentence */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-slate-500 truncate">{sentence}</p>
      </div>

      {/* Time — row shows time only; full timestamp on hover in title */}
      <div className="shrink-0 text-right w-20">
        <p className="text-[13px] font-semibold text-slate-500 group-hover:hidden"
          title={fmtDateFull(log.createdAt)}>
          {fmtTimeOnly(log.createdAt)}
        </p>
        <p className="text-[12px] text-slate-600 hidden group-hover:block leading-tight">
          {fmtDateFull(log.createdAt)}
        </p>
      </div>
    </motion.button>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────
function LogDrawer({ log, onClose }) {
  // Keep Drawer always mounted (open={!!log}) so its useEffect([open])
  // can restore focus to the trigger row on close.
  const cfg  = log ? cfgFor(log.action) : null;
  const Icon = cfg?.icon;
  return (
    <Drawer open={!!log} onClose={onClose} title="Event Detail" width={420}>
      {!log ? null :
      <div className="flex flex-col gap-5 px-6 py-5">

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{background:`${cfg.color}18`, border:`1px solid ${cfg.color}30`}}>
            <Icon size={18} strokeWidth={2} style={{color:cfg.color}}/>
          </div>
          <div>
            <p className="text-sm font-black text-text-primary">{cfg.label}</p>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">{cfg.category}</p>
          </div>
        </div>

        {/* Action sentence summary */}
        <div className="rounded-xl bg-ink/[0.03] border border-ink/[0.06] px-4 py-3">
          <p className="text-sm text-text-primary leading-relaxed">{cfg.sentence(log)}</p>
        </div>

        {log.targetName && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Target</p>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg overflow-hidden border border-ink/10 bg-white shrink-0">
                <img src={avatarUrl("bottts", log.avatarSeed??log.targetName??"user")}
                  alt="" role="presentation" className="h-full w-full object-cover" loading="lazy"/>
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">{log.targetName}</p>
                {log.targetRole && <p className="text-xs text-slate-500">{log.targetRole}</p>}
              </div>
            </div>
          </div>
        )}

        {(log.oldRole || log.newRole) && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Role diff (before → after)</p>
            <div className="flex items-center gap-2 rounded-xl border border-ink/[0.07] bg-ink/[0.02] px-3 py-2">
              <span className="text-sm text-rose-600 line-through">{log.oldRole??"—"}</span>
              <span className="text-slate-500">→</span>
              <span className="text-sm font-bold text-emerald-600">{log.newRole??"—"}</span>
            </div>
          </div>
        )}

        {log.newStatus && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">New status</p>
            <p className="text-sm font-bold text-text-primary">{log.newStatus}</p>
          </div>
        )}
        {log.projectTitle && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Project</p>
            <p className="text-sm text-text-primary">{log.projectTitle}</p>
          </div>
        )}
        {log.detail && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Detail</p>
            <p className="text-sm text-text-primary leading-relaxed">{log.detail}</p>
          </div>
        )}

        {/* ── before / after diff ───────────────────────────────────── */}
        {(log.before || log.after) && (() => {
          const diffs = humanDiff(log.before, log.after);
          if (!diffs.length) return null;
          return (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Changes</p>
              <div className="rounded-xl border border-ink/[0.07] overflow-hidden divide-y divide-ink/[0.05]">
                {diffs.map(({ label, before, after }) => (
                  <div key={label} className="flex items-start gap-2 px-3 py-2.5 text-xs">
                    <span className="font-semibold text-slate-500 shrink-0 min-w-[120px]">{label}</span>
                    <span className="text-rose-600 line-through break-all">{before}</span>
                    <span className="text-slate-400 shrink-0">→</span>
                    <span className="text-emerald-700 font-semibold break-all">{after}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="flex flex-col gap-1 border-t border-ink/[0.06] pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Timestamp</p>
          <p className="text-sm text-text-primary">{fmtDateFull(log.createdAt)}</p>
          <p className="text-xs text-slate-500 font-mono mt-1">ID: {String(log.id).slice(-8)}</p>
          {log.actionHash && (
            <p className="text-xs text-slate-500 font-mono">Hash: <span className="text-[#4B2FC4] font-bold">{log.actionHash}</span></p>
          )}
        </div>

        <div className="flex flex-col gap-1 border-t border-ink/[0.06] pt-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Actor</p>
          {log.performerName
            ? <p className="text-sm font-semibold text-text-primary">{log.performerName}
                {log.performerRole && <span className="text-xs text-slate-500 font-normal ml-1">({log.performerRole})</span>}
              </p>
            : <p className="text-xs text-slate-500 italic">Not available for legacy entries.</p>
          }
        </div>

        <p className="text-xs text-slate-600 italic border-t border-ink/[0.06] pt-3">
          Audit records are append-only and cannot be modified.
        </p>
      </div>}
    </Drawer>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function LogSkeleton() {
  return (
    <>
      {[70,50,80,60,55].map((w,i)=>(
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-ink/[0.04]">
          <Skeleton className="h-9 w-9 rounded-xl shrink-0"/>
          <div className="flex items-center gap-3 w-48 shrink-0">
            <SkeletonLine width="70%" height={13}/>
          </div>
          <SkeletonLine width="100px" height={22} className="rounded-full"/>
          <SkeletonLine width={`${w}%`} height={13} className="flex-1"/>
          <SkeletonLine width="50px" height={13}/>
        </div>
      ))}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AuditLogPage() {
  const theme = useRoleTheme();

  const [logs,     setLogs]     = useState([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [drawer,   setDrawer]   = useState(null);

  const LIMIT = 20;

  const load = useCallback(async (pg, cat, srch) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({page:pg, limit:LIMIT});
      if (cat)  params.set("category", cat);
      if (srch) params.set("search",   srch);
      const res = await api.get(`/api/director/audit-log?${params}`);
      const d   = res.data ?? res;
      setLogs(d.logs  ?? []);
      setTotal(d.total ?? 0);
      setPages(d.pages ?? 1);
    } catch(e) {
      setError(e?.message ?? "Failed to load audit log.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ setTimeout(()=>load(page,category,search),0); }, [page,category]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{
    const t = setTimeout(()=>{ setPage(1); load(1,category,search); }, 350);
    return ()=>clearTimeout(t);
  }, [search]);

  function handleCategory(key) { setCategory(key); setPage(1); }
  function clearFilters() { setSearch(""); setCategory(""); setDateFrom(""); setDateTo(""); setPage(1); }
  const hasFilters = !!(search || category || dateFrom || dateTo);

  // Client-side date range filter
  const filteredLogs = (dateFrom || dateTo) ? logs.filter(l => {
    const d = new Date(l.createdAt);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo   && d > new Date(dateTo + "T23:59:59")) return false;
    return true;
  }) : logs;

  const groups = groupByDay(filteredLogs);

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[1280px] mx-auto w-full">

      {/* Header */}
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.3}}
        className="flex items-end justify-between flex-wrap gap-4">
        <PageHeader
          title="Audit Log"
          subtitle={loading ? "Loading events…" : `${total.toLocaleString()} event${total!==1?"s":""} — employee, organization, and project activity`}
        />
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" strokeWidth={2}/>
          <input
            value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search by member name…"
            aria-label="Search by member name"
            className="bg-ink/[0.05] border border-ink/[0.10] rounded-xl pl-9 pr-9 py-2.5 text-sm text-text-primary placeholder:text-slate-500 focus:outline-none focus:border-ink/25 transition-colors w-60"
          />
          {search && (
            <button onClick={()=>setSearch("")} aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-text-primary">
              <XIcon size={13}/>
            </button>
          )}
        </div>
      </motion.div>

      {/* Filters: category + date range */}
      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.05}}
        className="flex flex-wrap gap-2 items-center">
        {CATEGORY_FILTERS.map(f=>{
          const active = category===f.key;
          const Icon = f.icon;
          return (
            <button key={f.key} onClick={()=>handleCategory(f.key)}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-[background-color,color,border-color] duration-150"
              style={active ? {
                background:  f.color?`${f.color}20`:theme.accent,
                color:       f.color??"var(--on-accent)",
                borderColor: f.color?`${f.color}45`:theme.accent,
              } : {
                background:  "rgba(20,32,61,0.03)",
                color:       "#4F5B75",
                borderColor: "rgba(20,32,61,0.07)",
              }}>
              <Icon size={11} strokeWidth={2.5}/>
              {f.label}
            </button>
          );
        })}

        {/* Date range (client-side) */}
        <div className="flex items-center gap-1.5 ml-2">
          <CalendarRange size={13} className="text-slate-500" aria-hidden="true"/>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            max={dateTo || toISODate(new Date())}
            aria-label="Filter from date"
            className="bg-ink/[0.05] border border-ink/[0.10] rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-ink/25 transition-colors"/>
          <span className="text-xs text-slate-500" aria-hidden="true">–</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            min={dateFrom || undefined} max={toISODate(new Date())}
            aria-label="Filter to date"
            className="bg-ink/[0.05] border border-ink/[0.10] rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-ink/25 transition-colors"/>
        </div>

        {hasFilters && (
          <button onClick={clearFilters}
            className="text-xs font-bold text-slate-500 hover:text-text-primary flex items-center gap-1 px-2 py-1.5 rounded-lg">
            <XIcon size={11} aria-hidden="true"/> Clear all
          </button>
        )}
      </motion.div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={()=>load(page,category,search)}/>}

      {/* Log table */}
      {!error && (
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
          className="rounded-2xl border border-ink/[0.07] bg-ink/[0.015] overflow-hidden">

          {/* Column headers */}
          <div className="flex items-center gap-4 px-5 py-3 border-b border-ink/[0.07] bg-ink/[0.02]" aria-hidden="true">
            <div className="w-9 shrink-0"/>
            <div className="w-48 shrink-0"><p className="text-[13px] font-black uppercase tracking-widest text-slate-600">Subject</p></div>
            <div className="w-36 shrink-0"><p className="text-[13px] font-black uppercase tracking-widest text-slate-600">Event</p></div>
            <div className="flex-1"><p className="text-[13px] font-black uppercase tracking-widest text-slate-600">What happened</p></div>
            <div className="shrink-0 w-20 text-right"><p className="text-[13px] font-black uppercase tracking-widest text-slate-600">Time</p></div>
          </div>

          {loading ? (
            <LogSkeleton/>
          ) : filteredLogs.length===0 ? (
            <EmptyState
              heading={hasFilters ? "No events match your filters." : "No audit events recorded yet."}
              body={hasFilters ? "Try clearing the filters." : "System events will appear here as actions are performed."}
              action={hasFilters ? {label:"Clear filters", onClick:clearFilters} : null}
            />
          ) : (
            <AnimatePresence>
              {groups.map(group=>(
                <div key={group.day}>
                  {/* Sticky day header — shows full date */}
                  <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-2 bg-[#F5F6FA]/90 backdrop-blur-sm border-b border-ink/[0.05]">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">{group.label}</p>
                    <span className="text-[13px] text-slate-600 font-semibold">{group.logs.length} event{group.logs.length!==1?"s":""}</span>
                  </div>
                  {group.logs.map(log=>(
                    <LogRow key={String(log.id)} log={log} onOpen={setDrawer}/>
                  ))}
                </div>
              ))}
            </AnimatePresence>
          )}
        </motion.div>
      )}

      {/* Pagination */}
      {!loading && !error && pages>1 && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.1}}
          className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {page} of {pages} · {total.toLocaleString()} events</p>
          <div className="flex items-center gap-2">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-ink/[0.10] text-xs font-bold text-slate-500 hover:text-text-primary disabled:opacity-40 transition-colors">
              <ChevronLeft size={13} strokeWidth={2.5}/> Prev
            </button>
            {Array.from({length:Math.min(7,pages)},(_,i)=>{
              let pg;
              if (pages<=7)           pg=i+1;
              else if (page<=4)       pg=i+1;
              else if (page>=pages-3) pg=pages-6+i;
              else                    pg=page-3+i;
              return (
                <button key={pg} onClick={()=>setPage(pg)}
                  className="h-8 w-8 rounded-xl text-xs font-bold transition-[background-color,color]"
                  style={pg===page ? {background:theme.accent,color:"var(--on-accent)"} : {color:"#4F5B75"}}>
                  {pg}
                </button>
              );
            })}
            <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page>=pages}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-ink/[0.10] text-xs font-bold text-slate-500 hover:text-text-primary disabled:opacity-40 transition-colors">
              Next <ChevronRight size={13} strokeWidth={2.5}/>
            </button>
          </div>
        </motion.div>
      )}

      {/* Detail drawer */}
      <LogDrawer log={drawer} onClose={()=>setDrawer(null)}/>
    </div>
  );
}
