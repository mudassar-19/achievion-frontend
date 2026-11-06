import { fmt as dFull, fmtShort as dShort } from "@/pages/manager/project/format";
import { useEffect, useState, useCallback } from "react";
import { PRIORITY_BASE_XP, XP_VALUE_MIN, XP_VALUE_MAX, xpValueError } from "@/utils/xpRules";
import { useParams, useNavigate }           from "react-router-dom";
import { motion, AnimatePresence }          from "framer-motion";
import {
  Loader2, ChevronLeft, Plus, X, Zap, AlertTriangle,
  CheckCircle2, Clock, Circle, Eye, Users, Calendar,
  BarChart2, Shield, Flag, Activity, Info,
} from "lucide-react";
import api from "@/lib/api";

import TallyLoader from "@/components/ui/TallyLoader";
import AiTaskSuggest from "@/components/widgets/AiTaskSuggest";
const TEAL = "#08695F";

// ── Constants ──────────────────────────────────────────────────────────────────
const TASK_STATUS_CFG = {
  "To-Do":       { color: "#3A4660", label: "To Do",       Icon: Circle        },
  "Backlog":     { color: "#4F5B75", label: "Backlog",      Icon: Circle        },
  "In-Progress": { color: "#1948BD", label: "In Progress",  Icon: Clock         },
  "In-Review":   { color: "#1948BD", label: "In Review",    Icon: Eye           },
  "Done":        { color: "#0E6A30", label: "Done",         Icon: CheckCircle2  },
};
function tsCfg(s) { return TASK_STATUS_CFG[s] ?? TASK_STATUS_CFG["To-Do"]; }

const PRIORITY_COLOR  = { Critical: "#B01F17", High: "#9A3A06", Medium: "#7A5200", Low: "#3A4660" };
const DIFFICULTY_COLOR = { Easy: "#0E6A30", Medium: "#08695F", Hard: "#7A5200", Critical: "#B01F17" };
const DIFFICULTIES    = ["Easy", "Medium", "Hard", "Critical"];
const PRIORITIES      = ["Low", "Medium", "High", "Critical"];

const RISK_CFG = {
  Low:      { color: "#0E6A30", bg: "rgba(18,128,59,0.10)",   label: "Low Risk"      },
  Medium:   { color: "#7A5200", bg: "rgba(255,194,26,0.10)",    label: "Medium Risk"   },
  High:     { color: "#9A3A06", bg: "rgba(232,89,12,0.10)",   label: "High Risk"     },
  Critical: { color: "#B01F17", bg: "rgba(209,41,31,0.10)",    label: "Critical Risk" },
};

const WORKLOAD_TIER_COLOR = {
  "Free":             "#0E6A30",
  "Moderate Load":    "#7A5200",
  "Busy":             "#9A3A06",
  "Critical Overload":"#B01F17",
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

// ── Helpers ────────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[14px] font-bold uppercase tracking-widest text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function inputClass(err) {
  return [
    "w-full bg-ink/[0.04] border rounded-xl px-3 py-2.5 text-sm text-text-primary",
    "placeholder:text-slate-600 outline-none transition-colors",
    err
      ? "border-red-500/60 focus:border-red-500"
      : "border-ink/10 focus:border-teal-500/60",
  ].join(" ");
}

function ProgressBar({ value = 0, color = TEAL, height = "h-2" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`${height} w-full rounded-full bg-ink/[0.06] overflow-hidden`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color, boxShadow: "var(--shadow-1)" }}
      />
    </div>
  );
}

// ── Workload Chip ──────────────────────────────────────────────────────────────
function WorkloadChip({ tier, utilisation }) {
  const color = WORKLOAD_TIER_COLOR[tier] ?? "#3A4660";
  return (
    <span
      className="text-[14px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}
    >
      {tier ?? "—"} {utilisation != null ? `· ${utilisation}%` : ""}
    </span>
  );
}

