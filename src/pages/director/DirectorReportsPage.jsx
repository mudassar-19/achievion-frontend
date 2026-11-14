import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart2, CheckSquare, Clock, AlertTriangle, TrendingUp, Zap, FileText, Calendar, Download, RefreshCw, Layers, Sparkles } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import api from "@/lib/api";
import { useRoleTheme } from "@/utils/roleTheme";

// ── Bar colors per category (neutral, accessible) ─────────────────────────────
const BAR_COLORS = [
  "var(--accent)", "var(--accent)", "#0A7F76", "#0E6A30",
  "#7A5200", "#9A3A06", "#136386", "#4F5B75",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Skeleton block ────────────────────────────────────────────────────────────
function Skeleton({ h = "h-4", w = "w-full", rounded = "rounded-lg" }) {
  return <div className={`${h} ${w} ${rounded} bg-ink/[0.05] animate-pulse`} />;
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, delay = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07] p-6"
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgb(var(--c-accent)/0.12)" }}>
          <Icon size={16} style={{ color: "var(--accent)" }} strokeWidth={1.75} />
        </div>
        <h2 className="text-sm font-bold text-text-primary">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

// ── Custom recharts tooltip ───────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#FFFFFF] border border-ink/[0.1] px-3 py-2 text-xs shadow-xl">
      <p className="font-bold text-text-primary">{payload[0].payload.role}</p>
      <p style={{ color: "var(--accent)" }} className="font-black tabular-nums">{payload[0].value.toLocaleString()} XP</p>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex flex-col items-center justify-center py-5 rounded-2xl gap-1 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.07]"
    >
      <Icon size={18} strokeWidth={1.75} style={{ color }} />
      <p className="text-3xl font-black tabular-nums leading-none mt-1" style={{ color }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-[14px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const ACCENT = "#4B2FC4";

// ── Saved Views panel ─────────────────────────────────────────────────────────
// ── Custom Reports tab (portfolio + delivery + capacity + CSV export) ──────────
function CustomReportsTab() {
  useRoleTheme();
  const [portfolio, setPortfolio] = useState(null);
  const [delivery,  setDelivery]  = useState(null);
  const [capacity,  setCapacity]  = useState(null);
  const [exporting, setExporting] = useState("");
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    api.get("/api/director/reports/portfolio").then((d) => setPortfolio(d)).catch(() => setPortfolio({ rows: [], summary: {}, total: 0 }));
    api.get("/api/director/reports/delivery").then((d) => setDelivery(d)).catch(() => setDelivery(null));
    api.get("/api/director/reports/capacity").then((d) => setCapacity(d)).catch(() => setCapacity(null));
  }, []);

  // Batch 5 (D8, UC-20): PDF (logo, AI summary, chart, table) or CSV, through the API client.
  async function download(type, format) {
    setExporting(`${type}-${format}`); setExportError("");
    try {
      const blob = await api.download(`/api/director/reports/export?type=${type}&format=${format}`);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `report-${type}.${format}` });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setExportError(e?.message ?? "The export did not work. Try again."); }
    finally { setExporting(""); }
  }
  const exportButtons = (type) => (
    <div className="flex flex-wrap items-center gap-2" data-export={type}>
      {[["pdf", "Export PDF"], ["csv", "Export CSV"], ["xlsx", "Export Excel"]].map(([f, label]) => (
        <button key={f} type="button" onClick={() => download(type, f)} disabled={!!exporting}
          className="flex min-h-[36px] items-center gap-1.5 rounded-xl border border-ink/[0.1] px-3 py-1.5 text-[12px] font-bold transition-colors hover:bg-ink/[0.04] disabled:opacity-50">
          <Download size={12} aria-hidden="true" /> {exporting === `${type}-${f}` ? "Preparing…" : label}
        </button>
      ))}
      {exportError && <span role="alert" className="text-[12px] text-[#B01F17]">{exportError}</span>}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <Section icon={Layers} title="Portfolio Status" delay={0.05}>
        {!portfolio ? <div className="h-32 animate-pulse rounded-xl bg-ink/[0.04]" /> : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 mb-1">
              {Object.entries(portfolio.summary).map(([status, count]) => (
                <span key={status} className="text-[12px] px-2.5 py-1 rounded-full border border-ink/[0.1] font-bold text-slate-600">
                  {status} <span style={{ color: ACCENT }}>{count}</span>
                </span>
              ))}
              <span className="text-[12px] px-2.5 py-1 rounded-full bg-ink/[0.04] font-bold text-slate-500">Total: {portfolio.total}</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-ink/[0.06]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-ink/[0.06] bg-ink/[0.02]">
                    {["Project","Status","Priority","Deadline","Health"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[13px] font-bold uppercase tracking-wide text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {portfolio.rows.slice(0, 10).map((p) => (
                    <tr key={p.id} className="border-b border-ink/[0.04] last:border-0 hover:bg-ink/[0.02]">
                      <td className="px-4 py-2.5 font-semibold text-text-primary">{p.title}</td>
                      <td className="px-4 py-2.5 text-slate-500">{p.status}</td>
                      <td className="px-4 py-2.5 text-slate-500">{p.priority ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-400">{p.deadline ? new Date(p.deadline).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}</td>
                      <td className="px-4 py-2.5 tabular-nums font-bold" style={{ color: ACCENT }}>{p.healthScore ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {exportButtons("portfolio")}
          </div>
        )}
      </Section>

      <Section icon={CheckSquare} title="On-time Delivery" delay={0.1}>
        {!delivery ? <div className="h-20 animate-pulse rounded-xl bg-ink/[0.04]" /> : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-4 flex-wrap">
              {[
                { label: "On-time tasks",   value: delivery.onTime, color: "#0E6A30" },
                { label: "Total completed", value: delivery.total,  color: ACCENT },
                { label: "On-time rate",    value: delivery.rate != null ? `${delivery.rate}%` : "N/A", color: (delivery.rate ?? 0) >= 80 ? "#0E6A30" : "#B01F17" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col gap-0.5 px-4 py-3 rounded-2xl bg-ink/[0.03] border border-ink/[0.06]">
                  <span className="text-xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-[12px] font-semibold text-slate-500">{s.label}</span>
                </div>
              ))}
            </div>
            {exportButtons("delivery")}
          </div>
        )}
      </Section>

      <Section icon={BarChart2} title="Team Capacity" delay={0.15}>
        {!capacity ? <div className="h-20 animate-pulse rounded-xl bg-ink/[0.04]" /> : (
          <div className="flex gap-4 flex-wrap">
            {[
              { label: "Total members",         value: capacity.totalMembers,      color: ACCENT },
              { label: "Overloaded (>3 tasks)",  value: capacity.overloadedMembers, color: capacity.overloadedMembers > 0 ? "#B01F17" : "#0E6A30" },
              { label: "Open tasks",            value: capacity.openTasks,         color: ACCENT },
              { label: "Avg tasks / member",    value: capacity.avgTasksPerMember, color: ACCENT },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5 px-4 py-3 rounded-2xl bg-ink/[0.03] border border-ink/[0.06]">
                <span className="text-xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</span>
                <span className="text-[12px] font-semibold text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Recaps tab ────────────────────────────────────────────────────────────────
function RecapsTab() {
  const [recaps,       setRecaps]       = useState(null);
  const [generating,   setGenerating]   = useState(false);
  const [genType,      setGenType]      = useState("weekly");
  const [genErr,       setGenErr]       = useState("");
  const [celebration,  setCelebration]  = useState(false);
  const [aiUnavailable,setAiUnavailable]= useState(false);
  const [summarizing,  setSummarizing]  = useState(false);
  const [aiSummary,    setAiSummary]    = useState(null);

  async function load() {
    try {
      const { items } = await api.get("/api/director/recaps");
      setRecaps(items ?? []);
    } catch { setRecaps([]); }
  }

  useEffect(() => { load(); }, []);

  async function generate() {
    setGenerating(true); setGenErr("");
    try {
      await api.post("/api/director/recaps/generate", { type: genType });
      await load();
      setCelebration(true);
      setTimeout(() => setCelebration(false), 2500);
    } catch (ex) {
      setGenErr(ex?.message ?? "Generation failed.");
    } finally { setGenerating(false); }
  }

  async function getWeeklySummary() {
    setSummarizing(true);
    try {
      const { summary } = await api.post("/api/director/ai/weekly-summary");
      setAiSummary(summary);
    } catch (e) {
      if (e?.status === 503) setAiUnavailable(true);
      else if (e?.status === 400) setAiSummary(null); // disabled in settings
      else setAiSummary(null);
    } finally { setSummarizing(false); }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* AI Weekly Summary */}
      <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles size={13} style={{ color: "#7C3AED" }} />
          <p className="text-xs font-bold text-violet-800">AI Weekly Summary</p>
        </div>
        <div className="flex items-center gap-2">
          {aiUnavailable ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-ink/[0.08] text-slate-400 cursor-not-allowed">
              <Sparkles size={11} /> AI abhi connected nahi
            </span>
          ) : aiSummary ? (
            <button onClick={() => setAiSummary(null)} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-violet-200 text-violet-600 hover:bg-violet-100 min-h-[32px]">Dismiss</button>
          ) : (
            <button onClick={getWeeklySummary} disabled={summarizing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-violet-200 text-violet-600 hover:bg-violet-100 disabled:opacity-50 min-h-[32px]">
              <Sparkles size={11} /> {summarizing ? "Generating…" : "Get AI summary"}
            </button>
          )}
        </div>
        {aiSummary && (
          <p className="w-full text-xs text-violet-700">
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mr-1">AI-generated</span>
            {aiSummary}
          </p>
        )}
      </div>

      <Section icon={Calendar} title="Generate Recap" delay={0.05}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-semibold text-slate-600">Period type</label>
            <select
              className="border border-ink/[0.12] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B2FC4] min-h-[40px]"
              value={genType} onChange={(e) => setGenType(e.target.value)}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-60 min-h-[40px]"
            style={{ background: ACCENT }}>
            <RefreshCw size={13} className={generating ? "animate-spin" : ""} />
            {generating ? "Generating…" : "Generate now"}
          </button>
          {genErr && <p className="text-xs text-red-600">{genErr}</p>}
          {celebration && <p className="text-xs font-bold" style={{ color: ACCENT }}>Recap generated!</p>}
        </div>
      </Section>

      <Section icon={FileText} title="Past Recaps" delay={0.1}>
        {recaps === null ? (
          <div className="h-24 animate-pulse rounded-xl bg-ink/[0.04]" />
        ) : recaps.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">No recaps yet. Generate one above.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recaps.map((r) => (
              <div key={r._id} className="rounded-xl border border-ink/[0.07] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-text-primary">{r.periodLabel}</p>
                    <p className="text-[12px] text-slate-500 capitalize">{r.type} · {new Date(r.createdAt).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-ink/[0.08] text-slate-500 capitalize">{r.type}</span>
                </div>
                {r.cards?.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {r.cards.map((c, i) => (
                      <div key={i} className="rounded-xl bg-ink/[0.03] border border-ink/[0.05] px-3 py-2">
                        <p className="text-lg font-black tabular-nums" style={{ color: ACCENT }}>{c.metric?.value ?? "—"}</p>
                        <p className="text-[11px] font-semibold text-slate-500">{c.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

export default function DirectorReportsPage() {
  const theme = useRoleTheme();
  const [tab,       setTab]       = useState("analytics");
  const [xpByRole,  setXpByRole]  = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [velocity,  setVelocity]  = useState(null);

  useEffect(() => {
    setTimeout(() => {
      api.get("/api/director/reports/xp-by-role")
        .then((d) => setXpByRole(d.data ?? []))
        .catch(() => setXpByRole([]));

      api.get("/api/director/reports/task-stats")
        .then((d) => setTaskStats(d))
        .catch(() => setTaskStats({ total: 0, completed: 0, inReview: 0, overdue: 0 }));

      api.get("/api/director/reports/sprint-velocity")
        .then((d) => setVelocity(d.rows ?? []))
        .catch(() => setVelocity([]));
    }, 0);
  }, []);

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1280px] mx-auto flex flex-col gap-6">

      {/* Page heading */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <PageHeader title="Reports & Recaps" subtitle="Analytics, custom reports, and weekly/monthly summaries." />
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-ink/[0.07] -mt-2">
        {[
          { id: "analytics",       label: "Analytics" },
          { id: "custom-reports",  label: "Custom reports" },
          { id: "recaps",          label: "Recaps" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-current"
                : "border-transparent text-slate-500 hover:text-text-primary",
            ].join(" ")}
            style={tab === t.id ? { color: ACCENT, borderColor: ACCENT } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "custom-reports" && <CustomReportsTab />}
      {tab === "recaps"         && <RecapsTab />}

      {tab === "analytics" && <>

      {/* ── Task Completion Stats ─────────────────────────────────────────── */}
      <Section icon={CheckSquare} title="Task Completion Overview" delay={0.05}>
        {!taskStats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} h="h-28" rounded="rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={BarChart2}     label="Total Tasks"  value={taskStats.total}     color={theme.accent} delay={0.06} />
            <StatCard icon={CheckSquare}   label="Completed"    value={taskStats.completed}  color="#0E6A30"      delay={0.09} />
            <StatCard icon={Clock}         label="In Review"    value={taskStats.inReview}   color={theme.accent} delay={0.12} />
            <StatCard icon={AlertTriangle} label="Overdue"      value={taskStats.overdue}    color="#B01F17"      delay={0.15} />
          </div>
        )}
      </Section>

      {/* ── XP by Role ───────────────────────────────────────────────────── */}
      <Section icon={Zap} title="XP Distribution by Role" delay={0.1}>
        {!xpByRole ? (
          <Skeleton h="h-56" />
        ) : xpByRole.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-700 gap-2">
            <Zap size={28} strokeWidth={1.2} />
            <p className="text-xs font-medium">No XP data yet.</p>
          </div>
        ) : (() => {
          // rename 'role' field to 'roleName' so Recharts does not pass it as
          // an ARIA role attribute on SVG <path> elements (axe aria-roles violation)
          const chartData = xpByRole.map(({ role, ...rest }) => ({ ...rest, roleName: role }));
          return (
            <figure aria-label="XP distribution by role bar chart">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 56, top: 0, bottom: 0 }}>
                  <XAxis
                    type="number"
                    tick={{ fill: "#6D7B99", fontSize: 14 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  />
                  <YAxis
                    type="category"
                    dataKey="roleName"
                    tick={{ fill: "#6D7B99", fontSize: 13 }}
                    axisLine={false}
                    tickLine={false}
                    width={160}
                  />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: theme.accent + "18" }} />
                  <Bar dataKey="totalXp" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                    <LabelList
                      dataKey="totalXp"
                      position="right"
                      formatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                      style={{ fill: "#6D7B99", fontSize: 12, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </figure>
          );
        })()}
      </Section>

      {/* ── Sprint Velocity ───────────────────────────────────────────────── */}
      <Section icon={TrendingUp} title="Sprint Velocity (last 5)" delay={0.2}>
        {!velocity ? (
          <div className="flex flex-col gap-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} h="h-12" />)}
          </div>
        ) : velocity.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-700 gap-2">
            <TrendingUp size={28} strokeWidth={1.2} />
            <p className="text-xs font-medium">No sprints recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-ink/[0.06]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ink/[0.06] bg-ink/[0.02]">
                  {["Sprint", "Start", "Status", "Planned", "Completed", "Velocity"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[14px] font-bold uppercase tracking-[0.12em] text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {velocity.map((s) => {
                  const cfg = {
                    Active:    { color: "#0E6A30",    bg: "#12803B18" },
                    Completed: { color: theme.accent, bg: theme.accent + "18" },
                    Planning:  { color: "#3A4660",    bg: "#6D7B9918" },
                  }[s.status] ?? { color: "#3A4660", bg: "#6D7B9918" };
                  return (
                    <tr key={s.id} className="border-b border-ink/[0.04] last:border-0 hover:bg-ink/[0.03] transition-colors">
                      <td className="px-4 py-3 font-semibold text-text-primary">{s.name}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(s.startDate)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[14px] font-black uppercase tracking-wider"
                          style={{ color: cfg.color, background: cfg.bg }}>{s.status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 tabular-nums">{s.planned}</td>
                      <td className="px-4 py-3 text-slate-400 tabular-nums">{s.completed}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-ink/[0.06] overflow-hidden max-w-[80px]">
                            <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}99)` }} />
                          </div>
                          <span className="font-bold tabular-nums" style={{ color: theme.accent }}>{s.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      </>}  {/* end tab === "analytics" */}

    </div>
  );
}

