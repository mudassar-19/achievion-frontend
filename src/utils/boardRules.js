// Kanban drag rules (V1 1.8, TC-TM-02). Mirrors the server (taskController.updateTaskStatus);
// the server stays the authority, this only explains a refused drop before it is sent.
// Returns null when the move is allowed, else a short reason for the user.
export const SUBMIT = "submit"; // employee drop into In-Review → open the submit form instead of moving

export function moveVerdict({ role, roleCategory, task, to, isAssignee }) {
  const from = task.status;
  if (from === to) return { ok: false, reason: null };
  if (to === "Done") return { ok: false, reason: "Tasks reach Done when the Team Lead approves them on the review screen." };
  if (from === "Done") return { ok: false, reason: "Done tasks can't be moved." };

  const isLead = role === "Team Lead" || role === "Manager";
  const isEmployee = ["developer", "designer", "tester"].includes(roleCategory);

  if (isEmployee) {
    if (!isAssignee) return { ok: false, reason: "You can only move tasks assigned to you." };
    if (from === "To-Do" && to === "In-Progress") return { ok: true };
    if (from === "In-Progress" && to === "In-Review") return { ok: true, action: SUBMIT };
    return { ok: false, reason: "You can move a task forward only: To Do → In Progress → Submit for review." };
  }
  if (isLead) {
    if (from === "In-Review") return { ok: false, reason: "Send a task back from the review screen, with feedback." };
    if (to === "In-Review") return { ok: false, reason: "The assignee submits the task for review." };
    return { ok: true }; // Backlog / To-Do / In-Progress
  }
  return { ok: false, reason: "Your role can view this board but not move tasks." };
}
