import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Tally from "./Tally";
import useUiStore from "@/stores/uiStore";

// Level-up moment (tier L3). Opens only when celebrations = "full"; Esc, the button or a
// click outside closes it, and focus returns to where it was.
export default function CelebrationOverlay() {
  const celebration = useUiStore((s) => s.celebration);
  const clear       = useUiStore((s) => s.clearCelebration);
  const btnRef      = useRef(null);

  useEffect(() => {
    if (!celebration) return undefined;
    const prev = document.activeElement;
    btnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") clear();
      if (e.key === "Tab") { e.preventDefault(); btnRef.current?.focus(); } // single control: keep focus inside
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [celebration, clear]);

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          key="celebration"
          className="pointer-events-auto fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ background: "rgba(20,32,61,0.55)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={clear}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="celebration-title"
            className="relative w-full max-w-sm rounded-[20px] bg-bg-surface px-4 sm:px-8 py-8 text-center"
            style={{ boxShadow: "var(--shadow-3)", border: "2px solid var(--gold-edge)" }}
            initial={{ opacity: 0, scale: 0.92, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex justify-center"><Tally pose="celebrate" size={140} /></div>
            <p className="mt-2 text-sm font-bold uppercase tracking-wider text-gold-text">Level up</p>
            <h2 id="celebration-title" className="font-num text-6xl font-bold leading-none text-text-primary mt-1">
              Level {celebration.level}
            </h2>
            <p className="mt-3 text-base text-text-secondary">
              You reached level {celebration.level}. Nice work, keep going!
            </p>
            <button
              ref={btnRef}
              type="button"
              onClick={clear}
              className="mt-6 inline-flex h-11 min-w-[8rem] items-center justify-center rounded-xl bg-accent px-6 text-base font-bold text-accent-on"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
