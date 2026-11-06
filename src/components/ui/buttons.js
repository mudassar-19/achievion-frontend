// Button set (UNIVERSAL_SHELL.md §Buttons). Same classes as PageHeader / ConfirmModal so every portal matches.
// One primary per view; secondary = outline; danger = red fill only for destructive; ghost = text; icon = 36px square.
const base = "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-sm font-bold transition-colors disabled:opacity-40";
export const BTN = {
  primary:   `${base} bg-accent text-accent-on hover:brightness-110`,
  secondary: `${base} border border-border-subtle bg-bg-surface text-text-primary hover:bg-bg-muted`,
  danger:    `${base} bg-[#D1291F] text-white hover:brightness-110`,
  ghost:     `${base} text-text-secondary hover:bg-ink/[0.06] hover:text-text-primary`,
  icon:      "inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:bg-ink/[0.06] hover:text-text-primary transition-colors disabled:opacity-40",
};
