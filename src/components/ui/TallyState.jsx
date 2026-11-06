import Tally from "./Tally";

/**
 * Reusable Tally state display for empty, error, and success states.
 * pose defaults: empty→encouraging, error→alert, success→cheer
 */
export default function TallyState({
  type = "empty",
  label,
  subLabel,
  children,
  size = 80,
  className = "",
}) {
  const pose = type === "error" ? "alert" : type === "success" ? "cheer" : "encouraging";
  const defaultLabel =
    type === "error"   ? "Something went wrong" :
    type === "success" ? "Done!" :
                         "Nothing here yet";

  return (
    <div className={`flex flex-col items-center justify-center py-12 gap-3 text-center ${className}`}>
      <Tally pose={pose} size={size} aria-hidden />
      <p className="text-sm font-semibold text-text-secondary">{label ?? defaultLabel}</p>
      {subLabel && <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed">{subLabel}</p>}
      {children}
    </div>
  );
}
