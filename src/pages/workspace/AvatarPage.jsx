import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Save, RefreshCw, Palette, Layers,
  Zap, CheckCircle2, AlertTriangle, Lock, Shield, Wand2,
  RotateCcw, Star, Loader2,
} from "lucide-react";
import api from "@/lib/api";
import useAuthStore from "@/stores/authStore";
import { useRoleTheme } from "@/utils/roleTheme";
import { useUiStore } from "@/stores/uiStore";

import TallyLoader from "@/components/ui/TallyLoader";
import { avatarUrl, loadAvatarStyles } from "@/lib/avatar";
// ── Avatar icon library ───────────────────────────────────────────────────────
const AVATAR_ICONS = [
  { key: "bottts",      label: "Bot",       rarity: "common",    emoji: "🤖" },
  { key: "pixel-art",   label: "Pixel",     rarity: "common",    emoji: "🎮" },
  { key: "fun-emoji",   label: "Emoji",     rarity: "common",    emoji: "😄" },
  { key: "identicon",   label: "Ident",     rarity: "common",    emoji: "🔷" },
  { key: "shapes",      label: "Shapes",    rarity: "common",    emoji: "🔵" },
  { key: "adventurer",  label: "Hero",      rarity: "rare",      emoji: "⚔️",  minLevel: 5  },
  { key: "lorelei",     label: "Lorelei",   rarity: "rare",      emoji: "🌸",  minLevel: 5  },
  { key: "thumbs",      label: "Thumbs",    rarity: "rare",      emoji: "👍",  minLevel: 5  },
  { key: "micah",       label: "Micah",     rarity: "rare",      emoji: "🧑",  minLevel: 5  },
  { key: "avataaars",   label: "Avataars",  rarity: "epic",      emoji: "🦸",  minLevel: 10 },
  { key: "miniavs",     label: "MiniAvs",   rarity: "epic",      emoji: "🧬",  minLevel: 10 },
  { key: "notionists",  label: "Notionist", rarity: "epic",      emoji: "✨",  minLevel: 10 },
  { key: "croodles",    label: "Croodle",   rarity: "legendary", emoji: "🌟",  minLevel: 20, requiresStreak: 30 },
  { key: "open-peeps",  label: "Peeps",     rarity: "legendary", emoji: "👑",  minLevel: 15, requiresBadge: "speed_demon" },
];

// ── Visual personality styles ─────────────────────────────────────────────────
const VISUAL_STYLES = [
  { key: "minimal",    label: "Minimal",     emoji: "⬜", desc: "Clean and simple"          },
  { key: "corporate",  label: "Corporate",   emoji: "🏢", desc: "Professional aesthetic"    },
  { key: "futuristic", label: "Futuristic",  emoji: "🚀", desc: "Tech-forward design",      minLevel: 5  },
  { key: "gamer",      label: "Gamer",       emoji: "🎮", desc: "High-energy gaming style", minLevel: 7  },
  { key: "shadow",     label: "Shadow Mode", emoji: "🌑", desc: "Dark and mysterious",      minLevel: 8  },
  { key: "neon",       label: "Neon Glow",   emoji: "💡", desc: "Bright neon aesthetics",   minLevel: 10 },
];

// ── Background library ────────────────────────────────────────────────────────
const BACKGROUNDS = [
  { key: "none",         label: "None",      type: "solid",    value: null,     preview: null },
  { key: "sky",          label: "Sky",       type: "solid",    value: "b6e3f4", preview: "#146685" },
  { key: "lavender",     label: "Lavender",  type: "solid",    value: "c0aede", preview: "#442C6D" },
  { key: "peach",        label: "Peach",     type: "solid",    value: "ffdfbf", preview: "#864D13" },
  { key: "midnight",     label: "Midnight",  type: "solid",    value: "1a1a2e", preview: "#14203D" },
  { key: "navy",         label: "Navy",      type: "solid",    value: "0f3460", preview: "#0f3460" },
  { key: "abyss",        label: "Abyss",     type: "solid",    value: "020913", preview: "var(--on-accent)" },
  { key: "dark-neon",    label: "Dark Neon", type: "gradient", css: "linear-gradient(135deg,#F5F6FA,#EAEDF4)", preview: "linear-gradient(135deg,#F5F6FA,#EAEDF4)" },
  { key: "corp-blue",    label: "Corp Blue", type: "gradient", css: "linear-gradient(135deg,#0f3460,#1a1a6e)", preview: "linear-gradient(135deg,#0f3460,#1a1a6e)" },
  { key: "gamer-red",    label: "Gamer Red", type: "gradient", css: "linear-gradient(135deg,#F5F6FA,#5c1515)", preview: "linear-gradient(135deg,#F5F6FA,#5c1515)" },
  { key: "cyber-purple", label: "Cyber",     type: "gradient", css: "linear-gradient(135deg,#F5F6FA,#3d0a6e)", preview: "linear-gradient(135deg,#F5F6FA,#3d0a6e)" },
  { key: "emerald",      label: "Emerald",   type: "gradient", css: "linear-gradient(135deg,#EAEDF4,#0d4429)", preview: "linear-gradient(135deg,#EAEDF4,#0d4429)" },
  { key: "solar",        label: "Solar",     type: "gradient", css: "linear-gradient(135deg,#1c0a00,#4a1800)", preview: "linear-gradient(135deg,#1c0a00,#4a1800)" },
];

