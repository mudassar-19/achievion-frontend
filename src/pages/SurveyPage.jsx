import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import useAuthStore from "@/stores/authStore";

const ACCENT = "#4B2FC4";

// ── Confetti ──────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ["#4B2FC4", "#FFC21A", "#2DC95E", "#FF6B6B", "#4ECDC4", "#C084FC", "#FB923C"];
const PARTICLES = Array.from({ length: 36 }, (_, i) => ({
  id: i,
  left: `${3 + (i * 2.7) % 94}%`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: (i % 8) * 0.09,
  duration: 1.6 + (i % 5) * 0.22,
  size: 7 + (i % 4) * 3,
  shape: i % 3 === 0 ? "circle" : i % 3 === 1 ? "rect" : "star",
}));

function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50" aria-hidden>
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-0"
          style={{ left: p.left }}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", opacity: [1, 1, 0.7, 0], rotate: 360 * (p.id % 2 === 0 ? 1 : -1) }}
          transition={{ delay: p.delay, duration: p.duration, ease: "easeIn" }}
        >
          {p.shape === "circle" && (
            <div style={{ width: p.size, height: p.size, borderRadius: "50%", background: p.color }} />
          )}
          {p.shape === "rect" && (
            <div style={{ width: p.size, height: p.size * 0.55, background: p.color, borderRadius: 2 }} />
          )}
          {p.shape === "star" && (
            <span style={{ fontSize: p.size, lineHeight: 1, color: p.color }}>★</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function dashboardPath(roleCategory) {
  const r = (roleCategory ?? "").toLowerCase();
  if (r === "director") return "/director";
  if (r === "manager")  return "/dashboard";
  return "/dashboard";
}

// SUS items — English only (D-025c)
const SUS_ITEMS = [
  "I think that I would like to use this system frequently.",
  "I found the system unnecessarily complex.",
  "I thought the system was easy to use.",
  "I think that I would need the support of a technical person to be able to use this system.",
  "I found the various functions in this system were well integrated.",
  "I thought there was too much inconsistency in this system.",
  "I would imagine that most people would learn to use this system very quickly.",
  "I found the system very cumbersome to use.",
  "I felt very confident using the system.",
  "I needed to learn a lot of things before I could get going with this system.",
];

function currentWeek() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function RadioRow({ label, name, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-semibold text-text-primary">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="flex items-center gap-1.5 cursor-pointer select-none min-h-[32px]">
            <input
              type="radio" name={name} value={n} checked={value === n}
              onChange={() => onChange(n)}
              className="accent-[#4B2FC4]"
            />
            <span className="text-xs font-semibold text-slate-600">{n}</span>
          </label>
        ))}
        <span className="text-[11px] text-slate-400 self-center">(1=Strongly disagree · 5=Strongly agree)</span>
      </div>
    </div>
  );
}

export default function SurveyPage() {
  const [enjoyable, setEnjoyable] = useState(null);
  const [easy,      setEasy]      = useState(null);
  const [sus,       setSus]       = useState(Array(10).fill(null));
  const [step,      setStep]      = useState("questions"); // questions | submitted | error
  const [errMsg,    setErrMsg]    = useState("");
  const navigate     = useNavigate();
  const roleCategory = useAuthStore((s) => s.user?.roleCategory);

  function setSusItem(i, v) { setSus((prev) => { const next = [...prev]; next[i] = v; return next; }); }

  const allFilled = enjoyable != null && easy != null && sus.every((v) => v != null);

  async function submit() {
    if (!allFilled) return;
    try {
      await api.post("/api/survey", {
        period:         currentWeek(),
        enjoyableScore: enjoyable,
        easyScore:      easy,
        susScores:      sus,
      });
      setStep("submitted");
    } catch (ex) {
      const msg = ex?.response?.data?.error ?? "Submission failed.";
      if (ex?.response?.status === 409) {
        setStep("submitted"); // already submitted — treat as success
      } else {
        setErrMsg(msg);
        setStep("error");
      }
    }
  }

  if (step === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#F7F8FC" }}>
        <Confetti />
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md rounded-3xl bg-white border border-ink/[0.1] shadow-2xl p-10 flex flex-col items-center gap-5 text-center"
        >
          {/* Animated check */}
          <motion.div
            className="h-20 w-20 rounded-3xl flex items-center justify-center"
            style={{ background: `${ACCENT}18` }}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, duration: 0.5, type: "spring", stiffness: 260, damping: 18 }}
          >
            <motion.span
              className="text-4xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >🎉</motion.span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35 }}
            className="flex flex-col gap-2"
          >
            <h1 className="text-2xl font-black text-text-primary">Thank you!</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your response has been recorded.<br />We appreciate your feedback!
            </p>
          </motion.div>

          {/* Navigation buttons */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 w-full pt-2"
          >
            <button
              onClick={() => navigate(dashboardPath(roleCategory))}
              className="flex-1 py-3 rounded-2xl text-white text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: ACCENT }}
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex-1 py-3 rounded-2xl text-sm font-bold border transition-colors hover:bg-ink/[0.05]"
              style={{ borderColor: `${ACCENT}40`, color: ACCENT }}
            >
              Go Back
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#F7F8FC" }}>
        <div className="w-full max-w-md rounded-3xl bg-white border border-red-200 shadow-xl p-8 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-red-600">{errMsg}</p>
          <button onClick={() => setStep("questions")} className="text-sm font-bold underline" style={{ color: ACCENT }}>Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "#F7F8FC" }}>
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="rounded-3xl bg-white border border-ink/[0.1] shadow-xl p-6 flex flex-col gap-1">
          <h1 className="text-lg font-black text-text-primary">User Satisfaction Survey</h1>
          <p className="text-xs text-slate-500">Your answers are anonymous. 2 experience questions + 10 SUS items. About 3 minutes.</p>
        </motion.div>

        {/* 2 experience items */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-3xl bg-white border border-ink/[0.1] shadow-xl p-6 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-text-primary">Experience Questions</h2>
          <RadioRow label="I find this system enjoyable to use." name="enjoyable" value={enjoyable} onChange={setEnjoyable} />
          <RadioRow label="This system is easy to use." name="easy" value={easy} onChange={setEasy} />
        </motion.div>

        {/* 10 SUS items */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-3xl bg-white border border-ink/[0.1] shadow-xl p-6 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-text-primary">System Usability Scale (SUS)</h2>
          <p className="text-[12px] text-slate-500">Rate each statement from 1 (Strongly disagree) to 5 (Strongly agree).</p>
          {SUS_ITEMS.map((item, i) => (
            <RadioRow key={i} label={`${i + 1}. ${item}`} name={`sus_${i}`} value={sus[i]} onChange={(v) => setSusItem(i, v)} />
          ))}
        </motion.div>

        <button onClick={submit} disabled={!allFilled}
          className="py-3 rounded-2xl text-white text-sm font-black disabled:opacity-40 min-h-[44px]"
          style={{ background: ACCENT }}>
          Submit Survey
        </button>
      </div>
    </div>
  );
}
