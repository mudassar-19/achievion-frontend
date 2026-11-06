import { useNavigate } from "react-router-dom";
import PortalNav from "./PortalNav";
import {
  LayoutDashboard, CheckSquare, FolderKanban,
  User, Bell, Settings, LogOut,
  Trophy, Award, UserCircle2, Sparkles,
  Kanban,
  FileText, MessageSquare,
} from "lucide-react";
import { TOPBAR_H, TICKER_H } from "./WorkspaceLayout";
import useAuthStore from "@/stores/authStore";
import useUiStore from "@/stores/uiStore";
import { useRoleTheme, dashboardPathForRole } from "@/utils/roleTheme";

// ── Sidebar ────────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const user     = useAuthStore((s) => s.user);
  const logout   = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const theme    = useRoleTheme();
  const navOpen  = useUiStore((s) => s.navOpen);

  const role       = user?.role ?? "";
  const isTeamLead = role === "Team Lead";
  const dashPath   = dashboardPathForRole(role);
  // Every employee role (Developer/Designer/Tester, any tier) has submissions (shared-fixes item 8).
  const isEmployee = ["developer", "designer", "tester"].includes(user?.roleCategory);
  const hasWork    = isTeamLead || isEmployee;

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      data-open={navOpen}
      className="shell-aside fixed left-0 w-60 bg-bg-surface border-r border-ink/5 flex flex-col z-40"
      style={{ top: TOPBAR_H, bottom: TICKER_H }}
    >
      {/* ── Branding ── */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-ink/5 shrink-0">
        <div className="min-w-0">
          {user?.orgName ? (
            <>
              <span
                className="block text-base font-black leading-tight truncate"
                style={{
                  background:           `linear-gradient(90deg, ${theme.accent}, var(--accent))`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor:  "transparent",
                  backgroundClip:       "text",
                }}
              >
                {user.orgName}
              </span>
              <span className="block text-[14px] font-medium text-slate-600 mt-0.5 tracking-wide">
                powered by Achievion
              </span>
            </>
          ) : (
            <>
              <span
                className="block text-base font-black tracking-[0.08em] uppercase"
                style={{
                  background:           `linear-gradient(90deg, ${theme.accent}, var(--accent))`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor:  "transparent",
                  backgroundClip:       "text",
                  letterSpacing:        "0.06em",
                }}
              >
                ACHIEVION
              </span>
              <span
                className="block text-[14px] font-bold uppercase tracking-widest mt-px"
                style={{ color: theme.text }}
              >
                {role || "Workspace"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <PortalNav theme={theme} label="Primary navigation" groups={[
        { label: "Main", items: [
          { icon: LayoutDashboard, label: "Dashboard", to: dashPath, end: true },
          { icon: CheckSquare, label: "My Tasks",       to: "/workspace/tasks" },
          ...(isTeamLead ? [{ icon: FolderKanban, label: "Projects", to: "/workspace/projects" }] : []),
        ] },
        { label: "Work", items: !hasWork ? [] : [
          ...(isTeamLead ? [{ icon: Kanban, label: "Project Board", to: "/workspace/board" }] : []),
          ...(isEmployee ? [{ icon: FileText, label: "My Submissions", to: "/workspace/submissions" }] : []),
        ] },
        { label: "Gamification", items: [
          { icon: Trophy,      label: "Leaderboard", to: "/workspace/leaderboard" },
          { icon: Award,       label: "Badges",      to: "/workspace/badges" },
          { icon: UserCircle2, label: "Avatar",      to: "/workspace/avatar" },
          { icon: Sparkles,    label: "Titles",      to: "/workspace/titles" },
        ] },
        { label: "Collaborate", items: [
          { icon: MessageSquare, label: "Collaboration", to: "/workspace/chat" },
        ] },
        { label: "Account", items: [
          { icon: User,     label: "Profile",       to: "/workspace/profile" },
          { icon: Bell,     label: "Notifications", to: "/workspace/notifications" },
          { icon: Settings, label: "Settings",      to: "/workspace/settings" },
        ] },
      ]} />

      {/* ── Sign out ── */}
      <div className="border-t border-ink/5 py-2 shrink-0">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 mx-2 px-[14px] py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-[#B01F17] hover:bg-[#D1291F]/[0.08] transition-all duration-150"
        >
          <LogOut size={17} strokeWidth={1.75} className="shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
