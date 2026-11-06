import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "@/stores/authStore";
import { dashboardPathForRole } from "@/utils/roleTheme";

// ── RoleRoute ─────────────────────────────────────────────────────────────────
// Must be nested inside a <ProtectedRoute /> (or used after confirming auth).
// allowedRoles accepts role CATEGORIES (e.g. "developer", "tester") so that
// every tier variant ("Senior Tester", "Junior Developer", etc.) is covered
// by a single entry rather than listing every exact role string.
// seniorOnly additionally requires a "Senior …" tier (FE-001).
export default function RoleRoute({ allowedRoles = [], seniorOnly = false }) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Prefer roleCategory (lowercase) which covers all tier variants.
  // Fall back to lower-casing the exact role for backward compatibility.
  const effective = user.roleCategory ?? user.role?.toLowerCase() ?? "";
  const tierOk    = !seniorOnly || user.role?.startsWith("Senior ");

  if (!allowedRoles.includes(effective) || !tierOk) {
    // Send people to their own home, never back into the same guard (no redirect loop).
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  return <Outlet />;
}
