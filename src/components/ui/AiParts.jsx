// Shared bits for Manager AI suggestions (M-7, D-105..D-108): one call hook with the standard states,
// the inline state line (AI off / limit / error + Retry / loading), the "AI-generated" tag and thumbs.
// Numbers on the page never depend on these: when AI is off the page shows one inline line, never a blank.
import { useState } from "react";
import { Sparkles, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import api from "@/lib/api";

// One line for every non-result state. `idle` renders nothing.
export function AiStatus({ call, loadingText = "Asking the AI…" }) {
  if (call.status === "loading") return <p role="status" className={`flex items-center gap-2 text-xs text-text-secondary`}><RefreshCw size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />{loadingText}</p>;
  if (!["off", "limit", "error", "blocked"].includes(call.status)) return null;
  return (
    <p role={call.status === "error" ? "alert" : "status"} className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary`}>
      <Sparkles size={12} aria-hidden="true" className="shrink-0" />{call.message}
      {call.status === "error" && <button type="button" onClick={call.retry} className="min-h-8 rounded-lg px-2 font-bold text-accent-text underline underline-offset-2 hover:bg-ink/[0.04]">Retry</button>}
    </p>
  );
}

export function AiTag() {
  return <span className="inline-flex items-center gap-1 rounded-full bg-accent/[0.08] px-2 py-0.5 text-[11px] font-semibold text-accent-text"><Sparkles size={10} aria-hidden="true" />AI-generated</span>;
}

// Thumbs up / down → AIFeedback (one vote per answer; clicking again changes it).
export function AiFeedback({ feature, refId, snippet, base = "/api/manager" }) {
  const [rating, setRating] = useState(null);
  const [failed, setFailed] = useState(false);
  async function vote(r) {
    const before = rating;
    setRating(r); setFailed(false);
    try { await api.post(`${base}/ai/feedback`, { feature, refId, rating: r, snippet: String(snippet ?? "").slice(0, 500) }, { silent: true }); }
    catch { setRating(before); setFailed(true); }
  }
  if (!refId) return null;
  const btn = (r, Icon, label) => (
    <button type="button" aria-label={label} aria-pressed={rating === r} onClick={() => vote(r)}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-ink/[0.05] ${rating === r ? "text-accent-text" : "text-slate-500"}`}>
      <Icon size={13} aria-hidden="true" fill={rating === r ? "currentColor" : "none"} />
    </button>
  );
  return (
    <span className="inline-flex items-center">
      {btn("up", ThumbsUp, "Helpful")}{btn("down", ThumbsDown, "Not helpful")}
      {failed && <span role="alert" className="ml-1 text-[11px] text-[#B01F17]">Not saved</span>}
      {rating && !failed && <span className="sr-only" role="status">Thanks, feedback saved.</span>}
    </span>
  );
}
