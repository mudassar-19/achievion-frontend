import { create } from "zustand";
import { persist } from "zustand/middleware";
import api                from "@/lib/api";
import socket, { joinRooms } from "@/utils/socket";
import useGamificationStore from "@/stores/gamificationStore";
import { dashboardPathForRole } from "@/utils/roleTheme";

// ── Role-derived display labels ───────────────────────────────────────────────
export const ROLE_XP_LABEL = {
  Developer: "XP",
  Designer:  "Design Points",
  Tester:    "Test Points",
  Director:  "Command XP",
};

export const ROLE_CLASS_NAME = {
  Developer: "Code Vanguard",
  Designer:  "Design Artisan",
  Tester:    "QA Guardian",
  Director:  "Command Chief",
};

// ── Map the API user shape → store user shape ─────────────────────────────────
function mapApiUser(apiUser) {
  return {
    id:           apiUser.id   ?? apiUser._id,
    name:         apiUser.name,
    username:     apiUser.name,
    email:        apiUser.email,
    role:         apiUser.role,
    roleLabel:    apiUser.roleLabel    ?? null,
    roleCategory: apiUser.roleCategory ?? null,
    department:   apiUser.department   ?? null,
    orgName:      apiUser.orgName      ?? null,
    orgCode:      apiUser.orgCode      ?? null,
    orgId:        apiUser.orgId        ?? null,   // FE-034: needed for the org socket room
    avatarSeed:   apiUser.name,
    level:        apiUser.level     ?? 1,
    currentXp:    apiUser.currentXp ?? 0,
    maxXp:        apiUser.maxXp     ?? 1000,
    gold:         apiUser.gold      ?? 0,
    hp:           apiUser.hp        ?? 100,
    settings:     apiUser.settings  ?? null,      // U-1: landing page, AI panel, date format must survive a reload
  };
}

// ── Sync xpLabel in gamificationStore after every successful auth ─────────────
function syncXpLabel(role) {
  // FE-033: tiers ("Senior Tester", …) map to their base role
  const base = ROLE_XP_LABEL[role] ? role : role?.replace(/^(Senior|Junior) /, "");
  useGamificationStore.getState().setXpLabel(ROLE_XP_LABEL[base] ?? "XP");
}

// ── Cross-tab auth sync ───────────────────────────────────────────────────────
// When another tab logs in or out, the shared localStorage key changes.
// Listen once and force this tab to log out + redirect so tokens never mix.
let _syncListenerAttached = false;

