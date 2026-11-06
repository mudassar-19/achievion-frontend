// One module (or a whole project) for the Team Lead (V2 Phase 4 · T-1 + T-2, UX TL v4 §3.2, D-115, D-119, D-122).
// Tabs (?tab=): Overview | Breakdown (T-3) | Tasks | Team | Timeline | History. Actions: Accept (new module), Create
// tasks (only after Accept, D-119), Ask a question, Request deadline change (reason; the Manager decides in the Inbox),
// Mark ready for QA sign-off (D-021). Task click → task detail drawer.
import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { FileText, ListChecks, Users, Gauge } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumb from "@/components/ui/Breadcrumb";
import Panel from "@/components/ui/Panel";
import StatCard from "@/components/ui/StatCard";
import Drawer from "@/components/ui/Drawer";
import ConfirmModal from "@/components/ui/ConfirmModal";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import { BTN } from "@/components/ui/buttons";
import useLoad from "../manager/project/useLoad";
import { fmt } from "../manager/project/format";
import { STATUS_KEY, TONE } from "../manager/resources/tone";
import TaskFormDrawer from "./task/TaskFormDrawer";
import TaskDetailDrawer from "./task/TaskDetailDrawer";
import Handoff, { QaChecklist } from "./TLHandoff";

const TABS = [["overview", "Overview"], ["breakdown", "Breakdown"], ["tasks", "Tasks"], ["handoff", "Handoff"], ["team", "Team"], ["timeline", "Timeline"], ["history", "History"]];
const TASK_CHIP = { Backlog: "on_hold", "To-Do": "planned", "In-Progress": "maintenance", "In-Review": "pending", Done: "completed" };
const ERR = "text-xs font-semibold text-[#B01F17]";
const DAY = 86_400_000;
const today = () => new Date().toISOString().slice(0, 10);

