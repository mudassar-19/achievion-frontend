import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";

// Page-level transition wrapper
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.2 } },
};

export default function PublicLayout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-dvh flex flex-col bg-bg-base text-text-primary">
      {/* ── Sticky Navbar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-bg-border/60 bg-bg-base/70 backdrop-blur-md">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group focus-visible:outline-none"
            aria-label="ACHIEVION home"
          >
            {/* Simple glyph mark */}
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand shadow-glow-cyan-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
              </svg>
            </span>
            <span className="text-base font-bold tracking-tight text-gradient-brand">
              ACHIEVION
            </span>
          </Link>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              Log in
            </Link>
            <Button as={Link} to="/register/step-1" size="sm" variant="primary">
              Register workspace
            </Button>
          </div>
        </nav>
      </header>

      {/* ── Page Content ────────────────────────────────────────────────── */}
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Minimal Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-bg-border/40 py-4 text-center text-xs text-text-disabled">
        © {new Date().getFullYear()} ACHIEVION. All rights reserved.
      </footer>
    </div>
  );
}
