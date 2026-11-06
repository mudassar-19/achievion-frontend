// Team Lead portal = PortalShell (V2 Phase 4 · T-1, D-113): same shell as the Director and the Manager, teal
// accent through [data-role=lead]. Nav = UX TL §1 (T-5). No XP bar; the TL's own level/XP is on My stats.
// The old TeamLeadLayout file is kept but no longer routed.
import { useEffect } from "react";
import useAuthStore from "@/stores/authStore";
import useNotificationStore, { notifRedirectPath } from "@/stores/notificationStore";
import PortalShell, { D_TOPBAR_H } from "./PortalShell";
import ManagerAiPanel from "./ManagerAiPanel";
import { BarChart3, Zap, Megaphone, LayoutDashboard, Layers, ListChecks, ClipboardCheck, Users, Timer, Trophy, MessageSquare, Settings, User, SlidersHorizontal } from "lucide-react";

const NAV = [
  { label: "Home", items: [{ icon: LayoutDashboard, label: "Dashboard", to: "/teamlead", end: true }] },
  { label: "Work", items: [
    { icon: Layers,         label: "Modules", to: "/teamlead/modules" },
    { icon: ListChecks,     label: "Tasks",   to: "/teamlead/tasks" },
    { icon: ClipboardCheck, label: "Review",  to: "/teamlead/review-submissions" },
  ] },
  { label: "Plan",       items: [{ icon: Timer, label: "Sprints", to: "/teamlead/sprints" }] },
  { label: "Team",       items: [
    { icon: Users,     label: "Team",        to: "/teamlead/team" },
    { icon: BarChart3, label: "Performance", to: "/teamlead/performance" },
  ] },
  { label: "Motivation", items: [
    { icon: Trophy, label: "Leaderboard", to: "/teamlead/leaderboard" },
    { icon: Zap,    label: "My stats",    to: "/teamlead/my-stats" },
  ] },
  { label: "Talk",       items: [
    { icon: MessageSquare, label: "Collaboration", to: "/teamlead/chat" },
    { icon: Megaphone,     label: "Announcements", to: "/teamlead/announcements" },
  ] },
];

const CFG = {
  role: "lead", portal: "Team Lead", portalSub: "Team Lead Portal", storageKey: "achievion-teamlead-rail",
  nav: NAV,
  bottomNav: [{ icon: Settings, label: "Settings", to: "/teamlead/settings" }],
  menu: [
    { icon: User,              label: "Profile",     to: "/teamlead/profile" },
    { icon: SlidersHorizontal, label: "Preferences", to: "/teamlead/settings" },
  ],
  notificationsPath: "/teamlead/notifications",
  notifLabel: (n) => n.title || n.type,
  notifTarget: (n) => {
    const to = notifRedirectPath(n, "Team Lead");
    return to && to !== "/teamlead/notifications" ? { to, label: "Open →" } : null;
  },
};

export default function TeamLeadShell() {
  const orgName = useAuthStore((s) => s.user?.orgName);
  const viewing = useAuthStore((s) => !!s.viewAs); // viewing as this Team Lead: no AI (read-only, D-109)
  const { fetch, initSocket, destroySocket } = useNotificationStore.getState();
  const storeList = useNotificationStore((s) => s.notifications);
  useEffect(() => {
    fetch();
    initSocket();
    return () => destroySocket();
  }, [fetch, initSocket, destroySocket]);
  return <PortalShell cfg={orgName ? { ...CFG, label: orgName } : CFG} notifSignal={storeList}
    aiPanel={viewing ? undefined : ({ open, onClose }) => <ManagerAiPanel open={open} onClose={onClose} topOffset={D_TOPBAR_H} base="/api/teamlead" feature="tl_chat"
      welcome="I help you plan tasks. Ask about your modules, tasks, sprints and team. I only read the numbers and suggest; I can't change anything." placeholder="Ask about tasks, blockers, team load…" />} />;
}
