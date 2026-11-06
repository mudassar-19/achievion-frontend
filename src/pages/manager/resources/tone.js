// Workload colours (UX §7): amber above 85 %, red above 100 %; the bar never passes 100 %.
export const TONE = {
  ok:    { bar: "var(--accent)", text: "var(--text-secondary)" },
  amber: { bar: "#D97706",       text: "#7A4B00" },
  red:   { bar: "#D1291F",       text: "#B01F17" },
};
// Status badge → StatusChip colour key.
export const STATUS_KEY = { Available: "approved", Active: "maintenance", Overloaded: "at_risk" };
