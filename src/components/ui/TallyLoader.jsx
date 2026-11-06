import Tally from "./Tally";

// Gamified loader: the mascot "works" while data is on its way. It only renders while a
// request is already pending, so it never adds a delay of its own.
export default function TallyLoader({ label = "Loading…", size = 72, className = "" }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center gap-1 ${className}`}>
      <Tally pose="working" size={size} />
      <span className="text-sm font-semibold text-text-secondary">{label}</span>
    </div>
  );
}
