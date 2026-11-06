import { useEffect, useState } from "react";
import { PRIORITY_BASE_XP, XP_VALUE_MIN, XP_VALUE_MAX, xpValueError } from "@/utils/xpRules";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, SlidersHorizontal, X, Loader2,
  Clock, Zap, RotateCcw,
} from "lucide-react";
import Button      from "@/components/ui/Button";
import { Link }    from "react-router-dom";
import useTaskStore  from "@/stores/taskStore";
import useAuthStore  from "@/stores/authStore";
import useUiStore    from "@/stores/uiStore";
import api           from "@/lib/api";
import usePerfLog    from "@/hooks/usePerfLog";
import { useRoleTheme } from "@/utils/roleTheme";

import TallyLoader from "@/components/ui/TallyLoader";
import EmptyState  from "@/components/ui/EmptyState";
import KanbanBoard from "@/components/widgets/KanbanBoard";
import SubmitTaskModal from "@/components/widgets/SubmitTaskModal";
import { moveVerdict, SUBMIT } from "@/utils/boardRules";
const COLUMNS = [
  { key: "To-Do",       label: "To Do",      color: "#4F5B75", dot: "#4F5B75"  },
  { key: "In-Progress", label: "In Progress", color: "#1948BD", dot: "#1948BD"  },
  { key: "In-Review",   label: "In Review",   color: "#1948BD", dot: "#1948BD"  },
  { key: "Done",        label: "Done",        color: "#0E6A30", dot: "#0E6A30"  },
];

const BACKLOG_COLUMN = { key: "Backlog", label: "Backlog", color: "#4F5B75", dot: "#4F5B75" };

const PRIORITY_COLOR = {
  Critical: "#B01F17",
  High:     "#9A3A06",
  Medium:   "#7A5200",
  Low:      "#4F5B75",
};

const FILTERS = [
  { label: "All",           value: null },
  { label: "High Priority", value: "priority:High" },
  { label: "Bugs",          value: "type:Bug", roles: ["developer", "tester"] }, // not a design word (item 9)
];

const MANAGER_CATS  = ["director", "manager", "team_lead"];

// ── Board card ────────────────────────────────────────────────────────────────
function TaskCard({ task, saving }) {
  const [now] = useState(() => Date.now()); // fixed at mount
  const priColor = PRIORITY_COLOR[task.priority] ?? "#4F5B75";
  const deadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const daysLeft = task.deadline ? Math.ceil((new Date(task.deadline) - now) / 86400000) : null;
  const overdue  = Boolean(task.deadline) && new Date(task.deadline).getTime() < now && task.status !== "Done";
  const blocked  = (task.dependsOn ?? []).length > 0 && task.status === "To-Do";

  return (
    <Link
      to={`/workspace/tasks/${task._id}`}
      draggable={false}
      className="group flex flex-col gap-1.5 rounded-xl border bg-bg-surface px-3 py-2.5 transition-colors duration-150 hover:border-ink/20"
      style={{ borderColor: "rgba(20,32,61,0.08)", opacity: saving ? 0.6 : 1 }}
    >
      <div className="flex items-start gap-2">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: priColor }} aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-text-primary line-clamp-2">{task.title}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-4 text-[12px] text-text-secondary">
        <span className="font-semibold" style={{ color: priColor }}>{task.priority}</span>
        {task.projectName && <span className="truncate">{task.projectName}</span>}
        {(task.revisionCount ?? 0) > 0 && (
          <span className="flex items-center gap-1 font-bold text-[#9A3A06]"><RotateCcw size={10} strokeWidth={2.5} aria-hidden="true" /> Rev</span>
        )}
        {blocked && <span className="font-semibold text-[#7A4B00]">Has prerequisites</span>}
        {task.xpValue ? <span className="flex items-center gap-1"><Zap size={10} strokeWidth={2} aria-hidden="true" />{task.xpValue} XP</span> : null}
        {deadline && (
          <span className="ml-auto flex items-center gap-1" style={{ color: overdue ? "#B01F17" : undefined }}>
            <Clock size={10} strokeWidth={2} aria-hidden="true" />
            {overdue ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : "Overdue") : daysLeft === 0 ? "Today" : deadline}
          </span>
        )}
      </div>
    </Link>
  );
}

