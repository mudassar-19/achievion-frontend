// Test case manager for Testers (E-4, Employee UX §5.5, D-191): cases per project (and task), create / edit, run Pass / Fail /
// Blocked with history. URL: ?project, ?task, ?case (drawer), ?new=1.
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ListTodo } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import Drawer from "@/components/ui/Drawer";
import { BTN } from "@/components/ui/buttons";
import { RESULT_CHIP } from "@/utils/quality";
import useLoad from "../../manager/project/useLoad";
import { fmtDateTime } from "../../manager/project/format";

const LABEL = "flex flex-col gap-1 text-xs font-bold text-text-primary";
const FIELD = "rounded-xl px-3 text-sm font-normal";

function CaseForm({ initial, projects, onSaved, onCancel }) {
  const [f, setF] = useState({ projectId: initial.projectId ?? projects[0]?.id ?? "", taskId: initial.taskId ?? "", title: initial.title ?? "", steps: initial.steps ?? "", expected: initial.expected ?? "", priority: initial.priority ?? "Medium" });
  const [tasks, setTasks] = useState([]);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!f.projectId) return undefined; let live = true; api.get(`/api/quality/projects/${f.projectId}/tasks`).then((r) => live && setTasks(r.rows)).catch(() => live && setTasks([])); return () => { live = false; }; }, [f.projectId]);
  const set = (k) => (e) => { const v = e.target.value; setF((x) => ({ ...x, [k]: v, ...(k === "projectId" ? { taskId: "" } : {}) })); setErr((x) => ({ ...x, [k]: null })); };
  async function save(e) {
    e.preventDefault(); if (busy) return;
    const x = {};
    if (f.title.trim().length < 3) x.title = "Title: at least 3 characters.";
    if (f.steps.trim().length < 5) x.steps = "Write the steps (at least 5 characters).";
    if (!f.expected.trim()) x.expected = "Expected result is needed.";
    setErr(x); const first = Object.keys(x)[0];
    if (first) { document.getElementById(`tc-${first}`)?.focus(); return; }
    setBusy(true);
    const body = { ...f, title: f.title.trim(), steps: f.steps.trim(), expected: f.expected.trim(), taskId: f.taskId || undefined };
    try { const r = initial.id ? await api.patch(`/api/quality/test-cases/${initial.id}`, body) : await api.post("/api/quality/test-cases", body); onSaved(initial.id ?? r.id); }
    catch (e2) { setErr(e2?.data?.field ? { [e2.data.field]: e2.message } : { form: e2?.message ?? "It could not be saved." }); }
    finally { setBusy(false); }
  }
  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-3 text-sm">
      {err.form && <p role="alert" className="rounded-xl bg-[#B01F17]/[0.06] px-3 py-2 font-semibold text-[#B01F17]">{err.form}</p>}
      {!initial.id && <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor="tc-projectId" className={LABEL}>Project<select id="tc-projectId" name="projectId" value={f.projectId} onChange={set("projectId")} className={`${FIELD} h-10 border border-ink/[0.12] bg-bg-surface text-text-primary`}>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label htmlFor="tc-taskId" className={LABEL}>Task (optional)<select id="tc-taskId" name="taskId" value={f.taskId} onChange={set("taskId")} className={`${FIELD} h-10 border border-ink/[0.12] bg-bg-surface text-text-primary`}><option value="">No task</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
      </div>}
      <label htmlFor="tc-title" className={LABEL}>Title<input id="tc-title" name="title" autoComplete="off" maxLength={120} value={f.title} onChange={set("title")} aria-invalid={!!err.title} placeholder="e.g. Sign in with a wrong password…" className={`${FIELD} h-10`} />{err.title && <span className="font-semibold text-[#B01F17]">{err.title}</span>}</label>
      <label htmlFor="tc-steps" className={LABEL}>Steps<textarea id="tc-steps" name="steps" rows={4} maxLength={2000} value={f.steps} onChange={set("steps")} aria-invalid={!!err.steps} className={`${FIELD} py-2`} />{err.steps && <span className="font-semibold text-[#B01F17]">{err.steps}</span>}</label>
      <label htmlFor="tc-expected" className={LABEL}>Expected result<textarea id="tc-expected" name="expected" rows={2} maxLength={1000} value={f.expected} onChange={set("expected")} aria-invalid={!!err.expected} className={`${FIELD} py-2`} />{err.expected && <span className="font-semibold text-[#B01F17]">{err.expected}</span>}</label>
      <label htmlFor="tc-priority" className={LABEL}>Priority<select id="tc-priority" name="priority" value={f.priority} onChange={set("priority")} className={`${FIELD} h-10 w-40 border border-ink/[0.12] bg-bg-surface text-text-primary`}>{["Critical", "High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}</select></label>
      <span className="flex gap-2"><button type="submit" className={BTN.primary} disabled={busy}>{busy ? "Saving…" : initial.id ? "Save changes" : "Create test case"}</button><button type="button" className={BTN.ghost} onClick={onCancel}>Cancel</button></span>
    </form>
  );
}

