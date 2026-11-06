// Manager Resources (V2 Phase 3 · M-4, UX §7): Workload | Assets. Tab, filters and the open member live in the URL.
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import useLoad from "./project/useLoad";
import WorkloadTab from "./resources/WorkloadTab";
import AssetsTab from "./resources/AssetsTab";
import MemberDrawer from "./resources/MemberDrawer";
import ThresholdDrawer from "./resources/ThresholdDrawer";

const TABS = [["workload", "Workload"], ["assets", "Assets"]];

export default function ManagerResourcesPage() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") === "assets" ? "assets" : "workload";
  const workload = useLoad(tab === "workload" ? "/api/manager/resources/workload" : null);
  const assets = useLoad(tab === "assets" ? "/api/manager/assets" : null);
  const [limitOpen, setLimitOpen] = useState(() => sp.get("limit") === "1" && sp.get("tab") !== "assets"); // Settings link (U-1)
  const [creating, setCreating] = useState(false);
  const member = sp.get("member");
  const go = (k) => setSp(k === "workload" ? {} : { tab: k }, { replace: true });
  const closeMember = () => { const n = new URLSearchParams(sp); n.delete("member"); setSp(n, { replace: true }); };

  return (
    <Page>
      <PageHeader title="Resources" subtitle={tab === "workload" ? "Who has room, who is over capacity, and moving work between people." : "Tools, licences and file links your projects use."}
        primary={tab === "assets" ? { label: "New asset", onClick: () => setCreating(true) } : undefined}
        secondary={tab === "workload" ? { label: "Workload limit", onClick: () => setLimitOpen(true), disabled: !workload.data } : undefined} />

      <div role="tablist" aria-label="Resources sections" className="flex gap-1 border-b border-border-subtle"
        onKeyDown={(e) => { if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return; const n = tab === "workload" ? "assets" : "workload"; go(n); requestAnimationFrame(() => document.getElementById(`rtab-${n}`)?.focus()); }}>
        {TABS.map(([k, label]) => (
          <button key={k} id={`rtab-${k}`} role="tab" type="button" aria-selected={tab === k} aria-controls={`rpanel-${k}`} tabIndex={tab === k ? 0 : -1} onClick={() => go(k)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${tab === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}>{label}</button>
        ))}
      </div>

      <div role="tabpanel" id={`rpanel-${tab}`} aria-labelledby={`rtab-${tab}`} className="flex flex-col gap-4">
        {tab === "workload"
          ? <WorkloadTab data={workload.data} error={workload.error} reload={workload.reload} />
          : <AssetsTab {...assets} creating={creating} setCreating={setCreating} />}
      </div>

      <MemberDrawer memberId={member} onClose={closeMember} onChanged={workload.reload} />
      <ThresholdDrawer open={limitOpen} onClose={() => setLimitOpen(false)} threshold={workload.data?.threshold} onSaved={workload.reload} />
    </Page>
  );
}
