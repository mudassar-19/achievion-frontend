// Ask ACHIEVION, full page (UI-E2, master list item 30): the chat in the middle, recent chats on the right (it can be
// folded away), a light page with no gradients, text at 4.5:1 or better, the shared markdown renderer, no mascot.
// History is the same store the top-bar AI panel writes to (lib/aiChats.js): a panel question shows up here.
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Markdown, { SourceChips } from "@/components/ui/Markdown";
import {
  Sparkles, Send, RefreshCw, Plus, Trash2, Database, Pencil, Check, X, PanelRightClose, PanelRightOpen, History,
  BarChart2, Users, AlertTriangle, Target, Layers, Zap,
} from "lucide-react";
import api from "@/lib/api";
import useAuthStore from "@/stores/authStore";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { loadChats, saveChats, upsertChat, renameChat, deleteChat, uniqueTitles } from "@/lib/aiChats";

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function whenText(iso) {
  if (!iso) return "";
  const d = new Date(iso), diff = (Date.now() - d) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

const SUGGESTIONS = [
  { icon: AlertTriangle, label: "Risk", text: "What are the top risks in our organization right now?" },
  { icon: Layers, label: "Projects", text: "Which projects are at risk of missing their deadline?" },
  { icon: Users, label: "Team", text: "How is team performance looking this month?" },
  { icon: BarChart2, label: "Highlights", text: "Summarise this week's organizational highlights" },
  { icon: Target, label: "Goals", text: "Which goals are behind target this quarter?" },
  { icon: Zap, label: "Actions", text: "What should I focus on as Director this week?" },
];

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 px-4 sm:px-8 ${isUser ? "justify-end" : ""}`}>
      {!isUser && <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-text"><Sparkles size={15} /></span>}
      <div className={`min-w-0 max-w-[85%] ${isUser ? "" : "flex-1"}`}>
        {isUser ? (
          <p className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent-tint px-4 py-3 text-sm leading-relaxed text-text-primary [overflow-wrap:anywhere]">{msg.text}</p>
        ) : msg.error ? (
          <p role="alert" className="rounded-2xl border border-[#D1291F]/30 bg-[#D1291F]/[0.06] px-4 py-3 text-sm text-[#8F1912] [overflow-wrap:anywhere]">{msg.text}</p>
        ) : (
          <>
            <div className="rounded-2xl rounded-bl-md border border-border-subtle bg-white px-4 py-3 text-sm leading-relaxed text-text-primary [overflow-wrap:anywhere]"><Markdown text={msg.text} accent="#4B2FC4" /></div>
            {msg.citations?.length > 0 && <SourceChips citations={msg.citations} className="mt-2" />}
          </>
        )}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex gap-3 px-4 sm:px-8" role="status" aria-label="ACHIEVION is writing">
      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent-text"><Sparkles size={15} /></span>
      <span className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border-subtle bg-white px-4 py-3.5">
        {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-accent/60 motion-reduce:animate-none" style={{ animationDelay: `${i * 140}ms` }} />)}
      </span>
    </div>
  );
}

export default function AskAchievionPage() {
  const user = useAuthStore((s) => s.user);
  const userId = String(user?._id ?? user?.id ?? "");
  const reduce = useReducedMotion();
  const [sp, setSp] = useSearchParams();
  const [chats, setChats] = useState(() => loadChats(userId));
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reindex, setReindex] = useState({ busy: false, result: null });
  const [panelOpen, setPanelOpen] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const [renaming, setRenaming] = useState(null); // { id, value }
  const [deleting, setDeleting] = useState(null); // chat
  const bottomRef = useRef(null), inputRef = useRef(null);

  const titles = useMemo(() => uniqueTitles(chats), [chats]);
  const save = useCallback((next) => { setChats(next); saveChats(userId, next); }, [userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }, [messages, loading, reduce]);
  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [activeId, loading]);

  // ?chat=<id> opens that chat (the top-bar panel links here).
  const wanted = sp.get("chat");
  useEffect(() => {
    if (!wanted) return;
    const c = loadChats(userId).find((x) => x.id === wanted);
    if (c) { setChats(loadChats(userId)); setActiveId(c.id); setMessages(c.messages ?? []); } // eslint-disable-line react-hooks/set-state-in-effect
  }, [wanted, userId]);

  const send = useCallback(async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    const chatId = activeId ?? uid();
    if (!activeId) setActiveId(chatId);
    const history = messages.filter((m) => !m.error).slice(-6).map((m) => ({ role: m.role, text: m.text }));
    const withQ = [...messages, { role: "user", text: q }];
    setMessages(withQ);
    let list = upsertChat(chats, { id: chatId, firstQuestion: q, messages: withQ }); save(list);
    setLoading(true);
    let reply;
    try {
      const res = await api.post("/api/director/ai/ask", { question: q, history }, { silent: true });
      reply = res.notEnoughData
        ? { role: "ai", text: "The knowledge index is empty. Use “Refresh knowledge index” above to index your organization's data.", citations: [] }
        : { role: "ai", text: res.answer, citations: res.citations ?? [] };
    } catch (err) {
      reply = { role: "ai", error: true, text: err?.message ?? "Something went wrong. Try again." };
    }
    const done = [...withQ, reply];
    setMessages(done);
    list = upsertChat(list, { id: chatId, firstQuestion: q, messages: done }); save(list);
    setLoading(false);
  }, [input, loading, messages, activeId, chats, save]);

  function newChat() {
    setActiveId(null); setMessages([]); setInput(""); setSp({}, { replace: true });
    setTimeout(() => inputRef.current?.focus(), 60);
  }
  function openChat(c) {
    setActiveId(c.id); setMessages(c.messages ?? []); setInput(""); setSp({ chat: c.id }, { replace: true });
    if (!window.matchMedia("(min-width: 1024px)").matches) setPanelOpen(false);
  }
  function confirmDelete() {
    save(deleteChat(chats, deleting.id));
    if (activeId === deleting.id) newChat();
    setDeleting(null);
  }
  function commitRename() {
    if (renaming) save(renameChat(chats, renaming.id, renaming.value));
    setRenaming(null);
  }
  async function refreshIndex() {
    setReindex({ busy: true, result: null });
    try { const r = await api.post("/api/director/ai/reindex", {}, { silent: true }); setReindex({ busy: false, result: { ok: true, count: r.indexed ?? 0 } }); }
    catch { setReindex({ busy: false, result: { ok: false } }); }
  }

  const hasMessages = messages.length > 0;
  const activeTitle = activeId ? titles[activeId] : null;

  return (
    <div className="relative flex h-full overflow-hidden bg-bg-base">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-subtle bg-bg-surface px-4 py-3 sm:px-8">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent-text"><Sparkles size={17} /></span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black text-text-primary" title={activeTitle ?? "Ask ACHIEVION"}>{activeTitle ?? "Ask ACHIEVION"}</h1>
            <p className="truncate text-xs text-text-secondary">Your AI analyst for projects, people, risks and goals. It only suggests; you decide.</p>
          </div>
          <button type="button" onClick={refreshIndex} disabled={reindex.busy} aria-live="polite"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-subtle bg-white px-3 text-[13px] font-bold text-text-primary hover:bg-bg-muted disabled:opacity-50">
            {reindex.busy ? <RefreshCw size={13} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Database size={13} aria-hidden="true" />}
            {reindex.busy ? "Refreshing…" : reindex.result?.ok ? `${reindex.result.count} documents indexed` : reindex.result?.ok === false ? "Refresh failed. Try again" : "Refresh knowledge index"}
          </button>
          <button type="button" onClick={() => setPanelOpen((v) => !v)} aria-expanded={panelOpen} aria-controls="ai-recent"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-subtle bg-white px-3 text-[13px] font-bold text-text-primary hover:bg-bg-muted">
            {panelOpen ? <PanelRightClose size={14} aria-hidden="true" /> : <PanelRightOpen size={14} aria-hidden="true" />} Recent chats
          </button>
        </header>

        <div className="flex-1 overflow-y-auto py-6" aria-live="polite">
          {!hasMessages ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-6 px-4 text-center sm:px-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-text-primary">Ask ACHIEVION</h2>
                <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-text-secondary">Ask anything about your team, projects, risks or goals. Answers come with their sources.</p>
              </div>
              <ul className="grid w-full grid-cols-1 gap-2.5 min-[560px]:grid-cols-2 lg:grid-cols-3">
                {SUGGESTIONS.map(({ icon: Icon, label, text }) => (
                  <li key={text}>
                    <button type="button" onClick={() => send(text)} className="flex h-full w-full flex-col gap-1.5 rounded-xl border border-border-subtle bg-white p-3.5 text-left transition-colors hover:border-accent/40 hover:bg-accent-tint/50">
                      <span className="flex items-center gap-2 text-xs font-bold text-accent-text"><Icon size={13} aria-hidden="true" />{label}</span>
                      <span className="text-sm leading-snug text-text-primary">{text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-2">
              {messages.map((m, i) => <Message key={`${activeId}-${i}`} msg={m} />)}
              {loading && <Typing />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border-subtle bg-bg-surface px-4 py-3 sm:px-8">
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="field mx-auto flex max-w-3xl items-end gap-3 rounded-2xl border border-border-subtle bg-white px-4 py-2.5">
            <textarea ref={inputRef} name="question" autoComplete="off" aria-label="Ask a question" placeholder="Ask about projects, risks, people or goals…" value={input} rows={1} disabled={loading} maxLength={1000}
              onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              className="max-h-36 min-w-0 flex-1 resize-none bg-transparent py-1 text-sm leading-relaxed text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:opacity-60" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send question" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white disabled:opacity-35">
              {loading ? <RefreshCw size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
            </button>
          </form>
          <p className="mx-auto mt-1.5 max-w-3xl text-center text-xs text-text-secondary">Shift + Enter for a new line.</p>
        </div>
      </div>

      {panelOpen && (
        <motion.aside id="ai-recent" aria-label="Recent chats" initial={reduce ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}
          className="absolute inset-y-0 right-0 z-10 flex w-full max-w-[20rem] shrink-0 flex-col border-l border-border-subtle bg-bg-surface shadow-[-8px_0_24px_-12px_rgba(20,32,61,0.25)] lg:static lg:z-auto lg:w-72 lg:max-w-none lg:shadow-none">
          <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-3">
            <h2 className="flex items-center gap-2 text-sm font-black text-text-primary"><History size={15} aria-hidden="true" /> Recent chats</h2>
            <span className="flex items-center gap-1">
              <button type="button" onClick={newChat} className="inline-flex h-9 items-center gap-1 rounded-lg bg-accent px-3 text-[13px] font-bold text-white"><Plus size={14} aria-hidden="true" /> New chat</button>
              <button type="button" onClick={() => setPanelOpen(false)} aria-label="Fold the recent chats away" className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-muted lg:hidden"><X size={16} aria-hidden="true" /></button>
            </span>
          </div>
          {chats.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-secondary">No chats yet. Ask your first question and it is saved here.</p>
          ) : (
            <ul className="flex-1 overflow-y-auto p-2">
              {chats.map((c) => {
                const on = activeId === c.id, editing = renaming?.id === c.id;
                return (
                  <li key={c.id} className={`group rounded-xl ${on ? "bg-accent-tint" : "hover:bg-bg-muted"}`}>
                    {editing ? (
                      <form onSubmit={(e) => { e.preventDefault(); commitRename(); }} className="flex items-center gap-1 p-2">
                        <input autoFocus aria-label="Chat name" name="chatName" autoComplete="off" value={renaming.value} maxLength={60} onChange={(e) => setRenaming({ id: c.id, value: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setRenaming(null); } }} className="h-9 min-w-0 flex-1 rounded-lg border border-border-subtle bg-white px-2 text-sm text-text-primary" />
                        <button type="submit" aria-label="Save the name" className="flex h-9 w-9 items-center justify-center rounded-lg text-accent-text hover:bg-white"><Check size={15} aria-hidden="true" /></button>
                        <button type="button" onClick={() => setRenaming(null)} aria-label="Cancel renaming" className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-white"><X size={15} aria-hidden="true" /></button>
                      </form>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openChat(c)} aria-current={on ? "true" : undefined} title={titles[c.id]} className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-left">
                          <span className={`block truncate text-sm text-text-primary ${on ? "font-bold" : "font-semibold"}`}>{titles[c.id]}</span>
                          <span className="block text-xs text-text-secondary">{whenText(c.updatedAt ?? c.createdAt)}</span>
                        </button>
                        <span className="flex shrink-0 items-center pr-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:focus-within:opacity-100 sm:group-hover:opacity-100">
                          <button type="button" onClick={() => setRenaming({ id: c.id, value: titles[c.id] })} aria-label={`Rename "${titles[c.id]}"`} className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-white hover:text-text-primary"><Pencil size={14} aria-hidden="true" /></button>
                          <button type="button" onClick={() => setDeleting(c)} aria-label={`Delete "${titles[c.id]}"`} className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-white hover:text-[#B01F17]"><Trash2 size={14} aria-hidden="true" /></button>
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-border-subtle px-4 py-2.5 text-xs leading-snug text-text-secondary">Chats are kept in this browser, for you only.</p>
        </motion.aside>
      )}

      <ConfirmModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} destructive confirmLabel="Delete chat"
        title="Delete this chat?" body={deleting ? `"${titles[deleting.id]}" and its messages are removed from this browser. This cannot be undone.` : ""} />
    </div>
  );
}
