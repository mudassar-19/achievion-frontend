// The chat list on the RIGHT of the conversation (QA2 item 13, D-550): communities, their groups and direct messages.
// Long names wrap to two lines (full name in the tooltip and in the conversation header), the community actions are labelled
// buttons of at least 36 px plus a "..." menu on every community and group; right-click opens the same menu.
import { useEffect, useRef, useState } from "react";
import { BellOff, ChevronDown, ChevronRight, MessageSquare, MoreHorizontal, PanelRightClose, Plus, Search, X } from "lucide-react";
import { badge, dmName, groupName } from "@/lib/chatFormat";
import { dayKey, fmtDateShort, fmtTime } from "@/lib/dates";
import { CommunityTile, GroupGlyph } from "./ChatIcons";
import { ACCENT, Avatar } from "./ChatSettingsDrawers";

const NAME = "min-w-0 flex-1 break-words text-left [overflow-wrap:anywhere] line-clamp-2";
const PILL = "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white";
const BTN = "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors";

// A small menu: Esc and a click outside close it, Up/Down move, items are real buttons.
function RowMenu({ label, items, at, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector("button")?.focus();
    const away = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [onClose]);
  const key = (e) => {
    const bs = [...ref.current.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
    if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); bs[(i + bs.length - 1) % bs.length].focus(); }
  };
  return (
    <div ref={ref} role="menu" aria-label={label} onKeyDown={key} style={at}
      className="absolute z-30 w-52 rounded-xl border border-border-subtle bg-bg-surface py-1 shadow-lg">
      {items.map((it) => (
        <button key={it.label} type="button" role="menuitem" onClick={() => { onClose(); it.run(); }}
          className="flex min-h-9 w-full items-center px-3 text-left text-sm text-text-primary hover:bg-ink/[0.06] focus-visible:bg-ink/[0.06] focus-visible:outline-none">{it.label}</button>
      ))}
    </div>
  );
}

// "..." button + its menu. `menuFor` lets right-click open the same menu.
function MoreMenu({ label, items, openAt, setOpenAt }) {
  return (
    <span className="relative shrink-0">
      <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={!!openAt} title={label}
        onClick={(e) => { e.stopPropagation(); setOpenAt(openAt ? null : { top: "100%", right: 0 }); }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-ink/[0.07] hover:text-text-primary">
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {openAt && <RowMenu label={label} items={items} at={openAt} onClose={() => setOpenAt(null)} />}
    </span>
  );
}

// The "Daniel: text" line and time under a group or person; nothing until there is a message.
function Preview({ last }) {
  if (!last?.text) return <span className="block truncate text-xs text-text-tertiary">No messages yet</span>;
  return <span className="block truncate text-xs text-text-secondary">{last.from ? `${last.from}: ` : ""}{last.text}</span>;
}
// Today: the time; earlier: the day ("14 Nov"), in the organisation's time zone (X-1).
const when = (last) => (!last?.at ? "" : dayKey(last.at) === dayKey(new Date()) ? fmtTime(last.at) : fmtDateShort(last.at));
// "general" -> "General" (group names are stored as slugs).
const pretty = (n) => String(n ?? "").replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());

