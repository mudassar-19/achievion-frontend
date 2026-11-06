import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Info, Sparkles, Building2, X, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";

const ACCENT = "#4B2FC4";

function Ring({ score, size = 100, stroke = 9 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score ?? 0;
  const dash = circ * Math.min(pct / 100, 1);
  const color = pct >= 75 ? "#0E6A30" : pct >= 50 ? "#B45309" : "#B01F17";
  return (
    <svg width={size} height={size} role="img" aria-label={`${pct} health score`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(75,47,196,0.08)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dasharray 0.6s ease" }} />
      <text x="50%" y="56%" textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight="700">{score ?? "—"}</text>
    </svg>
  );
}

const SUB_LABEL = { delivery: "Delivery", capacity: "Capacity", risk: "Risk", quality: "Quality" };
const WEIGHTS   = { delivery: 35, capacity: 25, risk: 20, quality: 20 };

export default function OrgHealthPage() {
  const [live,        setLive]        = useState(null);
  const [history,     setHistory]     = useState(null);
  const [depts,       setDepts]       = useState([]);
  const [saving,        setSaving]        = useState(false);
  const [toast,         setToast]         = useState("");
  const [explaining,    setExplaining]    = useState(false);
  const [explanation,   setExplanation]   = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  async function loadLive() {
    try {
      const result = await api.get("/api/director/org-health");
      setLive(result);
    } catch { setLive(null); }
  }

  async function loadHistory() {
    try {
      const { snapshots } = await api.get("/api/director/org-health/history");
      setHistory(snapshots ?? []);
    } catch { setHistory([]); }
  }

  async function loadDepts() {
    try {
      const { departments } = await api.get("/api/director/departments");
      setDepts(departments ?? []);
    } catch { setDepts([]); }
  }

  useEffect(() => { loadLive(); loadHistory(); loadDepts(); }, []);

  async function explainHealth() {
    setExplaining(true);
    try {
      const { explanation: exp } = await api.post("/api/director/ai/explain", { chart: "org-health", data: live });
      setExplanation(exp);
    } catch (e) {
      if (e?.status === 503) {
        setAiUnavailable(true);
      } else {
        showToast(e?.message ?? "AI not available.");
      }
    } finally { setExplaining(false); }
  }

  async function saveSnapshot() {
    setSaving(true);
    try {
      await api.post("/api/director/org-health/snapshot");
      showToast("Snapshot saved.");
      loadHistory();
    } catch { showToast("Save failed."); } finally { setSaving(false); }
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1280px] mx-auto flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between gap-4">
          <PageHeader title="Org Health Score" subtitle="Live 4-factor health index. Save a snapshot to track trends over time." />
          <button onClick={saveSnapshot} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-60 shrink-0 min-h-[40px]"
            style={{ background: ACCENT }}>
            <RefreshCw size={13} className={saving ? "animate-spin" : ""} />
            {saving ? "Saving…" : "Save snapshot"}
          </button>
        </div>
      </motion.div>

      {!live ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-ink/[0.04] animate-pulse" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Overall score */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
            className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] p-6 flex flex-col sm:flex-row items-center gap-6">
            <Ring score={live.overall} size={100} stroke={9} />
            <div className="flex flex-col gap-1 flex-1">
              <h2 className="text-base font-black text-text-primary">Overall Health Score</h2>
              {(() => {
                const sub = live.subScores ?? {};
                const availN = Object.values(sub).filter(v => v != null).length;
                const isFullConf = availN === 4;
                const label = live.overall == null ? "No data" :
                  !isFullConf ? null :
                  live.overall >= 75 ? "Healthy" :
                  live.overall >= 50 ? "Needs attention" : "At risk";
                return (
                  <>
                    {label && <p className="text-xs text-slate-500">{label}</p>}
                    {!isFullConf && availN > 0 && (
                      <p className="text-xs text-amber-600 font-semibold">
                        Score based on {availN} of 4 factors — limited confidence
                      </p>
                    )}
                  </>
                );
              })()}
              <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
                <Info size={11} aria-hidden="true" /> {live.assumptionNote}
              </p>
              {explanation && (
                <p className="text-xs text-slate-600 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2 mt-2">
                  <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mr-1">AI-generated</span>
                  {explanation}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {aiUnavailable ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-ink/[0.08] text-slate-400 cursor-not-allowed">
                  <Sparkles size={12} /> AI abhi connected nahi
                </span>
              ) : (
                <button onClick={explainHealth} disabled={explaining}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50 transition-colors"
                  aria-label="Explain health score">
                  <Sparkles size={12} />
                  {explaining ? "…" : "Explain"}
                </button>
              )}
              <button onClick={() => setShowBreakdown(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-ink/[0.12] text-slate-600 hover:bg-ink/[0.06] transition-colors"
                aria-label="See formula breakdown">
                <HelpCircle size={12} />
                How calculated?
              </button>
            </div>
          </motion.div>

          {/* Sub-scores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(live.subScores ?? {}).map(([key, val], i) => (
              <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 + i * 0.05 }}
                className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] p-4 flex flex-col items-center gap-2">
                <Ring score={val} size={72} stroke={7} />
                <div className="text-center">
                  <p className="text-sm font-bold text-text-primary">{SUB_LABEL[key]}</p>
                  <p className="text-[11px] text-slate-500">{val == null ? "No data" : `weight ${WEIGHTS[key]}%`}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Department cards — links to DIR-04.2 detail */}
          {depts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}
              className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] p-5">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Building2 size={12} /> Departments
              </h3>
              <div className="flex flex-wrap gap-2">
                {depts.map(d => (
                  <Link key={d} to={`/director/dept/${encodeURIComponent(d)}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink/[0.1] text-xs font-semibold text-text-primary hover:border-[#4B2FC4]/40 hover:bg-[#4B2FC4]/[0.04] transition-colors">
                    <Building2 size={11} className="text-text-secondary" />
                    {d}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* 12-week history */}
          {history && history.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }}
              className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] p-5">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Snapshot History (last {history.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[400px]">
                  <thead>
                    <tr className="border-b border-ink/[0.06]">
                      {["Date","Overall","Delivery","Capacity","Risk","Quality"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wide text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((s) => (
                      <tr key={s._id} className="border-b border-ink/[0.04] last:border-0 hover:bg-ink/[0.02]">
                        <td className="px-3 py-2 text-slate-500">{new Date(s.calculatedAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</td>
                        <td className="px-3 py-2 font-black" style={{ color: ACCENT }}>{s.overall}</td>
                        <td className="px-3 py-2 text-slate-500">{s.subScores?.delivery ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{s.subScores?.capacity ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{s.subScores?.risk ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{s.subScores?.quality ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold shadow-xl z-50" style={{ background: ACCENT }}>
          {toast}
        </div>
      )}

      {/* DIR-04.1: Formula breakdown drawer */}
      <AnimatePresence>
        {showBreakdown && live && (
          <>
            <motion.div key="ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" onClick={() => setShowBreakdown(false)} />
            <motion.aside key="bd" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{ backgroundColor: "#fff" }}
              className="fixed right-0 top-0 h-full z-50 w-full max-w-sm border-l border-slate-200 shadow-2xl flex flex-col"
              role="dialog" aria-modal="true" aria-label="Health score formula breakdown">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="text-sm font-black text-text-primary">How is the score calculated?</h2>
                <button onClick={() => setShowBreakdown(false)} aria-label="Close breakdown"
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-ink/[0.06] transition-colors">
                  <X size={15} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4" style={{ backgroundColor: "#fff" }} tabIndex={0}>
                <p className="text-xs text-slate-600">{live.assumptionNote}</p>
                <div className="flex flex-col gap-2">
                  {Object.entries(live.subScores ?? {}).map(([key, val]) => {
                    const w = live.weights?.[key] ?? WEIGHTS[key] ?? 0;
                    const color = val >= 75 ? "#0E6A30" : val >= 50 ? "#B45309" : "#B01F17";
                    return (
                      <div key={key} className="rounded-xl p-3 flex items-center justify-between gap-3" style={{ background: "#f0f4f8", border: "1px solid #dde3ec" }}>
                        <div>
                          <p className="text-xs font-bold text-text-primary capitalize">{SUB_LABEL[key]}</p>
                          <p className="text-[10px] text-slate-600">Weight: {w}%</p>
                        </div>
                        <span className="text-lg font-black" style={{ color }}>{val ?? "—"}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#ede9fc", border: "1px solid #c4b5fd" }}>
                  <span className="text-xs font-bold text-text-primary">Overall (weighted avg)</span>
                  <span className="text-xl font-black" style={{ color: ACCENT }}>{live.overall ?? "—"}</span>
                </div>
                <p className="text-[10px] text-slate-600">
                  Weights are configurable in Director Settings. Null sub-score (e.g. no tasks) is excluded from the weighted average.
                </p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
