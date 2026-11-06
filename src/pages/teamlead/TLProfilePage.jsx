// Team Lead profile on the shell (S-3, D-168): who you are and where you lead. Level and XP live on My stats,
// team numbers on Performance; editing is in Settings. Data: GET /api/teamlead/profile/full (unchanged).
import { Link } from "react-router-dom";
import { Briefcase, FolderKanban, Layers, ListChecks, Star, UserRound } from "lucide-react";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import { BTN } from "@/components/ui/buttons";
import useAuthStore from "@/stores/authStore";
import { useRoleTheme } from "@/utils/roleTheme";
import useLoad from "../manager/project/useLoad";
import { fmt } from "../manager/project/format";

const n = (v) => (v ?? 0).toLocaleString();
const initials = (name) => String(name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function Fact({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold text-text-secondary">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-text-primary" title={typeof children === "string" ? children : undefined}>{children}</dd>
    </div>
  );
}

export default function TLProfilePage() {
  const { accent } = useRoleTheme();
  const orgName = useAuthStore((s) => s.user?.orgName);
  const { data: d, error, reload } = useLoad("/api/teamlead/profile/full");
  if (error) return <Page><ErrorState message={error} onRetry={reload} /></Page>;
  if (!d) return (
    <Page><div aria-busy="true" aria-label="Loading your profile" className="flex flex-col gap-6">
      <Skeleton className="h-14 w-1/3 rounded-xl" /><Skeleton className="h-[188px] rounded-2xl" /><Skeleton className="h-[164px] rounded-2xl" />
    </div></Page>
  );
  const u = d.user ?? {}, g = d.gamification ?? {}, p = d.performance ?? {};
  return (
    <Page>
      <PageHeader title="Profile" subtitle="Your account and where you lead. Change your name, password or alerts in Settings.">
        <Link to="/teamlead/settings" className={BTN.secondary}>Open Settings</Link>
      </PageHeader>

      <Panel title="Account" icon={UserRound}>
        <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-start">
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-xl font-black text-accent-text">{initials(u.name)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black text-text-primary" title={u.name}>{u.name}</p>
            <p className="text-sm text-text-secondary">{u.role}{orgName ? ` · ${orgName}` : ""}</p>
            <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
              <Fact label="Email">{u.email ?? "—"}</Fact>
              <Fact label="Department">{u.department && u.department !== "—" ? u.department : "Not set"}</Fact>
              <Fact label="Member since">{fmt(u.joinedAt)}</Fact>
            </dl>
          </div>
        </div>
      </Panel>

      <Panel title="Your work" icon={Briefcase}>
        {p.projectsHandled ? (
          <div className="grid grid-cols-2 divide-ink/[0.05] lg:grid-cols-4 lg:divide-x">
            <StatCard label="Projects you are on" value={n(p.projectsHandled)} icon={FolderKanban} color={accent} to="/teamlead/modules" />
            <StatCard label="Modules in progress" value={n(p.activeMilestonesCount)} icon={Layers} color={accent} to="/teamlead/modules" />
            <StatCard label="Tasks on your projects" value={n(p.tasksManaged)} icon={ListChecks} color={accent} to="/teamlead/tasks" />
            <StatCard label="Your level" value={n(g.level ?? 1)} sub={`${n(g.totalXp)} XP in total`} icon={Star} color={accent} to="/teamlead/my-stats" />
          </div>
        ) : (
          <EmptyState heading="You are not on a project yet" body="When a Manager adds you to a project, its modules show up here and under Modules." action={{ label: "Open Modules", to: "/teamlead/modules" }} />
        )}
      </Panel>
    </Page>
  );
}
