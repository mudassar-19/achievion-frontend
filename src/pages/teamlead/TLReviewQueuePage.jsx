// Team Lead review queue + history (T-4, D-136; UX TL v4 §8.1, §8.3). Oldest first, 25 per page, filters in the URL.
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardCheck, Clock, Flag, ShieldCheck, Sparkles } from "lucide-react";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import FilterChips from "@/components/ui/FilterChips";
import DataTable from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import { BTN } from "@/components/ui/buttons";
import useLoad from "../manager/project/useLoad";
import { fmt, fmtDateTime } from "../manager/project/format";
import { AI_LABEL, QA_LABEL, QA_TONE, stars } from "./reviewText";

const ROLES = ["Developer", "Designer", "Tester"].map((r) => ({ value: r, label: r }));
const DECISION = { approved: "Approved", conditional: "Conditional", revision: "Sent back" };
const select = "h-8 min-w-0 max-w-[220px] truncate rounded-xl border border-border-subtle bg-bg-surface px-2 text-sm font-semibold text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]";

function Pager({ page, total, pageSize, onPage }) {
  if (total <= pageSize) return null;
  const pages = Math.ceil(total / pageSize);
  return (
    <div className="flex items-center justify-end gap-2 text-xs text-text-secondary">
      <button type="button" className={BTN.secondary} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="tabular-nums">Page {page} of {pages}</span>
      <button type="button" className={BTN.secondary} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

function Card({ t }) {
  const qa = QA_TONE[t.qa];
  return (
    <li>
      <Link to={`/teamlead/review/${t.id}`} className="glass-panel flex min-w-0 flex-col gap-2 rounded-2xl border border-ink/[0.07] px-5 py-4 transition-colors hover:bg-ink/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus)]">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="min-w-0 max-w-full truncate text-sm font-black text-text-primary" title={t.title}>{t.title}</p>
          <span className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs font-bold">
            {t.mine && <span className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-text-secondary">Your own work</span>}
            {t.revisions > 0 && <span className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-text-secondary">Revision {t.revisions}</span>}
            <span className="inline-flex items-center gap-1 rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-text-secondary"><Sparkles size={11} aria-hidden="true" />{AI_LABEL[t.ai]}</span>
            {qa && <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5" style={{ color: qa.fg, background: qa.bg }}><ShieldCheck size={11} aria-hidden="true" />{QA_LABEL[t.qa]}</span>}
          </span>
        </div>
        <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-text-secondary">
          <span className="min-w-0 max-w-[32ch] truncate font-semibold text-text-primary" title={t.assignees.join(", ")}>{t.assignees.join(", ") || "Nobody"}</span>
          <span className="min-w-0 max-w-[40ch] truncate" title={t.moduleTitle ?? t.projectTitle}>{t.moduleTitle ?? t.projectTitle}</span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap"><Clock size={12} aria-hidden="true" />Submitted {fmtDateTime(t.submittedAt)}</span>
          {t.deadline && <span className="whitespace-nowrap">Due {fmt(t.deadline)}</span>}
          <span className="inline-flex items-center gap-1 whitespace-nowrap"><Flag size={12} aria-hidden="true" />{t.priority}</span>
        </p>
      </Link>
    </li>
  );
}

function Queue() {
  const [sp, setSp] = useSearchParams();
  const q = new URLSearchParams();
  for (const k of ["view", "role", "module", "assignee", "page"]) if (sp.get(k)) q.set(k, sp.get(k));
  const { data, error, reload } = useLoad(`/api/teamlead/review/queue?${q}`);
  const set = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); if (k !== "page") n.delete("page"); setSp(n, { replace: true }); };
  const c = data?.counts;
  const filtered = ["view", "role", "module", "assignee"].some((k) => sp.get(k));
  const views = [["all", "All", c?.all], ["today", "Today", c?.today], ["high", "High priority", c?.high], ["overdue", "Overdue", c?.overdue], ["stale", "Waiting over 2 days", c?.stale]]
    .map(([value, label, n]) => ({ value, label: n === undefined ? label : `${label} (${n})` }));
  return (
    <>
      <div className="flex flex-col gap-3">
        <FilterChips label="Show" param="view" fallback="all" options={views} />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <FilterChips label="Role" param="role" options={ROLES} />
          {(data?.modules?.length ?? 0) > 0 && (
            <label className="flex min-w-0 items-center gap-2 text-xs font-bold text-text-secondary">Module
              <select className={select} value={sp.get("module") ?? ""} onChange={(e) => set("module", e.target.value)}>
                <option value="">All modules</option>
                {data.modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </label>
          )}
          {(data?.assignees?.length ?? 0) > 0 && (
            <label className="flex min-w-0 items-center gap-2 text-xs font-bold text-text-secondary">Assignee
              <select className={select} value={sp.get("assignee") ?? ""} onChange={(e) => set("assignee", e.target.value)}>
                <option value="">Everyone</option>
                {data.assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : !data ? <div className="flex flex-col gap-3" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        : data.items.length === 0 ? <EmptyState pose="celebrating" heading={filtered ? "Nothing matches these filters" : "Nothing is waiting for review"} body={filtered ? "Clear a filter to see more." : "New submissions appear here, oldest first."} action={filtered ? { label: "Clear filters", to: "/teamlead/review-submissions" } : undefined} />
        : (<>
          <ul className="flex flex-col gap-2">{data.items.map((t) => <Card key={t.id} t={t} />)}</ul>
          <Pager page={data.page} total={data.total} pageSize={data.pageSize} onPage={(n) => set("page", n > 1 ? String(n) : null)} />
        </>)}
    </>
  );
}

function History() {
  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get("page")) || 1;
  const { data, error, reload } = useLoad(`/api/teamlead/review/history?page=${page}`);
  const columns = [
    { key: "at", label: "When", className: "whitespace-nowrap tabular-nums", render: (r) => fmtDateTime(r.at) },
    { key: "task", label: "Task", className: "min-w-[220px]", render: (r) => <Link to={`/teamlead/review/${r.taskId}`} title={r.title} className="block min-h-6 max-w-[320px] truncate font-bold leading-6 text-text-primary hover:underline">{r.title}</Link> },
    { key: "who", label: "Assignee", render: (r) => <span title={r.assignees.join(", ")} className="block max-w-[180px] truncate">{r.assignees.join(", ") || "—"}</span> },
    { key: "kind", label: "Decision", className: "whitespace-nowrap", render: (r) => <span className="font-bold">{DECISION[r.kind]}</span> },
    { key: "score", label: "Score", className: "tabular-nums", render: (r) => r.tlScore ?? "—" },
    { key: "stars", label: "Stars", className: "whitespace-nowrap", render: (r) => (r.stars ? <span aria-label={`${r.stars} stars`}>{stars(r.stars)}</span> : "—") },
    { key: "ai", label: "AI score", className: "tabular-nums", render: (r) => r.aiScore ?? "—" },
    { key: "note", label: "Note", render: (r) => <span title={r.note} className="block max-w-[260px] truncate text-text-secondary">{r.note || "—"}</span> },
  ];
  return <DataTable label="Review history" columns={columns} rows={data?.items ?? []} loading={!data && !error} error={error} onRetry={reload} page={page} total={data?.total ?? 0} pageSize={data?.pageSize ?? 25}
    onPage={(n) => { const x = new URLSearchParams(sp); if (n > 1) x.set("page", String(n)); else x.delete("page"); setSp(x, { replace: true }); }}
    empty={<EmptyState heading="No reviews yet" body="Approvals and revisions you and other reviewers make appear here." />} />;
}

export default function TLReviewQueuePage() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") === "history" ? "history" : "queue";
  return (
    <Page>
      <PageHeader title="Review" subtitle="Submitted work, oldest first. You decide; only an approval here moves a task to Done." />
      <div role="tablist" aria-label="Review sections" className="flex gap-1 border-b border-border-subtle">
        {[["queue", "Queue", ClipboardCheck], ["history", "History", Clock]].map(([k, l, Icon]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setSp(k === "queue" ? {} : { tab: k }, { replace: true })}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${tab === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}><Icon size={14} aria-hidden="true" />{l}</button>
        ))}
      </div>
      {tab === "queue" ? <Queue /> : <History />}
    </Page>
  );
}
