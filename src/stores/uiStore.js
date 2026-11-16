import { create } from "zustand";

/**
 * uiStore — global UI state (FE-019: only what is used)
 *  - mobile drawer (navOpen)
 *  - toast queue
 *  - celebrations preference + the level-up overlay
 */
function readCelebrations() {
  // UI-E2 (item 40): the person no longer picks this; the device's "reduce motion" setting decides. With it on, celebrations
  // are quiet (plain toasts, no full-screen effects). The organization's celebration level is in Organization settings.
  try { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "quiet"; } catch { /* no matchMedia */ }
  try {
    const v = localStorage.getItem("achievion-celebrations");
    return v === "quiet" || v === "off" ? v : "full";
  } catch { return "full"; }
}

const useUiStore = create((set, get) => ({
  // Mobile drawer (below 1024 px the sidebar slides in over the page)
  navOpen:   false,
  openNav:   () => set({ navOpen: true }),
  closeNav:  () => set({ navOpen: false }),
  toggleNav: () => set((s) => ({ navOpen: !s.navOpen })),

  // ── Toast Queue ──────────────────────────────────────────────────────────
  // Each toast: { id, type ("success"|"error"|"info"|"xp"|"achievement"), message, duration? }
  toasts: [],

  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: Date.now() + Math.random(), duration: 4000, ...toast },
      ],
    })),

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  // ── Celebrations (Direction C): "full" | "quiet" | "off" — saved per browser ────────────
  // full: mascot in toasts + full-screen level-up; quiet: toasts only; off: plain toasts
  celebrations: readCelebrations(),
  setCelebrations: (mode) => {
    try { localStorage.setItem("achievion-celebrations", mode); } catch { /* storage blocked */ }
    set({ celebrations: mode });
  },
  celebration: null,                       // { kind: "level", level } while the overlay is open
  celebrate:      (c) => { if (get().celebrations === "full") set({ celebration: c }); },
  clearCelebration: () => set({ celebration: null }),

}));

export default useUiStore;
export { useUiStore };
