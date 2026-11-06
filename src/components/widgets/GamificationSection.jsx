import { motion } from "framer-motion";
import { Gamepad2 } from "lucide-react";
import XpLevelCard    from "@/components/widgets/XpLevelCard";
import StreaksCard     from "@/components/widgets/StreaksCard";
import BadgesCard      from "@/components/widgets/BadgesCard";
import LeaderboardCard from "@/components/widgets/LeaderboardCard";
import { useRoleTheme } from "@/utils/roleTheme";

/**
 * GamificationSection
 *
 * Shared 4-card gamification grid used by every role dashboard.
 *
 * @param {"org"|"team"|"role"} scope
 *   - "org"  → Director / Manager  (org-wide leaderboard)
 *   - "team" → Team Lead           (team-scoped leaderboard)
 *   - "role" → Senior / Junior     (role-specific leaderboard)
 */
export default function GamificationSection({ scope = "role" }) {
  const theme = useRoleTheme();

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-4"
    >
      {/* Section heading */}
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: theme.accentLight, border: `1px solid ${theme.border}` }}
        >
          <Gamepad2 size={14} style={{ color: theme.text }} strokeWidth={2} />
        </span>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Gamification
        </h2>
        <div className="flex-1 h-px bg-ink/[0.06]" />
      </div>

      {/* 2-column grid on md+, single column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <XpLevelCard />
        <StreaksCard />
        <BadgesCard />
        <LeaderboardCard scope={scope} />
      </div>
    </motion.section>
  );
}
