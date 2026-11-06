import { useEffect, useState, useCallback } from "react";

import { motion, AnimatePresence }         from "framer-motion";
import { CheckSquare, Loader2, Search, Clock, CheckCircle2, Circle, Eye, AlertTriangle, Check, X, Zap, Users, Star, MessageSquare, ChevronRight, Shield, Plus } from "lucide-react";
import api from "@/lib/api";

import TallyLoader from "@/components/ui/TallyLoader";
import useUiStore from "@/stores/uiStore";
import { CreateTaskModal } from "./TeamLeadMilestoneDetailPage";
import useAuthStore from "@/stores/authStore";
const TEAL = "#08695F";

const TASK_STATUS = {
  "Backlog":    { color: "#4F5B75", label: "Backlog",     Icon: Circle        },
  "To-Do":      { color: "#3A4660", label: "To Do",      Icon: Circle        },
  "In-Progress":{ color: "#1948BD", label: "In Progress", Icon: Clock         },
  "In-Review":  { color: "#1948BD", label: "In Review",   Icon: Eye           },
  "Done":       { color: "#0E6A30", label: "Done",        Icon: CheckCircle2  },
};
function taskStatusCfg(s) { return TASK_STATUS[s] ?? TASK_STATUS["To-Do"]; }

const PRIORITY_COLOR = { Critical: "#B01F17", High: "#9A3A06", Medium: "#7A5200", Low: "#3A4660" };

const WORKLOAD_COLOR = { Free: "#0E6A30", Moderate: "#7A5200", Busy: "#9A3A06", Overloaded: "#B01F17" };

const TABS = [
  { key: "all",     label: "All Tasks"       },
  { key: "created", label: "Created by Me"   },
  { key: "review",  label: "Pending Review"  },
  { key: "done",    label: "Completed"       },
];

function timeLeft(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - Date.now();
  if (diff < 0) return { label: `${Math.ceil(-diff / 86_400_000)}d overdue`, color: "#B01F17" };
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return { label: "Due today", color: "#7A5200" };
  if (days <= 3)  return { label: `${days}d left`, color: "#7A5200" };
  return { label: `${days}d left`, color: "#3A4660" };
}

// ── Capacity Badge ─────────────────────────────────────────────────────────────
function CapacityBadge({ capacity }) {
  if (!capacity) return null;
  const color = WORKLOAD_COLOR[capacity.workload] ?? "#3A4660";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[14px] font-bold border"
      style={{ color, background: `${color}12`, borderColor: `${color}25` }}
    >
      <Shield size={8} strokeWidth={2} />
      {capacity.workload} · {capacity.remainingH}h free
    </span>
  );
}

