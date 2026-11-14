// Announcements, read-only (T-5, D-146; UX TL v4 §14, TL-16). Messages of the announcement channels this Team Lead is in.
// Unread stays marked until opened or "Mark all as read".
import { useState } from "react";
import { Megaphone } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import useLoad from "../manager/project/useLoad";
import { fmtDateTime } from "../manager/project/format";

export default function TLAnnouncementsPage() {
  const addToast = useUiStore((s) => s.addToast);
  const { data, error, reload, setData } = useLoad("/api/teamlead/announcements");
  const [open, setOpen] = useState(null);
  const mark = (ids) => { setData((d) => { const items = d.items.map((i) => (!ids || ids.includes(i.id) ? { ...i, unread: false } : i)); return { items, unread: items.filter((i) => i.unread).length }; }); return api.post("/api/teamlead/announcements/read", ids ? { ids } : {}).catch((e) => addToast({ type: "error", message: e?.message ?? "Could not mark as read." })); };
  function toggle(a) { setOpen((x) => (x === a.id ? null : a.id)); if (a.unread) mark([a.id]); }
  if (error) return <Page><ErrorState message={error} onRetry={reload} /></Page>;
  return (
    <Page>
      <PageHeader title="Announcements" subtitle={data?.unread ? `${data.unread} unread` : "News from your Manager and organization. Read only."}
        secondary={data?.unread ? { label: "Mark all as read", onClick: () => mark(null) } : undefined} />
      {!data ? <div aria-busy="true" aria-label="Loading announcements" className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        : !data.items.length ? <EmptyState heading="No announcements yet" body="When your Manager posts one, it shows here." action={{ label: "Open Collaboration", to: "/teamlead/chat" }} />
        : (
          <ul className="flex flex-col gap-2">
            {data.items.map((a) => (
              <li key={a.id}>
                <button type="button" aria-expanded={open === a.id} onClick={() => toggle(a)} className="glass-panel flex w-full min-w-0 items-start gap-3 rounded-2xl border border-ink/[0.07] px-5 py-4 text-left transition-colors hover:bg-ink/[0.03]">
                  <Megaphone size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-text-secondary" />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
                      {a.unread && <span className="rounded-md bg-accent-tint px-1.5 py-0.5 font-bold text-accent-text">New</span>}
                      <strong title={a.from} className="max-w-[24ch] truncate text-text-primary">{a.from}</strong>
                      {a.role && <span>{a.role}</span>}
                      {a.channel && <span title={a.channel} className="max-w-[30ch] truncate">#{a.channel}</span>}
                      <time dateTime={a.at} className="whitespace-nowrap tabular-nums">{fmtDateTime(a.at)}</time>
                    </span>
                    <span className={`mt-1 block whitespace-pre-wrap text-sm text-text-primary [overflow-wrap:anywhere] ${open === a.id ? "" : "line-clamp-2"} ${a.unread ? "font-semibold" : ""}`}>{a.text || "(no text)"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </Page>
  );
}
