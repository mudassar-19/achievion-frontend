import useUiStore from "@/stores/uiStore";

// ── Celebrations (this browser only) ───────────────────────────────────────
const CELEBRATION_OPTIONS = [
  { value: "full",  label: "Full",  desc: "Mascot in toasts and full-screen moments." },
  { value: "quiet", label: "Quiet", desc: "Plain toasts, no full-screen moments." },
  { value: "off",   label: "Off",   desc: "No celebration effects at all." },
];

export default function CelebrationsChoice() {
  const mode = useUiStore((s) => s.celebrations);
  const set  = useUiStore((s) => s.setCelebrations);
  return (
    <fieldset className="max-w-lg rounded-xl border border-border-subtle bg-bg-surface px-4 py-3.5">
      <legend className="px-1 text-sm font-bold text-text-primary">Celebrations</legend>
      <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label="Celebrations">
        {CELEBRATION_OPTIONS.map((o) => (
          <label
            key={o.value}
            className={[
              "flex min-h-[40px] cursor-pointer items-center rounded-lg border px-4 text-sm font-semibold",
              mode === o.value ? "border-accent bg-accent-tint text-accent-text" : "border-border-subtle text-text-secondary hover:bg-bg-muted",
              "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]",
            ].join(" ")}
          >
            <input type="radio" name="celebrations" value={o.value} checked={mode === o.value}
              onChange={() => set(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      <p className="mt-2 text-sm text-text-secondary">{CELEBRATION_OPTIONS.find((o) => o.value === mode)?.desc}</p>
    </fieldset>
  );
}

