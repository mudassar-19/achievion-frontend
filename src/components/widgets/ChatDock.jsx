// ChatDock (UI-C, master list item 14): one dock for the six portals, mounted by PortalShell. Bottom-right bar with the
// unread number -> list of conversations -> small chat window (320 x 440), without leaving the page.
// Up to two windows on wide screens, one below 1024px. Esc closes the window or the list and gives focus back to the bar.
// Only window ids are kept, in sessionStorage per person; messages are never stored in the browser.
// Not here (use the Chat page): new DM, edit / delete / react / pin, group settings.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BellOff, ChevronDown, ChevronUp, Loader2, Megaphone, MessageSquare, Minus, Send, X } from "lucide-react";
import api from "@/lib/api";
import socket from "@/utils/socket";
import useAuthStore from "@/stores/authStore";
import useDmPeople from "@/hooks/useDmPeople";
import { badge, canPostIn, chatTitle, unreadTotal } from "@/lib/chatFormat";
import { Avatar } from "./ChatSettingsDrawers";
import useMentions from "@/components/ui/useMentions";
import { ChatMessages } from "./ChatMessage";

const KEY = "achievion-chatdock:";
// ponytail: the list (and open windows) re-read every 20 s because a message sent over REST is not pushed to other
// people (audit rule H2). Open windows also listen on the socket, so this can go once the server emits on REST send.
const POLL_MS = 20_000;
const LIST_MAX = 60; // rows drawn in the list; the Chat page has search for the rest
const HEAD_BTN = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-ink/[0.07] hover:text-text-primary";
const SHADOW = "shadow-[0_-2px_24px_-6px_rgba(20,32,61,0.28)]";

function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)"), on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

