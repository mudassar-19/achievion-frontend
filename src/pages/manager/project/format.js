// Shared date formatting (Manager + Team Lead pages). U-1 (D-131): follows the person's time zone and date/time format.
import useAuthStore from "@/stores/authStore";

const prefs = () => useAuthStore.getState().user?.settings?.preferences ?? {};
const LOCALE = { mdy: "en-US", dmy: "en-GB" };
function dateText(date, withYear) {
  const p = prefs(), timeZone = p.timezone || undefined;
  if (p.dateFormat === "iso") return date.toLocaleDateString("en-CA", { timeZone });
  return date.toLocaleDateString(LOCALE[p.dateFormat], { month: "short", day: "numeric", ...(withYear && { year: "numeric" }), timeZone });
}
const timeText = (date) => { const p = prefs(); return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: p.timeFormat !== "24h", timeZone: p.timezone || undefined }); };
// "Nov 5, 2026"
export const fmt = (d) => (d ? dateText(new Date(d), true) : "—");
// "Nov 5"
export const fmtShort = (d) => (d ? dateText(new Date(d), false) : "—");
// "Nov 5, 11:42 AM" (the year only when it is not this year)
export const fmtDateTime = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return `${dateText(date, date.getFullYear() !== new Date().getFullYear())}, ${timeText(date)}`;
};
