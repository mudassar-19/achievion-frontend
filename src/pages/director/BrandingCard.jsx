// Organisation logo (Batch 5, D7; FR12-01). Director only. PNG, JPG or WebP up to 1 MB; the server checks the file's
// content again. The logo shows in every portal's header and on report PDFs (PNG and JPG); without one the default look stays.
import { useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import useLoad from "@/pages/manager/project/useLoad";
import OrgLogo from "@/components/ui/OrgLogo";
import { BTN } from "@/components/ui/buttons";

const TYPES = ["image/png", "image/jpeg", "image/webp"], MAX = 1024 * 1024;

export default function BrandingCard() {
  const { data, setData } = useLoad("/api/auth/branding");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const input = useRef(null);
  const done = (logo, message) => { setData({ ...data, logo }); window.dispatchEvent(new Event("branding:changed")); useUiStore.getState().addToast({ type: "success", message }); };
  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProblem(null);
    if (!TYPES.includes(file.type)) return setProblem("Choose a PNG, JPG or WebP image. SVG is not accepted.");
    if (file.size > MAX) return setProblem(`This image is ${(file.size / MAX).toFixed(1)} MB. The limit is 1 MB.`);
    setBusy(true);
    try {
      const form = new FormData(); form.append("logo", file);
      const r = await api.upload("/api/director/branding/logo", form);
      done(r.logo, "Logo updated. It now shows in the header for everyone.");
    } catch (err) { setProblem(err?.message ?? "The logo could not be uploaded."); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setProblem(null);
    try { await api.delete("/api/director/branding/logo"); done(null, "Logo removed. The default look is back."); }
    catch (err) { setProblem(err?.message ?? "The logo could not be removed."); }
    finally { setBusy(false); }
  }
  return (
    <div data-branding className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <div className="flex h-16 w-40 items-center justify-center rounded-xl border border-dashed border-ink/20 bg-white px-3">
        {data?.logo ? <OrgLogo className="max-h-12 max-w-full" /> : <span className="text-xs text-text-secondary">No logo yet</span>}
      </div>
      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input ref={input} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="sr-only" id="org-logo-file" onChange={pick} />
          <button type="button" className={BTN.secondary} disabled={busy} onClick={() => input.current?.click()}><ImageUp size={14} aria-hidden="true" />{busy ? "Working…" : data?.logo ? "Replace logo" : "Upload logo"}</button>
          {data?.logo && <button type="button" className={BTN.ghost} disabled={busy} onClick={remove}><Trash2 size={14} aria-hidden="true" />Remove</button>}
        </div>
        <p className="text-xs text-text-secondary">PNG, JPG or WebP, up to 1 MB. Shown in the header of every portal and on report PDFs (PNG and JPG).</p>
        {problem && <p role="alert" className="text-sm text-[#B01F17]">{problem}</p>}
      </div>
    </div>
  );
}
