// Account settings (UI-E1b, FLG-10): the Director's Profile and My settings in one page. "Profile" = the overview and
// activity (DirectorProfilePage); "Settings" = account, security, notifications, preferences (the shared SettingsPage).
// The tab is in the address (?tab=settings) so it can be linked and reloaded.
import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";

const DirectorProfilePage = lazy(() => import("./DirectorProfilePage"));
const SettingsPage = lazy(() => import("@/pages/workspace/SettingsPage"));
const TABS = [["profile", "Profile"], ["settings", "Settings"]];

export default function DirectorAccountPage() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") === "settings" ? "settings" : "profile";
  const go = (k) => setSp(k === "profile" ? {} : { tab: k }, { replace: true });
  return (
    <Page>
      <PageHeader title="Account settings" subtitle="Your profile, password, notifications and preferences." />
      <div role="tablist" aria-label="Account sections" className="flex gap-1 border-b border-border-subtle"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const n = tab === "profile" ? "settings" : "profile"; go(n); requestAnimationFrame(() => document.getElementById(`acct-tab-${n}`)?.focus());
        }}>
        {TABS.map(([k, label]) => (
          <button key={k} id={`acct-tab-${k}`} role="tab" type="button" aria-selected={tab === k} aria-controls="acct-panel" tabIndex={tab === k ? 0 : -1} onClick={() => go(k)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${tab === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}>{label}</button>
        ))}
      </div>
      <div id="acct-panel" role="tabpanel" aria-labelledby={`acct-tab-${tab}`}>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-ink/[0.05]" />}>
          {tab === "profile" ? <DirectorProfilePage embedded /> : <SettingsPage embedded />}
        </Suspense>
      </div>
    </Page>
  );
}
