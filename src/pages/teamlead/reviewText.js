// Labels shared by the review queue, review page and handoff view (T-4).
export const AI_LABEL = { ready: "AI ready", partial: "AI partial", pending: "AI running", not_available: "AI not available" };
export const QA_LABEL = { waiting: "QA waiting", passed: "QA passed", failed: "QA failed", conditional: "QA conditional" };
export const QA_TONE = {
  waiting: { fg: "#7A4B00", bg: "rgb(var(--c-warning) / 0.14)" },
  passed: { fg: "#0E6A30", bg: "rgb(var(--c-success) / 0.10)" },
  failed: { fg: "#B01F17", bg: "rgb(var(--c-danger) / 0.10)" },
  conditional: { fg: "#7A4B00", bg: "rgb(var(--c-warning) / 0.14)" },
};
export const stars = (n) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
export const scoreToStars = (s) => Math.min(5, Math.max(1, Math.round(s / 20))); // same as server xpEngine.scoreToStars
