import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, RefreshCw, ChevronRight, ExternalLink } from "lucide-react";
import Tally from "@/components/ui/Tally";
import Markdown, { SourceChips } from "@/components/ui/Markdown";
import api from "@/lib/api";
import useAuthStore from "@/stores/authStore";
import { loadChats, saveChats, upsertChat } from "@/lib/aiChats";

export const AI_W = 420;

// Director colours by default. Another portal passes accent="var(--accent)" and the tints follow its token.
const DIRECTOR = "#4B2FC4";
const tintOf = (accent) => (a) => (accent === DIRECTOR ? `rgba(75,47,196,${a})` : `rgb(var(--c-accent) / ${a})`);

// Quick prompts per page context
const QUICK = {
  Dashboard: ["What needs my attention this week?", "Any projects at risk of missing deadline?"],
  Projects:  ["Which projects are most delayed?", "Show me projects on hold or frozen"],
  Capacity:  ["Which teams are overloaded?", "Suggest a workload rebalancing action"],
  Risk:      ["What are the top risks right now?", "Are any risks approaching critical priority?"],
  Goals:     ["Which goals are behind target?", "Summarise org goals progress"],
  Reports:   ["What is the delivery rate this quarter?", "Key findings from recent recaps"],
  Org:       ["What are this week's highlights?", "Which projects need my attention?"],
};

