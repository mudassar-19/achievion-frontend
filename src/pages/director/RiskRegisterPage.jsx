import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, LayoutList, Grid2X2, Loader2,
  CheckCircle2, ArrowUpCircle, X, Info, Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton, { SkeletonLine } from "@/components/ui/Skeleton";
import useUiStore from "@/stores/uiStore";
import { useRoleTheme } from "@/utils/roleTheme";

// Score → severity
function severity(score) {
  if (score >= 15) return { label: "Critical", color: "#9b1c1c", bg: "#9b1c1c15" };
  if (score >= 9)  return { label: "High",     color: "#B01F17", bg: "#B01F1715" };
  if (score >= 4)  return { label: "Medium",   color: "#7A5200", bg: "#7A520015" };
  return                  { label: "Low",      color: "#0E6A30", bg: "#0E6A3015" };
}

const STATUS_COLOR = {
  open:      "#7A5200",
  mitigated: "#4B2FC4",
  closed:    "#0E6A30",
  escalated: "#B01F17",
};

const CATEGORIES = ["technical", "schedule", "resource", "financial", "compliance", "other"];
const LIKELIHOOD_OPTS = [1, 2, 3, 4, 5];
const IMPACT_OPTS     = [1, 2, 3, 4, 5];

// ── Matrix cell ───────────────────────────────────────────────────────────────
function MatrixCell({ score, risks, onClick }) {
  const sev = severity(score);
  if (risks.length === 0) return (
    <div className="rounded-xl border p-2 min-h-[64px]"
      style={{ borderColor: sev.color + "30", background: sev.bg }}>
      <span className="text-[10px] font-bold" style={{ color: sev.color }}>{score}</span>
    </div>
  );
  return (
    <button onClick={onClick}
      className="text-left w-full rounded-xl border p-2 min-h-[64px] flex flex-col gap-1 hover:opacity-80 transition-opacity"
      style={{ borderColor: sev.color + "30", background: sev.bg }}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-bold" style={{ color: sev.color }}>{score}</span>
        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: sev.color + "20", color: sev.color }}>
          {risks.length}
        </span>
      </div>
      {risks.slice(0, 2).map((r) => (
        <p key={r._id} className="text-[10px] text-text-primary truncate leading-tight">{r.title}</p>
      ))}
      {risks.length > 2 && <p className="text-[10px] font-semibold" style={{ color: sev.color }}>+{risks.length - 2} more</p>}
    </button>
  );
}

