// S-02: Read-only page of deleted employees for Org admin.
// Visible to Org admin only (the endpoint is behind verifyOrgToken).
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Users, ArrowLeft } from "lucide-react";
import useOrgAuthStore from "@/stores/orgAuthStore";
import api from "@/lib/api";
import TallyLoader from "@/components/ui/TallyLoader";

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const SELECT_CLS = "rounded-xl border border-slate-600 bg-[#FFFFFF] py-2 px-3 text-sm text-text-primary outline-none focus:border-accent focus:shadow-card-hover transition-all";

export default function PastEmployeesPage() {
  const orgToken    = useOrgAuthStore((s) => s.orgToken);
  const authHeaders = { Authorization: `Bearer ${orgToken}` };

  const [rows,    setRows]    = useState([]);
  const [meta,    setMeta]    = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);

  const fetchDeleted = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search.trim()) params.set("search", search.trim());
      const res = await api.get(`/api/org/employees/deleted?${params}`, { headers: authHeaders });
      setRows(res.data ?? []);
      setMeta(res.meta ?? { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      setError(err.message ?? "Failed to load past employees.");
    } finally {
      setLoading(false);
    }
  }, [orgToken, page, search]); // eslint-disable-line

  useEffect(() => { fetchDeleted(); }, [fetchDeleted]);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 min-h-full">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <Link to="/org/employees" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-text-primary transition-colors mb-1 w-fit">
          <ArrowLeft size={12} strokeWidth={2} />
          Back to Employees
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent-text">Admin Panel</p>
        <h1 className="text-3xl font-black text-text-primary">Past Employees</h1>
        <p className="text-sm text-text-secondary mt-1">Read-only record of removed members.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" strokeWidth={2} />
        <input
          type="text"
          placeholder="Search by name or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${SELECT_CLS} pl-8 w-full`}
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-ink/8 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] overflow-hidden">
        {/* Header row */}
        <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1.5fr_2fr_1.5fr_1.5fr] gap-3 px-5 py-3 border-b border-ink/[0.05] bg-ink/[0.02]">
          {["Name", "Role", "Removed on", "Reason", "Requested by", "Approved by"].map((h) => (
            <span key={h} className="text-[14px] font-bold uppercase tracking-widest text-text-disabled">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><TallyLoader /></div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-danger">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users size={32} className="text-text-disabled" strokeWidth={1.5} />
            <p className="text-sm text-slate-600">
              {search.trim() ? "No results for that search." : "No past employees yet."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-ink/[0.04]">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1.5fr_2fr_1.5fr_1.5fr] gap-2 sm:gap-3 items-start px-5 py-4">
                <span className="text-sm font-semibold text-text-primary">{r.name}</span>
                <span className="text-xs text-slate-400">{r.role}</span>
                <span className="text-xs text-slate-400">{fmt(r.removedAt)}</span>
                <span className="text-xs text-slate-500 leading-snug">{r.reason || <span className="text-text-disabled italic">—</span>}</span>
                <span className="text-xs text-slate-400">{r.requestedBy}</span>
                <span className="text-xs text-slate-400">{r.approvedBy}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-disabled">Page {meta.page} of {meta.totalPages} · {meta.total} total</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.page <= 1}
              className="p-2 rounded-lg border border-ink/10 text-slate-400 hover:text-text-primary hover:border-ink/20 transition-all disabled:opacity-30">
              <ChevronLeft size={15} strokeWidth={2} />
            </button>
            <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={meta.page >= meta.totalPages}
              className="p-2 rounded-lg border border-ink/10 text-slate-400 hover:text-text-primary hover:border-ink/20 transition-all disabled:opacity-30">
              <ChevronRight size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
