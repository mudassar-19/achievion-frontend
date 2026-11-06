import { useEffect } from "react";

// FE-055 / FE-R013: the app has ~28 hand-written overlays (`fixed inset-0`) with no dialog
// semantics. Rather than touch each one, this watches for them and gives every overlay:
//   role="dialog" + aria-modal + a name, focus moved inside, Tab kept inside,
//   Esc closes it (clicks its Close/Cancel button, else its backdrop), focus restored, scroll locked.
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const isOverlay = (el) =>
  el.matches?.(".fixed.inset-0") &&
  !el.classList.contains("pointer-events-none") &&
  !el.classList.contains("shell-scrim") &&
  !el.querySelector('[role="dialog"],[aria-modal="true"]') &&
  !el.hasAttribute("data-no-modal");

const visibleFocusables = (root) =>
  [...root.querySelectorAll(FOCUSABLE)].filter((e) => e.offsetParent !== null || e === document.activeElement);

export default function ModalA11y() {
  useEffect(() => {
    const open = new Map(); // overlay -> element focused before it opened

    function adopt(el) {
      if (open.has(el)) return;
      open.set(el, document.activeElement);
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      const h = el.querySelector("h1,h2,h3,[data-modal-title]");
      if (h?.textContent) el.setAttribute("aria-label", h.textContent.trim().slice(0, 80));
      else el.setAttribute("aria-label", "Dialog");
      document.body.style.overflow = "hidden";
      // after the entrance animation has mounted the content
      setTimeout(() => {
        if (!el.isConnected || el.contains(document.activeElement)) return;
        (visibleFocusables(el)[0] ?? el).focus?.({ preventScroll: true });
      }, 50);
    }

    function release(el) {
      const prev = open.get(el);
      open.delete(el);
      if (!open.size) document.body.style.overflow = "";
      prev?.focus?.({ preventScroll: true });
    }

    function scan() {
      document.querySelectorAll(".fixed.inset-0").forEach((el) => { if (isOverlay(el)) adopt(el); });
      for (const el of [...open.keys()]) if (!el.isConnected) release(el);
    }

    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    scan();

    function onKey(e) {
      const top = [...open.keys()].filter((o) => o.isConnected).pop();
      if (!top) return;
      if (e.key === "Escape") {
        const close =
          [...top.querySelectorAll("button")].find((b) => /^(cancel|close|no|back)\b/i.test(b.textContent.trim()) || /close|cancel/i.test(b.getAttribute("aria-label") ?? "")) ?? null;
        e.preventDefault();
        (close ?? top).click();
      } else if (e.key === "Tab") {
        const f = visibleFocusables(top);
        if (!f.length) { e.preventDefault(); return; }
        const first = f[0], last = f[f.length - 1];
        if (!top.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => { mo.disconnect(); document.removeEventListener("keydown", onKey, true); document.body.style.overflow = ""; };
  }, []);
  return null;
}
