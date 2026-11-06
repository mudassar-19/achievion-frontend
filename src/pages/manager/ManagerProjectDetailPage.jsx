// Manager project detail (V2 Phase 3 · M-2, UX §5.4): Overview | Modules | Team | Sprints | Tasks | History.
// Assets tab since M-4, Report tab since M-6; the AI side panel comes with M-7.
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import Drawer from "@/components/ui/Drawer";
import StatusChip from "@/components/ui/StatusChip";
import HealthBadge from "@/components/ui/HealthBadge";
import { BTN } from "@/components/ui/buttons";
import { OverviewTab, ModulesTab, TeamTab, SprintsTab, TasksTab, HistoryTab, TaskDrawer, ProjectAssetsTab } from "./project/ProjectTabs";
import ProjectReportTab from "./report/ProjectReportTab";
import { fmt } from "./project/format";

const TABS = [["overview", "Overview"], ["modules", "Modules"], ["team", "Team"], ["sprints", "Sprints"], ["tasks", "Tasks"], ["assets", "Assets"], ["report", "Report"], ["history", "History"]];
const addDays = (d, n) => new Date(new Date(d).getTime() + n * 86_400_000).toISOString().slice(0, 10);

function ExtendDrawer({ project, open, onClose, onDone }) {
  const addToast = useUiStore((s) => s.addToast);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const min = project.deadline ? addDays(project.deadline, 1) : undefined;

  async function submit() {
    const e = {};
    if (!date) e.newDeadline = "Pick the new deadline.";
    else if (min && date < min) e.newDeadline = "The new deadline must be after the current one.";
    if (reason.trim().length < 10) e.reason = "Say why in at least 10 characters.";
    setErrors(e);
    if (Object.keys(e).length) { document.getElementById(e.newDeadline ? "ext-date" : "ext-reason")?.focus(); return; }
    setBusy(true);
    try {
      const r = await api.post(`/api/manager/projects/${project._id}/extension`, { newDeadline: date, reason: reason.trim() });
      addToast({ type: r.applied ? "success" : "info", message: r.applied ? `Deadline moved to ${fmt(r.deadline)}.` : "Sent to the Director for approval. You can follow it in Inbox → Requests." });
      setDate(""); setReason(""); onDone(); onClose();
    } catch (err) {
      if (err?.data?.fields) setErrors(err.data.fields);
      else addToast({ type: "error", message: err?.message ?? "Could not request the extension." });
    } finally { setBusy(false); }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Extend deadline"
      footer={<div className="flex justify-end gap-2"><button type="button" className={BTN.secondary} onClick={onClose}>Cancel</button><button type="button" className={BTN.primary} disabled={busy} onClick={submit}>{busy ? "Sending…" : "Extend deadline"}</button></div>}>
      <div className="flex flex-col gap-4 p-5 text-sm">
        <p className="text-text-secondary">Current deadline: <strong className="text-text-primary">{fmt(project.deadline)}</strong>. Small extensions within the Director's limit apply at once; longer ones go to the Director for approval.</p>
        <label htmlFor="ext-date" className="flex flex-col gap-1.5 font-bold text-text-primary">New deadline
          <input id="ext-date" type="date" min={min} value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.newDeadline} className="h-10 rounded-xl px-3 font-normal" />
          {errors.newDeadline && <span className="text-xs font-semibold text-[#B01F17]">{errors.newDeadline}</span>}
        </label>
        <label htmlFor="ext-reason" className="flex flex-col gap-1.5 font-bold text-text-primary">Reason
          <textarea id="ext-reason" rows={4} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!errors.reason} placeholder="e.g. The client added a payments module…" className="rounded-xl p-3 font-normal" />
          <span className={`text-xs ${errors.reason ? "font-semibold text-[#B01F17]" : "font-normal text-text-secondary"}`}>{errors.reason ?? `${reason.length}/500`}</span>
        </label>
      </div>
    </Drawer>
  );
}

