import { useEffect, useRef, useCallback } from "react";

const TIMEOUT_MS  = Number(import.meta.env.VITE_IDLE_TIMEOUT_MS  ?? 1_800_000); // 30 min
const WARN_MS     = Number(import.meta.env.VITE_IDLE_WARN_BEFORE_MS ?? 120_000);  // 2 min before

const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

export function useIdleTimeout({ isActive, onWarn, onLogout }) {
  const warnRef    = useRef(null);
  const logoutRef  = useRef(null);
  const warned     = useRef(false);

  const reset = useCallback(() => {
    clearTimeout(warnRef.current);
    clearTimeout(logoutRef.current);
    if (!isActive) return;
    warned.current = false;
    onWarn(false);
    warnRef.current   = setTimeout(() => { warned.current = true; onWarn(true);  }, TIMEOUT_MS - WARN_MS);
    logoutRef.current = setTimeout(() => { onLogout(); },                           TIMEOUT_MS);
  }, [isActive, onWarn, onLogout]);

  useEffect(() => {
    if (!isActive) return;
    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(warnRef.current);
      clearTimeout(logoutRef.current);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [isActive, reset]);
}
