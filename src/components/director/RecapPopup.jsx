import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Calendar } from "lucide-react";
import api from "@/lib/api";
import gsap from "gsap";
import useUiStore from "@/stores/uiStore";

const ACCENT = "#4B2FC4";
const REDUCED = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Confetti particle ─────────────────────────────────────────────────────────
const CONFETTI_COLORS = [ACCENT, "#0E6A30", "#B01F17", "#D4A017", "#136386"];
const CONFETTI_DATA = Array.from({ length: 60 }, (_, i) => ({
  left: `${(i * 1.68) % 100}%`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  rot:   (i * 17) % 360,
}));
function Confetti({ count = 60 }) {
  if (REDUCED) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {CONFETTI_DATA.slice(0, count).map((c, i) => (
        <div
          key={i}
          className="confetti-piece absolute w-2 h-2 rounded-sm opacity-0"
          style={{ left: c.left, top: "-8px", background: c.color, transform: `rotate(${c.rot}deg)` }}
          data-idx={i}
        />
      ))}
    </div>
  );
}

// ── Ring fill animation ───────────────────────────────────────────────────────
function AnimatedRing({ size = 88, stroke = 8 }) {
  const circleRef = useRef(null);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    if (REDUCED || !circleRef.current) return;
    gsap.fromTo(
      circleRef.current,
      { strokeDasharray: `0 ${circ}` },
      { strokeDasharray: `${circ} 0`, duration: 1.2, ease: "power2.out", delay: 0.3 }
    );
  }, [circ]);

  return (
    <svg width={size} height={size} aria-hidden>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${ACCENT}18`} strokeWidth={stroke} />
      <circle
        ref={circleRef}
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={ACCENT} strokeWidth={stroke}
        strokeDasharray={REDUCED ? `${circ} 0` : `0 ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </svg>
  );
}

// ── Main popup ────────────────────────────────────────────────────────────────
export default function RecapPopup() {
  const [recap,   setRecap]   = useState(null);
  const [visible, setVisible] = useState(false);
  const confRef               = useRef(null);
  const celebrations          = useUiStore((s) => s.celebrations);

  useEffect(() => {
    api.get("/api/director/recaps/pending").then(({ data }) => {
      const first = data.items?.[0];
      if (first) { setRecap(first); setVisible(true); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!visible || REDUCED || celebrations === "off" || !confRef.current) return;
    const pieces = confRef.current.querySelectorAll(".confetti-piece");
    pieces.forEach((el, i) => {
      gsap.to(el, {
        y: `+=${250 + Math.random() * 200}`,
        x: `+=${(Math.random() - 0.5) * 200}`,
        rotation: `+=${360 + Math.random() * 360}`,
        opacity: 1,
        duration: 1.2 + Math.random() * 0.8,
        delay: i * 0.02,
        ease: "power1.out",
        onComplete: () => gsap.to(el, { opacity: 0, duration: 0.3 }),
      });
    });
  }, [visible]);

  async function dismiss() {
    if (recap?._id) {
      await api.post(`/api/director/recaps/${recap._id}/seen`).catch(() => {});
    }
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && recap && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="relative w-full max-w-sm rounded-3xl bg-white border border-ink/[0.1] shadow-2xl p-6 flex flex-col items-center gap-4 overflow-hidden"
          >
            <div ref={confRef} className="absolute inset-0 pointer-events-none">
              <Confetti count={60} />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-3 text-center">
              <AnimatedRing size={88} stroke={8} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 0 }}>
                <Calendar size={24} style={{ color: ACCENT }} strokeWidth={1.5} />
              </div>
            </div>

            <div className="relative z-10 text-center">
              <h2 className="text-base font-black text-text-primary mb-1">{recap.periodLabel}</h2>
              <p className="text-xs text-slate-500 capitalize">{recap.type} recap is ready</p>
            </div>

            {recap.cards?.length > 0 && (
              <div className="relative z-10 grid grid-cols-2 gap-2 w-full">
                {recap.cards.slice(0, 4).map((c, i) => (
                  <div key={i} className="rounded-xl bg-ink/[0.03] border border-ink/[0.07] px-3 py-2">
                    <p className="text-lg font-black tabular-nums" style={{ color: ACCENT }}>{c.metric?.value ?? "—"}</p>
                    <p className="text-[11px] font-semibold text-slate-500 leading-tight">{c.title}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={dismiss}
              className="relative z-10 w-full py-2.5 rounded-xl text-white text-sm font-bold min-h-[40px]"
              style={{ background: ACCENT }}
            >
              Got it
            </button>

            <button
              onClick={dismiss}
              className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-ink/[0.06] transition-colors"
              aria-label="Close recap"
            >
              <X size={14} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
