// Manager Reports (V2 Phase 3 · M-6, UX §11). Filters + tab in the URL; numbers from one server service.
// M-7: AI narrative paragraph above the tabs (cached per filters per day) + "Generate lessons with AI" in Lessons.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import FilterChips from "@/components/ui/FilterChips";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import { reportQuery } from "./report/useReport";
import { DeliveryTab, PeopleTab, XpTab, WellbeingTab, LessonsTab } from "./report/ReportTabs";
import ExportDrawer from "./report/ExportDrawer";
import { NarrativeCard } from "./ai/AiCards";

const TABS = [["delivery", "Delivery"], ["people", "People"], ["xp", "XP trend"], ["wellbeing", "Well-being"], ["lessons", "Lessons learned"]];
const RANGES = [{ value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }, { value: "month", label: "This month" }, { value: "custom", label: "Custom" }];
const EXTRA = { people: ["sort", "dir"], xp: ["bucket", "member"] };
const today = () => new Date().toISOString().slice(0, 10);

export default function ManagerReportsPage() {
  const [sp, setSp] = useSearchParams();
  const [opts, setOpts] = useState(null);
  const [optsError, setOptsError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const tab = TABS.some(([k]) => k === sp.get("tab")) ? sp.get("tab") : "delivery";
  const project = sp.get("project") ?? "", sprint = sp.get("sprint") ?? "";
  const custom = sp.get("range") === "custom";

  const loadOpts = async () => {
    setOptsError(null);
    try { setOpts(await api.get("/api/manager/reports/options")); } catch (e) { setOptsError(e?.message ?? "Filters could not be loaded."); }
  };
  useEffect(() => { loadOpts(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const set = (patch) => {
    const q = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) (v ? q.set(k, v) : q.delete(k));
    q.delete("page");
    setSp(q, { replace: true });
  };
  const go = (k) => set({ tab: k === "delivery" ? null : k, member: k === "xp" ? sp.get("member") : null });
  // exportQuery also carries the People sort so the file matches the table; the table sorts in the browser.
  const exportQuery = tab === "lessons" ? reportQuery(new URLSearchParams({ ...(project && { project }), ...(sprint && { sprint }) })) : reportQuery(sp, EXTRA[tab] ?? []);
  const query = tab === "people" ? reportQuery(sp) : exportQuery;
  const customMissing = custom && !sp.get("from");
  const needsProject = tab === "lessons" && !project;

  if (optsError) return <Page><ErrorState message={optsError} onRetry={loadOpts} /></Page>;
  if (!opts) return <Page><div aria-busy="true" aria-label="Loading reports" className="flex flex-col gap-6"><Skeleton className="h-14 w-1/3 rounded-xl" /><Skeleton className="h-10 rounded-xl" /><Skeleton className="h-[130px] rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div></Page>;
  if (!opts.projects.length) return <Page><PageHeader title="Reports" /><EmptyState heading="No projects yet. Reports fill in as the team finishes work." action={{ label: "Create a project", to: "/manager/projects/create" }} /></Page>;

  const sprints = opts.sprints.filter((s) => String(s.projectId) === project);
  const field = "h-9 rounded-xl px-3 text-sm font-normal";

  return (
    <Page>
      <PageHeader title="Reports" subtitle="Delivery, people, XP and well-being for your projects. Every number follows the filters below."
        primary={{ label: "Export PDF", onClick: () => setExporting(true), disabled: needsProject || customMissing }} />

      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <label className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-xs font-bold text-text-secondary">Project
            <select id="report-project" value={project} onChange={(e) => set({ project: e.target.value, sprint: null, member: null })} className={`${field} w-full min-w-0 sm:w-auto sm:max-w-[260px]`}>
              <option value="">All projects</option>
              {opts.projects.map((p) => <option key={p.id} value={p.id}>{p.title}{p.status === "Archived" ? " (archived)" : ""}</option>)}
            </select>
          </label>
          {project && (
            <label className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-xs font-bold text-text-secondary">Sprint
              <select value={sprint} onChange={(e) => set({ sprint: e.target.value })} className={`${field} w-full min-w-0 sm:w-auto sm:max-w-[220px]`} disabled={!sprints.length}>
                <option value="">{sprints.length ? "All sprints" : "No sprints yet"}</option>
                {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          )}
          {tab !== "lessons" && <FilterChips label="Period" param="range" options={RANGES} fallback="30d" />}
        </div>
        {custom && tab !== "lessons" && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-text-secondary">
            <label className="flex items-center gap-2">From<input type="date" name="from" value={sp.get("from") ?? ""} max={sp.get("to") || today()} onChange={(e) => set({ from: e.target.value })} className={field} /></label>
            <label className="flex items-center gap-2">To<input type="date" name="to" value={sp.get("to") ?? ""} min={sp.get("from") || undefined} max={today()} onChange={(e) => set({ to: e.target.value })} className={field} /></label>
            <span className="font-normal">Up to 366 days. Leave "To" empty for today.</span>
          </div>
        )}
      </div>

      {tab !== "lessons" && !customMissing && (
        <NarrativeCard key={reportQuery(sp)} path={`/api/manager/ai/reports/narrative?${reportQuery(sp)}`} feature="mgr_report_narrative" title="What these numbers say" />
      )}

      <div role="tablist" aria-label="Report" className="flex gap-1 overflow-x-auto border-b border-border-subtle"
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          const i = TABS.findIndex(([k]) => k === tab), n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
          go(n); requestAnimationFrame(() => document.getElementById(`rtab-${n}`)?.focus());
        }}>
        {TABS.map(([k, label]) => (
          <button key={k} id={`rtab-${k}`} role="tab" type="button" aria-selected={tab === k} aria-controls="report-panel" tabIndex={tab === k ? 0 : -1} onClick={() => go(k)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${tab === k ? "border-accent text-accent-text" : "border-transparent text-text-secondary hover:text-text-primary"}`}>{label}</button>
        ))}
      </div>

      <div id="report-panel" role="tabpanel" aria-labelledby={`rtab-${tab}`} className="flex flex-col gap-6">
        {customMissing && tab !== "lessons" ? <EmptyState heading="Pick a start date for the custom period." action={{ label: "Use the last 30 days", onClick: () => set({ range: null, from: null, to: null }) }} />
          : needsProject ? <EmptyState heading="Lessons are kept per project. Pick a project first." action={{ label: "Choose a project", onClick: () => document.getElementById("report-project")?.focus() }} />
          : <>
            {tab === "delivery"  && <DeliveryTab key={query} query={query} />}
            {tab === "people"    && <PeopleTab key={query} query={query} />}
            {tab === "xp"        && <XpTab query={query} />}
            {tab === "wellbeing" && <WellbeingTab query={query} hasProject={!!project} />}
            {tab === "lessons"   && <LessonsTab key={query} query={query} />}
          </>}
      </div>

      <ExportDrawer open={exporting} onClose={() => setExporting(false)} tab={tab} query={exportQuery} />
    </Page>
  );
}
