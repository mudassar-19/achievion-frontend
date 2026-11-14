// Asset booking drawer (D-295-b, IMPL-5b).
// Manager: list active bookings, create a booking, cancel with confirm.
import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Plus, X, Loader2, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Drawer from "@/components/ui/Drawer";
import { BTN } from "@/components/ui/buttons";
import ConfirmModal from "@/components/ui/ConfirmModal";

function fmtDay(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function BookingsDrawer({ open, asset, onClose }) {
  const addToast = useUiStore((s) => s.addToast);
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ from: "", to: "", note: "" });
  const [formErr,  setFormErr]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [cancelling, setCancelling] = useState(null); // booking to cancel
  const [cancelBusy, setCancelBusy] = useState(false);

  const BASE = asset ? `/api/manager/assets/${asset.id ?? asset._id}/bookings` : null;

  const load = useCallback(async () => {
    if (!BASE) return;
    setLoading(true);
    try { setBookings((await api.get(BASE)).bookings ?? []); }
    catch { setBookings([]); }
    finally { setLoading(false); }
  }, [BASE]);

  useEffect(() => { if (open) { load(); setShowForm(false); setFormErr(""); } }, [open, load]);

  async function handleBook(e) {
    e.preventDefault();
    if (!form.from || !form.to) return setFormErr("From and to dates are required.");
    if (form.to < form.from) return setFormErr("“To” must be on or after “From”.");
    setFormErr(""); setSaving(true);
    try {
      const { booking } = await api.post(BASE, {
        from: new Date(form.from + "T00:00:00.000Z").toISOString(),
        to:   new Date(form.to   + "T23:59:59.999Z").toISOString(),
        note: form.note.trim() || undefined,
      });
      setBookings((b) => [...b, booking].sort((a, z) => new Date(a.from) - new Date(z.from)));
      setShowForm(false); setForm({ from: "", to: "", note: "" });
      addToast({ type: "success", message: "Asset booked." });
    } catch (err) {
      setFormErr(err?.message ?? "Booking failed.");
    } finally { setSaving(false); }
  }

  async function handleCancel() {
    if (!cancelling) return;
    setCancelBusy(true);
    try {
      await api.delete(`${BASE}/${cancelling._id}`);
      setBookings((b) => b.filter((x) => x._id !== cancelling._id));
      addToast({ type: "success", message: "Booking cancelled." });
      setCancelling(null);
    } catch (err) { addToast({ type: "error", message: err?.message ?? "Could not cancel." }); }
    finally { setCancelBusy(false); }
  }

  return (
    <Drawer open={open} onClose={onClose} title={asset ? `Bookings — ${asset.name}` : "Bookings"} width={600}
      footer={(
        <div className="flex justify-between items-center gap-3">
          {!showForm && (
            <button type="button" className={BTN.primary} onClick={() => { setShowForm(true); setFormErr(""); }}>
              <Plus size={15} aria-hidden /> Book this asset
            </button>
          )}
          <button type="button" className={BTN.ghost} onClick={onClose}>Close</button>
        </div>
      )}>

      {/* Booking form */}
      {showForm && (
        <form onSubmit={handleBook} className="mb-5 flex flex-col gap-3 rounded-xl border border-ink/[0.1] bg-bg-muted p-4">
          <p className="text-sm font-bold text-text-primary flex items-center gap-2"><CalendarDays size={14} aria-hidden />New booking</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-text-secondary">From date</span>
              <input type="date" required value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
                className="h-9 rounded-xl border border-border-subtle bg-bg-surface px-3 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-text-secondary">To date</span>
              <input type="date" required value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                className="h-9 rounded-xl border border-border-subtle bg-bg-surface px-3 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-text-secondary">Note (optional)</span>
            <input type="text" maxLength={200} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="What is this for?"
              className="h-9 rounded-xl border border-border-subtle bg-bg-surface px-3 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" />
          </label>
          {formErr && (
            <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-[#B01F17]/20 bg-rose-500/5 px-3 py-2 text-[12px] font-semibold text-[#B01F17]">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" aria-hidden />{formErr}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={BTN.primary}>
              {saving && <Loader2 size={14} className="animate-spin" />}Confirm booking
            </button>
            <button type="button" className={BTN.ghost} onClick={() => { setShowForm(false); setFormErr(""); }}>
              <X size={14} aria-hidden />Cancel
            </button>
          </div>
        </form>
      )}

      {/* Bookings list */}
      {loading ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading bookings">
          {[0,1,2].map(i => <div key={i} className="h-14 rounded-xl bg-ink/[0.05] animate-pulse" />)}
        </div>
      ) : bookings.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">No active bookings. Use "Book this asset" to reserve it.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bookings.map((b) => (
            <li key={b._id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">{fmtDay(b.from)} – {fmtDay(b.to)}</p>
                <p className="mt-0.5 text-[12px] text-text-secondary">
                  {b.bookedBy?.name ?? "Unknown"}{b.projectId?.title ? ` · ${b.projectId.title}` : ""}
                  {b.note ? <> · <span className="italic">"{b.note}"</span></> : null}
                </p>
              </div>
              <button type="button" onClick={() => setCancelling(b)}
                className="shrink-0 flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors">
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Cancel confirm */}
      <ConfirmModal open={!!cancelling} onClose={() => setCancelling(null)} onConfirm={handleCancel} loading={cancelBusy}
        destructive confirmLabel="Cancel booking"
        title="Cancel this booking?"
        body={cancelling ? `Booking from ${fmtDay(cancelling.from)} to ${fmtDay(cancelling.to)} will be freed. This cannot be undone.` : ""} />
    </Drawer>
  );
}
