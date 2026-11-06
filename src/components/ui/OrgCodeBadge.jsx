import { useState } from "react";
import { Copy, Check } from "lucide-react";
import useAuthStore from "@/stores/authStore";

/**
 * Displays the organisation code (e.g. TECHCO-4821) with a click-to-copy button.
 * Reads orgCode directly from the auth store so no props are needed.
 */
export default function OrgCodeBadge({ className = "" }) {
  const orgCode = useAuthStore((s) => s.user?.orgCode);
  const [copied, setCopied] = useState(false);

  if (!orgCode) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(orgCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Click to copy org code"}
      className={[
        "group flex items-center gap-1.5 rounded-lg border border-ink/10 bg-ink/5",
        "px-2.5 py-1 transition-colors hover:border-ink/20 hover:bg-ink/10",
        className,
      ].join(" ")}
    >
      <span className="text-[14px] font-medium text-text-secondary uppercase tracking-wide">
        Org Code:
      </span>
      <span className="font-mono text-xs font-bold text-text-primary tracking-widest">
        {orgCode}
      </span>
      {copied ? (
        <Check size={11} className="text-green-400 shrink-0" />
      ) : (
        <Copy size={11} className="text-text-disabled shrink-0 group-hover:text-text-secondary transition-colors" />
      )}
    </button>
  );
}
