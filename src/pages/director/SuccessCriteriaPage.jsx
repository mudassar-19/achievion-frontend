// Success Metrics (item 22): the four targets of the project proposal, each with its progress, its target and where the target
// comes from. A number is shown only when real data exists; otherwise the card says what is missing.
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart2, Zap, Clock, Server } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";
import { fmtDate } from "@/lib/dates";

const ACCENT = "#4B2FC4";
const STATUS = {
  "VERIFIED":     { label: "Target met",      cls: "bg-[#0E6A30] text-white" },
  "NOT VERIFIED": { label: "Below target",    cls: "bg-[#B01F1718] text-[#B01F17]" },
  "IN PROGRESS":  { label: "In progress",     cls: "bg-[#9A3A0618] text-[#9A3A06]" },
  "NO DATA":      { label: "No data yet",     cls: "bg-ink/[0.06] text-text-secondary" },
};

function Chip({ status }) {
  const s = STATUS[status] ?? STATUS["NO DATA"];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wider ${s.cls}`}>{s.label}</span>;
}

// "2 of 20 responses" with a thin bar. have/need come from the text the server sends; the bar is only decoration.
function Progress({ text, have, need }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-bold text-text-primary tabular-nums">{text}</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={Math.min(have, need)} aria-label={text}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (have / need) * 100)}%`, background: ACCENT }} />
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, status, delay = 0, children }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }} aria-label={title}
      className="flex flex-col gap-4 rounded-2xl border border-ink/[0.07] bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] p-5">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: `${ACCENT}12` }}><Icon size={15} style={{ color: ACCENT }} strokeWidth={1.75} /></div>
          <h2 className="text-sm font-bold text-text-primary">{title}</h2>
        </div>
        <Chip status={status} />
      </div>
      {children}
    </motion.section>
  );
}

const Row = ({ label, value, sub }) => (
  <div className="flex items-center justify-between gap-3 border-b border-ink/[0.05] py-2 last:border-0">
    <span className="text-xs font-semibold text-slate-600">{label}</span>
    <div className="text-right"><span className="text-xs font-black tabular-nums" style={{ color: ACCENT }}>{value}</span>{sub && <p className="text-[11px] text-slate-500">{sub}</p>}</div>
  </div>
);
const Target = ({ text }) => <p className="text-[12px] leading-snug text-text-secondary"><span className="font-bold text-text-primary">Target: </span>{text}</p>;
const ACTION = { login: "Login", dashboard_load: "Open dashboard", create_task: "Create task", move_task: "Move task", submit_task: "Submit task", approve_extension: "Approve extension", open_portfolio: "Open portfolio" };

