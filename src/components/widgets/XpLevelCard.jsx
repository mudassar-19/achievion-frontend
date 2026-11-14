import { motion } from "framer-motion";
import { HP_BURNOUT } from "@/utils/hpTier";
import { Zap, Heart } from "lucide-react";
import XpProgressBar from "@/components/ui/XpProgressBar";
import useGamificationStore from "@/stores/gamificationStore";
import useAuthStore from "@/stores/authStore";
import { useRoleTheme } from "@/utils/roleTheme";

export default function XpLevelCard() {
  const { level, currentXp, maxXp, gold, hp } = useGamificationStore((s) => s.currentUser);
  const xpLabel  = useGamificationStore((s) => s.xpLabel);
  const role     = useAuthStore((s) => s.user?.role);
  const isViewAs = useAuthStore((s) => !!s.viewAs);
  const theme    = useRoleTheme();

  const hpPct   = Math.min(100, Math.max(0, hp ?? 0));
  const isLowHp = (hp ?? 0) < HP_BURNOUT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-4 p-5 rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(20,32,61,0.05)]"
      style={{ border: `1px solid ${theme.border}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: theme.accentLight, border: `1px solid ${theme.border}` }}
          >
            <Zap size={15} style={{ color: theme.text }} strokeWidth={2} />
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {xpLabel}
          </span>
        </div>
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[14px] font-bold"
          style={{
            background: theme.accentLight,
            border: `1px solid ${theme.border}`,
            color: theme.text,
          }}
        >
          {role ?? "Member"}
        </span>
      </div>

      {/* Level */}
      <div className="flex items-end gap-2">
        <span className="text-5xl font-black leading-none" style={{ color: theme.text }}>
          {level}
        </span>
        <span className="mb-1.5 text-sm font-semibold text-slate-500 leading-none">
          / level
        </span>
      </div>

      {/* XP bar */}
      <XpProgressBar currentXp={currentXp} maxXp={maxXp} level={level} />

      {/* HP + Gold row */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* HP */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Heart size={12} className={isViewAs ? "text-slate-400" : isLowHp ? "text-danger" : "text-[#0E6A30]"} strokeWidth={2.5} />
            <span className="text-[14px] font-bold uppercase tracking-widest text-slate-600">HP</span>
            {!isViewAs && isLowHp && <span className="ml-auto text-[14px] font-bold text-danger">LOW</span>}
          </div>
          {isViewAs ? (
            <span className="text-xs text-slate-400 italic">Hidden in View as</span>
          ) : (
            <>
              <div className="h-1.5 rounded-full bg-ink/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${hpPct}%` }}
                  transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
                  style={{
                    background: isLowHp ? "#D1291F" : "#12803B",
                    boxShadow: isLowHp ? "0 0 6px rgba(209,41,31,0.5)" : "0 0 6px rgba(18,128,59,0.4)",
                  }}
                />
              </div>
              <span className={`text-xs font-bold ${isLowHp ? "text-danger" : "text-[#0E6A30]"}`}>{hp} / 100</span>
            </>
          )}
        </div>

        {/* Gold */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px]">🪙</span>
            <span className="text-[14px] font-bold uppercase tracking-widest text-slate-600">
              Gold
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-[#7A5200] leading-none">
              {gold.toLocaleString()}
            </span>
            <span className="text-[14px] text-slate-600 font-semibold">coins</span>
          </div>
          <span className="text-[14px] text-slate-600">Spend in Inventory</span>
        </div>
      </div>
    </motion.div>
  );
}
