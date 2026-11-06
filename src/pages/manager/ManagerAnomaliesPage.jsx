// Manager Anomalies (V2 Phase 3 · M-5, UX §9, D-076): XP awards that need review. Neutral wording only.
// Dismiss is reversible (Undo); Confirm reverses the XP through the engine (a negative ledger row, once).
import { fmtDateTime as dTime } from "@/pages/manager/project/format";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import useUrlList from "@/components/ui/useUrlList";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import Drawer from "@/components/ui/Drawer";
import { ExplainFlag } from "./ai/AiCards";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { BTN } from "@/components/ui/buttons";
import useLoad from "./project/useLoad";
import { fmt } from "./project/format";

const REASONS = [["ai_tl_disagreement", "AI and TL differ"], ["xp_outlier", "Unusual XP"], ["rubber_stamp", "Very quick 5 stars"], ["burst", "Many approvals in an hour"]].map(([value, label]) => ({ value, label }));
const STATUS = [{ value: "open", label: "Open" }, { value: "reviewed", label: "Reviewed" }];
const CHIP = { open: ["pending", "Needs review"], dismissed: ["on_hold", "Dismissed"], confirmed: ["at_risk", "XP adjusted"] };
const when = (d) => (d ? dTime(d) : "—");

function Fact({ label, children }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-ink/[0.06] bg-ink/[0.02] px-3 py-2.5">
      <dt className="text-xs font-semibold text-text-secondary">{label}</dt>
      <dd className="text-sm font-bold tabular-nums text-text-primary">{children}</dd>
    </div>
  );
}