function RunForm({ c, onRan }) {
  const [result, setResult] = useState(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    if (busy) return;
    if (result === "Fail" && note.trim().length < 3) { setErr("Say what failed."); document.getElementById("run-note")?.focus(); return; }
    setBusy(true); setErr(null);
    try { await api.post(`/api/quality/test-cases/${c.id}/runs`, { result, note: note.trim() }); setResult(null); setNote(""); onRan(result); }
    catch (e) { setErr(e?.message ?? "It could not be saved."); } finally { setBusy(false); }
  }
  return (
    <section aria-label="Run this test" className="flex flex-col gap-2 rounded-xl border border-ink/[0.08] p-3 text-sm">
      <p className="font-bold">Run this test</p>
      <div className="flex flex-wrap gap-2">{["Pass", "Fail", "Blocked"].map((r) => <button key={r} type="button" aria-pressed={result === r} onClick={() => { setResult(r); setErr(null); }} className={result === r ? BTN.primary : BTN.secondary}>{r}</button>)}</div>
      {result && <>
        <label htmlFor="run-note" className="flex flex-col gap-1 text-xs font-bold">{result === "Fail" ? "What failed" : "Note (optional)"}<textarea id="run-note" name="note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={!!err} className="rounded-xl p-3 text-sm font-normal" /></label>
        {err && <p role="alert" className="text-xs font-semibold text-[#B01F17]">{err}</p>}
        <span className="flex gap-2"><button type="button" className={BTN.primary} disabled={busy} onClick={run}>{busy ? "Saving…" : `Record ${result}`}</button>{result === "Fail" && <Link to={`/workspace/bugs?new=1&project=${c.projectId}${c.taskId ? `&task=${c.taskId}` : ""}`} className={BTN.ghost}>Report a bug</Link>}</span>
      </>}
    </section>
  );
}

