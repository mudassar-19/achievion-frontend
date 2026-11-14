// View as (AUTH-11, M-8, D-109): top-bar menu for Directors and Managers + the permanent read-only banner.
// The server decides who may be viewed (Manager: people on their own projects; Director: the whole org).
import { useEffect, useRef, useState } from "react";
import { Eye, LogOut, Search } from "lucide-react";
import api from "@/lib/api";
import useAuthStore from "@/stores/authStore";


export function ViewAsMenu() {
  const viewAs = useAuthStore((s) => s.viewAs);
  const startViewAs = useAuthStore((s) => s.startViewAs);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(null);
  const box = useRef(null);
  const search = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setError(null); // eslint-disable-line react-hooks/set-state-in-effect
    api.get("/api/auth/view-as/candidates", { silent: true }).then((d) => { setData(d); setRole((r) => r || d.roles[0]); setTimeout(() => search.current?.focus(), 0); }).catch((e) => setError(e?.message ?? "Could not load people."));
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open]);

  if (viewAs) return null; // no nested view

  async function go(p) {
    setBusy(p.id); setError(null);
    try { await startViewAs(p.id); } catch (e) { setError(e?.message ?? "Could not start the view."); setBusy(null); }
  }

  const people = (data?.people ?? []).filter((p) => p.group === role && p.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog"
        className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-semibold text-text-secondary transition-colors hover:bg-ink/[0.05] hover:text-text-primary">
        <Eye size={15} aria-hidden="true" /><span className="hidden sm:inline">View as</span><span className="sr-only sm:hidden">View as</span>
      </button>
      {open && (
        <div role="dialog" aria-label="View as" className="absolute right-0 top-11 z-50 flex w-[300px] flex-col gap-3 rounded-2xl border border-ink/[0.08] bg-white p-3 shadow-xl">
          <p className="text-xs text-text-secondary">See the portal as someone else sees it. Read-only, for 30 minutes.</p>
          {error && <p role="alert" className="text-xs font-semibold text-[#B01F17]">{error}</p>}
          {!data && !error && <p role="status" className="text-xs text-text-secondary">Loading people…</p>}
          {data && (
            <>
              <div role="radiogroup" aria-label="Role" className="flex flex-wrap gap-1">
                {data.roles.map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}
                    className={`min-h-8 rounded-full border px-2.5 text-xs font-semibold transition-colors ${role === r ? "border-accent bg-accent/[0.08] text-accent-text" : "border-ink/[0.1] text-text-secondary hover:text-text-primary"}`}>{r}</button>
                ))}
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-ink/[0.1] px-2.5">
                <Search size={13} aria-hidden="true" className="text-slate-500" />
                <span className="sr-only">Search people</span>
                <input ref={search} type="search" name="view-as-search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm shadow-none focus:shadow-none" />
              </label>
              <ul className="flex max-h-64 flex-col overflow-y-auto overscroll-contain" aria-label={`${role} people`}>
                {people.length ? people.map((p) => (
                  <li key={p.id}>
                    <button type="button" disabled={!!busy} onClick={() => go(p)}
                      className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-sm hover:bg-ink/[0.04] disabled:opacity-50">
                      <span className="min-w-0 truncate font-semibold text-text-primary">{p.name}</span>
                      <span className="shrink-0 text-xs text-text-secondary">{busy === p.id ? "Opening…" : p.role}</span>
                    </button>
                  </li>
                )) : <li className="px-2 py-3 text-xs text-text-secondary">{data.people.length ? `No ${role} matches.` : "Nobody to view as yet."}</li>}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Fixed, cannot be dismissed. Ends the view itself when the 30 minutes are up.
export function ViewAsBanner() {
  const viewAs = useAuthStore((s) => s.viewAs);
  const user = useAuthStore((s) => s.user);
  const exitViewAs = useAuthStore((s) => s.exitViewAs);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(() =>
    viewAs?.expiresAt ? Math.max(0, Math.floor((new Date(viewAs.expiresAt) - Date.now()) / 1000)) : null
  );
  useEffect(() => {
    if (!viewAs?.expiresAt) return undefined;
    const id = setInterval(() => {
      const secs = Math.max(0, Math.floor((new Date(viewAs.expiresAt) - Date.now()) / 1000));
      setRemaining(secs);
      if (secs === 0) exitViewAs();
    }, 1000);
    return () => clearInterval(id);
  }, [viewAs?.expiresAt, exitViewAs]);
  if (!viewAs) return null;
  const mmss = remaining != null
    ? `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`
    : null;
  return (
    <div role="status" aria-live="polite" data-view-as-banner="1" className="fixed left-1/2 top-2 z-[80] flex max-w-[calc(100vw-16px)] -translate-x-1/2 items-center gap-2.5 rounded-full border border-[#8A6200]/30 bg-[#FFF4D6] py-1.5 pl-4 pr-1.5 text-[13px] text-[#4A3200] shadow-lg">
      <Eye size={14} aria-hidden="true" className="shrink-0" />
      <span className="min-w-0 truncate">
        Viewing as <strong>{viewAs.targetName ?? user?.name}</strong> ({viewAs.targetRole ?? user?.role}) · read-only{mmss ? ` · ${mmss}` : ""}
      </span>
      <button type="button" disabled={busy} onClick={() => { setBusy(true); exitViewAs(); }}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#4A3200] px-3 text-xs font-bold text-white transition-colors hover:bg-[#2E1F00] disabled:opacity-60">
        <LogOut size={13} aria-hidden="true" />{busy ? "Exiting…" : "Exit"}
      </button>
    </div>
  );
}
