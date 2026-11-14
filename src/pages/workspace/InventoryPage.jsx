/**
 * InventoryPage — equip/unequip owned cosmetics (D-244)
 * Route: /workspace/inventory
 */
import { useState, useEffect, useCallback } from "react";
import { Package, Snowflake, Coins, CheckCircle2, Loader2, AlertCircle, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/lib/api";

const SLOT_LABELS = { frame: "Avatar Frame", badge: "Badge", title: "Title" };
const SLOTS = ["frame", "badge", "title"];

function CosmeticCard({ item, equipped, equipping, onEquip, onUnequip }) {
  const isEquipped = equipped[item.slot] === item.id;
  const busy = equipping === item.id || equipping === `unequip-${item.slot}`;

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-200 ${isEquipped ? "border-accent bg-accent/5" : "border-ink/[0.08] bg-bg-surface"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-text-primary">{item.name}</p>
          <p className="text-xs text-text-secondary capitalize">{SLOT_LABELS[item.slot] ?? item.slot}</p>
        </div>
        {isEquipped && <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />}
      </div>
      {isEquipped ? (
        <button
          type="button"
          onClick={() => onUnequip(item.slot)}
          disabled={busy}
          className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl border border-ink/[0.08] bg-bg-base py-2 text-xs font-bold text-text-secondary transition hover:border-ink/[0.2] disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : "Unequip"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onEquip(item.id)}
          disabled={busy}
          className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent py-2 text-xs font-bold text-white transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : "Equip"}
        </button>
      )}
    </div>
  );
}

export default function InventoryPage() {
  const [inv, setInv]         = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [equipping, setEquipping] = useState(null);
  const [toast, setToast]     = useState(null);
  const [err, setErr]         = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [invData, catData] = await Promise.all([
        api.get("/api/shop/inventory"),
        api.get("/api/shop/catalog"),
      ]);
      setInv(invData);
      setCatalog(catData.items);
    } catch (e) {
      setErr(e.message ?? "Failed to load inventory.");
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const equip = useCallback(async (itemId) => {
    setEquipping(itemId);
    try {
      await api.patch("/api/shop/equip", { itemId });
      setToast("Equipped!");
      setTimeout(() => setToast(null), 2500);
      await load();
    } catch (e) {
      setToast(`Failed: ${e.message ?? "Equip error"}`);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setEquipping(null);
    }
  }, [load]);

  const unequip = useCallback(async (slot) => {
    setEquipping(`unequip-${slot}`);
    try {
      await api.patch("/api/shop/unequip", { slot });
      setToast("Unequipped.");
      setTimeout(() => setToast(null), 2500);
      await load();
    } catch (e) {
      setToast(`Failed: ${e.message ?? "Unequip error"}`);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setEquipping(null);
    }
  }, [load]);

  const ownedIds = new Set(inv?.ownedCosmetics ?? []);
  const ownedItems = catalog?.filter(i => i.type === "cosmetic" && ownedIds.has(i.id)) ?? [];
  const equipped = inv?.equipped ?? {};

  const bySlot = SLOTS.reduce((acc, s) => {
    acc[s] = ownedItems.filter(i => i.slot === s);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
            <Package size={22} strokeWidth={2} /> Inventory
          </h1>
          <p className="mt-1 text-sm text-text-secondary">Equip cosmetics you've purchased from the shop.</p>
        </div>
        <div className="flex gap-3 text-sm font-bold">
          {inv && (
            <>
              <span className="flex items-center gap-1.5 rounded-xl border border-ink/[0.08] bg-bg-surface px-3 py-1.5">
                <Coins size={14} strokeWidth={2.2} className="text-amber-600" />{(inv.gold ?? 0).toLocaleString()} gold
              </span>
              <span className="flex items-center gap-1.5 rounded-xl border border-ink/[0.08] bg-bg-surface px-3 py-1.5">
                <Snowflake size={14} strokeWidth={2.2} className="text-blue-500" />{inv.freezeCount ?? 0} freeze{(inv.freezeCount ?? 0) !== 1 ? "s" : ""}
              </span>
            </>
          )}
          <Link
            to="/workspace/shop"
            className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-white hover:opacity-90"
          >
            <ShoppingBag size={13} /> Shop
          </Link>
        </div>
      </div>

      {err && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400">
          <AlertCircle size={16} /> {err}
        </div>
      )}

      {(inv === null || catalog === null) && !err && (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-text-secondary" /></div>
      )}

      {inv !== null && catalog !== null && ownedItems.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Package size={40} strokeWidth={1.3} className="text-text-secondary/40" />
          <p className="text-sm font-semibold text-text-secondary">No cosmetics yet.</p>
          <Link to="/workspace/shop" className="text-sm font-bold text-accent hover:underline">
            Visit the Shop →
          </Link>
        </div>
      )}

      {inv !== null && catalog !== null && ownedItems.length > 0 && (
        <div className="space-y-8">
          {SLOTS.map(slot => bySlot[slot].length > 0 && (
            <section key={slot}>
              <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-text-secondary">
                {SLOT_LABELS[slot]}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {bySlot[slot].map(item => (
                  <CosmeticCard
                    key={item.id}
                    item={item}
                    equipped={equipped}
                    equipping={equipping}
                    onEquip={equip}
                    onUnequip={unequip}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-ink/[0.08] bg-bg-surface px-5 py-3 text-sm font-semibold text-text-primary shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
