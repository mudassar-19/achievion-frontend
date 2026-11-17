// QA2-71: the task timer lives in this browser (one start time per task). Submitting stops it and logs the elapsed minutes
// first, because the server takes no time on a task once it is in review or done.
import api from "@/lib/api";

export const timerKey = (taskId) => `achievion:timer:${taskId}`;
export const timeLocked = (status) => status === "In-Review" || status === "Done";

// Returns the minutes logged (0 when no timer was running). The timer is cleared even if the log call fails.
export async function stopTimerAndLog(taskId) {
  let started = null;
  try { started = Number(localStorage.getItem(timerKey(taskId))) || null; localStorage.removeItem(timerKey(taskId)); } catch { /* storage blocked */ }
  if (!started) return 0;
  const minutes = Math.min(1440, Math.max(1, Math.ceil((Date.now() - started) / 60000)));
  try { await api.post(`/api/tasks/${taskId}/time-log`, { minutes, note: "Timer (stopped on submit)" }); return minutes; }
  catch { return 0; }
}
