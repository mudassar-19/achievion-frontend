// Developer, Designer and Tester portal = PortalShell (E-1, Employee UX §3): same shell as the Director, Manager and
// Team Lead; accent from [data-role=developer|designer|tester] tokens. Unlike the leads, employees keep the
// gamification bar (level, XP, gold, streak, HP) in the top bar. The AI assistant is a page in the nav (Batch 4).
// The old WorkspaceLayout is no longer used by employees (still used by the Manager's old /workspace board and gantt).
import { useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sun, ListChecks, FileCheck2, Swords, Trophy, Award, ShoppingBag, Package, MessageSquare, Megaphone,
  ClipboardCheck, Bug, ListTodo, Settings, Sparkles, User, SlidersHorizontal, Coins, Flame, Heart,
} from "lucide-react";
import useAuthStore from "@/stores/authStore";
import useNotificationStore, { notifRedirectPath } from "@/stores/notificationStore";
import useGamificationStore from "@/stores/gamificationStore";
import useGamificationSocket from "@/hooks/useGamificationSocket";
import useTaskStore from "@/stores/taskStore";
import { dashboardPathForRole } from "@/utils/roleTheme";
import { hpColor } from "@/utils/hpTier";
import { employeeKind, employeeNav, ROLE_WORDS } from "@/utils/employeePortal";
import PortalShell from "./PortalShell";

const ICONS = {
  today: Sun, tasks: ListChecks, submissions: FileCheck2, qa: ClipboardCheck, bugs: Bug, testcases: ListTodo,
  quests: Swords, leaderboard: Trophy, achievements: Award, shop: ShoppingBag, inventory: Package, chat: MessageSquare, announcements: Megaphone, ai: Sparkles,
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const num = (v) => (Number(v) || 0).toLocaleString();

// Top-bar gamification bar: one link to the profile. Phone: level only; ≥640px adds gold, streak, HP; ≥1024px the XP bar.
function GameBar() {
  const { level = 1, currentXp = 0, maxXp = 100, gold = 0, hp = 0, streak = 0 } = useGamificationStore((s) => s.currentUser) ?? {};
  const isViewAs = useAuthStore((s) => !!s.viewAs);
  const pct = Math.min(100, Math.max(0, (currentXp / (maxXp || 1)) * 100));
  return (
    <Link
      to="/workspace/profile"
      aria-label={`Level ${level}, ${num(currentXp)} of ${num(maxXp)} XP, ${num(gold)} gold, ${num(streak)} day streak${isViewAs ? "" : `, ${num(hp)} HP`}. Open your profile`}
      className="mr-1 flex h-9 shrink-0 items-center gap-3 rounded-xl px-2 text-text-primary transition-colors hover:bg-[var(--nav-bg-hover)]"
    >
      <span className="flex items-center gap-2.5">
        <span aria-hidden="true" className="rounded-lg bg-accent/10 px-1.5 py-1 text-[11px] font-black leading-none tabular-nums text-accent-text">Lv {level}</span>
        <span aria-hidden="true" className="hidden w-28 flex-col gap-1 lg:flex">
          <span className="block h-1.5 overflow-hidden rounded-full bg-ink/[0.08]">
            <span className="block h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct}%`, background: "var(--xp-fill)" }} />
          </span>
          <span className="text-[11px] font-semibold leading-none tabular-nums text-text-secondary">{num(currentXp)} / {num(maxXp)} XP</span>
        </span>
      </span>
      <span aria-hidden="true" className="hidden items-center gap-3 border-l border-ink/[0.08] pl-3 text-xs font-bold tabular-nums sm:flex">
        <span className="flex items-center gap-1" title="Gold"><Coins size={13} strokeWidth={2.2} color="#7A5200" />{num(gold)}</span>
        <span className="flex items-center gap-1" title="Day streak"><Flame size={13} strokeWidth={2.2} color="#B4410C" />{num(streak)}</span>
        <span className="flex items-center gap-1" title="Health points"><Heart size={13} strokeWidth={2.2} color={hpColor(hp ?? 0)} />{isViewAs ? "—" : num(hp)}</span>
      </span>
    </Link>
  );
}

const RAIL_KEY = "achievion-employee-rail";
// Phones and small tablets start with the 64px rail (PortalShell pins it open when nothing is stored).
try { if (window.innerWidth < 1024 && localStorage.getItem(RAIL_KEY) === null) localStorage.setItem(RAIL_KEY, "0"); } catch { /* storage blocked */ }

export default function EmployeeShell() {
  const user = useAuthStore((s) => s.user);
  const kind = employeeKind(user?.role) ?? "developer";
  const { fetch, initSocket, destroySocket } = useNotificationStore.getState();
  const storeList = useNotificationStore((s) => s.notifications);
  const fetchProfile = useGamificationStore((s) => s.fetchProfile);

  useEffect(() => {
    fetch();
    fetchProfile();
    initSocket();
    return () => destroySocket();
  }, [fetch, fetchProfile, initSocket, destroySocket]);

  // A reward refreshes the bar and the task list (FE-R011, same as the old layout).
  const refresh = useCallback(() => { fetchProfile(); useTaskStore.getState().fetchTasks(); }, [fetchProfile]);
  useGamificationSocket({ onRefresh: refresh });

  const cfg = {
    role: kind, portal: user?.roleLabel ?? user?.role ?? cap(kind), portalSub: ROLE_WORDS[kind].map(cap).join(" · "),
    storageKey: RAIL_KEY, label: user?.orgName, phoneDrawer: true,
    nav: employeeNav(kind, dashboardPathForRole(user?.role)).map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, icon: ICONS[i.icon] })) })),
    bottomNav: [{ icon: Settings, label: "Settings", to: "/workspace/settings" }],
    menu: [
      { icon: User,              label: "Profile",     to: "/workspace/profile" },
      { icon: SlidersHorizontal, label: "Preferences", to: "/workspace/settings" },
    ],
    notificationsPath: "/workspace/notifications",
    notifLabel: (n) => n.title || n.type,
    notifTarget: (n) => {
      const to = notifRedirectPath(n, user?.role);
      return to && to !== "/workspace/notifications" ? { to, label: "Open →" } : null;
    },
    topbarExtra: <GameBar />,
  };
  return <PortalShell cfg={cfg} notifSignal={storeList} />;
}