// ── TL Review Modal (Phase 3) ─────────────────────────────────────────────────
function TLReviewModal({ task, onClose, onReviewed }) {
  const [action,  setAction]  = useState("accept");
  const [quality, setQuality] = useState(4);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState(null);

  async function submit() {
    if (action === "accept" && (!quality || quality < 1 || quality > 5)) {
      setErr("Quality score 1-5 required"); return;
    }
    if (action === "request_changes" && !comment.trim()) {
      setErr("Please provide feedback for the team member."); return;
    }
    setLoading(true); setErr(null);
    try {
      await api.post(`/api/teamlead/tasks/${task.id}/tl-review`, {
        action,
        qualityScore: action === "accept" ? +quality : undefined,
        comment,
      });
      onReviewed();
    } catch (e) { setErr(e?.message ?? "Review failed."); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-[440px] rounded-3xl border overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(180deg, #F5F6FA, #F5F6FA)", borderColor: `${TEAL}25` }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: `${TEAL}15` }}>
          <h2 className="text-sm font-black text-text-primary flex items-center gap-2">
            <Eye size={14} style={{ color: "#08695F" }} />
            Team Lead Review
          </h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-700"><X size={15} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold text-slate-300 truncate">"{task.title}"</p>

          {err && <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{err}</p>}

          {/* Action selector */}
          <div className="flex gap-2">
            {[
              { key: "accept",          label: "✓ Accept",           color: "#0E6A30" },
              { key: "request_changes", label: "↩ Request Changes",  color: "#9A3A06" },
            ].map((a) => (
              <button
                key={a.key}
                onClick={() => setAction(a.key)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all"
                style={{
                  background:  action === a.key ? `${a.color}18` : "transparent",
                  border:      `1px solid ${action === a.key ? a.color : "rgba(20,32,61,0.10)"}`,
                  color:       action === a.key ? a.color : "#4F5B75",
                }}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Quality score (accept only) */}
          {action === "accept" && (
            <div>
              <label className="block text-[14px] text-slate-500 mb-2">Quality Score</label>
              <div className="flex gap-1.5">
                {[1,2,3,4,5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuality(n)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-1 transition-all"
                    style={{
                      background: quality >= n ? `${TEAL}20` : "rgba(20,32,61,0.04)",
                      border:     `1px solid ${quality >= n ? TEAL : "rgba(20,32,61,0.08)"}`,
                      color:      quality >= n ? "#08695F" : "#4F5B75",
                    }}
                  >
                    <Star size={10} strokeWidth={2} fill={quality >= n ? TEAL : "none"} />
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comment/Feedback */}
          <div>
            <label className="block text-[14px] text-slate-500 mb-1.5">
              {action === "accept" ? "Note (optional)" : "Feedback for team member *"}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={action === "accept" ? "Well done! Add any notes…" : "Describe what needs to be changed…"}
              rows={3}
              className="w-full rounded-xl border px-3 py-2.5 text-sm text-text-primary placeholder-slate-600 bg-transparent outline-none resize-none"
              style={{ borderColor: `${TEAL}20`, background: "rgba(20,32,61,0.05)" }}
            />
          </div>

          {/* XP preview */}
          {action === "accept" && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ background: `${TEAL}08`, border: `1px solid ${TEAL}15` }}
            >
              <Zap size={11} style={{ color: "#08695F" }} />
              <span className="text-slate-400">Base <span style={{ color: "#08695F" }} className="font-bold">{task.xpValue ?? 50} XP</span>. The final award also depends on timing and your quality score</span>
            </div>
          )}

          <div className="flex gap-2 mt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-ink/10 hover:border-ink/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all"
              style={{
                background: action === "accept" ? "#12803B" : "#E8590C",
                color: "#fff",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : null}
              {loading ? "Saving…" : action === "accept" ? "Accept Task" : "Request Changes"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onReview, onRefresh }) {
  const cfg      = taskStatusCfg(task.status);
  const dl       = timeLeft(task.deadline);
  const assignee = task.assignee?.name ?? task.assignees?.[0]?.name ?? "Unassigned";
  const [updating,  setUpdating]  = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const [capacity,  setCapacity]  = useState(null);

  // Fetch capacity on expand if in-review
  useEffect(() => {
    const assigneeId = task.assignee?.id ?? task.assignees?.[0]?.id;
    if (expanded && assigneeId && !capacity) {
      api.get(`/api/teamlead/employee/${assigneeId}/capacity`)
        .then(setCapacity)
        .catch(() => {});
    }
  }, [expanded, task, capacity]);

  async function advance() {
    if (updating) return;
    let next = null;
    if (task.status === "To-Do")       next = "In-Progress";
    if (task.status === "In-Progress") next = "In-Review";
    if (!next) return;
    setUpdating(true);
    try { await api.patch(`/api/teamlead/tasks/${task.id}/status`, { status: next }); onRefresh(); }
    catch (err) { useUiStore.getState().addToast({ type: "error", message: err.message ?? "That action failed." }); }
    finally { setUpdating(false); }
  }


  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.22 }}
      className="rounded-2xl border transition-colors"
      style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.06)" }}
    >
      {/* Header — always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded((x) => !x)}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary leading-tight">{task.title}</p>
            <p className="text-[14px] text-slate-600 mt-0.5">{task.type}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="px-2 py-0.5 rounded-full text-[14px] font-bold"
              style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}25`, color: cfg.color }}
            >
              {cfg.label}
            </span>
            <ChevronRight
              size={12}
              className="text-slate-600 transition-transform duration-200"
              style={{ transform: expanded ? "rotate(90deg)" : "none" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-[14px] text-slate-600">
          <span className="flex items-center gap-1"><Users size={9} strokeWidth={2} /> {assignee}</span>
          {task.priority && (
            <span className="font-bold" style={{ color: PRIORITY_COLOR[task.priority] }}>{task.priority}</span>
          )}
          {dl && <span className="font-semibold ml-auto" style={{ color: dl.color }}>{dl.label}</span>}
          {task.isLate && task.status !== "Done" && (
            <span className="flex items-center gap-1 text-red-400 font-semibold">
              <AlertTriangle size={9} strokeWidth={2} /> Late
            </span>
          )}
        </div>
      </div>

      {/* Expanded section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 border-t space-y-3"
              style={{ borderColor: "rgba(20,32,61,0.05)" }}
            >
              <div className="pt-3">
                {/* Capacity indicator */}
                {capacity && (
                  <div className="mb-3">
                    <p className="text-[14px] text-slate-600 mb-1">Assignee capacity</p>
                    <CapacityBadge capacity={capacity} />
                  </div>
                )}

                {/* Description */}
                {task.description && (
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">{task.description}</p>
                )}

                {/* Review note */}
                {task.reviewNote && (
                  <div
                    className="flex gap-2 px-3 py-2 rounded-xl mb-3 text-xs"
                    style={{ background: "rgba(20,32,61,0.03)", border: "1px solid rgba(20,32,61,0.06)" }}
                  >
                    <MessageSquare size={11} className="text-slate-500 shrink-0 mt-0.5" />
                    <p className="text-slate-400">{task.reviewNote}</p>
                  </div>
                )}

                {/* Revision history */}
                {task.revisionHistory?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[14px] text-slate-600 mb-1.5">Revision history</p>
                    <div className="space-y-1.5">
                      {task.revisionHistory.slice(-3).map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-[14px]">
                          <span
                            className="mt-0.5 rounded-full w-2 h-2 shrink-0"
                            style={{ background: r.type === "accepted" ? "#12803B" : "#E8590C" }}
                          />
                          <span className="text-slate-500 leading-tight">{r.comment}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {task.status === "In-Review" && (
                    <button
                      onClick={() => onReview(task)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-bold transition-all"
                      style={{ background: `${TEAL}15`, border: `1px solid ${TEAL}30`, color: TEAL }}
                    >
                      <Eye size={11} strokeWidth={2} /> TL Review
                    </button>
                  )}
                  {(task.status === "To-Do" || task.status === "In-Progress") && (
                    <button
                      onClick={advance}
                      disabled={updating}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[14px] font-semibold border border-ink/10 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {updating ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={2} />}
                      {task.status === "To-Do" ? "Start" : "Submit for Review"}
                    </button>
                  )}
                  {task.status === "Done" && (
                    <span className="flex items-center gap-1 text-[14px] text-emerald-400 font-semibold">
                      <CheckCircle2 size={11} strokeWidth={2} /> Completed
                      {task.qualityScore && (
                        <span className="ml-1 text-amber-400">· {task.qualityScore}★</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
// V1 1.10: create a task from the Tasks page (pick a project, then the usual form). Shared with the T-1 Tasks page.
export function NewTaskPanel({ open, onClose, onCreated }) {
  const [newTask,    setNewTask]    = useState(null); // null | { step: "pick", projects } | { step: "form", projectId, members }
  const [pickId,     setPickId]     = useState("");
  async function startNewTask() {
    try {
      const d = await api.get("/api/teamlead/projects");
      const projects = (d.projects ?? []).filter((p) => !["Completed", "Archived", "Deleted"].includes(p.status));
      setPickId(projects[0]?.id ?? "");
      setNewTask({ step: "pick", projects });
    } catch (e) {
      useUiStore.getState().addToast({ type: "error", message: e.message ?? "Could not load your projects." });
      onClose();
    }
  }
  async function openForm() {
    if (!pickId) return;
    try {
      const d = await api.get(`/api/teamlead/projects/${pickId}/members-workload`);
      // Same rule as the server: a Team Lead assigns only within their own department.
      const myDept = useAuthStore.getState().user?.department;
      const members = (d.members ?? []).filter((m) => m.role !== "Team Lead" && (!myDept || m.department === myDept));
      if (!members.length) {
        useUiStore.getState().addToast({ type: "error", message: `No one from your department${myDept ? ` (${myDept})` : ""} is on this project yet. Ask your Manager to add them.` });
        return;
      }
      setNewTask({ step: "form", projectId: pickId, members });
    } catch (e) {
      useUiStore.getState().addToast({ type: "error", message: e.message ?? "Could not load project members." });
    }
  }

  useEffect(() => { if (open && !newTask) startNewTask(); if (!open) setNewTask(null); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* New task: project picker */}
      {newTask?.step === "pick" && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-accent/25 bg-bg-surface p-4">
          {newTask.projects.length === 0 ? (
            <p className="text-sm text-text-secondary">You have no active projects yet. A Manager adds you to a project first.</p>
          ) : (
            <label className="flex min-w-[240px] flex-1 flex-col gap-1.5">
              <span className="text-xs font-bold text-text-primary">Which project is this task for?</span>
              <select value={pickId} onChange={(e) => setPickId(e.target.value)} className="h-10 rounded-xl border border-ink/[0.10] bg-bg-surface px-3 text-sm text-text-primary">
                {newTask.projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
          )}
          {newTask.projects.length > 0 && (
            <button type="button" onClick={openForm} disabled={!pickId} className="h-10 rounded-xl bg-accent px-4 text-sm font-bold text-[var(--on-accent)] disabled:opacity-40">Continue</button>
          )}
          <button type="button" onClick={() => { setNewTask(null); onClose(); }} className="h-10 rounded-xl border border-ink/[0.10] px-4 text-sm font-semibold text-text-primary">Cancel</button>
        </div>
      )}
      <AnimatePresence>
        {newTask?.step === "form" && (
          <CreateTaskModal
            projectId={newTask.projectId}
            eligibleMembers={newTask.members}
            allowedTaskTypes={["Feature", "Bug", "Design", "Testing", "DevOps", "Documentation"]}
            milestoneWindow={0}
            onClose={() => { setNewTask(null); onClose(); }}
            onCreated={() => { setNewTask(null); useUiStore.getState().addToast({ type: "success", message: "Task created." }); onCreated(); }}
          />
        )}
      </AnimatePresence>

    </>
  );
}

export default function TeamLeadTasksPage() {
  const [tab,        setTab]        = useState("all");
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [reviewTask, setReviewTask] = useState(null);
  const [creating,   setCreating]   = useState(false);

  const fetchTasks = useCallback(() => {
    setLoading(true);
    api.get(`/api/teamlead/tasks?tab=${tab}`)
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filtered = tasks.filter((t) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  const reviewCount = tasks.filter((t) => t.status === "In-Review").length;

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1000px] mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Tasks Hub</h1>
          <p className="text-xs text-slate-500 mt-1">All tasks across your assigned projects</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="ml-auto mr-3 inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-sm font-bold text-white"
          style={{ background: TEAL }}
        >
          <Plus size={15} strokeWidth={2.5} aria-hidden="true" /> New task
        </button>
        {reviewCount > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: `${TEAL}15`, border: `1px solid ${TEAL}30`, color: TEAL }}
          >
            <Eye size={13} />
            {reviewCount} pending review{reviewCount > 1 ? "s" : ""}
          </motion.div>
        )}
      </div>

      <NewTaskPanel open={creating} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); fetchTasks(); }} />

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: "rgba(255,255,255,0.6)", borderColor: "rgba(20,32,61,0.06)" }}>
        {TABS.map((t) => {
          const isActive = tab === t.key;
          const count = t.key === "review" ? reviewCount : t.key === "all" ? tasks.length : null;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{
                background:  isActive ? `${TEAL}20` : "transparent",
                color:       isActive ? "#08695F" : "#4F5B75",
                border:      isActive ? `1px solid ${TEAL}35` : "1px solid transparent",
              }}
            >
              {t.label}
              {count != null && count > 0 && (
                <span
                  className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full text-[14px] font-black"
                  style={{ background: isActive ? TEAL : "rgba(20,32,61,0.10)", color: isActive ? "var(--on-accent)" : "#4F5B75" }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border"
        style={{ background: `${TEAL}05`, borderColor: `${TEAL}18` }}
      >
        <Search size={13} strokeWidth={2} style={{ color: "#08695F" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks…"
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-slate-600 outline-none"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-slate-600 hover:text-slate-400">
            <X size={12} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <TallyLoader />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed" style={{ borderColor: `${TEAL}12` }}>
          <CheckSquare size={32} className="text-slate-700 mb-3" strokeWidth={1.2} />
          <p className="text-sm text-slate-600 font-medium">
            {search ? "No tasks match your search" : "No tasks in this view"}
          </p>
        </div>
      )}

      {/* Task list */}
      {!loading && filtered.length > 0 && (
        <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onReview={(tk) => setReviewTask(tk)}
                onRefresh={fetchTasks}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* TL Review modal */}
      <AnimatePresence>
        {reviewTask && (
          <TLReviewModal
            task={reviewTask}
            onClose={() => setReviewTask(null)}
            onReviewed={() => { fetchTasks(); setReviewTask(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
