// Workload limit (FR11-03): Director default, Manager override for their team.
import { useEffect, useState } from "react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Drawer from "@/components/ui/Drawer";
import { BTN } from "@/components/ui/buttons";

export default function ThresholdDrawer({ open, onClose, threshold, onSaved }) {
  const addToast = useUiStore((s) => s.addToast);
  const [pct, setPct] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setPct(String(threshold?.pct ?? 100)); setError(null); } }, [open, threshold]); // eslint-disable-line react-hooks/set-state-in-effect

  async function save(value) {
    const n = value === null ? null : Number(pct);
    if (n !== null && (!Number.isInteger(n) || n < 50 || n > 150)) { setError("Pick a whole number from 50 to 150."); document.getElementById("wl-pct")?.focus(); return; }
    setBusy(true);
    try {
      const r = await api.put("/api/manager/resources/threshold", { pct: n });
      addToast({ type: "success", message: r.override == null ? `Limit set back to the Director default (${r.pct}%).` : `Limit set to ${r.pct}%.` });
      onSaved(); onClose();
    } catch (e) { setError(e?.data?.fields?.pct ?? e?.message ?? "The limit could not be saved."); }
    finally { setBusy(false); }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Workload limit"
      footer={<div className="flex justify-between gap-2">
        <button type="button" className={BTN.ghost} disabled={busy || threshold?.override == null} onClick={() => save(null)}>Use Director default</button>
        <span className="flex gap-2"><button type="button" className={BTN.secondary} onClick={onClose}>Cancel</button>
          <button type="button" className={BTN.primary} disabled={busy} onClick={() => save()}>{busy ? "Saving…" : "Save limit"}</button></span></div>}>
      <div className="flex flex-col gap-4 p-5 text-sm">
        <p className="text-text-secondary">Above this share of daily capacity a person shows as <strong className="text-text-primary">Overloaded</strong> and you get an alert. The Director's default is <strong className="text-text-primary">{threshold?.default ?? 100}%</strong>; your limit applies to your view only.</p>
        <label htmlFor="wl-pct" className="flex flex-col gap-1.5 font-bold text-text-primary">Limit (% of daily capacity)
          <input id="wl-pct" type="number" inputMode="numeric" min={50} max={150} step={1} value={pct} onChange={(e) => { setPct(e.target.value); setError(null); }}
            aria-invalid={!!error} aria-describedby="wl-help" className="h-10 w-32 rounded-xl px-3 font-normal tabular-nums" />
          <span id="wl-help" className={`text-xs ${error ? "font-semibold text-[#B01F17]" : "font-normal text-text-secondary"}`}>{error ?? "50 to 150. The busy/free tiers themselves do not change."}</span>
        </label>
      </div>
    </Drawer>
  );
}
