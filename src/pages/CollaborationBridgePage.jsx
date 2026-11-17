/**
 * CollaborationBridgePage — Community → Groups → Messages hierarchy.
 * WhatsApp + Discord style professional collaboration for ACHIEVION.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Plus, Search, X, Loader2, PanelRightOpen,
  RefreshCw, Settings,
} from "lucide-react";
import useDmPeople from "@/hooks/useDmPeople";
import useMentions from "@/components/ui/useMentions";
import { rankPeople, nextIndex } from "@/lib/mentions";
import { chatTitle } from "@/lib/chatFormat";
import { addPicked } from "@/lib/attachPick";
import { ChatMessages } from "@/components/widgets/ChatMessage";
import ChatList from "@/components/widgets/ChatList";
import ChatComposer from "@/components/widgets/ChatComposer";
import api from "@/lib/api";
import socket from "@/utils/socket";
import useAuthStore from "@/stores/authStore";
import useUiStore   from "@/stores/uiStore";
import EmptyState from "@/components/ui/EmptyState";
import {
  ACCENT, Avatar, MemberPicker, GroupSettingsDrawer, CommunitySettingsDrawer, RequestGroupDrawer,
} from "@/components/widgets/ChatSettingsDrawers";

// Server rules: server/services/chatRules.js (D-074). Communities: Director + Manager create.
const CAN_CREATE_COMMUNITY = ["Director", "Manager"];
// Messages, time stamps and DM names: components/widgets/ChatMessage.jsx, lib/chatFormat.js, hooks/useDmPeople.js (UI-C).

const COMMUNITY_ICONS = ["💬", "🏢", "📁", "🚀", "🎨", "⚙️", "🔬", "📊", "🌐", "💡", "🎯", "🤝"];

// ── Create Community Wizard ───────────────────────────────────────────────────
function CreateCommunityWizard({ onClose, onCreated }) {
  const addToast = useUiStore((s) => s.addToast);
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName]       = useState("");
  const [desc, setDesc]       = useState("");
  const [icon, setIcon]       = useState("💬");
  const [type, setType]       = useState("custom");
  const [members, setMembers] = useState([]);
  const [groups, setGroups]   = useState([{ name: "", desc: "", icon: "💬", members: [] }]);

  function addGroup() { setGroups((p) => [...p, { name: "", desc: "", icon: "💬", members: [] }]); }
  function removeGroup(i) { setGroups((p) => p.filter((_, idx) => idx !== i)); }
  function updateGroup(i, k, v) { setGroups((p) => p.map((g, idx) => idx === i ? { ...g, [k]: v } : g)); }

  async function submit() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const result = await api.post("/api/communities", {
        name, description: desc, icon, type,
        memberIds: members.map((u) => u._id),
        initialGroups: groups.filter((g) => g.name.trim()).map((g) => ({
          name: g.name, description: g.desc, icon: g.icon,
          memberIds: g.members.map((u) => u._id),
        })),
      });
      addToast({ type: "success", message: `Community "${name}" created!` });
      onCreated(result);
      onClose();
    } catch (err) {
      addToast({ type: "error", message: err?.message ?? "Failed to create community." });
    } finally { setLoading(false); }
  }

  const steps = ["Info", "Members", "Groups", "Review"];

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }} initial={{ scale: 0.93, y: 24 }} animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/[0.08]">
          <div>
            <h2 className="font-black text-text-primary text-base">Create Community</h2>
            <p className="text-[11px] text-slate-400">Step {step} of {steps.length} — {steps[step - 1]}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        {/* Progress */}
        <div className="flex px-6 py-2 gap-1">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 h-1 rounded-full transition-colors"
              style={{ background: i + 1 <= step ? ACCENT : "#E5E7EB" }} />
          ))}
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {step === 1 && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-2">Community Icon</label>
                <div className="flex flex-wrap gap-2">
                  {COMMUNITY_ICONS.map((em) => (
                    <button key={em} onClick={() => setIcon(em)}
                      className={`text-xl p-1.5 rounded-lg border-2 transition-colors ${icon === em ? "border-accent" : "border-transparent hover:border-ink/[0.12]"}`}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Community Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Design Department"
                  className="w-full px-3 py-2 rounded-xl border border-ink/[0.12] text-sm focus:outline-none focus:ring-2 focus:ring-accent/20" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Description</label>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
                  placeholder="What's this community for?"
                  className="w-full px-3 py-2 rounded-xl border border-ink/[0.12] text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-ink/[0.12] text-sm focus:outline-none">
                  <option value="custom">Custom</option>
                  <option value="organization">Organization-wide</option>
                  <option value="department">Department</option>
                  <option value="team">Team</option>
                  <option value="project">Project</option>
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <MemberPicker selected={members} onChange={setMembers} label="Select Community Members" />
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-500">An <b>Announcements</b> group is created automatically. Add more groups below.</p>
              {groups.map((g, i) => (
                <div key={i} className="border border-ink/[0.10] rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <select value={g.icon} onChange={(e) => updateGroup(i, "icon", e.target.value)}
                      className="text-base border border-ink/[0.10] rounded-lg p-1 focus:outline-none">
                      {COMMUNITY_ICONS.map((em) => <option key={em} value={em}>{em}</option>)}
                    </select>
                    <input value={g.name} onChange={(e) => updateGroup(i, "name", e.target.value)}
                      placeholder="Group name" className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-ink/[0.12] focus:outline-none" />
                    <button onClick={() => removeGroup(i)} className="text-rose-400 hover:text-rose-600"><X size={12} /></button>
                  </div>
                  <input value={g.desc} onChange={(e) => updateGroup(i, "desc", e.target.value)}
                    placeholder="Description (optional)" className="px-2 py-1.5 text-xs rounded-lg border border-ink/[0.12] focus:outline-none" />
                  <details>
                    <summary className="text-[10px] text-accent-text cursor-pointer select-none">Specific members (optional)</summary>
                    <div className="mt-2">
                      <MemberPicker selected={g.members} onChange={(sel) => updateGroup(i, "members", sel)} label="" />
                    </div>
                  </details>
                </div>
              ))}
              <button onClick={addGroup}
                className="flex items-center gap-1.5 text-xs font-bold text-accent-text hover:underline">
                <Plus size={12} /> Add Group
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-ink/[0.03] border border-ink/[0.08]">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-sm font-black text-text-primary">{name || "Unnamed"}</p>
                  <p className="text-xs text-slate-400">{desc || "No description"}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 capitalize">{type} community</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-ink/[0.03] border border-ink/[0.08]">
                <p className="text-xs font-bold text-slate-600 mb-1.5">{members.length} Members</p>
                <div className="flex flex-wrap gap-1">
                  {members.map((m) => (
                    <span key={m._id} className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: ACCENT }}>{m.name}</span>
                  ))}
                  {!members.length && <span className="text-[10px] text-slate-400">You only (creator)</span>}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-ink/[0.03] border border-ink/[0.08]">
                <p className="text-xs font-bold text-slate-600 mb-1.5">{groups.filter((g) => g.name.trim()).length + 1} Groups</p>
                <p className="text-[10px] text-slate-500">📢 announcements (auto)</p>
                {groups.filter((g) => g.name.trim()).map((g, i) => (
                  <p key={i} className="text-[10px] text-slate-500">{g.icon} {g.name}</p>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-ink/[0.08]">
          <button onClick={() => step > 1 ? setStep((s) => s - 1) : onClose()}
            className="text-sm text-slate-500 hover:text-slate-700 font-semibold">
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 4
            ? <button onClick={() => { if (step === 1 && !name.trim()) return; setStep((s) => s + 1); }}
                disabled={step === 1 && !name.trim()}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: ACCENT }}>
                Next
              </button>
            : <button onClick={submit} disabled={loading || !name.trim()}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: ACCENT }}>
                {loading ? "Creating…" : "Create Community"}
              </button>
          }
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Create Group Modal ────────────────────────────────────────────────────────
function CreateGroupModal({ community, onClose, onCreated }) {
  const addToast = useUiStore((s) => s.addToast);
  const [name, setName]       = useState("");
  const [desc, setDesc]       = useState("");
  const [icon, setIcon]       = useState("💬");
  const [members, setMembers] = useState([]);
  const [perm, setPerm]       = useState("everyone");
  const [joinApproval, setJoinApproval] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const group = await api.post(`/api/communities/${community._id}/groups`, {
        name, description: desc, icon,
        memberIds: members.map((u) => u._id),
        permissions: { sendMessages: perm, editInfo: "admins" },
        joinApproval,
      });
      addToast({ type: "success", message: `Group created!` });
      onCreated(group);
      onClose();
    } catch (err) {
      addToast({ type: "error", message: err?.message ?? "Failed to create group." });
    } finally { setLoading(false); }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }} initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/[0.08]">
          <div>
            <h2 className="font-black text-text-primary text-sm">New Group</h2>
            <p className="text-[10px] text-slate-400">in {community.icon} {community.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          <div className="flex gap-3 items-end">
            <select value={icon} onChange={(e) => setIcon(e.target.value)}
              className="text-xl border border-ink/[0.12] rounded-xl p-2 focus:outline-none">
              {COMMUNITY_ICONS.map((em) => <option key={em} value={em}>{em}</option>)}
            </select>
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-600 block mb-1">Group Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="e.g. frontend-devs"
                className="w-full px-3 py-2 text-sm rounded-xl border border-ink/[0.12] focus:outline-none focus:ring-1 focus:ring-accent/20" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Description</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this group about?"
              className="w-full px-3 py-2 text-sm rounded-xl border border-ink/[0.12] focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Who can send messages?</label>
            <div className="flex gap-2">
              {["everyone", "admins"].map((v) => (
                <button key={v} type="button" onClick={() => setPerm(v)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${perm === v ? "border-accent text-accent-text" : "border-ink/[0.12] text-slate-500"}`}>
                  {v === "everyone" ? "Everyone" : "Admins Only"}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-start justify-between gap-3 cursor-pointer">
            <span>
              <span className="block text-xs font-bold text-text-primary">Approve new members</span>
              <span className="block text-[11px] text-text-tertiary">Community members ask to join and an admin lets them in.</span>
            </span>
            <input type="checkbox" role="switch" checked={joinApproval} onChange={(e) => setJoinApproval(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
          </label>
          <MemberPicker selected={members} onChange={setMembers} label="Add members" />
          <p className="text-[11px] text-text-tertiary">The Director and Managers are added automatically.</p>
        </form>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-ink/[0.08]">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 font-semibold">Cancel</button>
          <button onClick={submit} disabled={loading || !name.trim()}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: ACCENT }}>
            {loading ? "Creating…" : "Create Group"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── DM Modal ──────────────────────────────────────────────────────────────────
function DmModal({ onClose, onOpen }) {
  const addToast = useUiStore((s) => s.addToast);
  const [q, setQ]             = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hi, setHi]           = useState(0); // highlighted result (keyboard)
  const meId = useAuthStore((s) => s.user?.id ?? s.user?._id);
  // Item 74: prefix matches first (then names that only contain the text), never yourself.
  const ranked = rankPeople(results.filter((u) => String(u._id) !== String(meId)), q.trim(), { contains: true });

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try { setResults(await api.get(`/api/chat/users?q=${encodeURIComponent(q || " ")}`)); }
      catch { /* silent */ } finally { setLoading(false); }
    }, q ? 300 : 0);
    return () => clearTimeout(timer);
  }, [q]);

  async function open(user) {
    try {
      const { channel } = await api.get(`/api/chat/dm/${user._id}`);
      onOpen({ ...channel, _dmTarget: user });
      onClose();
    } catch (err) { addToast({ type: "error", message: err?.message ?? "Failed to open DM." }); }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink/[0.08]">
          <h2 className="font-black text-text-primary text-sm">New Direct Message</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setHi(0); }} autoFocus placeholder="Search name or email…"
              role="combobox" aria-expanded={ranked.length > 0} aria-controls="dm-results" aria-activedescendant={ranked.length ? `dm-result-${hi}` : undefined}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setHi((i) => nextIndex(i, e.key, ranked.length)); }
                else if (e.key === "Enter" && ranked[hi]) { e.preventDefault(); open(ranked[hi]); }
                else if (e.key === "Escape") { e.stopPropagation(); onClose(); }
              }}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-ink/[0.12] focus:outline-none focus:ring-1 focus:ring-accent/20" />
          </div>
          <div id="dm-results" role="listbox" aria-label="People" className="flex flex-col gap-0.5 max-h-56 overflow-y-auto">
            {loading && <p className="text-xs text-slate-400 text-center py-4">Searching…</p>}
            {ranked.map((u, i) => (
              <button key={u._id} id={`dm-result-${i}`} role="option" aria-selected={i === hi} onClick={() => open(u)} onMouseEnter={() => setHi(i)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left ${i === hi ? "bg-ink/[0.07]" : "hover:bg-ink/[0.06]"}`}>
                <Avatar user={u} size={28} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-primary truncate" title={u.name}>{u.name}</p>
                  <p className="text-[11px] text-text-tertiary truncate">{u.role}</p>
                </div>
              </button>
            ))}
            {!loading && !ranked.length && <p className="text-xs text-slate-400 text-center py-4">No users found.</p>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
// startWith="announcements" (Manager nav → Announcements, M-8): opens the first community's Announcements group.
export default function CollaborationBridgePage({ startWith = null }) {
  const user      = useAuthStore((s) => s.user);
  const addToast  = useUiStore((s) => s.addToast);
  const currentId = user?._id ?? user?.id ?? "";
  const userRole  = user?.role ?? "";

  const [communities,     setCommunities]     = useState([]);
  const [dms,             setDms]             = useState([]);
  const [activeGroup,     setActiveGroup]     = useState(null);
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [messages,        setMessages]        = useState([]);
  const [msgLoading,      setMsgLoading]      = useState(false);
  const [hasMore,         setHasMore]         = useState(false);
  const [input,           setInput]           = useState("");
  const [sending,         setSending]         = useState(false);
  const [typingUsers,     setTypingUsers]     = useState([]);
  const [search,          setSearch]          = useState("");
  const [showCreateCom,   setShowCreateCom]   = useState(false);
  const [createGroupFor,  setCreateGroupFor]  = useState(null);
  const [showDm,          setShowDm]          = useState(false);
  const [showGroupInfo,   setShowGroupInfo]   = useState(false);
  const [comDrawer,       setComDrawer]       = useState(null); // { id, tab }
  const [requestFor,      setRequestFor]      = useState(null);
  // The chat list sits on the right: always there from 900 px up (can be hidden, remembered), a slide-over below that.
  const [listHidden, setListHidden] = useState(() => { try { return localStorage.getItem("chat-list-hidden") === "1"; } catch { return false; } });
  const [slideOver,  setSlideOver]  = useState(false);
  // F-018: files to send. The control shows only when the server keeps files (it says so); otherwise one line explains.
  const [files, setFiles] = useState([]);
  const [fileErrors, setFileErrors] = useState([]);
  const [attachStatus, setAttachStatus] = useState(null); // { enabled, maxFiles } once known
  const fileInputRef = useRef(null);
  useEffect(() => { api.get("/api/chat/attachments/status", { silent: true }).then(setAttachStatus).catch(() => {}); }, []);
  const attach = {
    on: !!attachStatus?.enabled, known: !!attachStatus, max: attachStatus?.maxFiles ?? 3, files, errors: fileErrors,
    onPick: (e) => { const r = addPicked(files, [...e.target.files], attachStatus?.maxFiles ?? 3); setFiles(r.files); setFileErrors(r.errors); e.target.value = ""; },
    onRemove: (i) => { setFiles((f) => f.filter((_, j) => j !== i)); setFileErrors([]); },
  };
  const hideList = (v) => { setListHidden(v); try { localStorage.setItem("chat-list-hidden", v ? "1" : "0"); } catch { /* not remembered */ } };

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const typingTimer = useRef(null);
  const clientIdRef = useRef(0);
  const personOf    = useDmPeople(dms, currentId);

  // Items 73-75: "@" in a group opens that group's member list (never yourself); a DM has two people, so no list.
  const [chatMembers, setChatMembers] = useState([]);
  useEffect(() => {
    if (!activeGroup || activeGroup.type === "dm") { setChatMembers([]); return; } // eslint-disable-line react-hooks/set-state-in-effect
    let live = true;
    api.get(`/api/chat/channels/${activeGroup._id}/members`, { silent: true }).then((ms) => live && setChatMembers(ms)).catch(() => {});
    return () => { live = false; };
  }, [activeGroup?._id, activeGroup?.type]); // eslint-disable-line react-hooks/exhaustive-deps
  const mention = useMentions({ value: input, setValue: setInput, inputRef, members: chatMembers, meId: currentId, listId: "chat-people" });

  // Load data
  const loadCommunities = useCallback(async () => {
    try { setCommunities(await api.get("/api/communities")); } catch { /* silent */ }
  }, []);

  const loadDms = useCallback(async () => {
    try {
      const all = await api.get("/api/chat/channels");
      setDms(all.filter((c) => c.type === "dm"));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadCommunities(); loadDms(); }, [loadCommunities, loadDms]);
  // The other conversations only get an unread badge from here (their messages do not reach this page live): look again every 30 s
  // while the tab is open, the same rhythm as the dock, so the page, the dock and the bell agree.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") { loadCommunities(); loadDms(); } }, 30_000);
    return () => clearInterval(t);
  }, [loadCommunities, loadDms]);

  // Announcements entry (M-8): pick the first community's Announcements group and put the cursor in the composer.
  function openAnnouncements() {
    const c = communities.find((x) => x.groups?.some((g) => g.type === "announcement"));
    const g = c?.groups.find((x) => x.type === "announcement");
    if (!g) return false;
    selectGroup(g, c);
    setTimeout(() => inputRef.current?.focus(), 150);
    return true;
  }
  const opened = useRef(false);
  useEffect(() => {
    if (startWith !== "announcements" || opened.current || !communities.length) return;
    opened.current = openAnnouncements();
  }, [startWith, communities]); // eslint-disable-line react-hooks/exhaustive-deps

  // Item 77: a bell notice about a DM or an @mention opens that conversation (?open=<channel id>).
  const [sp, setSp] = useSearchParams();
  const openId = sp.get("open");
  useEffect(() => {
    if (!openId) return;
    const group = communities.flatMap((c) => (c.groups ?? []).map((g) => [g, c])).find(([g]) => String(g._id) === openId);
    const dm = dms.find((d) => String(d._id) === openId);
    if (!group && !dm) return; // lists still loading: try again when they arrive
    if (group) selectGroup(group[0], group[1]); else selectDm(dm);
    const next = new URLSearchParams(sp); next.delete("open"); setSp(next, { replace: true });
  }, [openId, communities, dms]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = () => setShowDm(true);
    document.addEventListener("collab:openDm", h);
    return () => document.removeEventListener("collab:openDm", h);
  }, []);

  const loadMessages = useCallback(async (channelId, before) => {
    setMsgLoading(true);
    try {
      const params = before ? `?before=${before}&limit=50` : "?limit=50";
      const msgs = await api.get(`/api/chat/channels/${channelId}/messages${params}`);
      if (before) setMessages((p) => [...msgs, ...p]);
      else        setMessages(msgs);
      setHasMore(msgs.length === 50);
    } catch { /* silent */ } finally { setMsgLoading(false); }
  }, []);

  function selectGroup(group, community) {
    setSlideOver(false);
    if (activeGroup?._id === group._id) return;
    if (activeGroup) socket.emit("chat:leave", { channelId: activeGroup._id });
    setActiveGroup(group);
    setActiveCommunity(community ?? null);
    setMessages([]);
    setTypingUsers([]);
    setShowGroupInfo(false);
    socket.emit("chat:join", { channelId: group._id });
    loadMessages(group._id);
    api.post(`/api/chat/channels/${group._id}/read`).catch(() => {});
    setCommunities((p) => p.map((c) => ({
      ...c, groups: c.groups?.map((g) => g._id === group._id ? { ...g, unread: 0 } : g) ?? [],
    })));
  }

  function selectDm(dm) {
    setSlideOver(false);
    if (activeGroup?._id === dm._id) return;
    if (activeGroup) socket.emit("chat:leave", { channelId: activeGroup._id });
    setActiveGroup(dm);
    setActiveCommunity(null);
    setMessages([]);
    setTypingUsers([]);
    setShowGroupInfo(false);
    socket.emit("chat:join", { channelId: dm._id });
    loadMessages(dm._id);
    api.post(`/api/chat/channels/${dm._id}/read`).catch(() => {});
    setDms((p) => p.map((d) => d._id === dm._id ? { ...d, unread: 0 } : d));
  }

  // Socket
  useEffect(() => {
    function onNew(msg) {
      const gid = String(msg.channelId);
      if (gid !== String(activeGroup?._id)) {
        setCommunities((p) => p.map((c) => ({
          ...c, groups: c.groups?.map((g) => String(g._id) === gid ? { ...g, unread: (g.unread ?? 0) + 1 } : g) ?? [],
        })));
        setDms((p) => p.map((d) => String(d._id) === gid ? { ...d, unread: (d.unread ?? 0) + 1 } : d));
        return;
      }
      setMessages((p) => {
        if (msg.clientId && p.some((m) => m.clientId === msg.clientId)) return p;
        return [...p, msg];
      });
      api.post(`/api/chat/channels/${gid}/read`, {}, { silent: true }).catch(() => {}); // you are looking at it: the dock and the bell must not count it
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    // After a dropped connection the socket has left its rooms: join this conversation again and fetch what was missed.
    function onConnect() {
      if (!activeGroup) return;
      socket.emit("chat:join", { channelId: activeGroup._id });
      loadMessages(activeGroup._id); loadCommunities(); loadDms();
    }
    function onUpdated(msg) { setMessages((p) => p.map((m) => m._id === msg._id ? { ...m, ...msg } : m)); }
    function onDeleted({ _id }) { setMessages((p) => p.map((m) => m._id === _id ? { ...m, deletedAt: new Date().toISOString(), content: "" } : m)); }
    function onTyping({ userId: uid, name }) {
      if (uid === currentId) return;
      setTypingUsers((p) => p.some((u) => u.userId === uid) ? p : [...p, { userId: uid, name }]);
    }
    function onStopTyping({ userId: uid }) { setTypingUsers((p) => p.filter((u) => u.userId !== uid)); }

    socket.on("chat:new_message",     onNew);
    socket.on("chat:message_saved",   onNew);
    socket.on("chat:message_updated", onUpdated);
    socket.on("chat:message_deleted", onDeleted);
    socket.on("chat:typing",          onTyping);
    socket.on("chat:stop_typing",     onStopTyping);
    socket.on("connect",              onConnect);
    return () => {
      socket.off("connect",              onConnect);
      socket.off("chat:new_message",     onNew);
      socket.off("chat:message_saved",   onNew);
      socket.off("chat:message_updated", onUpdated);
      socket.off("chat:message_deleted", onDeleted);
      socket.off("chat:typing",          onTyping);
      socket.off("chat:stop_typing",     onStopTyping);
    };
  }, [activeGroup, currentId]);

  useEffect(() => {
    if (messages.length) setTimeout(() => bottomRef.current?.scrollIntoView(), 80);
  }, [activeGroup?._id]);

  async function sendMessage() {
    const text = input.trim(), sendFiles = files;
    if ((!text && !sendFiles.length) || !activeGroup || sending) return;
    const cid = `${currentId}-${++clientIdRef.current}-${Date.now()}`;
    const mentions = mention.idsIn(text); mention.reset();
    setInput(""); setFiles([]); setFileErrors([]);
    setSending(true);
    const optimistic = {
      _id: `opt-${cid}`, clientId: cid, channelId: activeGroup._id,
      sender: { _id: currentId, name: user?.name, role: user?.role },
      content: text, createdAt: new Date().toISOString(),
    };
    setMessages((p) => [...p, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const path = `/api/chat/channels/${activeGroup._id}/messages`;
      let saved;
      if (sendFiles.length) {
        const fd = new FormData();
        fd.append("content", text); fd.append("clientId", cid); fd.append("mentions", JSON.stringify(mentions));
        sendFiles.forEach((f) => fd.append("files", f));
        saved = await api.upload(path, fd);
      } else saved = await api.post(path, { content: text, clientId: cid, mentions });
      // The saved message replaces the placeholder, so it can be edited, deleted and reacted to at once (the live copy is skipped by clientId).
      if (saved?._id) setMessages((p) => p.map((m) => (m.clientId === cid ? { ...saved, clientId: cid } : m)));
    } catch (err) {
      addToast({ type: "error", message: err?.message ?? "Failed to send." });
      setMessages((p) => p.filter((m) => m.clientId !== cid));
      setInput(text); setFiles(sendFiles); // nothing is lost: the text and the files are back in the composer
    } finally { setSending(false); inputRef.current?.focus(); }
  }

  function onInputChange(e) {
    setInput(e.target.value);
    mention.track(e.target.value, e.target.selectionStart);
    if (activeGroup) {
      socket.emit("chat:typing", { channelId: activeGroup._id });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => socket.emit("chat:stop_typing", { channelId: activeGroup._id }), 2000);
    }
  }

  async function handleEdit(msgId, content) {
    if (String(msgId).startsWith("opt-")) return; // not saved yet
    try {
      const upd = await api.patch(`/api/chat/messages/${msgId}`, { content });
      setMessages((p) => p.map((m) => m._id === msgId ? { ...m, ...upd } : m));
    } catch (err) { addToast({ type: "error", message: err?.message ?? "Edit failed." }); }
  }

  async function handleDelete(msgId) {
    // Optimistic messages haven't been saved yet — just drop from local state
    if (String(msgId).startsWith("opt-")) {
      setMessages((p) => p.filter((m) => m._id !== msgId));
      return;
    }
    try {
      await api.delete(`/api/chat/messages/${msgId}`);
      setMessages((p) => p.map((m) => m._id === msgId ? { ...m, deletedAt: new Date().toISOString(), content: "" } : m));
    } catch (err) { addToast({ type: "error", message: err?.message ?? "Delete failed." }); }
  }

  async function handlePin(msgId) {
    if (!activeGroup) return;
    try {
      await api.post(`/api/chat/channels/${activeGroup._id}/pin/${msgId}`);
      setMessages((p) => p.map((m) => m._id === msgId ? { ...m, isPinned: true } : m));
      addToast({ type: "success", message: "Message pinned." });
    } catch (err) { addToast({ type: "error", message: err?.message ?? "Pin failed." }); }
  }

  async function handleReact(msgId, emoji) {
    if (String(msgId).startsWith("opt-")) return;
    try {
      const upd = await api.post(`/api/chat/messages/${msgId}/reactions`, { emoji });
      setMessages((p) => p.map((m) => m._id === msgId ? { ...m, ...upd } : m));
    } catch (err) { addToast({ type: "error", message: err?.message ?? "Reaction not saved." }); }
  }

  async function handleJoin(g) {
    try {
      const r = await api.post(`/api/chat/channels/${g._id}/join`);
      addToast({ type: "success", message: r.status === "requested" ? "Request sent to the group admins." : `You joined #${g.name}.` });
      loadCommunities();
    } catch (err) { addToast({ type: "error", message: err?.message ?? "Could not join." }); }
  }

  // Mirrors server/services/chatRules.js — the server still decides.
  const isGroupAdmin = activeGroup?.type !== "dm" && (activeGroup?.adminIds?.some((a) => (a._id ?? a).toString() === currentId)
    || CAN_CREATE_COMMUNITY.includes(userRole));
  const sendMode = activeGroup?.type === "announcement" ? "admins" : (activeGroup?.permissions?.sendMessages ?? "everyone");
  const canSend = !activeGroup || activeGroup.type === "dm" || sendMode !== "admins" || isGroupAdmin
    || (activeGroup.posterIds ?? []).some((p) => String(p) === currentId);
  const drawerCommunity = comDrawer ? communities.find((c) => c._id === comDrawer.id) : null;
  const activeTitle = activeGroup ? chatTitle(activeGroup, personOf(activeGroup), activeCommunity?.name) : "";
  const fullTitle = activeGroup?.type === "dm" || activeGroup?.type === "announcement" ? activeTitle : `#${activeGroup?.name ?? ""}`; // header: never shortened
  const mentionNames = chatMembers.map((m) => m.name);
  const showList = () => (window.matchMedia("(min-width: 900px)").matches ? hideList(false) : setSlideOver(true));
  const listProps = {
    communities, dms, personOf, activeGroupId: activeGroup?._id, userRole, canCreate: CAN_CREATE_COMMUNITY.includes(userRole), search, setSearch,
    on: {
      selectGroup, selectDm, join: handleJoin,
      createCommunity: () => setShowCreateCom(true), createGroup: (c) => setCreateGroupFor(c), requestGroup: (c) => setRequestFor(c),
      openCommunity: (c, tab) => setComDrawer({ id: c._id, tab }), newDm: () => setShowDm(true),
      groupSettings: (g, c) => { selectGroup(g, c); setShowGroupInfo(true); },
    },
  };

  return (
    <div className="relative flex h-full bg-bg-base overflow-hidden">
      {/* Conversation (centre) */}
      <div className="flex flex-1 flex-col min-w-0">
        {activeGroup ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-3 sm:px-5 py-2.5 shrink-0 border-b border-ink/[0.08]"
              style={{ background: "#F5F6FA" }}>
              {activeGroup.type === "dm"
                ? <Avatar user={personOf(activeGroup) ?? { name: activeTitle }} size={34} />
                : <span className="text-xl shrink-0" aria-hidden="true">{activeGroup.type === "announcement" ? "📢" : activeGroup.icon ?? "💬"}</span>}
              <div className="flex-1 min-w-0">
                <h1 tabIndex={0} title={fullTitle} className="max-h-[4.5rem] overflow-y-auto text-base font-bold leading-snug text-text-primary break-words [overflow-wrap:anywhere]">{fullTitle}</h1>
                {activeCommunity && (
                  <p className="max-h-10 overflow-y-auto text-xs text-text-tertiary break-words [overflow-wrap:anywhere]">{activeCommunity.icon} {activeCommunity.name}</p>
                )}
                {activeGroup.type === "dm" && <p className="text-xs text-text-tertiary truncate">{personOf(activeGroup)?.role ?? "Direct message"}</p>}
              </div>
              {activeGroup.type !== "dm" && (
                <button type="button" onClick={() => setShowGroupInfo(true)} aria-label="Group settings" title="Group settings"
                  className="shrink-0 min-h-9 px-3 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 text-text-secondary border border-border-subtle hover:bg-ink/[0.06]">
                  <Settings size={16} aria-hidden="true" /> <span className="hidden min-[480px]:inline">Group settings</span>
                </button>
              )}
              <button type="button" onClick={showList} aria-label="Show chat list" title="Show chat list"
                className={`${listHidden ? "flex" : "flex min-[900px]:hidden"} shrink-0 min-h-9 px-3 rounded-lg text-sm font-semibold items-center gap-1.5 text-text-secondary border border-border-subtle hover:bg-ink/[0.06]`}>
                <PanelRightOpen size={16} aria-hidden="true" /> <span className="hidden min-[480px]:inline">Chats</span>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto pb-3" role="log" aria-live="polite" aria-label="Messages">
              {!msgLoading && messages.length === 0 && (
                <p className="px-6 py-12 text-center text-sm text-text-secondary">
                  {!canSend ? "No announcements here yet." : activeGroup.type === "dm" ? `No messages with ${activeTitle} yet. Write the first one below.` : "No messages in this group yet. Write the first one below."}
                </p>
              )}
              {msgLoading && messages.length === 0 && (
                <p className="flex items-center justify-center gap-2 py-12 text-sm text-text-secondary"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Loading messages…</p>
              )}
              {hasMore && (
                <div className="flex justify-center py-2">
                  <button onClick={() => loadMessages(activeGroup._id, messages[0]?.createdAt)} disabled={msgLoading}
                    className="flex items-center gap-1.5 text-xs text-accent-text hover:underline disabled:opacity-40">
                    {msgLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Load earlier
                  </button>
                </div>
              )}
              <ChatMessages messages={messages} currentUserId={currentId} isGroupAdmin={isGroupAdmin}
                names={mentionNames} onEdit={handleEdit} onDelete={handleDelete} onPin={handlePin} onReact={handleReact} />
              {typingUsers.length > 0 && (
                <p className="px-4 py-1 text-[11px] text-slate-400 italic">
                  {typingUsers.map((u) => u.name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
                </p>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="shrink-0 px-4 py-3 border-t border-ink/[0.08]" style={{ background: "#F5F6FA" }}>
              {!canSend ? (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-border-subtle bg-bg-surface/60 px-3 py-2.5 text-text-tertiary" aria-live="polite">
                  <Lock size={14} aria-hidden="true" />
                  <textarea disabled rows={1} aria-label="Composer (read only)" placeholder={activeGroup.type === "announcement" ? "Write an announcement…" : "Write a message…"} className="min-w-0 flex-1 resize-none bg-transparent text-sm placeholder:text-text-tertiary" />
                </div>
              ) : (
                <ChatComposer input={input} onChange={onInputChange} onSend={sendMessage} sending={sending} mention={mention} inputRef={inputRef}
                  names={mentionNames} canMention={activeGroup.type !== "dm"} attach={attach} fileInputRef={fileInputRef}
                  label={activeGroup.type === "announcement" ? "Write an announcement" : "Message"}
                  placeholder={activeGroup.type === "announcement" ? "Write an announcement for everyone in this community…" : `Message ${activeTitle}`}
                  sendLabel={activeGroup.type === "announcement" ? "Post announcement" : "Send message"} />
              )}
              {!canSend && <p className="mt-1.5 text-center text-xs text-text-tertiary">Only admins{activeGroup.type === "announcement" ? ", and people they allow," : ""} can post here.</p>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
            <button type="button" onClick={showList}
              className={`${listHidden ? "flex" : "flex min-[900px]:hidden"} min-h-10 items-center gap-2 rounded-lg border border-border-subtle px-4 text-sm font-semibold text-text-secondary hover:bg-ink/[0.06]`}>
              <PanelRightOpen size={16} aria-hidden="true" /> Open chat list
            </button>
            {communities.length === 0 ? (
              <EmptyState pose="thinking" heading="No communities yet"
                body={CAN_CREATE_COMMUNITY.includes(userRole) ? "Create a community for a project or team. It comes with an Announcements group." : "When a Manager adds you to a community, its groups show up here. You can still send a direct message."}
                action={CAN_CREATE_COMMUNITY.includes(userRole) ? { label: "New community", onClick: () => setShowCreateCom(true) } : { label: "New direct message", onClick: () => setShowDm(true) }} />
            ) : (
              <EmptyState pose="thinking" heading="Pick a group to start"
                body={CAN_CREATE_COMMUNITY.includes(userRole) ? "Choose a group on the left, post an announcement, or send someone a direct message." : "Choose a group on the left, or send someone a direct message."}
                action={CAN_CREATE_COMMUNITY.includes(userRole) ? { label: "New announcement", onClick: openAnnouncements } : { label: "New direct message", onClick: () => setShowDm(true) }} />
            )}
          </div>
        )}
      </div>

      {/* Chat list (right): a column from 900 px, a slide-over below */}
      {!listHidden && (
        <aside aria-label="Chat list" className="hidden w-[340px] shrink-0 border-l border-ink/[0.08] min-[900px]:block xl:w-[360px]" style={{ background: "#F5F6FA" }}>
          <ChatList {...listProps} onHide={() => hideList(true)} />
        </aside>
      )}
      {slideOver && (
        <div className="absolute inset-0 z-40 min-[900px]:hidden" role="dialog" aria-modal="true" aria-label="Chat list"
          onKeyDown={(e) => { if (e.key === "Escape") setSlideOver(false); }}>
          <button type="button" aria-label="Close chat list" className="absolute inset-0 bg-ink/40" onClick={() => setSlideOver(false)} tabIndex={-1} />
          <motion.aside initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.18 }}
            className="absolute inset-y-0 right-0 w-[min(360px,92vw)] border-l border-ink/[0.08] shadow-2xl motion-reduce:!transform-none" style={{ background: "#F5F6FA" }}>
            <ChatList {...listProps} onClose={() => setSlideOver(false)} />
          </motion.aside>
        </div>
      )}

      <GroupSettingsDrawer
        groupId={activeGroup && activeGroup.type !== "dm" ? activeGroup._id : null}
        open={showGroupInfo && !!activeGroup}
        onClose={() => setShowGroupInfo(false)}
        onChanged={async () => {
          await loadCommunities();
          if (activeGroup) api.get(`/api/chat/channels/${activeGroup._id}`).then((g) => setActiveGroup((cur) => (cur?._id === g._id ? { ...cur, ...g } : cur))).catch(() => {});
        }}
        onLeft={() => { socket.emit("chat:leave", { channelId: activeGroup?._id }); setActiveGroup(null); setMessages([]); loadCommunities(); }}
      />
      <CommunitySettingsDrawer
        community={drawerCommunity}
        open={!!drawerCommunity}
        initialTab={comDrawer?.tab ?? "about"}
        onClose={() => setComDrawer(null)}
        onChanged={loadCommunities}
      />
      <RequestGroupDrawer community={requestFor} open={!!requestFor} onClose={() => setRequestFor(null)} onSent={loadCommunities} />

      {/* Modals */}
      <AnimatePresence>
        {showCreateCom && (
          <CreateCommunityWizard
            onClose={() => setShowCreateCom(false)}
            onCreated={({ community, groups }) =>
              setCommunities((p) => [...p, { ...community, groups: groups ?? [] }])}
          />
        )}
        {createGroupFor && (
          <CreateGroupModal
            community={createGroupFor}
            onClose={() => setCreateGroupFor(null)}
            onCreated={(group) =>
              setCommunities((p) => p.map((c) =>
                c._id === createGroupFor._id ? { ...c, groups: [...(c.groups ?? []), { ...group, unread: 0 }] } : c
              ))}
          />
        )}
        {showDm && (
          <DmModal
            onClose={() => setShowDm(false)}
            onOpen={(dm) => {
              if (!dms.find((d) => d._id === dm._id)) setDms((p) => [...p, { ...dm, unread: 0 }]);
              selectDm(dm);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
