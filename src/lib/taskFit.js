// Item 54: soft warnings when the work and the person's role do not match, and an assignee suggestion that prefers a fitting
// role. Only advice: the Team Lead decides (D-011), nothing here blocks. The table is the server's ROLE_TASK_ELIGIBILITY by category.
const ELIGIBLE = { developer: ["Feature", "Bug", "DevOps", "Documentation"], designer: ["Design", "Documentation"], tester: ["Testing", "Bug", "Documentation"] };
const BETTER = { Design: "Designer", Testing: "Tester", Feature: "Developer", Bug: "Developer", DevOps: "Developer" };
const DOMAIN = { Feature: "development", Bug: "development", DevOps: "development", Design: "design", Testing: "testing" }; // Documentation: any

const categoryOf = (role) => (/Developer/.test(role) ? "developer" : /Designer/.test(role) ? "designer" : /Tester/.test(role) ? "tester" : null);

// Leaders (Team Lead, Manager, Director) and unknown roles are not judged by category.
export const roleFits = (role, type) => { const c = categoryOf(role ?? ""); return !c || !type || ELIGIBLE[c].includes(type); };

export function fitWarning(member, type) {
  if (roleFits(member?.role, type)) return null;
  return `${member.name} is a ${member.role}; this is a ${type} task. You can still assign them, but a ${BETTER[type]} fits better.`;
}

// A subtask whose domain differs from its parent's ("login (development) under a Design task").
export function domainWarning(parentType, childType) {
  const p = DOMAIN[parentType], c = DOMAIN[childType];
  if (!p || !c || p === c) return null;
  return `A ${c} subtask under a ${p} task. Check the parent, or who it is given to.`;
}

// "Most room": fitting roles first, then not overloaded, then fewest active tasks. null for an empty team.
export function suggestFor(team, type) {
  return [...team].sort((a, b) => (!roleFits(a.role, type)) - (!roleFits(b.role, type)) || (a.status === "Overloaded") - (b.status === "Overloaded") || a.activeTasks - b.activeTasks)[0] ?? null;
}
