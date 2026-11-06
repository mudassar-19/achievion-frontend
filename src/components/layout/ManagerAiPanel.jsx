// Manager AI Assistant (M-7, UX §2): the Director's AiPanel with Manager data. Read-only Q&A over a server-built
// snapshot of the Manager's org; context chip (auto from the page, can be changed), suggested prompts, proactive
// cards from numbers, "AI-generated" tag + thumbs on every answer, Sources chips, New chat + History.
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { History, Plus, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import AiPanel from "./AiPanel";
import { AiTag, AiFeedback } from "@/components/ui/AiParts";
import { aiError } from "@/components/ui/aiCall";

const ACCENT = "var(--accent)";
const time = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const day = (d) => new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });

function Card({ children, to, action }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-accent/20 bg-white px-3 py-2.5 text-xs text-text-primary">
      {children}
      {to && <Link to={to} className="inline-flex min-h-8 items-center gap-1 self-start font-bold text-accent-text underline-offset-2 hover:underline">{action}<ArrowRight size={11} aria-hidden="true" /></Link>}
    </div>
  );
}

// T-6 (D-149): the Team Lead's task planner is this panel with their own API and words.
export default function ManagerAiPanel({ open, onClose, topOffset, base = "/api/manager", feature = "mgr_chat",
  welcome = "Ask about your projects, sprints and team load. I only read the numbers and suggest; I can't change anything.",
  placeholder = "Ask about projects, sprints, team load…" }) {
  const { pathname, search } = useLocation();
  const [ctx, setCtx] = useState(null);          // GET /ai/context
  const [failed, setFailed] = useState(false);
  const [pick, setPick] = useState(null);         // chip choice that overrides the page
  const [chatId, setChatId] = useState(null);
  const [reset, setReset] = useState({ key: 0, messages: [] });
  const [usage, setUsage] = useState(null);
  const [history, setHistory] = useState(null);   // null = closed, [] = list

  const load = useCallback(async () => {
    setFailed(false);
    const q = pick ? new URLSearchParams({ kind: pick.kind, ...(pick.id && { id: pick.id }), ...(pick.query && { query: pick.query }) }) : new URLSearchParams({ path: pathname, search });
    try { const d = await api.get(`${base}/ai/context?${q}`, { silent: true }); setCtx(d); setUsage(d.usage); }
    catch { setFailed(true); }
  }, [pathname, search, pick, base]);
  useEffect(() => { if (open) load(); }, [open, load]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { setPick(null); }, [pathname]); // eslint-disable-line react-hooks/set-state-in-effect

  const context = ctx?.context;
  const ask = useCallback(async (message) => {
    const body = { chatId, message, context: pick ?? { kind: "path", path: pathname, search } };
    try {
      const r = await api.post(`${base}/ai/chat`, body, { silent: true });
      setChatId(r.chatId); setUsage(r.usage);
      return { text: r.message.text, id: r.message.id, sources: r.message.sources };
    } catch (e) {
      const s = aiError(e);
      if (s.status === "off") setCtx((c) => (c ? { ...c, configured: false } : c));
      if (s.status === "limit") setUsage(s.usage);
      throw Object.assign(new Error(s.message), { retry: s.status === "error" });
    }
  }, [chatId, pick, pathname, search, base]);

  function newChat() { setChatId(null); setHistory(null); setReset((r) => ({ key: r.key + 1, messages: [] })); }
  async function openHistory() {
    if (history) return setHistory(null);
    try { setHistory((await api.get(`${base}/ai/chats`, { silent: true })).chats); } catch { setHistory([]); }
  }
  async function openChat(id) {
    try {
      const c = await api.get(`${base}/ai/chats/${id}`, { silent: true });
      setChatId(c.id); setHistory(null);
      setReset((r) => ({ key: r.key + 1, messages: c.messages.map((m) => ({ id: m.id, role: m.role, text: m.text, sources: m.sources })) }));
    } catch { setHistory(null); }
  }

  const limitHit = usage && usage.remaining === 0;
  const iconBtn = "flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-ink/[0.06] hover:text-text-primary";

  const chip = context && (
    <label className="relative min-w-0 flex-1">
      <span className="sr-only">Context for the AI</span>
      <select value={pick ? JSON.stringify(pick) : ""} title={context.label}
        onChange={(e) => setPick(e.target.value ? JSON.parse(e.target.value) : null)}
        className="w-full max-w-[160px] cursor-pointer truncate rounded-full border border-accent/20 bg-accent/[0.08] py-0.5 pl-2 pr-5 text-[11px] font-semibold text-accent-text">
        <option value="">{pick ? "This page" : context.label}</option>
        {(ctx.choices ?? []).filter((c) => !(c.kind === context.kind && (c.id ?? null) === (context.id ?? null) && !pick)).map((c) => (
          <option key={`${c.kind}-${c.id ?? c.query ?? ""}`} value={JSON.stringify({ kind: c.kind, ...(c.id && { id: c.id }), ...(c.query && { query: c.query }) })}>{c.label}</option>
        ))}
      </select>
    </label>
  );

  const top = (
    <>
      {history && (
        <section aria-label="Past chats" className="flex flex-col gap-1 rounded-xl border border-ink/[0.08] bg-white p-2">
          <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Past chats</p>
          {history.length ? history.map((c) => (
            <button key={c.id} type="button" onClick={() => openChat(c.id)} className="flex min-h-9 items-center justify-between gap-2 rounded-lg px-2 text-left text-xs hover:bg-ink/[0.04]">
              <span className="min-w-0 truncate font-semibold text-text-primary">{c.title}</span><span className="shrink-0 text-slate-500">{day(c.updatedAt)}</span>
            </button>
          )) : <p className="px-1 py-2 text-xs text-text-secondary">No past chats yet.</p>}
        </section>
      )}
      {!history && ctx?.insight && (
        <Card to={ctx.insight.target?.to} action={ctx.insight.target?.label}>
          <span className="flex items-center justify-between gap-2"><span className="font-bold">{ctx.insight.title}</span><AiTag /></span>
          <span className="text-text-secondary">{ctx.insight.body}</span>
        </Card>
      )}
      {!history && (ctx?.cards ?? []).map((c) => <Card key={c.key} to={c.to} action={c.action}><span>{c.text}</span></Card>)}
      {failed && <p role="alert" className="text-xs text-text-secondary">Suggestions could not be loaded. <button type="button" onClick={load} className="font-bold text-accent-text underline">Retry</button></p>}
      {usage && (
        <p className="text-[11px] text-slate-500" role="status">
          {limitHit ? `Daily limit reached (${usage.limit}). Resets at ${time(usage.resetsAt)}.` : `${usage.remaining} of ${usage.limit} AI requests left today.`}
        </p>
      )}
    </>
  );

  const renderMeta = (m) => m.id && (
    <div className="flex max-w-[280px] flex-wrap items-center gap-1.5 pl-1">
      <AiTag />
      {(m.sources ?? []).map((s) => (
        <Link key={s.key} to={s.to} className="inline-flex min-h-7 items-center rounded-full border border-ink/[0.1] bg-white px-2 text-[11px] font-semibold text-text-secondary hover:text-text-primary">{s.label}</Link>
      ))}
      <AiFeedback feature={feature} refId={m.id} snippet={m.text} base={base} />
    </div>
  );

  return (
    <AiPanel open={open} onClose={onClose} topOffset={topOffset} accent={ACCENT}
      configured={ctx ? ctx.configured : failed ? true : null}
      offMessage="AI is not configured on this server. The rest of the portal works as usual."
      chip={chip}
      headerActions={<>
        <button type="button" className={iconBtn} onClick={newChat} aria-label="New chat" title="New chat"><Plus size={14} aria-hidden="true" /></button>
        <button type="button" className={iconBtn} onClick={openHistory} aria-label="Chat history" aria-expanded={!!history} title="History"><History size={14} aria-hidden="true" /></button>
      </>}
      top={top}
      quickPrompts={ctx?.prompts ?? []}
      welcome={welcome}
      placeholder={placeholder}
      footer="AI can make mistakes. Check the sources."
      onAsk={ask} renderMeta={renderMeta}
      resetKey={reset.key} initialMessages={reset.messages}
      inputDisabled={!!limitHit} />
  );
}
