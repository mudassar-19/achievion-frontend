import { useEffect } from "react";

// FE-R027: avatars come from api.dicebear.com. When that host cannot be reached (offline,
// blocked, outage) show an initials circle instead of a broken image.
export default function ImageFallback() {
  useEffect(() => {
    function onError(e) {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || img.dataset.fallback || !/dicebear\.com/.test(img.src)) return;
      img.dataset.fallback = "1";
      const letter = (img.alt || new URL(img.src).searchParams.get("seed") || "?").trim()[0]?.toUpperCase() ?? "?";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#EAEDF4"/><text x="32" y="42" font-family="sans-serif" font-size="28" font-weight="700" text-anchor="middle" fill="#3A4660">${letter.replace(/[<&]/g, "?")}</text></svg>`;
      img.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }
    document.addEventListener("error", onError, true); // image errors do not bubble, so capture
    return () => document.removeEventListener("error", onError, true);
  }, []);
  return null;
}
