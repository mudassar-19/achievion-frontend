// One sprint (V2 Phase 3 · M-3, UX §6). Planned → planning; Active → read-only board; Closed → summary.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, Trash2 } from "lucide-react";
import { BTN } from "@/components/ui/buttons";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import StatusChip from "@/components/ui/StatusChip";
import ConfirmModal from "@/components/ui/ConfirmModal";
import SprintDrawer from "./sprint/SprintDrawer";
import { PlanningView, ActiveView, SummaryView } from "./sprint/SprintViews";
import { TaskDrawer } from "./project/ProjectTabs";
import { fmt } from "./project/format";

const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function CloseChoice({ sprint, choice, setChoice, nextId, setNextId }) {
  const left = sprint.stats.total - sprint.stats.done;
  if (!left) return <p className="text-sm text-text-secondary">Every task is done.</p>;
  const radio = "mt-0.5 h-4 w-4 accent-[var(--accent)]";
  return (
    <fieldset className="flex flex-col gap-2.5 text-sm">
      <legend className="mb-1 font-bold text-text-primary">{plural(left, "task")} not done. Where should {left === 1 ? "it" : "they"} go?</legend>
      <label className="flex items-start gap-2.5">
        <input type="radio" name="unfinished" value="backlog" checked={choice === "backlog"} onChange={() => setChoice("backlog")} className={radio} />
        <span><span className="font-semibold text-text-primary">Back to the backlog</span><span className="block text-xs text-text-secondary">They wait in the project until a later sprint picks them.</span></span>
      </label>
      <label className="flex items-start gap-2.5">
        <input type="radio" name="unfinished" value="next" checked={choice === "next"} disabled={!sprint.nextSprints.length} onChange={() => setChoice("next")} className={radio} />
        <span className={sprint.nextSprints.length ? "" : "opacity-60"}><span className="font-semibold text-text-primary">Into the next sprint</span>
          <span className="block text-xs text-text-secondary">{sprint.nextSprints.length ? "Pick a planned sprint of this project." : "No planned sprint in this project yet. Create one first, or use the backlog."}</span></span>
      </label>
      {choice === "next" && sprint.nextSprints.length > 0 && (
        <select aria-label="Next sprint" value={nextId} onChange={(e) => setNextId(e.target.value)} className="ml-6 h-10 rounded-xl px-3">
          {sprint.nextSprints.map((s) => <option key={s.id} value={s.id}>{s.name}{s.startDate ? ` (starts ${fmt(s.startDate)})` : ""}</option>)}
        </select>
      )}
    </fieldset>
  );
}