function TaskList({ tasks, onOpen }) {
  return (
    <ul className="divide-y divide-ink/[0.05]">
      {tasks.map((t) => (
        <li key={t.id}>
          <button type="button" onClick={() => onOpen(t.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm hover:bg-ink/[0.03]">
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-text-primary">{t.title}</span>
              <span className="block truncate text-xs text-text-secondary">{t.assignees.join(", ") || "Unassigned"}{t.deadline ? ` · due ${fmt(t.deadline)}` : ""}{t.isLate ? " · late" : ""}</span></span>
            <StatusChip status={TASK_CHIP[t.status]} label={t.status.replace("-", " ")} size="xs" />
          </button>
        </li>
      ))}
    </ul>
  );
}

// Simple date bars (UX §3.2): one row per task with a start and a deadline, inside the module's window.
function Timeline({ m, onOpen }) {
  const [now] = useState(() => Date.now());
  const rows = m.tasks.filter((t) => t.deadline).map((t) => ({ ...t, s: new Date(t.startDate ?? t.deadline), e: new Date(t.deadline) }));
  if (!rows.length) return <p className="px-5 py-4 text-sm text-text-secondary">No task has a deadline yet, so there is nothing to draw. Add deadlines in each task.</p>;
  const from = Math.min(...rows.map((r) => +r.s), m.startDate ? +new Date(m.startDate) : Infinity);
  const to = Math.max(...rows.map((r) => +r.e), m.deadline ? +new Date(m.deadline) : 0, from + DAY);
  const pct = (d) => ((d - from) / (to - from)) * 100;
  return (
    <div className="flex flex-col gap-2 px-5 py-4">
      <div className="flex justify-between text-xs tabular-nums text-text-secondary"><span>{fmt(new Date(from))}</span><span>{fmt(new Date(to))}</span></div>
      <ul className="relative flex flex-col gap-1.5" aria-label="Task dates">
        {now > from && now < to && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-[#B01F17]/60" style={{ left: `calc(220px + (100% - 220px) * ${pct(now) / 100})` }} />}
        {rows.slice(0, 40).map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => onOpen(r.id)} className="grid min-h-8 w-full grid-cols-[220px_1fr] items-center gap-0 rounded-lg text-left text-xs hover:bg-ink/[0.03]"
              aria-label={`${r.title}: ${fmt(r.s)} to ${fmt(r.e)}, ${r.status.replace("-", " ")}`}>
              <span className="truncate pr-3 font-semibold text-text-primary">{r.title}</span>
              <span className="relative h-5 rounded bg-ink/[0.04]">
                <span className="absolute inset-y-0.5 rounded" style={{ left: `${pct(+r.s)}%`, width: `${Math.max(1.5, pct(+r.e) - pct(+r.s))}%`, background: r.status === "Done" ? "#0E9F6E" : r.status !== "Done" && +r.e < now ? "#C81E1E" : "var(--accent)" }} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-text-secondary">Bar = start to deadline. Green done, red past the deadline, teal open. The red line is today.{rows.length > 40 ? ` Showing 40 of ${rows.length}.` : ""}</p>
    </div>
  );
}

function History({ projectId, moduleId }) {
  const { data, error, reload } = useLoad(`/api/teamlead/modules/${projectId}/history${moduleId ? `?module=${moduleId}` : ""}`);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <div className="p-5"><Skeleton className="h-40 rounded-xl" /></div>;
  return (
    <div className="flex flex-col gap-4 px-5 py-4 text-sm">
      {data.deadlineRequests.length > 0 && (
        <section><h3 className="mb-1.5 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Deadline change requests</h3>
          <ul className="flex flex-col gap-1">{data.deadlineRequests.map((r) => <li key={r.id} className="flex justify-between gap-3"><span className="min-w-0">{r.title}{r.note ? ` · "${r.note}"` : ""}</span><span className="shrink-0 text-xs text-text-secondary">{r.status === "Resolved" ? "Approved" : r.status} · {fmt(r.at)}</span></li>)}</ul></section>
      )}
      {data.events.length ? <ol className="flex flex-col gap-1.5">{data.events.map((e) => <li key={e.id} className="flex justify-between gap-3"><span className="min-w-0">{e.detail || e.action}{e.who ? ` · ${e.who}` : ""}</span><span className="shrink-0 text-xs tabular-nums text-text-secondary">{fmt(e.at)}</span></li>)}</ol>
        : <p className="text-text-secondary">No recorded changes for this project yet.</p>}
    </div>
  );
}

export default function TLModulePage() {
  const { projectId } = useParams();
  const [sp, setSp] = useSearchParams();
  const moduleId = sp.get("module");
  const tab = TABS.some(([k]) => k === sp.get("tab")) ? sp.get("tab") : "overview";
  const addToast = useUiStore((s) => s.addToast);
  const moduleUrl = `/api/teamlead/modules/${projectId}${moduleId ? `?module=${moduleId}` : ""}`;
  const { data: m, error, reload, setData } = useLoad(moduleUrl);
  // T-4: Handoff tab + QA checklist share one read.
  const handoffUrl = tab === "overview" || tab === "handoff" ? `/api/teamlead/modules/${projectId}/handoff${moduleId ? `?module=${moduleId}` : ""}` : null;
  const handoff = useLoad(handoffUrl);
  // After a drawer action: refresh in place. A full reload blanks this page and closes the drawer's open tab.
  const refreshInPlace = () => { api.get(moduleUrl).then(setData).catch(() => {}); if (handoffUrl) api.get(handoffUrl).then(handoff.setData).catch(() => {}); };
  const [dialog, setDialog] = useState(null); // "accept" | "ask" | "deadline" | "qa" | "create"
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [taskId, setTaskId] = useState(null);
  // From the breakdown realism panel: ?request=deadline opens the deadline request, ?request=person the question form.
  const requested = sp.get("request");
  useEffect(() => {
    if (!m || !requested) return;
    const n = new URLSearchParams(sp); n.delete("request"); setSp(n, { replace: true });
    setErr({}); setDate(""); setText(requested === "person" ? "The breakdown does not fit before the deadline with the current team. Can we add one more person to this module?" : "");
    setDialog(requested === "person" ? "ask" : "deadline");
  }, [m, requested]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (k) => { const n = new URLSearchParams(sp); if (k === "overview") n.delete("tab"); else n.set("tab", k); setSp(n, { replace: true }); };
  const open = (d) => { setErr({}); setText(""); setDate(""); setDialog(d); };

  async function post(path, body, ok, after) {
    setBusy(true);
    try { const r = await api.post(path, body); addToast({ type: "success", message: typeof ok === "function" ? ok(r) : ok }); setDialog(null); after?.(r); }
    catch (e) { setErr(e?.data?.fields ?? { form: e?.message ?? "That did not work." }); if (dialog === "accept" || dialog === "qa") { addToast({ type: "error", message: e?.message ?? "That did not work." }); setDialog(null); } }
    finally { setBusy(false); }
  }
  const accept = () => post(`/api/teamlead/modules/${moduleId}/accept`, {}, "Module accepted. Your Manager was told.", (r) => setData((x) => ({ ...x, acceptedAt: r.acceptedAt, state: "In progress" })));
  const qa = () => post(`/api/teamlead/modules/${moduleId}/qa-ready`, {}, (r) => `Marked ready for QA sign-off. ${r.notified} ${r.notified === 1 ? "person was" : "people were"} told.`, (r) => setData((x) => ({ ...x, qaReadyAt: r.qaReadyAt })));
  function ask(e) {
    e.preventDefault();
    if (text.trim().length < 5) { setErr({ text: "Write at least a few words." }); document.getElementById("tl-question")?.focus(); return; }
    post(`/api/teamlead/modules/${projectId}/question`, { text: text.trim(), moduleId: moduleId || undefined }, (r) => `Question sent to ${r.to}.`);
  }
  function requestDeadline(e) {
    e.preventDefault();
    const er = {};
    if (!date) er.newDate = "Pick the new deadline.";
    if (text.trim().length < 10) er.reason = "Write a reason of at least 10 characters.";
    setErr(er); if (Object.keys(er).length) { document.getElementById(er.newDate ? "dl-date" : "dl-reason")?.focus(); return; }
    post(`/api/teamlead/modules/${projectId}/deadline-request`, { newDate: date, reason: text.trim(), moduleId: moduleId || undefined }, (r) => `Request sent to ${r.to}. They decide in their Inbox.`);
  }

  if (error) return <Page>{/^Module not found/.test(error) ? <EmptyState heading="This module does not exist or is not one of yours." action={{ label: "Back to modules", to: "/teamlead/modules" }} /> : <ErrorState message={error} onRetry={reload} />}</Page>;
  if (!m) return <Page><div aria-busy="true" aria-label="Loading module" className="flex flex-col gap-6"><Skeleton className="h-14 w-1/2 rounded-xl" /><Skeleton className="h-10 rounded-xl" /><Skeleton className="h-72 rounded-2xl" /></div></Page>;

  const isModule = m.kind === "module";
  const isNew = isModule && !m.acceptedAt;
  const canCreate = !isNew; // D-119: tasks only after Accept
  return (
    <Page>
      <div>
        <Breadcrumb items={[{ label: "Modules", to: "/teamlead/modules" }, { label: m.title }]} />
        <PageHeader title={m.title}
          subtitle={<span className="inline-flex flex-wrap items-center gap-2"><StatusChip status={isNew ? "pending" : m.state === "Completed" ? "completed" : "maintenance"} label={m.state} size="xs" />
            {m.qaReadyAt && <StatusChip status="approved" label="Ready for QA" size="xs" />}
            <span>{isModule ? <>Module of <span title={m.project.title} className="inline-block max-w-[40ch] truncate align-bottom">{m.project.title}</span></> : "Whole project"} · {m.deadline ? `due ${fmt(m.deadline)}` : "no deadline"}{m.manager ? ` · Manager ${m.manager.name}` : ""}</span></span>}
          primary={isNew ? { label: "Accept module", onClick: () => setDialog("accept") } : { label: "Create tasks", onClick: () => setDialog("create") }}
          secondary={{ label: "Ask a question", onClick: () => open("ask"), disabled: !m.manager }}>
          {isNew && <button type="button" className={BTN.secondary} disabled title="Accept the module first. Tasks can be created after you accept it." aria-describedby="create-why">Create tasks</button>}
          <button type="button" className={BTN.secondary} disabled={!m.manager} onClick={() => open("deadline")}>Request deadline change</button>
          {isModule && <button type="button" className={BTN.secondary} disabled={!m.acceptedAt || !!m.qaReadyAt} onClick={() => setDialog("qa")}
            title={!m.acceptedAt ? "Accept the module first." : m.qaReadyAt ? `Marked ready on ${fmt(m.qaReadyAt)}.` : undefined}>{m.qaReadyAt ? "Ready for QA" : "Mark ready for QA sign-off"}</button>}
        </PageHeader>
      </div>
      {isNew && <p id="create-why" role="status" className="rounded-2xl border border-[#8A6200]/25 bg-[#FFC21A]/10 p-4 text-sm text-[#5C3D00]">Your Manager assigned this module to you. Read the brief, then accept it or ask a question. Tasks can be created after you accept.</p>}

      <div role="tablist" aria-label="Module sections" className="flex gap-1 overflow-x-auto border-b border-border-subtle"
        onKeyDown={(e) => { if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return; const i = TABS.findIndex(([k]) => k === tab), n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0]; go(n); requestAnimationFrame(() => document.getElementById(`mtab-${n}`)?.focus()); }}>
        {TABS.map(([k, l]) => (
          <button key={k} id={`mtab-${k}`} role="tab" type="button" aria-selected={tab === k} aria-controls="mtab-panel" tabIndex={tab === k ? 0 : -1} onClick={() => go(k)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${tab === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}>{l}{k === "tasks" ? ` (${m.tasks.length})` : k === "team" ? ` (${m.team.length})` : ""}</button>
        ))}
      </div>

      <div id="mtab-panel" role="tabpanel" aria-labelledby={`mtab-${tab}`} className="flex flex-col gap-6">
        {tab === "overview" && (
          <>
            <Panel title="Progress" icon={Gauge}>
              <div className="grid grid-cols-2 divide-ink/[0.05] lg:grid-cols-4 lg:divide-x">
                <StatCard label="Done" value={`${m.progress.done} / ${m.progress.total}`} sub={`${m.progress.pct}% of the tasks`} icon={ListChecks} color="var(--accent)" />
                <StatCard label="In progress" value={m.progress.byStatus["In-Progress"] ?? 0} sub="being worked on" icon={ListChecks} color="var(--accent)" />
                <StatCard label="In review" value={m.progress.byStatus["In-Review"] ?? 0} sub="waiting for you" icon={ListChecks} color="var(--accent)" />
                <StatCard label="Health" value={m.progress.health?.score ?? null} noDataLabel="Not enough data" sub={m.progress.health?.band ?? "project health"} icon={Gauge} color="var(--accent)" />
              </div>
            </Panel>
            <Panel title="Manager's brief" icon={FileText}>
              <p className="whitespace-pre-wrap px-5 py-4 text-sm text-text-primary">{m.brief || <span className="text-text-secondary">No brief written yet. Ask your Manager if something is unclear.</span>}</p>
            </Panel>
          </>
        )}
        {tab === "overview" && <QaChecklist data={handoff.data} error={handoff.error} reload={handoff.reload} onOpen={setTaskId} />}
        {tab === "handoff" && <Handoff data={handoff.data} error={handoff.error} reload={handoff.reload} onOpen={setTaskId} />}
        {tab === "breakdown" && (
          <Panel title="Breakdown" icon={ListChecks}>
            <div className="flex flex-col items-start gap-3 px-5 py-4 text-sm">
              <p className="max-w-[70ch] text-text-primary">Plan all the tasks of this {isModule ? "module" : "project"} in one table: suggest them with AI, check them against the team's free hours and the deadline, then create them in one go. Nothing is created until you apply.</p>
              <p className="text-xs text-text-secondary">{m.tasks.length} task{m.tasks.length === 1 ? "" : "s"} exist already; the AI does not repeat them.</p>
              {canCreate
                ? <Link to={`/teamlead/modules/${m.projectId}/breakdown${m.moduleId ? `?module=${m.moduleId}` : ""}`} className={BTN.primary}>Open the breakdown workspace</Link>
                : <span className="flex flex-wrap items-center gap-2"><button type="button" className={BTN.primary} disabled title="Accept the module first.">Open the breakdown workspace</button><span className="text-xs text-text-secondary">Accept the module first.</span></span>}
            </div>
          </Panel>
        )}
        {tab === "tasks" && (
          <Panel title={`Tasks (${m.tasks.length})`} icon={ListChecks} action={{ to: `/teamlead/tasks?module=${m.projectId}`, label: "Open in Tasks" }}>
            {m.tasks.length ? <TaskList tasks={m.tasks} onOpen={setTaskId} /> : (
              <div className="flex flex-col items-start gap-2 px-5 py-4"><p className="text-sm text-text-secondary">No tasks yet. Break the work into tasks of 1 to 14 hours.</p>
                <button type="button" className={BTN.secondary} disabled={!canCreate} title={canCreate ? undefined : "Accept the module first."} onClick={() => setDialog("create")}>Create tasks</button></div>
            )}
          </Panel>
        )}
        {tab === "team" && (
          <Panel title={`Team (${m.team.length})`} icon={Users} action={{ to: "/teamlead/team", label: "Team load" }}>
            {m.team.length ? (
              <ul className="divide-y divide-ink/[0.05]">
                {m.team.map((p) => (
                  <li key={p.id}><Link to={`/teamlead/team?member=${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-ink/[0.03]">
                    <span className="min-w-0"><span className="block truncate font-semibold text-text-primary">{p.name}</span><span className="block text-xs text-text-secondary">{p.role} · {p.activeTasks} active</span></span>
                    <span className="shrink-0 text-right"><StatusChip status={STATUS_KEY[p.status]} label={p.status} size="xs" /><span className="mt-1 block text-xs font-semibold tabular-nums" style={{ color: TONE[p.tone]?.text }}>{p.label}</span></span>
                  </Link></li>
                ))}
              </ul>
            ) : <p className="px-5 py-4 text-sm text-text-secondary">Nobody is on this project yet. Your Manager adds people.</p>}
          </Panel>
        )}
        {tab === "timeline" && <Panel title="Timeline" icon={Gauge}><Timeline m={m} onOpen={setTaskId} /></Panel>}
        {tab === "history" && <Panel title="History" icon={FileText}><History projectId={m.projectId} moduleId={m.moduleId} /></Panel>}
      </div>

      <ConfirmModal open={dialog === "accept"} onClose={() => setDialog(null)} onConfirm={accept} loading={busy} confirmLabel="Accept module"
        title={`Accept "${m.title}"?`} body={`You become responsible for breaking it into tasks${m.deadline ? ` and finishing it by ${fmt(m.deadline)}` : ""}. Your Manager gets a notification.`} />
      <ConfirmModal open={dialog === "qa"} onClose={() => setDialog(null)} onConfirm={qa} loading={busy} confirmLabel="Mark ready"
        title="Mark the module ready for QA sign-off?" body="Your Manager and the project's Testers get a notification to check the module before it is closed." />
      <Drawer open={dialog === "ask"} onClose={() => setDialog(null)} title="Ask your Manager" width={440}
        footer={<div className="flex justify-end gap-2"><button type="button" className={BTN.secondary} onClick={() => setDialog(null)}>Cancel</button><button type="submit" form="tl-question-form" className={BTN.primary} disabled={busy}>{busy ? "Sending…" : "Send question"}</button></div>}>
        <form id="tl-question-form" onSubmit={ask} className="flex flex-col gap-2 p-5 text-sm">
          <label htmlFor="tl-question" className="font-bold text-text-primary">Your question about "{m.title}"</label>
          <textarea id="tl-question" name="question" rows={5} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} aria-invalid={!!err.text} placeholder="For example: Should the login page support single sign-on…" className="rounded-xl p-3 font-normal" />
          <p role={err.text || err.form ? "alert" : undefined} className={err.text || err.form ? ERR : "text-xs text-text-secondary"}>{err.text ?? err.form ?? `${m.manager?.name ?? "Your Manager"} gets it as a notification. ${500 - text.length} characters left.`}</p>
        </form>
      </Drawer>
      <Drawer open={dialog === "deadline"} onClose={() => setDialog(null)} title="Request a deadline change" width={440}
        footer={<div className="flex justify-end gap-2"><button type="button" className={BTN.secondary} onClick={() => setDialog(null)}>Cancel</button><button type="submit" form="dl-form" className={BTN.primary} disabled={busy}>{busy ? "Sending…" : "Send request"}</button></div>}>
        <form id="dl-form" onSubmit={requestDeadline} className="flex flex-col gap-3 p-5 text-sm">
          <p className="text-text-secondary">Current deadline: {m.deadline ? fmt(m.deadline) : "none"}. {m.manager?.name ?? "Your Manager"} decides; the request shows in their Inbox.</p>
          {err.form && <p role="alert" className={ERR}>{err.form}</p>}
          <label htmlFor="dl-date" className="flex flex-col gap-1.5 font-bold">New deadline<input id="dl-date" type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!err.newDate} className="h-10 w-48 rounded-xl px-3 font-normal" />
            {err.newDate && <span className={ERR}>{err.newDate}</span>}</label>
          <label htmlFor="dl-reason" className="flex flex-col gap-1.5 font-bold">Reason<textarea id="dl-reason" rows={4} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} aria-invalid={!!err.reason} placeholder="What changed and why the extra time is needed…" className="rounded-xl p-3 font-normal" />
            {err.reason && <span className={ERR}>{err.reason}</span>}</label>
        </form>
      </Drawer>
      <TaskFormDrawer open={dialog === "create"} preset={{ projectId: String(m.projectId) }} onClose={() => setDialog(null)}
        onSaved={(r) => { addToast({ type: "success", message: r.created > 1 ? `${r.created} tasks created.` : "Task created." }); reload(); }} />
      <TaskDetailDrawer taskId={taskId} onClose={() => setTaskId(null)} onOpenTask={setTaskId} onChanged={refreshInPlace} />
    </Page>
  );
}