// ── Identity presets ──────────────────────────────────────────────────────────
const PRESETS = [
  { key: "ghost",   label: "Ghost",    emoji: "👻", desc: "Invisible but present",  minLevel: 1,  config: { style: "identicon",  background: "abyss",        visualStyle: "shadow",     effects: []                } },
  { key: "zen",     label: "Zen",      emoji: "☯️", desc: "Calm and centered",       minLevel: 1,  config: { style: "bottts",     background: "sky",          visualStyle: "minimal",    effects: []                } },
  { key: "titan",   label: "Titan",    emoji: "🏔️", desc: "Unstoppable presence",    minLevel: 3,  config: { style: "shapes",     background: "corp-blue",    visualStyle: "corporate",  effects: []                } },
  { key: "warrior", label: "Warrior",  emoji: "⚔️", desc: "Bold and battle-ready",   minLevel: 5,  config: { style: "adventurer", background: "gamer-red",    visualStyle: "gamer",      effects: ["glow"]          } },
  { key: "hacker",  label: "Hacker",   emoji: "💻", desc: "Code is my weapon",       minLevel: 5,  config: { style: "identicon",  background: "emerald",      visualStyle: "futuristic", effects: ["glow"]          } },
  { key: "eclipse", label: "Eclipse",  emoji: "🌘", desc: "Between light and dark",   minLevel: 6,  config: { style: "pixel-art",  background: "cyber-purple", visualStyle: "futuristic", effects: ["pulse"]         } },
  { key: "shadow",  label: "Shadow",   emoji: "🌑", desc: "Dark and mysterious",      minLevel: 8,  config: { style: "lorelei",    background: "midnight",     visualStyle: "shadow",     effects: ["aura"]          } },
  { key: "nova",    label: "Nova",     emoji: "💫", desc: "Radiant and energetic",    minLevel: 10, config: { style: "fun-emoji",  background: "cyber-purple", visualStyle: "neon",       effects: ["glow", "pulse"] } },
];

// ── Unlockable effects ────────────────────────────────────────────────────────
const EFFECTS_LIST = [
  { key: "glow",     label: "Glow",        emoji: "✨", desc: "Soft glowing aura",        minLevel: 3  },
  { key: "pulse",    label: "Pulse",        emoji: "💫", desc: "Heartbeat ring animation", minLevel: 5  },
  { key: "aura",     label: "Shadow Aura", emoji: "🌑", desc: "Dark rotating gradient",   minLevel: 8  },
  { key: "particle", label: "Particles",   emoji: "⚡", desc: "Floating energy sparks",   minLevel: 15 },
];

const RARITY_CFG = {
  common:    { label: "Common",    color: "#4F5B75", glow: null                    },
  rare:      { label: "Rare",      color: "#1948BD", glow: "rgba(31,87,224,0.45)" },
  epic:      { label: "Epic",      color: "#1948BD", glow: "rgba(42,98,236,0.45)" },
  legendary: { label: "Legendary", color: "#7A5200", glow: "rgba(255,194,26,0.45)" },
};

