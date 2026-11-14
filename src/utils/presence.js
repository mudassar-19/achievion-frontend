// Last seen in words (Batch 5, X17, FR01-11). Pure; the server sends only the date (and only to Directors, Managers and
// Team Leads on their rosters). Tests: server/tests/b5Rules.test.mjs.
export const ONLINE_MS = 5 * 60_000;
const n = (c, unit) => `${c} ${unit}${c === 1 ? "" : "s"} ago`;
export function presenceOf(last, now = new Date()) {
  if (!last) return { state: "never", label: "Not seen yet" };
  const ms = Math.max(0, +now - +new Date(last));
  if (ms < ONLINE_MS) return { state: "online", label: "Online now" };
  const min = Math.floor(ms / 60_000), h = Math.floor(min / 60), d = Math.floor(h / 24);
  return { state: "away", label: `Last seen ${min < 60 ? n(min, "minute") : h < 24 ? n(h, "hour") : d === 1 ? "yesterday" : n(d, "day")}` };
}
