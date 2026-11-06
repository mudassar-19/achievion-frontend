// One sprint for the Team Lead (V2 Phase 4 · T-5, D-143, D-121): the Manager's M-3 page with TL API + links. Plan, start,
// close, summary + velocity history; no AI here (T-6). The old read-only version was T-1 (D-116, superseded).
import ManagerSprintPage from "../manager/ManagerSprintPage";

export default function TLSprintPage() {
  return <ManagerSprintPage isLead base="/api/teamlead" root="/teamlead" projectLink={(id) => `/teamlead/modules/${id}`} notFound="This sprint does not exist or is not in your projects." />;
}
