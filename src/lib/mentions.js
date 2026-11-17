// Items 73, 74, 75 (D-545): who an @ list or the New DM search shows, in what order, and the keys that move through it.
// One place for task comments (every role) and group chat. Pure. Tests: mentions.test.mjs.
const idOf = (p) => String(p?.id ?? p?._id ?? "");
const words = (name) => String(name ?? "").toLowerCase().split(/\s+/).filter(Boolean);

// Prefix matches first (the whole name, then any word of it); with { contains: true } names that only contain the text follow.
// Empty text lists everyone, alphabetically.
export function rankPeople(list, text, { contains = false } = {}) {
  const q = String(text ?? "").trim().toLowerCase();
  const by = (a, b) => a.name.localeCompare(b.name);
  if (!q) return [...list].sort(by);
  const score = (p) => { const n = String(p.name ?? "").toLowerCase(); return n.startsWith(q) ? 0 : words(n).some((w) => w.startsWith(q)) ? 1 : contains && n.includes(q) ? 2 : 9; };
  return list.map((p) => [score(p), p]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0] || by(a[1], b[1])).map(([, p]) => p);
}

// The @ list: the signed-in person never appears (items 73/75), prefix matches only (item 74).
export function mentionCandidates(members, meId, text, limit = 6) {
  const me = meId == null ? null : String(meId);
  return rankPeople((members ?? []).filter((p) => !me || idOf(p) !== me), text).slice(0, limit);
}

// Up and Down wrap around; any other key leaves the highlight where it is.
export const nextIndex = (i, key, n) => (!n ? 0 : key === "ArrowDown" ? (i + 1) % n : key === "ArrowUp" ? (i + n - 1) % n : i);

// Cuts text into plain and "@Name" parts for the names given (longest first, only at a word start, not inside a longer word),
// so the composer overlay and the sent message colour the same people.
export function splitMentions(text, names) {
  const s = String(text ?? ""), list = [...new Set((names ?? []).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!list.length) return [{ text: s }];
  const esc = list.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])@(${esc})(?![\\p{L}\\p{N}])`, "gu"), out = [];
  let last = 0, m;
  while ((m = re.exec(s))) {
    const at = m.index + m[1].length;
    if (at > last) out.push({ text: s.slice(last, at) });
    out.push({ text: `@${m[2]}`, mention: true }); last = at + 1 + m[2].length;
  }
  if (last < s.length || !out.length) out.push({ text: s.slice(last) });
  return out;
}

// The "@name" being typed at the caret: only at the start of a word (so an e-mail address is not one), names of up to 30 characters.
export function activeMention(text, caret) {
  const m = /(^|[^\p{L}\p{N}])@([\p{L}\p{N} .'-]{0,30})$/u.exec(String(text).slice(0, caret));
  return m ? { start: caret - m[2].length - 1, text: m[2] } : null;
}