// ── Live Workload Preview Panel ────────────────────────────────────────────────
function WorkloadPreview({ snapshot, loading }) {
  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <Loader2 size={12} className="animate-spin" /> Loading workload…
    </div>
  );
  if (!snapshot) return null;

  const color = WORKLOAD_TIER_COLOR[snapshot.workloadTier] ?? "#3A4660";
  return (
    <div
      className="rounded-xl border p-3 flex flex-col gap-2"
      style={{ background: `${color}06`, borderColor: `${color}20` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-text-primary">{snapshot.name}</span>
        <WorkloadChip tier={snapshot.workloadTier} utilisation={snapshot.utilisation} />
      </div>
      <ProgressBar value={snapshot.utilisation} color={color} height="h-1.5" />
      <div className="flex items-center gap-4 text-[14px] text-slate-500">
        <span>{snapshot.allocatedHours}h allocated</span>
        <span>{snapshot.availableHours}h free</span>
        <span>HP: {snapshot.hp}%</span>
        {snapshot.burnoutRisk && (
          <span style={{ color: snapshot.burnoutRisk === "Low" ? "#0E6A30" : snapshot.burnoutRisk === "Moderate" ? "#7A5200" : "#B01F17" }}>
            Burnout: {snapshot.burnoutRisk}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Intelligent Task Creation Modal ───────────────────────────────────────────
// Also used by the Tasks Hub (V1 1.10) without a milestone.
export function CreateTaskModal({
  milestoneId, projectId, eligibleMembers, allowedTaskTypes,
  milestoneWindow, onClose, onCreated,
}) {
  const [form, setForm] = useState({
    title:          "",
    description:    "",
    type:           allowedTaskTypes[0] ?? "Feature",
    priority:       "Medium",
    difficulty:     "Medium",
    assigneeId:     "",
    estimatedHours: "",
    tags:           "",
    xpValue:        "",
    startDate:      "",
    endDate:        "",
  });
  const [errors,   setErrors]   = useState({});
  const [apiErr,   setApiErr]   = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loading,  setLoading]  = useState(false);

  // Live workload preview
  const [wlSnapshot,  setWlSnapshot]  = useState(null);
  const [wlLoading,   setWlLoading]   = useState(false);

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  // Fetch workload snapshot when assignee changes
  useEffect(() => {
    if (!form.assigneeId) { setWlSnapshot(null); return; }
    setWlLoading(true);
    api.get(`/api/workload/employee/${form.assigneeId}`)
      .then((d) => setWlSnapshot(d))
      .catch(() => setWlSnapshot(null))
      .finally(() => setWlLoading(false));
  }, [form.assigneeId]);

  function validate() {
    const e = {};
    if (!form.title.trim())  e.title = "Title is required";
    if (!form.assigneeId)    e.assigneeId = "Select an assignee";
    const hrs = parseFloat(form.estimatedHours);
    if (form.estimatedHours && (isNaN(hrs) || hrs < 0.25 || hrs > 200)) {
      e.estimatedHours = "Must be between 0.25 and 200 hours";
    }
    const xpErr = xpValueError(form.xpValue);
    if (xpErr) e.xpValue = xpErr;
    // No capacity-blocking: milestone window is a reference, not a consumable limit
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); setApiErr(null); setLoading(true);

    try {
      const body = {
        title:          form.title.trim(),
        description:    form.description.trim(),
        type:           form.type,
        priority:       form.priority,
        difficulty:     form.difficulty,
        assigneeId:     form.assigneeId,
        milestoneId,
        projectId,
      };
      if (form.estimatedHours) body.estimatedHours = parseFloat(form.estimatedHours);
      const tags = form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 5);
      if (tags.length) body.tags = tags;
      if (form.xpValue !== "")   body.xpValue        = Number(form.xpValue);
      if (form.startDate)      body.startDate      = form.startDate;
      if (form.endDate)        body.endDate        = form.endDate;

      const res = await api.post("/api/tasks", body);
      if (res.warnings?.length) setWarnings(res.warnings);
      onCreated(res.task);
      onClose();
    } catch (err) {
      setApiErr(err.message ?? "Failed to create task");
    } finally {
      setLoading(false);
    }
  }

  const hoursNum = parseFloat(form.estimatedHours);
  // Informational only — not a blocker
  const exceedsWindow = !isNaN(hoursNum) && milestoneWindow > 0 && hoursNum > milestoneWindow;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22 }}
        className="relative w-full max-w-[580px] max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl"
        style={{ background: "linear-gradient(180deg, #F5F6FA 0%, #F5F6FA 100%)", borderColor: `${TEAL}25` }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: "linear-gradient(180deg, #F5F6FA 0%, #F5F6FA 100%)", borderColor: `${TEAL}15` }}
        >
          <div className="flex items-center gap-2">
            <Zap size={15} strokeWidth={2} style={{ color: "#08695F" }} />
            <h2 className="text-sm font-black text-text-primary">Create Task</h2>
            {milestoneWindow > 0 && (
              <span
                className="text-[14px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${TEAL}15`, color: TEAL }}
              >
                {milestoneWindow}h window
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-700 transition-colors">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {apiErr && (
            <div className="px-3 py-2.5 rounded-xl text-xs text-red-400 font-medium bg-red-500/10 border border-red-500/20">
              {apiErr}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="px-3 py-2.5 rounded-xl text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 flex flex-col gap-1">
              {warnings.map((w, i) => <span key={i}>⚠ {w}</span>)}
            </div>
          )}

          {/* Title */}
          <Field label="Task Title *">
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="What needs to be done?"
              className={inputClass(errors.title)}
            />
            {errors.title && <p className="text-[14px] text-red-400">{errors.title}</p>}
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief description of the task…"
              rows={2}
              className={inputClass()}
              style={{ resize: "none" }}
            />
          </Field>

          <AiTaskSuggest form={form} projectId={projectId}
            onApply={({ description, estimatedHours, tags }) => {
              set("description", description);
              if (estimatedHours) set("estimatedHours", estimatedHours);
              set("tags", tags);
            }} />

          <Field label="Tags (optional, comma separated)">
            <input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="frontend, auth" className={inputClass()} />
          </Field>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Task Category">
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inputClass()}>
                {allowedTaskTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={inputClass()}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          {/* XP base (D-066) */}
          <Field label="XP value">
            <input
              type="number" inputMode="numeric" min={XP_VALUE_MIN} max={XP_VALUE_MAX} step={1}
              aria-label="XP value"
              aria-invalid={Boolean(errors.xpValue)}
              placeholder={`${PRIORITY_BASE_XP[form.priority] ?? 50} (default for ${form.priority})`}
              value={form.xpValue}
              onChange={(e) => set("xpValue", e.target.value)}
              className={inputClass(errors.xpValue)}
            />
            {errors.xpValue
              ? <p className="text-[14px] text-red-400">{errors.xpValue}</p>
              : <p className="text-[13px] text-text-secondary">Base XP. The final award also depends on timing and review quality.</p>}
          </Field>

          {/* Difficulty */}
          <Field label="Difficulty">
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d} type="button"
                  onClick={() => set("difficulty", d)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: form.difficulty === d ? `${DIFFICULTY_COLOR[d]}20` : "rgba(20,32,61,0.04)",
                    border:     `1px solid ${form.difficulty === d ? DIFFICULTY_COLOR[d] : "rgba(20,32,61,0.08)"}`,
                    color:      form.difficulty === d ? DIFFICULTY_COLOR[d] : "#4F5B75",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>

          {/* Assignee */}
          <Field label="Assign To *">
            <select
              value={form.assigneeId}
              onChange={(e) => set("assigneeId", e.target.value)}
              className={inputClass(errors.assigneeId)}
            >
              <option value="">Select team member…</option>
              {eligibleMembers.map((m) => {
                const wl    = m.workloadTier ?? m.workload ?? "";
                const avail = m.availableHours != null ? ` · ${m.availableHours}h free` : "";
                return (
                  <option key={m.userId ?? m.id} value={m.userId ?? m.id}>
                    {m.name} · {m.role}{wl ? ` (${wl})` : ""}{avail}
                  </option>
                );
              })}
            </select>
            {errors.assigneeId && <p className="text-[14px] text-red-400">{errors.assigneeId}</p>}
          </Field>

          {/* Live workload preview */}
          <WorkloadPreview snapshot={wlSnapshot} loading={wlLoading} />

          {/* Estimated Hours */}
          <Field label="Estimated Work Hours">
            <input
              type="number"
              min="0.25" max="200" step="0.25"
              value={form.estimatedHours}
              onChange={(e) => set("estimatedHours", e.target.value)}
              placeholder="e.g. 4.0"
              className={inputClass(errors.estimatedHours || exceedsWindow)}
            />
            {errors.estimatedHours && <p className="text-[14px] text-red-400">{errors.estimatedHours}</p>}
            {exceedsWindow && !errors.estimatedHours && (
              <p className="text-[14px] text-amber-400">
                ⚠ Exceeds milestone window ({milestoneWindow}h) — task can still be created
              </p>
            )}
            {form.estimatedHours && !isNaN(hoursNum) && hoursNum > 0 && (
              <p className="text-[14px] text-slate-600">
                Auto-distributed across working days based on employee availability
              </p>
            )}
          </Field>

          {/* Start + End Date */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Scheduled Start">
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className={inputClass()}
                style={{ colorScheme: "dark" }}
              />
            </Field>
            <Field label="Deadline / End Date">
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className={inputClass()}
                style={{ colorScheme: "dark" }}
              />
            </Field>
          </div>

          <div
            className="flex items-start gap-2 px-3 py-2 rounded-xl text-[14px] text-slate-500"
            style={{ background: "rgba(20,32,61,0.03)", border: "1px solid rgba(20,32,61,0.06)" }}
          >
            <Info size={11} strokeWidth={2} className="mt-0.5 shrink-0" style={{ color: "#08695F" }} />
            Task will auto-activate at scheduled start time. Employee submits work — TL reviews & scores quality.
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-ink/10 hover:border-ink/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all duration-150 flex items-center justify-center gap-2"
              style={{ background: TEAL, color: "var(--on-accent)", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} strokeWidth={2.5} />}
              {loading ? "Creating…" : "Create Task"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────────────
function ReviewModal({ task, onClose, onReviewed }) {
  const [action,  setAction]  = useState("approve");
  const [quality, setQuality] = useState(4);
  const [note,    setNote]    = useState("");
  const [loading, setLoading] = useState(false);
  const [apiErr,  setApiErr]  = useState(null);

  async function submit() {
    if (action === "approve" && (!quality || quality < 1 || quality > 5)) {
      setApiErr("Quality score 1–5 is required to approve"); return;
    }
    setLoading(true); setApiErr(null);
    try {
      await api.post(`/api/tasks/${task.id}/review`, { action, qualityScore: +quality, note });
      onReviewed();
      onClose();
    } catch (err) {
      setApiErr(err.message);
    } finally {
      setLoading(false);
    }
  }

  const QUALITY_LABEL = { 1: "Very Poor", 2: "Poor", 3: "Acceptable", 4: "Good", 5: "Excellent" };
  const QUALITY_COLOR = { 1: "#B01F17", 2: "#9A3A06", 3: "#7A5200", 4: "#0E6A30", 5: "#08695F" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-[440px] rounded-3xl border shadow-2xl overflow-hidden"
        style={{ background: "linear-gradient(180deg, #F5F6FA 0%, #F5F6FA 100%)", borderColor: `${TEAL}25` }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: `${TEAL}15` }}>
          <h2 className="text-sm font-black text-text-primary">Review Submission</h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-700"><X size={16} /></button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm font-semibold text-slate-300 truncate">"{task.title}"</p>
          {task.assignee && (
            <p className="text-xs text-slate-600">Submitted by: {task.assignee.name}</p>
          )}

          {/* Submission content preview */}
          {task.submissionNote && (
            <div className="px-4 py-3 rounded-xl border" style={{ background: "rgba(20,32,61,0.03)", borderColor: "rgba(20,32,61,0.07)" }}>
              <p className="text-[14px] font-bold uppercase tracking-widest text-slate-600 mb-1">Submission Note</p>
              <p className="text-xs text-slate-300 leading-relaxed">{task.submissionNote}</p>
            </div>
          )}

          {apiErr && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">{apiErr}</div>
          )}

          {/* Approve / Reject */}
          <div className="flex gap-3">
            {["approve", "reject"].map((a) => (
              <button
                key={a} onClick={() => setAction(a)}
                className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                style={{
                  background: action === a ? (a === "approve" ? "#12803B20" : "#B01F1720") : "transparent",
                  border:     `1px solid ${action === a ? (a === "approve" ? "#12803B" : "#B01F17") : "rgba(20,32,61,0.10)"}`,
                  color:      action === a ? (a === "approve" ? "#0E6A30" : "#B01F17") : "#3A4660",
                }}
              >
                {a === "approve" ? "✓ Approve" : "✕ Reject"}
              </button>
            ))}
          </div>

          {/* Quality Score */}
          {action === "approve" && (
            <Field label="Quality Score (1–5)">
              <div className="flex gap-2">
                {[1,2,3,4,5].map((n) => (
                  <button
                    key={n} onClick={() => setQuality(n)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all flex flex-col items-center gap-0.5"
                    style={{
                      background: quality === n ? `${QUALITY_COLOR[n]}20` : "rgba(20,32,61,0.04)",
                      border:     `1px solid ${quality === n ? QUALITY_COLOR[n] : "rgba(20,32,61,0.08)"}`,
                      color:      quality === n ? QUALITY_COLOR[n] : "#4F5B75",
                    }}
                  >
                    {n}
                    {quality === n && (
                      <span className="text-[14px] font-semibold leading-tight text-center">{QUALITY_LABEL[n]}</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-[14px] text-slate-600 mt-1">
                5/5 → Bonus XP · 4/5 → Standard XP · Below 4 → Reduced XP
              </p>
            </Field>
          )}

          {/* Note */}
          <Field label={action === "approve" ? "Feedback (optional)" : "Rejection reason *"}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={action === "approve" ? "Feedback for the employee…" : "What needs to change?"}
              rows={3}
              className={inputClass()}
              style={{ resize: "none" }}
            />
          </Field>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-ink/10">
              Cancel
            </button>
            <button
              onClick={submit} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all"
              style={{
                background: action === "approve" ? "#12803B" : "#D1291F",
                color: "#fff", opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? "Submitting…" : action === "approve" ? "Approve & Award XP" : "Reject & Return"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, onReview }) {
  const cfg         = tsCfg(task.status);
  const assignName  = task.assignee?.name ?? "Unassigned";
  const priColor    = PRIORITY_COLOR[task.priority] ?? "#3A4660";

  const startFmt = task.startDate
    ? dShort(task.startDate)
    : null;
  const dlFmt = (task.endDate ?? task.deadline)
    ? dShort(task.endDate ?? task.deadline)
    : null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors hover:bg-ink/[0.025]"
      style={{ borderColor: "rgba(20,32,61,0.05)" }}
    >
      {/* Status icon — read-only, no manual advance */}
      <cfg.Icon size={15} strokeWidth={1.75} style={{ color: cfg.color }} className="shrink-0" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[14px] text-slate-600">{assignName}</span>
          {task.estimatedHours && (
            <span className="text-[14px] text-slate-700">· {task.estimatedHours}h est.</span>
          )}
          {startFmt && <span className="text-[14px] text-slate-700">· Starts {startFmt}</span>}
          {dlFmt    && <span className="text-[14px] text-slate-700">· Due {dlFmt}</span>}
          {task.difficulty && task.difficulty !== "Medium" && (
            <span className="text-[14px] font-bold" style={{ color: DIFFICULTY_COLOR[task.difficulty] }}>
              {task.difficulty}
            </span>
          )}
          {task.priority && task.priority !== "Medium" && (
            <span className="text-[14px] font-bold" style={{ color: priColor }}>{task.priority}</span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span
        className="px-2 py-0.5 rounded-full text-[14px] font-bold shrink-0"
        style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`, color: cfg.color }}
      >
        {cfg.label}
      </span>

      {/* Review button — only for In-Review */}
      {task.status === "In-Review" && (
        <button
          onClick={() => onReview(task)}
          className="px-2.5 py-1 rounded-lg text-[14px] font-bold transition-all shrink-0"
          style={{ background: `${TEAL}15`, border: `1px solid ${TEAL}30`, color: TEAL }}
        >
          Review
        </button>
      )}
    </div>
  );
}

// ── Hours Gauge (Work-Done Tracking Model) ────────────────────────────────────
function HoursGauge({ workDone = 0, milestoneWindow = 0, executionProgress = 0 }) {
  const color = executionProgress >= 90 ? "#B01F17" : executionProgress >= 70 ? "#7A5200" : TEAL;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <span className="text-3xl font-black tabular-nums" style={{ color }}>
            {(workDone ?? 0).toFixed(1)}
          </span>
          <span className="text-lg font-semibold text-slate-500 ml-1">/ {milestoneWindow ?? 0}h</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-text-primary">{executionProgress ?? 0}% executed</p>
          <p className="text-[14px] text-slate-600">hours of work completed</p>
        </div>
      </div>
      <ProgressBar value={executionProgress ?? 0} color={color} height="h-3" />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TeamLeadMilestoneDetailPage() {
  const { id: projectId, milestoneId } = useParams();
  const navigate = useNavigate();

  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [reviewTask,  setReviewTask]  = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    return api.get(`/api/teamlead/projects/${projectId}/milestones/${milestoneId}`)
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId, milestoneId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <TallyLoader />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle size={32} className="text-red-400" strokeWidth={1.5} />
        <p className="text-sm text-red-400">{error ?? "Milestone not found."}</p>
        <button
          onClick={() => navigate(`/teamlead/projects/${projectId}`)}
          className="text-xs text-slate-400 underline"
        >
          Back to project
        </button>
      </div>
    );
  }

  const { milestone, hours, riskLevel, tasks, members, eligibleMembers, allowedTaskTypes, taskCounts } = data;
  const risk = RISK_CFG[riskLevel] ?? RISK_CFG.Low;

  const msStatusCfg = {
    Pending:       { color: "#3A4660" },
    "In Progress": { color: "#1948BD" },
    Delayed:       { color: "#B01F17" },
    Completed:     { color: "#0E6A30" },
  };
  const msColor = (msStatusCfg[milestone.status] ?? msStatusCfg["Pending"]).color;

  // Group tasks by status
  const grouped = {
    "To-Do":       tasks.filter((t) => t.status === "To-Do"),
    "In-Progress": tasks.filter((t) => t.status === "In-Progress"),
    "In-Review":   tasks.filter((t) => t.status === "In-Review"),
    "Done":        tasks.filter((t) => t.status === "Done"),
  };

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1100px] mx-auto flex flex-col gap-6">

      {/* ── Back ───────────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(`/teamlead/projects/${projectId}`)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors w-fit"
      >
        <ChevronLeft size={14} strokeWidth={2} /> Back to Project
      </button>

      {/* ── Milestone Header ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-7 border"
        style={{
          background:  "linear-gradient(135deg, #F5F6FA 0%, #EAEDF4 40%, #F5F6FA 100%)",
          borderColor: `${msColor}22`,
          boxShadow:   "var(--shadow-1)",
        }}
      >
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl pointer-events-none" style={{ background: `${msColor}12` }} />

        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-black text-text-primary">{milestone.title}</h1>
              <span
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: `${msColor}18`, border: `1px solid ${msColor}30`, color: msColor }}
              >
                {milestone.status}
              </span>
              <span
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: risk.bg, border: `1px solid ${risk.color}30`, color: risk.color }}
              >
                <Shield size={10} strokeWidth={2} />
                {risk.label}
              </span>
            </div>
            {milestone.description && (
              <p className="text-sm text-slate-500">{milestone.description}</p>
            )}
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0"
            style={{ background: `${TEAL}18`, border: `1px solid ${TEAL}35`, color: TEAL }}
          >
            <Plus size={14} strokeWidth={2.5} /> Create Task
          </button>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          {milestone.startDate && (
            <span className="flex items-center gap-1.5">
              <Calendar size={11} strokeWidth={2} style={{ color: "#08695F" }} />
              Start: {dFull(milestone.startDate)}
            </span>
          )}
          {milestone.dueDate && (
            <span className="flex items-center gap-1.5">
              <Flag size={11} strokeWidth={2} style={{ color: msColor }} />
              Due: {dFull(milestone.dueDate)}
            </span>
          )}
          {milestone.activeRoles?.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Users size={11} strokeWidth={2} style={{ color: "#08695F" }} />
              {milestone.activeRoles.join(" · ")}
            </span>
          )}
          {hours.workingDays > 0 && (
            <span className="flex items-center gap-1.5">
              <Activity size={11} strokeWidth={2} style={{ color: "#08695F" }} />
              {hours.workingDays} working days
            </span>
          )}
        </div>

        {/* Progress bar */}
        {milestone.progress > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">Milestone Progress</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: msColor }}>{milestone.progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-ink/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${milestone.progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: msColor, boxShadow: "var(--shadow-1)" }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Two-column: Hours + Task Counts ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Hours Tracker */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="p-6 rounded-2xl border"
          style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.07)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={14} strokeWidth={1.75} style={{ color: "#08695F" }} />
            <h2 className="text-sm font-black text-text-primary">Milestone Progress Tracker</h2>
          </div>

          {hours.milestoneWindow > 0 ? (
            <HoursGauge
              workDone={hours.workDone}
              milestoneWindow={hours.milestoneWindow}
              executionProgress={hours.executionProgress}
            />
          ) : (
            <p className="text-xs text-slate-600">
              Set milestone start &amp; due dates to calculate the work window.
            </p>
          )}

          {hours.activeContributors > 0 && hours.milestoneWindow > 0 && (
            <p className="text-[14px] text-slate-600 mt-1">
              {hours.workingDays} days × 7h × {hours.activeContributors} contributor{hours.activeContributors !== 1 ? "s" : ""}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            {[
              { label: "Milestone Window",  value: `${hours.milestoneWindow}h`,    color: TEAL      },
              { label: "Work Completed",    value: `${hours.workDone}h`,           color: "#0E6A30" },
              { label: "Scheduled",         value: `${hours.scheduledHours}h`,     color: "#1948BD" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl p-3 flex flex-col gap-0.5"
                style={{ background: "rgba(20,32,61,0.03)", border: "1px solid rgba(20,32,61,0.06)" }}
              >
                <span className="text-base font-black tabular-nums" style={{ color }}>{value}</span>
                <span className="text-[14px] font-bold uppercase tracking-wider text-slate-600">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Task status breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="p-6 rounded-2xl border"
          style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.07)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} strokeWidth={1.75} style={{ color: "#08695F" }} />
            <h2 className="text-sm font-black text-text-primary">Task Status</h2>
            <span className="ml-auto text-sm font-black text-text-primary tabular-nums">{taskCounts.total} total</span>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { key: "To-Do",       count: taskCounts.toDo,       status: "To-Do"       },
              { key: "In-Progress", count: taskCounts.inProgress,  status: "In-Progress" },
              { key: "In-Review",   count: taskCounts.inReview,    status: "In-Review"   },
              { key: "Done",        count: taskCounts.done,        status: "Done"        },
            ].map(({ key, count, status }) => {
              const cfg = tsCfg(status);
              const pct = taskCounts.total > 0 ? Math.round((count / taskCounts.total) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <cfg.Icon size={13} strokeWidth={1.75} style={{ color: cfg.color }} className="shrink-0" />
                  <span className="text-xs text-slate-400 w-24 shrink-0">{cfg.label}</span>
                  <div className="flex-1">
                    <ProgressBar value={pct} color={cfg.color} height="h-1.5" />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-8 text-right shrink-0" style={{ color: cfg.color }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── Team Workload Snapshot ────────────────────────────────────────────── */}
      {members.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="p-5 rounded-2xl border"
          style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #F5F6FA 100%)", borderColor: "rgba(20,32,61,0.06)" }}
        >
          <h2 className="text-sm font-black text-text-primary mb-4 flex items-center gap-2">
            <Users size={14} strokeWidth={1.75} style={{ color: "#08695F" }} />
            Team Workload
          </h2>
          <div className="flex flex-col gap-2">
            {members.slice(0, 8).map((m) => {
              const color = WORKLOAD_TIER_COLOR[m.workloadTier] ?? "#3A4660";
              return (
                <div key={m.userId} className="flex items-center gap-3">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-black text-[#FFFFFF] shrink-0"
                    style={{ background: TEAL }}
                  >
                    {m.name?.[0]?.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-text-primary truncate">{m.name}</span>
                      <WorkloadChip tier={m.workloadTier} utilisation={m.utilisation} />
                    </div>
                    <ProgressBar value={m.utilisation} color={color} height="h-1" />
                  </div>
                  <span className="text-[14px] text-slate-600 shrink-0 w-16 text-right">
                    {m.availableHours}h free
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Tasks ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-text-primary">Tasks</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{ color: "#08695F" }}
          >
            <Plus size={12} strokeWidth={2.5} /> New task
          </button>
        </div>

        {tasks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed"
            style={{ borderColor: `${TEAL}15` }}
          >
            <Circle size={24} className="text-slate-700 mb-2" strokeWidth={1.2} />
            <p className="text-sm text-slate-600 font-medium">No tasks yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-xs font-semibold transition-colors"
              style={{ color: "#08695F" }}
            >
              + Create first task
            </button>
          </div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={stagger} className="flex flex-col gap-5">
            {(["In-Progress", "In-Review", "To-Do", "Done"]).map((status) => {
              const group = grouped[status];
              if (!group.length) return null;
              const cfg = tsCfg(status);
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <cfg.Icon size={12} strokeWidth={2} style={{ color: cfg.color }} />
                    <span className="text-xs font-bold uppercase tracking-widest" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span className="text-[14px] text-slate-600">({group.length})</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {group.map((t) => (
                      <motion.div key={t.id} variants={fadeUp}>
                        <TaskRow
                          task={t}
                          onReview={(tk) => setReviewTask(tk)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <CreateTaskModal
            milestoneId={milestoneId}
            projectId={projectId}
            eligibleMembers={eligibleMembers ?? members}
            allowedTaskTypes={allowedTaskTypes ?? ["Feature", "Bug", "Design", "Testing", "DevOps", "Documentation"]}
            milestoneWindow={hours.milestoneWindow}
            onClose={() => setShowCreate(false)}
            onCreated={() => { setShowCreate(false); load(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviewTask && (
          <ReviewModal
            task={reviewTask}
            onClose={() => setReviewTask(null)}
            onReviewed={() => { setReviewTask(null); load(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
