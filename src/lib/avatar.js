// Avatars rendered locally with DiceBear (no call to api.dicebear.com, works offline). Exact pin 9.4.2.
// Only "bottts" (the default everywhere) is in the main bundle; the other styles load on demand
// (Avatar page) through loadAvatarStyles(), so the login page stays small.
import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";

const STYLES = { bottts };
let loading = null;
export function loadAvatarStyles() {
  loading ??= import("@dicebear/collection").then((c) => {
    Object.assign(STYLES, {
      "pixel-art": c.pixelArt, "fun-emoji": c.funEmoji, identicon: c.identicon, shapes: c.shapes,
      adventurer: c.adventurer, lorelei: c.lorelei, thumbs: c.thumbs, micah: c.micah, avataaars: c.avataaars,
      miniavs: c.miniavs, notionists: c.notionists, croodles: c.croodles, "open-peeps": c.openPeeps,
    });
    cache.clear();
  });
  return loading;
}

const cache = new Map(); // ponytail: unbounded; fine for the few hundred seeds an org has
export function avatarUrl(style, seed, options = {}) {
  const key = `${style}|${seed}|${JSON.stringify(options)}`;
  let uri = cache.get(key);
  if (!uri) {
    uri = createAvatar(STYLES[style] ?? bottts, { seed: String(seed ?? "user"), ...options }).toDataUri();
    cache.set(key, uri);
  }
  return uri;
}
