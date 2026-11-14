// Plain labels for challenges (UX §8).
export const TYPE_LABEL = { daily: "Daily", weekly: "Weekly", sprint: "Sprint", custom: "Custom" };
export const STATUS_LABEL = { draft: "Draft", active: "Active", completed: "Completed", expired: "Expired" };
export const STATUS_KEY = { draft: "pending", active: "active", completed: "approved", expired: "on_hold" };
export const SCOPE_LABEL = { individual: "One person", team: "Team", organisation: "Whole organization" };
const UNIT = { tasks_completed: "tasks done", on_time_tasks: "on-time tasks", avg_quality: "★ average quality", streak_days: "streak days" };
export const goal = (q) => `${q.target} ${UNIT[q.metric] ?? ""}`.trim();
export const reward = (q) => `${q.rewardXp} XP${q.rewardGold ? ` + ${q.rewardGold} gold` : ""}`;
