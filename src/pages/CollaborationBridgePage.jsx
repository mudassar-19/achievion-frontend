/**
 * CollaborationBridgePage — Community → Groups → Messages hierarchy.
 * WhatsApp + Discord style professional collaboration for ACHIEVION.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Plus, Search, X, Send, Loader2,
  ChevronRight, ChevronDown, Pencil, Trash2,
  Pin, RefreshCw, Settings, BellOff, SmilePlus, Inbox,
} from "lucide-react";
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
const REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "🙏"]; // same set as the server

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

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
                      className={`text-xl p-1.5 rounded-lg border-2 transition-colors ${icon === em ? "border-[#4B2FC4]" : "border-transparent hover:border-ink/[0.12]"}`}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Community Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Design Department"
                  className="w-full px-3 py-2 rounded-xl border border-ink/[0.12] text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2FC4]/20" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Description</label>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
                  placeholder="What's this community for?"
                  className="w-full px-3 py-2 rounded-xl border border-ink/[0.12] text-sm focus:outline-none focus:ring-2 focus:ring-[#4B2FC4]/20 resize-none" />
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
                    <summary className="text-[10px] text-[#4B2FC4] cursor-pointer select-none">Specific members (optional)</summary>
                    <div className="mt-2">
                      <MemberPicker selected={g.members} onChange={(sel) => updateGroup(i, "members", sel)} label="" />
                    </div>
                  </details>
                </div>
              ))}
              <button onClick={addGroup}
                className="flex items-center gap-1.5 text-xs font-bold text-[#4B2FC4] hover:underline">
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
                className="w-full px-3 py-2 text-sm rounded-xl border border-ink/[0.12] focus:outline-none focus:ring-1 focus:ring-[#4B2FC4]/20" />
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
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${perm === v ? "border-[#4B2FC4] text-[#4B2FC4]" : "border-ink/[0.12] text-slate-500"}`}>
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
            <input type="checkbox" role="switch" checked={joinApproval} onChange={(e) => setJoinApproval(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#4B2FC4]" />
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
            <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Search name or email…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-ink/[0.12] focus:outline-none focus:ring-1 focus:ring-[#4B2FC4]/20" />
          </div>
          <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto">
            {loading && <p className="text-xs text-slate-400 text-center py-4">Searching…</p>}
            {results.map((u) => (
              <button key={u._id} onClick={() => open(u)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-ink/[0.06] text-left">
                <Avatar user={u} size={28} />
                <div>
                  <p className="text-xs font-bold text-text-primary">{u.name}</p>
                  <p className="text-[10px] text-slate-400">{u.role}</p>
                </div>
              </button>
            ))}
            {!loading && !results.length && <p className="text-xs text-slate-400 text-center py-4">No users found.</p>}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Message Item ──────────────────────────────────────────────────────────────
function Reactions({ msg, currentUserId, onReact }) {
  const groups = {};
  for (const r of msg.reactions ?? []) (groups[r.emoji] ??= []).push(String(r.userId?._id ?? r.userId));
  const entries = Object.entries(groups);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, ids]) => {
        const mine = ids.includes(String(currentUserId));
        return (
          <button key={emoji} type="button" onClick={() => onReact(msg._id, emoji)} aria-pressed={mine}
            aria-label={`${emoji} ${ids.length}${mine ? ", you reacted" : ""}`}
            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] tabular-nums transition-colors ${mine ? "border-[#4B2FC4]/40 bg-[#4B2FC4]/[0.08] text-[#4B2FC4] font-bold" : "border-border-subtle text-text-secondary hover:bg-ink/[0.04]"}`}>
            <span aria-hidden="true">{emoji}</span>{ids.length}
          </button>
        );
      })}
    </div>
  );
}

function MessageItem({ msg, currentUserId, isGroupAdmin, onEdit, onDelete, onPin, onReact }) {
  const [picker, setPicker]     = useState(false);
  const [editing, setEditing]   = useState(false);
  const [editText, setEditText] = useState(msg.content ?? "");
  const [hover, setHover]       = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const isOptimistic = String(msg._id).startsWith("opt-");
  const isMe         = (msg.sender?._id ?? msg.sender?.toString()) === currentUserId;
  const isDeleted    = !!msg.deletedAt;

  function saveEdit() {
    if (editText.trim() && editText !== msg.content) onEdit(msg._id, editText.trim());
    setEditing(false);
  }

  return (
    <div className="flex gap-3 px-4 py-1.5 rounded-xl group"
      style={{ background: hover ? "rgba(75,47,196,0.03)" : "transparent" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Avatar user={msg.sender} size={30} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold text-text-primary">{msg.sender?.name ?? "Unknown"}</span>
          <span className="text-[10px] text-slate-400">{timeLabel(msg.createdAt)}</span>
          {msg.editedAt && <span className="text-[10px] text-slate-400 italic">(edited)</span>}
          {msg.isPinned && <Pin size={9} className="text-amber-400" />}
        </div>
        {isDeleted ? (
          <p className="text-xs text-slate-400 italic mt-0.5">This message was deleted.</p>
        ) : editing ? (
          <div className="flex gap-2 mt-1">
            <input ref={inputRef} value={editText} onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) saveEdit(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 px-2 py-1 text-xs rounded-lg border border-[#4B2FC4]/30 focus:outline-none" />
            <button onClick={saveEdit} className="text-[10px] font-bold text-[#4B2FC4]">Save</button>
            <button onClick={() => setEditing(false)} className="text-[10px] text-slate-400">Cancel</button>
          </div>
        ) : (
          <p className="text-xs text-text-primary leading-relaxed mt-0.5 break-words">{msg.content}</p>
        )}
        {!isDeleted && <Reactions msg={msg} currentUserId={currentUserId} onReact={onReact} />}
        {picker && (
          <div role="group" aria-label="Pick a reaction" className="mt-1 inline-flex gap-0.5 rounded-full border border-border-subtle bg-bg-surface px-1 py-0.5 shadow-[0_4px_12px_-4px_rgba(20,32,61,0.25)]">
            {REACTIONS.map((e) => (
              <button key={e} type="button" onClick={() => { onReact(msg._id, e); setPicker(false); }} aria-label={`React ${e}`}
                className="h-7 w-7 rounded-full text-base hover:bg-ink/[0.06] transition-transform hover:scale-110">{e}</button>
            ))}
          </div>
        )}
      </div>
      {hover && !isDeleted && !isOptimistic && (
        <div className="flex items-center gap-0.5 self-start mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setPicker((v) => !v)} className="p-1 rounded hover:bg-ink/[0.08]" title="React" aria-label="React to message">
            <SmilePlus size={11} className="text-text-secondary" />
          </button>
          {isMe && (
            <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-ink/[0.08]" title="Edit">
              <Pencil size={10} className="text-slate-400" />
            </button>
          )}
          {(isMe || isGroupAdmin) && (
            <button onClick={() => onDelete(msg._id)} className="p-1 rounded hover:bg-rose-50" title="Delete">
              <Trash2 size={10} className="text-rose-400" />
            </button>
          )}
          {isGroupAdmin && (
            <button onClick={() => onPin(msg._id)} className="p-1 rounded hover:bg-amber-50" title="Pin">
              <Pin size={10} className="text-amber-400" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Hierarchical Sidebar ──────────────────────────────────────────────────────
function CommunitySidebar({ communities, dms, activeGroupId, onSelectGroup, onSelectDm, userRole, onCreateCommunity, onCreateGroup, onRequestGroup, onOpenCommunity, onJoin, search, setSearch }) {
  const [collapsed, setCollapsed] = useState({});

  function toggle(id) { setCollapsed((s) => ({ ...s, [id]: !s[id] })); }

  const canCreate = CAN_CREATE_COMMUNITY.includes(userRole);
  const q = search.toLowerCase();

  const filtered = search
    ? communities.map((c) => ({
        ...c,
        groups: c.groups?.filter((g) => g.name.toLowerCase().includes(q)) ?? [],
        joinable: c.joinable?.filter((g) => g.name.toLowerCase().includes(q)) ?? [],
      })).filter((c) => c.name.toLowerCase().includes(q) || (c.groups?.length ?? 0) > 0 || (c.joinable?.length ?? 0) > 0)
    : communities;

  const filteredDms = dms.filter((d) => !search || (d._dmTarget?.name ?? d.name ?? "").toLowerCase().includes(q));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-4 pb-3 border-b border-ink/[0.06]">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold text-text-primary">Communities</h2>
          {canCreate && (
            <button onClick={onCreateCommunity} title="New community" aria-label="New community"
              className="p-1 rounded-lg hover:bg-[#4B2FC4]/10 text-[#4B2FC4] transition-colors">
              <Plus size={14} />
            </button>
          )}
        </div>
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search groups" aria-label="Search groups"
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-border-subtle bg-bg-surface focus:outline-none focus:ring-2 focus:ring-[#4B2FC4]/20" />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {filtered.map((community) => {
          const isCollapsed = collapsed[community._id];
          const comUnread   = community.groups?.reduce((s, g) => s + (g.muted ? 0 : (g.unread ?? 0)), 0) ?? 0;
          const pending     = community.can?.decideRequests ? (community.groupRequests ?? []).filter((r) => r.status === "pending").length : 0;
          const addLabel    = community.can?.createGroup ? "New group" : community.can?.requestGroup ? "Request a group" : null;
          return (
            <div key={community._id} className="mb-1">
              <div className="flex items-center gap-1 px-2 py-1 group">
                <button type="button" onClick={() => toggle(community._id)} aria-expanded={!isCollapsed}
                  className="flex flex-1 min-w-0 items-center gap-1 rounded-md py-0.5 text-left">
                  {isCollapsed ? <ChevronRight size={11} className="text-text-tertiary shrink-0" /> : <ChevronDown size={11} className="text-text-tertiary shrink-0" />}
                  <span className="text-sm shrink-0" aria-hidden="true">{community.icon ?? "💬"}</span>
                  <span className="flex-1 text-xs font-bold text-text-primary truncate">{community.name}</span>
                </button>
                {comUnread > 0 && isCollapsed && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0 tabular-nums" style={{ background: ACCENT }}>
                    {comUnread > 99 ? "99+" : comUnread}
                  </span>
                )}
                {pending > 0 && (
                  <button type="button" onClick={() => onOpenCommunity(community, "requests")} title={`${pending} group request${pending === 1 ? "" : "s"}`}
                    aria-label={`${pending} group requests to decide`}
                    className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-[#4B2FC4] bg-[#4B2FC4]/10 tabular-nums">
                    <Inbox size={10} aria-hidden="true" />{pending}
                  </button>
                )}
                {addLabel && (
                  <button onClick={() => (community.can.createGroup ? onCreateGroup(community) : onRequestGroup(community))}
                    className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded hover:bg-[#4B2FC4]/10 text-[#4B2FC4] transition-opacity" title={addLabel} aria-label={`${addLabel} in ${community.name}`}>
                    <Plus size={11} />
                  </button>
                )}
                <button onClick={() => onOpenCommunity(community, "about")}
                  className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded hover:bg-ink/[0.06] text-text-secondary transition-opacity" title="Community settings" aria-label={`${community.name} settings`}>
                  <Settings size={11} />
                </button>
              </div>
              {!isCollapsed && community.groups?.map((group) => (
                <button key={group._id} onClick={() => onSelectGroup(group, community)}
                  className={`flex items-center gap-2 w-full px-4 py-1.5 rounded-lg text-left transition-colors text-xs ${
                    activeGroupId === group._id ? "font-bold text-white" : "text-text-secondary hover:text-text-primary hover:bg-ink/[0.05]"
                  }`}
                  style={activeGroupId === group._id ? { background: ACCENT } : {}}>
                  <span className="text-sm shrink-0" aria-hidden="true">{group.icon ?? "💬"}</span>
                  <span className="flex-1 truncate">{group.type === "announcement" ? "Announcements" : group.name}</span>
                  {group.muted && <BellOff size={10} className="shrink-0 opacity-70" aria-label="Muted" />}
                  {!group.muted && (group.unread ?? 0) > 0 && activeGroupId !== group._id && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0 tabular-nums" style={{ background: ACCENT }}>
                      {group.unread > 99 ? "99+" : group.unread}
                    </span>
                  )}
                </button>
              ))}
              {!isCollapsed && (community.joinable?.length ?? 0) > 0 && (
                <div className="mt-1 pl-4 pr-2">
                  <p className="text-[11px] font-semibold text-text-tertiary py-1">Other groups</p>
                  {community.joinable.map((g) => (
                    <div key={g._id} className="flex items-center gap-2 py-1 text-xs text-text-secondary">
                      <span className="text-sm shrink-0 opacity-70" aria-hidden="true">{g.icon ?? "💬"}</span>
                      <span className="flex-1 truncate">{g.name}</span>
                      {g.requested
                        ? <span className="text-[11px] text-text-tertiary">Requested</span>
                        : <button type="button" onClick={() => onJoin(g)} className="text-[11px] font-bold text-[#4B2FC4] hover:underline">{g.joinApproval ? "Ask to join" : "Join"}</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredDms.length > 0 && (
          <div className="mt-3">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Direct Messages</p>
            {filteredDms.map((dm) => {
              const name = dm._dmTarget?.name ?? dm.name;
              return (
                <button key={dm._id} onClick={() => onSelectDm(dm)}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-left text-xs transition-colors ${
                    activeGroupId === dm._id ? "font-bold text-white" : "text-slate-500 hover:text-text-primary hover:bg-ink/[0.05]"
                  }`}
                  style={activeGroupId === dm._id ? { background: ACCENT } : {}}>
                  <MessageSquare size={11} className="shrink-0" />
                  <span className="flex-1 truncate">{name}</span>
                  {(dm.unread ?? 0) > 0 && activeGroupId !== dm._id && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: ACCENT }}>{dm.unread}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && filteredDms.length === 0 && (
          <p className="text-xs text-text-tertiary text-center px-4 py-6">{search ? "No groups match." : "You're not in a community yet."}</p>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 p-2 border-t border-ink/[0.06]">
        <button onClick={() => document.dispatchEvent(new CustomEvent("collab:openDm"))}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-[#4B2FC4] hover:bg-[#4B2FC4]/08 border border-[#4B2FC4]/20 transition-colors"
          style={{ background: "rgba(75,47,196,0.04)" }}>
          <MessageSquare size={11} /> New DM
        </button>
      </div>
    </div>
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

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const typingTimer = useRef(null);
  const clientIdRef = useRef(0);

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
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
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
    return () => {
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
    const text = input.trim();
    if (!text || !activeGroup || sending) return;
    const cid = `${currentId}-${++clientIdRef.current}-${Date.now()}`;
    setInput("");
    setSending(true);
    const optimistic = {
      _id: `opt-${cid}`, clientId: cid, channelId: activeGroup._id,
      sender: { _id: currentId, name: user?.name, role: user?.role },
      content: text, createdAt: new Date().toISOString(),
    };
    setMessages((p) => [...p, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      await api.post(`/api/chat/channels/${activeGroup._id}/messages`, { content: text, clientId: cid });
    } catch (err) {
      addToast({ type: "error", message: err?.message ?? "Failed to send." });
      setMessages((p) => p.filter((m) => m.clientId !== cid));
    } finally { setSending(false); inputRef.current?.focus(); }
  }

  function onInputChange(e) {
    setInput(e.target.value);
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

  return (
    <div className="flex h-full bg-bg-base overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-ink/[0.08]" style={{ background: "#F5F6FA" }}>
        <CommunitySidebar
          communities={communities}
          dms={dms}
          activeGroupId={activeGroup?._id}
          onSelectGroup={selectGroup}
          onSelectDm={selectDm}
          userRole={userRole}
          onCreateCommunity={() => setShowCreateCom(true)}
          onCreateGroup={(c) => setCreateGroupFor(c)}
          onRequestGroup={(c) => setRequestFor(c)}
          onOpenCommunity={(c, tab) => setComDrawer({ id: c._id, tab })}
          onJoin={handleJoin}
          search={search}
          setSearch={setSearch}
        />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeGroup ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 shrink-0 border-b border-ink/[0.08]"
              style={{ background: "#F5F6FA" }}>
              <span className="text-lg shrink-0" aria-hidden="true">{activeGroup.icon ?? (activeGroup.type === "dm" ? "👤" : "💬")}</span>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-text-primary truncate">
                  {activeGroup.type === "dm" ? (activeGroup._dmTarget?.name ?? activeGroup.name) : activeGroup.type === "announcement" ? "Announcements" : `#${activeGroup.name}`}
                </h1>
                {activeCommunity && (
                  <p className="text-[11px] text-text-tertiary truncate">{activeCommunity.icon} {activeCommunity.name}</p>
                )}
              </div>
              {activeGroup.type !== "dm" && (
                <button onClick={() => setShowGroupInfo(true)} aria-label="Group settings"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 text-text-secondary hover:bg-ink/[0.06]">
                  <Settings size={14} aria-hidden="true" /> Group settings
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-2">
              {hasMore && (
                <div className="flex justify-center py-2">
                  <button onClick={() => loadMessages(activeGroup._id, messages[0]?.createdAt)} disabled={msgLoading}
                    className="flex items-center gap-1.5 text-xs text-[#4B2FC4] hover:underline disabled:opacity-40">
                    {msgLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Load earlier
                  </button>
                </div>
              )}
              {messages.map((msg) => (
                <MessageItem
                  key={msg._id} msg={msg}
                  currentUserId={currentId}
                  isGroupAdmin={isGroupAdmin}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPin={handlePin}
                  onReact={handleReact}
                />
              ))}
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
                <p className="text-xs text-text-tertiary text-center py-1.5">Only admins{activeGroup.type === "announcement" ? ", and people they allow," : ""} can post here.</p>
              ) : (
                <div className="flex items-end gap-2 rounded-xl px-3 py-2"
                  style={{ border: "1px solid rgba(75,47,196,0.18)", background: "white" }}>
                  <textarea ref={inputRef} value={input} onChange={onInputChange} rows={1}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    aria-label={activeGroup.type === "announcement" ? "Write an announcement" : "Message"}
                    placeholder={activeGroup.type === "announcement" ? "Write an announcement for everyone in this community…" : `Message ${activeGroup.type === "dm" ? (activeGroup._dmTarget?.name ?? "") : "#" + activeGroup.name}`}
                    className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-slate-400 focus:outline-none resize-none max-h-32"
                    style={{ lineHeight: "1.5" }} />
                  <button onClick={sendMessage} disabled={sending || !input.trim()} aria-label={activeGroup.type === "announcement" ? "Post announcement" : "Send message"}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-30"
                    style={{ background: ACCENT }}>
                    {sending ? <Loader2 size={14} className="animate-spin text-white" /> : <Send size={14} strokeWidth={2} className="text-white" />}
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center px-8">
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
