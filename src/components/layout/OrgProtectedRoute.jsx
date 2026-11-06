import { Navigate, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import Tally from "@/components/ui/Tally";
import useOrgAuthStore from "@/stores/orgAuthStore";

function OrgAuthLoading() {
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

export default function OrgProtectedRoute() {
  const org      = useOrgAuthStore((s) => s.org);
  const orgReady = useOrgAuthStore((s) => s.orgReady);

  if (!orgReady) return <OrgAuthLoading />;
  if (!org)      return <Navigate to="/org/login" replace />;
  return <Outlet />;
}
