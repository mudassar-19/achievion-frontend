// Loads one report tab for the filters in the URL. Same query string goes to the export.
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

export const FILTER_KEYS = ["project", "module", "sprint", "range", "from", "to"];

export function reportQuery(sp, extra = []) {
  const q = new URLSearchParams();
  for (const k of [...FILTER_KEYS, ...extra]) if (sp.get(k)) q.set(k, sp.get(k));
  if (q.get("range") !== "custom") { q.delete("from"); q.delete("to"); }
  return q.toString();
}

export default function useReport(path, query, base = "/api/manager/reports") {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  // quiet = refresh after a save: keep showing the current data instead of a skeleton.
  const load = useCallback(async (quiet) => {
    if (quiet !== true) { setError(null); setData(null); }
    try { setData(await api.get(`${base}/${path}?${query}`)); }
    catch (e) { if (quiet === true) throw e; setError(e?.message ?? "The report could not be loaded."); }
  }, [path, query, base]);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect
  return { data, error, reload: load };
}

export const CHART = {
  axis: { fontSize: 12, fill: "#5B6576" },
  axisLine: { stroke: "rgba(16,24,40,0.12)" },
  grid: "rgba(16,24,40,0.06)",
  tooltip: { borderRadius: 12, border: "1px solid rgba(16,24,40,0.08)", fontSize: 12 },
  // Well-being groups: validated status steps (dataviz validator, light surface); always shown with labels.
  tiers: [["Healthy", "Doing fine", "#0E9F6E"], ["Tired", "Getting tired", "#E8A317"], ["Low", "Needs a lighter load", "#C81E1E"]],
};

export const signed = (n, suffix = "") => (n == null ? null : `${n > 0 ? "+" : ""}${n}${suffix}`);
