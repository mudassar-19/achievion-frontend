import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Drawer({ open, onClose, title, children, footer, width = 480 }) {
  const panelRef    = useRef(null);
  const triggerRef  = useRef(null); // saves element that had focus before open

  // Save trigger, focus panel when opened
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      // Small delay so the panel has rendered
      const t = setTimeout(() => {
        const first = panelRef.current?.querySelector(FOCUSABLE);
        if (first) first.focus();
      }, 60);
      return () => clearTimeout(t);
    } else {
      // Return focus to trigger on close
      if (triggerRef.current && typeof triggerRef.current.focus === "function") {
        triggerRef.current.focus();
        triggerRef.current = null;
      }
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus trap — cycle within panel on Tab
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Tab" || !panelRef.current) return;
      const els = Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.closest("[aria-hidden=true]") && el.offsetParent !== null
      );
      if (!els.length) return;
      const first = els[0];
      const last  = els[els.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Scroll lock
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Portal: a transformed ancestor (page transitions) would otherwise trap `fixed` under the topbar.
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — z-[55] so it covers the topbar (z-50) */}
          <motion.div
            className="fixed inset-0 bg-ink/30 backdrop-blur-[2px]"
            style={{ zIndex: 55 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            data-no-modal
          />
          {/* Panel — z-[60] so it sits above topbar */}
          <motion.div
            ref={panelRef}
            className="fixed right-0 top-0 bottom-0 flex flex-col bg-bg-surface outline-none"
            style={{
              width,
              maxWidth: "100vw", // E-2: a 560px drawer still fits a phone; no change on wider screens
              zIndex: 60,
              borderLeft: "1px solid var(--border-subtle)",
              boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "Panel"}
          >
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <h2 title={typeof title === "string" ? title : undefined} className="min-w-0 truncate text-base font-bold text-text-primary">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-bg-muted hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" tabIndex={0}>{children}</div>
            {footer && (
              <div
                className="px-6 py-4 shrink-0 flex items-center justify-end gap-3"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
