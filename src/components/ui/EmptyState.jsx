import { Link } from "react-router-dom";
import Tally from "./Tally";

// Every empty state names the next action (UX standard): pass action { label, onClick } or { label, to }.

const ACTION_CLS =
  "mt-1 inline-flex h-9 items-center rounded-xl border border-border-subtle bg-bg-surface px-5 text-sm font-bold text-text-primary hover:bg-bg-muted transition-colors";

export default function EmptyState({
  pose = "thinking",
  heading,
  body,
  action,
  className = "",
}) {
  return (
    <div className={`flex flex-col items-center gap-3 py-14 text-center ${className}`}>
      <Tally pose={pose} size={88} />
      {heading && (
        <p className="text-base font-bold text-text-primary max-w-xs leading-snug">
          {heading}
        </p>
      )}
      {body && (
        <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
          {body}
        </p>
      )}
      {action && (action.to ? (
        <Link to={action.to} className={ACTION_CLS}>{action.label}</Link>
      ) : (
        <button type="button" onClick={action.onClick} className={ACTION_CLS}>{action.label}</button>
      ))}
    </div>
  );
}
