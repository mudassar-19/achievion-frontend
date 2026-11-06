import { useEffect } from "react";
import useUiStore from "@/stores/uiStore";

// Shows one toast per distinct failure (server down, server error, forbidden), at most once every 6 s,
// so pages that swallow errors still tell the user something went wrong (FE-028).
export default function ApiErrorToaster() {
  useEffect(() => {
    const seen = new Map();
    function onError(e) {
      const { message, status, code } = e.detail ?? {};
      const key = `${status}:${message}`;
      const now = Date.now();
      if (now - (seen.get(key) ?? 0) < 6000) return;
      seen.set(key, now);
      useUiStore.getState().addToast({
        type: "error",
        message: code === "view_as_read_only" ? "Read-only in View as. Exit the view to make changes."
          : status === 403 ? "You do not have access to that." : (message ?? "Something went wrong."),
        duration: 5000,
      });
    }
    window.addEventListener("api:error", onError);
    return () => window.removeEventListener("api:error", onError);
  }, []);
  return null;
}