function ChatWindow({ conv, me, minimized, tick, onMinimize, onClose, onSeen }) {
  const [messages, setMessages] = useState(null); // null = loading
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const endRef = useRef(null), inputRef = useRef(null), seq = useRef(0);
  const id = conv.id;
  // Items 73-75: "@" opens the group's member list (never yourself). A DM has only two people, so no list there.
  const [members, setMembers] = useState([]);
  useEffect(() => {
    if (conv.kind === "dm" || minimized) return;
    let live = true;
    api.get(`/api/chat/channels/${id}/members`, { silent: true }).then((ms) => live && setMembers(ms)).catch(() => {});
    return () => { live = false; };
  }, [id, conv.kind, minimized]);
  const mention = useMentions({ value: text, setValue: setText, inputRef, members, meId: me.id, listId: `dock-${id}-people` });

  const load = useCallback(() => {
    api.get(`/api/chat/channels/${id}/messages?limit=30`, { silent: true })
      .then((ms) => { setFailed(false); setMessages((cur) => [...ms, ...(cur ?? []).filter((m) => String(m._id).startsWith("opt-"))]); onSeen(id); })
      .catch(() => setFailed(true));
  }, [id, onSeen]);
  // Reading the messages marks them read on the server, so a minimized window does not load.
  useEffect(() => { if (!minimized) load(); }, [load, minimized, tick]);
  useEffect(() => { if (!minimized) inputRef.current?.focus(); }, [minimized]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages, minimized]);

  // Live only for an open window: it joins its own room (a Director or Manager can have hundreds of groups).
  useEffect(() => {
    const join = () => socket.emit("chat:join", { channelId: id });
    join(); socket.on("connect", join);
    return () => { socket.off("connect", join); socket.emit("chat:leave", { channelId: id }); };
  }, [id]);
  useEffect(() => {
    const mine = (m) => String(m.channelId) === id;
    const onNew = (m) => { if (!mine(m)) return; setMessages((cur) => (cur ?? []).some((x) => x._id === m._id) ? cur : [...(cur ?? []).filter((x) => !(m.clientId && x.clientId === m.clientId)), m]); };
    const onUpd = (m) => { if (mine(m)) setMessages((cur) => (cur ?? []).map((x) => (x._id === m._id ? { ...x, ...m } : x))); };
    const onDel = ({ _id }) => setMessages((cur) => (cur ?? []).map((x) => (x._id === _id ? { ...x, deletedAt: new Date().toISOString(), content: "" } : x)));
    socket.on("chat:new_message", onNew); socket.on("chat:message_updated", onUpd); socket.on("chat:message_deleted", onDel);
    return () => { socket.off("chat:new_message", onNew); socket.off("chat:message_updated", onUpd); socket.off("chat:message_deleted", onDel); };
  }, [id]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    const clientId = `${me.id}-dock-${++seq.current}-${Date.now()}`;
    const mentions = mention.idsIn(content); mention.reset();
    setText(""); setSendError(""); setSending(true);
    setMessages((cur) => [...(cur ?? []), { _id: `opt-${clientId}`, clientId, channelId: id, sender: { _id: me.id, name: me.name }, content, createdAt: new Date().toISOString() }]);
    try {
      const saved = await api.post(`/api/chat/channels/${id}/messages`, { content, clientId, mentions }, { silent: true });
      setMessages((cur) => (cur ?? []).some((x) => x._id === saved._id) ? cur.filter((x) => x._id !== `opt-${clientId}`) : cur.map((x) => (x.clientId === clientId ? saved : x)));
    } catch (e) {
      setMessages((cur) => (cur ?? []).filter((x) => x.clientId !== clientId));
      setText(content); setSendError(e?.message ?? "Not sent. Try again.");
    } finally { setSending(false); inputRef.current?.focus(); }
  }

  const canPost = canPostIn(conv.raw, me);
  return (
    <section role="dialog" aria-label={`Chat with ${conv.title}`} data-chat-window={id}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(id); } }}
      className={`pointer-events-auto flex w-[min(320px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface lg:rounded-b-none lg:border-b-0 ${SHADOW} ${minimized ? "" : "h-[min(440px,calc(100dvh-8.5rem))] lg:h-[min(440px,calc(100dvh-5rem))]"}`}>
      <header className="flex shrink-0 items-center gap-1 border-b border-ink/[0.07] py-1.5 pl-3 pr-1.5">
        <button type="button" onClick={() => onMinimize(id)} aria-expanded={!minimized} title={conv.title}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left">
          {conv.kind === "dm" ? <Avatar user={conv.person ?? { name: conv.title }} size={24} /> : <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-text">{conv.kind === "announcement" ? <Megaphone size={12} /> : <MessageSquare size={12} />}</span>}
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-text-primary">{conv.title}</span>
            {conv.sub && <span className="block truncate text-[11px] text-text-tertiary">{conv.sub}</span>}
          </span>
        </button>
        <button type="button" onClick={() => onMinimize(id)} className={HEAD_BTN} aria-label={minimized ? `Open chat with ${conv.title}` : `Minimize chat with ${conv.title}`}>{minimized ? <ChevronUp size={15} /> : <Minus size={15} />}</button>
        <button type="button" onClick={() => onClose(id)} className={HEAD_BTN} aria-label={`Close chat with ${conv.title}`}><X size={15} /></button>
      </header>
      {!minimized && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto pb-3" aria-live="polite">
            {messages === null && !failed && <p className="flex items-center justify-center gap-2 py-10 text-sm text-text-secondary"><Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Loading messages…</p>}
            {failed && messages === null && <p role="alert" className="px-4 py-8 text-center text-sm text-text-secondary">Messages could not be loaded. <button type="button" onClick={load} className="font-bold text-accent-text underline">Try again</button></p>}
            {messages?.length === 0 && <p className="px-6 py-10 text-center text-sm text-text-secondary">No messages yet. Write the first one below.</p>}
            {messages?.length > 0 && <ChatMessages messages={messages} currentUserId={me.id} />}
            <div ref={endRef} />
          </div>
          <div className="shrink-0 border-t border-ink/[0.07] p-2">
            {sendError && <p role="alert" className="px-1 pb-1.5 text-xs font-semibold text-[#B01F17]">{sendError}</p>}
            {canPost ? (
              <div className="field relative flex items-end gap-2 rounded-xl border border-border-subtle bg-white px-2.5 py-1.5">
                {mention.dropdown}
                <textarea ref={inputRef} value={text} onChange={(e) => { setText(e.target.value); mention.track(e.target.value, e.target.selectionStart); }} rows={1} maxLength={2000}
                  role="combobox" aria-expanded={mention.open} aria-autocomplete="list" aria-controls={`dock-${id}-people`} aria-activedescendant={mention.activeId}
                  onKeyDown={(e) => { if (mention.onKeyDown(e)) return; if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  aria-label={`Message ${conv.title}`} placeholder="Write a message"
                  className="max-h-24 min-w-0 flex-1 resize-none bg-transparent py-1 text-sm leading-normal text-text-primary placeholder:text-text-tertiary focus:outline-none" />
                <button type="button" onClick={send} disabled={sending || !text.trim()} aria-label="Send message"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-35">
                  {sending ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Send size={14} />}
                </button>
              </div>
            ) : <p className="px-2 py-1.5 text-center text-xs text-text-secondary">Only admins, and people they allow, can post here.</p>}
          </div>
        </>
      )}
    </section>
  );
}

