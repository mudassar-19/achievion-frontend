import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, X, Sparkles, Send, Users } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";

const ACCENT = "#4B2FC4";

function cellColor(pct) {
  if (pct == null) return "#F1F3F9";
  if (pct > 100) return "#B01F1730";
  if (pct > 80)  return "#D4A01730";
  if (pct > 50)  return "#0E6A3020";
  return "#4B2FC415";
}
function cellTextColor(pct) {
  if (pct == null) return "#4F5B75"; // readable on the empty-cell grey
  if (pct > 100) return "#B01F17";
  if (pct > 80)  return "#7A5200";
  return "#0E6A30";
}

export default function CapacityHeatmapPage() {
  const [data,          setData]          = useState(null);
  const [weeks,         setWeeks]         = useState(4);
  const [drawer,        setDrawer]        = useState(null);
  const [rebalance,     setRebalance]     = useState(null);   // { suggestion, note }
  const [rebalancing,   setRebalancing]   = useState(false);
  const [sendModal,     setSendModal]     = useState(false);
  const [sendNote,      setSendNote]      = useState("");
  const [managers,      setManagers]      = useState([]);
  const [managerId,     setManagerId]     = useState("");
  const [sending,       setSending]       = useState(false);
  const [toast,         setToast]         = useState("");
  const [aiUnavailable, setAiUnavailable] = useState(false);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  useEffect(() => {
    api.get(`/api/director/capacity-heatmap?weeks=${weeks}`)
      .then((d) => setData(d))
      .catch(() => setData({ weeks: [], rows: [] }));
  }, [weeks]);

  async function getRebalanceSuggestion() {
    setRebalancing(true);
    try {
      const d = await api.post("/api/director/ai/rebalance", { data });
      setRebalance({ suggestion: d.suggestion, note: d.suggestion });
      setSendNote(d.suggestion);
    } catch (e) {
      if (e?.status === 503) {
        setAiUnavailable(true);
      } else {
        showToast(e?.message ?? "AI request failed.");
      }
    } finally { setRebalancing(false); }
  }

  async function loadManagers() {
    try {
      const d = await api.get("/api/director/workspace-members");
      setManagers((d.members ?? []).filter((m) => m.role === "Manager"));
    } catch { setManagers([]); }
  }

  async function sendToManager() {
    if (!managerId || !sendNote) return;
    setSending(true);
    try {
      await api.post("/api/director/ai/rebalance/send", { note: sendNote, managerId });
      showToast("Sent to manager.");
      setSendModal(false); setRebalance(null);
    } catch (e) {
      showToast(e?.message ?? "Send failed.");
    } finally { setSending(false); }
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1280px] mx-auto flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <PageHeader title="Capacity Heatmap" subtitle="Hours planned vs available per team per week. Click a cell for detail.">
            <Link to="/director/capacity/teams"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#4B2FC4] hover:bg-[#4B2FC4]/[0.06] transition-colors min-h-[32px]">
              <Users size={13}/>Team workload
            </Link>
          </PageHeader>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Weeks:</span>
            {[4, 8, 12].map((w) => (
              <button key={w} onClick={() => setWeeks(w)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors min-h-[32px]"
                style={weeks === w ? { background: ACCENT, color: "#fff", borderColor: ACCENT } : { borderColor: "rgba(0,0,0,0.12)", color: "#475569" }}>
                {w}W
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {!data ? (
        <div className="h-48 rounded-2xl bg-ink/[0.04] animate-pulse" />
      ) : data.rows.length === 0 ? (
        <div className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] flex flex-col items-center justify-center py-16 gap-3">
          <Layers size={28} strokeWidth={1.2} style={{ color: ACCENT }} />
          <p className="text-sm font-bold text-text-primary">No team data</p>
          <p className="text-xs text-slate-500">Teams with tasks and capacity settings will appear here.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[320px]">
              <thead>
                <tr className="border-b border-ink/[0.07]">
                  <th scope="col" className="px-3 py-2 text-left font-bold text-slate-600 min-w-[120px]">Team</th>
                  {data.weeks.map((w) => (
                    <th scope="col" key={w} className="px-2 py-2 text-center font-bold text-slate-500 min-w-[72px]">{w}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.teamId} className="border-b border-ink/[0.04] last:border-0">
                    <td className="px-3 py-2 font-semibold text-text-primary">{row.teamName}</td>
                    {row.cells.map((cell) => (
                      <td key={cell.week} className="px-2 py-1.5">
                        <button
                          onClick={() => setDrawer({ team: row.teamName, ...cell })}
                          className="w-full rounded-lg px-2 py-2 text-center font-bold transition-opacity hover:opacity-80 min-h-[32px]"
                          style={{ background: cellColor(cell.pct), color: cellTextColor(cell.pct) }}
                          title={`${row.teamName} ${cell.week}: ${cell.plannedHours}h planned / ${cell.availableHours}h available`}
                        >
                          {cell.pct == null ? (cell.plannedHours > 0 ? "No members" : "—") : `${cell.pct}%`}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 mt-3 flex-wrap">
            {[
              { label: "≤ 50%",  bg: "#4B2FC415", color: "#0E6A30" },
              { label: "51–80%", bg: "#0E6A3020", color: "#0E6A30" },
              { label: "81–100%",bg: "#D4A01730", color: "#7A5200" },
              { label: "> 100%", bg: "#B01F1730", color: "#B01F17" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: s.color }}>
                <span className="h-3 w-6 rounded" style={{ background: s.bg }} />
                {s.label}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* AI Rebalance Suggestion Card */}
      {data && data.rows.length > 0 && (
        <div className="rounded-2xl border border-violet-100 bg-violet-50 px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: "#7C3AED" }} />
              <p className="text-sm font-bold text-violet-800">AI Rebalance Suggestion</p>
            </div>
            <div className="flex gap-2">
              {rebalance && (
                <>
                  <button onClick={() => { setSendModal(true); loadManagers(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition-colors min-h-[32px]">
                    <Send size={11} /> Send to Manager
                  </button>
                  <button onClick={() => setRebalance(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-violet-200 text-violet-600 hover:bg-violet-100 transition-colors min-h-[32px]">
                    Dismiss
                  </button>
                </>
              )}
              {!rebalance && (
                aiUnavailable ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-ink/[0.08] text-slate-400 cursor-not-allowed">
                    <Sparkles size={11} /> AI not connected
                  </span>
                ) : (
                  <button onClick={getRebalanceSuggestion} disabled={rebalancing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-violet-200 text-violet-600 hover:bg-violet-100 disabled:opacity-50 transition-colors min-h-[32px]">
                    <Sparkles size={11} /> {rebalancing ? "Thinking…" : "Get suggestion"}
                  </button>
                )
              )}
            </div>
          </div>
          {rebalance ? (
            <p className="text-xs text-violet-700">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mr-1">AI-generated</span>
              {rebalance.suggestion}
            </p>
          ) : (
            <p className="text-xs text-slate-500">Get an AI-generated capacity rebalance suggestion based on current load data.</p>
          )}
        </div>
      )}

      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="w-full max-w-sm rounded-2xl bg-white border border-ink/[0.1] shadow-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary">{drawer.team} · {drawer.week}</h3>
                <button onClick={() => setDrawer(null)} aria-label="Close" className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-ink/[0.06] min-h-[32px]">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Planned hours",   value: drawer.plannedHours },
                  { label: "Available hours", value: drawer.availableHours },
                  { label: "Load",            value: drawer.pct == null ? "No members in this team" : `${drawer.pct}%` },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-ink/[0.03] border border-ink/[0.06] px-3 py-2">
                    <p className="text-base font-black tabular-nums" style={{ color: ACCENT }}>{s.value}</p>
                    <p className="text-[11px] font-semibold text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
              {drawer.pct > 100 && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">Team is over capacity this week.</p>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Send to Manager modal */}
      <AnimatePresence>
        {sendModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              role="dialog" aria-modal="true" aria-labelledby="send-mgr-title"
              className="w-full max-w-md rounded-2xl bg-white border border-ink/[0.1] shadow-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 id="send-mgr-title" className="text-sm font-bold text-text-primary">Send Rebalance Note to Manager</h3>
                <button onClick={() => setSendModal(false)} aria-label="Close" className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-ink/[0.06] min-h-[32px]"><X size={14} /></button>
              </div>
              <select value={managerId} onChange={(e) => setManagerId(e.target.value)}
                aria-label="Select manager"
                className="w-full h-9 px-3 rounded-xl border border-ink/[0.12] text-sm bg-white">
                <option value="">Select manager…</option>
                {managers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
              <textarea value={sendNote} onChange={(e) => setSendNote(e.target.value)} rows={4}
                aria-label="Rebalance note"
                className="w-full px-3 py-2 rounded-xl border border-ink/[0.12] text-xs resize-none" />
              <p className="text-[10px] text-violet-500 font-bold uppercase tracking-wider">AI-generated — review before sending</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSendModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold border border-ink/[0.12] min-h-[32px]">Cancel</button>
                <button onClick={sendToManager} disabled={sending || !managerId}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 min-h-[32px]" style={{ background: ACCENT }}>
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold shadow-xl z-50" style={{ background: ACCENT }}>
          {toast}
        </div>
      )}
    </div>
  );
}
