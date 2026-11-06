import { motion } from "framer-motion";

const levelColors = {
  default: "bg-bg-elevated border-bg-border text-text-secondary",
  milestone: "bg-cyan-DEFAULT/10 border-cyan-DEFAULT/40 text-cyan-DEFAULT",
};

export default function XpProgressBar({
  currentXp = 0,
  maxXp = 100,
  level = 1,
  /** Show gold gradient instead of cyan once level >= threshold */
  goldThreshold = 20,
  className = "",
}) {
  const pct = Math.min(100, Math.max(0, (currentXp / maxXp) * 100));
  const isMilestone = level % 5 === 0;
  const isGold = level >= goldThreshold;

  // Direction C: XP is blue, gold once the level passes the threshold; no glow.
  const fillGradient = isGold ? "var(--gold-fill)" : "var(--xp-fill)";

  return (
    <div className={["flex items-center gap-3 w-full", className].join(" ")}>
      {/* Level badge */}
      <div
        className={[
          "shrink-0 w-9 h-9 rounded-pill border flex items-center justify-center",
          "font-num text-sm font-bold tracking-tight transition-all duration-200",
          isMilestone ? levelColors.milestone : levelColors.default,
        ].join(" ")}
        title={`Level ${level}`}
        aria-label={`Level ${level}`}
      >
        {level}
      </div>

      {/* Track + fill */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="xp-bar">
          <motion.div
            className="xp-bar-fill"
            initial={{ width: "0%" }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              background: fillGradient,
            }}
            aria-valuenow={currentXp}
            aria-valuemin={0}
            aria-valuemax={maxXp}
            role="progressbar"
            aria-label="XP progress"
          />
        </div>

        {/* XP label */}
        <div className="flex justify-between text-[14px] text-text-disabled font-medium">
          <span>{currentXp.toLocaleString()} XP</span>
          <span>{maxXp.toLocaleString()} XP</span>
        </div>
      </div>
    </div>
  );
}
