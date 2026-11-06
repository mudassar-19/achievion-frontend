import { useEffect } from "react";
import socket from "@/utils/socket";
import useUiStore from "@/stores/uiStore";

// Reward events from the server → toasts, level-up moment, optional data refresh.
// FE-043 (unlock / penalty feedback), FE-R011 (dashboard stayed stale after approval),
// FE-038 (named handlers, so cleanup never removes another component's listener).
export default function useGamificationSocket({ onRefresh } = {}) {
  const addToast = useUiStore((s) => s.addToast);

  useEffect(() => {
    const onXp = (data) => {
      addToast({
        type:    "xp",
        message: `+${data.xpValue} XP${data.goldValue ? `  ·  +${data.goldValue} Gold` : ""}`,
      });
      if (data.levelUp) {
        useUiStore.getState().celebrate({ kind: "level", level: data.newLevel });
        addToast({ type: "achievement", message: `Level Up!  You reached Level ${data.newLevel}`, duration: 6000 });
      }
      onRefresh?.();
    };
    const onBadge = (data) => {
      addToast({ type: "achievement", message: `Badge unlocked: ${data?.badge?.name ?? "new badge"}`, duration: 6000 });
      onRefresh?.();
    };
    const onTitle = (data) => {
      addToast({ type: "achievement", message: `Title unlocked: ${data?.title?.name ?? "new title"}`, duration: 6000 });
    };
    const onPenalty = (data) => {
      addToast({ type: "error", message: `${data?.reason ?? "Penalty"}: ${data?.amount ?? 0} XP${data?.hpLost ? `, -${data.hpLost} HP` : ""}`, duration: 6000 });
      onRefresh?.();
    };

    const onTask = () => onRefresh?.();   // someone moved / approved / rejected a task
    socket.on("task:status_changed", onTask);
    socket.on("xp:awarded", onXp);
    socket.on("badge:unlocked", onBadge);
    socket.on("title:unlocked", onTitle);
    socket.on("xp:penalty", onPenalty);
    return () => {
      socket.off("task:status_changed", onTask);
      socket.off("xp:awarded", onXp);
      socket.off("badge:unlocked", onBadge);
      socket.off("title:unlocked", onTitle);
      socket.off("xp:penalty", onPenalty);
    };
  }, [addToast, onRefresh]);
}
