import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, Users, Search, X } from "lucide-react";
import api from "@/lib/api";

import TallyLoader from "@/components/ui/TallyLoader";
import useUiStore from "@/stores/uiStore";
import useAuthStore from "@/stores/authStore";
import socket from "@/utils/socket";
import KanbanBoard from "@/components/widgets/KanbanBoard";
import { moveVerdict } from "@/utils/boardRules";
const TEAL = "#08695F";

const COLUMNS = [
  { key: "Backlog",     label: "Backlog",      color: "#4F5B75" },
  { key: "To-Do",       label: "To Do",        color: "#3A4660" },
  { key: "In-Progress", label: "In Progress",  color: "#1948BD" },
  { key: "In-Review",   label: "In Review",    color: "#1948BD" },
  { key: "Done",        label: "Done",         color: "#0E6A30" },
];


const PRIORITY_COLOR = { Critical: "#B01F17", High: "#9A3A06", Medium: "#7A5200", Low: "#3A4660" };

function timeLeft(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - Date.now();
  if (diff < 0) return { label: `${Math.ceil(-diff / 86_400_000)}d over`, color: "#B01F17" };
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return { label: "Due today", color: "#7A5200" };
  if (d <= 3)  return { label: `${d}d left`,  color: "#7A5200" };
  return { label: `${d}d left`, color: "#4F5B75" };
}

function TaskChip({ task, saving }) {
  const dl       = task.status === "Done" ? null : timeLeft(task.deadline);
  const assignee = task.assignee?.name ?? task.assignees?.[0]?.name;

  return (
    <div
      className="rounded-xl border p-3 space-y-2 select-none bg-bg-surface"
      style={{ borderColor: "rgba(20,32,61,0.08)", opacity: saving ? 0.6 : 1 }}
    >
      {/* Priority bar */}
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-black uppercase" style={{ color: PRIORITY_COLOR[task.priority] ?? "#3A4660" }}>
          {task.priority}
        </span>
        <span className="text-[14px] text-slate-600">{task.type}</span>
      </div>

      <p className="text-xs font-semibold text-text-primary leading-tight">{task.title}</p>

      {/* Assignee + deadline */}
      <div className="flex items-center gap-2 text-[12px]">
        {assignee && (
          <span className="flex min-w-0 items-center gap-1 text-slate-500">
            <Users size={11} strokeWidth={2} className="shrink-0" aria-hidden="true" /><span className="truncate">{assignee}</span>
          </span>
        )}
        {dl && (
          <span className="ml-auto shrink-0 whitespace-nowrap font-bold" style={{ color: dl.color }}>{dl.label}</span>
        )}
        {task.isLate && task.status !== "Done" && (
          <AlertTriangle size={9} className="text-red-400" strokeWidth={2} />
        )}
      </div>

      {task.status === "In-Review" && (
        <div
          className="w-full py-1 rounded-lg text-[14px] font-semibold border text-center"
          style={{ borderColor: `${TEAL}25`, color: TEAL, background: `${TEAL}08` }}
        >
          Awaiting TL review
        </div>
      )}
    </div>
  );
}

export default function TeamLeadBoardPage() {
  const [tasks,    setTasks]    = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [projId,   setProjId]   = useState("all");
  const user = useAuthStore((st) => st.user);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [td, pd] = await Promise.all([
        api.get("/api/teamlead/tasks?tab=all"),
        api.get("/api/teamlead/projects"),
      ]);
      setTasks(td.tasks ?? []);
      setProjects([
        { id: "all", title: "All Projects" },
        ...(pd.projects ?? []).map((p) => ({ id: p.id, title: p.title })),
      ]);
    } catch { setTasks([]); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tasks.filter((t) => {
    const matchProj   = projId === "all" || t.projectId === projId;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    return matchProj && matchSearch;
  });

  // Real-time sync (TC-TM-03): reload when anyone moves a task in this org.
  useEffect(() => {
    const onChange = () => load();
    socket.on("task:status_changed", onChange);
    return () => socket.off("task:status_changed", onChange);
  }, [load]);

  async function move(task, to) {
    await api.patch(`/api/teamlead/tasks/${task.id}/status`, { status: to });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: to } : t)));
  }

  return (
    <div className="px-4 sm:px-8 py-8 flex flex-col gap-6 min-h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Project Board</h1>
          <p className="text-xs text-slate-500 mt-1">Drag a card to plan work across your projects. Reviews happen on the review screen.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div
          className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2.5 rounded-xl border"
          style={{ background: `${TEAL}05`, borderColor: `${TEAL}20` }}
        >
          <Search size={13} strokeWidth={2} style={{ color: "#08695F" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="bg-transparent flex-1 text-sm text-text-primary placeholder-slate-600 outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-600 hover:text-slate-400">
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Project filter */}
        <select
          value={projId}
          onChange={(e) => setProjId(e.target.value)}
          className="px-3 py-2.5 rounded-xl border text-sm text-text-primary bg-transparent outline-none"
          style={{ borderColor: `${TEAL}20`, background: "#F5F6FA" }}
        >
          {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <TallyLoader />
        </div>
      ) : (
        <KanbanBoard
          columns={COLUMNS}
          tasks={filtered}
          getId={(t) => String(t.id)}
          renderCard={(t, { saving }) => <TaskChip task={t} saving={saving} />}
          canDrag={(t) => !["In-Review", "Done"].includes(t.status)}
          decide={(t, to) => moveVerdict({ role: user?.role, roleCategory: "team_lead", task: t, to, isAssignee: false })}
          onMove={move}
          onRefuse={(reason) => useUiStore.getState().addToast({ type: "error", message: reason })}
        />
      )}
    </div>
  );
}

