import { useCallback, useEffect } from "react";
import { Outlet }     from "react-router-dom";
import Topbar         from "./Topbar";
import { NavScrim } from "./ShellNav";
import Sidebar        from "./Sidebar";
import BottomTicker   from "./BottomTicker";
import ToastContainer from "@/components/ui/ToastContainer";
import useTaskStore             from "@/stores/taskStore";
import useGamificationSocket   from "@/hooks/useGamificationSocket";
import useGamificationStore    from "@/stores/gamificationStore";
import useNotificationStore    from "@/stores/notificationStore";

// Shell constants — keep in sync with Sidebar.jsx / Topbar.jsx / BottomTicker.jsx
export const TOPBAR_H  = 60;  // px
export const SIDEBAR_W = 240; // px  (w-60)
export const TICKER_H  = 36;  // px  (h-9)

export default function WorkspaceLayout() {
  const fetchProfile = useGamificationStore((s) => s.fetchProfile);
  const fetchNotifs  = useNotificationStore((s) => s.fetch);
  const initSocket   = useNotificationStore((s) => s.initSocket);
  const destroySocket= useNotificationStore((s) => s.destroySocket);

  useEffect(() => {
    fetchProfile();
    fetchNotifs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initSocket();
    return () => destroySocket();
  }, [initSocket, destroySocket]);

  // Refresh profile (XP bar, level) and the task list when a reward arrives (FE-R011).
  const refresh = useCallback(() => {
    fetchProfile();
    useTaskStore.getState().fetchTasks();
  }, [fetchProfile]);
  useGamificationSocket({ onRefresh: refresh });

  return (
    <div className="bg-bg-base font-sans text-text-primary antialiased">
      {/* ── Fixed top bar ── */}
      <Topbar />

      {/* ── Fixed left sidebar ── */}
      <Sidebar />

      {/* ── Scrollable main area ── */}
      <main
        id="main"
        className="shell-main fixed overflow-y-auto"
        style={{
          top:    TOPBAR_H,
          left:   SIDEBAR_W,
          right:  0,
          bottom: TICKER_H,
        }}
      >
        <Outlet />
      </main>

      {/* ── Fixed bottom ticker ── */}
      <NavScrim />
      <BottomTicker />

      <ToastContainer />
    </div>
  );
}