export default function ManagerProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const [sp, setSp] = useSearchParams();
  const tab = TABS.some(([k]) => k === sp.get("tab")) ? sp.get("tab") : "overview";
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [taskId, setTaskId] = useState(null);

  const load = useCallback(async (quiet) => {
    if (!quiet) { setError(null); setProject(null); }
    try { setProject(await api.get(`/api/manager/projects/${id}`)); }
    catch (e) { setError(e); }
  }, [id]);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  async function toggleArchive() {
    const action = project.status === "Archived" ? "restore" : "archive";
    try {
      await api.post(`/api/manager/projects/${id}/${action}`);
      await load(true);
      addToast({ type: "info", message: action === "archive" ? "Project archived. It stays in History and under Archived." : "Project restored.",
        undoAction: async () => { try { await api.post(`/api/manager/projects/${id}/${action === "archive" ? "restore" : "archive"}`); load(true); } catch (e) { addToast({ type: "error", message: e?.message ?? "Could not undo." }); } } });
    } catch (e) { addToast({ type: "error", message: e?.message ?? "Could not update the project." }); }
  }

  if (error) return (
    <Page>
      {error.status === 404
        ? <EmptyState heading="This project does not exist or is not in your organisation." action={{ label: "Back to projects", to: "/manager/projects" }} />
        : <ErrorState message={error.message} onRetry={() => load()} />}
    </Page>
  );
  if (!project) return (
    <Page>
      <div aria-busy="true" aria-label="Loading project" className="flex flex-col gap-6">
        <Skeleton className="h-14 w-1/2 rounded-xl" /><Skeleton className="h-10 rounded-xl" /><Skeleton className="h-[150px] rounded-2xl" /><Skeleton className="h-64 rounded-2xl" />
      </div>
    </Page>
  );

  const archived = project.status === "Archived";
  const closed = archived || project.status === "Completed";
  return (
    <Page>
      <div>
        <Breadcrumb items={[{ label: "Projects", to: "/manager/projects" }, { label: project.title }]} />
        <PageHeader title={project.title}
          subtitle={<span className="inline-flex flex-wrap items-center gap-2"><StatusChip status={project.status} size="xs" /><HealthBadge score={project.healthScore} band={project.healthBand} /><span>{project.priority} priority · due {fmt(project.deadline)}</span></span>}
          primary={archived ? undefined : { label: "Edit project", onClick: () => navigate(`/manager/projects/${id}/edit`) }}
          secondary={{ label: archived ? "Restore" : "Archive", onClick: toggleArchive }}>
          {!closed && <button type="button" className={BTN.secondary} onClick={() => setExtendOpen(true)}>Extend deadline</button>}
        </PageHeader>
      </div>

      <div role="tablist" aria-label="Project sections" className="flex gap-1 overflow-x-auto border-b border-border-subtle"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const i = TABS.findIndex(([k]) => k === tab), n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
          setSp(n === "overview" ? {} : { tab: n }, { replace: true });
          requestAnimationFrame(() => document.getElementById(`tab-${n}`)?.focus());
        }}>
        {TABS.map(([k, label]) => (
          <button key={k} id={`tab-${k}`} role="tab" type="button" aria-selected={tab === k} aria-controls={`panel-${k}`} tabIndex={tab === k ? 0 : -1}
            onClick={() => setSp(k === "overview" ? {} : { tab: k }, { replace: true })}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${tab === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "overview" && <OverviewTab project={project} onChanged={() => load(true)} />}
        {tab === "modules"  && <ModulesTab project={project} onChanged={() => load(true)} />}
        {tab === "team"     && <TeamTab project={project} onChanged={() => load(true)} />}
        {tab === "sprints"  && <SprintsTab project={project} />}
        {tab === "tasks"    && <TasksTab project={project} onOpenTask={setTaskId} />}
        {tab === "assets"   && <ProjectAssetsTab project={project} />}
        {tab === "report"   && <ProjectReportTab project={project} />}
        {tab === "history"  && <HistoryTab project={project} />}
      </div>

      <ExtendDrawer project={project} open={extendOpen} onClose={() => setExtendOpen(false)} onDone={() => load(true)} />
      <TaskDrawer taskId={taskId} onClose={() => setTaskId(null)} />
    </Page>
  );
}
