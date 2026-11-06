// Community + group settings drawers and the group-request form (V2 Phase 2, D-074).
// The server enforces every rule (server/services/chatRules.js); these screens only show
// the controls the server's `can` flags allow, and explain the fixed rules in plain words.
import { useState, useEffect, useCallback } from "react";
import { Search, X, Check, Shield, ShieldOff, UserMinus, Megaphone, LogOut, Bell, BellOff, Lock } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import Drawer from "@/components/ui/Drawer";
import ConfirmModal from "@/components/ui/ConfirmModal";

export const ACCENT = "#4B2FC4";

export function Avatar({ user, size = 28 }) {
  const initial = (user?.name ?? "?").charAt(0).toUpperCase();
  return (
    <div className="shrink-0 flex items-center justify-center rounded-full font-bold text-white select-none"
      style={{ width: size, height: size, background: ACCENT, fontSize: size * 0.38 }} aria-hidden="true">
      {initial}
    </div>
  );
}

export function MemberPicker({ selected, onChange, label = "Add members", exclude = [] }) {
  const [q, setQ]             = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try { setResults(await api.get(`/api/communities/org-users${q ? `?q=${encodeURIComponent(q)}` : ""}`)); }
      catch { /* list stays as it was */ } finally { setLoading(false); }
    }, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [q]);

  const skip = new Set(exclude.map(String));
  const selectedIds = new Set(selected.map((u) => u._id));
  const shown = results.filter((u) => !skip.has(String(u._id)));
  const toggle = (u) => onChange(selectedIds.has(u._id) ? selected.filter((x) => x._id !== u._id) : [...selected, u]);

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-xs font-bold text-text-secondary">{label}</span>}
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or role" aria-label="Search people"
          className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-border-subtle bg-bg-surface focus:outline-none focus:ring-2 focus:ring-[#4B2FC4]/25" />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-xl border border-border-subtle p-1 flex flex-col gap-0.5">
        {loading && <p className="text-xs text-text-tertiary text-center py-3">Searching…</p>}
        {!loading && shown.map((u) => (
          <button key={u._id} type="button" onClick={() => toggle(u)} aria-pressed={selectedIds.has(u._id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${selectedIds.has(u._id) ? "bg-[#4B2FC4]/10" : "hover:bg-ink/[0.05]"}`}>
            <Avatar user={u} size={22} />
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-semibold text-text-primary truncate">{u.name}</span>
              <span className="block text-[11px] text-text-tertiary truncate">{u.role}{u.department ? ` · ${u.department}` : ""}</span>
            </span>
            {selectedIds.has(u._id) && <Check size={12} className="text-[#4B2FC4] shrink-0" aria-hidden="true" />}
          </button>
        ))}
        {!loading && !shown.length && <p className="text-xs text-text-tertiary text-center py-3">No one found.</p>}
      </div>
      <p className="text-[11px] text-text-tertiary tabular-nums">{selected.length} selected</p>
    </div>
  );
}

const Tabs = ({ tabs, value, onChange }) => (
  <div role="tablist" className="flex gap-1 rounded-xl bg-ink/[0.04] p-1 mb-4">
    {tabs.map(([key, label, badge]) => (
      <button key={key} role="tab" aria-selected={value === key} onClick={() => onChange(key)}
        className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-colors ${value === key ? "bg-bg-surface text-text-primary shadow-[0_1px_3px_rgba(20,32,61,0.12)]" : "text-text-secondary hover:text-text-primary"}`}>
        {label}{badge ? <span className="ml-1.5 rounded-full px-1.5 text-[10px] text-white tabular-nums" style={{ background: ACCENT }}>{badge}</span> : null}
      </button>
    ))}
  </div>
);

function Choice({ label, value, onChange, options, disabled, note }) {
  return (
    <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
      <legend className="text-xs font-bold text-text-primary mb-1.5">{label}</legend>
      <div className="flex gap-2">
        {options.map(([v, text]) => (
          <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${value === v ? "border-[#4B2FC4] text-[#4B2FC4] bg-[#4B2FC4]/[0.04]" : "border-border-subtle text-text-secondary hover:border-[#4B2FC4]/40"}`}>
            {text}
          </button>
        ))}
      </div>
      {note && <p className="text-[11px] text-text-tertiary leading-relaxed">{note}</p>}
    </fieldset>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer">
      <span>
        <span className="block text-xs font-bold text-text-primary">{label}</span>
        {hint && <span className="block text-[11px] text-text-tertiary leading-relaxed mt-0.5">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#4B2FC4]" />
    </label>
  );
}

const PRIMARY = "py-2 px-4 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity hover:opacity-90";
const QUIET = "inline-flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border border-border-subtle text-text-secondary hover:bg-ink/[0.04] transition-colors";

function MemberRow({ m, actions }) {
  return (
    <li className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-ink/[0.03]">
      <Avatar user={m} size={28} />
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-bold text-text-primary truncate">{m.name}</span>
        <span className="block text-[11px] text-text-tertiary truncate">
          {m.role}
          {m.isAdmin && " · Admin"}
          {m.canPost && " · Can post"}
          {m.isProtected && " · Always a member"}
        </span>
      </span>
      {actions}
    </li>
  );
}

const IconBtn = ({ label, onClick, children, tone = "text-text-secondary hover:text-text-primary" }) => (
  <button type="button" onClick={onClick} title={label} aria-label={label}
    className={`p-1.5 rounded-lg hover:bg-ink/[0.06] transition-colors ${tone}`}>{children}</button>
);

// ── Group settings drawer ─────────────────────────────────────────────────────
export function GroupSettingsDrawer({ groupId, open, onClose, onChanged, onLeft }) {
  const addToast = useUiStore((s) => s.addToast);
  const [tab, setTab]         = useState("about");
  const [g, setG]             = useState(null);
  const [members, setMembers] = useState([]);
  const [form, setForm]       = useState({});
  const [adding, setAdding]   = useState([]);
  const [busy, setBusy]       = useState(false);
  const [confirm, setConfirm] = useState(null); // { title, body, run }

  const load = useCallback(async () => {
    if (!groupId) return;
    try {
      const [info, list] = await Promise.all([api.get(`/api/chat/channels/${groupId}`), api.get(`/api/chat/channels/${groupId}/members`)]);
      setG(info); setMembers(list);
      setForm({ name: info.name, description: info.description ?? "", sendMessages: info.sendMode, editInfo: info.permissions?.editInfo ?? "admins", joinApproval: !!info.joinApproval });
    } catch (err) { addToast({ type: "error", message: err?.message ?? "Could not load group settings." }); }
  }, [groupId, addToast]);

  useEffect(() => { if (open) { setTab("about"); setAdding([]); load(); } }, [open, load]);

  async function act(fn, ok) {
    setBusy(true);
    try { await fn(); if (ok) addToast({ type: "success", message: ok }); await load(); onChanged?.(); }
    catch (err) { addToast({ type: "error", message: err?.message ?? "That change was not saved." }); }
    finally { setBusy(false); }
  }

  const can = g?.can ?? {};
  const isAnn = g?.type === "announcement";
  const adminsOnly = form.sendMessages === "admins";
  const requests = g?.joinRequests ?? [];
  const tabs = [["about", "About"], ["members", "Members", requests.length || null], ...(can.manage ? [["settings", "Settings"]] : [])];

  return (
    <Drawer open={open} onClose={onClose} title={g ? (isAnn ? "Announcements" : `#${g.name}`) : "Group"} width={400}>
      <div className="px-6 py-5">
      {!g ? <p className="text-sm text-text-tertiary">Loading…</p> : (
        <>
          <Tabs tabs={tabs} value={tab} onChange={setTab} />

          {tab === "about" && (
            <div className="flex flex-col gap-5">
              {can.editInfo && !isAnn ? (
                <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); act(() => api.patch(`/api/chat/channels/${g._id}/settings`, { name: form.name, description: form.description }), "Group info saved."); }}>
                  <label className="text-xs font-bold text-text-primary">Group name
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60}
                      className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-bg-surface font-normal focus:outline-none focus:ring-2 focus:ring-[#4B2FC4]/25" />
                  </label>
                  <label className="text-xs font-bold text-text-primary">Description
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} maxLength={300}
                      className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-bg-surface font-normal resize-none focus:outline-none focus:ring-2 focus:ring-[#4B2FC4]/25" />
                  </label>
                  <button type="submit" disabled={busy || !form.name?.trim()} className={`${PRIMARY} self-start`} style={{ background: ACCENT }}>Save info</button>
                </form>
              ) : (
                <div>
                  <p className="text-sm text-text-primary leading-relaxed">{g.description || "No description yet."}</p>
                  {isAnn && <p className="mt-2 flex items-start gap-1.5 text-xs text-text-secondary leading-relaxed"><Megaphone size={13} className="mt-0.5 shrink-0" aria-hidden="true" />Every community member sees this group. Only admins, and people an admin allows, can post.</p>}
                </div>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
                <dt className="text-text-tertiary">Who can send</dt><dd className="text-text-primary font-semibold">{g.sendMode === "admins" ? "Admins only" : "Everyone"}</dd>
                <dt className="text-text-tertiary">Join approval</dt><dd className="text-text-primary font-semibold">{g.joinApproval ? "On" : "Off"}</dd>
                <dt className="text-text-tertiary">Members</dt><dd className="text-text-primary font-semibold tabular-nums">{members.length}</dd>
              </dl>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={QUIET} disabled={busy}
                  onClick={() => act(() => api.post(`/api/chat/channels/${g._id}/mute`, { muted: !g.muted }), g.muted ? "Notifications on." : "Group muted.")}>
                  {g.muted ? <Bell size={13} aria-hidden="true" /> : <BellOff size={13} aria-hidden="true" />}{g.muted ? "Unmute" : "Mute"}
                </button>
                {can.leave && (
                  <button type="button" className={`${QUIET} text-rose-700 border-rose-200 hover:bg-rose-50`}
                    onClick={() => setConfirm({ title: "Leave this group?", body: "You will stop getting its messages. An admin can add you again.",
                      run: () => act(() => api.post(`/api/chat/channels/${g._id}/leave`)).then(() => { onLeft?.(g._id); onClose(); }) })}>
                    <LogOut size={13} aria-hidden="true" />Leave group
                  </button>
                )}
              </div>
              {!can.leave && <p className="flex items-start gap-1.5 text-[11px] text-text-tertiary leading-relaxed"><Lock size={12} className="mt-0.5 shrink-0" aria-hidden="true" />{isAnn ? "Announcements follows the community, so it can't be left on its own." : "Directors and Managers are always members of every group."}</p>}
            </div>
          )}

          {tab === "members" && (
            <div className="flex flex-col gap-4">
              {can.manage && requests.length > 0 && (
                <section aria-label="Join requests" className="rounded-xl border border-border-subtle p-3">
                  <h3 className="text-xs font-bold text-text-primary mb-2">Asking to join</h3>
                  <ul className="flex flex-col gap-1">
                    {requests.map((u) => (
                      <MemberRow key={u._id} m={u} actions={<>
                        <IconBtn label={`Let ${u.name} join`} tone="text-emerald-700" onClick={() => act(() => api.post(`/api/chat/channels/${g._id}/join-requests/${u._id}`, { approve: true }), `${u.name} joined.`)}><Check size={14} /></IconBtn>
                        <IconBtn label={`Decline ${u.name}`} tone="text-rose-700" onClick={() => act(() => api.post(`/api/chat/channels/${g._id}/join-requests/${u._id}`, { approve: false }))}><X size={14} /></IconBtn>
                      </>} />
                    ))}
                  </ul>
                </section>
              )}
              {can.manage && !isAnn && (
                <div className="flex flex-col gap-2">
                  <MemberPicker selected={adding} onChange={setAdding} label="Add people" exclude={members.map((m) => m._id)} />
                  <button type="button" disabled={busy || !adding.length} className={`${PRIMARY} self-start`} style={{ background: ACCENT }}
                    onClick={() => act(() => api.post(`/api/chat/channels/${g._id}/members`, { userIds: adding.map((u) => u._id) }), "Members added.").then(() => setAdding([]))}>
                    Add {adding.length || ""}
                  </button>
                </div>
              )}
              <ul className="flex flex-col">
                {members.map((m) => (
                  <MemberRow key={m._id} m={m} actions={!m.isProtected && (
                    <span className="flex">
                      {can.nominateAdmins && (m.isAdmin
                        ? <IconBtn label={`Remove admin rights from ${m.name}`} onClick={() => act(() => api.delete(`/api/chat/channels/${g._id}/admins/${m._id}`))}><ShieldOff size={14} /></IconBtn>
                        : <IconBtn label={`Make ${m.name} a group admin`} onClick={() => act(() => api.post(`/api/chat/channels/${g._id}/admins`, { userId: m._id }), `${m.name} is now an admin.`)}><Shield size={14} /></IconBtn>)}
                      {can.manage && adminsOnly && !m.isAdmin && (
                        <IconBtn label={m.canPost ? `Stop ${m.name} posting` : `Let ${m.name} post`} tone={m.canPost ? "text-[#4B2FC4]" : undefined}
                          onClick={() => act(() => m.canPost ? api.delete(`/api/chat/channels/${g._id}/posters/${m._id}`) : api.post(`/api/chat/channels/${g._id}/posters`, { userId: m._id }))}>
                          <Megaphone size={14} />
                        </IconBtn>)}
                      {can.manage && !isAnn && (
                        <IconBtn label={`Remove ${m.name}`} tone="text-rose-700"
                          onClick={() => setConfirm({ title: `Remove ${m.name}?`, body: "They will lose access to this group's messages.",
                            run: () => act(() => api.delete(`/api/chat/channels/${g._id}/members/${m._id}`), `${m.name} removed.`) })}>
                          <UserMinus size={14} />
                        </IconBtn>)}
                    </span>
                  )} />
                ))}
              </ul>
              {isAnn && can.manage && <p className="text-[11px] text-text-tertiary leading-relaxed">Announcements members follow the community. Add or remove people from the community settings.</p>}
            </div>
          )}

          {tab === "settings" && can.manage && (
            <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault();
              act(() => api.patch(`/api/chat/channels/${g._id}/settings`, { permissions: { sendMessages: form.sendMessages, editInfo: form.editInfo }, ...(isAnn ? {} : { joinApproval: form.joinApproval }) }), "Settings saved."); }}>
              <Choice label="Who can send messages" value={form.sendMessages} onChange={(v) => setForm({ ...form, sendMessages: v })}
                options={[["everyone", "Everyone"], ["admins", "Admins only"]]} disabled={isAnn}
                note={isAnn ? "Announcements is always admins only. Give a member posting rights from the Members tab." : adminsOnly ? "Admins can still let a member post from the Members tab." : null} />
              <Choice label="Who can edit group info" value={form.editInfo} onChange={(v) => setForm({ ...form, editInfo: v })}
                options={[["everyone", "Everyone"], ["admins", "Admins only"]]} />
              {!isAnn && <Toggle label="Approve new members" hint="People in the community ask to join and an admin lets them in." checked={form.joinApproval} onChange={(v) => setForm({ ...form, joinApproval: v })} />}
              <button type="submit" disabled={busy} className={`${PRIMARY} self-start`} style={{ background: ACCENT }}>{busy ? "Saving…" : "Save settings"}</button>
            </form>
          )}
        </>
      )}
      </div>
      <ConfirmModal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title} body={confirm?.body} destructive
        confirmLabel="Yes, continue" onConfirm={() => { const run = confirm.run; setConfirm(null); run(); }} />
    </Drawer>
  );
}

