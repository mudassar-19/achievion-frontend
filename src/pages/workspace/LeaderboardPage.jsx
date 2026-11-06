// Shared leaderboard for every portal (U-1, D-133; UC-13, FR05-05). The server decides who is ranked
// (Developers, Designers, Testers, Team Leads — never Managers or Directors) and which scopes this viewer has.
import { useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Minus, Trophy, Gauge, Activity, Flame } from "lucide-react";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import useLoad from "@/pages/manager/project/useLoad";

const SCOPE_LABEL = { company: "Company", team: "Team", project: "Project" };
const PERIODS = [{ value: "all", label: "All-time" }, { value: "month", label: "This month" }, { value: "week", label: "Last 7 days" }];
const PLACE = { 1: "#8A6100", 2: "#4A566B", 3: "#8A4B1F" }; // gold / silver / bronze text tones (≥4.5:1 on white)
const n = (v) => (v ?? 0).toLocaleString();
const initials = (name) => String(name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function Avatar({ name, size = 32 }) {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent-tint font-black text-accent-text"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials(name)}</span>
  );
}
function Person({ r }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={r.name} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-text-primary" title={r.name}>{r.name}{r.isUser && <span className="ml-1.5 text-xs font-bold text-accent-text">(you)</span>}</p>
        <p className="truncate text-xs text-text-secondary">{r.role}</p>
      </div>
    </div>
  );
}
// Rank movement over the last 7 days (all-time only).
function Change({ c }) {
  if (!c || c.dir === "new") return null;
  if (c.dir === "same") return <span className="inline-flex items-center text-text-secondary" title="Same rank as 7 days ago"><Minus size={12} aria-hidden /><span className="sr-only">no change</span></span>;
  const up = c.dir === "up";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? "text-[#0E6A30]" : "text-[#B01F17]"}`} title={`${up ? "Up" : "Down"} ${c.by} since 7 days ago`}>
      {up ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />}{c.by}
      <span className="sr-only">{up ? "places up" : "places down"}</span>
    </span>
  );
}
function Podium({ rows }) {
  const top = rows.filter((r) => r.rank <= 3).slice(0, 3);
  return (
    <ol aria-label="Top three" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {top.map((r) => (
        <li key={r.userId} className="glass-panel flex min-w-0 items-center gap-3 rounded-2xl border border-ink/[0.07] px-4 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black tabular-nums"
            style={{ color: PLACE[r.rank], borderColor: `${PLACE[r.rank]}55` }}><span className="sr-only">Rank </span>{r.rank}</span>
          <Avatar name={r.name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-text-primary" title={r.name}>{r.name}</p>
            <p className="truncate text-xs text-text-secondary">{r.role} · Level {r.level}</p>
          </div>
          <p className="shrink-0 text-right text-sm font-black tabular-nums text-text-primary">{n(r.xp)}<span className="block text-[11px] font-semibold text-text-secondary">XP</span></p>
        </li>
      ))}
    </ol>
  );
}

export default function LeaderboardPage() {
  const [sp, setSp] = useSearchParams();
  const scope = sp.get("scope") ?? "", period = sp.get("period") ?? "all", projectId = sp.get("project") ?? "";
  const q = new URLSearchParams({ ...(scope && { scope }), period, ...(projectId && { projectId }) });
  const { data, error, loading, reload } = useLoad(`/api/gamification/leaderboard?${q}`);
  const rows = data?.rows ?? [];
  const pick = (id) => { const next = new URLSearchParams(sp); if (id) next.set("project", id); else next.delete("project"); setSp(next, { replace: true }); };

  const columns = [
    { key: "rank", label: "Rank", className: "w-24 whitespace-nowrap", render: (r) => <span className="inline-flex items-center gap-2"><span className="font-black tabular-nums text-text-primary">#{r.rank}</span><Change c={r.change} /></span> },
    { key: "person", label: "Person", className: "min-w-[220px]", render: (r) => <Person r={r} /> },
    { key: "level", label: "Level", render: (r) => <span className="tabular-nums">{r.level}</span> },
    { key: "xp", label: "XP", render: (r) => <span className="font-bold tabular-nums text-text-primary">{n(r.xp)}</span> },
    { key: "tasks", label: "Tasks done", render: (r) => <span className="tabular-nums">{n(r.tasksCompleted)}</span> },
    { key: "ontime", label: "On-time %", render: (r) => <span className="tabular-nums">{r.onTimePct == null ? "—" : `${r.onTimePct}%`}</span> },
    { key: "streak", label: "Streak", render: (r) => <span className="inline-flex items-center gap-1 tabular-nums">{r.streak > 0 && <Flame size={13} className="text-[#B25E00]" aria-hidden />}{r.streak} {r.streak === 1 ? "day" : "days"}</span> },
  ];

  return (
    <Page>
      <PageHeader title="Leaderboard" subtitle="Ranked by XP. Developers, Designers, Testers and Team Leads take part. People with the same XP share a rank." />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {data?.scopes?.length > 1 && <FilterChips label="Scope" param="scope" fallback={data.scopes[0]} options={data.scopes.map((s) => ({ value: s, label: SCOPE_LABEL[s] }))} />}
        <FilterChips label="Period" param="period" fallback="all" options={PERIODS} />
        {data?.scope === "project" && (
          <label className="flex min-w-0 items-center gap-2 text-xs font-bold text-text-secondary">Project
            <select value={data.project?.id ?? ""} onChange={(e) => pick(e.target.value)} disabled={!data.projects.length}
              className="h-8 min-w-0 max-w-[280px] truncate rounded-xl border border-border-subtle bg-bg-surface px-2 text-sm font-semibold text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
              {!data.projects.length && <option value="">No projects</option>}
              {data.projects.map((p) => <option key={p.id} value={p.id}>{p.title.length > 48 ? `${p.title.slice(0, 47)}…` : p.title}</option>)}
            </select>
          </label>
        )}
      </div>

      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : !data?.enough ? (
        <Panel title="Leaderboard" icon={Trophy}>
          <EmptyState pose="thinking" heading="Not enough people to rank yet"
            body={rows.length === 1 ? "Only one person is in this view. A leaderboard needs at least two." : "Nobody in this view earns XP yet. Try another scope."}
            action={data?.scopes?.length > 1 && data.scope !== data.scopes[0] ? { label: `Show ${SCOPE_LABEL[data.scopes[0]]}`, to: "?" } : undefined} />
        </Panel>
      ) : (<>
        <Panel title="Summary" icon={Gauge}>
          <div className="grid grid-cols-1 divide-y divide-ink/[0.05] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <StatCard label="Top performer" icon={Trophy} color="#8A6100" value={data.meta.topPerformer ? <span className="block max-w-[16rem] truncate" title={data.meta.topPerformer.name}>{data.meta.topPerformer.name}</span> : null}
              noDataLabel="No XP yet" sub={data.meta.topPerformer ? `${n(data.meta.topPerformer.xp)} XP` : undefined} />
            <StatCard label="Average XP" icon={Gauge} color="#3A4659" value={n(data.meta.avgXp)} sub={`${rows.length} people`} />
            <StatCard label="Active in the last 7 days" icon={Activity} color="#0E6A30" value={n(data.meta.activeContributors)} sub="earned XP this week" />
          </div>
        </Panel>
        <Podium rows={rows} />
        <DataTable label="Leaderboard" columns={columns} rows={rows} rowKey={(r) => r.userId} total={rows.length} pageSize={Math.max(rows.length, 1)} loading={loading} />
      </>)}
    </Page>
  );
}
