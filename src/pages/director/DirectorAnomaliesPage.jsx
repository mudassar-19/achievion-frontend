// Anomaly report for the Director (Batch 5, D9; UC "Manage Organisation Settings" alternative flow: "Director reviews
// audit logs and AI anomaly reports"). Read only: the decision (dismiss / confirm) stays with the Manager.
// Data: GET /api/director/anomalies?status=open|reviewed|all&reason=<kind>&page=n. Filters live in the URL.
import { useSearchParams } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import useLoad from "@/pages/manager/project/useLoad";
import { fmt } from "@/pages/manager/project/format";

const STATUS = [{ value: "all", label: "All" }, { value: "open", label: "Open" }, { value: "reviewed", label: "Decided" }];
const REASONS = [["", "Every reason"], ["xp_outlier", "XP far from this person's usual"], ["rubber_stamp", "Approved very quickly with 5 stars"], ["burst", "Many approvals in one hour"], ["ai_tl_disagreement", "AI and Team Lead scores differ"]];
const WORD = { open: ["Open", "text-[#8A4B00] bg-[#B25E00]/10"], dismissed: ["No issue found", "text-[#0E6A30] bg-[#0E6A30]/10"], confirmed: ["Confirmed, XP taken back", "text-[#B01F17] bg-[#B01F17]/10"] };

export default function DirectorAnomaliesPage() {
  const [sp, setSp] = useSearchParams();
  const status = sp.get("status") ?? "all", reason = sp.get("reason") ?? "", page = Math.max(1, Number(sp.get("page")) || 1);
  const q = new URLSearchParams({ status, ...(reason && { reason }), page });
  const { data, error, reload } = useLoad(`/api/director/anomalies?${q}`);
  const set = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== "page") n.delete("page"); setSp(n, { replace: true }); };
  const columns = [
    { key: "date", label: "Raised", className: "whitespace-nowrap", render: (r) => fmt(r.date) },
    { key: "people", label: "Person", className: "min-w-[160px]", render: (r) => <span className="font-bold text-text-primary">{r.people.map((p) => p.name).join(", ") || "—"}</span> },
    { key: "task", label: "Task", className: "min-w-[200px]", render: (r) => <span className="[overflow-wrap:anywhere]">{r.task}</span> },
    { key: "reason", label: "Reason", className: "min-w-[180px]" },
    { key: "xp", label: "XP", render: (r) => <span className="tabular-nums">{r.xp ?? "—"}</span> },
    { key: "status", label: "Status", className: "whitespace-nowrap", render: (r) => <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${WORD[r.status]?.[1] ?? ""}`}>{WORD[r.status]?.[0] ?? r.status}</span> },
    { key: "decidedBy", label: "Decided by", className: "min-w-[150px]", render: (r) => (r.decidedBy ? <span>{r.decidedBy}<span className="block text-xs text-text-secondary">{r.decidedAt ? fmt(r.decidedAt) : ""}</span></span> : <span className="text-text-secondary">Not decided yet</span>) },
  ];
  return (
    <Page>
      <PageHeader title="Anomaly report" subtitle="XP awards that the checks flagged for a second look. A flag is a question, not a verdict. Managers decide; you read the result here." />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <FilterChips label="Status" param="status" fallback="all" options={STATUS} />
        <label className="flex min-w-0 items-center gap-2 text-xs font-bold text-text-secondary">Reason
          <select value={reason} onChange={(e) => set("reason", e.target.value)} className="h-8 min-w-0 rounded-xl border border-border-subtle bg-bg-surface px-2 text-sm font-semibold text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
            {REASONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        {data && <p className="text-sm text-text-secondary tabular-nums" role="status">{data.total} {data.total === 1 ? "flag" : "flags"}</p>}
      </div>
      <DataTable label="Anomaly report" columns={columns} rows={data?.items ?? []} rowKey={(r) => r.id} loading={!data && !error} error={error} onRetry={reload}
        page={page} total={data?.total ?? 0} pageSize={data?.pageSize ?? 25} onPage={(n) => set("page", String(n))}
        empty={<EmptyState pose="thinking" heading="No flags here" body={status === "all" && !reason ? "The checks have not flagged any XP award in this organisation." : "Nothing matches these filters."} action={status !== "all" || reason ? { label: "Show all flags", to: "?" } : undefined} />} />
      <p className="flex items-start gap-2 text-xs text-text-secondary"><ShieldAlert size={13} aria-hidden="true" className="mt-0.5 shrink-0" />The Manager opens a flag under Anomalies and either finds no issue or confirms it; a confirmed flag takes the XP back through the ledger. Each decision is in the audit log.</p>
    </Page>
  );
}
