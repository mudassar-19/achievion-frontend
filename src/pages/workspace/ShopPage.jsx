/**
 * ShopPage — Employee shop for cosmetics + Streak Freeze (D-243/D-246)
 * Route: /workspace/shop
 */
import { useState, useEffect, useCallback } from "react";
import { ShoppingBag, Coins, Lock, CheckCircle2, Loader2, Snowflake, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import useGamificationStore from "@/stores/gamificationStore";

const RARITY_COLORS = {
  common:    "text-text-secondary border-ink/[0.12] bg-bg-surface",
  rare:      "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800",
  epic:      "text-purple-600 border-purple-200 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-800",
  legendary: "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800",
};

const TYPE_ICONS = {
  consumable: Snowflake,
  cosmetic:   ShoppingBag,
};

function ItemCard({ item, onBuy, buying }) {
  const Icon = TYPE_ICONS[item.type] ?? ShoppingBag;
  const locked  = !item.unlocked;
  const owned   = item.owned;
  const canBuy  = !locked && !owned && item.affordable;
  const rarity  = item.rarity ?? "common";

  return (
    <div className={`relative flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-200 ${locked ? "opacity-60" : ""} ${RARITY_COLORS[rarity] ?? RARITY_COLORS.common}`}>
      {/* Icon + name */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-base border border-ink/[0.08]">
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text-primary truncate">{item.name}</p>
          <p className="text-xs text-text-secondary capitalize">{item.type}{item.slot ? ` · ${item.slot}` : ""}</p>
        </div>
        {owned && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
        {locked && <Lock size={14} className="text-text-secondary shrink-0" />}
      </div>

      {/* Price */}
      <div className="flex items-center gap-1.5 text-sm font-bold">
        <Coins size={13} strokeWidth={2.2} className="text-amber-600" />
        <span className={item.affordable ? "text-text-primary" : "text-red-500"}>{item.price}</span>
      </div>

      {/* Unlock requirement */}
      {locked && item.lockReason && (
        <p className="text-xs text-text-secondary">{item.lockReason}</p>
      )}
      {locked && !item.lockReason && item.unlockLevel && (
        <p className="text-xs text-text-secondary">Reach level {item.unlockLevel}</p>
      )}

      {/* Buy button */}
      {!owned && !locked && (
        <button
          type="button"
          onClick={() => onBuy(item)}
          disabled={!canBuy || buying === item.id}
          className={`mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
            canBuy
              ? "bg-accent text-white hover:opacity-90 active:scale-[0.98]"
              : "bg-bg-base border border-ink/[0.08] text-text-secondary cursor-not-allowed"
          }`}
        >
          {buying === item.id
            ? <Loader2 size={12} className="animate-spin" />
            : canBuy ? "Buy" : <><Coins size={11} />Not enough gold</>}
        </button>
      )}
      {owned && (
        <div className="mt-auto flex items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 py-2 text-xs font-bold text-emerald-600">
          <CheckCircle2 size={12} /> Owned
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  const [catalog, setCatalog]   = useState(null);
  const [gold, setGold]         = useState(0);
  const [freeze, setFreeze]     = useState(0);
  const [buying, setBuying]     = useState(null);
  const [toast, setToast]       = useState(null);
  const [err, setErr]           = useState(null);
  const fetchProfile = useGamificationStore((s) => s.fetchProfile);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const { items, gold: g, freezeCount } = await api.get("/api/shop/catalog");
      setCatalog(items);
      setGold(g);
      setFreeze(freezeCount);
    } catch (e) {
      setErr(e.message ?? "Failed to load shop.");
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const buy = useCallback(async (item) => {
    setBuying(item.id);
    try {
      const ikey = `shop-${item.id}-${Date.now()}`;
      await api.post("/api/shop/buy", { itemId: item.id, idempotencyKey: ikey });
      setToast(`Bought "${item.name}"!`);
      setTimeout(() => setToast(null), 3000);
      await load();
      await fetchProfile();
    } catch (e) {
      setToast(`Failed: ${e.message ?? "Purchase error"}`);
      setTimeout(() => setToast(null), 3500);
    } finally {
      setBuying(null);
    }
  }, [load, fetchProfile]);

  const cosmetics   = catalog?.filter(i => i.type === "cosmetic") ?? [];
  const consumables = catalog?.filter(i => i.type === "consumable") ?? [];

  return (
    <div className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
            <ShoppingBag size={22} strokeWidth={2} /> Shop
          </h1>
          <p className="mt-1 text-sm text-text-secondary">Spend your gold on cosmetics and power-ups.</p>
        </div>
        <div className="flex gap-4 text-sm font-bold">
          <span className="flex items-center gap-1.5 rounded-xl border border-ink/[0.08] bg-bg-surface px-3 py-1.5">
            <Coins size={14} strokeWidth={2.2} className="text-amber-600" />{gold.toLocaleString()} gold
          </span>
          <span className="flex items-center gap-1.5 rounded-xl border border-ink/[0.08] bg-bg-surface px-3 py-1.5">
            <Snowflake size={14} strokeWidth={2.2} className="text-blue-500" />{freeze} freeze{freeze !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {err && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400">
          <AlertCircle size={16} /> {err}
        </div>
      )}

      {catalog === null && !err && (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-text-secondary" /></div>
      )}

      {catalog !== null && (
        <>
          {consumables.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-text-secondary">Power-ups</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {consumables.map(item => <ItemCard key={item.id} item={item} onBuy={buy} buying={buying} />)}
              </div>
            </section>
          )}
          {cosmetics.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-text-secondary">Cosmetics</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {cosmetics.map(item => <ItemCard key={item.id} item={item} onBuy={buy} buying={buying} />)}
              </div>
            </section>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-ink/[0.08] bg-bg-surface px-5 py-3 text-sm font-semibold text-text-primary shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
