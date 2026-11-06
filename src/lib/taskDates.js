// FE-R008: the Team Lead form saves startDate/endDate while other screens read `deadline`.
// Until the two are unified on the server, use endDate when deadline is empty.
export const withDeadline = (t) => (t && !t.deadline && t.endDate ? { ...t, deadline: t.endDate } : t);
