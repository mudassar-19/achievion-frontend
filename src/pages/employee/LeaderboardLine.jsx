// One line of AI commentary on the leaderboard (Batch 4, N11; UC-13 step 4). Developers, Designers and Testers only:
// it talks about the reader's own place. The ranking never waits for it and looks the same when the AI is off.
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { aiGet } from "./employeeAi";
import useAuthStore from "@/stores/authStore";
import { employeeKind } from "@/utils/employeePortal";
import { AiTag } from "@/components/ui/AiParts";

export default function LeaderboardLine({ query }) {
  const show = useAuthStore((s) => !!employeeKind(s.user?.role) && !s.viewAs);
  const [state, setState] = useState(null); // null = loading
  useEffect(() => {
    if (!show) return undefined;
    let live = true;
    setState(null); // eslint-disable-line react-hooks/set-state-in-effect
    aiGet(`/api/workspace/ai/leaderboard-line?${query}`)
      .then((d) => live && setState(d))
      .catch((e) => live && setState({ line: e?.data?.code === "ai_off" ? "AI commentary is off because AI is not configured. The ranking below is complete without it." : "AI commentary is not available right now. The ranking below is complete without it.", aiGenerated: false }));
    return () => { live = false; };
  }, [show, query]);
  if (!show) return null;
  return (
    <p role="status" data-leaderboard-line className="flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-2xl border border-ink/[0.07] bg-bg-surface px-4 py-2.5 text-sm text-text-primary">
      <Sparkles size={14} aria-hidden="true" className="shrink-0 text-accent-text" />
      {state ? <><span className="min-w-0 flex-1 basis-56 [overflow-wrap:anywhere]">{state.line}</span>{state.aiGenerated && <AiTag />}</> : <span className="text-text-secondary">Reading the ranking…</span>}
    </p>
  );
}
