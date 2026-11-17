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
  CalendarRange, Inbox, ShieldAlert, Target, Heart, Cpu, Award, MessageSquare, Megaphone, Leaf,
} from "lucide-react";

function aiContext(pathname) {
  if (pathname.includes("/capacity"))  return "Capacity";
  if (pathname.includes("/risk"))      return "Risk";
  if (pathname.includes("/goals"))     return "Goals";
  if (pathname.includes("/reports"))   return "Reports";
  if (pathname.includes("/projects"))  return "Projects";
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
    api.get("/api/director/decisions").then((r) => {
      setPendingCount(r.total ?? 0); // C-5: approvals + extension requests
    }).catch(() => {});
  }, []);

  const cfg = {
    role: "director", portal: "Director", portalSub: "Command Portal", storageKey: "achievion-director-rail",
    phoneDrawer: true, // UI-E1: under 640px the rail starts closed and the menu button opens it over the page
    nav: [
      { label: "Main", items: [
        { icon: LayoutDashboard, label: "Home",             to: "/director", end: true },
        { icon: FolderKanban,    label: "Projects",         to: "/director/projects" },
        { icon: Leaf,            label: "Progress Garden",  to: "/director/garden" },
        { icon: Users,           label: "Team",             to: "/director/roles" },
      ] },
      { label: "Operations", items: [
        { icon: ClipboardCheck, label: "Approvals",  to: "/director/approvals", badge: pendingCount },
        { icon: CalendarRange,  label: "Extensions", to: "/director/extensions" },
        ...(DF.voice ? [{ icon: Inbox, label: "Feedback", to: "/director/voice" }] : []),
        { icon: Megaphone,      label: "Announcements", to: "/director/announcements" }, // item 80
        { icon: MessageSquare,  label: "Chat",       to: "/director/chat" },
        ...(DF.risks ? [{ icon: ShieldAlert, label: "Risks", to: "/director/risks" }] : []),
        ...(DF.goals ? [{ icon: Target, label: "Goals", to: "/director/goals" }] : []),
        { icon: Heart,      label: "Org Health", to: "/director/org-health" },
        { icon: Cpu,        label: "Capacity",   to: "/director/capacity" },
        { icon: Award,      label: "Success Metrics", to: "/director/success-criteria" },
        { icon: BarChart3,  label: "Reports",    to: "/director/reports" },
        { icon: ScrollText, label: "Audit Log",  to: "/director/audit-log" },
        { icon: ShieldAlert, label: "Anomalies", to: "/director/anomalies" }, // Batch 5 (D9)
      ] },
      { label: "Config", items: [
        { icon: SlidersHorizontal, label: "Workspace", to: "/director/workspace-settings" },
      ] },
    ],
    menu: [
      // UI-E1b (item 47, FLG-10): Profile and My settings are one page; the org-level Settings says so.
      { icon: User,     label: "Account settings",      to: "/director/account-settings" },
      { icon: Bell,     label: "All notifications",     to: "/director/notifications" },
      { icon: Trophy,   label: "Leaderboard",           to: "/director/leaderboard" },
      { icon: Settings, label: "Organization settings", to: "/director/settings" },
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
