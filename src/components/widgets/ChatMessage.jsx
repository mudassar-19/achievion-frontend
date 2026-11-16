// One chat message, used by the Chat page and the ChatDock (UI-C). Own messages sit on the right in the role tint,
// other people's on the left with avatar and name. Message text is printed as text, never as HTML.
// Actions (react, edit, delete, pin) show only when their handler is passed.
import { useEffect, useRef, useState } from "react";
import { Pencil, Pin, SmilePlus, Trash2 } from "lucide-react";
import useAuthStore from "@/stores/authStore";
import { chatTime, dayLabel, sameDay, sameRun } from "@/lib/chatFormat";
import { Avatar } from "./ChatSettingsDrawers";

const REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "🙏"]; // same set as the server
const ICON_BTN = "flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-ink/[0.07] hover:text-text-primary";

function Reactions({ msg, currentUserId, onReact }) {
  const groups = {};
  for (const r of msg.reactions ?? []) (groups[r.emoji] ??= []).push(String(r.userId?._id ?? r.userId));
  const entries = Object.entries(groups);
  if (!entries.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {entries.map(([emoji, ids]) => {
        const mine = ids.includes(String(currentUserId));
        return (
          <button key={emoji} type="button" onClick={() => onReact?.(msg._id, emoji)} disabled={!onReact} aria-pressed={mine}
            aria-label={`${emoji} ${ids.length}${mine ? ", you reacted" : ""}`}
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] tabular-nums transition-colors ${mine ? "border-accent/40 bg-accent-tint font-bold text-accent-text" : "border-border-subtle text-text-secondary enabled:hover:bg-ink/[0.04]"}`}>
            <span aria-hidden="true">{emoji}</span>{ids.length}
          </button>
        );
      })}
    </div>
  );
}

// The messages of one conversation with a line between days. `rest` = currentUserId, isGroupAdmin and the action handlers.
export function ChatMessages({ messages, ...rest }) {
  const timeZone = useAuthStore((s) => s.user?.settings?.preferences?.timezone) || undefined;
  return messages.map((msg, i) => {
    const prev = messages[i - 1], newDay = !sameDay(prev?.createdAt, msg.createdAt, timeZone);
    return (
      <div key={msg._id}>
        {newDay && (
          <p className="flex items-center gap-3 px-4 pt-4 text-[11px] font-semibold text-text-tertiary">
            <span className="h-px flex-1 bg-ink/[0.08]" aria-hidden="true" />{dayLabel(msg.createdAt, { timeZone })}<span className="h-px flex-1 bg-ink/[0.08]" aria-hidden="true" />
          </p>
        )}
        <ChatMessage msg={msg} prev={newDay ? undefined : prev} {...rest} />
      </div>
    );
  });
}

export default function ChatMessage({ msg, prev, currentUserId, isGroupAdmin, onEdit, onDelete, onPin, onReact }) {
  const prefs = useAuthStore((s) => s.user?.settings?.preferences);
  const timeOpts = { timeZone: prefs?.timezone || undefined, hour12: prefs?.timeFormat !== "24h" };
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content ?? "");
  const inputRef = useRef(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const saved = !String(msg._id).startsWith("opt-");
  const isMe = String(msg.sender?._id ?? msg.sender ?? "") === String(currentUserId);
  const isDeleted = !!msg.deletedAt;
  const grouped = sameRun(prev, msg);
  const name = isMe ? "You" : msg.sender?.name?.trim() || "Deactivated user";
  const when = chatTime(msg.createdAt, timeOpts);
  const canAct = saved && !isDeleted;

  function saveEdit() {
    if (editText.trim() && editText !== msg.content) onEdit(msg._id, editText.trim());
    setEditing(false);
  }

  return (
    <div className={`group flex items-start gap-2 px-4 ${grouped ? "pt-0.5" : "pt-3"} ${isMe ? "flex-row-reverse" : ""}`}>
      {!isMe && (grouped ? <span className="w-[30px] shrink-0" aria-hidden="true" /> : <Avatar user={msg.sender} size={30} />)}
      <div className={`flex min-w-0 max-w-[80%] flex-col ${isMe ? "items-end" : "items-start"}`}>
        {!grouped && (
          <p className="mb-0.5 flex max-w-full items-baseline gap-2 text-xs">
            <span title={isMe ? undefined : name} className="min-w-0 truncate font-bold text-text-primary">{name}</span>
            <time dateTime={msg.createdAt} className="shrink-0 tabular-nums text-text-tertiary">{when}</time>
          </p>
        )}
        {isDeleted ? (
          <p className="text-sm italic text-text-tertiary">This message was deleted.</p>
        ) : editing ? (
          <div className="flex w-full min-w-[14rem] flex-wrap items-center gap-2">
            <input ref={inputRef} value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="Edit message" maxLength={2000}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) saveEdit(); if (e.key === "Escape") { e.stopPropagation(); setEditing(false); } }}
              className="min-w-0 flex-1 rounded-lg border border-border-subtle px-2 py-1.5 text-sm" />
            <button type="button" onClick={saveEdit} className="text-xs font-bold text-accent-text">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs text-text-secondary">Cancel</button>
          </div>
        ) : (
          <p title={grouped ? when : undefined}
            className={`max-w-full whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed text-text-primary [overflow-wrap:anywhere] ${isMe ? "rounded-tr-md bg-accent-tint" : "rounded-tl-md bg-ink/[0.05]"} ${saved ? "" : "opacity-60"}`}>
            {msg.content}
          </p>
        )}
        {(msg.editedAt || msg.isPinned) && !isDeleted && (
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-tertiary">
            {msg.isPinned && <><Pin size={10} aria-hidden="true" /> Pinned</>}
            {msg.editedAt && <span>Edited</span>}
          </p>
        )}
        {!isDeleted && <Reactions msg={msg} currentUserId={currentUserId} onReact={saved ? onReact : undefined} />}
        {picker && (
          <div role="group" aria-label="Pick a reaction" className="mt-1 inline-flex gap-0.5 rounded-full border border-border-subtle bg-bg-surface px-1 py-0.5 shadow-[0_4px_12px_-4px_rgba(20,32,61,0.25)]">
            {REACTIONS.map((e) => (
              <button key={e} type="button" onClick={() => { onReact(msg._id, e); setPicker(false); }} aria-label={`React ${e}`}
                className="h-7 w-7 rounded-full text-base hover:bg-ink/[0.06]">{e}</button>
            ))}
          </div>
        )}
      </div>
      {canAct && (onReact || onEdit || onDelete || onPin) && (
        <div className="flex shrink-0 items-center gap-0.5 self-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none">
          {onReact && <button type="button" onClick={() => setPicker((v) => !v)} className={ICON_BTN} title="React" aria-label="React to message" aria-expanded={picker}><SmilePlus size={14} /></button>}
          {onEdit && isMe && <button type="button" onClick={() => { setEditText(msg.content ?? ""); setEditing(true); }} className={ICON_BTN} title="Edit" aria-label="Edit message"><Pencil size={13} /></button>}
          {onDelete && (isMe || isGroupAdmin) && <button type="button" onClick={() => onDelete(msg._id)} className={`${ICON_BTN} hover:text-[#B01F17]`} title="Delete" aria-label="Delete message"><Trash2 size={13} /></button>}
          {onPin && isGroupAdmin && <button type="button" onClick={() => onPin(msg._id)} className={ICON_BTN} title="Pin" aria-label="Pin message"><Pin size={13} /></button>}
        </div>
      )}
    </div>
  );
}
