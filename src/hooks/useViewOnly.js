// View as is read-only (F-3). One flag for every write control; the server enforces it too (403 VIEW_ONLY).
import useAuthStore from "@/stores/authStore";

export default function useViewOnly() {
  return useAuthStore((s) => !!s.viewAs);
}
