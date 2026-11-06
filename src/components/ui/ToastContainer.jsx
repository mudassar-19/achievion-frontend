import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Info, Zap, Trophy } from "lucide-react";
import useUiStore from "@/stores/uiStore";
import Tally from "./Tally";
import CelebrationOverlay from "./CelebrationOverlay";

const TYPE_CONFIG = {
  success:     { Icon: CheckCircle2, color: "#0E6A30", borderCls: "border-[#12803B]/30", bgCls: "bg-[#12803B]/10" },
  error:       { Icon: XCircle,      color: "#B01F17", borderCls: "border-[#D1291F]/30", bgCls: "bg-[#D1291F]/10" },
  info:        { Icon: Info,         color: "var(--accent-text)", borderCls: "border-accent/30", bgCls: "bg-accent/10" },
  xp:          { Icon: Zap,          color: "#7A5200", borderCls: "border-[#8A6200]/30", bgCls: "bg-[#FFC21A]/10" },
  achievement: { Icon: Trophy,       color: "#1948BD", borderCls: "border-[#2A62EC]/30", bgCls: "bg-[#2A62EC]/10" },
};

function Toast({ id, type = "info", message, duration = 4000, undoAction, undoLabel = "Undo" }) {
  const removeToast = useUiStore((s) => s.removeToast);
  const { Icon, color, borderCls, bgCls } = TYPE_CONFIG[type] ?? TYPE_CONFIG.info;
  const celebrations = useUiStore((s) => s.celebrations);
  const mascot = celebrations !== "off" && (type === "xp" || type === "achievement");

  // When undoAction is provided, the timer is 10s (per D-041 reversible action spec)
  const actualDuration = undoAction ? 10000 : duration;

  useEffect(() => {
    const t = setTimeout(() => removeToast(id), actualDuration);
    return () => clearTimeout(t);
  }, [id, actualDuration, removeToast]);

  function handleUndo(e) {
    e.stopPropagation();
    undoAction?.();
    removeToast(id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.94 }}
      animate={{ opacity: 1, x: 0,  scale: 1    }}
      exit={{    opacity: 0, x: 60, scale: 0.94 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={[
        "flex items-start gap-3 px-4 py-3.5 rounded-xl",
        "backdrop-blur-sm min-w-[280px] max-w-[360px]",
        "border shadow-[0_8px_32px_rgba(0,0,0,0.55)]",
        bgCls, borderCls,
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => removeToast(id)}
        className="flex items-start gap-3 flex-1 text-left"
        aria-label="Dismiss notification"
      >
        {mascot
          ? <Tally pose={type === "achievement" ? "celebrate" : "cheer"} size={44} className="-my-1 -ml-1" />
          : <Icon size={16} strokeWidth={2} style={{ color }} className="shrink-0 mt-px" />}
        <p className="text-sm font-semibold text-text-primary leading-snug">{message}</p>
      </button>
      {undoAction && (
        <button
          type="button"
          onClick={handleUndo}
          className="shrink-0 self-center text-xs font-bold underline underline-offset-2 text-slate-600 hover:text-text-primary transition-colors"
        >
          {undoLabel}
        </button>
      )}
    </motion.div>
  );
}

export default function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);

  return (
    <div role="status" aria-live="polite" className="fixed bottom-12 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} />
          </div>
        ))}
      </AnimatePresence>
      <CelebrationOverlay />
    </div>
  );
}