// Selected row: a light tint and a bar on the left (never a full dark fill).
const ROW = (active) => `relative flex min-h-12 min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1.5 pl-3 pr-2 text-left transition-colors ${active ? "bg-accent/10" : "hover:bg-ink/[0.05]"}`;
const Bar = ({ on }) => (on ? <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full" style={{ background: ACCENT }} aria-hidden="true" /> : null);

function GroupRow({ group, community, active, onSelect, onSettings }) {
  const [menu, setMenu] = useState(null);
  const label = group.type === "announcement" ? "Announcements" : pretty(groupName(group.name, community.name));
  const full = group.type === "announcement" ? "Announcements" : group.name;
  const unread = !group.muted && (group.unread ?? 0) > 0 && !active;
  return (
    <div className="relative flex items-center gap-1 pl-2 pr-1" onContextMenu={(e) => { e.preventDefault(); setMenu({ top: "100%", right: 8 }); }}>
      <button type="button" onClick={onSelect} aria-current={active ? "true" : undefined} title={full} className={ROW(active)}>
        <Bar on={active} />
        <span className={active ? "text-accent-text" : "text-text-tertiary"}><GroupGlyph group={group} /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={`min-w-0 flex-1 truncate text-sm ${unread || active ? "font-bold text-text-primary" : "font-medium text-text-primary"}`}>{label}</span>
            <span className="shrink-0 text-[11px] text-text-tertiary tabular-nums">{when(group.lastMessage)}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1"><Preview last={group.lastMessage} /></span>
            {group.muted && <BellOff size={12} className="shrink-0 text-text-tertiary" aria-label="Muted" />}
            {unread && <span className={PILL} style={{ background: ACCENT }} aria-label={`${group.unread} unread`}>{badge(group.unread)}</span>}
          </span>
        </span>
      </button>
      <MoreMenu label={`${full}: more`} openAt={menu} setOpenAt={setMenu}
        items={[{ label: "Open", run: onSelect }, { label: "Group settings", run: onSettings }]} />
    </div>
  );
}

function Community({ c, collapsed, toggle, activeId, on, search }) {
  const [menu, setMenu] = useState(null);
  const unread = c.groups?.reduce((s, g) => s + (g.muted ? 0 : g.unread ?? 0), 0) ?? 0;
  const pending = c.can?.decideRequests ? (c.groupRequests ?? []).filter((r) => r.status === "pending").length : 0;
  const addLabel = c.can?.createGroup ? "New group" : c.can?.requestGroup ? "Request a group" : null;
  const addRun = () => (c.can.createGroup ? on.createGroup(c) : on.requestGroup(c));
  const items = [...(addLabel ? [{ label: addLabel, run: addRun }] : []), { label: "Community settings", run: () => on.openCommunity(c, "about") },
    ...(pending > 0 ? [{ label: `${pending} group request${pending === 1 ? "" : "s"} to decide`, run: () => on.openCommunity(c, "requests") }] : []),
    { label: collapsed ? "Show groups" : "Hide groups", run: toggle }];
  return (
    <section className="mb-2 border-b border-ink/[0.06] pb-2" aria-label={c.name}>
      <div className="relative flex items-center gap-1 px-2" onContextMenu={(e) => { e.preventDefault(); setMenu({ top: "100%", right: 8 }); }}>
        <button type="button" onClick={toggle} aria-expanded={!collapsed} title={c.name}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-ink/[0.04]">
          <CommunityTile community={c} />
          <span className="min-w-0 flex-1 truncate text-left text-sm font-bold text-text-primary">{c.name}</span>
          {pending > 0 && <span className="shrink-0 rounded-full bg-accent/10 px-1.5 text-[11px] font-bold text-accent-text" aria-label={`${pending} group requests to decide`}>{pending}</span>}
          {unread > 0 && collapsed && <span className={PILL} style={{ background: ACCENT }} aria-label={`${unread} unread`}>{badge(unread)}</span>}
          {collapsed ? <ChevronRight size={14} className="shrink-0 text-text-tertiary" aria-hidden="true" /> : <ChevronDown size={14} className="shrink-0 text-text-tertiary" aria-hidden="true" />}
        </button>
        <MoreMenu label={`${c.name}: more`} openAt={menu} setOpenAt={setMenu} items={items} />
      </div>
      {!collapsed && c.groups?.map((g) => (
        <GroupRow key={g._id} group={g} community={c} active={activeId === g._id}
          onSelect={() => on.selectGroup(g, c)} onSettings={() => on.groupSettings(g, c)} />
      ))}
      {!collapsed && !c.groups?.length && <p className="px-4 py-1 text-xs text-text-tertiary">{search ? "No group matches." : "No groups yet."}</p>}
      {!collapsed && (c.joinable?.length ?? 0) > 0 && (
        <div className="mt-1 pl-4 pr-2">
          <p className="py-1 text-[11px] font-semibold text-text-tertiary">Other groups</p>
          {c.joinable.map((g) => (
            <div key={g._id} className="flex min-h-9 items-center gap-2 py-1 text-sm text-text-secondary">
              <span className="text-text-tertiary"><GroupGlyph group={g} /></span>
              <span className={NAME} title={g.name}>{pretty(groupName(g.name, c.name))}</span>
              {g.requested ? <span className="text-[11px] text-text-tertiary">Requested</span>
                : <button type="button" onClick={() => on.join(g)} className="min-h-9 px-1 text-xs font-bold text-accent-text hover:underline">{g.joinApproval ? "Ask to join" : "Join"}</button>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ChatList({ communities, dms, personOf, activeGroupId, userRole, canCreate, on, search, setSearch, onHide, onClose }) {
  const [collapsed, setCollapsed] = useState({});
  const q = search.toLowerCase();
  const filtered = search
    ? communities.map((c) => ({
      ...c,
      groups: c.groups?.filter((g) => g.name.toLowerCase().includes(q) || groupName(g.name, c.name).toLowerCase().includes(q)) ?? [],
      joinable: c.joinable?.filter((g) => g.name.toLowerCase().includes(q)) ?? [],
    })).filter((c) => c.name.toLowerCase().includes(q) || c.groups.length > 0 || c.joinable.length > 0)
    : communities;
  const shownDms = dms.filter((d) => !search || dmName(personOf(d)).toLowerCase().includes(q));
  void userRole;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-ink/[0.06] px-3 pb-3 pt-3">
        <div className="mb-2 flex items-center gap-1">
          <h2 className="flex-1 text-sm font-bold text-text-primary">Chats</h2>
          {canCreate && <button type="button" onClick={on.createCommunity} className={`${BTN} text-accent-text hover:bg-accent/10`}><Plus size={14} aria-hidden="true" />New community</button>}
          {onHide && <button type="button" onClick={onHide} aria-label="Hide chat list" title="Hide chat list" className="hidden h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-ink/[0.07] min-[900px]:flex"><PanelRightClose size={16} aria-hidden="true" /></button>}
          {onClose && <button type="button" autoFocus onClick={onClose} aria-label="Close chat list" className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-ink/[0.07] min-[900px]:hidden"><X size={16} aria-hidden="true" /></button>}
        </div>
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups and people" aria-label="Search groups and people"
            className="min-h-9 w-full rounded-lg border border-border-subtle bg-bg-surface pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/25" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2">
        {filtered.map((c) => <Community key={c._id} c={c} collapsed={!!collapsed[c._id]} toggle={() => setCollapsed((s) => ({ ...s, [c._id]: !s[c._id] }))} activeId={activeGroupId} on={on} search={search} />)}

        {shownDms.length > 0 && (
          <section className="px-2" aria-label="Direct messages">
            <h3 className="px-2 pb-1 pt-1 text-xs font-bold text-text-secondary">Direct messages</h3>
            {shownDms.map((dm) => {
              const person = personOf(dm), name = dmName(person), active = activeGroupId === dm._id;
              return (
                <div key={dm._id} className="pl-0 pr-1">
                  <button type="button" onClick={() => on.selectDm(dm)} aria-current={active ? "true" : undefined} title={name} className={`${ROW(active)} w-full`}>
                    <Bar on={active} />
                    <Avatar user={person ?? { name }} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className={`min-w-0 flex-1 truncate text-sm ${(dm.unread ?? 0) > 0 || active ? "font-bold" : "font-medium"} text-text-primary`}>{name}</span>
                        <span className="shrink-0 text-[11px] text-text-tertiary tabular-nums">{when(dm.lastMessage)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1"><Preview last={dm.lastMessage} /></span>
                        {(dm.unread ?? 0) > 0 && !active && <span className={PILL} style={{ background: ACCENT }} aria-label={`${dm.unread} unread`}>{badge(dm.unread)}</span>}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </section>
        )}

        {filtered.length === 0 && shownDms.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-text-secondary">{search ? "No group or person matches this search." : "You are not in a community yet. You can still send a direct message."}</p>
        )}
      </div>

      <div className="shrink-0 border-t border-ink/[0.06] p-2">
        <button type="button" onClick={on.newDm}
          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/5 text-sm font-semibold text-accent-text hover:bg-accent/10">
          <MessageSquare size={14} aria-hidden="true" /> New direct message
        </button>
      </div>
    </div>
  );
}
