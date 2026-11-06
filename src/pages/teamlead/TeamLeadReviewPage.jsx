import { fmtShort as dShort } from "@/pages/manager/project/format";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence }          from "framer-motion";
import { useNavigate }                      from "react-router-dom";
import {
  Eye, RefreshCw, CheckCircle2, RotateCcw,
  Clock, AlertTriangle, ChevronDown, Layers, Calendar,
  Zap, Flag, User, Filter,
} from "lucide-react";
import api from "@/lib/api";

import TallyLoader from "@/components/ui/TallyLoader";
const TEAL = "#08695F";

const PRIORITY_COLOR = { Critical: "#B01F17", High: "#9A3A06", Medium: "#7A5200", Low: "#3A4660" };
const TYPE_COLOR     = {
  Feature: "#1948BD", Bug: "#B01F17", Design: "#1948BD",
  Testing: "#0E6A30", DevOps: "#7A5200", Documentation: "#4F5B75",
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28 } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── Submission Card ───────────────────────────────────────────────────────────
function SubmissionCard({ sub, onReview }) {
  const assigneeName = sub.assignee?.name ?? sub.assignees?.[0]?.name ?? "Unassigned";
  const typeColor    = TYPE_COLOR[sub.type] ?? "#4F5B75";
  const priColor     = PRIORITY_COLOR[sub.priority] ?? "#3A4660";

  const isLate      = sub.deadline && new Date(sub.deadline) < new Date();
  const hasFiles    = (sub.submissionFiles?.length ?? 0) > 0;
  const hasLinks    = (sub.submissionLinks?.length ?? 0) > 0;
  const revisions   = sub.resubmissionCount ?? 0;

  return (
    <motion.div
      variants={fadeUp}
      className="group rounded-2xl border transition-colors hover:border-ink/[0.15]"
      style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.07)" }}
    >
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="text-[14px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}25` }}
              >
                {sub.type}
              </span>
              <span
                className="text-[14px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${priColor}15`, color: priColor, border: `1px solid ${priColor}25` }}
              >
                {sub.priority}
              </span>
              {isLate && (
                <span className="text-[14px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(209,41,31,0.15)", color: "#B01F17", border: "1px solid rgba(209,41,31,0.25)" }}>
                  OVERDUE
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-text-primary leading-snug truncate">{sub.title}</h3>
          </div>
          <span className="text-[14px] text-slate-600 shrink-0">{timeAgo(sub.submittedAt)}</span>
        </div>

        {/* Description preview */}
        {sub.description && (
          <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">{sub.description}</p>
        )}

        {/* Submission note */}
        {sub.submissionNote && (
          <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: `${TEAL}08`, border: `1px solid ${TEAL}18` }}>
            <p className="text-[14px] font-bold text-teal-600 uppercase tracking-widest mb-0.5">Submission Note</p>
            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{sub.submissionNote}</p>
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-[14px] text-slate-600 mb-3">
          <span className="flex items-center gap-1">
            <User size={9} strokeWidth={2} />
            {assigneeName}
            {sub.assignee?.role && <span className="text-slate-700">· {sub.assignee.role}</span>}
          </span>
          <span className="flex items-center gap-1">
            <Layers size={9} strokeWidth={2} />
            {sub.projectTitle}
          </span>
          {sub.milestone && (
            <span className="flex items-center gap-1">
              <Flag size={9} strokeWidth={2} />
              {sub.milestone.title}
            </span>
          )}
          {sub.estimatedHours && (
            <span className="flex items-center gap-1">
              <Clock size={9} strokeWidth={2} />
              {sub.estimatedHours}h est.
            </span>
          )}
          {sub.deadline && (
            <span className="flex items-center gap-1" style={{ color: isLate ? "#B01F17" : "#4F5B75" }}>
              <Calendar size={9} strokeWidth={2} />
              Due {dShort(sub.deadline)}
            </span>
          )}
          {revisions > 0 && (
            <span className="flex items-center gap-1 text-orange-500">
              <RotateCcw size={9} strokeWidth={2} />
              {revisions} revision{revisions > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Deliverable pills */}
        {(hasFiles || hasLinks) && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {hasFiles && (
              <span className="flex items-center gap-1 text-[14px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${TEAL}12`, color: TEAL, border: `1px solid ${TEAL}20` }}>
                <Zap size={8} strokeWidth={2} /> {sub.submissionFiles.length} file{sub.submissionFiles.length > 1 ? "s" : ""}
              </span>
            )}
            {hasLinks && (
              <span className="flex items-center gap-1 text-[14px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${TEAL}12`, color: TEAL, border: `1px solid ${TEAL}20` }}>
                <Eye size={8} strokeWidth={2} /> {sub.submissionLinks.length} link{sub.submissionLinks.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Action button */}
        <button
          onClick={() => onReview(sub.id ?? sub._id)}
          className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          style={{ background: `${TEAL}15`, border: `1px solid ${TEAL}30`, color: TEAL }}
        >
          <Eye size={13} strokeWidth={2} />
          Open Full Review
        </button>
      </div>
    </motion.div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl border"
        style={{ background: `${TEAL}08`, borderColor: `${TEAL}20` }}
      >
        <CheckCircle2 size={28} strokeWidth={1.2} style={{ color: "#08695F" }} />
      </div>
      <p className="text-base font-bold text-text-primary">All clear — no pending reviews</p>
      <p className="text-sm text-slate-600 text-center max-w-xs">
        When employees submit work, their tasks will appear here for your review and approval.
      </p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TeamLeadReviewPage() {
  const navigate       = useNavigate();
  const [submissions,  setSubmissions]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [filter,       setFilter]       = useState("all");
  const [projFilter,   setProjFilter]   = useState("all");
  const [showProjDrop, setShowProjDrop] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/api/teamlead/review-submissions")
      .then((d) => setSubmissions(d.submissions ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build unique project list for filter
  const projects = [...new Map(
    submissions.map((s) => [s.projectId?.toString(), { id: s.projectId, title: s.projectTitle }])
  ).values()];

  // Apply filters
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const filtered = submissions.filter((s) => {
    if (projFilter !== "all" && s.projectId?.toString() !== projFilter) return false;
    if (filter === "today") {
      const sub = new Date(s.submittedAt ?? s.updatedAt);
      return sub >= today;
    }
    if (filter === "overdue") {
      return s.deadline && new Date(s.deadline) < now;
    }
    if (filter === "high") {
      return ["High", "Critical"].includes(s.priority);
    }
    return true;
  });

  const counts = {
    all:    submissions.length,
    today:  submissions.filter((s) => {
      const sub = new Date(s.submittedAt ?? s.updatedAt);
      return sub >= today;
    }).length,
    overdue: submissions.filter((s) => s.deadline && new Date(s.deadline) < now).length,
    high:    submissions.filter((s) => ["High", "Critical"].includes(s.priority)).length,
  };

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1100px] mx-auto flex flex-col gap-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2.5">
            <Eye size={20} strokeWidth={1.75} style={{ color: "#08695F" }} />
            Review Submissions
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review and validate work submitted by your team members.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-ink/10 text-slate-400 hover:text-text-primary hover:border-ink/20 transition-all"
        >
          <RefreshCw size={13} strokeWidth={2} />
          Refresh
        </button>
      </div>

      {/* ── Summary chips ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all",    label: "All Submissions",   count: counts.all,    color: "#08695F"       },
          { key: "today",  label: "Submitted Today",   count: counts.today,  color: "#1948BD"  },
          { key: "high",   label: "High Priority",     count: counts.high,   color: "#9A3A06"  },
          { key: "overdue",label: "Past Deadline",     count: counts.overdue,color: "#B01F17"  },
        ].map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background:  filter === key ? `${color}18` : "rgba(20,32,61,0.03)",
              border:      `1px solid ${filter === key ? color : "rgba(20,32,61,0.08)"}`,
              color:       filter === key ? color : "#4F5B75",
            }}
          >
            {label}
            <span
              className="px-1.5 py-0.5 rounded-full text-[14px] font-black"
              style={{ background: `${color}20`, color }}
            >
              {count}
            </span>
          </button>
        ))}

        {/* Project filter */}
        {projects.length > 1 && (
          <div className="relative ml-auto">
            <button
              onClick={() => setShowProjDrop((v) => !v)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-ink/10 text-slate-400 hover:border-ink/20 hover:text-text-primary transition-all"
            >
              <Filter size={11} strokeWidth={2} />
              {projFilter === "all" ? "All Projects" : projects.find((p) => p.id?.toString() === projFilter)?.title ?? "Project"}
              <ChevronDown size={11} strokeWidth={2} />
            </button>
            <AnimatePresence>
              {showProjDrop && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute right-0 top-full mt-1 rounded-xl border shadow-xl z-20 min-w-[180px] overflow-hidden"
                  style={{ background: "#FFFFFF", borderColor: "rgba(20,32,61,0.12)" }}
                >
                  <button
                    onClick={() => { setProjFilter("all"); setShowProjDrop(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-400 hover:text-text-primary hover:bg-ink/[0.05] transition-colors"
                  >
                    All Projects
                  </button>
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setProjFilter(p.id?.toString()); setShowProjDrop(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-400 hover:text-text-primary hover:bg-ink/[0.05] transition-colors"
                    >
                      {p.title}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <TallyLoader />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertTriangle size={28} className="text-red-400" strokeWidth={1.5} />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={load} className="text-xs text-teal-500 underline">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          key={filter + projFilter}
          initial="hidden" animate="show" variants={stagger}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {filtered.map((sub) => (
            <SubmissionCard
              key={sub.id}
              sub={sub}
              onReview={(taskId) => navigate(`/teamlead/review/${taskId}`)}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
