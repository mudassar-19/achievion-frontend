import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Lock, CheckCircle2, Tag, Flame, Star, Truck, Users, Shield, Sparkles, Trophy } from "lucide-react";
import api from "@/lib/api";
import useAuthStore from "@/stores/authStore";
import { useRoleTheme } from "@/utils/roleTheme";
import { useUiStore } from "@/stores/uiStore";

import TallyLoader from "@/components/ui/TallyLoader";
// ── Rarity config ─────────────────────────────────────────────────────────────
const RARITY_CFG = {
  common:    { label: "Common",    color: "#3A4660", glow: "#3A466020", ring: "#3A466035" },
  rare:      { label: "Rare",      color: "#1948BD", glow: "#1948BD20", ring: "#1948BD40" },
  epic:      { label: "Epic",      color: "#1948BD", glow: "#1948BD20", ring: "#1948BD40" },
  legendary: { label: "Legendary", color: "#7A5200", glow: "#7A520018", ring: "#7A520045" },
};

// ── TL-specific category tabs ─────────────────────────────────────────────────
const CATEGORY_TABS = [
  { key: "all",        label: "All",        icon: Tag    },
  { key: "delivery",   label: "Delivery",   icon: Truck  },
  { key: "leadership", label: "Leadership", icon: Users  },
  { key: "special",    label: "Special",    icon: Shield },
];

