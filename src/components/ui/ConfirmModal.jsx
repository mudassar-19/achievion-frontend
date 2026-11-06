import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  destructive  = false,
  loading      = false,
  children,          // optional extra content (e.g. a choice) under the body
  layer = "z-50",    // "z-[70]" when opened from inside a Drawer (z-60)
}) {
  useEffect(() => {
    if (!open) return;
    // Stacked over a Drawer: take Escape first so only this dialog closes.
    const stacked = layer !== "z-50";
    const onKey = (e) => { if (e.key === "Escape") { if (stacked) e.stopImmediatePropagation(); onClose(); } };
    document.addEventListener("keydown", onKey, stacked);
    return () => document.removeEventListener("keydown", onKey, stacked);
  }, [open, onClose, layer]);

  return (
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 ${layer} flex items-center justify-center p-4`}>
          <motion.div
            className="absolute inset-0 bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-no-modal
          />
          <motion.div
            className="relative w-full max-w-[520px] rounded-2xl bg-bg-surface"
            style={{ border: "1px solid var(--border-subtle)", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
            initial={{ scale: 0.94, opacity: 0, y: 8 }}
            animate={{ scale: 1,    opacity: 1, y: 0 }}
            exit={{    scale: 0.94, opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="p-6">
              {destructive && (
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#D1291F]/10 border border-[#D1291F]/25">
                  <AlertTriangle size={18} className="text-[#B01F17]" strokeWidth={2} />
                </div>
              )}
              <h2 className="text-base font-bold text-text-primary">{title}</h2>
              {body && (
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{body}</p>
              )}
              {children && <div className="mt-4">{children}</div>}
            </div>
            <div className="flex items-center justify-end gap-2.5 px-6 pb-5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="h-9 rounded-xl border border-border-subtle px-5 text-sm font-bold text-text-primary hover:bg-bg-muted transition-colors disabled:opacity-40"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="h-9 rounded-xl px-5 text-sm font-bold text-white transition-all disabled:opacity-40"
                style={destructive
                  ? { background: "#D1291F" }
                  : { background: "var(--accent)" }
                }
              >
                {loading ? "…" : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
