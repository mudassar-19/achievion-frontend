import { useState, useCallback } from "react";
import useAuthStore from "@/stores/authStore";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";

export default function IdleTimeout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout          = useAuthStore((s) => s.logout);
  const [warning, setWarning] = useState(false);

  const handleLogout = useCallback(() => {
    setWarning(false);
    logout();
  }, [logout]);

  useIdleTimeout({ isActive: isAuthenticated, onWarn: setWarning, onLogout: handleLogout });

  if (!warning) return null;

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="idle-title"
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.55)" }}>
      <div style={{ background: "var(--surface, #1a1f2e)", border: "1px solid var(--border, #2d3550)", borderRadius: 12, padding: "1.5rem 2rem", maxWidth: 380, width: "90%", textAlign: "center" }}>
        <p id="idle-title" style={{ margin: "0 0 .5rem", fontWeight: 600, fontSize: "1.05rem", color: "var(--text-primary, #e2e8f0)" }}>
          Still there?
        </p>
        <p style={{ margin: "0 0 1.25rem", fontSize: ".9rem", color: "var(--text-secondary, #94a3b8)" }}>
          You'll be logged out in 2 minutes due to inactivity.
        </p>
        <button
          onClick={() => setWarning(false)}
          style={{ padding: ".5rem 1.5rem", borderRadius: 8, border: "none", background: "var(--accent, #6366f1)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: ".9rem" }}>
          Stay logged in
        </button>
      </div>
    </div>
  );
}
