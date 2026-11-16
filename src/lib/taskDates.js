// FE-R008: the Team Lead form saves startDate/endDate while other screens read `deadline`.
// Until the two are unified on the server, use endDate when deadline is empty.
export const withDeadline = (t) => (t && !t.deadline && t.endDate ? { ...t, deadline: t.endDate } : t);

// Item 50: a start date cannot be before today. `unchanged` = the date an existing record already has (not re-checked).
// Uses the browser's local day; the server decides with the org timezone and answers 400 with the same message.
export const PAST_START = "Start date cannot be in the past.";
export const todayLocal = () => new Date().toLocaleDateString("en-CA");
export const pastStart = (value, unchanged = "") => (value && value !== unchanged && value < todayLocal() ? PAST_START : undefined);
