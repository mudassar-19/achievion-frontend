// Readable utilisation: up to 100 % as a percent; above that "Over capacity ×N" (shared-fixes item 7).
export function utilisationLabel(pct) {
  const p = Math.max(0, Math.round(Number(pct) || 0));
  return p <= 100 ? `${p}%` : `Over capacity ×${(p / 100).toFixed(1)}`;
}
export const utilisationBar = (pct) => Math.min(100, Math.max(0, Number(pct) || 0));
