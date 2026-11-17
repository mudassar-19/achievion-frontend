// Decided account requests with BOTH notes (items 10 and 55, D-533): why it was asked and what the Director answered.
// Shared by the Director queue and the Org admin approvals page. Two filters (A-4, D-QA3B-13): Status (All / Approved / Rejected) and Type
// (Create, Role change, Suspend, Reactivate, Delete); the list is loaded once and filtered here. Ten rows, then "Show more" (A-10).
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/dates";

const SCOPES = [["decided", "All decided"]];
const STATUSES = [["", "All"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"]];
const TYPES = [["", "All types"], ["CREATE_EMPLOYEE", "Create"], ["ROLE_CHANGE", "Role change"], ["SUSPEND_EMPLOYEE", "Suspend"], ["REACTIVATE_EMPLOYEE", "Reactivate"], ["DELETE_EMPLOYEE", "Delete"]];
const PAGE = 10;
const TONE = { APPROVED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25", REJECTED: "bg-rose-500/10 text-rose-700 border-rose-500/25", EXPIRED: "bg-ink/[0.05] text-text-secondary border-ink/[0.1]" };
const when = (d) => (d ? fmtDate(d) : "");

export default function DecisionHistory({ path, headers, scopes = SCOPES, title = "Decided requests" }) {
  const [scope, setScope] = useState(scopes[0][0]);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    setRows(null); setError(null);
    api.get(`${path}?scope=${scope}`, { headers, silent: true }).then((d) => setRows(d.decisions ?? [])).catch((e) => setError(e?.message ?? "Could not load the history."));
  }, [path, scope]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]); // eslint-disable-line react-hooks/set-state-in-effect
  const rich = scopes.length === 1 && scopes[0][0] === "decided"; // the two filters belong to the decided list only
  const all = (rows ?? []).filter((r) => !rich || ((!status || r.status === status) && (!type || r.actionType === type)));
  const list = all.slice(0, shown);

  return (
    <section aria-label="Decided requests" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-black text-text-primary">{title}</h2>
        {rich && (
          <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label="Status" className="flex gap-1.5">
              {STATUSES.map(([k, l]) => (<button key={k} type="button" aria-pressed={status === k} onClick={() => { setStatus(k); setShown(PAGE); }}
                className={`min-h-8 rounded-full border px-3 text-xs font-semibold ${status === k ? "border-[#14203D] bg-[#14203D] text-white" : "border-border-subtle bg-white text-text-primary hover:bg-bg-muted"}`}>{l}</button>))}
            </div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">Type
              <select value={type} onChange={(e) => { setType(e.target.value); setShown(PAGE); }} className="h-8 rounded-lg border border-border-subtle bg-white px-2 text-xs">{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          </div>
        )}
        {scopes.length > 1 && <div role="group" aria-label="Which decided requests" className="flex gap-1.5">
          {scopes.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={scope === k} onClick={() => setScope(k)}
              className={`min-h-8 rounded-full border px-3 text-xs font-semibold ${scope === k ? "border-[#14203D] bg-[#14203D] text-white" : "border-border-subtle bg-white text-text-primary hover:bg-bg-muted"}`}>{l}</button>
          ))}
        </div>}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {!error && rows === null && <p role="status" className="text-sm text-text-secondary">Loading…</p>}
      {rows && all.length === 0 && <p className="text-sm text-text-secondary">{rows.length ? "No request matches these filters." : "Nothing here yet."}</p>}
      {all.length > 0 && (
        <ul className="flex flex-col gap-2">
          {list.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 rounded-xl border border-ink/[0.08] bg-bg-surface p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-text-primary">{r.action}: {r.target}{r.change ? ` (${r.change})` : r.targetRole ? ` (${r.targetRole})` : ""}</span>
                <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${TONE[r.status] ?? TONE.EXPIRED}`}>{r.status === "APPROVED" ? "Approved" : r.status === "REJECTED" ? "Rejected" : "Expired"}</span>
                <span className="text-xs text-text-secondary">Asked {when(r.requestedAt)} by the Org admin · {r.status === "EXPIRED" ? "Expired" : "Decided"} {when(r.decidedAt)}{r.decidedBy ? ` by ${r.decidedBy}` : ""}</span>
              </div>
              <p className="text-xs text-text-secondary"><span className="font-bold text-text-primary">Why it was asked: </span>{r.requesterReason || "No reason given"}</p>
              {r.directorNote && <p className="text-xs text-text-secondary"><span className="font-bold text-text-primary">Director's note: </span>{r.directorNote}</p>}
            </li>
          ))}
        </ul>
      )}
      {all.length > shown && <button type="button" onClick={() => setShown((n) => n + PAGE)} className="self-center min-h-9 rounded-xl border border-border-subtle px-4 text-xs font-bold text-text-primary hover:bg-bg-muted">Show more ({all.length - shown} more)</button>}
    </section>
  );
}
