// AI assistant for Developers, Designers and Testers at /workspace/ai (Batch 4: E14 chat + /tasks /xp, E15 personas + tips;
// FR08-01/03, UC-15). The AI only suggests. /tasks and /xp are answered from the person's own data without an AI call,
// so they keep working when the AI is off. ?persona=expert picks CodeMentor / PixelCritic / BugHunter.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Lightbulb, MessageSquare, Plus, RefreshCw, Send, Sparkles } from "lucide-react";
import api from "@/lib/api";
import useAuthStore from "@/stores/authStore";
import { employeeKind } from "@/utils/employeePortal";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import Tally from "@/components/ui/Tally";
import { AiTag } from "@/components/ui/AiParts";
import { aiError } from "@/components/ui/aiCall";
import { BTN } from "@/components/ui/buttons";
import useLoad from "../manager/project/useLoad";

const SUB = {
  developer: "Ask about your tasks, your XP, or how to get your code ready for review.",
  designer: "Ask about your tasks, your XP, or how to get a design ready for handoff.",
  tester: "Ask about your tasks, your XP, or how to inspect and report better.",
};
const MAX = 500;
const CHIP = "inline-flex min-h-9 items-center rounded-xl border border-border-subtle bg-bg-surface px-3 text-left text-xs font-semibold text-text-primary transition-colors hover:bg-bg-muted disabled:opacity-40";

