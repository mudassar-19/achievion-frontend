// One HP scale for every screen (V1 1.11g). Below HP_BURNOUT the employee gets a burnout_risk notice
// (server/services/xpEngine.js uses the same 30).
export const HP_BURNOUT = 30;
export const HP_HEALTHY = 60;

export function hpTier(hp) {
  const v = Number(hp) || 0;
  if (v >= HP_HEALTHY) return { key: "healthy", label: "Healthy",      color: "#0E6A30" };
  if (v >= HP_BURNOUT) return { key: "tired",   label: "Tired",        color: "#7A5200" };
  return                      { key: "burnout", label: "Burnout risk", color: "#B01F17" };
}

export const hpColor = (hp) => hpTier(hp).color;
