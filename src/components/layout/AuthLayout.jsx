import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import AuthShowcase from "@/components/widgets/AuthShowcase";

// ── Grid-line background (left panel) ────────────────────────────────────────
const GRID_STYLE = {
  backgroundImage: [
    "linear-gradient(180deg, rgb(var(--c-accent) / 0.03) 0%, rgba(42,98,236,0.06) 100%)",
    "linear-gradient(rgba(20,32,61,0.025) 1px, transparent 1px)",
    "linear-gradient(90deg, rgba(20,32,61,0.025) 1px, transparent 1px)",
  ].join(", "),
  backgroundSize: "100% 100%, 48px 48px, 48px 48px",
};

// ── Decorative glow orbs (left panel) ────────────────────────────────────────
function GlowOrb({ className, color }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.14, 1], opacity: [0.4, 0.65, 0.4] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
      className={["absolute rounded-full blur-3xl pointer-events-none", className].join(" ")}
      style={{ background: color }}
    />
  );
}

// ── Dot-grid background (right panel) ────────────────────────────────────────
const DOT_STYLE = {
  backgroundImage: "radial-gradient(rgb(var(--c-accent) / 0.09) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
};

export default function AuthLayout({ children }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">

      {/* ── LEFT COLUMN — showcase panel (hidden on mobile) ────────────────── */}
      <div
        className="hidden lg:flex relative flex-col overflow-hidden bg-[#F5F6FA]"
        style={GRID_STYLE}
      >
        {/* Orbs */}
        <GlowOrb className="w-[500px] h-[500px] -top-40 -left-32" color="rgb(var(--c-accent) / 0.10)" />
        <GlowOrb className="w-[400px] h-[400px] bottom-0 right-0"  color="rgba(42,98,236,0.12)" />
        <GlowOrb className="w-[260px] h-[260px] top-1/2 left-1/4"  color="rgba(255,194,26,0.05)" />

        {/* Content */}
        <div className="relative z-10 flex-1">
          <div aria-hidden="true"><AuthShowcase /></div> {/* decorative sample (FE-R028) */}
        </div>

        {/* Right-edge separator */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-ink/10 to-transparent"
        />
      </div>

      {/* ── RIGHT COLUMN — auth form ──────────────────────────────────────── */}
      <div
        className="relative flex flex-col items-center justify-center bg-bg-base px-4 py-12 overflow-hidden"
        style={DOT_STYLE}
      >
        {/* Subtle orb behind the card */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full blur-3xl pointer-events-none"
          style={{ background: "rgb(var(--c-accent) / 0.07)" }}
        />

        {/* Mobile-only logo (hidden on lg where left panel has it) */}
        <Link
          to="/"
          className="relative z-10 mb-8 flex items-center gap-2 focus-visible:outline-none lg:hidden"
          aria-label="Back to ACHIEVION home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-card">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
            </svg>
          </span>
          <span className="text-lg font-black tracking-tight text-gradient-brand">
            ACHIEVION
          </span>
        </Link>

        {/* Auth card */}
        <div className="relative z-10 w-full max-w-md">
          <GlassCard padding="lg">
            {children}
          </GlassCard>
        </div>

        {/* Footer note */}
        <p className="relative z-10 mt-6 text-xs text-text-disabled">
          © {new Date().getFullYear()} ACHIEVION
        </p>
      </div>

    </div>
  );
}
