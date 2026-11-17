// @ mentions for a chat composer (items 73-75, D-545): type "@" and a dropdown of the group's members opens (prefix match, never
// yourself); Up/Down move, Enter or Tab picks, Escape closes. It returns the ids to send as `mentions` for names still in the text.
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { mentionCandidates, nextIndex, activeMention } from "@/lib/mentions";

export default function useMentions({ value, setValue, inputRef, members, meId, listId }) {
  const [q, setQ] = useState(null);       // { start, text } while an @name is being typed
  const [idx, setIdx] = useState(0);
  const picked = useRef(new Map());       // name → id, for the people picked from the list
  const caret = useRef(null);
  const list = useMemo(() => (q ? mentionCandidates(members, meId, q.text) : []), [q, members, meId]);

  const track = useCallback((text, pos) => { setQ(activeMention(text, pos)); setIdx(0); }, []);
  const pick = useCallback((p) => {
    const pos = inputRef.current?.selectionStart ?? value.length;
    picked.current.set(p.name, String(p.id ?? p._id));
    caret.current = q.start + p.name.length + 2;
    setValue(`${value.slice(0, q.start)}@${p.name} ${value.slice(pos)}`); setQ(null);
  }, [q, value, setValue, inputRef]);
  // After the name is in the box, put the caret behind it (before any further typing).
  useLayoutEffect(() => {
    if (caret.current === null) return;
    inputRef.current?.focus(); inputRef.current?.setSelectionRange(caret.current, caret.current); caret.current = null;
  }, [value, inputRef]);

  // true = the key was used by the list (the composer must not also send).
  const onKeyDown = (e) => {
    if (!list.length) return false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => nextIndex(i, e.key, list.length)); return true; }
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(list[idx]); return true; }
    if (e.key === "Escape") { e.stopPropagation(); setQ(null); return true; }
    return false;
  };
  // The "@" button: put an @ at the caret (after a space if the caret sits right behind a word) and open the list.
  const openAt = () => {
    const pos = inputRef.current?.selectionStart ?? value.length, pre = value.slice(0, pos), gap = pre && !/\s$/.test(pre) ? " " : "";
    caret.current = pos + gap.length + 1;
    setValue(`${pre}${gap}@${value.slice(pos)}`); setQ({ start: pos + gap.length, text: "" }); setIdx(0);
  };
  const idsIn = (text) => [...picked.current].filter(([name]) => text.includes(`@${name}`)).map(([, id]) => id);
  const reset = () => { picked.current = new Map(); setQ(null); };

  const dropdown = list.length > 0 && (
    <ul id={listId} role="listbox" aria-label="People in this chat" className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-56 overflow-y-auto rounded-xl border border-border-subtle bg-bg-surface py-1 shadow-lg">
      {list.map((p, i) => (
        <li key={String(p.id ?? p._id)} id={`${listId}-${i}`} role="option" aria-selected={i === idx} onMouseDown={(e) => { e.preventDefault(); pick(p); }}
          className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-sm ${i === idx ? "bg-accent-tint" : ""}`}>
          <span className="min-w-0 truncate font-semibold" title={p.name}>{p.name}</span><span className="shrink-0 text-xs text-text-secondary">{p.role}</span>
        </li>
      ))}
    </ul>
  );
  return { track, onKeyDown, idsIn, reset, openAt, dropdown, open: list.length > 0, activeId: list.length ? `${listId}-${idx}` : undefined };
}
