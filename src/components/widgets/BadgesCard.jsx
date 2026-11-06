import { motion } from "framer-motion";
import { Trophy, Lock, Flame, Star, Shield, Zap, Code2, Target } from "lucide-react";

// Mock badge data — Phase 8 API will replace this
const EARNED = [
  { icon: Flame,  name: "On Fire",     rarity: "epic",      earnedDate: "Apr 10" },
  { icon: Trophy, name: "Sprint MVP",  rarity: "legendary", earnedDate: "Mar 31" },
  { icon: Code2,  name: "Clean Coder", rarity: "rare",      earnedDate: "Feb 18" },
];

const LOCKED = [
  { icon: Star,   name: "10x Engineer", rarity: "legendary", progress: 72 },
  { icon: Shield, name: "Bug Slayer",   rarity: "epic",      progress: 45 },
  { icon: Zap,    name: "Speed Demon",  rarity: "rare",      progress: 88 },
];

const RARITY_STYLE = {
  legendary: { border: "border-[#8A6200]/40", bg: "bg-[#FFC21A]/10",  text: "text-[#7A5200]",  glow: "rgba(255,194,26,0.25)"    },
  epic:      { border: "border-[#2A62EC]/40", bg: "bg-[#2A62EC]/10",  text: "text-[#1948BD]",  glow: "rgba(42,98,236,0.25)"   },
  rare:      { border: "border-accent/40", bg: "bg-accent/10",  text: "text-accent-text",  glow: "rgb(var(--c-accent) / 0.25)"    },
  common:    { border: "border-ink/10",     bg: "bg-ink/5",       text: "text-slate-400",  glow: "rgba(20,32,61,0.08)"  },
};

function BadgePill({ icon: Icon, name, rarity, earnedDate }) {
  const s = RARITY_STYLE[rarity] ?? RARITY_STYLE.common;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${s.border} ${s.bg}`}
      style={{ boxShadow: "var(--shadow-1)" }}
    >
      <Icon size={13} className={s.text} strokeWidth={2} />
      <span className="text-xs font-semibold text-text-primary truncate flex-1">{name}</span>
      {earnedDate && (
        <span className="text-[14px] text-slate-600 shrink-0">{earnedDate}</span>
      )}
    </div>
  );
}

function NextBadgeProgress({ icon: Icon, name, rarity, progress }) {
  const s = RARITY_STYLE[rarity] ?? RARITY_STYLE.common;
  return (
    <div className={`flex flex-col gap-2 px-3 py-2.5 rounded-xl border ${s.border} ${s.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={13} className={s.text} strokeWidth={2} />
          <span className="text-xs font-semibold text-text-primary">{name}</span>
        </div>
        <span className={`text-[14px] font-black ${s.text}`}>{progress}%</span>
      </div>
      <div className="h-1 rounded-full bg-ink/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ background: s.text.replace("text-[", "").replace("]", ""), boxShadow: "var(--shadow-1)" }}
        />
      </div>
    </div>
  );
}

export default function BadgesCard() {
  // Nearest = highest progress among locked
  const nearest = [...LOCKED].sort((a, b) => b.progress - a.progress)[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: 0.12, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col gap-4 p-5 rounded-2xl bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(20,32,61,0.05)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFC21A]/10 border border-[#8A6200]/20">
            <Trophy size={15} className="text-[#7A5200]" strokeWidth={2} />
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Badges
          </span>
        </div>
        <span className="text-[14px] font-bold text-slate-600">
          {EARNED.length} / {EARNED.length + LOCKED.length} earned
        </span>
      </div>

      {/* Earned list */}
      <div className="flex flex-col gap-2">
        {EARNED.map((b) => (
          <BadgePill key={b.name} {...b} />
        ))}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-ink/[0.06]" />
        <div className="flex items-center gap-1">
          <Target size={10} className="text-slate-700" strokeWidth={2} />
          <span className="text-[14px] font-bold uppercase tracking-widest text-slate-700">
            Next up
          </span>
        </div>
        <div className="flex-1 h-px bg-ink/[0.06]" />
      </div>

      {/* Nearest locked badge progress */}
      {nearest && <NextBadgeProgress {...nearest} />}

      {/* Locked count */}
      <p className="text-[14px] text-slate-700 text-center">
        <Lock size={9} className="inline mr-0.5 -mt-0.5" />
        {LOCKED.length - 1} more badges locked
      </p>
    </motion.div>
  );
}
