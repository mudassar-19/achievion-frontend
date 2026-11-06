import { motion } from "framer-motion";
import { Flame, Star, Users } from "lucide-react";
import useGamificationStore from "@/stores/gamificationStore";

const STREAK_TYPES = [
  {
    key:   "daily",
    label: "Daily",
    icon:  Flame,
    color: "#9A3A06",
    tip:   "Submit at least one task per day",
  },
  {
    key:   "quality",
    label: "Quality",
    icon:  Star,
    color: "#7A5200",
    tip:   "Keep AI score above 75 for every submission",
  },
  {
    key:   "collab",
    label: "Collab",
    icon:  Users,
    color: "var(--accent-text)",
    tip:   "Leave a review or comment each day",
  },
];

function StreakBar({ value, max = 30, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-1.5 w-full rounded-full bg-ink/5 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        initial={{ width: "0%" }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ background: color, boxShadow: "var(--shadow-1)" }}
      />
    </div>
  );
}

export default function StreaksCard() {
  // Read from gamification store; fallback to mock values until API lands.
  const streaks = useGamificationStore((s) => s.currentUser.streaks) ?? {
    daily:   14,
    quality:  7,
    collab:   3,
  };

  const best = Math.max(streaks.daily, streaks.quality, streaks.collab);
  const isOnFire = streaks.daily > 7;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: 0.06, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-4 p-5 rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(20,32,61,0.05)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-400/15 border border-orange-400/25"
            animate={isOnFire ? { scale: [1, 1.14, 1], opacity: [1, 0.65, 1] } : {}}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <Flame size={15} className="text-orange-400" strokeWidth={2} />
          </motion.span>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Streaks
          </span>
        </div>
        {isOnFire && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[14px] font-bold border border-orange-400/25 bg-orange-400/10 text-orange-400">
            On Fire 🔥
          </span>
        )}
      </div>

      {/* Best streak big number */}
      <div className="flex items-end gap-2">
        <span className="text-5xl font-black leading-none text-orange-400">
          {best}
        </span>
        <span className="mb-1.5 text-sm font-semibold text-slate-500 leading-none">
          days best
        </span>
      </div>

      {/* Individual streak rows */}
      <div className="flex flex-col gap-3">
        {STREAK_TYPES.map(({ key, label, icon: Icon, color, tip }) => {
          const val = streaks[key] ?? 0;
          return (
            <div key={key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon size={11} style={{ color }} strokeWidth={2.5} />
                  <span className="text-[14px] font-semibold text-slate-400">{label}</span>
                </div>
                <span className="text-[14px] font-black tabular-nums" style={{ color }}>
                  {val}d
                </span>
              </div>
              <StreakBar value={val} color={color} />
              <p className="text-[14px] text-slate-700 leading-none">{tip}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