export default function TestCasesPage() {
  const [sp, setSp] = useSearchParams();
  const addToast = useUiStore((s) => s.addToast);
  const qs = new URLSearchParams(["project", "task"].filter((k) => sp.get(k)).map((k) => [k, sp.get(k)])).toString();
  const url = `/api/quality/test-cases${qs ? `?${qs}` : ""}`;
  const { data, error, reload, setData } = useLoad(url);
  const refresh = useCallback(() => { api.get(url).then(setData).catch(() => {}); }, [url, setData]);
  const [editing, setEditing] = useState(false);
  const set = (patch, push = false) => { const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k); } setSp(n, { replace: !push }); };
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const open = data?.rows.find((r) => r.id === sp.get("case"));
  const creating = sp.get("new") === "1";

  const columns = [
    { key: "title", label: "Test case", render: (r) => <span className="flex min-w-0 flex-col"><span className="truncate font-semibold text-text-primary" title={r.title}>{r.title}</span>{r.task && <span className="truncate text-xs text-text-secondary" title={r.task}>{r.task}</span>}</span> },
    { key: "priority", label: "Priority" },
    { key: "lastResult", label: "Last result", render: (r) => (r.lastResult ? <StatusChip status={RESULT_CHIP[r.lastResult]} label={r.lastResult} size="xs" /> : <span className="text-xs text-text-secondary">Not run</span>) },
    { key: "runs", label: "Runs", render: (r) => <span className="tabular-nums">{r.runs.length}</span> },
  ];
  let content;
  if (error) content = <ErrorState message={error} onRetry={reload} />;
  else if (!data) content = <div aria-busy="true" aria-label="Loading test cases" className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>;
  else if (!data.rows.length) content = <Panel title="Test cases" icon={ListTodo}><EmptyState heading={qs ? "No test cases here yet" : "No test cases yet"} body="Write the steps once; run them every time the task comes back." action={data.canWrite ? { label: "New test case", onClick: () => set({ new: "1" }, true) } : undefined} /></Panel>;
  else content = <DataTable label="Test cases" columns={columns} rows={data.rows.slice((page - 1) * 25, page * 25)} rowKey={(r) => r.id} page={page} total={data.rows.length} pageSize={25}
    onPage={(n) => set({ page: n > 1 ? String(n) : null })} onRowClick={(r) => { setEditing(false); set({ case: r.id }, true); }} />;

  return (
    <Page>
      <PageHeader title="Test cases" subtitle="Verify the same way every time: steps, expected result and a run history per case." primary={data?.canWrite ? { label: "New test case", onClick: () => set({ new: "1" }, true) } : undefined} />
      {data?.projects.length > 1 && <FilterChips label="Project" param="project" options={data.projects.map((p) => ({ value: p.id, label: p.title }))} />}
      {sp.get("task") && <p className="text-xs text-text-secondary">Showing the test cases of one task. <button type="button" className="font-semibold underline" onClick={() => set({ task: null })}>Show all</button></p>}
      {content}
      <Drawer open={!!open} onClose={() => set({ case: null })} title={open?.title ?? "Test case"} width={560}>
        {open && <div className="flex flex-col gap-4 p-5 text-sm">
          {editing ? <CaseForm initial={open} projects={data.projects} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); addToast({ type: "success", message: "Test case saved." }); refresh(); }} /> : <>
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[11px] font-semibold">{open.priority} priority</span>{open.lastResult && <StatusChip status={RESULT_CHIP[open.lastResult]} label={`Last: ${open.lastResult}`} size="xs" />}{data.canWrite && <button type="button" className={BTN.ghost} onClick={() => setEditing(true)}>Edit</button>}</div>
            <section><h3 className="mb-1 text-xs font-bold text-text-secondary">Steps</h3><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{open.steps}</p></section>
            <section><h3 className="mb-1 text-xs font-bold text-text-secondary">Expected result</h3><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{open.expected}</p></section>
            {data.canWrite && <RunForm c={open} onRan={(r) => { addToast({ type: "success", message: `Run recorded: ${r}.` }); refresh(); }} />}
            <section><h3 className="mb-1 text-xs font-bold text-text-secondary">Runs</h3>{open.runs.length ? <ol className="flex flex-col divide-y divide-ink/[0.05]">{open.runs.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2"><span className="flex min-w-0 items-center gap-2"><StatusChip status={RESULT_CHIP[r.result]} label={r.result} size="xs" /><span className="min-w-0 [overflow-wrap:anywhere]">{r.by}{r.note ? ` · ${r.note}` : ""}</span></span><span className="shrink-0 text-xs tabular-nums text-text-secondary">{fmtDateTime(r.at)}</span></li>))}</ol>
              : <p className="text-text-secondary">Not run yet.</p>}</section>
          </>}
        </div>}
      </Drawer>
      {data?.canWrite && <Drawer open={creating} onClose={() => set({ new: null })} title="New test case" width={560}>
        {creating && <div className="p-5"><CaseForm initial={{ projectId: sp.get("project") ?? undefined, taskId: sp.get("task") ?? undefined }} projects={data.projects} onCancel={() => set({ new: null })} onSaved={(id) => { addToast({ type: "success", message: "Test case created." }); set({ new: null, case: id }); refresh(); }} /></div>}
      </Drawer>}
    </Page>
  );
}
