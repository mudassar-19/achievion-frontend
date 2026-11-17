// Pure chat helpers shared by the Chat page and the ChatDock (UI-C). No imports, so `node --test` can run
// chatFormat.test.mjs. The server decides every rule; canPostIn only mirrors server/services/chatRules.js.

// person: undefined = still being looked up, null = the other account is gone, else { name }.
export const dmName = (person) => (person === undefined ? "Loading name…" : person?.name?.trim() || "Deactivated user");

// A group is shown without the project slug its community already names: "habib-grocers-online-store-general" under
// "Habib Grocers Online Store" reads "general". Nothing left after the slug = keep the full name.
export function groupName(name, communityName) {
  const n = String(name ?? ""), slug = String(communityName ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return slug && n.toLowerCase().startsWith(`${slug}-`) && n.length > slug.length + 1 ? n.slice(slug.length + 1) : n;
}

export const chatTitle = (ch, person, communityName) =>
  ch?.type === "dm" ? dmName(person) : ch?.type === "announcement" ? "Announcements" : `#${groupName(ch?.name, communityName)}`;

const dayKey = (d, timeZone) => d.toLocaleDateString("en-CA", { timeZone });
const DAY = 86_400_000;

// "9:05 AM" today, "Nov 14, 9:05 AM" before, with the year when it is not this year. opts: { now, timeZone, hour12 }.
export function chatTime(iso, { now = new Date(), timeZone, hour12 = true } = {}) {
  if (!iso) return "";
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", { hour: hour12 ? "numeric" : "2-digit", minute: "2-digit", hour12, timeZone });
  if (dayKey(d, timeZone) === dayKey(now, timeZone)) return time;
  const sameYear = dayKey(d, timeZone).slice(0, 4) === dayKey(now, timeZone).slice(0, 4);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }), timeZone })}, ${time}`;
}

// Separator between days: "Today", "Yesterday", else "Nov 2, 2026".
export function dayLabel(iso, { now = new Date(), timeZone } = {}) {
  const d = new Date(iso), k = dayKey(d, timeZone);
  if (k === dayKey(now, timeZone)) return "Today";
  if (k === dayKey(new Date(+now - DAY), timeZone)) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone });
}
export const sameDay = (a, b, timeZone) => !!a && !!b && dayKey(new Date(a), timeZone) === dayKey(new Date(b), timeZone);

const senderId = (m) => String(m?.sender?._id ?? m?.sender ?? "");
// The next message continues the previous one: same person, under five minutes later, previous not deleted.
export const sameRun = (prev, msg) =>
  !!prev && !prev.deletedAt && senderId(prev) === senderId(msg) && new Date(msg.createdAt) - new Date(prev.createdAt) < 5 * 60_000;

const has = (list, id) => (list ?? []).some((x) => String(x?._id ?? x) === String(id));
export function canPostIn(ch, user) {
  if (!ch || ch.type === "dm") return true;
  const mode = ch.type === "announcement" ? "admins" : ch.permissions?.sendMessages ?? "everyone";
  return mode !== "admins" || ["Director", "Manager"].includes(user?.role) || has(ch.adminIds, user?.id) || has(ch.posterIds, user?.id);
}

export const unreadTotal = (list) => list.reduce((n, c) => n + (c.muted ? 0 : c.unread ?? 0), 0);
export const badge = (n) => (n > 99 ? "99+" : n > 0 ? String(n) : "");
