// Community tile data (E-C 7, D-QA3B-8). A community stores `icon` (a name from ICON_NAMES) and `color` (a key of COMMUNITY_COLORS);
// old rows hold an emoji or nothing, then the tile shows the first letter on a colour taken from the name. Pure, no React.
export const ICON_NAMES = ["chat", "team", "rocket", "code", "design", "idea", "work", "star", "shield"];
// background / strong text pairs: the text on its tint is at least 4.5:1.
export const COMMUNITY_COLORS = {
  indigo: ["#E0E7FF", "#3730A3"], teal: ["#CCFBF1", "#115E59"], amber: ["#FEF3C7", "#92400E"], rose: ["#FFE4E6", "#9F1239"],
  violet: ["#EDE9FE", "#5B21B6"], sky: ["#E0F2FE", "#075985"], emerald: ["#D1FAE5", "#065F46"], slate: ["#E2E8F0", "#334155"],
};
const NAMES = Object.keys(COMMUNITY_COLORS);

export function colourFor(community) {
  if (COMMUNITY_COLORS[community?.color]) return community.color;
  let h = 0;
  for (const ch of String(community?.name ?? "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NAMES[h % NAMES.length];
}