export default function ChatDock({ chatPath, rightOffset = 0 }) {
  const user = useAuthStore((s) => s.user);
  const me = useMemo(() => ({ id: String(user?._id ?? user?.id ?? ""), name: user?.name, role: user?.role }), [user]);
  const wide = useWide();
  const [groups, setGroups] = useState([]);
  const [dms, setDms] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [listOpen, setListOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [windows, setWindows] = useState(() => { // [{ id, min }]
    try { return JSON.parse(sessionStorage.getItem(KEY + me.id) ?? "[]").filter((w) => typeof w?.id === "string").slice(0, 2); } catch { return []; }
  });
  const barRef = useRef(null);
  const personOf = useDmPeople(dms, me.id);

  // Another person signed in on this tab: their window list goes.
  useEffect(() => {
    try { for (const k of Object.keys(sessionStorage)) if (k.startsWith(KEY) && k !== KEY + me.id) sessionStorage.removeItem(k); } catch { /* storage blocked */ }
  }, [me.id]);
  useEffect(() => { try { sessionStorage.setItem(KEY + me.id, JSON.stringify(windows)); } catch { /* storage blocked */ } }, [windows, me.id]);

  const load = useCallback(async () => {
    try {
      const [coms, channels] = await Promise.all([api.get("/api/communities", { silent: true }), api.get("/api/chat/channels", { silent: true })]);
      setGroups(coms.flatMap((c) => (c.groups ?? []).map((g) => ({ ...g, _community: c.name }))));
      setDms(channels.filter((c) => c.type === "dm"));
      setState("ready"); setTick((t) => t + 1);
    } catch { setState((s) => (s === "ready" ? s : "error")); }
  }, []);
  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect -- first read, same pattern as useLoad
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const convs = useMemo(() => [
    ...dms.map((d) => ({ id: String(d._id), kind: "dm", person: personOf(d) ?? null, title: chatTitle(d, personOf(d)), sub: personOf(d)?.role ?? "", unread: d.unread ?? 0, muted: (d.mutedBy ?? []).some((m) => String(m) === me.id), raw: d })),
    ...groups.map((g) => ({ id: String(g._id), kind: g.type === "announcement" ? "announcement" : "group", title: chatTitle(g), sub: g._community, unread: g.unread ?? 0, muted: !!g.muted, raw: g })),
  // Unread first, then people before groups (a Director can have hundreds of groups and the list stops at LIST_MAX).
  ].sort((a, b) => (b.unread > 0 && !b.muted) - (a.unread > 0 && !a.muted) || (b.kind === "dm") - (a.kind === "dm") || a.title.localeCompare(b.title)), [dms, groups, personOf, me.id]);

  const seen = useCallback((id) => {
    const zero = (list) => (list.some((c) => String(c._id) === id && c.unread) ? list.map((c) => (String(c._id) === id ? { ...c, unread: 0 } : c)) : list);
    setGroups(zero); setDms(zero);
  }, []);
  const max = wide ? 2 : 1;
  function open(id) {
    setWindows((w) => [{ id, min: false }, ...w.filter((x) => x.id !== id)].slice(0, max));
    if (!wide) setListOpen(false);
  }
  const close = useCallback((id) => { setWindows((w) => w.filter((x) => x.id !== id)); barRef.current?.focus(); }, []);
  const minimize = useCallback((id) => setWindows((w) => w.map((x) => (x.id === id ? { ...x, min: !x.min } : x))), []);

  const total = unreadTotal(convs);
  const byId = Object.fromEntries(convs.map((c) => [c.id, c]));
  const shown = windows.filter((w) => byId[w.id]).slice(0, max);
  return (
    <div data-chat-dock className="pointer-events-none fixed bottom-0 z-[42] flex flex-col-reverse items-end gap-2 transition-[right] duration-200 motion-reduce:transition-none lg:flex-row-reverse lg:gap-3"
      style={{ right: rightOffset + (wide ? 16 : 8) }}>
      <section aria-label="Messages" onKeyDown={(e) => { if (e.key === "Escape" && listOpen) { e.stopPropagation(); setListOpen(false); barRef.current?.focus(); } }}
        className={`pointer-events-auto flex flex-col overflow-hidden rounded-t-2xl border border-b-0 border-border-subtle bg-bg-surface ${SHADOW} ${listOpen ? "w-[min(300px,calc(100vw-1rem))]" : ""}`}>
        <button ref={barRef} type="button" onClick={() => setListOpen((v) => !v)} aria-expanded={listOpen} aria-controls="chat-dock-list"
          aria-label={total ? `Messages, ${total} unread` : "Messages"}
          className="flex h-11 items-center gap-2 px-3.5 text-sm font-bold text-text-primary hover:bg-ink/[0.04]">
          <MessageSquare size={16} className="shrink-0 text-accent-text" aria-hidden="true" />
          <span className={listOpen ? "flex-1 text-left" : "hidden flex-1 text-left sm:inline"}>Messages</span>
          {total > 0 && <span data-chat-unread className="rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold tabular-nums leading-none text-white">{badge(total)}</span>}
          {listOpen ? <ChevronDown size={15} className="shrink-0 text-text-secondary" aria-hidden="true" /> : <ChevronUp size={15} className="hidden shrink-0 text-text-secondary sm:block" aria-hidden="true" />}
        </button>
        {listOpen && (
          <div id="chat-dock-list" className="flex max-h-[min(380px,calc(100dvh-8rem))] flex-col border-t border-ink/[0.07]">
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              {state === "loading" && <p className="px-4 py-6 text-center text-sm text-text-secondary">Loading conversations…</p>}
              {state === "error" && <p role="alert" className="px-4 py-6 text-center text-sm text-text-secondary">Conversations could not be loaded. <button type="button" onClick={load} className="font-bold text-accent-text underline">Try again</button></p>}
              {state === "ready" && convs.length === 0 && <p className="px-4 py-6 text-center text-sm text-text-secondary">No conversations yet. Start a direct message from the Chat page.</p>}
              {state === "ready" && convs.length > 0 && (
                <ul>
                  {convs.slice(0, LIST_MAX).map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => open(c.id)} title={c.title}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left hover:bg-ink/[0.04]">
                        {c.kind === "dm" ? <Avatar user={c.person ?? { name: c.title }} size={28} /> : <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-text">{c.kind === "announcement" ? <Megaphone size={13} /> : <MessageSquare size={13} />}</span>}
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm text-text-primary ${c.unread && !c.muted ? "font-bold" : "font-semibold"}`}>{c.title}</span>
                          {c.sub && <span className="block truncate text-[11px] text-text-tertiary">{c.sub}</span>}
                        </span>
                        {c.muted ? <BellOff size={12} className="shrink-0 text-text-tertiary" aria-label="Muted" />
                          : c.unread > 0 && <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold tabular-nums leading-none text-white" aria-label={`${c.unread} unread`}>{badge(c.unread)}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {convs.length > LIST_MAX && <p className="px-3.5 py-2 text-xs text-text-secondary">Showing {LIST_MAX} of {convs.length}. Search the rest on the Chat page.</p>}
            </div>
            {chatPath && <Link to={chatPath} onClick={() => setListOpen(false)} className="shrink-0 border-t border-ink/[0.07] px-3.5 py-2.5 text-[13px] font-bold text-accent-text hover:bg-ink/[0.04]">Open the Chat page</Link>}
          </div>
        )}
      </section>
      {(wide || !listOpen) && shown.map((w) => (
        <ChatWindow key={w.id} conv={byId[w.id]} me={me} minimized={w.min} tick={tick} onMinimize={minimize} onClose={close} onSeen={seen} />
      ))}
    </div>
  );
}
