import Tally from "./Tally";

// Shared "this failed to load" block (FE-049 / FE-R023): shows the real message and a retry,
// so a failed request is never drawn as "0 results".
export default function ErrorState({ message = "Something went wrong.", onRetry, className = "" }) {
  return (
    <div role="alert" className={`flex flex-col items-center gap-3 py-16 text-center ${className}`}>
      <Tally pose="alert" size={96} />
      <p className="max-w-md text-base font-semibold text-text-primary">Could not load this page</p>
      <p className="max-w-md text-sm text-text-secondary">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="h-10 rounded-xl border border-border-subtle bg-bg-surface px-5 text-sm font-bold text-text-primary hover:bg-bg-muted">
          Try again
        </button>
      )}
    </div>
  );
}
