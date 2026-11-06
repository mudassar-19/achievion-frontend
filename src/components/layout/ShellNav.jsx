import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import useUiStore from "@/stores/uiStore";

// Hamburger button (visible below 1024 px) + scrim for the mobile sidebar drawer.
// The drawer itself is the layout's <aside className="shell-aside" data-open={navOpen}>.
export function NavToggle() {
  const navOpen   = useUiStore((s) => s.navOpen);
  const toggleNav = useUiStore((s) => s.toggleNav);
  return (
    <button
      type="button"
      onClick={toggleNav}
      aria-label="Menu"
      aria-expanded={navOpen}
      className="shell-toggle shrink-0 h-10 w-10 items-center justify-center rounded-lg border border-border-subtle text-text-primary bg-bg-surface hover:bg-bg-muted"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <Menu size={20} aria-hidden="true" />
    </button>
  );
}

export function NavScrim() {
  const navOpen  = useUiStore((s) => s.navOpen);
  const closeNav = useUiStore((s) => s.closeNav);
  const { pathname } = useLocation();

  useEffect(() => { closeNav(); }, [pathname, closeNav]);
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") closeNav(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen, closeNav]);

  return navOpen ? <div className="shell-scrim" onClick={closeNav} aria-hidden="true" /> : null;
}
