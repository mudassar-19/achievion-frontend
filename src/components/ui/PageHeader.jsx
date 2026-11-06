import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

// Page title + one line "what this page is for" (UX standard). Optional back = { to, label }.
export default function PageHeader({ title, subtitle, primary, secondary, back, children, className = "" }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0 max-w-full">
        {back && (
          <Link
            to={back.to}
            className="mb-1 inline-flex items-center gap-1 text-[13px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {back.label ?? "Back"}
          </Link>
        )}
        <h1 title={typeof title === "string" ? title : undefined} className={`${typeof title === "string" && title.length > 60 ? "line-clamp-2 " : ""}text-xl font-black text-text-primary tracking-tight leading-tight [overflow-wrap:anywhere]`}>
          {title}
        </h1>
        {subtitle && (
          <div className="mt-0.5 text-sm text-text-secondary leading-snug [overflow-wrap:anywhere]">{subtitle}</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {children}
        {secondary && (
          <button
            type="button"
            onClick={secondary.onClick}
            disabled={secondary.disabled}
            className="h-9 rounded-xl border border-border-subtle bg-bg-surface px-4 text-sm font-bold text-text-primary hover:bg-bg-muted transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {secondary.label}
          </button>
        )}
        {primary && (
          <button
            type="button"
            onClick={primary.onClick}
            disabled={primary.disabled}
            className="h-9 rounded-xl px-4 text-sm font-bold text-white transition-all disabled:opacity-40 whitespace-nowrap"
            style={{ background: "var(--accent)" }}
          >
            {primary.label}
          </button>
        )}
      </div>
    </div>
  );
}
