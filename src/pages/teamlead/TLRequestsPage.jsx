// Team Lead requests inbox (E-3, D-180): more time and one more try from the TL's own people. Not in the rail (the rail stays as
// it is); reached from the notification. Decline needs a short note. Data: GET /api/teamlead/requests.
import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, RotateCcw } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import { BTN } from "@/components/ui/buttons";
import useLoad from "../manager/project/useLoad";
import { fmt, fmtDateTime } from "../manager/project/format";

function Decide({ id, onDecide, allowLabel, declineLabel }) {
  const [note, setNote] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  async function go(yes) {
    if (!yes && note.trim().length < 5) { setErr("Say why in a few words before you decline."); return; }
    setBusy(true); setErr(null);
    try { await onDecide(yes, note.trim()); } catch (e) { setErr(e?.message ?? "That did not work."); setBusy(false); }
  }
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`note-${id}`} className="flex flex-col gap-1 text-xs font-bold">Note to the person (needed to decline)
        <input id={`note-${id}`} name="note" autoComplete="off" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={!!err} className="h-10 rounded-xl px-3 text-sm font-normal" /></label>
      {err && <p role="alert" className="text-xs font-semibold text-[#B01F17]">{err}</p>}
      <span className="flex flex-wrap gap-2"><button type="button" className={BTN.primary} disabled={busy} onClick={() => go(true)}>{allowLabel}</button><button type="button" className={BTN.secondary} disabled={busy} onClick={() => go(false)}>{declineLabel}</button></span>
    </div>
  );
}

export default function TLRequestsPage() {
  const addToast = useUiStore((s) => s.addToast);
  const { data, error, reload, setData } = useLoad("/api/teamlead/requests");
  const done = (msg) => { addToast({ type: "success", message: msg }); api.get("/api/teamlead/requests").then(setData).catch(reload); };
  const header = <PageHeader title="Requests" subtitle="Your people ask for more time or for one more try. You decide; they are told at once.">
    <Link to="/teamlead/bugs" className={BTN.secondary}>Bugs to check</Link>{/* E-4: bug checks live on their own page */}
  </PageHeader>;
  if (error) return <Page>{header}<ErrorState message={error} onRetry={reload} /></Page>;
  if (!data) return <Page>{header}<div aria-busy="true" aria-label="Loading requests" className="flex flex-col gap-3">{[0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div></Page>;
  const none = !data.extensions.length && !data.tries.length;
  return (
    <Page>
      {header}
      {none ? <Panel title="Open requests" icon={CalendarClock}><EmptyState pose="cheer" heading="No open requests" body="Requests for more time or one more try show up here." action={{ label: "Open Tasks", to: "/teamlead/tasks" }} /></Panel> : (
        <>
          {data.extensions.length > 0 && (
            <Panel title={`More time (${data.extensions.length})`} icon={CalendarClock}>
              <ul className="divide-y divide-ink/[0.05]">{data.extensions.map((e) => (
                <li key={e.taskId} className="flex flex-col gap-3 px-5 py-4 text-sm">
                  <div className="min-w-0"><p className="font-bold text-text-primary [overflow-wrap:anywhere]">{e.task}</p>
                    <p className="text-xs text-text-secondary">{e.who}{e.project ? ` · ${e.project}` : ""} · asked {fmtDateTime(e.at)}</p>
                    <p className="mt-1 tabular-nums">Deadline {fmt(e.deadline)} → <strong>{fmt(e.requestedDeadline)}</strong></p>
                    <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{e.reason}</p></div>
                  <Decide id={`e-${e.taskId}`} allowLabel="Approve" declineLabel="Decline"
                    onDecide={async (yes, note) => { await api.post(`/api/teamlead/requests/extension/${e.taskId}`, { approved: yes, note }); done(yes ? "New deadline approved." : "Request declined."); }} />
                </li>))}</ul>
            </Panel>
          )}
          {data.tries.length > 0 && (
            <Panel title={`One more try (${data.tries.length})`} icon={RotateCcw}>
              <ul className="divide-y divide-ink/[0.05]">{data.tries.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 px-5 py-4 text-sm">
                  <div className="min-w-0"><p className="font-bold text-text-primary [overflow-wrap:anywhere]">{r.task}</p>
                    <p className="text-xs text-text-secondary">{r.who} · sent back {r.attempts}{r.max != null ? ` of ${r.max}` : ""} times · {fmtDateTime(r.at)}</p>
                    <p className="mt-1 whitespace-pre-wrap text-text-secondary [overflow-wrap:anywhere]">{r.message}</p></div>
                  <Decide id={`t-${r.id}`} allowLabel="Allow" declineLabel="Decline"
                    onDecide={async (yes, note) => { await api.post(`/api/teamlead/requests/limit/${r.id}`, { decision: yes ? "allow" : "decline", note }); done(yes ? "One more try allowed." : "Request declined."); }} />
                </li>))}</ul>
            </Panel>
          )}
        </>
      )}
    </Page>
  );
}
