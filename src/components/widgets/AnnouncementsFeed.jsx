// Announcements (items 79, 80): one read-only feed in every portal: project and Company announcements together. Director and Manager
// also get a box to post (with a confirmation first). Chat and communities stay on the Collaboration page.
import { useCallback, useEffect, useState } from "react";
import { Megaphone, Loader2 } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { BTN } from "@/components/ui/buttons";

const fmt = (d) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const MAX = 2000;

function Composer({ targets, onPosted }) {
  const addToast = useUiStore((s) => s.addToast);
  const [channelId, setChannelId] = useState(targets[0]?.channelId ?? "");
  const [text, setText] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const label = targets.find((t) => t.channelId === channelId)?.label ?? "";
  async function send() {
    setBusy(true);
    try { await api.post("/api/announcements", { channelId, content: text.trim() }); setText(""); setAsking(false); addToast({ type: "success", message: `Announcement sent to ${label}.` }); onPosted(); }
    catch (e) { addToast({ type: "error", message: e?.message ?? "The announcement was not sent." }); setAsking(false); }
    finally { setBusy(false); }
  }
  if (!targets.length) return null;
  return (
    <section aria-label="Post an announcement" className="glass-panel flex flex-col gap-3 rounded-2xl border border-ink/[0.07] p-4">
      <h2 className="text-sm font-black text-text-primary">Post an announcement</h2>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
        <label htmlFor="ann-target" className="text-xs font-bold text-text-primary">To</label>
        <select id="ann-target" value={channelId} onChange={(e) => setChannelId(e.target.value)} className="h-9 rounded-xl px-3 text-sm">
          {targets.map((t) => <option key={t.channelId} value={t.channelId}>{t.company ? `${t.label} (everyone)` : t.label}</option>)}
        </select>
      </div>
      <label htmlFor="ann-text" className="sr-only">Announcement</label>
      <textarea id="ann-text" rows={3} maxLength={MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder="What should everyone know?" className="w-full rounded-xl p-3 text-sm" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs tabular-nums text-text-secondary">{text.length}/{MAX}</span>
        <button type="button" className={BTN.primary} disabled={!text.trim() || busy} onClick={() => setAsking(true)}>{busy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}Post</button>
      </div>
      <ConfirmModal open={asking} onClose={() => setAsking(false)} onConfirm={send} loading={busy} title={`Send this to ${label}?`}
        body="Everyone in that group gets it in their bell and in Announcements. It cannot be unsent." confirmLabel="Send announcement" cancelLabel="Keep editing" />
    </section>
  );
}

export default function AnnouncementsFeed() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);
  const load = useCallback(() => { api.get("/api/announcements", { silent: true }).then((d) => { setData(d); setError(null); }).catch((e) => setError(e?.message ?? "Announcements could not be loaded.")); }, []);
  useEffect(load, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  const mark = (ids) => {
    setData((d) => { const items = d.items.map((i) => (!ids || ids.includes(i.id) ? { ...i, unread: false } : i)); return { ...d, items, unread: items.filter((i) => i.unread).length }; });
    api.post("/api/announcements/read", ids ? { ids } : {}, { silent: true }).catch(() => {});
  };
  const toggle = (a) => { setOpen((x) => (x === a.id ? null : a.id)); if (a.unread) mark([a.id]); };

  if (error) return <Page><ErrorState message={error} onRetry={load} /></Page>;
  return (
    <Page>
      <PageHeader title="Announcements" subtitle={data?.unread ? `${data.unread} unread` : "News from your Director, Manager and projects. Read only."}
        secondary={data?.unread ? { label: "Mark all as read", onClick: () => mark(null) } : undefined} />
      {data?.canPost && <Composer targets={data.targets} onPosted={load} />}
      {!data ? <div aria-busy="true" aria-label="Loading announcements" className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        : !data.items.length ? <EmptyState heading="No announcements yet" body={data.canPost ? "Post the first one above." : "When your Director or Manager posts one, it shows here."} />
        : (
          <ul className="flex flex-col gap-2">
            {data.items.map((a) => (
              <li key={a.id}>
                <button type="button" aria-expanded={open === a.id} onClick={() => toggle(a)} className="glass-panel flex w-full min-w-0 items-start gap-3 rounded-2xl border border-ink/[0.07] px-5 py-4 text-left">
                  <Megaphone size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-text-secondary" />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
                      {a.unread && <span className="rounded-md bg-accent-tint px-1.5 py-0.5 font-bold text-accent-text">New</span>}
                      <strong title={a.from} className="max-w-[24ch] truncate text-text-primary">{a.from}</strong>
                      {a.role && <span>{a.role}</span>}
                      {a.community && <span title={a.community} className="max-w-[30ch] truncate rounded-md bg-ink/[0.05] px-1.5 py-0.5 font-semibold">{a.community}</span>}
                      <time dateTime={a.at} className="whitespace-nowrap tabular-nums">{fmt(a.at)}</time>
                    </span>
                    <span className={`mt-1 block whitespace-pre-wrap text-sm text-text-primary [overflow-wrap:anywhere] ${open === a.id ? "" : "line-clamp-2"} ${a.unread ? "font-semibold" : ""}`}>{a.text}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </Page>
  );
}
