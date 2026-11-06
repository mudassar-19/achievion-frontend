import { useCallback, useRef } from "react";
import api from "@/lib/api";

const ALLOWED = new Set(["login","dashboard_load","create_task","move_task","submit_task","open_portfolio"]);

export default function usePerfLog() {
  const pending = useRef(null);

  const start = useCallback((action) => {
    if (!ALLOWED.has(action)) return;
    pending.current = { action, t0: performance.now() };
  }, []);

  const end = useCallback((action, page) => {
    const entry = pending.current;
    if (!entry || entry.action !== action) return;
    const durationMs = Math.round(performance.now() - entry.t0);
    pending.current = null;
    api.post("/api/perf/log", { action, durationMs, page }).catch(() => {});
  }, []);

  const log = useCallback((action, durationMs, page) => {
    if (!ALLOWED.has(action)) return;
    api.post("/api/perf/log", { action, durationMs: Math.round(durationMs), page }).catch(() => {});
  }, []);

  return { start, end, log };
}