// ── Active Title Hero ─────────────────────────────────────────────────────────
function ActiveTitleHero({ title, stats, theme }) {
  const rarity = RARITY_CFG[title?.rarity ?? "common"];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="relative overflow-hidden rounded-2xl border p-6"
      style={{ borderColor: `${theme.accent}35`, background: `linear-gradient(135deg, ${theme.accent}0a, #FFFFFF)` }}
    >
      <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full pointer-events-none" style={{ background: `${theme.accent}12`, filter: "blur(40px)" }} />
      <div className="relative flex items-center gap-5 flex-wrap">
        <motion.div
          className="flex-shrink-0 h-20 w-20 rounded-2xl flex items-center justify-center text-4xl border"
          style={{ background: rarity.glow, borderColor: rarity.ring, boxShadow: "var(--shadow-1)" }}
          animate={{ boxShadow: [`0 0 20px ${theme.accent}20`, `0 0 40px ${theme.accent}40`, `0 0 20px ${theme.accent}20`] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          {title?.emoji ?? "👑"}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px] font-black uppercase tracking-[0.18em]" style={{ color: rarity.color }}>{rarity.label}</span>
            <span className="h-3 w-px bg-ink/10" />
            <span className="text-[14px] font-black uppercase tracking-[0.18em] text-slate-600 capitalize">{title?.category ?? "leadership"}</span>
          </div>
          <h2 className="text-2xl font-black text-text-primary tracking-tight leading-none">{title?.label ?? "New Comer"}</h2>
          <p className="text-sm text-slate-400 mt-1.5">{title?.desc}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <CheckCircle2 size={12} strokeWidth={2.5} style={{ color: theme.text }} />
            <span className="text-[14px] font-black uppercase tracking-widest" style={{ color: theme.text }}>Active Identity</span>
          </div>
        </div>
        {stats && (
          <div className="flex gap-4 flex-shrink-0 flex-wrap">
            {[
              { label: "Level",    value: `Lv ${stats.level}` },
              { label: "Streak",   value: `${stats.streak}🔥` },
              { label: "Unlocked", value: `${stats.unlockedCount}/${stats.totalCount}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <span className="text-xs font-black text-text-primary">{value}</span>
                <span className="text-[14px] font-bold text-slate-600 uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Title Card ────────────────────────────────────────────────────────────────
function TitleCard({ title, onEquip, equipping, theme }) {
  const rarity    = RARITY_CFG[title.rarity] ?? RARITY_CFG.common;
  const unlocked  = title.isUnlocked;
  const isActive  = title.isActive;
  const isLoading = equipping === title.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22 }}
      whileHover={unlocked && !isActive ? { y: -3, transition: { duration: 0.15 } } : {}}
      className="relative flex flex-col gap-3 rounded-2xl p-5 border cursor-pointer group select-none"
      style={
        isActive
          ? { background: `${theme.accent}10`, borderColor: `${theme.accent}45`, boxShadow: "var(--shadow-1)" }
          : unlocked
          ? { background: "rgba(20,32,61,0.03)", borderColor: "rgba(20,32,61,0.08)" }
          : { background: "rgba(20,32,61,0.05)", borderColor: "rgba(20,32,61,0.05)", cursor: "default" }
      }
      onClick={() => unlocked && !isActive && !isLoading && onEquip(title.id)}
    >
      {isActive ? (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-[14px] font-black uppercase px-2 py-0.5 rounded-full"
          style={{ background: `${theme.accent}20`, color: theme.text, border: `1px solid ${theme.accent}40` }}>
          <CheckCircle2 size={8} strokeWidth={3} /> Active
        </div>
      ) : !unlocked ? (
        <div className="absolute top-3 right-3"><Lock size={12} className="text-slate-700" strokeWidth={2.5} /></div>
      ) : null}

      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl border"
        style={unlocked
          ? { background: rarity.glow, borderColor: rarity.ring }
          : { background: "rgba(20,32,61,0.03)", borderColor: "rgba(20,32,61,0.06)" }}
      >
        {unlocked ? title.emoji : "🔒"}
      </div>

      <div className="flex-1">
        <p className={`text-sm font-black leading-tight ${isActive ? "text-text-primary" : unlocked ? "text-slate-200" : "text-slate-700"}`}>
          {title.label}
        </p>
        <p className="text-[14px] text-slate-600 mt-1 leading-snug">{title.desc}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[14px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
          style={{ color: rarity.color, background: rarity.glow, borderColor: rarity.ring }}>
          {rarity.label}
        </span>
        <span className="text-[14px] font-bold text-slate-700 capitalize">{title.category}</span>
      </div>

      {unlocked && !isActive && (
        <motion.div
          className="absolute inset-0 rounded-2xl flex items-center justify-center"
          initial={{ opacity: 0 }} whileHover={{ opacity: 1 }}
          style={{ background: `${theme.accent}10` }}
        >
          <span className="text-xs font-black px-5 py-2 rounded-full shadow-lg"
            style={{ background: theme.accent, color: "var(--on-accent)", boxShadow: "var(--shadow-1)" }}>
            {isLoading ? "Equipping…" : "Equip"}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Newly Unlocked Popup ──────────────────────────────────────────────────────
function UnlockPopup({ title, onClose }) {
  const rarity = RARITY_CFG[title.rarity];
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl cursor-pointer"
      style={{ background: "#EAEDF4", borderColor: `${rarity.color}45`, boxShadow: `0 8px 40px ${rarity.color}30` }}
      onClick={onClose}
    >
      <span className="text-2xl">{title.emoji}</span>
      <div>
        <p className="text-[14px] font-black uppercase tracking-widest" style={{ color: rarity.color }}>New Title Unlocked!</p>
        <p className="text-sm font-black text-text-primary">{title.label}</p>
      </div>
      <Sparkles size={16} style={{ color: rarity.color }} />
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TeamLeadTitlesPage() {
  const user     = useAuthStore((s) => s.user);
  const theme    = useRoleTheme();
  const addToast = useUiStore((s) => s.addToast);

  const [loading,   setLoading]   = useState(true);
  const [titles,    setTitles]    = useState([]);
  const [stats,     setStats]     = useState(null);
  const [activeId,  setActiveId]  = useState(null);
  const [tab,       setTab]       = useState("all");
  const [equipping, setEquipping] = useState(null);
  const [popup,     setPopup]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get("/api/teamlead/gamification/titles");
        if (cancelled) return;
        setTitles(data.titles ?? []);
        setActiveId(data.activeTitle ?? null);
        setStats(data.stats ?? null);
      } catch {
        setTitles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleEquip = useCallback(async (titleId) => {
    if (equipping) return;
    setEquipping(titleId);
    try {
      await api.patch("/api/teamlead/gamification/titles/equip", { titleId });
      setTitles((prev) => prev.map((t) => ({ ...t, isActive: t.id === titleId })));
      setActiveId(titleId);
      const t = titles.find((x) => x.id === titleId);
      addToast?.({ type: "success", message: `Title equipped: "${t?.label}"` });
    } catch {
      addToast?.({ type: "error", message: "Failed to equip title." });
    } finally {
      setEquipping(null);
    }
  }, [equipping, titles, addToast]);

  const activeTitle = titles.find((t) => t.id === activeId) ?? titles.find((t) => t.isActive);
  const filtered    = tab === "all" ? titles : titles.filter((t) => t.category === tab);
  const sorted      = [...filtered].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    if (a.isUnlocked && !b.isUnlocked) return -1;
    if (!a.isUnlocked && b.isUnlocked) return 1;
    return 0;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <TallyLoader />
          <p className="text-xs text-slate-500 font-semibold">Loading titles…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 min-h-full">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <p className="text-[14px] font-black uppercase tracking-[0.16em] text-slate-600 mb-1 flex items-center gap-1.5">
          <Crown size={10} strokeWidth={2.5} style={{ color: theme.text }} />
          Identity Engine
        </p>
        <h1 className="text-3xl font-black text-text-primary tracking-tight">Titles</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Your active identity — only one title is shown everywhere: profile, leaderboard, avatar, dashboard.
        </p>
      </motion.div>

      {/* Active title hero */}
      {activeTitle && <ActiveTitleHero title={activeTitle} stats={stats} theme={theme} />}

      {/* Stats strip */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}
          className="grid grid-cols-3 sm:grid-cols-5 gap-3"
        >
          {[
            { label: "Level",    value: `Lv ${stats.level}`,             icon: Trophy,   color: theme.text  },
            { label: "Total XP", value: (stats.totalXp ?? 0).toLocaleString(), icon: Star, color: "#7A5200"  },
            { label: "Streak",   value: `${stats.streak} days`,          icon: Flame,    color: "#9A3A06"     },
            { label: "Badges",   value: stats.badgeCount,                icon: Sparkles, color: "#1948BD"     },
            { label: "Unlocked", value: `${stats.unlockedCount}/${stats.totalCount}`, icon: Crown, color: theme.text },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl p-3 border border-ink/[0.07]" style={{ background: "linear-gradient(180deg,#EAEDF4,#FFFFFF)" }}>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                <Icon size={14} style={{ color }} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-text-primary truncate">{value}</p>
                <p className="text-[14px] font-bold text-slate-600 uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-ink/[0.03] border border-ink/[0.06] w-fit">
        {CATEGORY_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-black transition-all duration-200"
            style={tab === key
              ? { background: theme.accent, color: "var(--on-accent)", boxShadow: "var(--shadow-1)" }
              : { color: "#4F5B75" }}
          >
            <Icon size={11} strokeWidth={2.5} />
            {label}
          </button>
        ))}
      </div>

      {/* Notice */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
        className="flex items-center gap-2 text-[14px] text-slate-600 border border-ink/[0.05] rounded-xl px-4 py-2.5 w-fit"
        style={{ background: "rgba(20,32,61,0.02)" }}
      >
        <Crown size={10} style={{ color: theme.text }} />
        <span>Only <strong className="text-slate-400">one title</strong> can be active at a time — equipping a new one overrides your previous identity globally.</span>
      </motion.div>

      {/* Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <Crown size={36} className="text-slate-700" />
              <p className="text-sm text-slate-500 font-medium">No titles in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {sorted.map((title) => (
                <TitleCard key={title.id} title={title} onEquip={handleEquip} equipping={equipping} theme={theme} />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Unlock popup */}
      <AnimatePresence>
        {popup && <UnlockPopup key="popup" title={popup} onClose={() => setPopup(null)} />}
      </AnimatePresence>
    </div>
  );
}