// ── Community settings drawer ─────────────────────────────────────────────────
export function CommunitySettingsDrawer({ community, open, onClose, onChanged, initialTab = "about" }) {
  const addToast = useUiStore((s) => s.addToast);
  const [tab, setTab]         = useState(initialTab);
  const [members, setMembers] = useState([]);
  const [form, setForm]       = useState({ name: "", description: "" });
  const [adding, setAdding]   = useState([]);
  const [busy, setBusy]       = useState(false);
  const [confirm, setConfirm] = useState(null);
  const can = community?.can ?? {};
  const requests = (community?.groupRequests ?? []).filter((r) => r.status === "pending");
  const cid = community?._id;

  const loadMembers = useCallback(async () => {
    if (!cid) return;
    try { setMembers(await api.get(`/api/communities/${cid}/members`)); } catch { setMembers([]); }
  }, [cid]);

  useEffect(() => {
    if (!open || !community) return;
    setTab(initialTab); setAdding([]);
    setForm({ name: community.name, description: community.description ?? "" });
    loadMembers();
  }, [open, community, initialTab, loadMembers]);

  async function act(fn, ok) {
    setBusy(true);
    try { await fn(); if (ok) addToast({ type: "success", message: ok }); await loadMembers(); onChanged?.(); }
    catch (err) { addToast({ type: "error", message: err?.message ?? "That change was not saved." }); }
    finally { setBusy(false); }
  }

  const tabs = [["about", "About"], ["members", "Members"], ...(can.decideRequests || requests.length ? [["requests", "Requests", requests.length || null]] : [])];

  return (
    <Drawer open={open} onClose={onClose} title={community ? community.name : "Community"} width={400}>
      {community && (
        <div className="px-6 py-5">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />

          {tab === "about" && (
            <div className="flex flex-col gap-5">
              {can.manage ? (
                <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); act(() => api.patch(`/api/communities/${cid}`, form), "Community info saved."); }}>
                  <label className="text-xs font-bold text-text-primary">Community name
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60}
                      className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-bg-surface font-normal focus:outline-none focus:ring-2 focus:ring-[#4B2FC4]/25" />
                  </label>
                  <label className="text-xs font-bold text-text-primary">Description
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} maxLength={300}
                      className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-bg-surface font-normal resize-none focus:outline-none focus:ring-2 focus:ring-[#4B2FC4]/25" />
                  </label>
                  <button type="submit" disabled={busy || !form.name.trim()} className={`${PRIMARY} self-start`} style={{ background: ACCENT }}>Save info</button>
                </form>
              ) : <p className="text-sm text-text-primary leading-relaxed">{community.description || "No description yet."}</p>}
              <p className="text-xs text-text-secondary leading-relaxed">Admins: the Director and Managers. They belong to every group in this community and can't be removed.</p>
              {can.archive && (
                <section className="rounded-xl border border-rose-200 p-3">
                  <h3 className="text-xs font-bold text-rose-800">Deactivate community</h3>
                  <p className="text-[11px] text-text-secondary mt-1 mb-2 leading-relaxed">It disappears for everyone. Messages are kept and you can restore it later.</p>
                  <button type="button" className={`${QUIET} text-rose-700 border-rose-200 hover:bg-rose-50`}
                    onClick={() => setConfirm({ title: `Deactivate ${community.name}?`, body: "Members lose access until you restore it.",
                      run: () => act(() => api.patch(`/api/communities/${cid}/archive`, { archived: true }), "Community deactivated.").then(onClose) })}>
                    Deactivate
                  </button>
                </section>
              )}
            </div>
          )}

          {tab === "members" && (
            <div className="flex flex-col gap-4">
              {can.manage && (
                <div className="flex flex-col gap-2">
                  <MemberPicker selected={adding} onChange={setAdding} label="Add people to the community" exclude={members.map((m) => m._id)} />
                  <button type="button" disabled={busy || !adding.length} className={`${PRIMARY} self-start`} style={{ background: ACCENT }}
                    onClick={() => act(() => api.post(`/api/communities/${cid}/members`, { userIds: adding.map((u) => u._id) }), "Members added.").then(() => setAdding([]))}>
                    Add {adding.length || ""}
                  </button>
                </div>
              )}
              <ul className="flex flex-col">
                {members.map((m) => (
                  <MemberRow key={m._id} m={m} actions={can.manage && !m.isProtected && (
                    <IconBtn label={`Remove ${m.name} from the community`} tone="text-rose-700"
                      onClick={() => setConfirm({ title: `Remove ${m.name}?`, body: "They will also leave every group in this community, including Announcements.",
                        run: () => act(() => api.delete(`/api/communities/${cid}/members/${m._id}`), `${m.name} removed.`) })}>
                      <UserMinus size={14} />
                    </IconBtn>
                  )} />
                ))}
              </ul>
            </div>
          )}

          {tab === "requests" && (
            <div className="flex flex-col gap-2">
              {!(community.groupRequests ?? []).length && <p className="text-sm text-text-tertiary py-6 text-center">No group requests.</p>}
              {(community.groupRequests ?? []).map((r) => (
                <article key={r._id} className="rounded-xl border border-border-subtle p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-bold text-text-primary truncate">#{r.name}</h3>
                    <span className="text-[11px] font-bold capitalize text-text-tertiary">{r.status}</span>
                  </div>
                  <p className="text-[11px] text-text-tertiary">Asked by {r.requestedBy?.name ?? "a member"}</p>
                  {r.description && <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{r.description}</p>}
                  {can.decideRequests && r.status === "pending" && (
                    <div className="flex gap-2 mt-3">
                      <button type="button" disabled={busy} className={PRIMARY} style={{ background: ACCENT }}
                        onClick={() => act(() => api.post(`/api/communities/${cid}/group-requests/${r._id}`, { decision: "approve" }), `Group #${r.name} created.`)}>Approve</button>
                      <button type="button" disabled={busy} className={QUIET}
                        onClick={() => act(() => api.post(`/api/communities/${cid}/group-requests/${r._id}`, { decision: "reject" }), "Request declined.")}>Decline</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}
      <ConfirmModal open={!!confirm} onClose={() => setConfirm(null)} title={confirm?.title} body={confirm?.body} destructive
        confirmLabel="Yes, continue" onConfirm={() => { const run = confirm.run; setConfirm(null); run(); }} />
    </Drawer>
  );
}

// ── Request a group (Developer / Designer / Tester) ───────────────────────────
export function RequestGroupDrawer({ community, open, onClose, onSent }) {
  const addToast = useUiStore((s) => s.addToast);
  const [name, setName] = useState("");
  const [why, setWhy]   = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(""); setWhy(""); } }, [open]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/api/communities/${community._id}/group-requests`, { name, description: why });
      addToast({ type: "success", message: "Request sent. A Manager or Team Lead will decide." });
      onSent?.(); onClose();
    } catch (err) { addToast({ type: "error", message: err?.message ?? "Request not sent." }); }
    finally { setBusy(false); }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Request a group" width={400}>
      {community && (
        <form onSubmit={submit} className="flex flex-col gap-4 px-6 py-5">
          <p className="text-sm text-text-secondary leading-relaxed">Ask for a new group in <b className="text-text-primary">{community.name}</b>. A Manager or Team Lead approves it, and you are added once it's made.</p>
          <label className="text-xs font-bold text-text-primary">Group name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="e.g. api-testing"
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-bg-surface font-normal focus:outline-none focus:ring-2 focus:ring-[#4B2FC4]/25" />
          </label>
          <label className="text-xs font-bold text-text-primary">What is it for?
            <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={3} maxLength={300} placeholder="One or two lines for the approver"
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-border-subtle bg-bg-surface font-normal resize-none focus:outline-none focus:ring-2 focus:ring-[#4B2FC4]/25" />
          </label>
          <button type="submit" disabled={busy || !name.trim()} className={`${PRIMARY} self-start`} style={{ background: ACCENT }}>{busy ? "Sending…" : "Send request"}</button>
        </form>
      )}
    </Drawer>
  );
}
