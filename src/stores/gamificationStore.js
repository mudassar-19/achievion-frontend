import { create } from "zustand";
import api from "@/lib/api";

// Live state only (FE-016 / FE-032): the logged-in player's numbers and the role-aware XP label.
// Rewards are calculated by the server; the client just shows what /api/gamification/profile returns.
const useGamificationStore = create((set) => ({
  // ── Current player ────────────────────────────────────────────────────────
  currentUser: {
    level:     1,
    currentXp: 0,
    maxXp:     100,
    gold:      0,
    hp:        100,
    streak:    0,
    streaks: {
      daily:   0,
      quality: 0,
      collab:  0,
    },
  },

  // ── Role-aware XP label (synced from authStore on login) ─────────────────
  // "XP" | "Design Points" | "Test Points" | "Command XP"
  xpLabel: "XP",
  setXpLabel: (label) => set({ xpLabel: label }),

  fetchProfile: async () => {
    try {
      const res = await api.get("/api/gamification/profile");
      if (res.success) {
        set((state) => ({ currentUser: { ...state.currentUser, ...res.data } }));
      }
    } catch { /* silent: a profile load failure must not break the layout */ }
  },
}));

export default useGamificationStore;
