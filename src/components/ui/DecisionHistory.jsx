// Decided account requests with BOTH notes (items 10 and 55, D-533): why it was asked and what the Director answered.
// Shared by the Director queue and the Org admin approvals page. Filters: All decided, Rejected, Suspended.
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

const SCOPES = [["decided", "All decided"], ["rejected", "Rejected"], ["suspended", "Suspended"]];
const TONE = { APPROVED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25", REJECTED: "bg-rose-500/10 text-rose-700 border-rose-500/25", EXPIRED: "bg-ink/[0.05] text-text-secondary border-ink/[0.1]" };
const when = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

export default function DecisionHistory({ path, headers }) {
  const [scope, setScope] = useState("decided");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    setRows(null); setError(null);
    api.get(`${path}?scope=${scope}`, { headers, silent: true }).then((d) => setRows(d.decisions ?? [])).catch((e) => setError(e?.message ?? "Could not load the history."));
  }, [path, scope]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  return (
    <section aria-label="Decided requests" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-black text-text-primary">Decided requests</h2>
        <div role="group" aria-label="Which decided requests" className="flex gap-1.5">
          {SCOPES.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={scope === k} onClick={() => setScope(k)}
              className={`min-h-8 rounded-full border px-3 text-xs font-semibold ${scope === k ? "border-[#14203D] bg-[#14203D] text-white" : "border-border-subtle bg-white text-text-primary hover:bg-bg-muted"}`}>{l}</button>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {!error && rows === null && <p role="status" className="text-sm text-text-secondary">Loading…</p>}
      {rows?.length === 0 && <p className="text-sm text-text-secondary">Nothing here yet.</p>}
      {rows?.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 rounded-xl border border-ink/[0.08] bg-bg-surface p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-text-primary">{r.action}: {r.target}{r.targetRole ? ` (${r.targetRole})` : ""}</span>
                <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${TONE[r.status] ?? TONE.EXPIRED}`}>{r.status === "APPROVED" ? "Approved" : r.status === "REJECTED" ? "Rejected" : "Expired"}</span>
                <span className="text-xs text-text-secondary">{when(r.decidedAt)}{r.decidedBy ? ` · ${r.decidedBy}` : ""}</span>
              </div>
              {r.requesterReason && <p className="text-xs text-text-secondary"><span className="font-bold text-text-primary">Why it was asked: </span>{r.requesterReason}</p>}
              {r.directorNote && <p className="text-xs text-text-secondary"><span className="font-bold text-text-primary">Director's note: </span>{r.directorNote}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
