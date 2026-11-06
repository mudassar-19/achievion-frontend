import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Plus, RefreshCw, Archive, Edit2, X, ChevronDown } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import TallyState from "@/components/ui/TallyState";
import Tally from "@/components/ui/Tally";
import api from "@/lib/api";

const ACCENT = "#4B2FC4";

// ── Progress ring SVG ──────────────────────────────────────────────────────────
function Ring({ pct = 0, size = 72, stroke = 7, color = ACCENT }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct / 100, 1);
  return (
    <svg width={size} height={size} role="img" aria-label={`${pct}% progress`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(75,47,196,0.10)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
      <text x="50%" y="54%" textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight="700">{pct}%</text>
    </svg>
  );
}

const STATUS_CFG = {
  on_track: { label: "On Track",  color: "#0E6A30", bg: "#12803B18" },
  behind:   { label: "Behind",    color: "#B01F17", bg: "#B01F1718" },
  achieved: { label: "Achieved",  color: ACCENT,    bg: ACCENT + "18" },
  archived: { label: "Archived",  color: "#6D7B99", bg: "#6D7B9918" },
};

const METRIC_LABEL = {
  on_time_pct:    "On-time %",
  projects_done:  "Projects done",
  quality:        "Quality score",
};

function GoalCard({ goal, onRecalculate, onEdit, onArchive }) {
  const pct = goal.targetValue > 0
    ? Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100)
    : 0;
  const cfg = STATUS_CFG[goal.status] ?? STATUS_CFG.on_track;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-text-primary truncate">{goal.title}</h3>
          <p className="text-[13px] text-slate-500 mt-0.5">{METRIC_LABEL[goal.metric] ?? goal.metric} · {goal.period}</p>
        </div>
        <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider"
          style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
      </div>

      <div className="flex items-center gap-5">
        <Ring pct={pct} />
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-black tabular-nums" style={{ color: ACCENT }}>
            {goal.currentValue}<span className="text-sm font-semibold text-slate-400 ml-1">/ {goal.targetValue}</span>
          </p>
          <p className="text-xs text-slate-500">{METRIC_LABEL[goal.metric] ?? goal.metric}</p>
          {goal.isTeamQuest && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-ink/[0.08] text-slate-500 self-start">Team Quest</span>
          )}
        </div>
      </div>

      {goal.linkedProjectIds?.length > 0 && (
        <p className="text-[12px] text-slate-400">{goal.linkedProjectIds.length} linked project{goal.linkedProjectIds.length !== 1 ? "s" : ""}</p>
      )}

      <div className="flex gap-2 pt-1 border-t border-ink/[0.05]">
        <button
          onClick={() => onRecalculate(goal._id)}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-ink/[0.1] hover:bg-ink/[0.04] transition-colors min-h-[32px]"
        >
          <RefreshCw size={12} /> Recalculate
        </button>
        {goal.status !== "archived" && (
          <>
            <button
              onClick={() => onEdit(goal)}
              className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-ink/[0.1] hover:bg-ink/[0.04] transition-colors min-h-[32px]"
            >
              <Edit2 size={12} /> Edit
            </button>
            <button
              onClick={() => onArchive(goal._id)}
              className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-ink/[0.1] text-red-600/70 hover:bg-red-50 transition-colors min-h-[32px]"
            >
              <Archive size={12} /> Archive
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Drawer for create / edit ───────────────────────────────────────────────────
function GoalDrawer({ goal, onClose, onSaved }) {
  const isEdit = !!goal;
  const [form, setForm] = useState({
    title:        goal?.title        ?? "",
    metric:       goal?.metric       ?? "on_time_pct",
    targetValue:  goal?.targetValue  ?? "",
    period:       goal?.period       ?? new Date().getFullYear().toString(),
    visibleTo:    goal?.visibleTo    ?? "managers",
    isTeamQuest:  goal?.isTeamQuest  ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.targetValue) { setErr("Title and target value are required."); return; }
    setSaving(true); setErr("");
    try {
      if (isEdit) {
        await api.patch(`/api/director/goals/${goal._id}`, form);
      } else {
        await api.post("/api/director/goals", { ...form, targetValue: Number(form.targetValue) });
      }
      onSaved();
    } catch (ex) {
      setErr(ex?.response?.data?.error ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        className="w-full max-w-lg rounded-2xl bg-white border border-ink/[0.1] shadow-2xl p-6 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary">{isEdit ? "Edit Goal" : "New Goal"}</h2>
          <button onClick={onClose} aria-label="Close" className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-ink/[0.06] transition-colors min-h-[32px]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="gf-title" className="text-[12px] font-semibold text-slate-600">Title</label>
            <input id="gf-title"
              className="border border-ink/[0.12] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B2FC4] transition-colors min-h-[40px]"
              value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={200} placeholder="e.g. 90% on-time delivery Q4"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="gf-metric" className="text-[12px] font-semibold text-slate-600">Metric</label>
              <select id="gf-metric"
                className="border border-ink/[0.12] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B2FC4] min-h-[40px]"
                value={form.metric} onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))}
              >
                <option value="on_time_pct">On-time %</option>
                <option value="projects_done">Projects done</option>
                <option value="quality">Quality score</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="gf-target" className="text-[12px] font-semibold text-slate-600">Target value</label>
              <input id="gf-target" type="number" min="1"
                className="border border-ink/[0.12] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B2FC4] min-h-[40px]"
                value={form.targetValue} onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
                placeholder="e.g. 90"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="gf-period" className="text-[12px] font-semibold text-slate-600">Period</label>
              <input id="gf-period"
                className="border border-ink/[0.12] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B2FC4] min-h-[40px]"
                value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                placeholder="YYYY, YYYY-Qn, or YYYY-MM"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="gf-visible" className="text-[12px] font-semibold text-slate-600">Visible to</label>
              <select id="gf-visible"
                className="border border-ink/[0.12] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B2FC4] min-h-[40px]"
                value={form.visibleTo} onChange={(e) => setForm((f) => ({ ...f, visibleTo: e.target.value }))}
              >
                <option value="managers">Managers only</option>
                <option value="all">Everyone</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-600 cursor-pointer select-none min-h-[32px]">
            <input type="checkbox" checked={form.isTeamQuest} onChange={(e) => setForm((f) => ({ ...f, isTeamQuest: e.target.checked }))} />
            Team Quest (shows as quest to everyone)
          </label>

          {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-ink/[0.12] text-sm font-semibold hover:bg-ink/[0.04] transition-colors min-h-[40px]">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl text-white text-sm font-bold transition-opacity disabled:opacity-60 min-h-[40px]"
              style={{ background: ACCENT }}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create goal"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const [goals,      setGoals]      = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editGoal,   setEditGoal]   = useState(null);
  const [toast,      setToast]      = useState("");
  const [milestone,  setMilestone]  = useState(false);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function load() {
    try {
      const { goals } = await api.get("/api/director/goals");
      setGoals(goals ?? []);
    } catch { setGoals([]); }
  }

  useEffect(() => { load(); }, []);

  async function handleRecalculate(id) {
    try {
      const { wasAchieved } = await api.post(`/api/director/goals/${id}/recalculate`);
      if (wasAchieved) { setMilestone(true); setTimeout(() => setMilestone(false), 3000); }
      else showToast("Progress updated.");
      load();
    } catch { showToast("Recalculate failed."); }
  }

  async function handleArchive(id) {
    if (!window.confirm("Archive this goal? It will be hidden from active view.")) return;
    try {
      await api.patch(`/api/director/goals/${id}`, { action: "archive" });
      showToast("Goal archived.");
      load();
    } catch { showToast("Archive failed."); }
  }

  function openEdit(goal) { setEditGoal(goal); setShowDrawer(true); }
  function openCreate()   { setEditGoal(null); setShowDrawer(true); }

  const [showN, setShowN] = useState(25);

  const active   = goals?.filter((g) => g.status !== "archived") ?? [];
  const archived = goals?.filter((g) => g.status === "archived") ?? [];
  const visibleActive = active.slice(0, showN);

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1280px] mx-auto flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between gap-4">
          <PageHeader
            title="Org Goals"
            subtitle="Set targets, track live progress, and celebrate achievements."
          />
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold shrink-0 min-h-[40px]"
            style={{ background: ACCENT }}
          >
            <Plus size={15} /> New Goal
          </button>
        </div>
      </motion.div>

      {goals === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-52 rounded-2xl bg-ink/[0.04] animate-pulse" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] flex flex-col items-center justify-center py-20 gap-4"
        >
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: `${ACCENT}18` }}>
            <Target size={24} style={{ color: ACCENT }} strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-text-primary mb-1">No active goals</h3>
            <p className="text-xs text-slate-500 max-w-sm">Create your first org goal to track on-time delivery, project completion, or quality metrics.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold min-h-[40px]" style={{ background: ACCENT }}>
            <Plus size={14} /> Create first goal
          </button>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleActive.map((g) => (
              <GoalCard key={g._id} goal={g} onRecalculate={handleRecalculate} onEdit={openEdit} onArchive={handleArchive} />
            ))}
          </div>
          {active.length > showN && (
            <button onClick={() => setShowN((n) => n + 25)}
              className="self-center px-5 py-2 rounded-xl border border-ink/[0.12] text-xs font-bold text-slate-600 hover:bg-ink/[0.04] transition-colors min-h-[36px]">
              Load more ({active.length - showN} remaining)
            </button>
          )}
        </>
      )}

      {archived.length > 0 && (
        <details className="group">
          <summary className="text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer select-none flex items-center gap-2 min-h-[32px]">
            <ChevronDown size={13} className="group-open:rotate-180 transition-transform" />
            Archived ({archived.length})
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
            {archived.map((g) => (
              <GoalCard key={g._id} goal={g} onRecalculate={handleRecalculate} onEdit={openEdit} onArchive={() => {}} />
            ))}
          </div>
        </details>
      )}

      <AnimatePresence>
        {showDrawer && (
          <GoalDrawer
            goal={editGoal}
            onClose={() => { setShowDrawer(false); setEditGoal(null); }}
            onSaved={() => { setShowDrawer(false); setEditGoal(null); load(); showToast(editGoal ? "Goal updated." : "Goal created."); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold shadow-xl z-50"
            style={{ background: ACCENT }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Milestone celebration — Tally cheer when goal is achieved */}
      <AnimatePresence>
        {milestone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-2xl z-50"
            style={{ background: ACCENT }}
            role="status"
            aria-live="polite"
          >
            <Tally pose="cheer" size={36} aria-hidden />
            Goal achieved! 🎉
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
