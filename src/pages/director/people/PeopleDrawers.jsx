// Director roster drawers (Batch 5: D4 departments, N5 a member's department, N4 skills and phone, X17 last seen).
// Only the Director can change a department; Managers have no such screen or route (D-275).
import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Phone, Plus } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Drawer from "@/components/ui/Drawer";
import Skeleton from "@/components/ui/Skeleton";
import LastSeen from "@/components/ui/LastSeen";
import { BTN } from "@/components/ui/buttons";

const INPUT = "h-10 w-full min-w-0 rounded-xl border border-border-subtle bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]";
const toast = (type, message) => useUiStore.getState().addToast({ type, message });

export function DepartmentsDrawer({ open, onClose, onChanged }) {
  const [items, setItems] = useState(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null); // { from, name }
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  useEffect(() => {
    if (!open) return;
    setItems(null); setProblem(null); setEditing(null); setName(""); // eslint-disable-line react-hooks/set-state-in-effect
    api.get("/api/director/departments", { silent: true }).then((d) => setItems(d.items)).catch((e) => setProblem(e?.message ?? "Departments could not be loaded."));
  }, [open]);
  async function run(call, done) {
    setBusy(true); setProblem(null);
    try { const r = await call(); setItems(r.items); done?.(r); onChanged?.(); }
    catch (e) { setProblem(e?.message ?? "That did not work. Try again."); }
    finally { setBusy(false); }
  }
  const create = (e) => { e.preventDefault(); run(() => api.post("/api/director/departments", { name }, { silent: true }), () => { toast("success", `Department "${name.trim()}" created.`); setName(""); }); };
  const rename = (e) => { e.preventDefault(); run(() => api.patch("/api/director/departments", editing, { silent: true }), (r) => { toast("success", `Renamed. ${r.moved} ${r.moved === 1 ? "member" : "members"} moved with it.`); setEditing(null); }); };
  const archive = (d, archived) => run(() => api.post("/api/director/departments/archive", { name: d.name, archived }, { silent: true }), () => toast("success", archived ? `"${d.name}" archived. Its members keep it; nobody new can be added.` : `"${d.name}" restored.`));
  return (
    <Drawer open={open} onClose={onClose} title="Departments" width={520}>
      <div className="flex flex-col gap-5 px-6 py-5">
        <form onSubmit={create} className="flex flex-col gap-2">
          <label htmlFor="dept-new" className="text-xs font-bold text-text-secondary">New department</label>
          <div className="flex gap-2">
            <input id="dept-new" className={INPUT} value={name} maxLength={40} placeholder="For example Mobile" onChange={(e) => { setName(e.target.value); setProblem(null); }} />
            <button type="submit" className={BTN.primary} disabled={busy || name.trim().length < 2}><Plus size={14} aria-hidden="true" />Add</button>
          </div>
        </form>
        {problem && <p role="alert" className="text-sm text-[#B01F17]">{problem}</p>}
        {!items && !problem ? <div aria-busy="true" aria-label="Loading departments" className="flex flex-col gap-2"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-12 rounded-xl" /></div> : (
          <ul aria-label="Departments" className="flex flex-col divide-y divide-ink/[0.06] rounded-xl border border-ink/[0.08]">
            {(items ?? []).length === 0 && <li className="px-4 py-6 text-center text-sm text-text-secondary">No departments yet. Add the first one above.</li>}
            {(items ?? []).map((d) => (
              <li key={d.name} data-department={d.name} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                {editing?.from === d.name ? (
                  <form onSubmit={rename} className="flex min-w-0 flex-1 basis-full gap-2">
                    <input aria-label={`New name for ${d.name}`} className={INPUT} value={editing.name} maxLength={40} autoFocus onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                    <button type="submit" className={BTN.primary} disabled={busy || editing.name.trim().length < 2}>Save</button>
                    <button type="button" className={BTN.ghost} onClick={() => setEditing(null)}>Cancel</button>
                  </form>
                ) : (<>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-bold ${d.archived ? "text-text-secondary" : "text-text-primary"}`} title={d.name}>{d.name}</p>
                    <p className="text-xs text-text-secondary">{d.members} {d.members === 1 ? "member" : "members"}{d.archived && " · archived"}</p>
                  </div>
                  <button type="button" className={BTN.icon} disabled={busy} aria-label={`Rename ${d.name}`} title="Rename" onClick={() => setEditing({ from: d.name, name: d.name })}><Pencil size={15} aria-hidden="true" /></button>
                  <button type="button" className={BTN.icon} disabled={busy} aria-label={`${d.archived ? "Restore" : "Archive"} ${d.name}`} title={d.archived ? "Restore" : "Archive"} onClick={() => archive(d, !d.archived)}>
                    {d.archived ? <ArchiveRestore size={15} aria-hidden="true" /> : <Archive size={15} aria-hidden="true" />}
                  </button>
                </>)}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-text-secondary">Renaming moves the department's members with it. An archived department keeps its members, but nobody new can be put in it. Every change is written to the audit log.</p>
      </div>
    </Drawer>
  );
}

export function MemberDrawer({ member, open, onClose, onChanged }) {
  const [departments, setDepartments] = useState(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  useEffect(() => {
    if (!open || !member) return;
    setValue(member.department ?? ""); setProblem(null); // eslint-disable-line react-hooks/set-state-in-effect
    api.get("/api/director/departments", { silent: true }).then((d) => setDepartments(d.departments)).catch(() => setDepartments([]));
  }, [open, member]);
  if (!member) return null;
  const current = member.department ?? "";
  const options = [...new Set([...(departments ?? []), ...(current ? [current] : [])])];
  async function save() {
    setBusy(true); setProblem(null);
    try {
      await api.patch(`/api/director/team/${member.id}/department`, { department: value || null }, { silent: true });
      toast("success", `${member.name} is now in ${value || "no department"}.`);
      onChanged?.(); onClose();
    } catch (e) { setProblem(e?.message ?? "The department could not be changed."); }
    finally { setBusy(false); }
  }
  return (
    <Drawer open={open} onClose={onClose} title={member.name} width={480}
      footer={<div className="flex justify-end gap-2"><button type="button" className={BTN.ghost} onClick={onClose}>Close</button><button type="button" className={BTN.primary} disabled={busy || value === current} onClick={save}>{busy ? "Saving…" : "Save department"}</button></div>}>
      <div className="flex flex-col gap-6 px-6 py-5 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="text-text-secondary">Role</dt><dd className="font-semibold text-text-primary">{member.roleLabel || member.role}</dd>
          <dt className="text-text-secondary">Email</dt><dd className="min-w-0 font-semibold text-text-primary [overflow-wrap:anywhere]">{member.email}</dd>
          <dt className="text-text-secondary">Phone</dt><dd className="font-semibold text-text-primary">{member.phone ? <span className="inline-flex items-center gap-1.5 tabular-nums"><Phone size={13} aria-hidden="true" />{member.phone}</span> : <span className="font-normal text-text-secondary">Not added yet</span>}</dd>
          <dt className="text-text-secondary">Activity</dt><dd>{member.lastSeenAt === undefined ? "—" : <LastSeen at={member.lastSeenAt} />}</dd>
        </dl>
        <div>
          <h3 className="text-xs font-bold text-text-secondary">Skills</h3>
          {member.skills?.length ? <ul className="mt-2 flex flex-wrap gap-1.5">{member.skills.map((s) => <li key={s} className="rounded-full border border-ink/[0.1] bg-bg-surface px-2.5 py-0.5 text-xs font-semibold text-text-primary">{s}</li>)}</ul>
            : <p className="mt-1 text-text-secondary">None listed yet. {member.name.split(" ")[0]} adds them in Settings.</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="member-dept" className="text-xs font-bold text-text-secondary">Department</label>
          {!departments ? <Skeleton className="h-10 rounded-xl" /> : (
            <select id="member-dept" className={INPUT} value={value} onChange={(e) => { setValue(e.target.value); setProblem(null); }}>
              <option value="">No department</option>
              {options.map((d) => <option key={d} value={d}>{d}{!departments.includes(d) ? " (archived)" : ""}</option>)}
            </select>
          )}
          <p className="text-xs text-text-secondary">Only a Director changes this. The change is written to the audit log.</p>
          {problem && <p role="alert" className="text-sm text-[#B01F17]">{problem}</p>}
        </div>
      </div>
    </Drawer>
  );
}
