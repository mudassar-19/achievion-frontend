import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, User, Flag, Zap, Calendar, Tag,
  MessageSquare, CheckCircle2, Clock, Loader2,
  AlertCircle, Send,
} from "lucide-react";
import useAuthStore     from "@/stores/authStore";
import useTaskStore     from "@/stores/taskStore";
import useUiStore       from "@/stores/uiStore";
import api              from "@/lib/api";
import SubmitTaskModal  from "@/components/widgets/SubmitTaskModal";
import { TimeLogPanel, ActivityPanel } from "@/components/widgets/TaskTimeActivity";
import TaskLinks from "@/components/widgets/TaskLinks";

import TallyLoader from "@/components/ui/TallyLoader";
import { withDeadline } from "@/lib/taskDates";
const PRIORITY_COLOR = {
  Critical: "text-[#B01F17]",
  High:     "text-danger",
  Medium:   "text-accent-text",
  Low:      "text-slate-500",
};

const EMPLOYEE_CATS = ["developer", "designer", "tester"];
const MANAGER_CATS  = ["director", "manager", "team_lead"];

// ── MetaRow ───────────────────────────────────────────────────────────────────
function MetaRow({ icon: Icon, label, value, valueClass = "" }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-ink/[0.05] last:border-0">
      <Icon size={13} className="text-slate-600 shrink-0" strokeWidth={1.75} />
      <span className="text-xs text-slate-500 w-20 shrink-0">{label}</span>
      <span className={["text-xs font-semibold text-slate-300", valueClass].join(" ")}>
        {value}
      </span>
    </div>
  );
}

