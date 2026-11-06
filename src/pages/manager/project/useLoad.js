import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

// GET url → { data, error, reload, setData }. data null while loading.
export default function useLoad(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    setError(null); setData(null);
    if (!url) return;
    try { setData(await api.get(url)); } catch (e) { setError(e?.message ?? "This could not be loaded."); }
  }, [url]);
  useEffect(() => { reload(); }, [reload]); // eslint-disable-line react-hooks/set-state-in-effect
  return { data, error, reload, setData };
}
