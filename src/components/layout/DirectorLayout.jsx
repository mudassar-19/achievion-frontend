// Director portal = PortalShell + Director nav, approval badge, AI panel, celebrations toggle, recap popup.
// The shell itself lives in PortalShell.jsx (docs/design/UNIVERSAL_SHELL.md).
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import RecapPopup     from "@/components/director/RecapPopup";
import useUiStore from "@/stores/uiStore";
import socket from "@/utils/socket";
import AiPanel from "./AiPanel";
import { ViewAsMenu } from "./ViewAs";
import PortalShell, { D_TOPBAR_H } from "./PortalShell";
import { DIRECTOR_FEATURES as DF } from "@/lib/directorFeatures";
import api from "@/lib/api";
import {
  LayoutDashboard, FolderKanban, Users, ClipboardCheck,
  BarChart3, ScrollText, Settings, SlidersHorizontal, User, Bell, Trophy,
  CalendarRange, Inbox, ShieldAlert, Target, Heart, Cpu, Award, MessageSquare, Leaf,
} from "lucide-react";

function aiContext(pathname) {
  if (pathname.includes("/capacity"))  return "Capacity";
  if (pathname.includes("/risk"))      return "Risk";
  if (pathname.includes("/goals"))     return "Goals";
  if (pathname.includes("/reports"))   return "Reports";
  if (pathname.includes("/portfolio")) return "Portfolio";
  if (pathname.includes("/dashboard")) return "Dashboard";
  return "Org";
}

const APPROVAL_TARGET = { to: "/director/approvals", label: "Open approvals →" };

export default function DirectorLayout() {
  const addToast = useUiStore((s) => s.addToast);
  const { pathname } = useLocation();
  const [approvalSignal, setApprovalSignal] = useState(0);
  const [pendingCount,   setPendingCount]   = useState(0);

  // Socket: new approval
  useEffect(() => {
    function handleApprovalNew(data) {
      const desc = data.description ? `: ${data.description}` : "";
      addToast({ type: "info", message: `New approval request${desc}`, duration: 6000 });
      setApprovalSignal((v) => v + 1);
      setPendingCount((v) => v + 1);
    }
    socket.on("approval:new", handleApprovalNew);
    return () => { socket.off("approval:new", handleApprovalNew); };
  }, [addToast]);

  // Initial pending count for the rail badge
  useEffect(() => {
    api.get("/api/approvals").then((r) => {
      setPendingCount((r.approvals ?? []).length);
    }).catch(() => {});
  }, []);

  const cfg = {
    role: "director", portal: "Director", portalSub: "Command Portal", storageKey: "achievion-director-rail",
    nav: [
      { label: "Main", items: [
        { icon: LayoutDashboard, label: "Home",             to: "/director", end: true },
        { icon: FolderKanban,    label: "Portfolio",        to: "/director/projects" },
        { icon: Leaf,            label: "Progress Garden",  to: "/director/garden" },
        { icon: Users,           label: "Team",             to: "/director/roles" },
      ] },
      { label: "Operations", items: [
        { icon: ClipboardCheck, label: "Approvals",  to: "/director/approvals", badge: pendingCount },
        { icon: CalendarRange,  label: "Extensions", to: "/director/extensions" },
        ...(DF.voice ? [{ icon: Inbox, label: "Feedback", to: "/director/voice" }] : []),
        { icon: MessageSquare,  label: "Chat",       to: "/director/chat" },
        ...(DF.risks ? [{ icon: ShieldAlert, label: "Risks", to: "/director/risks" }] : []),
        ...(DF.goals ? [{ icon: Target, label: "Goals", to: "/director/goals" }] : []),
        { icon: Heart,      label: "Org Health", to: "/director/org-health" },
        { icon: Cpu,        label: "Capacity",   to: "/director/capacity" },
        { icon: Award,      label: "Criteria",   to: "/director/success-criteria" },
        { icon: BarChart3,  label: "Reports",    to: "/director/reports" },
        { icon: ScrollText, label: "Audit Log",  to: "/director/audit-log" },
        { icon: ShieldAlert, label: "Anomalies", to: "/director/anomalies" }, // Batch 5 (D9)
      ] },
      { label: "Config", items: [
        { icon: SlidersHorizontal, label: "Workspace", to: "/director/workspace-settings" },
      ] },
    ],
    menu: [
      { icon: User,     label: "Profile",       to: "/director/profile" },
      { icon: Bell,     label: "Notifications", to: "/director/notifications" },
      { icon: Trophy,   label: "Leaderboard",   to: "/director/leaderboard" },
      { icon: User,     label: "My settings",   to: "/director/account-settings" },
      { icon: Settings, label: "Settings",      to: "/director/settings" },
    ],
    notifTarget: (n) => (n.type === "approval_required" ? APPROVAL_TARGET : null),
    topbarExtra: <ViewAsMenu />,
  };

  return (
    <PortalShell
      cfg={cfg}
      notifSignal={approvalSignal}
      aiPanel={({ open, onClose }) => (
        <AiPanel open={open} onClose={onClose} topOffset={D_TOPBAR_H} context={aiContext(pathname)} fullScreenPath="/director/ask" />
      )}
    >
      {DF.recaps && <RecapPopup />}
    </PortalShell>
  );
}
