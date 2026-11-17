// "5 min ago", "2 h ago", "3 d ago" (Nudged 2 h ago, Requested 1 d ago).
export function ago(d, now = Date.now()) {
  const m = Math.max(1, Math.round((now - new Date(d)) / 60000));
  return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
}