function Bubble({ msg, accent = DIRECTOR, renderMeta, onRetry }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex min-w-0 max-w-full flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-full min-w-0 rounded-2xl px-3.5 py-2.5 text-sm break-words ${
          isUser
            ? "text-white rounded-br-sm leading-relaxed"
            : msg.error
            ? "border border-rose-300/60 bg-rose-50 text-rose-700 rounded-bl-sm leading-relaxed"
            : "border border-ink/[0.08] bg-white text-text-primary rounded-bl-sm"
        }`}
        style={isUser ? { background: accent } : {}}
      >
        {isUser || msg.error ? msg.text : (
          <Markdown text={msg.text} accent={accent} />
        )}
        {msg.error && msg.retry && onRetry && (
          <button type="button" onClick={() => onRetry(msg)} className="mt-2 flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-rose-800 underline underline-offset-2 hover:bg-rose-100">
            <RefreshCw size={11} aria-hidden="true" /> Retry
          </button>
        )}
      </div>
      {!isUser && !msg.error && renderMeta?.(msg)}
      {msg.citations?.length > 0 && <SourceChips citations={msg.citations} className="max-w-full pl-1" />}
    </div>
  );
}

function TypingBubble({ tint = tintOf(DIRECTOR) }) {
  return (
    <div className="flex items-center gap-2" role="status" aria-label="AI is writing">
      <Tally pose="thinking" size={28} />
      <div className="flex gap-1 px-3 py-2 rounded-2xl rounded-bl-sm border border-ink/[0.08] bg-white">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#4B2FC4]/40 animate-pulse motion-reduce:animate-none"
            style={{ animationDelay: `${i * 120}ms`, background: tint(0.4) }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Director AI panel. Other portals reuse it with optional props (all omitted = Director behaviour):
 * accent, chip (node instead of the context label), headerActions, top (node above the chat: cards, usage),
 * quickPrompts, welcome, placeholder, footer, configured (true/false/null instead of the Director status call),
 * offMessage, onAsk(q) → { text, ...extra } (throws { message, retry }), renderMeta(msg), resetKey + initialMessages
 * (load or clear a chat), inputDisabled.
 */
export default function AiPanel({
  open, onClose, topOffset = 60, context = "Org",
  accent = DIRECTOR, chip, headerActions, fullScreenPath, top, quickPrompts: quickOverride, welcome, placeholder, footer,
  configured: configuredProp, offMessage, onAsk, renderMeta, resetKey, initialMessages, inputDisabled = false,
}) {
  const tint = tintOf(accent);
  const external = configuredProp !== undefined;
  const [statusConfigured, setConfigured] = useState(null); // null=checking, true/false
  const configured = external ? configuredProp : statusConfigured;
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const streamRef  = useRef(null);
  const logRef     = useRef([]);    // this panel conversation as saved in the shared history
  const chatIdRef  = useRef(null);

  // Status check on open (Director); other portals pass `configured`
  useEffect(() => {
    if (!open || external) return;
    setConfigured(null);
    api.get("/api/director/ai/status")
      .then((d) => setConfigured(d.configured))
      .catch(() => setConfigured(false));
  }, [open, external]);

  // New chat / past chat loaded by the portal
  useEffect(() => {
    if (resetKey === undefined) return;
    clearInterval(streamRef.current);
    setMessages(initialMessages ?? []);
    setLoading(false);
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus input when configured
  useEffect(() => {
    if (configured && open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [configured, open]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Close on Esc; cancel streaming on close
  useEffect(() => {
    if (!open) { clearInterval(streamRef.current); return; }
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  const streamWords = useCallback((answer, extra = {}) => {
    clearInterval(streamRef.current);
    const words = answer.split(" ");
    let i = 0;
    // Push empty bubble first
    setMessages((prev) => [...prev, { role: "ai", text: "", ...extra }]);
    streamRef.current = setInterval(() => {
      i++;
      const visible = words.slice(0, i).join(" ");
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], text: visible };
        return next;
      });
      if (i >= words.length) clearInterval(streamRef.current);
    }, 30);
  }, []);

  const send = useCallback(async (text, { retrying = false } = {}) => {
    const q = text ?? input.trim();
    if (!q || loading || inputDisabled) return;
    setInput("");
    setMessages((prev) => [...(retrying ? prev.filter((m) => !(m.error && m.retry === q)) : prev), ...(retrying ? [] : [{ role: "user", text: q }])]);
    setLoading(true);
    if (onAsk) {
      try {
        const { text: answer, ...extra } = await onAsk(q);
        setLoading(false);
        streamWords(answer, extra);
      } catch (err) {
        setLoading(false);
        setMessages((prev) => [...prev, { role: "ai", error: true, text: err?.message ?? "Something went wrong.", retry: err?.retry ? q : undefined }]);
      }
      return;
    }
    // UI-E2 (item 30): the Director's questions go into the same history as the full Ask page (lib/aiChats.js).
    const uid = String(useAuthStore.getState().user?._id ?? useAuthStore.getState().user?.id ?? "");
    const record = (msg) => {
      logRef.current = [...logRef.current, msg];
      chatIdRef.current ??= `panel-${Date.now().toString(36)}`;
      saveChats(uid, upsertChat(loadChats(uid), { id: chatIdRef.current, firstQuestion: logRef.current[0]?.text ?? q, messages: logRef.current }));
    };
    record({ role: "user", text: q });
    try {
      const res = await api.post("/api/director/ai/ask", { question: q });
      setLoading(false);
      if (res.notEnoughData) {
        // QA2-66: the server indexes by itself; this only happens for an organisation with nothing in it yet.
        streamWords(res.answer);
        record({ role: "ai", text: res.answer, citations: [] });
      } else {
        streamWords(res.answer, { citations: res.citations ?? [] });
        record({ role: "ai", text: res.answer, citations: res.citations ?? [] });
      }
    } catch (err) {
      setLoading(false);
      setMessages((prev) => [...prev, {
        role: "ai", error: true,
        text: err?.message?.includes("503") || err?.message?.includes("not configured")
          ? "AI is not available right now."
          : (err?.message ?? "Something went wrong."),
      }]);
    }
  }, [input, loading, streamWords, onAsk, inputDisabled]);

  const onSubmit = (e) => { e.preventDefault(); send(); };
  const onQuick  = (q)  => send(q);

  const quickPrompts = quickOverride ?? QUICK[context] ?? QUICK.Org;

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="fixed z-[45] flex flex-col outline-none"
          style={{
            top: topOffset, right: 0, width: AI_W, bottom: 0, maxWidth: "100vw",
            background: "#FAFBFE",
            borderLeft: `1px solid ${tint(0.15)}`,
            boxShadow: `-4px 0 24px ${tint(0.07)}`,
          }}
          initial={{ x: AI_W + 8, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: AI_W + 8, opacity: 0 }}
          transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
          aria-label="AI Assistant"
          data-no-modal
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3.5 shrink-0"
            style={{ borderBottom: `1px solid ${tint(0.12)}` }}
          >
            <div className={`flex min-w-0 items-center gap-2 ${chip ? "flex-1 pr-1" : ""}`}>
              <Sparkles size={14} strokeWidth={2} style={{ color: accent }} aria-hidden="true" />
              <span className="shrink-0 text-sm font-bold" style={{ color: accent }}>AI Assistant</span>
              {chip ?? (
                <span
                  className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: tint(0.08),
                    border: `1px solid ${tint(0.18)}`,
                    color: accent,
                  }}
                >
                  {context}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {headerActions}
              {fullScreenPath && (
                <a
                  href={chatIdRef.current && !onAsk ? `${fullScreenPath}?chat=${chatIdRef.current}` : fullScreenPath}
                  title="Open full screen"
                  aria-label="Open AI full screen"
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-ink/[0.06] hover:text-text-primary transition-colors"
                >
                  <ExternalLink size={12} strokeWidth={2} />
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-ink/[0.06] hover:text-text-primary transition-colors"
                aria-label="Close AI panel"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Body */}
          {configured === null ? (
            /* Checking */
            <div className="flex-1 flex items-center justify-center" role="status" aria-label="Checking AI">
              <RefreshCw size={18} className="animate-spin" style={{ color: tint(0.4) }} />
            </div>
          ) : !configured ? (
            /* Not connected */
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
              <Tally pose="thinking" size={88} />
              <div className="text-center max-w-[240px]">
                <p className="text-sm font-bold text-text-primary">AI isn't connected</p>
                <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
                  {offMessage ?? "Add GROQ_API_KEY or OPENROUTER_API_KEY to server/.env to enable."}
                </p>
              </div>
            </div>
          ) : (
            /* Chat */
            <>
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 flex flex-col gap-3" aria-live="polite">
                {top}
                {/* Welcome + quick prompts */}
                {messages.length === 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-2.5">
                      <Tally pose="idle" size={32} />
                      <div className="rounded-2xl rounded-bl-sm border border-ink/[0.08] bg-white px-3.5 py-2.5 text-xs text-text-secondary leading-relaxed max-w-[240px]">
                        {welcome ?? "Hi! Ask me anything about your organization — projects, goals, risks, or reports."}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 pl-10">
                      {quickPrompts.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => onQuick(q)}
                          disabled={inputDisabled}
                          className="flex items-center gap-1.5 text-left text-xs text-[#4B2FC4] rounded-xl px-3 py-2 border border-[#4B2FC4]/20 bg-[#4B2FC4]/04 hover:bg-[#4B2FC4]/08 transition-colors disabled:opacity-50"
                          style={{ background: tint(0.03), color: accent, borderColor: tint(0.2) }}
                        >
                          <ChevronRight size={10} strokeWidth={2.5} aria-hidden="true" />
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message history */}
                {messages.map((msg, i) => <Bubble key={msg.id ?? i} msg={msg} accent={accent} renderMeta={renderMeta} onRetry={(m) => send(m.retry, { retrying: true })} />)}
                {loading && <TypingBubble tint={tint} />}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={onSubmit}
                className="px-4 py-3 shrink-0"
                style={{ borderTop: `1px solid ${tint(0.10)}` }}
              >
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{
                    background: tint(0.04),
                    border: `1px solid ${tint(0.15)}`,
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    aria-label="Ask AI a question"
                    name="ai-question"
                    autoComplete="off"
                    placeholder={placeholder ?? "Ask about projects, risks, goals…"}
                    value={input}
                    maxLength={1000}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading || inputDisabled}
                    className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={loading || inputDisabled || !input.trim()}
                    aria-label="Send"
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                    style={{ background: accent }}
                  >
                    {loading
                      ? <RefreshCw size={10} className="animate-spin text-white" />
                      : <Send size={10} strokeWidth={2.5} className="text-white" />}
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-slate-400">
                  {footer ?? "AI only suggests · Check sources before acting"}
                </p>
              </form>
            </>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
