// "Online now" / "Last seen 3 hours ago" (Batch 5, X17). Renders nothing when the server sent no date field at all
// (employees never get one); a null date (never seen, or View as) reads "Not seen yet" / stays blank in View as.
import useAuthStore from "@/stores/authStore";
import { presenceOf } from "@/utils/presence";

export default function LastSeen({ at, className = "" }) {
  const viewAs = useAuthStore((s) => !!s.viewAs);
  if (at === undefined || viewAs) return null;
  const p = presenceOf(at);
  return (
    <span data-last-seen={p.state} className={`inline-flex items-center gap-1.5 text-xs text-text-secondary ${className}`} title={at ? new Date(at).toLocaleString() : undefined}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.state === "online" ? "bg-[#0E6A30]" : "bg-ink/25"}`} />{p.label}
    </span>
  );
}
