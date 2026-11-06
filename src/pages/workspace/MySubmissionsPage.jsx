import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, CheckCircle2, RotateCcw, Clock,
  Star, ChevronDown, ChevronUp, FileText, MessageSquare,
  AlertCircle, Filter,
} from "lucide-react";
import { Link } from "react-router-dom";
import useAuthStore  from "@/stores/authStore";
import useTaskStore  from "@/stores/taskStore";
import { useRoleTheme } from "@/utils/roleTheme";
import OrgCodeBadge  from "@/components/ui/OrgCodeBadge";

import TallyLoader from "@/components/ui/TallyLoader";
import { reviewScore, starsFromScore, reviewResult } from "@/utils/xpRules";
// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  "In-Review": {
    label: "Pending Review",
    color: "#1948BD",
    Icon:  Send,
  },
  "Done": {
    label: "Approved",
    color: "#0E6A30",
    Icon:  CheckCircle2,
  },
  "In-Progress": {
    label: "Revision Requested",
    color: "#9A3A06",
    Icon:  RotateCcw,
  },
  "To-Do": {
    label: "Not Started",
    color: "#4F5B75",
    Icon:  Clock,
  },
};

const PRIORITY_COLOR = {
  Critical: "#B01F17",
  High:     "#9A3A06",
  Medium:   "#7A5200",
  Low:      "#4F5B75",
};

