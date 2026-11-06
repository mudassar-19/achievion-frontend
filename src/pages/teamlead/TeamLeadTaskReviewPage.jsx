import FileLink from "@/components/ui/FileLink";
import { fmt as dFull } from "@/pages/manager/project/format";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, RotateCcw, Star, User, Flag, Clock, Zap, FileText, ExternalLink, Loader2, AlertTriangle, Calendar, Layers, Info, GitBranch, Globe, MessageSquare } from "lucide-react";
import api, { API_URL } from "@/lib/api";
import useUiStore from "@/stores/uiStore";

import TallyLoader from "@/components/ui/TallyLoader";
import { withDeadline } from "@/lib/taskDates";
const API_BASE = API_URL;

// Resolve a file URL — relative paths (/uploads/…) are served from the backend
function resolveFileUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE}${url}`;
}

const TEAL = "#08695F";

const PRIORITY_COLOR = { Critical: "#B01F17", High: "#9A3A06", Medium: "#7A5200", Low: "#3A4660" };
const TYPE_COLOR     = {
  Feature: "#1948BD", Bug: "#B01F17", Design: "#1948BD",
  Testing: "#0E6A30", DevOps: "#7A5200", Documentation: "#4F5B75",
};
const QUALITY_LABEL = { 1: "Very Poor", 2: "Poor", 3: "Acceptable", 4: "Good", 5: "Excellent" };
const QUALITY_COLOR = { 1: "#B01F17", 2: "#9A3A06", 3: "#7A5200", 4: "#0E6A30", 5: "#08695F" };

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  return dFull(iso);
}
function bytesToMB(bytes) {
  if (!bytes) return null;
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

// ── AI feedback (V2 2.3, D-075) ───────────────────────────────────────────────
// The AI score is not sent before the TL scores (spec §4: avoid anchoring). Feedback only.
const starsFor = (score) => Math.min(5, Math.max(1, Math.round(score / 20)));
const AI_STATUS_TEXT = {
  pending: "AI is reading this submission…",
  off:     "AI feedback is off for this workspace. Score it yourself.",
  limit:   "The employee reached today's limit of 10 AI reviews. Score it yourself.",
  failed:  "AI feedback isn't available for this submission. Score it yourself.",
  skipped: "Nothing the AI can read was submitted (only files or links). Score it yourself.",
};

function FeedbackList({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="text-xs font-bold text-text-primary mb-1">{title}</h3>
      <ul className="list-disc pl-5 text-sm text-text-secondary leading-relaxed space-y-0.5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

function AiFeedbackPanel({ ai }) {
  if (!ai) return null;
  return (
    <section aria-labelledby="ai-fb" className="rounded-2xl border border-border-subtle bg-bg-surface p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 id="ai-fb" className="text-sm font-bold text-text-primary">AI feedback</h2>
        <span className="text-xs text-text-tertiary">advice only, you give the score</span>
        {ai.partial && <span className="ml-auto rounded-full bg-[#FFC21A]/20 px-2 py-0.5 text-xs font-bold text-[#7A5200]">Partial review</span>}
      </div>
      {ai.status !== "done" ? (
        <p className="text-sm text-text-secondary flex items-center gap-2">
          {ai.status === "pending" && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {AI_STATUS_TEXT[ai.status] ?? AI_STATUS_TEXT.failed}
        </p>
      ) : (
        <>
          {ai.partial && <p className="text-xs text-[#7A5200] leading-relaxed">The submission was over the limit, so the AI read only an outline and the first part. Check the rest yourself.</p>}
          <FeedbackList title="What works" items={ai.strengths} />
          <FeedbackList title="What to improve" items={ai.improvements} />
          {ai.evidence && Object.keys(ai.evidence).length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-xs font-bold text-text-secondary">Where the AI looked</summary>
              <ul className="mt-1.5 space-y-1 text-xs text-text-secondary">
                {Object.entries(ai.evidence).map(([k, v]) => <li key={k}><span className="font-semibold text-text-primary">{k.replace(/_/g, " ")}:</span> {v}</li>)}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}

const CHECK_LABEL = { brief: "Matches the task brief", hierarchy: "Clear visual hierarchy", consistency: "Consistent spacing, colour and type", contrast: "Text contrast and size checked", states: "All screens and states included" };

function SubmittedText({ task }) {
  const text = task.submissionContent ?? "";
  const checks = task.submissionChecklist ?? [];
  if (!text && !checks.length) return null;
  return (
    <section aria-labelledby="sub-text" className="rounded-2xl border border-border-subtle bg-bg-surface p-5 flex flex-col gap-2">
      <h2 id="sub-text" className="text-sm font-bold text-text-primary">{checks.length && !text ? "Designer's checklist" : "Submitted text"}</h2>
      {checks.length > 0 && (
        <ul className="text-sm text-text-secondary space-y-0.5">
          {Object.entries(CHECK_LABEL).map(([k, l]) => <li key={k}>{checks.includes(k) ? "✓" : "–"} {l}</li>)}
        </ul>
      )}
      {text && (
        <pre className="max-h-[420px] overflow-auto rounded-xl bg-ink/[0.04] p-3 text-xs leading-relaxed text-text-primary whitespace-pre font-mono">{text}</pre>
      )}
    </section>
  );
}

// ── Link icon helper ──────────────────────────────────────────────────────────
function LinkIcon({ url }) {
  if (/github\.com/i.test(url))  return <GitBranch size={13} strokeWidth={2} />;
  if (/figma\.com/i.test(url))   return <Layers size={13} strokeWidth={2} />;
  return <Globe size={13} strokeWidth={2} />;
}

// ── Submission detail row ─────────────────────────────────────────────────────
function MetaRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-ink/[0.05] last:border-0">
      <Icon size={13} className="mt-0.5 shrink-0" style={{ color: color ?? "#4F5B75" }} strokeWidth={1.75} />
      <span className="text-xs text-slate-500 w-28 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-slate-300 flex-1">{value ?? "—"}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TeamLeadTaskReviewPage() {
  const { taskId }  = useParams();
  const navigate    = useNavigate();
  const addToast    = useUiStore((s) => s.addToast);

  const [task,     setTask]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [action,   setAction]   = useState("approve");
  const [score,    setScore]    = useState("");   // 0-100, starts empty (spec §4)
  const [result,   setResult]   = useState(null); // after approve: TL vs AI
  const [note,     setNote]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErr,  setFormErr]  = useState(null);

  // Load the task via the dedicated TL review-submission endpoint (full relational data)
  useEffect(() => {
    setLoading(true);
    api.get(`/api/teamlead/review-submissions/${taskId}`)
      .then((d) => setTask(withDeadline(d.submission ?? d)))
      .catch((e) => setError(e.message ?? "Failed to load submission."))
      .finally(() => setLoading(false));
  }, [taskId]);

  // While the AI is still reading, check again every 5 s (up to 2 min).
  const aiPending = task?.aiEval?.status === "pending";
  useEffect(() => {
    if (!aiPending) return;
    let n = 0;
    const t = setInterval(() => {
      if (++n > 24) { clearInterval(t); return; }
      api.get(`/api/teamlead/review-submissions/${taskId}`)
        .then((d) => setTask((cur) => ({ ...cur, aiEval: (d.submission ?? d).aiEval })))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [aiPending, taskId]);

  async function handleSubmitReview(e) {
    e.preventDefault();
    const n = Number(score);
    if (action === "approve" && (score === "" || !Number.isInteger(n) || n < 0 || n > 100)) {
      setFormErr("Give a score from 0 to 100 to approve."); return;
    }
    if (action === "reject" && !note.trim()) {
      setFormErr("A revision note is required when requesting changes."); return;
    }
    setFormErr(null);
    setSubmitting(true);
    try {
      const r = await api.post(`/api/teamlead/tasks/${taskId}/review`, {
        action,
        ...(action === "approve" ? { score: n } : {}),
        note: note.trim(),
      });
      if (action === "approve") {
        setResult(r);
        addToast({ type: "success", message: "Task approved — XP awarded to employee!" });
        return;
      }
      addToast({
        type:    action === "approve" ? "success" : "info",
        message: action === "approve"
          ? "Task approved — XP awarded to employee!"
          : "Revision requested — employee has been notified.",
      });
      navigate("/teamlead/review-submissions");
    } catch (err) {
      setFormErr(err.message ?? "Review failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <TallyLoader />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle size={28} className="text-red-400" strokeWidth={1.5} />
        <p className="text-sm text-red-400">{error ?? "Task not found."}</p>
        <button
          onClick={() => navigate("/teamlead/review-submissions")}
          className="text-xs text-teal-500 underline"
        >
          Back to Review Queue
        </button>
      </div>
    );
  }

  const assigneeName = task.assignee?.name
    ?? task.assignees?.[0]?.name
    ?? "Unassigned";
  const assigneeRole = task.assignee?.role
    ?? task.assignees?.[0]?.role
    ?? "";
  const priColor  = PRIORITY_COLOR[task.priority] ?? "#3A4660";
  const typeColor = TYPE_COLOR[task.type]          ?? "#4F5B75";
  const isLate    = task.deadline && new Date(task.deadline) < new Date();
  const revHistory = task.revisionHistory ?? [];
  const subFiles   = task.submissionFiles ?? [];
  const subLinks   = task.submissionLinks ?? [];

  return (
    <div className="min-h-full px-6 py-8 max-w-[1100px] mx-auto">
      {/* ── Back button ── */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        onClick={() => navigate("/teamlead/review-submissions")}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors mb-6 group"
      >
        <ArrowLeft size={13} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Review Queue
      </motion.button>

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between gap-4 mb-7 flex-wrap"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[14px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}25` }}
            >
              {task.type}
            </span>
            <span
              className="text-[14px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${priColor}15`, color: priColor, border: `1px solid ${priColor}25` }}
            >
              {task.priority}
            </span>
            <span
              className="text-[14px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${TEAL}15`, color: TEAL, border: `1px solid ${TEAL}25` }}
            >
              In Review
            </span>
            {isLate && (
              <span className="text-[14px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(209,41,31,0.15)", color: "#B01F17", border: "1px solid rgba(209,41,31,0.25)" }}>
                OVERDUE
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-text-primary leading-tight">{task.title}</h1>
          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <User size={11} strokeWidth={2} />
              {assigneeName}
              {assigneeRole && <span className="text-slate-600">· {assigneeRole}</span>}
            </span>
            {task.projectTitle && (
              <span className="flex items-center gap-1.5">
                <Layers size={11} strokeWidth={2} />
                {task.projectTitle}
              </span>
            )}
            {task.milestone && (
              <span className="flex items-center gap-1.5">
                <Flag size={11} strokeWidth={2} />
                {task.milestone.title}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

        {/* ═════════════════════ LEFT COLUMN ═══════════════════════════════ */}
        <div className="flex flex-col gap-5">

          {/* ── Task description ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="rounded-2xl border p-5"
            style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.07)" }}
          >
            <p className="text-[14px] font-bold uppercase tracking-widest mb-3" style={{ color: "#08695F" }}>
              Task Description
            </p>
            {task.description
              ? <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{task.description}</p>
              : <p className="text-sm text-slate-600 italic">No description provided.</p>
            }
          </motion.div>

          {/* ── Submission details ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="rounded-2xl border p-5 flex flex-col gap-4"
            style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: `${TEAL}28` }}
          >
            <p className="text-[14px] font-bold uppercase tracking-widest" style={{ color: "#08695F" }}>
              Submission Details
            </p>

            {/* Submission notes */}
            {task.submissionNote ? (
              <div className="rounded-xl p-4" style={{ background: `${TEAL}07`, border: `1px solid ${TEAL}18` }}>
                <p className="text-[14px] font-bold uppercase tracking-widest text-slate-500 mb-2">Submission Notes</p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{task.submissionNote}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 italic">No submission notes provided.</p>
            )}

            {/* Links */}
            {subLinks.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-bold uppercase tracking-widest text-slate-500">Submitted Links</p>
                <div className="flex flex-col gap-1.5">
                  {subLinks.map((l, i) => (
                    <a
                      key={i}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors hover:border-teal-500/30"
                      style={{ background: "rgba(20,32,61,0.03)", borderColor: "rgba(20,32,61,0.07)" }}
                    >
                      <LinkIcon url={l.url} />
                      <span className="flex-1 text-xs text-slate-300 truncate">{l.label ?? l.url}</span>
                      <ExternalLink size={11} className="text-slate-600 shrink-0" strokeWidth={2} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Files */}
            {subFiles.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[14px] font-bold uppercase tracking-widest text-slate-500">Attached Files</p>
                <div className="flex flex-col gap-1.5">
                  {subFiles.map((f, i) => (
                    <FileLink
                      key={i}
                      href={resolveFileUrl(f.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors hover:border-teal-500/30"
                      style={{ background: "rgba(20,32,61,0.03)", borderColor: "rgba(20,32,61,0.07)" }}
                    >
                      <FileText size={12} className="text-slate-500 shrink-0" strokeWidth={2} />
                      <span className="flex-1 text-xs text-slate-300 truncate">{f.filename}</span>
                      {f.size ? <span className="text-[14px] text-slate-600 shrink-0">{bytesToMB(f.size)}</span> : null}
                      <ExternalLink size={11} className="text-slate-600 shrink-0" strokeWidth={2} />
                    </FileLink>
                  ))}
                </div>
              </div>
            )}

            {subLinks.length === 0 && subFiles.length === 0 && (
              <p className="text-xs text-slate-600 italic">No files or links attached.</p>
            )}

            {/* Submission timestamp */}
            {task.submittedAt && (
              <div className="flex items-center gap-1.5 text-[14px] text-slate-600 mt-1">
                <Clock size={10} strokeWidth={2} />
                Submitted {timeAgo(task.submittedAt)} — {fmtDate(task.submittedAt)}
              </div>
            )}
          </motion.div>

          <SubmittedText task={task} />
          <AiFeedbackPanel ai={task.aiEval} />

          {/* ── Revision history ── */}
          {revHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.11 }}
              className="rounded-2xl border p-5 flex flex-col gap-3"
              style={{ background: "linear-gradient(135deg, #1a0e00 0%, #120a00 100%)", borderColor: "rgba(232,89,12,0.20)" }}
            >
              <p className="text-[14px] font-bold uppercase tracking-widest text-orange-500">
                Revision History ({revHistory.length})
              </p>
              <div className="flex flex-col gap-2">
                {revHistory.map((r, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-1 p-3 rounded-xl border"
                    style={{ background: "rgba(232,89,12,0.05)", borderColor: "rgba(232,89,12,0.15)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[14px] font-bold text-orange-400 uppercase">
                        {r.type === "revision_requested" ? "Revision Requested" : "Accepted"}
                      </span>
                      <span className="text-[14px] text-slate-600">{timeAgo(r.requestedAt)}</span>
                    </div>
                    {r.comment && (
                      <p className="text-xs text-slate-400 leading-relaxed">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* ═════════════════════ RIGHT COLUMN ══════════════════════════════ */}
        <div className="flex flex-col gap-5">

          {/* ── Task meta ── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="rounded-2xl border p-5"
            style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.07)" }}
          >
            <p className="text-[14px] font-bold uppercase tracking-widest mb-3" style={{ color: "#08695F" }}>
              Task Details
            </p>
            <MetaRow icon={User}     label="Employee"        value={`${assigneeName}${assigneeRole ? ` · ${assigneeRole}` : ""}`} />
            <MetaRow icon={Layers}   label="Project"         value={task.projectTitle} />
            <MetaRow icon={Flag}     label="Milestone"       value={task.milestone?.title} />
            <MetaRow icon={Calendar} label="Deadline"        value={task.deadline ? fmtDate(task.deadline) : "No deadline"} color={isLate ? "#B01F17" : undefined} />
            <MetaRow icon={Zap}      label="Est. Hours"      value={task.estimatedHours ? `${task.estimatedHours}h` : "—"} />
            <MetaRow icon={Star}     label="XP Value"        value={task.xpValue ? `+${task.xpValue} XP` : "—"} color="#7A5200" />
            {/* Submission contents summary */}
            <div className="flex items-start gap-3 py-2.5 border-b border-ink/[0.05] last:border-0">
              <MessageSquare size={13} className="mt-0.5 shrink-0" style={{ color: "#08695F" }} strokeWidth={1.75} />
              <span className="text-xs text-slate-500 w-28 shrink-0">Contents</span>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold" style={{ color: task.submissionNote ? "#08695F" : "#4F5B75" }}>
                  {task.submissionNote ? "✓ Note included" : "— No note"}
                </span>
                <span className="text-xs font-semibold" style={{ color: (task.submissionLinks?.length ?? 0) > 0 ? "#08695F" : "#4F5B75" }}>
                  {(task.submissionLinks?.length ?? 0) > 0
                    ? `✓ ${task.submissionLinks.length} link${task.submissionLinks.length > 1 ? "s" : ""} attached`
                    : "— No links"}
                </span>
                <span className="text-xs font-semibold" style={{ color: (task.submissionFiles?.length ?? 0) > 0 ? "#08695F" : "#4F5B75" }}>
                  {(task.submissionFiles?.length ?? 0) > 0
                    ? `✓ ${task.submissionFiles.length} file${task.submissionFiles.length > 1 ? "s" : ""} uploaded`
                    : "— No files"}
                </span>
              </div>
            </div>
          </motion.div>

          {result && (
            <section aria-labelledby="res-h" className="rounded-2xl border border-border-subtle bg-bg-surface p-5 flex flex-col gap-3">
              <h2 id="res-h" className="text-sm font-bold text-text-primary">Approved</h2>
              <dl className="grid grid-cols-2 gap-y-1.5 text-sm">
                <dt className="text-text-secondary">Your score</dt><dd className="font-bold tabular-nums text-text-primary">{result.tlScore} · {result.stars}★</dd>
                <dt className="text-text-secondary">AI score</dt><dd className="font-bold tabular-nums text-text-primary">{result.aiScore ?? "Not available"}</dd>
                {result.gap !== null && result.gap !== undefined && (<><dt className="text-text-secondary">Difference</dt><dd className="font-bold tabular-nums text-text-primary">{result.gap}</dd></>)}
              </dl>
              {result.flagged && <p className="text-xs text-[#7A5200] leading-relaxed">The scores differ by more than 20, so your Manager will see this review in Flags. Your score still counts.</p>}
              <button type="button" onClick={() => navigate("/teamlead/review-submissions")} className="self-start rounded-xl border border-border-subtle px-4 py-2 text-sm font-bold text-text-primary hover:bg-ink/[0.04]">
                Back to Review Queue
              </button>
            </section>
          )}

          {/* ── Review form ── */}
          {!result && <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-2xl border p-5 flex flex-col gap-4"
            style={{
              background: action === "approve"
                ? "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)"
                : "linear-gradient(135deg, #1a1000 0%, #120b00 100%)",
              borderColor: action === "approve" ? `${TEAL}28` : "rgba(255,194,26,0.25)",
            }}
          >
            <p className="text-[14px] font-bold uppercase tracking-widest" style={{ color: action === "approve" ? "#08695F" : "#7A5200" }}>
              Review Decision
            </p>

            {/* Action toggle */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "approve", label: "✓ Approve",          color: "#08695F"     },
                { key: "reject",  label: "↩ Request Revision", color: "#7A5200" },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setAction(key); setFormErr(null); }}
                  className="py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                  style={{
                    background: action === key ? `${color}18` : "transparent",
                    border:     `1px solid ${action === key ? color : "rgba(20,32,61,0.10)"}`,
                    color:      action === key ? color : "#3A4660",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Quality score */}
            <AnimatePresence>
              {action === "approve" && (
                <motion.div
                  key="quality"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden flex flex-col gap-2"
                >
                  <label htmlFor="tl-score" className="text-sm font-bold text-text-primary">
                    Your score (0–100) <span className="text-red-700">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input id="tl-score" type="number" inputMode="numeric" min={0} max={100} step={1} value={score}
                      onChange={(e) => { setScore(e.target.value); if (formErr) setFormErr(null); }}
                      placeholder="e.g. 75"
                      className="w-28 rounded-xl border border-border-subtle bg-bg-surface px-3 py-2 text-lg font-bold tabular-nums text-text-primary outline-none focus:border-[#08695F]" />
                    {score !== "" && Number.isInteger(Number(score)) && +score >= 0 && +score <= 100 && (
                      <span className="text-sm font-semibold" style={{ color: QUALITY_COLOR[starsFor(+score)] }}>
                        = {starsFor(+score)}★ {QUALITY_LABEL[starsFor(+score)]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">Your score is final; stars and XP come from it. The AI score appears after you approve.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Note / feedback */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-bold uppercase tracking-widest text-slate-500">
                {action === "approve" ? "Feedback (optional)" : "Revision Notes"}{" "}
                {action === "reject" && <span className="text-red-400">*</span>}
              </label>
              <textarea
                value={note}
                onChange={(e) => { setNote(e.target.value); if (formErr) setFormErr(null); }}
                placeholder={
                  action === "approve"
                    ? "Positive feedback, suggestions, or praise for the employee…"
                    : "What needs to be revised? Be specific so the employee can act on it."
                }
                rows={4}
                className="w-full bg-ink/[0.04] border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-slate-600 outline-none transition-colors"
                style={{
                  borderColor: formErr && action === "reject" ? "rgba(209,41,31,0.6)" : "rgba(20,32,61,0.08)",
                  resize: "vertical",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = action === "approve" ? `${TEAL}60` : "rgba(255,194,26,0.5)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = formErr && action === "reject" ? "rgba(209,41,31,0.6)" : "rgba(20,32,61,0.08)")}
              />
              {formErr && (
                <p className="text-[14px] text-red-400">{formErr}</p>
              )}
            </div>

            {/* Info banner */}
            <div
              className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[14px] text-slate-600"
              style={{
                background: action === "approve" ? `${TEAL}07` : "rgba(255,194,26,0.05)",
                border: `1px solid ${action === "approve" ? `${TEAL}18` : "rgba(255,194,26,0.15)"}`,
              }}
            >
              <Info size={10} className="mt-0.5 shrink-0" style={{ color: action === "approve" ? "#08695F" : "#7A5200" }} />
              {action === "approve"
                ? "Approval marks this task Done, awards XP to the employee, and sends them a notification."
                : "Revision returns the task to In-Progress and notifies the employee with your feedback."}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmitReview}
              disabled={submitting}
              className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all"
              style={{
                background:  action === "approve" ? TEAL : "#FFC21A",
                color:       "#14203D",
                opacity:     submitting ? 0.7 : 1,
              }}
            >
              {submitting ? (
                <><Loader2 size={14} className="animate-spin" /> Processing…</>
              ) : action === "approve" ? (
                <><CheckCircle2 size={14} strokeWidth={2.5} /> Approve &amp; Award XP</>
              ) : (
                <><RotateCcw size={14} strokeWidth={2.5} /> Request Revision</>
              )}
            </button>
          </motion.div>}

        </div>
      </div>
    </div>
  );
}
