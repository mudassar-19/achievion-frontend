import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Trophy, Bot, Target, BarChart2, Cpu } from "lucide-react";
import { avatarUrl } from "@/lib/avatar";

// ── Context-aware content map ─────────────────────────────────────────────────
const CONTEXTS = {
  login: {
    pill:     "Welcome Back",
    title:    "Resume Your\nGrind.",
    subtitle: "Your team and tasks are waiting. Pick up right where you left off.",
    features: [
      {
        icon: Target,
        color: "text-accent-text",
        bgColor: "bg-accent/10",
        borderColor: "border-accent/20",
        title: "Focus Mode",
        description: "Silence the noise and lock into your highest-priority tasks.",
      },
      {
        icon: Zap,
        color: "text-[#7A5200]",
        bgColor: "bg-[#FFC21A]/10",
        borderColor: "border-[#8A6200]/20",
        title: "Daily Streak",
        description: "Keep your momentum alive — your current streak is on the line.",
      },
      {
        icon: Bot,
        color: "text-purple-DEFAULT",
        bgColor: "bg-purple-DEFAULT/10",
        borderColor: "border-purple-DEFAULT/20",
        title: "AI Coaching",
        description: "Get instant feedback on your velocity and blockers before standup.",
      },
    ],
  },
  signup: {
    pill:     "Forge Your Legacy",
    title:    "Forge Your\nLegacy.",
    subtitle: "Join elite engineering teams scaling their productivity and shipping faster.",
    features: [
      {
        icon: Cpu,
        color: "text-accent-text",
        bgColor: "bg-accent/10",
        borderColor: "border-accent/20",
        title: "Fast Onboarding",
        description: "Your team is up and earning XP within minutes — no migration required.",
      },
      {
        icon: Trophy,
        color: "text-[#7A5200]",
        bgColor: "bg-[#FFC21A]/10",
        borderColor: "border-[#8A6200]/20",
        title: "Earn Badges",
        description: "Unlock legendary titles like Code Samurai and Ship Wizard every sprint.",
      },
      {
        icon: BarChart2,
        color: "text-purple-DEFAULT",
        bgColor: "bg-purple-DEFAULT/10",
        borderColor: "border-purple-DEFAULT/20",
        title: "Real-time Analytics",
        description: "Live dashboards track velocity, burnout signals, and delivery trends.",
      },
    ],
  },
};

// ── Stagger variants ──────────────────────────────────────────────────────────
const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.5 } },
};
const rowVariants = {
  hidden:   { opacity: 0, x: -16 },
  visible:  { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

// ── Floating live-event card ─────────────────────────────────────────────────
function LiveEventCard() {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className={[
        "relative w-full max-w-sm rounded-2xl px-4 pb-4 pt-9",
        "bg-gradient-to-br from-[#EAEDF4] to-[#FFFFFF]",
        "border border-ink/10",
        "shadow-[0_8px_40px_rgba(0,0,0,0.5),_inset_0_1px_0_rgba(20,32,61,0.07)]",
      ].join(" ")}
    >
      {/* Live pulse badge */}
      <span className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-danger/15 px-2 py-0.5 text-[14px] font-bold text-danger tracking-widest uppercase">
                EXAMPLE
      </span>

      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <img
            src={avatarUrl("bottts", "Felix")}
            alt="DevAlex avatar"
            width={44}
            height={44}
            className="rounded-full bg-bg-elevated ring-2 ring-cyan-DEFAULT/50"
          />
          {/* Level badge */}
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[14px] font-black text-accent-on ring-2 ring-bg-base">
            42
          </span>
        </div>

        {/* Event text */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-xs text-slate-400 leading-tight">Achievement unlocked</p>
          <p className="text-sm font-bold text-text-primary leading-tight truncate">
            <span className="text-accent-text">DevAlex</span> is now a{" "}
            <span className="text-purple-DEFAULT font-extrabold">Code Samurai</span>
          </p>
        </div>

        {/* XP badge */}
        <div className="ml-auto shrink-0 flex flex-col items-center gap-0.5">
          <motion.span
            animate={{ opacity: [0.7, 1, 0.7], scale: [0.97, 1.05, 0.97] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center gap-1 rounded-lg bg-accent/15 px-2 py-1 text-sm font-black text-accent-text"
          >
            <Zap size={12} className="shrink-0" />
            +250
          </motion.span>
          <span className="text-[14px] text-slate-500 tracking-wider uppercase">XP</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function AuthShowcase() {
  const { pathname } = useLocation();
  const ctx = pathname.startsWith("/login") ? CONTEXTS.login : CONTEXTS.signup;
  const { pill, title, subtitle, features } = ctx;

  // Derive two title lines from the \n separator
  const [titleLine1, titleLine2] = title.split("\n");

  return (
    <div className="flex h-full flex-col justify-between px-10 py-12 lg:px-14 xl:px-20 gap-10">

      {/* Top: logo wordmark */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2.5"
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
      </motion.div>

      {/* Middle: tagline + live card */}
      <div className="flex flex-col gap-8">
        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col gap-3"
        >
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold text-accent-text tracking-widest uppercase">
            <Zap size={11} strokeWidth={2.5} />
            {pill}
          </span>
          <h1 className="text-4xl xl:text-5xl font-black leading-[1.1] tracking-tight">
            {titleLine1}{" "}
            <span className="text-gradient-brand">{titleLine2}</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            {subtitle}
          </p>
        </motion.div>

        {/* Live event floating card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <LiveEventCard />
        </motion.div>

      </div>

      {/* Bottom: core features */}
      <div className="flex flex-col gap-3">
        <p className="text-[14px] font-bold uppercase tracking-widest text-slate-500">
          Core Features
        </p>
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-2.5"
        >
          {features.map(({ icon: Icon, color, bgColor, borderColor, title: ft, description }) => (
            <motion.div
              key={ft}
              variants={rowVariants}
              className={[
                "flex items-start gap-3 rounded-xl px-4 py-3",
                "bg-gradient-to-r from-[#EAEDF4]/70 to-[#FFFFFF]/50",
                "border",
                borderColor,
                "backdrop-blur-sm",
              ].join(" ")}
            >
              {/* Icon blob */}
              <span className={["mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", bgColor].join(" ")}>
                <Icon size={16} className={color} strokeWidth={2} />
              </span>
              {/* Text */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm font-bold text-text-primary leading-tight">{ft}</p>
                <p className="text-xs text-slate-400 leading-snug">{description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

    </div>
  );
}