const FILTER_TABS = [
  { key: "all",         label: "All" },
  { key: "In-Review",   label: "Pending Review" },
  { key: "Done",        label: "Approved" },
  { key: "In-Progress", label: "Revision" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Submission Card ───────────────────────────────────────────────────────────
function SubmissionCard({ task }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[task.status] ?? { label: task.status, color: "#3A4660", Icon: FileText };
  const { Icon: StatusIcon, label: statusLabel, color: statusColor } = cfg;

  const score = reviewScore(task);
  const { revisionReason: revisionNotes, feedback, revisionCount } = reviewResult(task);
  const submittedAt = task.submittedAt ?? task.updatedAt;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${statusColor}25`, background: "rgba(20,32,61,0.015)" }}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 p-4">
        {/* Status icon */}
        <span
          className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl mt-0.5"
          style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}30` }}
        >
          <StatusIcon size={16} strokeWidth={2} style={{ color: statusColor }} />
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <Link
                to={`/workspace/tasks/${task._id}`}
                className="text-sm font-bold text-text-primary hover:underline truncate block"
              >
                {task.title}
              </Link>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {task.projectName && (
                  <span className="text-[14px] text-slate-500">{task.projectName}</span>
                )}
                {task.milestoneName && (
                  <>
                    <span className="text-slate-700">·</span>
                    <span className="text-[14px] text-slate-500">{task.milestoneName}</span>
                  </>
                )}
                {task.priority && (
                  <>
                    <span className="text-slate-700">·</span>
                    <span
                      className="text-[14px] font-semibold"
                      style={{ color: PRIORITY_COLOR[task.priority] ?? "#4F5B75" }}
                    >
                      {task.priority}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Status badge */}
            <span
              className="shrink-0 text-[14px] font-bold px-2.5 py-1 rounded-lg"
              style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30` }}
            >
              {statusLabel}
            </span>
          </div>

          {/* Meta strip */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {submittedAt && (
              <span className="flex items-center gap-1 text-[14px] text-slate-600">
                <Clock size={10} strokeWidth={2} />
                Submitted {timeAgo(submittedAt)}
              </span>
            )}
            {revisionCount > 0 && (
              <span className="flex items-center gap-1 text-[14px] text-[#9A3A06]">
                <RotateCcw size={10} strokeWidth={2} />
                {revisionCount} revision{revisionCount > 1 ? "s" : ""}
              </span>
            )}
            {score !== null && (
              <span className="flex items-center gap-1 text-[14px] text-[#7A5200]">
                <Star size={10} strokeWidth={2} />
                Score: {score}/100 · {starsFromScore(score)}★
              </span>
            )}
            {task.deadline && (
              <span className="flex items-center gap-1 text-[14px] text-slate-600">
                <AlertCircle size={10} strokeWidth={2} />
                Due {fmtDate(task.deadline)}
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        {(revisionNotes || feedback || task.comments?.length > 0) && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-ink/5 transition-colors"
          >
            {expanded ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
          </button>
        )}
      </div>

      {/* Expanded feedback */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t"
            style={{ borderColor: `${statusColor}15` }}
          >
            <div className="px-4 py-3 flex flex-col gap-3">
              {feedback && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600">
                    Reviewer Feedback
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed bg-ink/[0.03] rounded-xl px-3 py-2.5 border border-ink/[0.06]">
                    {feedback}
                  </p>
                </div>
              )}
              {revisionNotes && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[14px] font-bold uppercase tracking-widest" style={{ color: "#9A3A06" }}>
                    Revision Feedback
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed bg-ink/[0.03] rounded-xl px-3 py-2.5 border border-ink/[0.05]">
                    {revisionNotes}
                  </p>
                </div>
              )}
              {task.comments?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1">
                    <MessageSquare size={10} strokeWidth={2} /> Reviewer Comments
                  </p>
                  {task.comments.slice(-3).map((c, i) => (
                    <div key={i} className="flex gap-2 text-xs text-slate-400">
                      <span className="shrink-0 font-semibold text-slate-500">
                        {c.author?.name ?? "Reviewer"}:
                      </span>
                      <span className="leading-relaxed">{c.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Stat Pill ─────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, value, label, color }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border p-4" style={{ borderColor: `${color}25`, background: `${color}08` }}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${color}15` }}>
        <Icon size={16} strokeWidth={2} style={{ color }} />
      </span>
      <span className="text-2xl font-black" style={{ color }}>{value}</span>
      <span className="text-[14px] text-slate-500 text-center">{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MySubmissionsPage() {
  const user  = useAuthStore((s) => s.user);
  const theme = useRoleTheme();

  const { tasks, loading, fetchTasks } = useTaskStore();
  const [activeTab, setActiveTab] = useState("all");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchTasks(); }, []);

  // Only tasks that have been submitted at least once (not pure To-Do)
  const submitted = tasks.filter((t) =>
    t.status === "In-Review" ||
    t.status === "Done"       ||
    (t.status === "In-Progress" && reviewResult(t).revisionCount > 0)
  );

  const filtered = activeTab === "all"
    ? submitted
    : submitted.filter((t) => t.status === activeTab);

  // Stats
  const pending  = submitted.filter((t) => t.status === "In-Review").length;
  const approved = submitted.filter((t) => t.status === "Done").length;
  const revision = submitted.filter((t) => t.status === "In-Progress").length;
  const total    = submitted.length;

  const scoredTasks = submitted.filter((t) => reviewScore(t) !== null);
  const avgQuality = scoredTasks.length
    ? Math.round(scoredTasks.reduce((s, t) => s + reviewScore(t), 0) / scoredTasks.length) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-6 p-6"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: theme.accentLight, border: `1px solid ${theme.border}` }}
          >
            <Send size={20} style={{ color: theme.text }} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-text-primary leading-none">My Submissions</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track your submitted work, revision requests, and approvals
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <OrgCodeBadge />
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: theme.accentLight, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            {user?.role}
          </span>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatPill icon={Send}         value={loading ? "—" : total}    label="Total Submitted"   color={theme.accent}  />
        <StatPill icon={Send}         value={loading ? "—" : pending}  label="Pending Review"    color="#1948BD"        />
        <StatPill icon={RotateCcw}    value={loading ? "—" : revision} label="Revision Needed"   color="#9A3A06"        />
        <StatPill icon={CheckCircle2} value={loading ? "—" : approved} label="Approved"          color="#0E6A30"        />
      </div>

      {avgQuality !== null && (
        <div
          className="rounded-2xl border p-4 flex items-center gap-3"
          style={{ borderColor: "#8A620025", background: "#FFC21A08" }}
        >
          <Star size={18} strokeWidth={2} className="text-[#7A5200] shrink-0" />
          <div>
            <p className="text-sm font-bold text-text-primary">Average review score: <span className="text-[#7A5200]">{avgQuality} / 100 · {starsFromScore(avgQuality)}★</span></p>
            <p className="text-[14px] text-slate-500">Based on {scoredTasks.length} reviewed submission{scoredTasks.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      )}

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-1 flex-wrap">
        <Filter size={13} strokeWidth={2} className="text-slate-600 mr-1" />
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
            style={
              activeTab === tab.key
                ? { background: theme.accentLight, color: theme.text, border: `1px solid ${theme.border}` }
                : { background: "rgba(20,32,61,0.03)", color: "#4F5B75", border: "1px solid rgba(20,32,61,0.06)" }
            }
          >
            {tab.label}
            {tab.key !== "all" && (
              <span className="ml-1.5">
                ({tab.key === "In-Review" ? pending : tab.key === "Done" ? approved : revision})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Submission List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <TallyLoader />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Send size={32} className="text-slate-700" strokeWidth={1.2} />
          <p className="text-sm text-slate-500 font-medium">
            {activeTab === "all"
              ? "No submissions yet — complete tasks and submit them for review."
              : `No ${FILTER_TABS.find((t) => t.key === activeTab)?.label?.toLowerCase()} submissions.`}
          </p>
          <Link
            to="/workspace/tasks"
            className="text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
            style={{ background: theme.accentLight, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            Go to My Tasks
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((task) => (
              <SubmissionCard key={task._id} task={task} theme={theme} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
