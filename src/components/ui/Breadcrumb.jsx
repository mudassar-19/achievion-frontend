import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// L2 breadcrumb (UNIVERSAL_SHELL.md §2): items = [{ label, to? }]; the last item is the current page.
export default function Breadcrumb({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-1">
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-[13px] font-semibold text-text-secondary">
        {items.map((it, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight size={13} aria-hidden="true" className="shrink-0 text-slate-400" />}
            {it.to && i < items.length - 1
              ? <Link to={it.to} title={typeof it.label === "string" ? it.label : undefined} className="block max-w-[28ch] truncate rounded hover:text-text-primary hover:underline">{it.label}</Link>
              : <span aria-current={i === items.length - 1 ? "page" : undefined} title={typeof it.label === "string" ? it.label : undefined} className="block max-w-[40ch] truncate text-text-primary">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