// ── Store ─────────────────────────────────────────────────────────────────────
const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── State ────────────────────────────────────────────────────────────
      user:            null,     // mapped user object
      token:           null,     // raw JWT string
      isAuthenticated: false,
      isLoading:       false,
      error:           null,
      authReady:       false,    // true once initialize() has completed
      // View as (D-109): { viewerToken, viewerUser, returnPath, targetName, targetRole, viewerName, expiresAt } while viewing.
      viewAs:          null,

      // ── Primitive setter (used internally) ──────────────────────────
      setUser:  (user)  => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),

      // ── register ─────────────────────────────────────────────────────────
      // Creates a new account via POST /api/auth/register.
      // Returns { success: true, role } on success or { success: false, error }.
      register: async (name, email, password, role) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.post("/api/auth/register", { name, email, password, role });
          const user = mapApiUser(data.user);
          set({ user, token: data.token, isAuthenticated: true, isLoading: false, error: null });
          syncXpLabel(user.role);
          joinRooms({ userId: user.id, orgId: user.orgId });
          return { success: true, role: user.role };
        } catch (err) {
          const message = err.message ?? "Registration failed. Please try again.";
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      // ── login ─────────────────────────────────────────────────────────────
      // Authenticates via POST /api/auth/login.
      // Returns { success: true, role } on success or { success: false, error }.
      login: async (email, password, orgCode) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.post("/api/auth/login", { email, password, orgCode });
          const user = mapApiUser(data.user);
          set({ user, token: data.token, isAuthenticated: true, isLoading: false, error: null });
          syncXpLabel(user.role);
          joinRooms({ userId: user.id, orgId: user.orgId });
          return { success: true, role: user.role, roleCategory: user.roleCategory };
        } catch (err) {
          const message = err.message ?? "Login failed. Please try again.";
          set({ isLoading: false, error: message });
          return { success: false, error: message };
        }
      },

      // ── logout ────────────────────────────────────────────────────────────
      logout: () => {
        socket.disconnect();
        set({ user: null, token: null, viewAs: null, isAuthenticated: false, error: null, authReady: true });
      },

      // ── View as (AUTH-11, D-109) ──────────────────────────────────────────
      // Read-only, 30 min. The viewer's own session is kept here and restored on exit. Full page loads on
      // start / exit so every store and the socket start clean for the person being shown.
      startViewAs: async (targetId) => {
        const { token, user, viewAs } = get();
        if (viewAs) throw new Error("Exit the current view first.");
        const r = await api.post("/api/auth/view-as", { targetId });
        const me = await api.get("/api/auth/me", { headers: { Authorization: `Bearer ${r.token}` } });
        socket.disconnect();
        set({ viewAs: { ...r.viewAs, viewerToken: token, viewerUser: user, returnPath: window.location.pathname + window.location.search },
          token: r.token, user: mapApiUser(me.user) });
        window.location.assign(dashboardPathForRole(me.user.role));
      },
      exitViewAs: async () => {
        const v = get().viewAs;
        if (!v) return;
        await api.post("/api/auth/view-as/exit", {}, { silent: true }).catch(() => {}); // audit row; an expired view still exits
        set({ token: v.viewerToken, user: v.viewerUser, viewAs: null });
        window.location.assign(v.returnPath || dashboardPathForRole(v.viewerUser?.role));
      },

      // ── initialize ───────────────────────────────────────────────────────
      // Called once on app boot.  If a token is stored, it is verified against
      // GET /api/auth/me.  A 401 clears state; a network error trusts the cache.
      initialize: async () => {
        const { token, authReady } = get();

        // Idempotent — don't run twice
        if (authReady) return;
        get()._attachSyncListener();

        if (!token) {
          set({ authReady: true });
          return;
        }

        try {
          const data = await api.get("/api/auth/me");
          const user = mapApiUser(data.user);
          set({ user, isAuthenticated: true, authReady: true, error: null });
          syncXpLabel(user.role);
          joinRooms({ userId: user.id, orgId: user.orgId });
        } catch (err) {
          if (err.status === 401) {
            // Token is expired or revoked — clear everything
            set({ user: null, token: null, isAuthenticated: false, authReady: true, error: null });
          } else if (err.network) {
            // Offline: trust the persisted state (FE-026)
            set({ authReady: true });
          } else {
            // 403 / 5xx: do not render protected UI from a stale cached role
            set({ user: null, token: null, isAuthenticated: false, authReady: true, error: null });
          }
        }
      },

      // ── cross-tab sync ───────────────────────────────────────────────────
      // Registers once; fires when another tab writes to achievion-auth.
      _attachSyncListener: () => {
        if (_syncListenerAttached || typeof window === "undefined") return;
        _syncListenerAttached = true;
        window.addEventListener("storage", (e) => {
          if (e.key !== "achievion-auth") return;
          try {
            const incoming = JSON.parse(e.newValue ?? "null")?.state?.token ?? null;
            if (incoming !== get().token) {
              socket.disconnect();
              set({ user: null, token: null, isAuthenticated: false, error: null, viewAs: null });
              window.location.href = "/login";
            }
          } catch {}
        });
      },

      // ── clearError ───────────────────────────────────────────────────────
      clearError: () => set({ error: null }),
    }),
    {
      name: "achievion-auth",

      // Only persist token + user; runtime flags are re-derived on boot.
      partialize: (state) => ({
        user:   state.user,
        token:  state.token,
        viewAs: state.viewAs,
      }),

      // Re-derive isAuthenticated from the persisted user on rehydration.
      // authReady stays false until initialize() completes.
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        isAuthenticated: !!persisted.user,
        authReady:       false,  // always start as not-ready; initialize() sets it
      }),
    }
  )
);

export default useAuthStore;
