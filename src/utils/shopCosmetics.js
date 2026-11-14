/**
 * Shop cosmetics display helpers (D-244 / D-246)
 * Shared by LeaderboardPage, ProfilePage, and any future avatars.
 */

export const COSMETIC_META = {
  frame_gold:      { slot: "frame", label: "Gold Frame",      ring: "#C69007", glow: "rgba(198,144,7,0.25)" },
  frame_diamond:   { slot: "frame", label: "Diamond Frame",   ring: "#1B6FDE", glow: "rgba(27,111,222,0.25)" },
  badge_fire:      { slot: "badge", label: "Fire Badge",      emoji: "🔥" },
  badge_lightning: { slot: "badge", label: "Lightning Badge", emoji: "⚡" },
  title_veteran:   { slot: "title", label: "Veteran",   color: "#7A5200" },
  title_champion:  { slot: "title", label: "Champion",  color: "#6C1FA7" },
};

/** Returns the CSS ring style for a frame itemId, or null if none equipped. */
export function frameStyle(itemId) {
  const m = COSMETIC_META[itemId];
  if (!m || m.slot !== "frame") return null;
  return { outline: `2.5px solid ${m.ring}`, outlineOffset: "1px", boxShadow: `0 0 6px 1px ${m.glow}` };
}

/** Returns the emoji for a badge itemId, or null. */
export function badgeEmoji(itemId) {
  const m = COSMETIC_META[itemId];
  return m?.slot === "badge" ? m.emoji : null;
}

/** Returns { label, color } for a title itemId, or null. */
export function titleMeta(itemId) {
  const m = COSMETIC_META[itemId];
  return m?.slot === "title" ? { label: m.label, color: m.color } : null;
}
