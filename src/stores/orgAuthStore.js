import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

// Reads the org token directly from localStorage to avoid circular dependency
// (same pattern as api.js reads the user token).
function getPersistedOrgToken() {
  try {
    const raw = localStorage.getItem("achievion-org");
    return JSON.parse(raw)?.state?.orgToken ?? null;
  } catch {
    return null;
  }
}

const useOrgAuthStore = create(
  persist(
    (set, get) => ({
      // ── State ─────────────────────────────────────────────────────────────
      org:      null,   // sanitized org object from API
      orgToken: null,   // raw JWT for org admin session
      orgReady: false,  // true once initialize() completes

      // ── Setters ───────────────────────────────────────────────────────────
      setOrg: (org, token) => set({ org, orgToken: token, orgReady: true }),
      clearOrg: () => set({ org: null, orgToken: null, orgReady: true }), // FE-036: ready=true so guards redirect instead of spinning

      // ── initialize ────────────────────────────────────────────────────────
      // Called on app mount.  Verifies any persisted org token against the API.
      // Sets orgReady = true when done so OrgProtectedRoute can render.
      initialize: async () => {
        if (get().orgReady) return;

        const token = getPersistedOrgToken();

        if (!token) {
          set({ orgReady: true });
          return;
        }

        try {
          const data = await api.get("/api/org/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          set({ org: data.data.org, orgReady: true });
        } catch (err) {
          if (err.status === 401 || err.status === 403) {
            // Token expired or invalid — clear state
            set({ org: null, orgToken: null, orgReady: true });
          } else {
            // Network error — trust the cached org object
            set({ orgReady: true });
          }
        }
      },
    }),
    {
      name: "achievion-org",

      // Only persist the token and org snapshot; runtime flags re-derived on boot.
      partialize: (state) => ({
        orgToken: state.orgToken,
        org:      state.org,
      }),

      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        orgReady: false, // always reset — initialize() sets it
      }),
    }
  )
);

export default useOrgAuthStore;
