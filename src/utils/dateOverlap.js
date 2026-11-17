// QA2-65: a project is "between" a date range when its life (start to deadline) overlaps the range:
// start <= range end and deadline >= range start. A missing start counts as "always started"; a missing deadline as "no end".
// from/to are "YYYY-MM-DD" strings from the date inputs ("" = open end).
export function overlapsRange(project, from, to) {
  const start = project.startDate ? +new Date(project.startDate) : -Infinity;
  const end = project.deadline ? +new Date(project.deadline) : Infinity;
  if (from && end < +new Date(`${from}T00:00:00`)) return false;
  if (to && start > +new Date(`${to}T23:59:59.999`)) return false;
  return true;
}
