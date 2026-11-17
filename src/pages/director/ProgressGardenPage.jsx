import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";
import api from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import OrgGarden from "@/components/director/OrgGarden";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { bandOfProject } from "@/lib/healthBand";

const BANDS = ["All", "At risk", "Needs attention", "On track", "Not started"];
const BAND_DOT = { "On track": "#0C5E2A", "Needs attention": "#6A8A1C", "At risk": "#C85030", "Not started": "#9CA3AF" };

export default function ProgressGardenPage() {
  const [loading,    setLoading]    = useState(true);
  const [gardenData, setGardenData] = useState(null);
  const [filter,     setFilter]     = useState("All");

  useEffect(() => {
    api.get("/api/director/garden")
      .then(setGardenData)
      .catch(() => setGardenData({ projects: [], onTrackCount: 0, totalCount: 0, onTrackPct: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const allProjects = (gardenData?.projects ?? []).map((p) => ({ ...p, healthBand: bandOfProject(p) })); // D-QA4-11
  const filtered = filter === "All" ? allProjects : allProjects.filter((p) => p.healthBand === filter);

  return (
    <div className="px-4 sm:px-8 py-8 max-w-[1280px] mx-auto w-full flex flex-col gap-6">

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <PageHeader
          title="Progress Garden"
          subtitle="A visual snapshot of your organization's project health."
          icon={Leaf}
        />
      </motion.div>

      {/* What this shows */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
        className="rounded-xl border border-ink/[0.07] bg-ink/[0.02] px-4 py-3 text-sm text-slate-500 leading-relaxed"
      >
        Each tree is one project. The tree grows with the project (seedling while planning, sapling while running, a tree with a star when completed) and its colour is that project&rsquo;s own health. Under each tree you see the project name and its health. Hover or tap a tree for the details and to open the project.
        The bar counts a project as on track when its health is On track, whatever its stage (Completed and In Review included); projects that have not started count in the total.
      </motion.div>

      {loading ? (
        <SkeletonCard className="h-64" />
      ) : (
        <>
          {/* Tree scene — 7 most critical */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
            className="glass-panel rounded-2xl border border-ink/[0.07] px-6 py-6 flex flex-col gap-6"
          >
            <div className="-mb-2">
                <div role="group" aria-label="Filter by health" className="flex flex-wrap gap-1.5">
                  {BANDS.map((b) => {
                    const count = b === "All" ? allProjects.length : allProjects.filter((p) => p.healthBand === b).length;
                    if (count === 0 && b !== "All") return null;
                    return (
                      <button
                        key={b}
                        type="button"
                        role="radio"
                        aria-checked={filter === b}
                        onClick={() => setFilter(b)}
                        className={[
                          "flex items-center gap-1.5 h-7 rounded-full px-3 text-[11px] font-semibold transition-colors",
                          filter === b
                            ? "bg-[#14203D] text-white"
                            : "border border-ink/[0.12] text-slate-500 hover:text-text-primary hover:border-ink/[0.25]",
                        ].join(" ")}
                      >
                        {b !== "All" && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: BAND_DOT[b] ?? "#9CA3AF" }}
                          />
                        )}
                        {b}
                        <span className={filter === b ? "opacity-70" : "opacity-50"}>{count}</span>
                      </button>
                    );
                  })}
                </div>
            </div>
            <OrgGarden
              projects={allProjects}
              onTrackPct={gardenData?.onTrackPct ?? 0}
              totalCount={gardenData?.totalCount}
              showLegend
              filter={filter}
              className="w-full"
            />
          </motion.div>

          {/* All projects grid */}
          {allProjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}
              className="flex flex-col gap-4"
            >
              {/* Header + filter chips */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  {filter === "All" ? "All projects" : filter} ({filtered.length})
                </p>
              </div>

              {/* Project cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((p) => (
                  <Link
                    key={p.id} to={`/director/projects/${p.id}`}
                    className="rounded-xl border border-ink/[0.07] bg-white px-4 py-3 flex items-center gap-3 hover:border-ink/[0.14] transition-colors"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: BAND_DOT[p.healthBand] ?? "#9CA3AF" }}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{p.title}</p>
                      <p className="text-[11px] text-slate-400 capitalize">{p.status}</p>
                    </div>
                    {p.healthScore != null && (
                      <span className="text-[11px] font-bold tabular-nums text-slate-500 shrink-0">
                        Health {p.healthScore}%
                      </span>
                    )}
                  </Link>
                ))}
                {filtered.length === 0 && (
                  <p className="col-span-full text-sm text-slate-400 py-6 text-center">
                    No {filter} projects.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}

    </div>
  );
}
