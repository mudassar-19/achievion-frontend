import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Trophy, Star, Info } from "lucide-react";
import { TICKER_H } from "./WorkspaceLayout";
import api from "@/lib/api";

// ── Map notification type → icon config ─────────────────────────────────────
function iconForType(type) {
  switch (type) {
    case "badge":  return { Icon: Trophy, cls: "text-[#7A5200]" };
    case "xp":     return { Icon: Star,   cls: "text-[#7A5200]" };
    case "task":   return { Icon: Zap,    cls: "text-accent-text" };
    default:       return { Icon: Info,   cls: "text-slate-500" };
  }
}

const FALLBACK = [
  { Icon: Zap,    cls: "text-accent-text", text: "Welcome to ACHIEVION — complete tasks to earn XP!" },
];

// ── BottomTicker ─────────────────────────────────────────────────────────────
export default function BottomTicker() {
  const [items, setItems] = useState(FALLBACK);

  useEffect(() => {
    setTimeout(() => {
      api.get("/api/notifications?limit=20")
        .then((data) => {
          const notifs = data.notifications ?? [];
          if (notifs.length === 0) return; // keep fallback
          const mapped = notifs.map((n) => {
            const { Icon, cls } = iconForType(n.type);
            return { Icon, cls, text: n.message };
          });
          setItems(mapped);
        })
        .catch(() => {}); // keep fallback on error
    }, 0);
  }, []);

  // Double for seamless looping
  const tickerItems = [...items, ...items];
  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-ink/5 overflow-hidden z-50 flex items-center"
      style={{ height: TICKER_H }}
      aria-label="Live activity feed"
      aria-live="polite"
    >
      {/* "LIVE" badge — static, stays left-pinned */}
      <div className="shrink-0 flex items-center gap-1.5 px-3 border-r border-ink/5 self-stretch bg-bg-elevated">
        <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-card animate-pulse-glow" />
        <span className="text-[14px] font-bold uppercase tracking-widest text-accent-text">Live</span>
      </div>

      {/* Scrolling marquee */}
      <div className="flex-1 overflow-hidden relative">
        <motion.div
          className="flex items-center whitespace-nowrap will-change-transform"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, duration: 45, ease: "linear" }}
        >
          {tickerItems.map(({ Icon, cls, text }, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 px-5 text-[14px] text-slate-500 border-r border-ink/[0.06]"
            >
              <Icon size={10} className={cls} strokeWidth={2.5} aria-hidden="true" />
              <span className="text-slate-400">{text}</span>
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