function AnomalyDrawer({ flagId, onClose, onChanged }) {
  const addToast = useUiStore((s) => s.addToast);
  const { data: f, error, reload } = useLoad(flagId ? `/api/manager/anomalies/${flagId}` : null);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setNote(""); }, [flagId]); // eslint-disable-line react-hooks/set-state-in-effect

  async function post(action, quiet) {
    setBusy(true);
    try {
      const r = await api.post(`/api/manager/anomalies/${flagId}/${action}`, { note: note.trim() });
      if (action === "dismiss" && !quiet) addToast({ type: "info", message: "Flag dismissed.", undoAction: async () => { await api.post(`/api/manager/anomalies/${flagId}/reopen`).catch(() => {}); reload(); onChanged(); } });
      if (action === "confirm") addToast({ type: "success", message: r.reversed.length ? `Confirmed. XP adjusted: ${r.reversed.map((x) => `${x.xp} XP`).join(", ")}.` : "Confirmed. This XP was already adjusted, so nothing changed." });
      if (action === "reopen") addToast({ type: "info", message: "Flag reopened." });
      setConfirm(false); reload(); onChanged();
    } catch (e) { addToast({ type: "error", message: e?.message ?? "That did not work." }); setConfirm(false); }
    finally { setBusy(false); }
  }

  const open = f?.status === "open";
  return (
    <Drawer open={!!flagId} onClose={onClose} title={f?.label ?? "Flag"} width={520}
      footer={f && (open
        ? <div className="flex justify-end gap-2"><button type="button" className={BTN.secondary} disabled={busy} onClick={() => post("dismiss")}>Dismiss</button>
            <button type="button" className={BTN.primary} disabled={busy || !f.awards.some((a) => a.reversed == null)} onClick={() => setConfirm(true)}>Confirm and adjust XP</button></div>
        : f.status === "dismissed" ? <div className="flex justify-end"><button type="button" className={BTN.secondary} disabled={busy} onClick={() => post("reopen")}>Reopen</button></div> : null)}>
      {!flagId ? null : error ? <ErrorState message={error} onRetry={reload} />
        : !f ? <div className="flex flex-col gap-3 p-5" aria-busy="true" aria-label="Loading evidence"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>
        : (
          <div className="flex flex-col gap-5 p-5 text-sm">
            <div className="flex flex-col gap-2">
              <span className="w-fit"><StatusChip status={CHIP[f.status][0]} label={CHIP[f.status][1]} size="xs" /></span>
              <p className="text-text-primary">{f.reason}</p>
              <p className="text-xs text-text-secondary">A flag only asks for a second look. It does not say anyone did something wrong.</p>
              <ExplainFlag flagId={flagId} />
            </div>
            <section aria-labelledby="ev-h" className="flex flex-col gap-2">
              <h3 id="ev-h" className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Evidence · {f.task.title}</h3>
              <dl className="grid grid-cols-2 gap-2">
                <Fact label="Team Lead score">{f.task.tlScore ?? "—"}{f.task.stars ? ` · ${f.task.stars}★` : ""}</Fact>
                <Fact label="AI score">{f.task.aiScore ?? (f.task.tlScore == null ? "Hidden until the TL scores" : "—")}</Fact>
                <Fact label="Submitted">{when(f.task.submittedAt)}</Fact>
                <Fact label="Approved">{when(f.task.approvedAt)}{f.task.minutesToApprove != null ? ` · ${f.task.minutesToApprove} min later` : ""}</Fact>
                <div className="col-span-2"><Fact label="Reviewer">{f.task.reviewer ?? "—"}</Fact></div>
              </dl>
            </section>
            <section aria-labelledby="aw-h" className="flex flex-col gap-2">
              <h3 id="aw-h" className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">XP awarded</h3>
              {f.awards.length ? (
                <ul className="divide-y divide-ink/[0.05] rounded-xl border border-ink/[0.06]">
                  {f.awards.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <span className="font-semibold text-text-primary">{a.name}</span>
                      <span className="text-xs tabular-nums text-text-secondary">+{a.xp} XP · {fmt(a.at)}{a.reversed != null && <span className="ml-2 font-bold text-[#B01F17]">adjusted {a.reversed} XP</span>}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="rounded-xl bg-ink/[0.03] p-3 text-text-secondary">No XP was awarded for this task yet.</p>}
            </section>
            <section aria-labelledby="hi-h" className="flex flex-col gap-2">
              <h3 id="hi-h" className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Last 90 days</h3>
              {f.people.map((p) => (
                <p key={p.id} className="text-text-secondary"><span className="font-semibold text-text-primary">{p.name}</span> · {p.last90.tasks} approved tasks, {p.last90.avgXp} XP on average{p.last90.avgStars ? `, ${p.last90.avgStars}★ average` : ""}, {p.last90.late} late.</p>
              ))}
              <p className="text-xs text-text-secondary">{f.otherFlags ? `${f.otherFlags} other flag${f.otherFlags === 1 ? "" : "s"} involve the same people.` : "No other flags involve the same people."}</p>
            </section>
            {open ? (
              <label htmlFor="flag-note" className="flex flex-col gap-1.5 font-bold text-text-primary">Note <span className="sr-only">(optional)</span>
                <textarea id="flag-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional. What you checked." className="rounded-xl p-3 font-normal" />
              </label>
            ) : (f.note && <p className="rounded-xl bg-ink/[0.03] p-3 text-text-secondary"><span className="font-semibold text-text-primary">Note:</span> {f.note}</p>)}
          </div>
        )}
      <ConfirmModal open={confirm} layer="z-[70]" onClose={() => setConfirm(false)} onConfirm={() => post("confirm")} loading={busy} destructive confirmLabel="Confirm and adjust XP"
        title="Adjust the XP for this award?"
        body={`The XP from this award is taken back with a new entry in the XP history (the original stays). ${f?.awards.filter((a) => a.reversed == null).map((a) => `${a.name}: −${a.xp} XP`).join(", ")}. They get a short, neutral notice. This cannot be undone.`} />
    </Drawer>
  );
}

export default function ManagerAnomaliesPage() {
  const [sp, setSp] = useSearchParams();
  const statusParam = sp.get("status") === "reviewed" ? "reviewed" : "open";
  const reasons = useUrlList("reason");
  const reasonKey = reasons.join(",");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const flagId = sp.get("flag");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async (quiet) => {
    if (!quiet) { setError(null); setData(null); }
    const q = new URLSearchParams({ status: statusParam, page: String(page) });
    if (reasonKey) q.set("reason", reasonKey);
    try { setData(await api.get(`/api/manager/anomalies?${q}`)); } catch (e) { setError(e?.message ?? "Anomalies could not be loaded."); }
  }, [statusParam, page, reasonKey]);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect
  const set = (k, v) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };

  const columns = [
    { key: "people", label: "Person", className: "min-w-[160px]", render: (r) => <span className="font-bold text-text-primary">{r.people.map((p) => p.name).join(", ") || "—"}</span> },
    { key: "task", label: "Task", className: "min-w-[200px] text-text-secondary", render: (r) => r.task },
    { key: "xp", label: "XP", className: "tabular-nums", render: (r) => (r.xp != null ? r.xp : "—") },
    { key: "reason", label: "Reason", className: "whitespace-nowrap", render: (r) => r.reason },
    { key: "date", label: "Date", className: "whitespace-nowrap tabular-nums", render: (r) => fmt(r.date) },
    { key: "status", label: "Status", render: (r) => <StatusChip status={CHIP[r.status][0]} label={CHIP[r.status][1]} size="xs" /> },
  ];

  return (
    <Page>
      <PageHeader title="Anomalies" subtitle="XP awards that look unusual and need a second look. Nothing changes until you decide." />
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Status" className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-bold text-text-secondary">Status</span>
          {STATUS.map((o) => (
            <button key={o.value} type="button" aria-pressed={statusParam === o.value} onClick={() => { const n = new URLSearchParams(sp); if (o.value === "open") n.delete("status"); else n.set("status", o.value); n.delete("page"); setSp(n, { replace: true }); }}
              className={`inline-flex min-h-8 items-center rounded-xl border px-3 text-xs font-bold transition-colors ${statusParam === o.value ? "border-accent/30 bg-accent/10 text-accent-text" : "border-ink/[0.08] bg-ink/[0.03] text-text-secondary hover:text-text-primary"}`}>{o.label}</button>
          ))}
        </div>
        <FilterChips label="Reason" param="reason" options={REASONS} multi />
      </div>
      <DataTable label="Anomalies" columns={columns} rows={data?.items ?? []} loading={!data && !error} error={error} onRetry={() => load()}
        page={page} total={data?.total ?? 0} pageSize={data?.pageSize ?? 25} onPage={(n) => set("page", n > 1 ? String(n) : null)}
        onRowClick={(r) => set("flag", String(r.id))}
        empty={reasons.length
          ? <EmptyState heading="No flags with these reasons." action={{ label: "Clear filters", onClick: () => set("reason", null) }} />
          : statusParam === "open"
            ? <EmptyState heading="Nothing needs review right now." action={{ label: "See reviewed flags", onClick: () => set("status", "reviewed") }} />
            : <EmptyState heading="No reviewed flags yet." action={{ label: "See open flags", onClick: () => set("status", null) }} />} />
      {!error && <p className="text-xs text-text-secondary">Flags come from four checks: AI and Team Lead scores far apart, XP far from a person's usual, 5 stars within two minutes of submitting, and three or more approvals for one person by one reviewer within an hour.</p>}
      <AnomalyDrawer flagId={flagId} onClose={() => set("flag", null)} onChanged={() => load(true)} />
    </Page>
  );
}
