// Manager AI call hook + error mapping (M-7). Components live in AiParts.jsx.
import { useCallback, useRef, useState } from "react";
import api from "@/lib/api";
import useAuthStore from "@/stores/authStore";

const time = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Server codes: ai_off (503), limit (429, with usage), busy (503), invalid (502). Everything else = plain error.
export function aiError(err) {
  const code = err?.data?.code;
  if (code === "ai_off") return { status: "off", message: "AI is not configured. Everything else works as usual." };
  if (code === "limit") return { status: "limit", usage: err.data.usage, message: `You have used today's ${err.data.usage?.limit ?? ""} AI requests. They reset at ${time(err.data.usage?.resetsAt ?? Date.now())}.` };
  if (err?.status === 404 || err?.status === 409 || err?.status === 400) return { status: "blocked", message: err.message };
  return { status: "error", message: code === "invalid" ? "The AI answer was not usable. Try again." : "AI is unavailable right now. Try again." };
}

// run(method, path, body) → sets { status: loading | done | off | limit | error | blocked, data, message }.
export function useAiCall() {
  const [state, setState] = useState({ status: "idle" });
  const last = useRef(null);
  const run = useCallback(async (method, path, body) => {
    last.current = [method, path, body];
    if (useAuthStore.getState().viewAs) { setState({ status: "off", message: "AI is off while viewing as someone." }); return null; } // D-109
    setState({ status: "loading" });
    try {
      const data = method === "get" ? await api.get(path, { silent: true }) : await api.post(path, body ?? {}, { silent: true });
      setState({ status: "done", data });
      return data;
    } catch (e) { setState(aiError(e)); return null; }
  }, []);
  const retry = useCallback(() => last.current && run(...last.current), [run]);
  // T-6: ask if AI is on first, so a click with AI off shows the message without a failing request.
  const runIfOn = useCallback(async (statusPath, method, path, body) => {
    const st = await api.get(statusPath, { silent: true }).catch(() => null);
    if (st && !st.configured) { setState({ status: "off", message: "AI is not configured. Everything else works as usual." }); return null; }
    return run(method, path, body);
  }, [run]);
  return { ...state, run, runIfOn, retry, reset: () => setState({ status: "idle" }) };
}

