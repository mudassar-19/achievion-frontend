import { Navigate, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import Tally from "@/components/ui/Tally";
import useAuthStore from "@/stores/authStore";

// ── Full-screen loading shimmer shown while the token is being verified ───────
function AuthLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-base">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Tally pose="working" size={104} />
        <p role="status" className="text-sm font-semibold text-text-secondary">
          Verifying session…
        </p>
      </motion.div>
    </div>
  );
}

// ── ProtectedRoute ────────────────────────────────────────────────────────────
// Renders <Outlet /> when authenticated.
// Renders <AuthLoading /> while the token is being validated against the API.
// Redirects to /login when unauthenticated.
export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authReady       = useAuthStore((s) => s.authReady);

  if (!authReady) return <AuthLoading />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
