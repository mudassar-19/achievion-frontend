import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart2, Zap, Clock, Server } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";

const ACCENT = "#4B2FC4";

function Badge({ status }) {
  if (status === "VERIFIED")
    return <span className="px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider text-white" style={{ background: "#0E6A30" }}>Verified</span>;
  return <span className="px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider" style={{ color: "#B01F17", background: "#B01F1718" }}>Not Verified</span>;
}

function Card({ icon: Icon, title, delay = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }}
      className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] p-5 flex flex-col gap-4"
    >
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${ACCENT}12` }}>
          <Icon size={15} style={{ color: ACCENT }} strokeWidth={1.75} />
        </div>
        <h2 className="text-sm font-bold text-text-primary">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function Row({ label, value, sub }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-ink/[0.05] last:border-0">
      <span className="text-xs text-slate-600 font-semibold">{label}</span>
      <div className="text-right">
        <span className="text-xs font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function SuccessCriteriaPage() {
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/api/director/success-criteria")
      .then((d) => setData(d))
      .catch(() => setError("Failed to load success criteria."));
  }, []);

  if (error) return <div className="px-8 py-10 text-sm text-red-600">{error}</div>;
  if (!data)  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1280px] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-44 rounded-2xl bg-ink/[0.04] animate-pulse" />)}
    </div>
  );

  const { satisfaction, ai, speed, uptime } = data;

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1280px] mx-auto flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <PageHeader title="Success Criteria" subtitle="D-023a–e measurability targets — Verified when data meets threshold." />
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Satisfaction */}
        <Card icon={BarChart2} title="User Satisfaction" delay={0.05}>
          <div className="flex items-center gap-2 mb-1">
            <Badge status={satisfaction.status} />
            <span className="text-[11px] text-slate-500">Target: ≥85% rate 4–5 on both items; SUS avg ≥ 68</span>
          </div>
          {satisfaction.dataWarning && (
            <p className="text-[12px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">{satisfaction.dataWarning}</p>
          )}
          {satisfaction.n > 0 ? (
            <>
              <Row label="Responses (n)" value={satisfaction.n} />
              <Row label="Enjoyable ≥4" value={satisfaction.enjoyPct != null ? `${satisfaction.enjoyPct}%` : "—"} />
              <Row label="Easy ≥4" value={satisfaction.easyPct != null ? `${satisfaction.easyPct}%` : "—"} />
              <Row label="Both ≥4" value={satisfaction.bothPct != null ? `${satisfaction.bothPct}%` : "—"} sub="target ≥ 85%" />
              <Row label="SUS avg" value={satisfaction.susAvg != null ? satisfaction.susAvg : "—"} sub="target ≥ 68" />
            </>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">No survey data yet. Share the survey link with your team.</p>
          )}
        </Card>

        {/* AI accuracy */}
        <Card icon={Zap} title="AI Accuracy" delay={0.08}>
          <div className="flex items-center gap-2 mb-1">
            <Badge status={ai.status} />
            <span className="text-[11px] text-slate-500">Target: ≥80% pass, ≥30 cases, 2 evaluators</span>
          </div>
          {ai.n > 0 ? (
            <>
              <Row label="Test cases" value={ai.n} sub="target ≥ 30" />
              <Row label="Passing (2+ evaluators)" value={ai.passing} />
              <Row label="Pass rate" value={`${ai.pct}%`} sub="target ≥ 80%" />
              {ai.issues.length > 0 && <p className="text-[11px] text-red-700 bg-red-50 rounded px-2 py-1">{ai.issues.join(" · ")}</p>}
            </>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">{ai.reason ?? "No AI test cases yet."}</p>
          )}
        </Card>

        {/* Speed */}
        <Card icon={Clock} title="Primary Action Speed (p95)" delay={0.11}>
          <div className="flex items-center gap-2 mb-1">
            <Badge status={speed.overall} />
            <span className="text-[11px] text-slate-500">Target: p95 ≤ 3000 ms per action</span>
          </div>
          {Object.entries(speed.perAction).map(([action, s]) => (
            <div key={action} className="flex items-center justify-between gap-2 py-1.5 border-b border-ink/[0.05] last:border-0">
              <span className="text-[12px] font-semibold text-slate-600">{action.replace(/_/g, " ")}</span>
              <div className="flex items-center gap-2">
                {s.n > 0 ? (
                  <>
                    <span className="text-[12px] font-bold tabular-nums" style={{ color: s.status === "VERIFIED" ? "#0E6A30" : "#B01F17" }}>
                      {s.p95} ms
                    </span>
                    <span className="text-[10px] text-slate-400">n={s.n}</span>
                    {s.seeded && <span className="text-[10px] text-amber-600 font-semibold">seeded</span>}
                  </>
                ) : (
                  <span className="text-[11px] text-slate-400">No data</span>
                )}
                <Badge status={s.status} />
              </div>
            </div>
          ))}
        </Card>

        {/* Uptime */}
        <Card icon={Server} title="Uptime (Load Test)" delay={0.14}>
          <div className="flex items-center gap-2 mb-1">
            <Badge status={uptime.status} />
            <span className="text-[11px] text-slate-500">Target: ≥100% uptime over 2h, 100 VU</span>
          </div>
          {uptime.uptimePct != null ? (
            <>
              <Row label="Uptime %" value={`${uptime.uptimePct}%`} sub="target 100%" />
              <Row label="Virtual users" value={uptime.virtualUsers} />
              <Row label="Duration" value={`${uptime.durationMinutes} min`} />
              <Row label="Run at" value={new Date(uptime.runAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} />
            </>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">{uptime.reason}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
