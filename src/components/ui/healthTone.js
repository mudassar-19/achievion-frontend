// Health band colours (D-077 bands), status-token text shades.
export const HEALTH_TONE = {
  "On track":  { fg: "#0E6A30", bg: "rgb(var(--c-success) / 0.10)", bd: "rgb(var(--c-success) / 0.28)" },
  "At risk":   { fg: "#7A4B00", bg: "rgb(var(--c-warning) / 0.14)", bd: "rgb(var(--c-warning) / 0.40)" },
  "Off track": { fg: "#B01F17", bg: "rgb(var(--c-danger) / 0.10)",  bd: "rgb(var(--c-danger) / 0.28)" },
  // U-1 (D-134): no tasks yet — neutral, never red.
  "Not started": { fg: "#3A4659", bg: "rgb(74 86 107 / 0.08)", bd: "rgb(74 86 107 / 0.28)" },
};
export const healthColor = (band) => (HEALTH_TONE[band] ?? HEALTH_TONE["On track"]).fg;