export default function SuccessCriteriaPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api.get("/api/director/success-criteria").then(setData).catch(() => setError("The success metrics could not be loaded.")); }, []);

  if (error) return <div role="alert" className="px-8 py-10 text-sm text-red-600">{error}</div>;
  if (!data) return <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-4 px-4 py-8 sm:grid-cols-2 sm:px-8">{[...Array(4)].map((_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-ink/[0.04]" />)}</div>;

  const { satisfaction: s, ai, speed, uptime: u, targets: T } = data;
  const when = (d) => fmtDate(d);

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-8">
      <PageHeader title="Success Metrics" subtitle="The four targets from the project proposal and how far each one has come. A number appears only when real data exists." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card icon={BarChart2} title="User satisfaction" status={s.status} delay={0.05}>
          <Progress text={s.progress} have={s.n} need={s.needed} />
          <p className="text-xs text-text-secondary"><strong className="text-text-primary">How to fill this: </strong>send the survey link (/survey) to 20 to 30 testers after they finish the task script.</p>
          <Target text={`${T.survey.bothPct}% of users rate both "enjoyable" and "easy" 4 or 5, and the usability score (SUS) averages ${T.survey.susAvg} or more.`} />
          {s.status === "NO DATA" && <p className="text-xs text-text-secondary">No survey answers yet. Ask your test users to fill in the survey after the task script. Aim for {s.aim}.</p>}
          {s.status === "IN PROGRESS" && <p className="text-xs text-text-secondary">Too few answers to say anything: {s.needed - s.n} more needed before a percentage is shown.</p>}
          {s.bothPct != null && <>
            <Row label="Enjoyable (4 or 5)" value={`${s.enjoyPct}%`} />
            <Row label="Easy (4 or 5)" value={`${s.easyPct}%`} />
            <Row label="Both" value={`${s.bothPct}%`} sub={`target ${T.survey.bothPct}%`} />
            <Row label="Usability score (SUS)" value={s.susAvg ?? "Not asked"} sub={`target ${T.survey.susAvg}`} />
          </>}
          <p className="text-[11px] text-text-secondary">{T.survey.source}</p>
        </Card>

        <Card icon={Zap} title="AI accuracy" status={ai.status} delay={0.08}>
          <Progress text={ai.progress} have={ai.judged} need={ai.needed} />
          <p className="text-xs text-text-secondary"><strong className="text-text-primary">How to fill this: </strong>two people judge each of the 30 AI test cases; a case counts once both have answered.</p>
          <Target text={`At least ${T.ai.passPct}% of ${T.ai.cases} test cases agree with the two human judges.`} />
          {ai.status === "NO DATA" && <p className="text-xs text-text-secondary">No test case has been judged by two people yet.</p>}
          {ai.judged > 0 && <Row label="Agreeing with the judges" value={`${ai.passing} of ${ai.judged}`} sub={ai.passPct != null ? `${ai.passPct}% (target ${T.ai.passPct}%)` : "shown as a percentage after 30 cases"} />}
          <p className="text-[11px] text-text-secondary">{T.ai.source}</p>
        </Card>

        <Card icon={Clock} title="Speed of main actions (p95)" status={speed.overall} delay={0.11}>
          <p className="text-xs text-text-secondary"><strong className="text-text-primary">How to fill this: </strong>use the app or run the task script; each action needs at least the number of measurements shown next to it.</p>
          <Target text={`p95 under ${speed.limitMs / 1000} seconds for each main action, from at least ${speed.minSamples} real measurements.`} />
          <div>
            {Object.entries(speed.perAction).map(([action, a]) => (
              <div key={action} className="flex items-center justify-between gap-2 border-b border-ink/[0.05] py-1.5 last:border-0">
                <span className="text-[12px] font-semibold text-slate-600">{ACTION[action] ?? action}</span>
                <span className="flex items-center gap-2">
                  {a.p95 != null ? <span className="text-[12px] font-bold tabular-nums" style={{ color: a.status === "VERIFIED" ? "#0E6A30" : "#B01F17" }}>{a.p95} ms</span>
                    : <span className="text-[11px] tabular-nums text-text-secondary">{a.progress}</span>}
                  {a.seeded && <span className="text-[10px] font-semibold text-[#9A3A06]">sample data</span>}
                  <Chip status={a.status} />
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-text-secondary">{T.speed.source}</p>
        </Card>

        <Card icon={Server} title="Uptime under stress" status={u.status} delay={0.14}>
          <Progress text={u.progress} have={u.durationMinutes ?? 0} need={u.targetMinutes} />
          <p className="text-xs text-text-secondary"><strong className="text-text-primary">How to fill this: </strong>keep the app running under load for 2 hours in a row and record the run.</p>
          <Target text={`${u.targetPct}% uptime for at least ${u.targetMinutes / 60} consecutive hours during stress testing.`} />
          {u.uptimePct != null ? <>
            <Row label="Uptime in the last run" value={`${u.uptimePct}%`} sub={`target ${u.targetPct}%`} />
            <Row label="Run length" value={`${u.durationMinutes} min`} />
            {u.runAt && <Row label="Run on" value={when(u.runAt)} />}
          </> : <p className="text-xs text-text-secondary">No stress test has been recorded yet.</p>}
          <p className="text-[11px] text-text-secondary">{T.uptime.source}</p>
        </Card>
      </div>
    </div>
  );
}
