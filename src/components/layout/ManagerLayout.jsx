// Manager portal = PortalShell (same shell as the Director, blue accent via [data-role=manager]).
// Nav = M-1 groups (UX §1). AI slot = ManagerAiPanel (M-7): Ctrl/⌘+J toggles, Esc closes.
import { useEffect } from "react";
import useAuthStore from "@/stores/authStore";
import useNotificationStore, { notifRedirectPath } from "@/stores/notificationStore";
import PortalShell, { D_TOPBAR_H } from "./PortalShell";
import ManagerAiPanel from "./ManagerAiPanel";
import { ViewAsMenu } from "./ViewAs";
import { LayoutDashboard, Inbox, FolderKanban, Timer, Target, ShieldAlert, Users, Trophy, MessageSquare, Settings, User, SlidersHorizontal, BarChart3, Megaphone } from "lucide-react";

const NAV = [
  { label: "Home", items: [
    { icon: LayoutDashboard, label: "Dashboard", to: "/manager", end: true },
    { icon: Inbox,           label: "Inbox",     to: "/manager/inbox" },
  ] },
  { label: "Plan",            items: [
    { icon: FolderKanban,  label: "Projects",      to: "/manager/projects" },
    { icon: Timer,         label: "Sprints",       to: "/manager/sprints" },
  ] },
  { label: "People",          items: [{ icon: Users,         label: "Resources",     to: "/manager/resources" }] },
  { label: "Team Motivation", items: [
    { icon: Target,        label: "Challenges",    to: "/manager/challenges" },
    { icon: ShieldAlert,   label: "Anomalies",     to: "/manager/anomalies" },
    { icon: Trophy,        label: "Leaderboard",   to: "/manager/leaderboard" },
  ] },
  { label: "Insights",        items: [{ icon: BarChart3,     label: "Reports",       to: "/manager/reports" }] },
  { label: "Talk",            items: [
    { icon: MessageSquare, label: "Collaboration", to: "/manager/chat" },
    { icon: Megaphone,     label: "Announcements", to: "/manager/announcements" },
  ] },
];

const CFG = {
  role: "manager", portal: "Manager", portalSub: "Manager Portal", storageKey: "achievion-manager-rail",
  nav: NAV,
  bottomNav: [{ icon: Settings, label: "Settings", to: "/manager/settings" }],
  menu: [
    { icon: User,              label: "Profile",     to: "/manager/profile" },
    { icon: SlidersHorizontal, label: "Preferences", to: "/manager/settings" },
  ],
  notificationsPath: "/manager/notifications",
  topbarExtra: <ViewAsMenu />,
  notifLabel: (n) => n.title || n.type,
  notifTarget: (n) => {
    const to = notifRedirectPath(n, "Manager");
    return to && to !== "/manager/notifications" ? { to, label: "Open →" } : null;
  },
};

export default function ManagerLayout() {
  const orgName = useAuthStore((s) => s.user?.orgName);
  const viewing = useAuthStore((s) => !!s.viewAs); // a Director viewing as this Manager: no AI (read-only, D-109)
  const { fetch, initSocket, destroySocket } = useNotificationStore.getState();
  // The notification store feeds the Notifications page; its list changing (socket push, mark read) refreshes the bell.
  const storeList = useNotificationStore((s) => s.notifications);

  useEffect(() => {
    fetch();
    initSocket();
    return () => destroySocket();
  }, [fetch, initSocket, destroySocket]);

  return (
    <PortalShell cfg={orgName ? { ...CFG, label: orgName } : CFG} notifSignal={storeList}
      aiPanel={viewing ? undefined : ({ open, onClose }) => <ManagerAiPanel open={open} onClose={onClose} topOffset={D_TOPBAR_H} />} />
  );
}
