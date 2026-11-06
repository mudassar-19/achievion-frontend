import { create } from "zustand";
import api from "@/lib/api";

import { withDeadline } from "@/lib/taskDates";
const useTaskStore = create((set) => ({
  tasks:   [],
  loading: false,
  error:   null,
  filters: { status: null, priority: null, type: null },

  fetchTasks: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v != null && v !== "")
      );
      const query = new URLSearchParams(clean).toString();
      const data  = await api.get(`/api/tasks${query ? `?${query}` : ""}`);
      set({ tasks: (data.tasks ?? []).map(withDeadline), loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  createTask: async (taskData) => {
    const data = await api.post("/api/tasks", taskData);
    set((s) => ({ tasks: [data.task, ...s.tasks] }));
    return data.task;
  },

  updateTaskStatus: async (id, status) => {
    await api.patch(`/api/tasks/${id}/status`, { status });
    set((s) => ({
      tasks: s.tasks.map((t) => (t._id === id ? { ...t, status } : t)),
    }));
  },

  submitTask: async (id, formData) => {
    const data = await api.upload(`/api/tasks/${id}/submit`, formData);
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t._id === id
          ? { ...t, status: "In-Review", submittedAt: new Date().toISOString() }
          : t
      ),
    }));
    return data;
  },

  approveTask: async (id) => {
    const data = await api.post(`/api/tasks/${id}/approve`, {});
    set((s) => ({
      tasks: s.tasks.map((t) => (t._id === id ? { ...t, status: "Done" } : t)),
    }));
    return data;
  },

  rejectTask: async (id, feedback) => {
    await api.post(`/api/tasks/${id}/reject`, { feedback });
    set((s) => ({
      tasks: s.tasks.map((t) => (t._id === id ? { ...t, status: "In-Progress" } : t)),
    }));
  },

  addComment: async (id, text) => {
    const data = await api.post(`/api/tasks/${id}/comment`, { text });
    set((s) => ({
      tasks: s.tasks.map((t) => (t._id === id ? { ...t, comments: data.comments } : t)),
    }));
    return data.comments;
  },

  logTime: async (id, minutes, note = "") => {
    const data = await api.post(`/api/tasks/${id}/time-log`, { minutes, note });
    set((s) => ({
      tasks: s.tasks.map((t) => (t._id === id ? { ...t, timeLogs: data.timeLogs } : t)),
    }));
    return data.timeLogs;
  },

  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters } })),
}));

export default useTaskStore;
