// Team Lead Team (V2 Phase 4 · T-1, UX TL §3, D-117): Team Overview + Availability merged into the Manager's
// Workload table (same engine numbers), member drawer and Reassign — scoped by the server to the TL's projects.
// No XP in the drawer. ?member=<id> opens a person.
import { useSearchParams } from "react-router-dom";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import useLoad from "../manager/project/useLoad";
import WorkloadTab from "../manager/resources/WorkloadTab";
import MemberDrawer from "../manager/resources/MemberDrawer";

const ROLES = [["developer", "Developers"], ["designer", "Designers"], ["tester", "Testers"]].map(([value, label]) => ({ value, label }));

export default function TLTeamPage() {
  const [sp, setSp] = useSearchParams();
  const team = useLoad("/api/teamlead/team");
  const close = () => { const n = new URLSearchParams(sp); n.delete("member"); setSp(n, { replace: true }); };
  return (
    <Page>
      <PageHeader title="Team" subtitle="Who has room and who is over capacity on your projects. Open a person to move a task to someone with room." />
      <div className="flex flex-col gap-4">
        <WorkloadTab data={team.data} error={team.error} reload={team.reload} roleOptions={ROLES} emptyAction={{ label: "Open modules", to: "/teamlead/modules" }} />
      </div>
      <MemberDrawer memberId={sp.get("member")} onClose={close} onChanged={team.reload} base="/api/teamlead" memberPath="/team/members" />
    </Page>
  );
}
