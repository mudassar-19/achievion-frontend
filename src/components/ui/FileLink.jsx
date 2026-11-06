// S-1, S-2 (D-157, D-164): an <a> that opens stored files through a short signed link. Looks and behaves like the plain link;
// outside links (GitHub, Figma) and older public Cloudinary files pass straight through.
import api, { API_URL } from "@/lib/api";
import { signTarget } from "@/utils/fileLinks";

async function open(path) {
  const tab = window.open("about:blank", "_blank"); // now, inside the click: a tab opened after the await gets blocked
  try {
    const { url } = await api.get(`/api/files/sign?path=${encodeURIComponent(path)}`, { silent: true });
    const full = url.startsWith("http") ? url : `${API_URL}${url}`; // Cloudinary answers with a full address
    if (!tab) { window.location.assign(full); return; }
    tab.opener = null;
    tab.location.href = full;
  } catch {
    tab?.close();
    window.dispatchEvent(new CustomEvent("api:error", { detail: { message: "This file could not be opened.", status: 404 } }));
  }
}

export default function FileLink({ href, children, ...rest }) {
  const path = signTarget(href, API_URL);
  const onOpen = (e) => { if (!path) return; if (e.type === "auxclick" && e.button !== 1) return; e.preventDefault(); open(path); };
  return <a href={href} onClick={onOpen} onAuxClick={onOpen} {...rest}>{children}</a>;
}