// ── TaskBoardPage ─────────────────────────────────────────────────────────────
export default function TaskBoardPage() {
  const { tasks, loading, fetchTasks, updateTaskStatus } = useTaskStore();
  const addToast     = useUiStore((s) => s.addToast);
  const user         = useAuthStore((s) => s.user);
  const theme        = useRoleTheme();
  const roleCategory = user?.roleCategory;
  const isManager    = MANAGER_CATS.includes(roleCategory);
  const readOnly     = user?.role === "Manager"; // M-2: Managers view tasks; the Team Lead changes them (server blocks writes too)

  const [activeFilter, setActiveFilter] = useState(null);
  const [showModal,    setShowModal]     = useState(false);
  const [submitting,   setSubmitting]    = useState(null); // task being submitted after a drop into In Review
  const isLead = ["Manager", "Team Lead"].includes(user?.role);
  const isMine = (t) => [...(t.assignees ?? []), t.assignee].filter(Boolean).some((a) => String(a._id ?? a) === String(user?.id));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchTasks(); }, []);

  const filtered = tasks.filter((t) => {
    if (!activeFilter) return true;
    const [key, val] = activeFilter.split(":");
    return key === "priority" ? t.priority === val : t.type === val;
  });


  return (
    <div className="flex flex-col min-h-full px-6 py-6 gap-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-black text-text-primary">My Tasks</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {user?.role} • {tasks.length} total task{tasks.length !== 1 ? "s" : ""} • drag a card to move it
          </p>
        </div>
        {isManager && !readOnly && (
          <Button variant="primary" size="md" onClick={() => setShowModal(true)}>
            <Plus size={15} strokeWidth={2.5} />
            New Task
          </Button>
        )}
      </motion.div>

      {/* ── Filter chips ── */}
      <div className="flex items-center gap-2">
        <SlidersHorizontal size={12} className="text-slate-600" strokeWidth={2} />
        {FILTERS.filter((f) => !f.roles || isManager || f.roles.includes(roleCategory)).map((f) => {
          const active = f.value === null ? activeFilter === null : activeFilter === f.value;
          return (
            <button
              key={f.label}
              onClick={() => setActiveFilter(active ? null : f.value)}
              className={[
                "px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150",
                active
                  ? "border-ink/40 text-text-primary"
                  : "bg-ink/[0.04] border-ink/10 text-slate-500 hover:text-slate-700 hover:border-ink/20",
              ].join(" ")}
              style={active ? { background: theme.accentLight, borderColor: theme.border, color: theme.text } : {}}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <TallyLoader />
        </div>
      )}

      {/* ── Kanban board (V1 1.8) ── */}
      {!loading && (
        filtered.length === 0 ? (
          <EmptyState
            heading={isManager ? "No tasks yet" : "No tasks assigned to you yet"}
            body={readOnly ? "Team Leads create and assign tasks. They show up here." : isManager ? "Create a task and assign it to someone on your team." : "When your Team Lead assigns work, it shows up here."}
            action={isManager && !readOnly ? { label: "New task", onClick: () => setShowModal(true) } : undefined}
          />
        ) : (
          <KanbanBoard
            columns={isLead ? [BACKLOG_COLUMN, ...COLUMNS] : COLUMNS}
            tasks={filtered}
            renderCard={(t, { saving }) => <TaskCard task={t} saving={saving} />}
            canDrag={(t) => !readOnly && t.status !== "Done"}
            decide={(t, to) => moveVerdict({ role: user?.role, roleCategory, task: t, to, isAssignee: isMine(t) })}
            onMove={async (t, to, action) => {
              if (action === SUBMIT) { setSubmitting(t); return; }
              await updateTaskStatus(t._id, to);
            }}
            onRefuse={(reason) => addToast({ type: "error", message: reason })}
          />
        )
      )}

      {/* ── Submit form opened by dropping a task into In Review ── */}
      <AnimatePresence>
        {submitting && (
          <SubmitTaskModal
            task={submitting}
            onClose={() => setSubmitting(null)}
            onSubmitted={() => { setSubmitting(null); fetchTasks(); }}
          />
        )}
      </AnimatePresence>

      {/* ── New Task modal ── */}
      <AnimatePresence>
        {showModal && (
          <NewTaskModal
            roleCategory={roleCategory}
            onClose={() => setShowModal(false)}
            onCreated={() => {
              setShowModal(false);
              fetchTasks();
              addToast({ type: "success", message: "Task created!" });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── NewTaskModal ──────────────────────────────────────────────────────────────
function NewTaskModal({ roleCategory, onClose, onCreated }) {
  const createTask = useTaskStore((s) => s.createTask);
  const addToast   = useUiStore((s) => s.addToast);
  const { log }    = usePerfLog();

  const [form, setForm] = useState({
    title:       "",
    description: "",
    type:        "Feature",
    priority:    "Medium",
    xpValue:     "",
    goldValue:   50,
    deadline:    "",
    assignees:   [],
  });
  const [members,    setMembers]    = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const endpoint = roleCategory === "director" ? "/api/director/team" : "/api/manager/team";
    api.get(endpoint)
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [roleCategory]);

  const field = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function toggleAssignee(id) {
    setForm((f) => ({
      ...f,
      assignees: f.assignees.includes(id)
        ? f.assignees.filter((a) => a !== id)
        : [...f.assignees, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const xpErr = xpValueError(form.xpValue);
    if (xpErr) { addToast({ type: "error", message: `XP value: ${xpErr}.` }); return; }
    setSubmitting(true);
    try {
      const t0 = performance.now();
      await createTask({
        ...form,
        xpValue:   form.xpValue === "" ? null : Number(form.xpValue),
        goldValue: +form.goldValue,
        deadline:  form.deadline || null,
      });
      log("create_task", performance.now() - t0, "/workspace/tasks");
      onCreated();
    } catch (err) {
      addToast({ type: "error", message: err.message ?? "Failed to create task." });
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "bg-ink/[0.04] border border-ink/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent/40 w-full";
  const selectCls = "bg-[#FFFFFF] border border-ink/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-accent/40 w-full";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#FFFFFF] border border-ink/[0.08] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/[0.06]">
          <h2 className="text-base font-black text-text-primary">New Quest</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">

          {/* Title */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-bold uppercase tracking-wider text-slate-500">
              Title *
            </span>
            <input
              value={form.title}
              onChange={field("title")}
              required
              placeholder="Task title..."
              className={inputCls}
            />
          </label>

          {/* Description */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[14px] font-bold uppercase tracking-wider text-slate-500">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={field("description")}
              rows={3}
              placeholder="What needs to be done..."
              className={`${inputCls} resize-none`}
            />
          </label>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-bold uppercase tracking-wider text-slate-500">Type *</span>
              <select value={form.type} onChange={field("type")} className={selectCls}>
                {["Feature", "Bug", "Design", "Testing", "DevOps", "Documentation"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-bold uppercase tracking-wider text-slate-500">Priority</span>
              <select value={form.priority} onChange={field("priority")} className={selectCls}>
                {["Critical", "High", "Medium", "Low"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>

          {/* XP + Gold + Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-bold uppercase tracking-wider text-slate-500">XP</span>
              <input
                type="number" min={XP_VALUE_MIN} max={XP_VALUE_MAX} step={1}
                placeholder={`${PRIORITY_BASE_XP[form.priority] ?? 50} (default)`}
                value={form.xpValue} onChange={field("xpValue")}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-bold uppercase tracking-wider text-slate-500">Gold</span>
              <input
                type="number" min={0}
                value={form.goldValue} onChange={field("goldValue")}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[14px] font-bold uppercase tracking-wider text-slate-500">Deadline</span>
              <input
                type="date"
                value={form.deadline} onChange={field("deadline")}
                className={inputCls}
              />
            </label>
          </div>

          {/* Assignees */}
          {members.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[14px] font-bold uppercase tracking-wider text-slate-500">
                Assignees
              </span>
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto rounded-lg border border-ink/[0.06] p-1.5">
                {members.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-ink/[0.03] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.assignees.includes(m.id)}
                      onChange={() => toggleAssignee(m.id)}
                      className="accent-[var(--accent-text)]"
                    />
                    <span className="text-xs text-slate-300">{m.name}</span>
                    <span className="ml-auto text-[14px] text-slate-600">{m.role}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink/[0.05]">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.title.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#2A62EC] text-white hover:bg-[#4338ca] disabled:opacity-50 transition-colors shadow-card"
            >
              {submitting
                ? <Loader2 size={12} className="animate-spin" />
                : <Plus size={12} strokeWidth={2.5} />
              }
              Create Quest
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
