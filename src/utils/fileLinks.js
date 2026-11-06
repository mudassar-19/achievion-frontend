// S-1, S-2: stored files that need a signed link. Outside links and older public Cloudinary files return null and open as they are.
export function signTarget(href, apiUrl) {
  const h = String(href ?? "");
  if (/^https:\/\/res\.cloudinary\.com\/[^/]+\/[a-z]+\/authenticated\//.test(h)) return h;
  const p = h.startsWith(apiUrl) ? h.slice(apiUrl.length) : h;
  return p.startsWith("/uploads/") ? p : null;
}
