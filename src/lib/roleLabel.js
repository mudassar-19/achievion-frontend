// X-7 / A-2 (D-QA3B-3): the title a person sees = their custom role (fallback: system role). The system role / level is a small badge.
// One helper for every portal, chart and list. Pure: roleLabel.test.mjs.

const clean = (s) => (typeof s === "string" ? s.trim() : "");

/** "Senior Full-Stack Developer" (custom role) or, when none is set, "Senior Developer" (system role). */
export const roleLabel = (p) => clean(p?.roleLabel) || clean(p?.customRole?.name) || clean(p?.customRole) || clean(p?.role) || "";

/** The small badge: the system role/level, shown only when it adds something beyond the title. */
export function roleBadge(p) {
  const title = roleLabel(p), sys = clean(p?.role);
  return sys && sys.toLowerCase() !== title.toLowerCase() ? sys : "";
}

/** "Senior Full-Stack Developer" or "Senior Full-Stack Developer · Senior Developer" for tooltips. */
export const roleFull = (p) => [roleLabel(p), roleBadge(p)].filter(Boolean).join(" · ");
