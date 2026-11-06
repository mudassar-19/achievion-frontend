// Task comments in the Team Lead drawer (T-4, D-139; FR03-12, FR09-05/06): @mention autocomplete from project members,
// fixed reactions, edit / delete own. The server decides who was mentioned from the text.
import { useLayoutEffect, useRef, useState } from "react";
import { Pencil, SmilePlus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { BTN } from "@/components/ui/buttons";
import { fmtDateTime } from "../../manager/project/format";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Text with @Names of members in bold.
function Rich({ text, members }) {
  const names = members.map((m) => m.name).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!names.length) return text;
  const re = new RegExp(`(@(?:${names.map(esc).join("|")}))(?![\\p{L}\\p{N}])`, "giu");
  return String(text).split(re).map((part, i) => (i % 2 ? <strong key={i} className="font-bold text-accent-text">{part}</strong> : part));
}

// Textarea + @ list. Arrow keys move, Enter or Tab picks, Escape closes.
function MentionBox({ id, value, onChange, members, placeholder, rows = 2 }) {
  const ref = useRef(null);
  const caret = useRef(null);
  const [q, setQ] = useState(null); // { start, text } while typing a name
  const [idx, setIdx] = useState(0);
  const list = q ? members.filter((m) => m.name.toLowerCase().includes(q.text.toLowerCase())).slice(0, 6) : [];
  function track(v, pos) {
    const m = /(^|[^\p{L}\p{N}])@([\p{L}\p{N} .'-]{0,30})$/u.exec(v.slice(0, pos));
    setQ(m ? { start: pos - m[2].length - 1, text: m[2] } : null); setIdx(0);
  }
  function pick(m) {
    const pos = ref.current.selectionStart, next = `${value.slice(0, q.start)}@${m.name} ${value.slice(pos)}`;
    caret.current = q.start + m.name.length + 2;
    onChange(next); setQ(null);
  }
  // Right after the picked name is in the box, before any further typing can land elsewhere.
  useLayoutEffect(() => {
    if (caret.current === null) return;
    ref.current?.focus(); ref.current?.setSelectionRange(caret.current, caret.current); caret.current = null;
  }, [value]);
  const listId = `${id}-people`;
  return (
    <div className="relative">
      <textarea id={id} ref={ref} rows={rows} maxLength={2000} value={value} placeholder={placeholder} className="w-full rounded-xl p-3 font-normal" role="combobox" aria-expanded={list.length > 0} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={list.length ? `${listId}-${idx}` : undefined}
        onChange={(e) => { onChange(e.target.value); track(e.target.value, e.target.selectionStart); }}
        onKeyDown={(e) => {
          if (!list.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (i + 1) % list.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (i + list.length - 1) % list.length); }
          else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(list[idx]); }
          else if (e.key === "Escape") { e.stopPropagation(); setQ(null); }
        }} />
      {list.length > 0 && (
        <ul id={listId} role="listbox" aria-label="People on this project" className="absolute left-0 right-0 z-10 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border-subtle bg-bg-surface py-1 shadow-lg">
          {list.map((m, i) => (
            <li key={m.id} id={`${listId}-${i}`} role="option" aria-selected={i === idx} onMouseDown={(e) => { e.preventDefault(); pick(m); }}
              className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-sm ${i === idx ? "bg-accent-tint" : ""}`}>
              <span className="min-w-0 truncate font-semibold" title={m.name}>{m.name}</span><span className="shrink-0 text-xs text-text-secondary">{m.role}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// E-2: employees pass base=/api/tasks/:id (same handlers, S-1 scope) and their own placeholder; defaults = Team Lead.
export default function TaskComments({ t, taskId, act, busy, base: baseProp, placeholder = "Write to the assignee. Type @ to mention someone…" }) {
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(null); // { id, text }
  const [picker, setPicker] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const base = baseProp ?? `/api/teamlead/tasks/${taskId}`;
  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    if (await act(() => api.post(`${base}/comment`, { text: text.trim() }), "Comment added.")) setText("");
  }
  async function saveEdit(e) {
    e.preventDefault();
    if (!editing.text.trim()) return;
    if (await act(() => api.patch(`${base}/comments/${editing.id}`, { text: editing.text.trim() }), "Comment updated.")) setEditing(null);
  }
  const react = (id, emoji) => { setPicker(null); return act(() => api.post(`${base}/comments/${id}/reactions`, { emoji })); };
  const members = t.members ?? [];
  return (
    <>
      <form onSubmit={add} className="flex flex-col gap-2">
        <label htmlFor="td-comment" className="font-bold">Add a comment</label>
        <MentionBox id="td-comment" value={text} onChange={setText} members={members} placeholder={placeholder} />
        <button type="submit" className={`${BTN.primary} self-start`} disabled={busy || !text.trim()}>Add comment</button>
      </form>
      {t.comments.length ? (
        <ul className="flex flex-col gap-2">
          {t.comments.map((c) => (
            <li key={c.id} className="min-w-0 rounded-xl bg-ink/[0.03] px-3 py-2">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs"><span className="font-bold" title={c.author}>{c.author}</span> <span className="text-text-secondary">· {fmtDateTime(c.at)}{c.editedAt ? " · edited" : ""}</span></p>
                {c.mine && !(editing && editing.id === c.id) && (
                  <span className="flex shrink-0 gap-0.5">
                    <button type="button" aria-label="Edit your comment" className={BTN.icon} onClick={() => setEditing({ id: c.id, text: c.text })}><Pencil size={14} aria-hidden="true" /></button>
                    <button type="button" aria-label="Delete your comment" className={BTN.icon} onClick={() => setDeleting(c.id)}><Trash2 size={14} aria-hidden="true" /></button>
                  </span>
                )}
              </div>
              {editing && editing.id === c.id ? (
                <form onSubmit={saveEdit} className="mt-1 flex flex-col gap-2">
                  <MentionBox id={`td-edit-${c.id}`} value={editing.text} onChange={(v) => setEditing((x) => ({ ...x, text: v }))} members={members} />
                  <span className="flex gap-2"><button type="submit" className={BTN.primary} disabled={busy || !editing.text.trim()}>Save</button><button type="button" className={BTN.ghost} onClick={() => setEditing(null)}>Cancel</button></span>
                </form>
              ) : <p className="mt-0.5 whitespace-pre-wrap [overflow-wrap:anywhere]"><Rich text={c.text} members={members} /></p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {c.reactions.map((r) => (
                  <button key={r.emoji} type="button" aria-pressed={r.mine} aria-label={`${r.emoji} ${r.count}${r.mine ? ", you reacted" : ""}`} disabled={busy} onClick={() => react(c.id, r.emoji)}
                    className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-xs font-bold tabular-nums ${r.mine ? "border-accent/40 bg-accent-tint text-accent-text" : "border-ink/[0.08] text-text-secondary hover:bg-ink/[0.05]"}`}>{r.emoji} {r.count}</button>
                ))}
                <button type="button" aria-label="Add a reaction" aria-expanded={picker === c.id} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-ink/[0.06]" onClick={() => setPicker((p) => (p === c.id ? null : c.id))}><SmilePlus size={15} aria-hidden="true" /></button>
                {picker === c.id && (t.reactionSet ?? []).map((e) => <button key={e} type="button" aria-label={`React with ${e}`} disabled={busy} className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-ink/[0.06]" onClick={() => react(c.id, e)}>{e}</button>)}
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-text-secondary">No comments yet.</p>}
      <ConfirmModal layer="z-[70]" open={!!deleting} onClose={() => setDeleting(null)} destructive title="Delete your comment?" body="It disappears for everyone." confirmLabel="Delete" loading={busy}
        onConfirm={async () => { await act(() => api.delete(`${base}/comments/${deleting}`), "Comment deleted."); setDeleting(null); }} />
    </>
  );
}
