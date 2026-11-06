import { create } from "zustand";
import api    from "@/lib/api";
import socket from "@/utils/socket";

export { toCategory, notifRedirectPath } from "@/utils/notifRoutes";

// ── Store ─────────────────────────────────────────────────────────────────────
let onNotif = null; // the single "notification:new" listener owned by this store

const useNotificationStore = create((set, get) => ({
  notifications:  [],
  unreadCount:    0,
  loaded:         false,
  loading:        false,

  // ── Fetch all notifications ──────────────────────────────────────────────
  fetch: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const data  = await api.get("/api/notifications");
      const notifs = data.notifications ?? [];
      set({
        notifications: notifs,
        unreadCount:   notifs.filter((n) => !n.read).length,
        loaded:        true,
      });
    } catch { /* silent */ } finally {
      set({ loading: false });
    }
  },

  // ── Mark single notification read ────────────────────────────────────────
  markRead: async (id) => {
    // Optimistic update
    set((s) => {
      const notifications = s.notifications.map((n) =>
        n._id === id ? { ...n, read: true } : n
      );
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    });
    try {
      await api.patch(`/api/notifications/${id}/read`, {});
    } catch { /* best-effort — state already updated */ }
  },

  // ── Mark all read ────────────────────────────────────────────────────────
  markAllRead: async () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount:   0,
    }));
    try {
      await api.patch("/api/notifications/read-all", {});
    } catch { /* best-effort */ }
  },

  // ── Delete one ───────────────────────────────────────────────────────────
  deleteOne: async (id) => {
    set((s) => {
      const notifications = s.notifications.filter((n) => n._id !== id);
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    });
    try {
      await api.delete(`/api/notifications/${id}`);
    } catch { /* best-effort */ }
  },

  // ── Delete all ───────────────────────────────────────────────────────────
  deleteAll: async () => {
    set({ notifications: [], unreadCount: 0 });
    try {
      await api.delete("/api/notifications");
    } catch { /* best-effort */ }
  },

  // ── Add notification arriving from socket ────────────────────────────────
  _push: (notif) => {
    set((s) => ({
      notifications: [notif, ...s.notifications],
      unreadCount:   s.unreadCount + (notif.read ? 0 : 1),
    }));
  },

  // ── Set up socket listeners (call once on workspace mount) ───────────────
  initSocket: () => {
    // FE-038: remove only our own listener, never other components' listeners
    if (onNotif) socket.off("notification:new", onNotif);
    // FE-041: some server events carry only { type }. Without an _id there is nothing to show, so reload the list.
    onNotif = (notif) => { if (notif?._id) get()._push(notif); else get().fetch(); };
    socket.on("notification:new", onNotif);
  },

  // ── Tear down (call on workspace unmount) ────────────────────────────────
  destroySocket: () => {
    if (onNotif) socket.off("notification:new", onNotif);
    onNotif = null;
  },
}));

export default useNotificationStore;
