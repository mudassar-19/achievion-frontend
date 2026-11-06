import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, RefreshCw, BookOpen,
  Plus, Trash2, ChevronRight, Database,
  BarChart2, Users, AlertTriangle, Target, Layers, Zap,
} from "lucide-react";
import Tally from "@/components/ui/Tally";
import api from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function relDate(iso) {
  const d = new Date(iso), now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Inline markdown renderer ──────────────────────────────────────────────────
function InlineMd({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
        if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function MarkdownText({ text }) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter(Boolean);
        const isList = lines.some((l) => /^[•\*\-]\s/.test(l) || /^\d+\.\s/.test(l));
        if (isList) {
          return (
            <ul key={bi} className="space-y-1.5">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  <span><InlineMd text={l.replace(/^[•\*\-\d]+[.)]\s*/, "")} /></span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={bi}><InlineMd text={block} /></p>;
      })}
    </div>
  );
}

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = "achievion-ai-chats";
function loadChats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveChats(chats) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.slice(0, 40))); } catch {}
}

// ── Suggestion cards ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: AlertTriangle, label: "Risk",        color: "#f59e0b", text: "What are the top risks in our organisation right now?" },
  { icon: Layers,        label: "Projects",    color: "#6366f1", text: "Which projects are at risk of missing their deadline?" },
  { icon: Users,         label: "Team",        color: "#10b981", text: "How is team performance looking this month?" },
  { icon: BarChart2,     label: "Highlights",  color: "#8b5cf6", text: "Summarise this week's organisational highlights" },
  { icon: Target,        label: "Goals",       color: "#ec4899", text: "Which goals are behind target this quarter?" },
  { icon: Zap,           label: "Actions",     color: "#f97316", text: "What should I focus on as Director this week?" },
];

