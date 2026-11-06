/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");

const v = (n) => `rgb(var(--c-${n}) / <alpha-value>)`;
// 50-200 tint, 300-400 text shade, 500-600 solid, 700-900 text shade
const status = (n) => ({
  50: v(`${n}-tint`), 100: v(`${n}-tint`), 200: v(`${n}-tint`),
  300: v(`${n}-text`), 400: v(`${n}-text`),
  500: v(n), 600: v(n),
  700: v(`${n}-text`), 800: v(`${n}-text`), 900: v(`${n}-text`),
});

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // ── Color Palettes ────────────────────────────────────────────────────
      colors: {
        // Direction C. Every colour reads a CSS variable (src/index.css) as an
        // rgb triplet, so opacity modifiers (bg-cyan/10) keep working and the
        // role accent can change at runtime through <html data-role="...">.
        bg: {
          base:     v("page"),
          surface:  v("raised"),
          elevated: v("raised"),
          border:   v("border"),
          muted:    v("sunken"),
        },
        text: {
          primary:   v("ink"),
          secondary: v("ink2"),
          disabled:  v("ink3"),
        },
        ink: v("ink"),
        control: v("control"),

        // "cyan" is the legacy name of the brand accent; it now follows the role accent.
        cyan: {
          50: v("accent-tint"), 100: v("accent-tint"), 200: v("accent-tint"),
          300: v("accent-text"), 400: v("accent-text"),
          500: v("accent"), 600: v("accent"),
          700: v("accent-text"), 800: v("accent-text"), 900: v("accent-text"),
          DEFAULT: v("accent"),
          glow: "rgb(var(--c-accent) / 0.18)",
        },
        accent: { DEFAULT: v("accent"), text: v("accent-text"), tint: v("accent-tint"), on: v("on-accent") },

        // Reward gold: 100 tint, 400/DEFAULT fill, 700 text (fill alone fails 4.5:1 as text).
        gold: {
          50: v("gold-tint"), 100: v("gold-tint"), 200: v("gold"), 300: v("gold"), 400: v("gold"), 500: v("gold"),
          600: v("gold-edge"), 700: v("gold-text"), 800: v("gold-text"), 900: v("gold-ink"),
          DEFAULT: v("gold"), text: v("gold-text"), ink: v("gold-ink"), tint: v("gold-tint"),
          glow: "rgba(255,194,26,0.30)",
        },

        // Legacy "purple" meant XP / prestige. XP is blue in C, epic is violet.
        purple: {
          50: v("info-tint"), 100: v("info-tint"), 200: v("info-tint"),
          300: v("info-text"), 400: v("info-text"), 500: v("info"), 600: v("info"),
          700: v("info-text"), 800: v("info-text"), 900: v("info-text"),
          DEFAULT: v("info"),
          glow: "rgba(42,98,236,0.18)",
        },

        danger:  { DEFAULT: v("danger"),  text: v("danger-text"),  tint: v("danger-tint"),  light: v("danger-tint"), dark: v("danger-text"),  glow: "rgba(209,41,31,0.25)" },
        success: { DEFAULT: v("success"), text: v("success-text"), tint: v("success-tint"), light: v("success-tint"), dark: v("success-text"), glow: "rgba(18,128,59,0.25)" },
        warning: { DEFAULT: v("warning"), text: v("warning-text"), tint: v("warning-tint") },
        info:    { DEFAULT: v("info"),    text: v("info-text"),    tint: v("info-tint") },
        streak:  { DEFAULT: v("streak"),  text: v("streak-text"),  tint: v("streak-tint") },
        epic:    { DEFAULT: v("epic"),    text: v("epic-text"),    tint: v("epic-tint") },

        // The app was written for a dark surface and uses Tailwind's stock palettes
        // for "bright on dark" text. Re-pointing the scales keeps those classes
        // readable on light: 100-400 = text shades, 500/600 = solid, 700+ = borders.
        slate: {
          50: v("ink"), 100: v("ink"), 200: v("ink"), 300: v("ink2"), 400: v("ink3"),
          500: "rgb(82 94 121 / <alpha-value>)", 600: "rgb(82 94 121 / <alpha-value>)",
          700: "rgb(82 94 121 / <alpha-value>)", 800: v("sunken"), 900: v("raised"), 950: v("page"),
        },
        ...Object.fromEntries(["red", "rose"].map((n) => [n, status("danger")])),
        amber:   status("warning"),
        yellow:  status("warning"),
        emerald: status("success"),
        green:   status("success"),
        orange:  status("streak"),
        blue:    status("info"),
        sky:     status("info"),
        indigo:  status("info"),
        teal:    { 50: v("accent-tint"), 100: v("accent-tint"), 200: v("accent-tint"), 300: v("accent-text"), 400: v("accent-text"), 500: v("accent"), 600: v("accent"), 700: v("accent-text"), 800: v("accent-text"), 900: v("accent-text") },
        violet:  status("epic"),
        fuchsia: status("epic"),
        pink:    status("epic"),
      },

      // ── Box Shadows (soft, no neon glow) ──────────────────────────────────
      boxShadow: {
        card:             "var(--shadow-1)",
        "card-hover":     "var(--shadow-2)",
        "glow-cyan":      "0 0 0 4px rgb(var(--c-accent) / 0.18)",
        "glow-cyan-sm":   "0 0 0 3px rgb(var(--c-accent) / 0.15)",
        "glow-gold":      "0 0 0 4px rgba(255,194,26,0.35)",
        "glow-gold-sm":   "0 0 0 3px rgba(255,194,26,0.30)",
        "glow-purple":    "0 0 0 4px rgba(42,98,236,0.18)",
        "glow-purple-sm": "0 0 0 3px rgba(42,98,236,0.15)",
        "glow-danger":    "0 0 0 4px rgba(209,41,31,0.20)",
        glass:            "var(--shadow-2)",
      },

      // Direction C floor: nothing below 14px
      fontSize: { xs: ["0.875rem", { lineHeight: "1.25rem" }] },

      // ── Border Radii (8 / 12 / 20) ────────────────────────────────────────
      borderRadius: {
        sm:    "0.5rem",
        md:    "0.75rem",
        lg:    "0.75rem",
        xl:    "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        pill:  "9999px",
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        sans:    ["Figtree", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Figtree", "system-ui", "sans-serif"],
        num:     ["Source Serif 4", "Georgia", "serif"],
        mono:    ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },

      // ── Background Images (gradients) ─────────────────────────────────────
      backgroundImage: {
        "gradient-brand":   "linear-gradient(135deg, rgb(var(--c-accent)) 0%, rgb(var(--c-accent-text)) 100%)",
        "gradient-gold":    "linear-gradient(135deg, #FFD34D 0%, #FFC21A 100%)",
        "gradient-danger":  "linear-gradient(135deg, rgb(var(--c-danger)) 0%, rgb(var(--c-danger-text)) 100%)",
        "gradient-surface": "linear-gradient(180deg, var(--surface-raised) 0%, var(--surface-page) 100%)",
        "gradient-card":    "linear-gradient(180deg, var(--surface-raised) 0%, var(--surface-raised) 100%)",
      },

      // ── Transitions ───────────────────────────────────────────────────────
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        snap:   "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
        fast:    "100ms",
        slow:    "350ms",
        glacial: "600ms",
      },

      // ── Keyframe Animations ───────────────────────────────────────────────
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition:  "200% center" },
        },
        "xp-fill": {
          "0%":   { width: "0%" },
          "100%": { width: "var(--xp-width, 100%)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        float:        "float 3s ease-in-out infinite",
        shimmer:      "shimmer 2.5s linear infinite",
        "xp-fill":    "xp-fill 1s cubic-bezier(0.34,1.56,0.64,1) forwards",
      },
    },
  },
  plugins: [
    plugin(function ({ addComponents, addUtilities, theme }) {
      // ── Glass-panel components ─────────────────────────────────────────
      addComponents({
        ".glass-panel": {
          background: "var(--surface-raised)",
          border:     "1px solid var(--border-subtle)",
          boxShadow:  "var(--shadow-1)",
        },
        ".glass-panel-light": {
          background: "var(--surface-raised)",
          border:     "1px solid var(--border-subtle)",
          boxShadow:  "var(--shadow-1)",
        },
        ".text-gradient-brand": { color: "var(--accent-text)" },
        ".text-gradient-gold":  { color: "var(--gold-text)" },
        ".xp-bar": {
          height:       "8px",
          borderRadius: "9999px",
          background:   "var(--surface-sunken)",
          overflow:     "hidden",
        },
        ".xp-bar-fill": {
          height:       "100%",
          borderRadius: "9999px",
          background:   "var(--xp-fill)",
          transition:   "width 1s cubic-bezier(0.34,1.56,0.64,1)",
        },
      });

      // ── Glow border utilities ──────────────────────────────────────────
      addUtilities({
        ".border-glow-cyan":   { border: "1px solid rgb(var(--c-accent) / 0.45)" },
        ".border-glow-gold":   { border: "1px solid var(--gold-edge)" },
        ".border-glow-purple": { border: "1px solid rgba(42,98,236,0.45)" },
        ".scanlines":          {},
        ".font-num":           { fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums" },
      });
    }),
  ],
};

