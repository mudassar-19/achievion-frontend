// The chat composer (QA2 item 13, D-550): ONE border, an "@" button and the "@" key both open the member list above the box,
// and @names are coloured while you type (a mirror layer behind a transparent-text textarea, so Urdu and long names wrap the same).
// The page owns the text, the send call and useMentions; this only draws.
import { AtSign, Loader2, Paperclip, Send, X } from "lucide-react";
import { splitMentions } from "@/lib/mentions";
import { ACCEPT } from "@/lib/attachPick";
import { ACCENT } from "./ChatSettingsDrawers";

export const MentionText = ({ text, names, className = "" }) => (
  <span className={className}>
    {splitMentions(text, names).map((p, i) => p.mention
      ? <mark key={i} className="rounded bg-accent/15 px-0.5 font-semibold text-accent-text">{p.text}</mark>
      : <span key={i}>{p.text}</span>)}
  </span>
);

const TEXT = "px-1 py-1 text-sm leading-6 whitespace-pre-wrap [overflow-wrap:anywhere]";

export default function ChatComposer({ input, onChange, onSend, sending, mention, inputRef, names, canMention, placeholder, label, sendLabel, attach, fileInputRef, textareaProps }) {
  const files = attach?.files ?? [];
  return (
    <>
    <div className="relative flex flex-col rounded-xl border border-border-subtle bg-bg-surface px-2 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
      {mention.dropdown}
      {files.length > 0 && (
        <ul className="mb-1 flex flex-wrap gap-1.5 px-1" aria-label="Files to send">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border-subtle bg-ink/[0.04] py-1 pl-2 pr-1 text-xs">
              <Paperclip size={12} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 max-w-[16rem] truncate" title={f.name}>{f.name}</span>
              <span className="shrink-0 tabular-nums text-text-tertiary">{Math.max(1, Math.round(f.size / 1024))} KB</span>
              <button type="button" onClick={() => attach.onRemove(i)} aria-label={`Remove ${f.name}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-ink/[0.08]"><X size={13} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-1.5">
      <div className="max-h-32 min-w-0 flex-1 overflow-y-auto">
        <div className="grid">
          <div aria-hidden="true" className={`${TEXT} pointer-events-none text-text-primary [grid-area:1/1]`}>
            <MentionText text={input} names={names} />{"\n"}
          </div>
          <textarea ref={inputRef} value={input} onChange={onChange} rows={1} maxLength={2000}
            role="combobox" aria-expanded={mention.open} aria-autocomplete="list" aria-controls="chat-people" aria-activedescendant={mention.activeId}
            aria-label={label} placeholder={placeholder}
            onKeyDown={(e) => { if (mention.onKeyDown(e)) return; if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            className={`${TEXT} resize-none overflow-hidden bg-transparent text-transparent caret-[var(--text-primary,#14203D)] [grid-area:1/1] placeholder:text-text-tertiary focus:outline-none`}
            {...textareaProps} />
        </div>
      </div>
      {attach?.on && (
        <>
          <input ref={fileInputRef} type="file" multiple accept={ACCEPT} onChange={attach.onPick} className="sr-only" tabIndex={-1} aria-hidden="true" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={files.length >= attach.max} aria-label="Attach a file" title={`Attach a file (up to ${attach.max}, 5 MB each)`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-ink/[0.07] hover:text-accent-text disabled:opacity-40">
            <Paperclip size={16} aria-hidden="true" />
          </button>
        </>
      )}
      {canMention && (
        <button type="button" onClick={() => { inputRef.current?.focus(); mention.openAt(); }} aria-label="Mention someone" title="Mention someone (@)"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-ink/[0.07] hover:text-accent-text">
          <AtSign size={16} aria-hidden="true" />
        </button>
      )}
      <button type="button" onClick={onSend} disabled={sending || (!input.trim() && !files.length)} aria-label={sendLabel} title={sendLabel}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white disabled:opacity-30" style={{ background: ACCENT }}>
        {sending ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
      </button>
      </div>
    </div>
    {attach?.errors?.length > 0 && <ul role="alert" className="mt-1 flex flex-col gap-0.5 px-1 text-xs font-semibold text-danger">{attach.errors.map((m) => <li key={m}>{m}</li>)}</ul>}
    {attach && !attach.on && attach.known && <p className="mt-1 px-1 text-xs text-text-tertiary">File attachments are switched off on this server, so only text can be sent.</p>}
    </>
  );
}
