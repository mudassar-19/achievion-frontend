import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { Link } from "react-router-dom";

// FL-06: project-complete celebration moment.
// Shown when Director opens portfolio and a project just reached status=Done
// (not yet celebrated — tracked in localStorage).
// Respects prefers-reduced-motion: no particle animation, overlay still shows.

const CONFETTI = Array.from({ length: 20 }, (_, i) => ({
  x: `${4 + (i * 4.7) % 92}%`,
  y: `${8 + (i * 6.3) % 55}%`,
  w: `${5 + (i % 4) * 3}px`,
  h: `${5 + (i % 3) * 4}px`,
  color: ["#4B2FC4", "#E5A823", "#10B981", "#EF4444", "#3B82F6"][i % 5],
  rot: i * 19,
}));

const REDUCE_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function ProjectCelebrationOverlay({ project, onClose }) {
  const particlesRef = useRef(null);

  useEffect(() => {
    if (!project || REDUCE_MOTION || !particlesRef.current) return;
    const ctx = gsap.context(() => {
      const els = particlesRef.current.querySelectorAll(".cel-particle");
      if (!els.length) return;
      gsap.from(els, {
        y: -70, opacity: 0, scale: 0.2, stagger: 0.04, duration: 0.65,
        ease: "back.out(1.8)",
      });
      gsap.to(els, {
        y: 110, opacity: 0,
        stagger: { each: 0.04, from: "random" },
        duration: 1.1, delay: 1.8, ease: "power2.in",
      });
    }, particlesRef);
    return () => ctx.revert();
  }, [project]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 pointer-events-auto"
          style={{ background: "rgba(10,15,30,0.72)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="proj-celebrate-title"
            className="relative bg-bg-surface rounded-[20px] px-6 sm:px-10 py-8 max-w-sm w-full text-center overflow-hidden"
            style={{
              boxShadow: "0 12px 64px rgba(0,0,0,0.45)",
              border: "2px solid var(--gold-edge, #E5A82340)",
            }}
            initial={{ scale: 0.88, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Confetti particles — hidden when reduced-motion */}
            {!REDUCE_MOTION && (
              <div ref={particlesRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
                {CONFETTI.map((c, i) => (
                  <span
                    key={i}
                    className="cel-particle absolute rounded-sm"
                    style={{
                      left: c.x, top: c.y,
                      width: c.w, height: c.h,
                      background: c.color,
                      transform: `rotate(${c.rot}deg)`,
                    }}
                  />
                ))}
              </div>
            )}

            <div className="relative z-10 flex flex-col items-center">
              <span className="text-5xl mb-3" role="img" aria-label="celebration">🎉</span>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1.5">
                Project Complete
              </p>
              <h2
                id="proj-celebrate-title"
                className="text-xl font-bold text-text-primary leading-snug"
              >
                {project.title}
              </h2>
              <p className="text-sm text-slate-400 mt-2 max-w-[220px]">
                This project has crossed the finish line.
              </p>

              <div className="flex flex-col gap-2 mt-7 w-full">
                <Link
                  to="/director/reports"
                  onClick={onClose}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent text-accent-on font-bold text-sm"
                >
                  View Report
                </Link>
                <button
                  onClick={onClose}
                  className="text-sm text-slate-400 hover:text-text-primary transition-colors py-2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