const TABS = [
  { key: "icon",       label: "Icon",       icon: Layers  },
  { key: "background", label: "Background", icon: Palette },
  { key: "style",      label: "Style",      icon: Shield  },
  { key: "identity",   label: "Identity",   icon: Wand2   },
  { key: "effects",    label: "Effects",    icon: Zap     },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function canUnlock(item, unlock) {
  if (!unlock) return true;
  if (item.minLevel       && unlock.level  < item.minLevel)       return false;
  if (item.requiresStreak && unlock.streak < item.requiresStreak) return false;
  if (item.requiresBadge  && !unlock.badges.includes(item.requiresBadge)) return false;
  return true;
}

function dicebearUrl(style, seed, backgroundKey) {
  const bg   = BACKGROUNDS.find((b) => b.key === backgroundKey);
  const base = avatarUrl(style, seed || "Hero");
  if (bg?.type === "solid" && bg.value) return `${base}&backgroundColor=${bg.value}`;
  return base;
}

function getBgCss(backgroundKey) {
  const bg = BACKGROUNDS.find((b) => b.key === backgroundKey);
  return bg?.type === "gradient" ? bg.css : null;
}

function getVsRingStyle(visualStyle, accent, effects) {
  const gf = effects.includes("glow") ? 1.6 : 1;
  switch (visualStyle) {
    case "corporate":  return { border: `1.5px solid ${accent}35`, boxShadow: `0 0 ${Math.round(20*gf)}px ${accent}18` };
    case "futuristic": return { border: `2px solid ${accent}55`,   boxShadow: `0 0 ${Math.round(25*gf)}px ${accent}35, inset 0 0 20px ${accent}08` };
    case "gamer":      return { border: `2px solid ${accent}75`,   boxShadow: `0 0 ${Math.round(30*gf)}px ${accent}50, 0 0 60px ${accent}20` };
    case "shadow":     return { border: "2px solid rgba(71,85,105,0.40)", boxShadow: "var(--shadow-1)" };
    case "neon":       return { border: `2px solid ${accent}`,     boxShadow: `0 0 ${Math.round(20*gf)}px ${accent}, 0 0 50px ${accent}65` };
    default:           return { border: "1px solid rgba(20,32,61,0.10)" };
  }
}

// ── Particles ────────────────────────────────────────────────────────────────
function Particles({ accent }) {
  const dots = [
    { angle: 0,   size: 4, delay: 0   },
    { angle: 60,  size: 3, delay: 0.3 },
    { angle: 120, size: 5, delay: 0.6 },
    { angle: 180, size: 3, delay: 0.9 },
    { angle: 240, size: 4, delay: 1.2 },
    { angle: 300, size: 3, delay: 1.5 },
  ];
  return (
    <>
      {dots.map((d, i) => {
        const rad = (d.angle * Math.PI) / 180;
        const r   = 90;
        const x   = Math.cos(rad) * r;
        const y   = Math.sin(rad) * r;
        return (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{ width: d.size, height: d.size, background: accent, left: "50%", top: "50%", marginLeft: -d.size / 2, marginTop: -d.size / 2, boxShadow: "var(--shadow-1)" }}
            animate={{ x: [x * 0.8, x, x * 0.8], y: [y * 0.8, y, y * 0.8], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: d.delay, ease: "easeInOut" }}
          />
        );
      })}
    </>
  );
}

