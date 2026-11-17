// Shared date formatting (Manager + Team Lead pages). X-1 (D-QA3B-1): thin wrappers over the one app-wide helper in lib/dates.js.
import { fmtDate, fmtDateTime as dateTime } from "@/lib/dates";

// "5 Nov 2026"
export const fmt = (d) => fmtDate(d);
// "5 Nov"
export const fmtShort = (d) => fmtDate(d, { year: false });
// "5 Nov 2026, 11:42 AM"
export const fmtDateTime = (d) => dateTime(d);