// T-5 (D-143): the Team Lead uses this same page with their own API and links (TLSprintPage).
export default function ManagerSprintPage({ base = "/api/manager", root = "/manager", projectLink = (id) => `/manager/projects/${id}?tab=sprints`, notFound = "This sprint does not exist or is not in your organization.", isLead = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const [sprint, setSprint] = useState(null);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [dialog, setDialog] = useState(null); // "start" | "close"
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState("backlog");
  const [nextId, setNextId] = useState("");
  const [taskId, setTaskId] = useState(null);

  const load = useCallback(async (quiet) => {
    if (!quiet) { setError(null); setSprint(null); }
    try { setSprint(await api.get(`${base}/sprints/${id}`)); }
    catch (e) { if (!quiet) setError(e); }
  }, [id, base]);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  function openClose() { setChoice("backlog"); setNextId(String(sprint.nextSprints[0]?.id ?? "")); setDialog("close"); }

  async function act() {
    setBusy(true);
    try {
      if (dialog === "start") {
        await api.post(`${base}/sprints/${id}/start`);
        addToast({ type: "success", message: "Sprint started." });
      } else {
        const left = sprint.stats.total - sprint.stats.done;
        await api.post(`${base}/sprints/${id}/close`, { unfinished: left ? choice : "backlog", nextSprintId: choice === "next" ? nextId : undefined });
        addToast({ type: "success", message: "Sprint closed" });
      }
      setDialog(null);
      await load(true);
    } catch (e) {
      addToast({ type: "error", message: e?.data?.reasons?.join(" ") ?? e?.message ?? "That did not work." });
      setDialog(null);
      load(true);
    } finally { setBusy(false); }
  }

  if (error) return (
    <Page>
      {error.status === 404
        ? <EmptyState heading={notFound} action={{ label: "Back to sprints", to: `${root}/sprints` }} />
        : <ErrorState message={error.message} onRetry={() => load()} />}
    </Page>
  );
  if (!sprint) return (
    <Page>
      <div aria-busy="true" aria-label="Loading sprint" className="flex flex-col gap-6">
        <Skeleton className="h-14 w-1/2 rounded-xl" /><Skeleton className="h-[120px] rounded-2xl" /><Skeleton className="h-72 rounded-2xl" />
      </div>
    </Page>
  );

  const { status, startBlockers: blockers } = sprint;
  const readOnly = sprint.canWrite === false; // another Team Lead's sprint: the server answers 404 on writes
  async function remove() {
    setBusy(true);
    try { await api.delete(`${base}/sprints/${id}`); addToast({ type: "success", message: "Sprint deleted. Its tasks stay as they are." }); navigate(`${root}/sprints`); }
    catch (e) { addToast({ type: "error", message: e?.message ?? "The sprint could not be deleted." }); setDialog(null); }
    finally { setBusy(false); }
  }
  const primary = readOnly ? undefined : status === "Planned" ? { label: "Start sprint", onClick: () => setDialog("start"), disabled: blockers.length > 0 }
    : status === "Active" ? { label: "Close sprint", onClick: openClose } : undefined;

  return (
    <Page>
      <div>
        <Breadcrumb items={[{ label: "Sprints", to: `${root}/sprints` }, { label: sprint.name }]} />
        <PageHeader title={sprint.name}
          subtitle={<span className="inline-flex flex-wrap items-center gap-2"><StatusChip status={status} size="xs" />
            <span>{sprint.project ? <Link to={projectLink(sprint.project.id)} title={sprint.project.title} className="inline-block max-w-[40ch] truncate align-bottom font-semibold text-text-primary underline-offset-2 hover:underline">{sprint.project.title}</Link> : "No project"} · {fmt(sprint.startDate)} – {fmt(sprint.endDate)}</span></span>}
          primary={primary}
          secondary={status === "Closed" || readOnly ? undefined : { label: "Edit sprint", onClick: () => setEditOpen(true) }}>
          {isLead && !readOnly && status === "Planned" && <button type="button" className={BTN.ghost} onClick={() => setDialog("delete")}><Trash2 size={14} aria-hidden="true" />Delete</button>}
        </PageHeader>
        {readOnly && <p className="mt-2 text-xs text-text-secondary">Another Team Lead runs this sprint. You can follow it here.</p>}
        {sprint.goal && <p className="mt-3 max-w-[70ch] text-sm text-text-primary"><span className="font-bold">Goal: </span>{sprint.goal}</p>}
      </div>

      {status === "Planned" && !readOnly && blockers.length > 0 && (
        <div role="status" className="flex gap-3 rounded-2xl border border-[#8A6200]/25 bg-[#FFC21A]/10 p-4 text-sm text-[#5C3D00]">
          <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div><p className="font-bold">Before this sprint can start</p>
            <ul className="mt-1 list-disc pl-4">{blockers.map((b) => <li key={b}>{b}</li>)}</ul></div>
        </div>
      )}
      {status !== "Closed" && sprint.overlaps.length > 0 && (
        <p className="text-xs text-[#5C3D00]">Dates overlap {sprint.overlaps.map((n) => `"${n}"`).join(", ")}.</p>
      )}

      {status === "Planned" && <PlanningView sprint={sprint} onChanged={() => load(true)} base={base} readOnly={readOnly} />}
      {status === "Active" && <ActiveView sprint={sprint} onOpenTask={setTaskId} />}
      {status === "Closed" && <SummaryView sprint={sprint} base={base} ai={!isLead} />}

      <ConfirmModal open={dialog === "start"} onClose={() => setDialog(null)} onConfirm={act} loading={busy} confirmLabel="Start sprint"
        title={`Start "${sprint.name}"?`}
        body={`${plural(sprint.stats.total, "task")}, ending ${fmt(sprint.endDate)}. It becomes the active sprint of ${sprint.project?.title ?? "the project"}; only one sprint per project can be active.`} />
      <ConfirmModal open={dialog === "close"} onClose={() => setDialog(null)} onConfirm={act} loading={busy} confirmLabel="Close sprint"
        title={`Close "${sprint.name}"?`} body={`${sprint.stats.done} of ${plural(sprint.stats.total, "task")} done. The numbers are saved in the summary and cannot change afterwards.`}>
        <CloseChoice sprint={sprint} choice={choice} setChoice={setChoice} nextId={nextId} setNextId={setNextId} />
      </ConfirmModal>
      <ConfirmModal open={dialog === "delete"} onClose={() => setDialog(null)} onConfirm={remove} loading={busy} destructive confirmLabel="Delete sprint"
        title={`Delete "${sprint.name}"?`} body="The sprint goes away. Its tasks stay in the project and return to the backlog." />
      <SprintDrawer base={base} open={editOpen} onClose={() => setEditOpen(false)} sprint={sprint}
        onSaved={(_, overlaps) => { addToast({ type: overlaps.length ? "info" : "success", message: overlaps.length ? `Sprint saved. Its dates overlap ${overlaps.join(", ")}.` : "Sprint saved." }); load(true); }} />
      <TaskDrawer taskId={taskId} onClose={() => setTaskId(null)} {...(isLead ? { base, full: true } : {})} />
    </Page>
  );
}
