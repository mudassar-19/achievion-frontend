import { motion } from "framer-motion";
import { Construction } from "lucide-react";
import { useRoleTheme } from "@/utils/roleTheme";

/**
 * Reusable "coming soon" placeholder for pages not yet implemented.
 * Uses the current user's role theme for accent colours.
 */
export default function ComingSoonPage({ title, subtitle }) {
  const theme = useRoleTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-6 p-6"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: theme.accentLight, border: `1px solid ${theme.border}` }}
        >
          <Construction size={20} style={{ color: theme.text }} strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-text-primary">{title}</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {subtitle ?? "Coming in a later phase — check back soon."}
          </p>
        </div>
      </div>

      <div
        className="flex items-center justify-center rounded-2xl border p-24 text-center"
        style={{ borderColor: theme.border, background: theme.accentLight }}
      >
        <p className="text-sm text-text-secondary italic">Under construction</p>
      </div>
    </motion.div>
  );
}
