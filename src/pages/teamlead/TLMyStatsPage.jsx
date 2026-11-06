// My stats (T-5, D-145, D-020: light). The Team Lead's level, XP, streak, recent XP. No badges, avatar or titles.
import { Flame, History, Star, Zap, ClipboardCheck } from "lucide-react";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import { useRoleTheme } from "@/utils/roleTheme";
import useLoad from "../manager/project/useLoad";
import { fmtDateTime } from "../manager/project/format";

const n = (v) => (v ?? 0).toLocaleString();

export default function TLMyStatsPage() {
  const { accent } = useRoleTheme();
  const { data: d, error, reload } = useLoad("/api/teamlead/my-stats");
  if (error) return <Page><ErrorState message={error} onRetry={reload} /></Page>;
  if (!d) return <Page><div aria-busy="true" aria-label="Loading your stats" className="flex flex-col gap-6"><Skeleton className="h-14 w-1/3 rounded-xl" /><Skeleton className="h-[150px] rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div></Page>;
  return (
    <Page>
      <PageHeader title="My stats" subtitle="Your own level, XP and streak. You earn XP by reviewing your team's work." />
      <Panel title={`Level ${d.level}`} icon={Star}>
        <div className="px-5 pt-4">
          <div className="h-2 overflow-hidden rounded-full bg-ink/[0.07]" role="progressbar" aria-valuenow={d.levelPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to level ${d.level + 1}`}><div className="h-full rounded-full bg-accent" style={{ width: `${d.levelPct}%` }} /></div>
          <p className="mt-1.5 text-[13px] tabular-nums text-text-secondary">{n(d.currentXp)} of {n(d.maxXp)} XP. {n(d.xpToNext)} XP to level {d.level + 1}.</p>
        </div>
        <div className="grid grid-cols-2 divide-ink/[0.05] lg:grid-cols-4 lg:divide-x">
          <StatCard label="Total XP" value={n(d.totalXp)} icon={Zap} color={accent} />
          <StatCard label="XP in the last 7 days" value={n(d.xpThisWeek)} icon={Zap} color={accent} />
          <StatCard label="Streak" value={`${d.streak} ${d.streak === 1 ? "day" : "days"}`} icon={Flame} color={accent} />
          <StatCard label="Reviews given" value={n(d.reviewsGiven)} icon={ClipboardCheck} color={accent} />
        </div>
      </Panel>
      <Panel title="Recent XP" icon={History}>
        {d.recent.length ? (
          <ul className="divide-y divide-ink/[0.05]">{d.recent.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm">
              <span className="min-w-0"><span className="block truncate font-semibold text-text-primary">{r.label}</span><span className="text-xs text-text-secondary">{fmtDateTime(r.at)}</span></span>
              <strong className={`shrink-0 tabular-nums ${r.amount < 0 ? "text-[#B01F17]" : "text-text-primary"}`}>{r.amount > 0 ? "+" : ""}{r.amount} XP</strong>
            </li>))}</ul>
        ) : <EmptyState heading="No XP yet" body="Approve a submission to earn your first XP." action={{ label: "Open Review", to: "/teamlead/review-submissions" }} />}
      </Panel>
    </Page>
  );
}