// ── Message component ─────────────────────────────────────────────────────────
function Message({ msg, index }) {
  const [showCitations, setShowCitations] = useState(false);
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
    >
      {isUser ? (
        <div className="flex justify-end px-6 md:px-16">
          <div
            className="max-w-[68%] rounded-2xl rounded-br-none px-4 py-3 text-sm text-white leading-relaxed"
            style={{
              background: "linear-gradient(135deg,#4c1d95,#6d28d9)",
              boxShadow: "0 4px 16px rgba(109,40,217,0.3)",
            }}
          >
            {msg.text}
          </div>
        </div>
      ) : (
        <div className="flex gap-3 px-6 md:px-16">
          <div className="shrink-0 mt-0.5">
            <Tally pose={msg.error ? "alert" : "idle"} size={28} />
          </div>
          <div className="flex-1 min-w-0 max-w-[80%]">
            {msg.error ? (
              <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                {msg.text}
              </div>
            ) : (
              <>
                <div
                  className="text-sm text-slate-700 leading-relaxed rounded-2xl rounded-bl-none px-4 py-3"
                  style={{
                    background: "white",
                    boxShadow: "0 2px 12px rgba(109,40,217,0.08), 0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <MarkdownText text={msg.text} />
                </div>
                {msg.citations?.length > 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setShowCitations((v) => !v)}
                      className="flex items-center gap-1.5 text-[11px] text-violet-400 hover:text-violet-600 transition-colors"
                    >
                      <BookOpen size={10} />
                      {showCitations ? "Hide" : "Show"} {msg.citations.length} source{msg.citations.length > 1 ? "s" : ""}
                      <ChevronRight size={9} className={`transition-transform ${showCitations ? "rotate-90" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {showCitations && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-1.5 flex flex-col gap-1 pl-2 border-l-2 border-violet-100">
                            {msg.citations.map((c, i) => (
                              <p key={i} className="text-[10px] text-slate-400">
                                <span className="text-violet-500 font-medium">[{i + 1}]</span>{" "}
                                <span className="capitalize font-medium text-slate-500">{c.source}</span>
                                {c.text ? <span className="text-slate-300"> — {c.text.slice(0, 70)}</span> : ""}
                              </p>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 px-6 md:px-16"
    >
      <Tally pose="thinking" size={28} className="shrink-0 mt-0.5" />
      <div
        className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-none"
        style={{ background: "white", boxShadow: "0 2px 12px rgba(109,40,217,0.08)" }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-violet-300 animate-bounce"
            style={{ animationDelay: `${i * 140}ms` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AskAchievionPage() {
  const [chats,        setChats]        = useState(() => loadChats());
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [reindexing,   setReindexing]   = useState(false);
  const [reindexMsg,   setReindexMsg]   = useState(null);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [activeChatId, loading]);

  function persistMessages(msgs, chatId, title) {
    setChats((prev) => {
      const next = [...prev];
      const idx  = next.findIndex((c) => c.id === chatId);
      const entry = {
        id: chatId, title,
        messages: msgs.filter((m) => !m.loading),
        createdAt: next[idx]?.createdAt ?? new Date().toISOString(),
      };
      if (idx >= 0) next[idx] = entry; else next.unshift(entry);
      saveChats(next);
      return next;
    });
  }

  const send = useCallback(async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }

    const chatId = activeChatId ?? uid();
    if (!activeChatId) setActiveChatId(chatId);

    const title   = q.slice(0, 50) + (q.length > 50 ? "…" : "");
    const userMsg = { role: "user", text: q };
    const newMsgs = [...messages, userMsg];
    setMessages([...newMsgs, { role: "ai", loading: true }]);
    persistMessages(newMsgs, chatId, chats.find((c) => c.id === chatId)?.title ?? title);

    setLoading(true);
    try {
      // Send last 6 non-loading messages as history
      const history = messages
        .filter((m) => !m.loading && !m.error)
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await api.post("/api/director/ai/ask", { question: q, history });

      const aiMsg = res.notEnoughData
        ? { role: "ai", text: "The knowledge index is empty. Click 'Refresh knowledge index' in the sidebar to index your org data.", citations: [] }
        : { role: "ai", text: res.answer, citations: res.citations ?? [] };

      const finalMsgs = [...newMsgs, aiMsg];
      setMessages(finalMsgs);
      persistMessages(finalMsgs, chatId, title);
    } catch (err) {
      const errMsg = { role: "ai", error: true, text: err?.message ?? "Something went wrong. Please try again." };
      const finalMsgs = [...newMsgs, errMsg];
      setMessages(finalMsgs);
      persistMessages(finalMsgs, chatId, title);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, activeChatId, chats]);

  function newChat() {
    setActiveChatId(null);
    setMessages([]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setTimeout(() => inputRef.current?.focus(), 60);
  }

  function openChat(chat) {
    setActiveChatId(chat.id);
    setMessages(chat.messages ?? []);
    setInput("");
  }

  function deleteChat(e, chatId) {
    e.stopPropagation();
    setChats((prev) => { const n = prev.filter((c) => c.id !== chatId); saveChats(n); return n; });
    if (activeChatId === chatId) newChat();
  }

  async function reindex() {
    setReindexing(true); setReindexMsg(null);
    try {
      const r = await api.post("/api/director/ai/reindex");
      setReindexMsg({ ok: true, count: r.indexed ?? 0 });
    } catch {
      setReindexMsg({ ok: false });
    } finally {
      setReindexing(false);
    }
  }

  const hasMessages = messages.some((m) => !m.loading);
  const displayMessages = messages.filter((m, i) => !m.loading || i === messages.length - 1);

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#f8f7ff" }}>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside
        className="w-64 shrink-0 flex flex-col h-full overflow-hidden"
        style={{
          background: "linear-gradient(180deg,#1e1040 0%,#2d1670 60%,#3b1a8a 100%)",
          borderRight: "1px solid rgba(139,92,246,0.2)",
        }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-3 mb-4 px-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(139,92,246,0.3)", border: "1px solid rgba(139,92,246,0.4)" }}
            >
              <Sparkles size={14} className="text-violet-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-wider uppercase">Ask ACHIEVION</p>
              <p className="text-[10px] text-violet-400/70 font-medium">AI Director Assistant</p>
            </div>
          </div>
          <button
            type="button"
            onClick={newChat}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97]"
            style={{
              background: "rgba(139,92,246,0.25)",
              border: "1px solid rgba(139,92,246,0.4)",
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            New chat
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-3 pb-2" style={{ scrollbarWidth: "none" }}>
          {chats.length === 0 ? (
            <p className="text-xs text-violet-400/40 text-center mt-6 px-3 leading-relaxed">
              No chats yet.<br />Ask your first question.
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => openChat(chat)}
                  className="group w-full text-left rounded-xl px-3 py-2.5 transition-all relative"
                  style={activeChatId === chat.id
                    ? { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.35)" }
                    : { border: "1px solid transparent" }}
                >
                  <p className="text-[12px] font-medium text-violet-100/75 truncate pr-5 group-hover:text-white/90 transition-colors">{chat.title}</p>
                  <p className="text-[10px] text-violet-400/40 mt-0.5 font-medium">{relDate(chat.createdAt)}</p>
                  <button
                    type="button"
                    onClick={(e) => deleteChat(e, chat.id)}
                    aria-label="Delete chat"
                    className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity text-violet-300 hover:text-rose-400"
                  >
                    <Trash2 size={10} />
                  </button>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer — reindex */}
        <div className="shrink-0 px-3 py-3.5" style={{ borderTop: "1px solid rgba(139,92,246,0.15)" }}>
          <button
            type="button"
            onClick={reindex}
            disabled={reindexing}
            className="w-full flex items-center gap-2 text-[11px] font-medium py-2 px-2.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: reindexMsg?.ok === false ? "#f87171" : reindexMsg?.ok ? "#34d399" : "rgba(167,139,250,0.6)" }}
          >
            {reindexing
              ? <RefreshCw size={11} className="animate-spin shrink-0" />
              : <Database size={11} className="shrink-0" />}
            {reindexing ? "Refreshing…"
              : reindexMsg?.ok === true ? `✓ ${reindexMsg.count} docs indexed`
              : reindexMsg?.ok === false ? "Reindex failed — retry?"
              : "Refresh knowledge index"}
          </button>
        </div>
      </aside>

      {/* ── Chat area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-8 flex flex-col gap-5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(139,92,246,0.2) transparent" }}>

          {!hasMessages ? (
            /* ── Welcome ── */
            <div className="flex flex-col items-center justify-center flex-1 px-8 gap-8">
              {/* Hero */}
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-full opacity-20 blur-3xl"
                    style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)", transform: "scale(2)" }}
                  />
                  <div
                    className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "white",
                      boxShadow: "0 8px 32px rgba(109,40,217,0.2), 0 2px 8px rgba(0,0,0,0.08)",
                    }}
                  >
                    <Tally pose="idle" size={44} />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">Ask ACHIEVION</h1>
                  <p className="text-sm text-slate-500 mt-1.5 max-w-xs leading-relaxed">
                    Your AI director analyst — ask anything about your team, projects, risks, or goals.
                  </p>
                </div>
              </div>

              {/* Suggestion grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 w-full max-w-2xl">
                {SUGGESTIONS.map(({ icon: Icon, label, color, text }) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => send(text)}
                    className="group text-left rounded-xl p-3.5 transition-all hover:scale-[1.02] active:scale-[0.98] bg-white"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                        <Icon size={12} style={{ color }} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
                    </div>
                    <p className="text-[12px] text-slate-500 leading-snug group-hover:text-slate-700 transition-colors">{text}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Messages ── */
            <div className="flex flex-col gap-5 pb-2">
              {displayMessages.map((msg, i) =>
                msg.loading ? (
                  <TypingIndicator key="loading" />
                ) : (
                  <Message key={`${activeChatId}-${i}`} msg={msg} index={i} />
                )
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ── */}
        <div
          className="shrink-0 px-6 md:px-16 py-4"
          style={{ background: "rgba(248,247,255,0.95)", borderTop: "1px solid rgba(139,92,246,0.12)" }}
        >
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-end gap-3 rounded-2xl px-4 py-3 bg-white"
            style={{
              border: "1.5px solid rgba(109,40,217,0.2)",
              boxShadow: "0 4px 20px rgba(109,40,217,0.08)",
            }}
          >
            <textarea
              ref={(el) => { inputRef.current = el; textareaRef.current = el; }}
              aria-label="Ask a question"
              placeholder="Ask about projects, risks, team performance, goals…"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={loading}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 leading-relaxed"
              style={{ maxHeight: 140 }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#4c1d95,#6d28d9)",
                boxShadow: "0 3px 10px rgba(109,40,217,0.35)",
              }}
            >
              {loading
                ? <RefreshCw size={14} className="animate-spin text-white" />
                : <Send size={14} className="text-white" />}
            </button>
          </form>
          <p className="text-center text-[11px] text-slate-400 mt-2 font-medium">
            AI sirf suggest karta hai · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
