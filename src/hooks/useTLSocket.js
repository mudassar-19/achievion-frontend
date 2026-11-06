/**
 * useTLSocket — Phase 4 real-time hook for the Team Lead portal.
 *
 * Usage:
 *   useTLSocket({
 *     "task:status_changed": (data) => refetchTasks(),
 *     onRefresh: () => refetchAll(),   // fires on any task/sprint/milestone event
 *   });
 */
import { useEffect, useRef } from "react";
import socket               from "@/utils/socket";
import useAuthStore         from "@/stores/authStore";

// Events that the Team Lead portal cares about
// FE-040: only events the server really emits. Task changes arrive as "task:status_changed"
// (org room); assignment / review requests arrive as "notification:new".
const TL_EVENTS = [
  "task:status_changed",
  "sprint:created",
  "sprint:updated",
  "xp:awarded",
  "notification:new",
  "approval:resolved",
];

// Events that should trigger a generic "refresh" callback
const REFRESH_EVENTS = new Set([
  "task:status_changed",
  "sprint:created",
  "sprint:updated",
  "notification:new",
]);

export default function useTLSocket(handlers = {}) {
  const user    = useAuthStore((s) => s.user);
  // Keep stable ref so we don't re-subscribe on every render
  const handlersRef = useRef(handlers);
  useEffect(() => { handlersRef.current = handlers; }); // keep the latest handlers without re-subscribing

  useEffect(() => {
    if (!user) return;

    function makeListener(event) {
      return (data) => {
        // Specific handler
        const specific = handlersRef.current[event];
        if (typeof specific === "function") specific(data);

        // Generic refresh handler
        if (REFRESH_EVENTS.has(event)) {
          const refresh = handlersRef.current.onRefresh;
          if (typeof refresh === "function") refresh(data);
        }
      };
    }

    const listeners = {};
    for (const event of TL_EVENTS) {
      listeners[event] = makeListener(event);
      socket.on(event, listeners[event]);
    }

    return () => {
      for (const event of TL_EVENTS) {
        socket.off(event, listeners[event]);
      }
    };
  }, [user]); // re-subscribe only when the user object changes
}
