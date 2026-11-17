// AI answers on screen (QA3 B-6, QA4 Y-1): dates in the app's format, source chips with a name, never the raw fact line.
import { fmtDate } from "./dates.js";
import { humanizeText } from "./humanize.js";

// "11/23/2026" (US) and "2026-11-23" -> the person's date format. A US date with a month over 12 cannot be D/M, so it is read as M/D.
export function aiText(text) {
  return humanizeText(String(text ?? ""))
    .replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (m, a, b, y) => (Number(a) <= 12 ? fmtDate(new Date(Number(y), Number(a) - 1, Number(b), 12)) : m))
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b(?!T)/g, (m, y, mo, d) => fmtDate(new Date(Number(y), Number(mo) - 1, Number(d), 12)));
}

// "Project: FleetTrack Driver App Status: Active Progress: 42%..." -> "FleetTrack Driver App". Keeps the source kind ("Project") as the lead.
export function sourceLabel(c) {
  const kind = String(c?.source ?? "").trim();
  const raw = String(c?.text ?? "").replace(/^[A-Za-z ]+:\s*/, "");
  const name = raw.split(/\s+(?:Status|Progress|Health|Deadline|Due|Score|Tasks?|Members?):/)[0].trim().slice(0, 80);
  return [kind, name].filter(Boolean).join(": ") || "Source";
}
