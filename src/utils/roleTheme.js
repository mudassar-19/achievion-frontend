// ── Role Theme Map ─────────────────────────────────────────────────────────────
// Direction C role accents (docs/design/02_DIRECTION_C.md). One accent per role
// family; the same values live in index.css as [data-role=...] so Tailwind and
// inline styles agree. `text` is the accent in text form (4.5:1 on white),
// Tester: the CSS accent is amber (ink on top), but JS `accent` is used as text/border
// in many pages, so it is the darker amber #A05C00 (5.2:1 on white).
// `accentLight` is the solid tint, `onAccent` is the text colour on an accent fill.

const T = {
  director: { key: "director", accent: "#4B2FC4", accentLight: "#EEEAFD", text: "#4B2FC4", onAccent: "#FFFFFF", border: "rgba(75,47,196,0.30)", glow: "rgba(75,47,196,0.18)", label: "purple" },
  manager: { key: "manager", accent: "#1F57E0", accentLight: "#E6EEFF", text: "#1948BD", onAccent: "#FFFFFF", border: "rgba(31,87,224,0.30)", glow: "rgba(31,87,224,0.18)", label: "blue" },
  lead: { key: "lead", accent: "#0A7F76", accentLight: "#F0FAF9", text: "#08695F", onAccent: "#FFFFFF", border: "rgba(10,127,118,0.30)", glow: "rgba(10,127,118,0.18)", label: "teal" },
  developer: { key: "developer", accent: "#14803A", accentLight: "#EDF8F1", text: "#0F6A2F", onAccent: "#FFFFFF", border: "rgba(20,128,58,0.30)", glow: "rgba(20,128,58,0.18)", label: "green" },
  designer: { key: "designer", accent: "#D2391F", accentLight: "#FFF5F3", text: "#B42C15", onAccent: "#FFFFFF", border: "rgba(210,57,31,0.30)", glow: "rgba(210,57,31,0.18)", label: "red" },
  tester: { key: "tester", accent: "#A05C00", accentLight: "#FFF8E6", text: "#7A4B00", onAccent: "#FFFFFF", border: "rgba(160,92,0,0.30)", glow: "rgba(160,92,0,0.15)", label: "amber" },
  admin: { key: "admin", accent: "#4A566B", accentLight: "#E9EDF3", text: "#3A4659", onAccent: "#FFFFFF", border: "rgba(74,86,107,0.30)", glow: "rgba(74,86,107,0.18)", label: "slate" },
};

export const ROLE_THEME = {
  Director: T.director,
  Manager: T.manager,
  "Team Lead": T.lead,
  "Senior Developer": T.developer,
  "Junior Developer": T.developer,
  Developer: T.developer,
  "Senior Designer": T.designer,
  "Junior Designer": T.designer,
  Designer: T.designer,
  "Senior Tester": T.tester,
  "Junior Tester": T.tester,
  Tester: T.tester,
};

// Fallback theme (used before login and on public pages)
const DEFAULT_THEME = T.developer;

/** Role string → data-role value used by index.css. */
export function roleKey(role) {
  return (ROLE_THEME[role] ?? DEFAULT_THEME).key;
}

/**
 * Returns the theme object for a given role string.
 * Import useAuthStore separately and pass user.role.
 *
 * @param {string} role  — exact role string from the user object
 * @returns {{ key, accent, accentLight, text, onAccent, border, glow, label }}
 */
export function getRoleTheme(role) {
  return ROLE_THEME[role] ?? DEFAULT_THEME;
}

/**
 * React hook — reads user.role from authStore and returns the theme.
 * Usage:  const theme = useRoleTheme();
 */
import { useMemo } from "react";
import useAuthStore from "@/stores/authStore";

export function useRoleTheme() {
  const role = useAuthStore((s) => s.user?.role);
  return useMemo(() => getRoleTheme(role), [role]);
}

/**
 * Returns true if the role is a "senior" tier (has management-adjacent duties).
 */
export function isSeniorRole(role) {
  return (
    role === "Senior Developer" ||
    role === "Senior Designer"  ||
    role === "Senior Tester"
  );
}

/**
 * Returns the dashboard base path for a given role.
 * Matches PostLoginRedirect logic in routes/index.jsx.
 */
// Base path of the shell a role uses (Manager moved to /manager in V2 Phase 3 · M-1).
export const portalBase = (role) => (role === "Manager" ? "/manager" : "/workspace");

// U-1 (D-131): the landing page picked in Settings → Preferences (keys checked by the server per role).
const LANDING_BASE = { Director: "/director", Manager: "/manager", "Team Lead": "/teamlead" };
export function homePathFor(user) {
  const key = user?.settings?.preferences?.landing;
  if (!key || key === "home" || !/^[a-z]+$/.test(key)) return dashboardPathForRole(user?.role);
  return `${LANDING_BASE[user.role] ?? "/workspace"}/${key}`;
}

export function dashboardPathForRole(role) {
  if (role === "Director")              return "/director";
  if (role === "Manager")               return "/manager";
  if (role === "Team Lead")             return "/teamlead";
  if (isSeniorRole(role))               return "/workspace/senior";
  return "/workspace";
}
