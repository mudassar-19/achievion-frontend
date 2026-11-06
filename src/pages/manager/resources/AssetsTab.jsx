// Resources → Assets (FR11-05): list, create / edit in a drawer, delete with a confirm dialog.
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import DataTable from "@/components/ui/DataTable";
import FilterChips from "@/components/ui/FilterChips";
import useUrlList from "@/components/ui/useUrlList";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { fmt } from "../project/format";
import AssetDrawer from "./AssetDrawer";

const TYPES = ["Tool", "License", "File link"].map((t) => ({ value: t, label: t }));
const PAGE = 25;

export function Expiry({ a }) {
  if (!a.expiry) return <span className="text-slate-400">—</span>;
  const { state, days } = a.expiry;
  const color = state === "expired" ? "#B01F17" : state === "soon" ? "#7A4B00" : "var(--text-secondary)";
  return <span className="whitespace-nowrap text-xs font-semibold tabular-nums" style={{ color }}>{state === "expired" ? `Expired ${fmt(a.expiresAt)}` : state === "soon" ? `${fmt(a.expiresAt)} · in ${days} ${days === 1 ? "day" : "days"}` : fmt(a.expiresAt)}</span>;
}
export function AssetName({ a }) {
  return a.url
    ? <a href={a.url} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 font-bold text-text-primary underline-offset-2 hover:underline">{a.name}<ExternalLink size={12} aria-hidden="true" className="text-slate-400" /><span className="sr-only">(opens in a new tab)</span></a>
    : <span className="font-bold text-text-primary">{a.name}</span>;
}

export default function AssetsTab({ data, error, reload, setData, creating, setCreating }) {
  const addToast = useUiStore((s) => s.addToast);
  const [sp, setSp] = useSearchParams();
  const types = useUrlList("type");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const rows = (data?.assets ?? []).filter((a) => !types.length || types.includes(a.type));

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/api/manager/assets/${removing.id}`);
      setData((d) => ({ ...d, assets: d.assets.filter((x) => x.id !== removing.id) }));
      addToast({ type: "success", message: `"${removing.name}" deleted.` });
      setRemoving(null);
    } catch (e) { addToast({ type: "error", message: e?.message ?? "The asset could not be deleted." }); }
    finally { setBusy(false); }
  }

  const columns = [
    { key: "name", label: "Name", className: "min-w-[200px]", render: (a) => <AssetName a={a} /> },
    { key: "type", label: "Type", className: "whitespace-nowrap text-text-secondary", render: (a) => a.type },
    { key: "projects", label: "Projects", className: "min-w-[180px] text-text-secondary", render: (a) => a.projects.length ? a.projects.map((p) => p.title).join(", ") : <span className="text-slate-400">Not linked</span> },
    { key: "expiry", label: "Expires", render: (a) => <Expiry a={a} /> },
    { key: "notes", label: "Notes", className: "max-w-[260px] truncate text-text-secondary", render: (a) => a.notes || "—" },
  ];

  return (
    <>
      <FilterChips label="Type" param="type" options={TYPES} multi />
      <DataTable label="Assets" columns={columns} rows={rows.slice((page - 1) * PAGE, page * PAGE)} loading={!data && !error} error={error} onRetry={reload}
        page={page} total={rows.length} pageSize={PAGE} onPage={(n) => { const q = new URLSearchParams(sp); if (n > 1) q.set("page", String(n)); else q.delete("page"); setSp(q, { replace: true }); }}
        onRowClick={setEditing}
        rowActions={(a) => [{ label: "Edit", icon: Pencil, onClick: () => setEditing(a) }, { label: "Delete", icon: Trash2, onClick: () => setRemoving(a) }]}
        empty={types.length
          ? <EmptyState heading="No assets of this type." action={{ label: "Clear filter", onClick: () => { const q = new URLSearchParams(sp); q.delete("type"); setSp(q, { replace: true }); } }} />
          : <EmptyState heading="No tools, licences or file links yet." action={{ label: "New asset", onClick: () => setCreating(true) }} />} />
      <AssetDrawer open={creating || !!editing} asset={editing} projects={data?.projects ?? []} onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={(a, isNew) => { setData((d) => ({ ...d, assets: isNew ? [...d.assets, a].sort((x, y) => x.name.localeCompare(y.name)) : d.assets.map((x) => (x.id === a.id ? a : x)) })); addToast({ type: "success", message: isNew ? `"${a.name}" added.` : "Asset saved." }); }} />
      <ConfirmModal open={!!removing} onClose={() => setRemoving(null)} onConfirm={remove} loading={busy} destructive confirmLabel="Delete asset"
        title={`Delete "${removing?.name}"?`} body={`It is removed from every project it is linked to${removing?.projects.length ? ` (${removing.projects.length})` : ""}. This cannot be undone.`} />
    </>
  );
}