// "- " lines become a list; everything else a paragraph. No HTML from the server is ever rendered.
function Text({ text }) {
  const blocks = [];
  for (const raw of String(text ?? "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^[-•]\s+/.test(line);
    const last = blocks.at(-1);
    if (bullet && last?.list) last.list.push(line.replace(/^[-•]\s+/, ""));
    else blocks.push(bullet ? { list: [line.replace(/^[-•]\s+/, "")] } : { p: line });
  }
  return blocks.map((b, i) => (b.list
    ? <ul key={i} className="flex list-disc flex-col gap-1 pl-5 marker:text-accent-text">{b.list.map((l, j) => <li key={j}>{l}</li>)}</ul>
    : <p key={i}>{b.p}</p>));
}

function Message({ m }) {
  const mine = m.role === "user";
  return (
    <li className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
      <div className={`flex max-w-[min(100%,36rem)] flex-col gap-2 rounded-2xl px-4 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] ${mine ? "rounded-br-md bg-accent text-accent-on" : "rounded-bl-md border border-ink/[0.08] bg-bg-surface text-text-primary"}`}>
        <Text text={m.text} />
        {m.sources?.length > 0 && <p className="flex flex-wrap gap-x-3 text-xs">{m.sources.map((s) => <Link key={s.to} to={s.to} className="font-bold text-accent-text underline underline-offset-2">Open {s.label}</Link>)}</p>}
      </div>
      {!mine && <p className="flex items-center gap-2 pl-1 text-[11px] text-text-secondary">{m.persona === "Command" ? "From your own data" : <>{m.persona}<AiTag /></>}</p>}
    </li>
  );
}

function Tips({ persona, configured, onUsage }) {
  const [state, setState] = useState({ status: "loading" });
  const load = useCallback(async (refresh) => {
    setState({ status: "loading" });
    try { const d = await api.get(`/api/workspace/ai/tips?persona=${persona.id}${refresh ? "&refresh=1" : ""}`, { silent: true }); setState({ status: "done", d }); if (d.usage) onUsage(d.usage); }
    catch (e) { setState(aiError(e)); }
  }, [persona.id, onUsage]);
  useEffect(() => { if (configured) load(false); }, [configured, load]); // eslint-disable-line react-hooks/set-state-in-effect
  return (
    <Panel title={`Tips from ${persona.name}`} icon={Lightbulb}>
      <div className="flex flex-col gap-3 px-5 py-4 text-sm">
        {!configured ? <p className="text-text-secondary">Tips need the AI, which is not configured on this server. Your tasks and XP work as usual.</p>
          : state.status === "loading" ? <div aria-busy="true" aria-label="Loading tips" className="flex flex-col gap-2"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-12 rounded-xl" /></div>
          : state.status !== "done" ? <p role="alert" className="text-text-secondary">{state.message} {state.status === "error" && <button type="button" className="font-bold text-accent-text underline underline-offset-2" onClick={() => load(false)}>Retry</button>}</p>
          : (<>
            <ol className="flex flex-col divide-y divide-ink/[0.06]">{state.d.tips.map((t, i) => (
              <li key={i} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                <span aria-hidden="true" className="mt-0.5 w-4 shrink-0 text-xs font-black tabular-nums text-accent-text">{i + 1}</span>
                <span className="min-w-0 [overflow-wrap:anywhere]"><strong className="block text-text-primary">{t.title}</strong><span className="text-text-secondary">{t.tip}</span></span>
              </li>))}</ol>
            <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
              {state.d.aiGenerated ? <AiTag /> : <span>{state.d.note ?? "From your numbers."}</span>}
              <button type="button" className={`${BTN.ghost} -mr-2 h-8 px-2 text-xs`} onClick={() => load(true)}><RefreshCw size={12} aria-hidden="true" />New tips</button>
            </p>
          </>)}
      </div>
    </Panel>
  );
}

export default function EmployeeAiPage() {
  const user = useAuthStore((s) => s.user);
  const kind = employeeKind(user?.role) ?? "developer";
  const [sp, setSp] = useSearchParams();
  const { data: st, error, reload } = useLoad("/api/workspace/ai/status");
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [usage, setUsage] = useState(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(null); // null | "command" | "ai"
  const [fail, setFail] = useState(null); // { message, retry }
  const listRef = useRef(null);

  useEffect(() => { if (st) { setMessages(st.chat?.messages ?? []); setChatId(st.chat?.chatId ?? null); setUsage(st.usage); } }, [st]); // eslint-disable-line react-hooks/set-state-in-effect
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, busy, st]); // only the conversation scrolls, never the page

  const header = <PageHeader title="AI assistant" subtitle={SUB[kind]} />;
  if (error) return <Page>{header}<ErrorState message={error} onRetry={reload} /></Page>;
  if (!st) return <Page>{header}<div aria-busy="true" aria-label="Loading the assistant" className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-[480px] rounded-2xl lg:col-span-2" /><Skeleton className="h-72 rounded-2xl" /></div></Page>;

  const persona = st.personas.find((p) => p.id === sp.get("persona")) ?? st.personas[0];
  const pick = (id) => { const n = new URLSearchParams(sp); if (id === st.personas[0].id) n.delete("persona"); else n.set("persona", id); setSp(n, { replace: true }); };
  const left = usage?.remaining ?? 0;

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput(""); setFail(null); setBusy(q.startsWith("/") ? "command" : "ai");
    setMessages((m) => [...m, { id: `me-${Date.now()}`, role: "user", text: q }]);
    try {
      const r = await api.post("/api/workspace/ai/chat", { message: q, persona: persona.id, ...(chatId && { chatId }) }, { silent: true });
      setChatId(r.chatId); setUsage(r.usage);
      setMessages((m) => [...m, r.message]);
    } catch (e) {
      const a = aiError(e);
      if (a.usage) setUsage(a.usage);
      setFail({ message: a.message, retry: a.status === "error" ? q : null });
    } finally { setBusy(null); }
  }
  const newChat = () => { setMessages([]); setChatId(null); setFail(null); };
  const isCommand = input.trim().startsWith("/");
  const canSend = !!input.trim() && !busy && (isCommand || (st.configured && left > 0));

  return (
    <Page>
      {header}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Panel title="Chat" icon={MessageSquare} className="min-w-0 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.05] px-5 py-3">
            <div role="radiogroup" aria-label="Who answers" className="flex max-w-full rounded-xl border border-ink/[0.08] bg-ink/[0.03] p-0.5">
              {st.personas.map((p) => <button key={p.id} type="button" role="radio" aria-checked={persona.id === p.id} onClick={() => pick(p.id)}
                className={`min-h-9 min-w-0 truncate rounded-[10px] px-3 text-xs font-bold ${persona.id === p.id ? "bg-bg-surface text-accent-text shadow-[0_1px_2px_rgba(20,32,61,0.08)]" : "text-text-secondary hover:text-text-primary"}`}>{p.name}</button>)}
            </div>
            <button type="button" className={`${BTN.ghost} h-9 px-2 text-xs`} onClick={newChat} disabled={!messages.length || !!busy}><Plus size={13} aria-hidden="true" />New chat</button>
          </div>

          {!st.configured && <p role="status" className="flex items-start gap-2 border-b border-ink/[0.05] bg-ink/[0.02] px-5 py-3 text-sm text-text-secondary"><Sparkles size={14} aria-hidden="true" className="mt-0.5 shrink-0" />AI is not configured on this server. The commands /tasks and /xp still work, and so does everything else.</p>}

          <ol ref={listRef} aria-live="polite" aria-label="Conversation" className="flex h-[min(56vh,520px)] flex-col gap-3 overflow-y-auto overscroll-contain px-5 py-4">
            {!messages.length && (
              <li className="m-auto flex max-w-sm flex-col items-center gap-3 py-6 text-center">
                <Tally pose="idle" size={64} />
                <p className="text-sm font-bold text-text-primary">{persona.name}</p>
                <p className="text-sm text-text-secondary">{persona.blurb} It reads only your own tasks and numbers, and it only suggests: you decide.</p>
              </li>
            )}
            {messages.map((m) => <Message key={m.id} m={m} />)}
            {busy && <li role="status" className="flex items-center gap-2 text-xs text-text-secondary"><RefreshCw size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />{busy === "command" ? "Reading your data…" : `${persona.name} is thinking…`}</li>}
            {fail && <li role="alert" className="self-start rounded-2xl rounded-bl-md border border-[#B01F17]/25 bg-[#B01F17]/[0.04] px-4 py-2.5 text-sm text-text-primary">{fail.message}{fail.retry && <button type="button" className="ml-2 font-bold text-accent-text underline underline-offset-2" onClick={() => send(fail.retry)}>Retry</button>}</li>}
          </ol>

          <div className="flex flex-col gap-3 border-t border-ink/[0.05] px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {st.commands.map((c) => <button key={c.command} type="button" className={CHIP} disabled={!!busy} onClick={() => send(c.command)}><code className="mr-1.5 font-mono font-bold text-accent-text">{c.command}</code>{c.label}</button>)}
              {st.prompts.map((q) => <button key={q} type="button" className={CHIP} disabled={busy || !st.configured || !left} onClick={() => send(q)}>{q}</button>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Your question</span>
                <input type="text" name="ai-question" autoComplete="off" value={input} maxLength={MAX} onChange={(e) => setInput(e.target.value)} disabled={!!busy}
                  placeholder={st.configured ? `Ask ${persona.name}, or type /tasks or /xp` : "Type /tasks or /xp"}
                  className="h-11 w-full rounded-xl border border-border-subtle bg-bg-surface px-3.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] disabled:opacity-60" />
              </label>
              <button type="submit" className={`${BTN.primary} h-11`} disabled={!canSend}><Send size={14} aria-hidden="true" /><span className="hidden sm:inline">Send</span><span className="sr-only sm:hidden">Send</span></button>
            </form>
            <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-text-secondary">
              <span>The AI only suggests. It cannot change tasks, XP or scores.</span>
              {st.configured && <span className="tabular-nums">{left ? `${left} of ${usage.limit} AI requests left today` : `Today's ${usage?.limit} AI requests are used. Commands still work.`}{input.length > MAX - 80 && ` · ${MAX - input.length} characters left`}</span>}
            </p>
          </div>
        </Panel>

        <div className="flex min-w-0 flex-col gap-6">
          <Tips key={persona.id} persona={persona} configured={st.configured} onUsage={setUsage} />
        </div>
      </div>
    </Page>
  );
}
