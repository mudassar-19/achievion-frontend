// Director AI chat history (UI-E2, master list item 30). One store for the full Ask page and the top-bar panel, kept in this
// browser per person (localStorage, key per user id): nothing is on the server yet, so another device does not see it.
// The pure helpers have no imports so aiChats.test.mjs runs with `node --test`; the read/write wrappers are at the bottom.

export const MAX_CHATS = 40;
const TITLE_MAX = 50;
const NAME_MAX = 60;

export const storageKey = (userId) => `achievion-ai-chats:${userId ?? "anonymous"}`;

// First question as the name, on one line, cut at 50 characters.
export function makeTitle(question) {
  const q = String(question ?? "").replace(/\s+/g, " ").trim();
  if (!q) return "New chat";
  return q.length > TITLE_MAX ? `${q.slice(0, TITLE_MAX)}…` : q;
}

// Add or update a chat; it moves to the top. The title is set once (from the first question) and kept.
export function upsertChat(chats, { id, firstQuestion, messages, now = new Date().toISOString() }) {
  const old = chats.find((c) => c.id === id);
  const entry = { id, title: old?.title ?? makeTitle(firstQuestion), messages, createdAt: old?.createdAt ?? now, updatedAt: now };
  return [entry, ...chats.filter((c) => c.id !== id)].sort((a, b) => String(b.updatedAt ?? b.createdAt).localeCompare(String(a.updatedAt ?? a.createdAt))).slice(0, MAX_CHATS);
}

export function renameChat(chats, id, name) {
  const n = String(name ?? "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
  return n ? chats.map((c) => (c.id === id ? { ...c, title: n } : c)) : chats;
}

export const deleteChat = (chats, id) => chats.filter((c) => c.id !== id);

// id → a title that no other chat in the list has: the oldest keeps the plain title, newer ones get (2), (3).
export function uniqueTitles(chats) {
  const seen = {}, out = {};
  for (const c of [...chats].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))) {
    const n = (seen[c.title] = (seen[c.title] ?? 0) + 1);
    out[c.id] = n === 1 ? c.title : `${c.title} (${n})`;
  }
  return out;
}

// ── Browser storage (try/catch: storage can be blocked) ───────────────────────
export function loadChats(userId) {
  try {
    const own = localStorage.getItem(storageKey(userId));
    if (own !== null) return JSON.parse(own);
    // One-time move of the old shared key (one list for the whole browser) to the first person who opens it.
    const legacy = localStorage.getItem("achievion-ai-chats");
    if (legacy !== null) {
      const list = JSON.parse(legacy).map((c) => ({ ...c, updatedAt: c.updatedAt ?? c.createdAt }));
      localStorage.setItem(storageKey(userId), JSON.stringify(list));
      localStorage.removeItem("achievion-ai-chats");
      return list;
    }
  } catch { /* unreadable: start empty */ }
  return [];
}
export function saveChats(userId, chats) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(chats.slice(0, MAX_CHATS))); } catch { /* storage blocked */ }
}