// ── TaskDetailPage ────────────────────────────────────────────────────────────
export default function TaskDetailPage() {
  const { taskId }   = useParams();
  const navigate     = useNavigate();
  const user         = useAuthStore((s) => s.user);
  const addToast     = useUiStore((s) => s.addToast);
  const { approveTask, rejectTask, addComment } = useTaskStore();
  const roleCategory = user?.roleCategory;
  const isManager    = MANAGER_CATS.includes(roleCategory);
  const isEmployee   = EMPLOYEE_CATS.includes(roleCategory);

  const [task,             setTask]             = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [comment,          setComment]          = useState("");
  const [rejectFeedback,   setRejectFeedback]   = useState("");
  const [showRejectForm,   setShowRejectForm]   = useState(false);
  const [showSubmitModal,  setShowSubmitModal]  = useState(false);
  const [busy,             setBusy]             = useState(false);

  useEffect(() => {
    api.get(`/api/tasks/${taskId}`)
      .then((data) => setTask(withDeadline(data.task)))
      .catch(() => navigate("/workspace/tasks"))
      .finally(() => setLoading(false));
  }, [taskId, navigate]);

  function reload() {
    api.get(`/api/tasks/${taskId}`).then((data) => setTask(withDeadline(data.task))).catch(() => {});
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <TallyLoader />
      </div>
    );
  }

  if (!task) return null;

  const isAssignee = (task.assignees ?? []).some(
    (a) => (a._id ?? a).toString() === user?.id
  );
  const prereqBlocked = (task.dependsOn ?? []).some((p) => p.status !== "Done"); // V1 1.9 (server enforces too)
  const canStart   = isEmployee && isAssignee && task.status === "To-Do" && !prereqBlocked; // FE-R005
  const canSubmit  = isEmployee && isAssignee && task.status === "In-Progress" && !prereqBlocked;
  const canApprove = isManager && task.status === "In-Review";
  const canReject  = isManager && task.status === "In-Review";

  const priorityColor = PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.Low;
  const dueDate = task.deadline
    ? new Date(task.deadline).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    : "No deadline";
  const assigneeNames = (task.assignees ?? [])
    .map((a) => a.name ?? a)
    .join(", ") || "Unassigned";

  // ── Handlers ────────────────────────────────────────────────────────────
  async function handleStart() {
    setBusy(true);
    try {
      await api.patch(`/api/tasks/${taskId}/status`, { status: "In-Progress" });
      setTask((t) => ({ ...t, status: "In-Progress" }));
      addToast({ type: "success", message: "Task started. Good luck!" });
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Could not start the task." });
    } finally { setBusy(false); }
  }

  async function handleApprove() {
    setBusy(true);
    try {
      const data = await approveTask(taskId);
      setTask((t) => ({ ...t, status: "Done" }));
      addToast({ type: "xp", message: `Approved! +${data.xpAwarded ?? task.xpValue} XP awarded.` });
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Approval failed." });
    } finally { setBusy(false); }
  }

  async function handleReject() {
    if (!rejectFeedback.trim()) return;
    setBusy(true);
    try {
      await rejectTask(taskId, rejectFeedback);
      setTask((t) => ({ ...t, status: "In-Progress" }));
      setShowRejectForm(false);
      setRejectFeedback("");
      addToast({ type: "info", message: "Task sent back for changes." });
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Rejection failed." });
    } finally { setBusy(false); }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const comments = await addComment(taskId, comment);
      setTask((t) => ({ ...t, comments }));
      setComment("");
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Comment failed." });
    }
  }

  return (
    <div className="px-4 sm:px-8 py-8 min-h-full">
      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        onClick={() => navigate("/workspace/tasks")}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors mb-6 group"
      >
        <ArrowLeft size={13} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Task Board
      </motion.button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-5">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-bold px-2 py-0.5 rounded border border-accent/25 bg-accent/10 text-accent-text">
                {task.type}
              </span>
              <span className={["text-[14px] font-bold uppercase tracking-wide", priorityColor].join(" ")}>
                ● {task.priority} Priority
              </span>
              <span className="text-[14px] font-semibold px-2 py-0.5 rounded border border-ink/10 text-slate-500">
                {task.status}
              </span>
            </div>

            <h1 className="text-2xl font-black text-text-primary">{task.title}</h1>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <User size={11} strokeWidth={2} />
                {assigneeNames}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} strokeWidth={2} />
                Due {dueDate}
              </span>
            </div>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.07 }}
            className="rounded-2xl p-6 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.08]"
          >
            {task.description
              ? <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{task.description}</p>
              : <p className="text-sm text-slate-600 italic">No description provided.</p>
            }
          </motion.div>

          {/* Action buttons */}
          {(canStart || canSubmit || canApprove || canReject) && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.10 }}
              className="flex flex-col gap-3"
            >
              {canStart && (
                <button
                  onClick={handleStart}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-accent text-accent-on disabled:opacity-50 transition-colors"
                >
                  Start task
                </button>
              )}

              {canSubmit && (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-[#2A62EC] text-white hover:bg-[#4338ca] transition-colors shadow-card"
                >
                  <Send size={14} strokeWidth={2} />
                  Submit for Review
                </button>
              )}

              {(canApprove || canReject) && !showRejectForm && (
                <div className="flex items-center gap-3">
                  {canApprove && (
                    <button
                      onClick={handleApprove}
                      disabled={busy}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-[#12803B] text-white hover:bg-[#059669] disabled:opacity-50 transition-colors"
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} strokeWidth={2} />}
                      Approve &amp; Award XP
                    </button>
                  )}
                  {canReject && (
                    <button
                      onClick={() => setShowRejectForm(true)}
                      disabled={busy}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold border border-[#D1291F]/30 text-[#B01F17] hover:bg-[#D1291F]/10 disabled:opacity-50 transition-colors"
                    >
                      <AlertCircle size={14} strokeWidth={2} />
                      Request Changes
                    </button>
                  )}
                </div>
              )}

              {showRejectForm && (
                <div className="flex flex-col gap-2 p-4 rounded-xl border border-[#D1291F]/20 bg-[#D1291F]/5">
                  <p className="text-xs font-semibold text-[#B01F17]">Rejection Feedback</p>
                  <textarea
                    value={rejectFeedback}
                    onChange={(e) => setRejectFeedback(e.target.value)}
                    rows={3}
                    placeholder="Explain what needs to be changed..."
                    className="bg-ink/[0.04] border border-ink/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectFeedback(""); }}
                      className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={busy || !rejectFeedback.trim()}
                      className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold bg-[#D1291F] text-white hover:bg-[#D1291F] disabled:opacity-50 transition-colors"
                    >
                      {busy ? <Loader2 size={12} className="animate-spin" /> : <AlertCircle size={12} />}
                      Send Back
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Comments */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.14 }}
            className="rounded-2xl p-5 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.08]"
          >
            <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600 mb-4">
              Comments
            </p>

            <div className="flex flex-col gap-3 mb-4">
              {(task.comments ?? []).length === 0 && (
                <p className="text-xs text-slate-600 italic">No comments yet.</p>
              )}
              {(task.comments ?? []).map((c, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-[#EAEDF4] border border-ink/[0.07] flex items-center justify-center shrink-0">
                    <span className="text-[14px] font-bold text-slate-400">
                      {(c.author?.name ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-slate-300">
                        {c.author?.name ?? "Unknown"}
                      </span>
                      <span className="text-[14px] text-slate-600">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleComment} className="flex items-center gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-ink/[0.04] border border-ink/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent/40"
              />
              <button
                type="submit"
                aria-label="Send comment"
                disabled={!comment.trim()}
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#2A62EC] text-white disabled:opacity-40 hover:bg-[#4338ca] transition-colors"
              >
                <MessageSquare size={13} strokeWidth={2} />
              </button>
            </form>
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex flex-col gap-4">

          {/* Task meta */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl p-5 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          >
            <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600 mb-3">
              Task Meta
            </p>
            <MetaRow icon={Flag}     label="Priority" value={task.priority}          valueClass={priorityColor} />
            <MetaRow icon={Zap}      label="XP Value" value={`+${task.xpValue} XP`}  valueClass="text-[#7A5200]" />
            <MetaRow icon={Calendar} label="Deadline" value={dueDate} />
            <MetaRow icon={Tag}      label="Type"     value={task.type} />
            <MetaRow icon={Clock}    label="Status"   value={task.status} />
            {(task.labels ?? []).length > 0 && (
              <MetaRow icon={Tag}   label="Labels"   value={task.labels.join(", ")} />
            )}
          </motion.div>

          {/* Subtasks + prerequisites (V1 1.9) */}
          <TaskLinks task={task} canManage={["Manager", "Team Lead"].includes(user?.role)} onChanged={reload} />

          {/* Time log + activity (V1 1.7) */}
          <TimeLogPanel task={task} canLog={isAssignee && task.status !== "Done"} onLogged={reload} />
          <ActivityPanel task={task} />
        </div>
      </div>

      {/* ── Submit For Review Modal ── */}
      <AnimatePresence>
        {showSubmitModal && (
          <SubmitTaskModal
            task={task}
            onClose={() => setShowSubmitModal(false)}
            onSubmitted={() => {
              setTask((t) => ({ ...t, status: "In-Review", submittedAt: new Date().toISOString() }));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
