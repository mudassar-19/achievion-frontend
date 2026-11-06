import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, Send, Plus, Loader2, AlertCircle } from "lucide-react";
import useAuthStore from "@/stores/authStore";
import api         from "@/lib/api";
import socket      from "@/utils/socket";

import TallyLoader from "@/components/ui/TallyLoader";
import { avatarUrl as localAvatar } from "@/lib/avatar";
// ── Helpers ───────────────────────────────────────────────────────────────────
function avatarUrl(style, seed) {
  return localAvatar(style || "bottts", seed || "user");
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const ROLE_COLORS = {
  Director:         "text-violet-400",
  Manager:          "text-blue-400",
  "Team Lead":      "text-indigo-400",
  "Senior Developer":"text-cyan-400",
  "Junior Developer":"text-cyan-300",
  "Senior Designer": "text-pink-400",
  "Junior Designer": "text-pink-300",
  "Senior Tester":   "text-amber-400",
  "Junior Tester":   "text-amber-300",
};

function RoleBadge({ role }) {
  const color = ROLE_COLORS[role] ?? "text-slate-400";
  return (
    <span className={`text-[14px] font-bold uppercase tracking-wider ${color}`}>{role}</span>
  );
}

// ── Channel list item ─────────────────────────────────────────────────────────
function ChannelItem({ channel, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs font-medium transition-colors duration-100",
        isActive
          ? "bg-accent/10 text-accent-text"
          : "text-slate-500 hover:text-slate-700 hover:bg-ink/[0.04]",
      ].join(" ")}
    >
      <span className="flex items-center gap-1.5 truncate">
        <Hash size={11} strokeWidth={2} className="shrink-0" />
        <span className="truncate">{channel.name}</span>
      </span>
      {channel.unread > 0 && (
        <span className="shrink-0 h-4 min-w-4 px-1 rounded-full bg-accent text-accent-on text-[14px] font-black flex items-center justify-center">
          {channel.unread > 99 ? "99+" : channel.unread}
        </span>
      )}
    </button>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, showHeader }) {
  const sender = msg.sender ?? {};
  return (
    <div className={`flex items-start gap-3 py-1 px-3 rounded-xl hover:bg-ink/[0.025] transition-colors ${showHeader ? "mt-3" : "mt-0"}`}>
      {showHeader ? (
        <div className="h-8 w-8 rounded-full overflow-hidden border border-ink/[0.08] shrink-0 bg-[#FFFFFF] mt-0.5">
          <img
            src={avatarUrl(sender.avatarStyle, sender.avatarSeed ?? sender.name)}
            alt={sender.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={`text-sm font-bold ${isOwn ? "text-accent-text" : "text-text-primary"}`}>
              {sender.name ?? "Unknown"}
            </span>
            {sender.role && <RoleBadge role={sender.role} />}
            <span className="text-[14px] text-slate-700">{formatTime(msg.createdAt)}</span>
          </div>
        )}
        <p className="text-sm text-slate-400 leading-relaxed break-words whitespace-pre-wrap">
          {msg.content}
        </p>
        {msg.editedAt && (
          <span className="text-[14px] text-slate-700 italic">(edited)</span>
        )}
      </div>
    </div>
  );
}

// ── Create channel modal ──────────────────────────────────────────────────────
function CreateChannelModal({ onClose, onCreated, orgDepts = [] }) {
  const [name, setName]   = useState("");
  const [dept, setDept]   = useState("general");
  const [err,  setErr]    = useState("");
  const [busy, setBusy]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setErr("Channel name is required"); return; }
    setBusy(true);
    try {
      const channel = await api.post("/api/chat/channels", { name: name.trim(), department: dept });
      onCreated(channel);
      onClose();
    } catch (ex) {
      setErr(ex.message ?? "Failed to create channel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm mx-4 rounded-2xl bg-[#FFFFFF] border border-ink/10 p-6 flex flex-col gap-4"
      >
        <h2 className="text-base font-black text-text-primary">Create Channel</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="channel-name"
            className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-ink/10 text-sm text-text-primary placeholder:text-slate-600 focus:outline-none focus:border-accent/40"
            autoFocus
          />
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-ink/10 text-sm text-slate-300 focus:outline-none focus:border-accent/40"
          >
            <option value="general">general</option>
            {orgDepts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {err && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={12} /> {err}
            </p>
          )}
          <div className="flex gap-2 justify-end mt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-text-primary hover:bg-ink/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-accent text-accent-on hover:bg-cyan-300 disabled:opacity-50 transition-colors"
            >
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TeamChatLayout() {
  const user  = useAuthStore((s) => s.user);

  const [channels,     setChannels]     = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [typingUsers,  setTypingUsers]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [showCreate,   setShowCreate]   = useState(false);
  const [error,        setError]        = useState("");

  const messagesEndRef   = useRef(null);
  const typingTimerRef   = useRef(null);
  const activeChannelRef = useRef(null);
  const inputRef         = useRef(null);

  const canManage = ["Manager", "Team Lead", "Director"].includes(user?.role);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // ── Switch channel ──────────────────────────────────────────────────────────
  const switchChannel = useCallback(async (channel) => {
    if (activeChannelRef.current?._id === channel._id) return;

    if (activeChannelRef.current) {
      socket.emit("chat:leave", { channelId: activeChannelRef.current._id });
    }

    activeChannelRef.current = channel;
    setActiveChannel(channel);
    setMessages([]);
    setTypingUsers([]);
    setLoadingMsgs(true);

    socket.emit("chat:join", { channelId: channel._id });

    try {
      const data = await api.get(`/api/chat/channels/${channel._id}/messages`);
      setMessages(data);
      setChannels((prev) => prev.map((ch) => ch._id === channel._id ? { ...ch, unread: 0 } : ch));
      await api.post(`/api/chat/channels/${channel._id}/read`);
    } catch {
      // non-fatal
    } finally {
      setLoadingMsgs(false);
      setTimeout(() => scrollToBottom("instant"), 50);
    }
  }, [scrollToBottom]);

  // ── Mount: load channels + bind socket events ────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      try {
        const data = await api.get("/api/chat/channels");
        if (!mounted) return;
        setChannels(data);
        if (data.length > 0) await switchChannel(data[0]);
      } catch (ex) {
        if (mounted) setError(ex.message ?? "Failed to load channels");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    // ── Socket handlers ─────────────────────────────────────────────────────
    function onNewMessage(msg) {
      const currentId = activeChannelRef.current?._id?.toString();
      if (msg.channelId?.toString() === currentId) {
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
      } else {
        setChannels((prev) =>
          prev.map((ch) =>
            ch._id?.toString() === msg.channelId?.toString()
              ? { ...ch, unread: (ch.unread || 0) + 1 }
              : ch
          )
        );
      }
    }

    function onTyping({ userId, username }) {
      if (userId === user?._id || userId === user?.id) return;
      setTypingUsers((prev) => {
        const already = prev.find((u) => u.userId === userId);
        if (already) return prev;
        return [...prev, { userId, username }];
      });
    }

    function onStopTyping({ userId }) {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    }

    socket.on("chat:new_message", onNewMessage);
    socket.on("chat:typing",      onTyping);
    socket.on("chat:stop_typing", onStopTyping);

    return () => {
      mounted = false;
      socket.off("chat:new_message", onNewMessage);
      socket.off("chat:typing",      onTyping);
      socket.off("chat:stop_typing", onStopTyping);
      if (activeChannelRef.current) {
        socket.emit("chat:leave", { channelId: activeChannelRef.current._id });
      }
    };
  }, [scrollToBottom, switchChannel, user?._id, user?.id]);

  // ── Send message ────────────────────────────────────────────────────────────
  function sendMessage() {
    if (!input.trim() || !activeChannel) return;

    socket.emit("chat:message", {
      channelId: activeChannel._id,
      content:   input.trim(),
      senderId:  user?.id ?? user?._id,
      orgId:     user?.orgId,
    });

    setInput("");
    clearTimeout(typingTimerRef.current);
    socket.emit("chat:stop_typing", {
      channelId: activeChannel._id,
      userId:    user?.id ?? user?._id,
    });
    inputRef.current?.focus();
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    if (!activeChannel) return;

    const uid = user?.id ?? user?._id;
    socket.emit("chat:typing", {
      channelId: activeChannel._id,
      userId:    uid,
      username:  user?.name,
    });

    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("chat:stop_typing", { channelId: activeChannel._id, userId: uid });
    }, 1500);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ── Partition channels ───────────────────────────────────────────────────────
  const defaultChannels = channels.filter((ch) => ch.isDefault);
  const deptChannels    = channels.filter((ch) => !ch.isDefault);

  const charCount = input.length;
  const nearLimit = charCount > 1800;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <TallyLoader />
          <p className="text-sm text-slate-500">Loading channels…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <AlertCircle size={24} className="text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex overflow-hidden">
        {/* ── Left sidebar ────────────────────────────────────────────────── */}
        <div className="w-[220px] shrink-0 flex flex-col border-r border-ink/[0.06] bg-[#F5F6FA]">
          <div className="px-4 py-4 border-b border-ink/[0.06] flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-text-primary tracking-tight">Channels</p>
              <p className="text-[14px] text-slate-600 font-medium mt-0.5">
                {user?.department ?? "Organisation"}
              </p>
            </div>
            {canManage && (
              <button
                onClick={() => setShowCreate(true)}
                title="Create channel"
                className="p-1 rounded-lg text-slate-600 hover:text-accent-text hover:bg-accent/10 transition-colors"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-4">
            {defaultChannels.length > 0 && (
              <div>
                <p className="text-[14px] font-black uppercase tracking-[0.18em] text-slate-700 px-2 mb-2">
                  General
                </p>
                {defaultChannels.map((ch) => (
                  <ChannelItem
                    key={ch._id}
                    channel={ch}
                    isActive={activeChannel?._id === ch._id}
                    onClick={() => switchChannel(ch)}
                  />
                ))}
              </div>
            )}

            {deptChannels.length > 0 && (
              <div>
                <p className="text-[14px] font-black uppercase tracking-[0.18em] text-slate-700 px-2 mb-2">
                  Department
                </p>
                {deptChannels.map((ch) => (
                  <ChannelItem
                    key={ch._id}
                    channel={ch}
                    isActive={activeChannel?._id === ch._id}
                    onClick={() => switchChannel(ch)}
                  />
                ))}
              </div>
            )}

            {channels.length === 0 && (
              <p className="text-xs text-slate-700 px-2">No channels yet.</p>
            )}
          </div>
        </div>

        {/* ── Main chat area ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="shrink-0 flex items-center gap-2 px-5 py-3.5 border-b border-ink/[0.06] bg-[#FFFFFF]/80 backdrop-blur-sm">
            <Hash size={15} className="text-slate-500 shrink-0" strokeWidth={2} />
            <p className="text-sm font-bold text-text-primary">
              {activeChannel?.name ?? "Select a channel"}
            </p>
            {activeChannel && !activeChannel.isDefault && (
              <span className="text-[14px] text-slate-600 font-medium">
                · {activeChannel.department}
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col">
            {loadingMsgs ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={20} className="text-accent-text animate-spin" strokeWidth={1.5} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                <Hash size={32} className="text-slate-700" strokeWidth={1.5} />
                <p className="text-sm text-slate-600">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                {messages.map((msg, i) => {
                  const prev       = messages[i - 1];
                  const showHeader =
                    !prev ||
                    prev.sender?._id?.toString() !== msg.sender?._id?.toString() ||
                    new Date(msg.createdAt) - new Date(prev.createdAt) > 5 * 60 * 1000;
                  const isOwn =
                    msg.sender?._id?.toString() === (user?.id ?? user?._id)?.toString();

                  return (
                    <MessageBubble
                      key={msg._id}
                      msg={msg}
                      isOwn={isOwn}
                      showHeader={showHeader}
                    />
                  );
                })}

                {/* Typing indicator */}
                <AnimatePresence>
                  {typingUsers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="flex items-center gap-2 px-3 mt-2"
                    >
                      <div className="flex gap-0.5">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="block h-1.5 w-1.5 rounded-full bg-accent/60"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-600 italic">
                        {typingUsers.map((u) => u.username).join(", ")}{" "}
                        {typingUsers.length === 1 ? "is" : "are"} typing…
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="shrink-0 px-5 py-3.5 border-t border-ink/[0.06]">
            {nearLimit && (
              <p className="text-right text-[14px] mb-1 text-amber-400">
                {charCount}/2000
              </p>
            )}
            <div className="flex items-end gap-2 px-4 py-2.5 rounded-xl bg-[#FFFFFF] border border-ink/[0.08] focus-within:border-accent/35 transition-colors duration-150">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={activeChannel ? `Message #${activeChannel.name}` : "Select a channel"}
                disabled={!activeChannel}
                maxLength={2000}
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-slate-600 focus:outline-none resize-none max-h-36 leading-relaxed disabled:opacity-40"
                style={{ fieldSizing: "content" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || !activeChannel}
                className={[
                  "shrink-0 p-1.5 rounded-lg transition-colors mb-0.5",
                  input.trim() && activeChannel
                    ? "text-accent-text hover:bg-accent/10"
                    : "text-slate-700 cursor-not-allowed",
                ].join(" ")}
              >
                <Send size={14} strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[14px] text-slate-700 mt-1.5 px-1">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Create channel modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateChannelModal
            onClose={() => setShowCreate(false)}
            onCreated={(ch) => {
              setChannels((prev) => [...prev, { ...ch, unread: 0 }]);
              switchChannel({ ...ch, unread: 0 });
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