// ── Add risk form ─────────────────────────────────────────────────────────────
function AddRiskModal({ onClose, onCreated }) {
  const addToast = useUiStore((s) => s.addToast);
  const [form, setForm] = useState({
    title: "", description: "", category: "technical",
    likelihood: 3, impact: 3, mitigation: "",
  });
  const [saving, setSaving] = useState(false);

  function setF(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/risks", form);
      addToast({ type: "success", message: "Risk registered." });
      onCreated();
      onClose();
    } catch (err) {
      addToast({ type: "error", message: err?.message ?? "Failed to create risk." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="add-risk-title">
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        transition={{ duration: 0.17 }}
        className="w-full max-w-md rounded-2xl bg-white border border-ink/[0.1] p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 id="add-risk-title" className="text-sm font-bold text-text-primary">Register Risk</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700 min-w-[32px] min-h-[32px] flex items-center justify-center"><X size={16} /></button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="rf-title" className="sr-only">Risk title</label>
            <input id="rf-title" required value={form.title} onChange={(e) => setF("title", e.target.value)}
              placeholder="Risk title *"
              className="w-full px-3 py-2 rounded-xl border border-ink/[0.12] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2FC4]/20" />
          </div>

          <div>
            <label htmlFor="rf-desc" className="sr-only">Description</label>
            <textarea id="rf-desc" value={form.description} onChange={(e) => setF("description", e.target.value)}
              placeholder="Description"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-ink/[0.12] bg-transparent text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#4B2FC4]/20" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="rf-cat" className="text-[11px] font-semibold text-slate-500 mb-1 block">Category</label>
              <select id="rf-cat" value={form.category} onChange={(e) => setF("category", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-ink/[0.12] bg-transparent text-sm focus:outline-none">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="rf-mit" className="text-[11px] font-semibold text-slate-500 mb-1 block">Mitigation</label>
              <input id="rf-mit" value={form.mitigation} onChange={(e) => setF("mitigation", e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-xl border border-ink/[0.12] bg-transparent text-sm focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1">Likelihood (1–5)</p>
              <div className="flex gap-1" role="group" aria-label="Likelihood">
                {LIKELIHOOD_OPTS.map((n) => (
                  <button key={n} type="button" onClick={() => setF("likelihood", n)}
                    aria-label={`Likelihood ${n}`}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all min-h-[32px] ${
                      form.likelihood === n ? "text-white border-transparent bg-[#4B2FC4]" : "text-slate-500 border-ink/[0.08]"
                    }`}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-1">Impact (1–5)</p>
              <div className="flex gap-1" role="group" aria-label="Impact">
                {IMPACT_OPTS.map((n) => (
                  <button key={n} type="button" onClick={() => setF("impact", n)}
                    aria-label={`Impact ${n}`}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all min-h-[32px] ${
                      form.impact === n ? "text-white border-transparent bg-[#B01F17]" : "text-slate-500 border-ink/[0.08]"
                    }`}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-ink/[0.06]">
            <span className="text-xs text-slate-500">
              Score: <strong>{form.likelihood * form.impact}</strong> — {severity(form.likelihood * form.impact).label}
            </span>
            <button type="submit" disabled={saving || !form.title.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#4B2FC4] disabled:opacity-40 transition-colors">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Register
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Risk row (list view) ──────────────────────────────────────────────────────
function RiskRow({ risk, onUpdated, onView }) {
  const addToast = useUiStore((s) => s.addToast);
  const [acting, setActing] = useState(null);
  const sev = severity(risk.score ?? 1);
  const isClosed = risk.status === "closed";

  async function act(status, extra = {}) {
    setActing(status);
    try {
      await api.patch(`/api/risks/${risk._id}`, { status, ...extra });
      addToast({ type: "success", message: `Risk ${status}.` });
      onUpdated();
    } catch (e) {
      addToast({ type: "error", message: e?.message ?? "Action failed." });
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="rounded-2xl border border-ink/[0.08] glass-panel p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border"
              style={{ color: sev.color, background: sev.bg, borderColor: sev.color + "30" }}>
              Score {risk.score} — {sev.label}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-ink/[0.04] border border-ink/[0.06]"
              style={{ color: STATUS_COLOR[risk.status] ?? "#64748b" }}>
              {risk.status}
            </span>
            <span className="text-[11px] text-slate-600 capitalize">{risk.category}</span>
          </div>
          <p className="text-sm font-bold text-text-primary">{risk.title}</p>
          {risk.description && (
            <p className="text-xs text-slate-500 line-clamp-2">{risk.description}</p>
          )}
          {risk.owner && (
            <p className="text-[11px] text-slate-600">Owner: {risk.owner.name}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[11px] text-slate-600">L{risk.likelihood}×I{risk.impact}</span>
          <button onClick={() => onView?.(risk)} aria-label={`View details for ${risk.title}`}
            className="flex items-center gap-1 px-2 py-1 min-h-[32px] rounded-lg text-[11px] font-semibold text-slate-500 hover:text-[#4B2FC4] hover:bg-[#4B2FC4]/[0.06] transition-colors">
            <Info size={11} /> Details
          </button>
        </div>
      </div>

      {!isClosed && (
        <div className="flex gap-2 pt-1 border-t border-ink/[0.05]">
          {risk.status !== "mitigated" && (
            <button onClick={() => act("mitigated")} disabled={!!acting}
              className="flex items-center gap-1 px-3 py-1.5 min-h-[32px] rounded-xl text-[11px] font-bold bg-[#4B2FC4]/10 border border-[#4B2FC4]/20 text-[#4B2FC4] hover:bg-[#4B2FC4]/20 disabled:opacity-40 transition-colors">
              {acting === "mitigated" ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
              Mitigate
            </button>
          )}
          {risk.status !== "escalated" && (
            <button onClick={() => act("escalated")} disabled={!!acting}
              className="flex items-center gap-1 px-3 py-1.5 min-h-[32px] rounded-xl text-[11px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-700 hover:bg-rose-500/20 disabled:opacity-40 transition-colors">
              {acting === "escalated" ? <Loader2 size={11} className="animate-spin" /> : <ArrowUpCircle size={11} />}
              Escalate
            </button>
          )}
          <button onClick={() => act("closed")} disabled={!!acting}
            className="flex items-center gap-1 px-3 py-1.5 min-h-[32px] rounded-xl text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors">
            {acting === "closed" ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
            Close
          </button>
        </div>
      )}
    </div>
  );
}

// ── Matrix view ───────────────────────────────────────────────────────────────
function RiskMatrix({ items, onCellClick }) {
  // Build a 5×5 grid (likelihood 1-5, impact 1-5)
  const cells = {};
  for (const r of items) {
    const key = `${r.likelihood}-${r.impact}`;
    if (!cells[key]) cells[key] = [];
    cells[key].push(r);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[420px]">
        <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-1.5">
          <div className="text-[10px] font-bold text-slate-600 flex items-end pb-1">L↓ I→</div>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="text-center text-[10px] font-bold text-slate-600 pb-1">{i}</div>
          ))}
          {[5,4,3,2,1].map((l) => (
            <>
              <div key={`l${l}`} className="text-[10px] font-bold text-slate-600 flex items-center justify-end pr-2">{l}</div>
              {[1,2,3,4,5].map((imp) => (
                <MatrixCell key={`${l}-${imp}`} score={l * imp} risks={cells[`${l}-${imp}`] ?? []}
                  onClick={() => onCellClick?.(cells[`${l}-${imp}`] ?? [], l * imp)} />
              ))}
            </>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {[{s:1,l:"Low"},{s:4,l:"Medium"},{s:9,l:"High"},{s:15,l:"Critical"}].map(({ s, l }) => {
            const sv = severity(s);
            return (
              <span key={l} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: sv.color }}>
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: sv.color }} />
                {l}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RiskRegisterPage() {
  const theme    = useRoleTheme();
  const [view,    setView]    = useState("list");   // "list" | "matrix"
  const [status,  setStatus]  = useState("open");
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [showAdd,      setShowAdd]      = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [cellDrawer,   setCellDrawer]   = useState(null); // { risks, score }
  const [showN,        setShowN]        = useState(25);
  const [aiUnavailable,setAiUnavailable]= useState(false);
  const [digesting,    setDigesting]    = useState(false);
  const [digest,       setDigest]       = useState(null);
  const addToast = useUiStore((s) => s.addToast);

  async function getDigest() {
    setDigesting(true);
    try {
      const { explanation } = await api.post("/api/director/ai/explain", { chart: "risks", data: { items, status } });
      setDigest(explanation);
    } catch (e) {
      if (e?.status === 503) setAiUnavailable(true);
      else addToast({ type: "error", message: e?.message ?? "AI unavailable." });
    } finally { setDigesting(false); }
  }

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const d = await api.get(`/api/risks?status=${status}&limit=100`);
      setItems(d?.items ?? []);
      setTotal(d?.total ?? 0);
    } catch (e) {
      setError(e?.message ?? "Failed to load risks.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[1280px] mx-auto w-full">
      <SkeletonLine width="180px" height={32} />
      <div className="flex flex-col gap-3">{[0,1,2].map(i=><Skeleton key={i} height={100}/>)}</div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {showAdd && <AddRiskModal onClose={() => setShowAdd(false)} onCreated={load} />}
      </AnimatePresence>

      <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[1280px] mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <PageHeader title="Risk Register" subtitle={`${total} risk${total !== 1 ? "s" : ""}`} />
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors"
              style={{ background: theme.accent }}>
              <Plus size={13} /> Register Risk
            </button>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status filter */}
          <div className="flex gap-1 p-1 rounded-xl bg-ink/[0.04] border border-ink/[0.06] w-fit">
            {["open","mitigated","escalated","closed","all"].map((s) => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 min-h-[32px] rounded-lg text-xs font-semibold capitalize transition-colors ${
                  status === s ? "bg-white dark:bg-white/10 shadow-sm text-text-primary" : "text-slate-500 hover:text-text-primary"
                }`}>{s}</button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex gap-1 p-1 rounded-xl bg-ink/[0.04] border border-ink/[0.06]">
            <button aria-label="List view" onClick={() => setView("list")}
              className={`p-2 min-h-[32px] min-w-[32px] rounded-lg transition-colors ${view === "list" ? "bg-white shadow-sm text-text-primary" : "text-slate-500 hover:text-text-primary"}`}>
              <LayoutList size={14} />
            </button>
            <button aria-label="Matrix view" onClick={() => setView("matrix")}
              className={`p-2 min-h-[32px] min-w-[32px] rounded-lg transition-colors ${view === "matrix" ? "bg-white shadow-sm text-text-primary" : "text-slate-500 hover:text-text-primary"}`}>
              <Grid2X2 size={14} />
            </button>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {!error && items.length === 0 && (
          <EmptyState heading="No risks." body="Register a risk to track it here." action={{ label: "Register Risk", onClick: () => setShowAdd(true) }} />
        )}

        {/* AI Digest */}
        {items.length > 0 && (
          <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles size={13} style={{ color: "#7C3AED" }} />
              <p className="text-xs font-bold text-violet-800">AI Risk Digest</p>
            </div>
            <div className="flex items-center gap-2">
              {aiUnavailable ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-ink/[0.08] text-slate-400 cursor-not-allowed">
                  <Sparkles size={11} /> AI abhi connected nahi
                </span>
              ) : digest ? (
                <button onClick={() => setDigest(null)} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-violet-200 text-violet-600 hover:bg-violet-100 min-h-[32px]">Dismiss</button>
              ) : (
                <button onClick={getDigest} disabled={digesting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-violet-200 text-violet-600 hover:bg-violet-100 disabled:opacity-50 min-h-[32px]">
                  <Sparkles size={11} /> {digesting ? "Analyzing…" : "Get digest"}
                </button>
              )}
            </div>
            {digest && (
              <p className="w-full text-xs text-violet-700">
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mr-1">AI-generated</span>
                {digest}
              </p>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === "list" ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-3">
              {items.slice(0, showN).map((r) => <RiskRow key={r._id} risk={r} onUpdated={load} onView={setSelectedRisk} />)}
            </motion.div>
          ) : (
            <motion.div key="matrix" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl border border-ink/[0.08] glass-panel p-5">
              {items.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-8">No risks to display in matrix.</p>
              ) : (
                <RiskMatrix items={items} onCellClick={(risks, score) => setCellDrawer({ risks, score })} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {view === "list" && items.length > showN && (
          <button onClick={() => setShowN((n) => n + 25)}
            className="self-center px-5 py-2 rounded-xl border border-ink/[0.12] text-xs font-bold text-slate-600 hover:bg-ink/[0.04] transition-colors min-h-[36px]">
            Load more ({items.length - showN} remaining)
          </button>
        )}
      </div>

      {/* Matrix cell risks drawer */}
      <AnimatePresence>
        {cellDrawer && (
          <>
            <motion.div key="cell-ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
              onClick={() => setCellDrawer(null)} />
            <motion.aside key="cell-dr" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{ backgroundColor: "#fff" }}
              className="fixed right-0 top-0 h-full z-50 w-full max-w-sm border-l border-slate-200 shadow-2xl flex flex-col"
              role="dialog" aria-modal="true" aria-label="Cell risks">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <div>
                  <h2 className="text-sm font-black text-text-primary">
                    Score {cellDrawer.score} — {severity(cellDrawer.score).label}
                  </h2>
                  <p className="text-xs text-slate-500">{cellDrawer.risks.length} risk{cellDrawer.risks.length !== 1 ? "s" : ""}</p>
                </div>
                <button onClick={() => setCellDrawer(null)} aria-label="Close"
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-ink/[0.06]">
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {cellDrawer.risks.map((r) => (
                  <button key={r._id} onClick={() => { setCellDrawer(null); setSelectedRisk(r); }}
                    className="text-left rounded-xl border border-ink/[0.08] p-3 hover:border-[#4B2FC4]/30 hover:bg-[#4B2FC4]/[0.02] transition-colors">
                    <p className="text-xs font-bold text-text-primary">{r.title}</p>
                    <p className="text-[11px] text-slate-500 capitalize mt-0.5">{r.status} · {r.category ?? "—"}</p>
                  </button>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* DIR-07.1 Risk detail drawer */}
      <AnimatePresence>
        {selectedRisk && (
          <>
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
              onClick={() => setSelectedRisk(null)} />
            <motion.aside key="drawer" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{ backgroundColor: "#fff" }}
              className="fixed right-0 top-0 h-full z-50 w-full max-w-md border-l border-slate-200 shadow-2xl flex flex-col"
              role="dialog" aria-modal="true" aria-label="Risk detail">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="text-sm font-black text-text-primary truncate pr-4">{selectedRisk.title}</h2>
                <button onClick={() => setSelectedRisk(null)} aria-label="Close detail drawer"
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-ink/[0.06] transition-colors">
                  <X size={15} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4" style={{ backgroundColor: "#fff" }} tabIndex={0}>
                {/* Severity + score */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => { const s = severity(selectedRisk.score ?? 1); return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold"
                      style={{ color: s.color, background: "#f0f4f8", border: `1px solid ${s.color}` }}>
                      Score {selectedRisk.score} — {s.label}
                    </span>
                  ); })()}
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl"
                    style={{ color: STATUS_COLOR[selectedRisk.status] ?? "#64748b", background: "#f0f4f8", border: "1px solid #dde3ec" }}>
                    {selectedRisk.status}
                  </span>
                  {selectedRisk.category && (
                    <span className="text-xs text-slate-600 capitalize">{selectedRisk.category}</span>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Likelihood", `${selectedRisk.likelihood} / 5`],
                    ["Impact",     `${selectedRisk.impact} / 5`],
                    ["Score",      selectedRisk.score],
                  ].map(([label, val]) => (
                    <div key={label} className="rounded-xl p-3 flex flex-col gap-0.5" style={{ background: "#f0f4f8", border: "1px solid #dde3ec" }}>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{label}</span>
                      <span className="text-sm font-black text-text-primary">{val}</span>
                    </div>
                  ))}
                </div>

                {/* Description */}
                {selectedRisk.description && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedRisk.description}</p>
                  </div>
                )}

                {/* Mitigation */}
                {selectedRisk.mitigation && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Mitigation plan</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedRisk.mitigation}</p>
                  </div>
                )}

                {/* Owner + dates */}
                <div className="flex flex-col gap-1 text-xs text-slate-600">
                  {selectedRisk.owner && <span>Owner: {selectedRisk.owner?.name ?? selectedRisk.owner}</span>}
                  {selectedRisk.createdAt && <span>Registered: {new Date(selectedRisk.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
