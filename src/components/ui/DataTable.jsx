import { ChevronUp, ChevronDown } from "lucide-react";
import ErrorState from "./ErrorState";
import Skeleton from "./Skeleton";
import { BTN } from "./buttons";

/**
 * Shared table (UNIVERSAL_SHELL.md §3): sticky header, sortable columns, row hover with up to 2 quick actions,
 * pagination (server pages of 25), and the 3 states.
 * columns: [{ key, label, sortable?, render?(row), className? }]
 * sort: { key, dir: "asc"|"desc" }, onSort(key) · page, total, pageSize, onPage(n)
 * rowClassName(row) → extra classes for that row (optional) · onRowClick(row) · rowActions(row) → [{ label, icon, onClick }] (max 2)
 * empty: node shown when there are no rows · loading · error + onRetry
 */
export default function DataTable({ label, columns, rows, rowKey = (r) => r.id, sort, onSort, page = 1, total = 0, pageSize = 25, onPage,
  onRowClick, rowActions, rowClassName, empty, loading, error, onRetry }) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0, to = Math.min(page * pageSize, total);

  return (
    <div className="glass-panel overflow-hidden rounded-2xl border border-ink/[0.07]">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse text-left text-sm" aria-label={label} aria-busy={loading || undefined}>
          <thead className="sticky top-0 z-10 bg-[#F7F8FB]">
            <tr className="border-b border-ink/[0.06]">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={`whitespace-nowrap px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500 ${c.className ?? ""}`}>
                    {c.sortable && onSort ? (
                      <button type="button" onClick={() => onSort(c.key)} className="inline-flex min-h-8 items-center gap-1 rounded uppercase hover:text-text-primary">
                        {c.label}
                        {active ? (sort.dir === "asc" ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />) : null}
                      </button>
                    ) : c.label}
                  </th>
                );
              })}
              {rowActions && <th scope="col" className="w-px px-4 py-3"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 6 }, (_, i) => (
              <tr key={i} className="border-b border-ink/[0.04]">
                {columns.map((c) => <td key={c.key} className="px-4 py-4"><Skeleton className="h-3.5 w-3/4 rounded-md" /></td>)}
                {rowActions && <td />}
              </tr>
            )) : rows.map((r) => (
              <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === "Enter" && e.target === e.currentTarget) onRowClick(r); } : undefined}
                className={`group border-b border-ink/[0.04] transition-colors hover:bg-ink/[0.03] focus-within:bg-ink/[0.03] ${onRowClick ? "cursor-pointer" : ""} ${rowClassName?.(r) ?? ""}`}>
                {columns.map((c) => <td key={c.key} className={`px-4 py-3 align-middle break-words ${c.className ?? ""}`}>{c.render ? c.render(r) : r[c.key]}</td>)}
                {rowActions && (
                  <td className="whitespace-nowrap px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      {rowActions(r).slice(0, 2).map((a) => (
                        <button key={a.label} type="button" onClick={() => a.onClick(r)} aria-label={`${a.label}: ${r.title ?? r.name ?? ""}`} title={a.label} className={BTN.icon}>
                          <a.icon size={15} aria-hidden="true" />
                        </button>
                      ))}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && empty}
      </div>
      {!loading && total > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-ink/[0.06] px-4 py-3">
          <p className="text-xs text-text-secondary tabular-nums">{from}–{to} of {total}</p>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className={BTN.secondary}>Previous</button>
            <span className="px-2 text-xs font-semibold tabular-nums text-text-secondary">Page {page} of {pages}</span>
            <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages} className={BTN.secondary}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
