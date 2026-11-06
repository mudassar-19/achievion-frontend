import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import router from "@/routes/index";
import useAuthStore    from "@/stores/authStore";
import useOrgAuthStore from "@/stores/orgAuthStore";
import { roleKey } from "@/utils/roleTheme";
import ModalA11y from "@/components/ui/ModalA11y";
import ImageFallback from "@/components/ui/ImageFallback";
import ApiErrorToaster from "@/components/ui/ApiErrorToaster";
import { ViewAsBanner } from "@/components/layout/ViewAs";

export default function App() {
  const initialize    = useAuthStore((s) => s.initialize);
  const initializeOrg = useOrgAuthStore((s) => s.initialize);

  // Direction C: the role accent is a CSS variable set by <html data-role="...">.
  const role     = useAuthStore((s) => s.user?.role);
  const orgToken = useOrgAuthStore((s) => s.orgToken);
  useEffect(() => {
    document.documentElement.dataset.role = role ? roleKey(role) : orgToken ? "admin" : "developer";
  }, [role, orgToken]);

  // Verify any persisted JWTs against the API on first mount.
  // Each sets its own *Ready flag so route guards can render.
  useEffect(() => {
    initialize();
    initializeOrg();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // FE-057: framer-motion honours the OS "reduce motion" setting everywhere.
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
      <ModalA11y />
      <ImageFallback />
      <ApiErrorToaster />
      <ViewAsBanner />
    </MotionConfig>
  );
}