// ── Preview Panel ─────────────────────────────────────────────────────────────
function PreviewPanel({ draft, unlock, user, theme, isDirty, saving, onSave, onDiscard }) {
  const { style, seed, background, visualStyle, effects } = draft;
  const url         = dicebearUrl(style, seed, background);
  const bgCss       = getBgCss(background);
  const ringStyle   = getVsRingStyle(visualStyle, theme.accent, effects);
  const hasAura     = effects.includes("aura");
  const hasPulse    = effects.includes("pulse");
  const hasGlow     = effects.includes("glow");
  const hasParticle = effects.includes("particle");
  const level       = unlock?.level ?? user?.level ?? 1;
  const xpPct       = Math.min(100, Math.round(((user?.currentXp ?? 0) / (user?.maxXp ?? 1000)) * 100));

  return (
    <div className="rounded-2xl border overflow-hidden flex flex-col" style={{ borderColor: `${theme.accent}28`, background: "linear-gradient(180deg,#EAEDF4,#FFFFFF)" }}>
      <div className="px-5 py-3.5 border-b border-ink/[0.06] flex items-center justify-between">
        <p className="text-[14px] font-black uppercase tracking-[0.14em] text-slate-500">Live Preview</p>
        {isDirty && (
          <span className="flex items-center gap-1 text-[14px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 rounded-full">
            <AlertTriangle size={8} /> Unsaved
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 px-5 py-7">
        {/* Avatar circle with effects */}
        <div className="relative flex items-center justify-center" style={{ width: 168, height: 168 }}>
          {hasAura && (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{ inset: -8, background: `conic-gradient(from 0deg, ${theme.accent}55, transparent, ${theme.accent}55)`, filter: "blur(8px)" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
          )}
          {(hasGlow || ["futuristic","gamer","neon"].includes(visualStyle)) && (
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{ inset: -6, boxShadow: `0 0 ${hasGlow ? 40 : 20}px ${theme.accent}50`, borderRadius: "50%" }}
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          {hasParticle && <Particles accent={theme.accent} />}
          <motion.div
            className="relative rounded-full overflow-hidden bg-[#FFFFFF]"
            style={{ width: 160, height: 160, ...ringStyle }}
            animate={hasPulse ? { scale: [1, 1.048, 1] } : {}}
            transition={hasPulse ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : {}}
          >
            {bgCss && <div className="absolute inset-0 z-0" style={{ background: bgCss }} />}
            <AnimatePresence mode="wait">
              <motion.img
                key={url} src={url} alt="avatar preview"
                className="relative z-10 h-full w-full object-cover"
                initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.22 }}
              />
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-black px-2.5 py-0.5 rounded-full" style={{ background: `${theme.accent}25`, color: theme.text, border: `1px solid ${theme.accent}40` }}>
            Lv {level}
          </span>
          {visualStyle !== "minimal" && (
            <span className="text-[14px] font-bold text-slate-500 capitalize">
              {VISUAL_STYLES.find((v) => v.key === visualStyle)?.label}
            </span>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-black text-text-primary tracking-tight">{user?.name ?? "You"}</p>
          <p className="text-[14px] font-semibold mt-0.5" style={{ color: theme.text }}>{user?.role}</p>
        </div>

        <div className="w-full flex flex-col gap-1">
          <div className="flex justify-between text-[14px] font-bold text-slate-600">
            <span>XP</span>
            <span>{user?.currentXp ?? 0} / {user?.maxXp ?? 1000}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-ink/[0.06] overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: theme.accent }} initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
          </div>
        </div>

        {effects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {effects.map((eff) => {
              const e = EFFECTS_LIST.find((x) => x.key === eff);
              return <span key={eff} className="text-[14px] font-bold px-1.5 py-0.5 rounded-full border border-ink/[0.10] text-slate-400">{e?.emoji} {e?.label}</span>;
            })}
          </div>
        )}
      </div>

      <div className="px-5 pb-5 flex flex-col gap-2">
        <button
          onClick={onSave} disabled={!isDirty || saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          style={{ background: isDirty ? theme.accent : `${theme.accent}40`, color: "var(--on-accent)", boxShadow: isDirty ? `0 0 18px ${theme.accent}50` : "none" }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} strokeWidth={2.5} />}
          {saving ? "Saving…" : "Save Avatar"}
        </button>
        {isDirty && (
          <button onClick={onDiscard} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 border border-ink/[0.06] hover:border-ink/[0.14] transition-all duration-150">
            <RotateCcw size={11} strokeWidth={2.5} />
            Discard Changes
          </button>
        )}
      </div>
    </div>
  );
}

// ── Tab: Icon ─────────────────────────────────────────────────────────────────
function IconTab({ draft, setDraft, unlock }) {
  return (
    <div className="flex flex-col gap-6">
      {["common","rare","epic","legendary"].map((rarity) => {
        const group = AVATAR_ICONS.filter((i) => i.rarity === rarity);
        const cfg   = RARITY_CFG[rarity];
        return (
          <div key={rarity}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1" style={{ background: `${cfg.color}35` }} />
              <span className="text-[14px] font-black uppercase tracking-[0.18em]" style={{ color: cfg.color }}>{cfg.label}</span>
              {rarity !== "common" && <span className="text-[14px] text-slate-600">Lv {group[0]?.minLevel}+{group[0]?.requiresStreak ? ` · ${group[0].requiresStreak}d streak` : ""}</span>}
              <div className="h-px flex-1" style={{ background: `${cfg.color}35` }} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              {group.map((icon) => {
                const unlocked = canUnlock(icon, unlock);
                const isActive = draft.style === icon.key;
                return (
                  <button
                    key={icon.key} disabled={!unlocked}
                    onClick={() => setDraft((d) => ({ ...d, style: icon.key, preset: null }))}
                    title={!unlocked ? `Unlock at Level ${icon.minLevel}` : icon.label}
                    className="relative flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all duration-150 disabled:cursor-not-allowed"
                    style={isActive ? { background: `${cfg.color}18`, borderColor: cfg.color, boxShadow: cfg.glow ? `0 0 16px ${cfg.glow}` : "none" }
                      : { background: unlocked ? "rgba(20,32,61,0.03)" : "rgba(0,0,0,0.25)", borderColor: unlocked ? "rgba(20,32,61,0.07)" : "rgba(20,32,61,0.04)" }}
                  >
                    <div className={`h-12 w-12 rounded-xl overflow-hidden bg-[#FFFFFF] border border-ink/[0.08] ${!unlocked ? "opacity-35 grayscale" : ""}`}>
                      <img src={avatarUrl(icon.key, draft.seed || "Hero")} alt={icon.label} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <span className={`text-[14px] font-bold ${isActive ? "text-text-primary" : unlocked ? "text-slate-500" : "text-slate-700"}`}>{icon.label}</span>
                    {!unlocked && <div className="absolute inset-0 flex items-center justify-center rounded-xl"><Lock size={14} className="text-slate-700" strokeWidth={2} /></div>}
                    {isActive  && <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Background ───────────────────────────────────────────────────────────
function BackgroundTab({ draft, setDraft, theme }) {
  const solids    = BACKGROUNDS.filter((b) => b.type === "solid");
  const gradients = BACKGROUNDS.filter((b) => b.type === "gradient");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[14px] font-black uppercase tracking-[0.16em] text-slate-500 mb-3">Solid Colors</p>
        <div className="flex flex-wrap gap-3">
          {solids.map((bg) => {
            const isActive = draft.background === bg.key;
            return (
              <button key={bg.key} onClick={() => setDraft((d) => ({ ...d, background: bg.key, preset: null }))} title={bg.label} className="flex flex-col items-center gap-1.5">
                <div className="h-12 w-12 rounded-xl border-2 transition-all duration-150" style={{
                  background:      bg.preview ?? "transparent",
                  backgroundImage: bg.preview ? undefined : "repeating-linear-gradient(45deg,rgba(20,32,61,0.04) 0,rgba(20,32,61,0.04) 4px,transparent 0,transparent 50%)",
                  borderColor:     isActive ? theme.accent : "rgba(20,32,61,0.10)",
                  boxShadow:       isActive ? `0 0 12px ${theme.accent}55` : "none",
                }} />
                <span className={`text-[14px] font-bold ${isActive ? "text-text-primary" : "text-slate-600"}`}>{bg.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-[14px] font-black uppercase tracking-[0.16em] text-slate-500 mb-3">Gradient Presets</p>
        <div className="flex flex-wrap gap-3">
          {gradients.map((bg) => {
            const isActive = draft.background === bg.key;
            return (
              <button key={bg.key} onClick={() => setDraft((d) => ({ ...d, background: bg.key, preset: null }))} title={bg.label} className="flex flex-col items-center gap-1.5">
                <div className="h-12 w-20 rounded-xl border-2 transition-all duration-150" style={{ background: bg.preview, borderColor: isActive ? theme.accent : "rgba(20,32,61,0.10)", boxShadow: isActive ? `0 0 12px ${theme.accent}55` : "none" }} />
                <span className={`text-[14px] font-bold ${isActive ? "text-text-primary" : "text-slate-600"}`}>{bg.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Style ────────────────────────────────────────────────────────────────
function StyleTab({ draft, setDraft, unlock, theme }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {VISUAL_STYLES.map((vs) => {
        const unlocked = canUnlock(vs, unlock);
        const isActive = draft.visualStyle === vs.key;
        return (
          <button
            key={vs.key} disabled={!unlocked}
            onClick={() => setDraft((d) => ({ ...d, visualStyle: vs.key, preset: null }))}
            className="flex flex-col gap-2.5 rounded-xl p-4 border text-left transition-all duration-150 disabled:cursor-not-allowed"
            style={isActive ? { background: `${theme.accent}14`, borderColor: `${theme.accent}55`, boxShadow: "var(--shadow-1)" }
              : { background: unlocked ? "rgba(20,32,61,0.03)" : "rgba(0,0,0,0.20)", borderColor: unlocked ? "rgba(20,32,61,0.07)" : "rgba(20,32,61,0.04)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">{vs.emoji}</span>
              {!unlocked && <Lock size={12} className="text-slate-700" />}
              {isActive  && <CheckCircle2 size={13} strokeWidth={2.5} style={{ color: theme.text }} />}
            </div>
            <div>
              <p className={`text-xs font-black ${isActive ? "text-text-primary" : unlocked ? "text-slate-300" : "text-slate-700"}`}>{vs.label}</p>
              <p className={`text-[14px] mt-0.5 ${unlocked ? "text-slate-500" : "text-slate-700"}`}>{vs.desc}</p>
              {vs.minLevel && <p className="text-[14px] mt-1 font-bold" style={{ color: unlocked ? theme.text : "#4F5B75" }}>Lv {vs.minLevel}+</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Tab: Identity ─────────────────────────────────────────────────────────────
function IdentityTab({ draft, setDraft, unlock, theme }) {
  const [seedInput, setSeedInput] = useState(draft.seed ?? "");
  const SEED_POOL = ["Warrior","Shadow","Ghost","Titan","Nova","Specter","Vortex","Cipher","Phantom","Nexus","Eclipse","Zenith","Apex","Lyra","Orion"];

  const applyPreset = (preset) => {
    if (!canUnlock(preset, unlock)) return;
    setDraft((d) => ({ ...d, ...preset.config, preset: preset.key }));
  };

  const applySeed = () => {
    const s = seedInput.trim();
    if (s) setDraft((d) => ({ ...d, seed: s, preset: null }));
  };

  const randomize = () => {
    const r = SEED_POOL[Math.floor(Math.random() * SEED_POOL.length)] + Math.floor(Math.random() * 999);
    setSeedInput(r);
    setDraft((d) => ({ ...d, seed: r, preset: null }));
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[14px] font-black uppercase tracking-[0.16em] text-slate-500 mb-3">Identity Presets</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {PRESETS.map((preset) => {
            const unlocked = canUnlock(preset, unlock);
            const isActive = draft.preset === preset.key;
            return (
              <button
                key={preset.key} disabled={!unlocked}
                onClick={() => applyPreset(preset)}
                className="relative flex flex-col items-center gap-2 rounded-xl p-3 border text-center transition-all duration-150 disabled:cursor-not-allowed"
                style={isActive ? { background: `${theme.accent}14`, borderColor: `${theme.accent}50`, boxShadow: "var(--shadow-1)" }
                  : { background: unlocked ? "rgba(20,32,61,0.03)" : "rgba(0,0,0,0.20)", borderColor: unlocked ? "rgba(20,32,61,0.07)" : "rgba(20,32,61,0.04)" }}
              >
                <span className={`text-2xl ${!unlocked ? "grayscale opacity-40" : ""}`}>{preset.emoji}</span>
                <div>
                  <p className={`text-[14px] font-black ${isActive ? "text-text-primary" : unlocked ? "text-slate-300" : "text-slate-700"}`}>{preset.label}</p>
                  <p className={`text-[14px] mt-0.5 ${unlocked ? "text-slate-500" : "text-slate-700"}`}>{preset.desc}</p>
                  {preset.minLevel > 1 && <p className="text-[14px] mt-1 font-bold" style={{ color: unlocked ? theme.text : "#4F5B75" }}>Lv {preset.minLevel}+</p>}
                </div>
                {!unlocked && <div className="absolute top-2 right-2"><Lock size={10} className="text-slate-700" /></div>}
                {isActive  && <div className="absolute top-2 right-2"><Star size={10} style={{ color: theme.text }} fill={theme.accent} /></div>}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-[14px] font-black uppercase tracking-[0.16em] text-slate-500 mb-1">Custom Seed</p>
        <p className="text-[14px] text-slate-600 mb-3">Any text string — uniquely determines your avatar appearance.</p>
        <div className="flex gap-2">
          <input
            value={seedInput} onChange={(e) => setSeedInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applySeed(); }}
            placeholder="Enter any text…"
            className="flex-1 bg-ink/[0.05] border border-ink/[0.10] rounded-xl px-4 py-2.5 text-sm text-accent-on placeholder-slate-600 focus:outline-none focus:border-ink/25 transition-colors"
          />
          <button onClick={applySeed} className="px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95" style={{ background: theme.accent, color: "var(--on-accent)" }}>Apply</button>
          <button onClick={randomize} className="px-3 py-2.5 rounded-xl border border-ink/[0.10] text-slate-400 hover:text-text-primary hover:border-ink/25 transition-all" title="Randomize">
            <RefreshCw size={14} strokeWidth={2} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {SEED_POOL.map((s) => (
            <button key={s} onClick={() => { setSeedInput(s); setDraft((d) => ({ ...d, seed: s, preset: null })); }}
              className="px-2.5 py-1 rounded-lg text-[14px] font-bold border transition-all duration-150"
              style={draft.seed === s ? { background: `${theme.accent}14`, borderColor: `${theme.accent}45`, color: theme.text } : { background: "rgba(20,32,61,0.03)", borderColor: "rgba(20,32,61,0.08)", color: "#3A4660" }}
            >{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Effects ──────────────────────────────────────────────────────────────
function EffectsTab({ draft, setDraft, unlock, theme }) {
  const toggle = (key) => {
    setDraft((d) => ({
      ...d,
      effects: d.effects.includes(key) ? d.effects.filter((e) => e !== key) : [...d.effects, key],
      preset: null,
    }));
  };
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[14px] font-black uppercase tracking-[0.16em] text-slate-500">Visual Effects</p>
        <p className="text-[14px] text-slate-600 mt-1">Layer effects on your avatar — tied to XP level milestones.</p>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {EFFECTS_LIST.map((eff) => {
          const unlocked = canUnlock(eff, unlock);
          const isOn     = draft.effects.includes(eff.key);
          return (
            <button
              key={eff.key} disabled={!unlocked} onClick={() => toggle(eff.key)}
              className="flex items-center gap-3 rounded-xl p-4 border text-left transition-all duration-150 disabled:cursor-not-allowed"
              style={isOn ? { background: `${theme.accent}14`, borderColor: `${theme.accent}50` }
                : { background: unlocked ? "rgba(20,32,61,0.03)" : "rgba(0,0,0,0.20)", borderColor: unlocked ? "rgba(20,32,61,0.07)" : "rgba(20,32,61,0.04)" }}
            >
              <span className={`text-xl flex-shrink-0 ${!unlocked ? "grayscale opacity-35" : ""}`}>{eff.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-black ${isOn ? "text-text-primary" : unlocked ? "text-slate-300" : "text-slate-700"}`}>{eff.label}</p>
                <p className={`text-[14px] mt-0.5 ${unlocked ? "text-slate-500" : "text-slate-700"}`}>{eff.desc}</p>
                <p className="text-[14px] mt-1 font-bold" style={{ color: unlocked ? theme.text : "#4F5B75" }}>Lv {eff.minLevel}+</p>
              </div>
              <div className="flex-shrink-0">
                {!unlocked ? (
                  <Lock size={14} className="text-slate-700" />
                ) : (
                  <div className="h-5 w-9 rounded-full border-2 transition-all duration-200 flex items-center px-0.5"
                    style={{ borderColor: isOn ? theme.accent : "rgba(20,32,61,0.15)", background: isOn ? `${theme.accent}30` : "transparent" }}
                  >
                    <motion.div className="h-3.5 w-3.5 rounded-full"
                      animate={{ x: isOn ? 14 : 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      style={{ background: isOn ? theme.accent : "#6D7B99" }}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AvatarPage() {
  const user     = useAuthStore((s) => s.user);
  const theme    = useRoleTheme();
  const addToast = useUiStore((s) => s.addToast);

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  // Non-default styles load on demand; re-render once they are in (lib/avatar.js).
  const [, setStylesReady] = useState(false);
  useEffect(() => { loadAvatarStyles().then(() => setStylesReady(true)); }, []);
  const [saved,   setSaved]   = useState(null);
  const [draft,   setDraft]   = useState(null);
  const [unlock,  setUnlock]  = useState(null);
  const [tab,     setTab]     = useState("icon");

  const isDirty = !!(saved && draft && JSON.stringify(draft) !== JSON.stringify(saved));

  useEffect(() => {
    const handler = (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get("/api/gamification/avatar");
        if (cancelled) return;
        setSaved(data.config);
        setDraft(data.config);
        setUnlock(data.unlock);
      } catch {
        const defaults = { style: "bottts", seed: user?.name ?? "Hero", background: "none", visualStyle: "minimal", preset: null, effects: [], themeAccentSync: false };
        if (!cancelled) { setSaved(defaults); setDraft(defaults); setUnlock({ level: user?.level ?? 1, badges: [], streak: 0 }); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      await api.put("/api/gamification/avatar", draft);
      setSaved({ ...draft });
      addToast?.({ type: "success", message: "Avatar saved!" });
    } catch {
      addToast?.({ type: "error", message: "Failed to save avatar." });
    } finally {
      setSaving(false);
    }
  }, [draft, saving, addToast]);

  const handleDiscard = useCallback(() => {
    if (saved) setDraft({ ...saved });
  }, [saved]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <TallyLoader />
          <p className="text-xs text-slate-500 font-semibold">Loading avatar…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 min-h-full">

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <p className="text-[14px] font-black uppercase tracking-[0.16em] text-slate-600 mb-1 flex items-center gap-1.5">
          <Sparkles size={10} strokeWidth={2.5} style={{ color: theme.text }} />
          Identity Engine
        </p>
        <h1 className="text-3xl font-black text-text-primary tracking-tight">Avatar</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Your visual identity — shaped by XP, badges, and streaks. Higher level unlocks rarer styles and effects.
        </p>
      </motion.div>

      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-400/30 bg-amber-400/[0.08] text-amber-400 text-xs font-bold"
          >
            <AlertTriangle size={13} strokeWidth={2.5} />
            Unsaved changes — click Save Avatar to persist them.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6 flex-1">

        {/* Preview panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}
          className="lg:sticky lg:top-6 lg:self-start flex-shrink-0 lg:w-72"
        >
          {draft && <PreviewPanel draft={draft} unlock={unlock} user={user} theme={theme} isDirty={isDirty} saving={saving} onSave={handleSave} onDiscard={handleDiscard} />}

          {unlock && (
            <div className="mt-3 rounded-xl border border-ink/[0.06] p-4" style={{ background: "linear-gradient(180deg,#EAEDF4,#FFFFFF)" }}>
              <p className="text-[14px] font-black uppercase tracking-[0.15em] text-slate-600 mb-3">Unlock Status</p>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[14px]"><span className="text-slate-500">Your Level</span><span className="font-black text-text-primary">Lv {unlock.level}</span></div>
                <div className="flex justify-between text-[14px]"><span className="text-slate-500">Active Streak</span><span className="font-black text-orange-400">{unlock.streak} 🔥</span></div>
                <div className="flex justify-between text-[14px]"><span className="text-slate-500">Badges Earned</span><span className="font-black text-text-primary">{unlock.badges.length}</span></div>
                <div className="mt-2 border-t border-ink/[0.06] pt-2 flex flex-col gap-1.5">
                  {[
                    { label: "Rare Icons",  minLevel: 5  },
                    { label: "Epic Icons",  minLevel: 10 },
                    { label: "Futuristic",  minLevel: 5  },
                    { label: "Shadow Aura", minLevel: 8  },
                    { label: "Neon Glow",   minLevel: 10 },
                    { label: "Particles",   minLevel: 15 },
                  ].map((item) => {
                    const done = unlock.level >= item.minLevel;
                    return (
                      <div key={item.label} className="flex items-center gap-2 text-[14px]">
                        <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: done ? theme.accent : "#6D7B99" }} />
                        <span className={done ? "text-slate-300" : "text-slate-600"}>{item.label}</span>
                        {!done && <span className="ml-auto text-slate-700">Lv {item.minLevel}</span>}
                        {done  && <CheckCircle2 size={9} className="ml-auto" style={{ color: theme.text }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Customization panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.05 }}
          className="flex-1 flex flex-col gap-4 min-w-0"
        >
          <div className="flex gap-1 p-1 rounded-xl bg-ink/[0.03] border border-ink/[0.06] w-fit flex-wrap">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key} onClick={() => setTab(key)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[14px] font-black transition-all duration-200"
                style={tab === key ? { background: theme.accent, color: "var(--on-accent)", boxShadow: "var(--shadow-1)" } : { color: "#4F5B75" }}
              >
                <Icon size={11} strokeWidth={2.5} />
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {draft && (
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="rounded-2xl border border-ink/[0.07] p-6 flex-1"
                style={{ background: "linear-gradient(180deg,#EAEDF4,#FFFFFF)" }}
              >
                {tab === "icon"       && <IconTab       draft={draft} setDraft={setDraft} unlock={unlock} theme={theme} />}
                {tab === "background" && <BackgroundTab draft={draft} setDraft={setDraft} theme={theme} />}
                {tab === "style"      && <StyleTab      draft={draft} setDraft={setDraft} unlock={unlock} theme={theme} />}
                {tab === "identity"   && <IdentityTab   draft={draft} setDraft={setDraft} unlock={unlock} theme={theme} />}
                {tab === "effects"    && <EffectsTab    draft={draft} setDraft={setDraft} unlock={unlock} theme={theme} />}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
