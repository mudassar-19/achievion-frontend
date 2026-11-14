// The organisation's logo in the portal header (Batch 5, D7). Loaded once per sign-in with the person's own token
// (the image route is not public); no logo, or any failure, shows nothing and the header keeps its default look.
// "branding:changed" (sent after the Director uploads or removes a logo) reloads it.
import { useEffect, useState } from "react";
import api from "@/lib/api";
import useAuthStore from "@/stores/authStore";

export default function OrgLogo({ className = "h-7 max-w-[112px]" }) {
  const token = useAuthStore((s) => s.token);
  const [src, setSrc] = useState(null);
  useEffect(() => {
    if (!token) return undefined;
    let url = null, live = true;
    const load = async () => {
      try {
        const b = await api.get("/api/auth/branding", { silent: true });
        const next = b.logo ? URL.createObjectURL(await api.download("/api/auth/branding/logo")) : null;
        if (!live) { if (next) URL.revokeObjectURL(next); return; }
        if (url) URL.revokeObjectURL(url);
        url = next; setSrc(next);
      } catch { if (live) setSrc(null); }
    };
    load();
    window.addEventListener("branding:changed", load);
    return () => { live = false; window.removeEventListener("branding:changed", load); if (url) URL.revokeObjectURL(url); };
  }, [token]);
  if (!src) return null;
  return <img src={src} alt="Organisation logo" data-org-logo className={`shrink-0 object-contain ${className}`} />;
}
