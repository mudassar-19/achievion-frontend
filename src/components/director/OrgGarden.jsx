/**
 * ProgressGarden (formerly OrgGarden) — D-208 (UI-A1b)
 * Each tree = one project. Stage = project status. Color = project's own health band (D-077/D-134).
 * No org-level burnout here (that lives in Team Well-being / Org Health).
 * Mascot: Tally the gardener — original inline SVG (D-219).
 */

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ─── Health band → tree colors ────────────────────────────────────────────────

function bandColors(band) {
  if (band === "On track")
    return { base: "#0C5E2A", mid: "#14803A", top: "#1DA64D", hi: "#2DC95E" };
  if (band === "At risk")
    return { base: "#526A14", mid: "#6A8A1C", top: "#82A828", hi: "#9CC835" };
  if (band === "Off track")
    return { base: "#8A2010", mid: "#AA3020", top: "#C85030", hi: "#E07048" };
  // "Not started" — neutral grey
  return   { base: "#6B7280", mid: "#9CA3AF", top: "#D1D5DB", hi: "#E5E7EB" };
}

// ─── SVG trees ───────────────────────────────────────────────────────────────

function Seedling({ c, swayStyle }) {
  return (
    <svg viewBox="0 0 44 68" width="40" height="61" aria-hidden style={swayStyle}>
      <ellipse cx="22" cy="64" rx="11" ry="3" fill="rgba(14,106,48,0.14)" />
      <line x1="22" y1="63" x2="22" y2="38" stroke={c.base} strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="13" cy="46" rx="11" ry="6" fill={c.top} transform="rotate(-30 13 46)" opacity="0.92" />
      <ellipse cx="31" cy="39" rx="11" ry="6" fill={c.mid} transform="rotate(28 31 39)" opacity="0.92" />
      <ellipse cx="22" cy="36" rx="5.5" ry="5.5" fill={c.hi} opacity="0.85" />
      <ellipse cx="20" cy="34" rx="2.5" ry="2" fill="rgba(255,255,255,0.18)" />
    </svg>
  );
}

function Sapling({ c, swayStyle }) {
  return (
    <svg viewBox="0 0 56 88" width="50" height="79" aria-hidden style={swayStyle}>
      <ellipse cx="28" cy="84" rx="16" ry="4.5" fill="rgba(14,106,48,0.15)" />
      <path d="M24 66 Q22 56 25 50 Q28 46 31 50 Q34 56 32 66 Z" fill="#7A5A2A" />
      <path d="M26 62 Q28 57 26 50" stroke="#9B7840" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.4" />
      <ellipse cx="28" cy="42" rx="24" ry="20" fill={c.base} />
      <ellipse cx="28" cy="33" rx="18" ry="15" fill={c.mid} />
      <ellipse cx="24" cy="26" rx="12" ry="10" fill={c.top} />
      <ellipse cx="43" cy="44" rx="7" ry="14" fill="rgba(255,255,255,0.1)" />
      <ellipse cx="20" cy="24" rx="5" ry="4" fill={c.hi} opacity="0.55" />
    </svg>
  );
}

function FullTree({ c, swayStyle }) {
  return (
    <svg viewBox="0 0 68 106" width="60" height="94" aria-hidden style={swayStyle}>
      <ellipse cx="34" cy="102" rx="23" ry="5.5" fill="rgba(14,106,48,0.18)" />
      <path d="M28 96 Q26 74 30 56 Q34 50 38 56 Q42 74 40 96 Z" fill="#6B4C1E" />
      <path d="M30 86 Q33 78 30 66" stroke="#9B7240" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.38" />
      <path d="M37 92 Q34 83 37 73" stroke="#9B7240" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.38" />
      <ellipse cx="34" cy="46" rx="30" ry="25" fill={c.base} />
      <ellipse cx="34" cy="36" rx="23" ry="19" fill={c.mid} />
      <ellipse cx="30" cy="26" rx="15" ry="13" fill={c.top} />
      <ellipse cx="26" cy="21" rx="8" ry="7" fill={c.hi} opacity="0.65" />
      <ellipse cx="51" cy="48" rx="9" ry="18" fill="rgba(255,255,255,0.1)" />
      {/* star — data: only on completed projects (FullTree = completed status) */}
      <circle cx="34" cy="11" r="6" fill="#FFC21A" />
      <polygon
        points="34,5 35.8,10 41,10 37,13.5 38.5,18.5 34,15.5 29.5,18.5 31,13.5 27,10 32.2,10"
        fill="#FFE566" />
    </svg>
  );
}

// ─── Status → tree component ─────────────────────────────────────────────────

const STATUS_TREE = {
  planning:      Seedling,
  scheduled:     Seedling,
  "on hold":     Seedling,
  pending:       Seedling,
  draft:         Seedling,
  active:        Sapling,
  delayed:       Sapling,
  "in review":   Sapling,
  "in-progress": Sapling,
  "in progress": Sapling,
  inprogress:    Sapling,
  ongoing:       Sapling,
  review:        Sapling,
  completed:     FullTree,
  done:          FullTree,
  closed:        FullTree,
  delivered:     FullTree,
  archived:      FullTree,
};

const STATUS_LABEL = {
  planning:      "Planning",
  scheduled:     "Scheduled",
  "on hold":     "On Hold",
  pending:       "Planning",
  draft:         "Planning",
  active:        "Active",
  delayed:       "Delayed",
  "in review":   "In Review",
  "in-progress": "Active",
  "in progress": "Active",
  inprogress:    "Active",
  ongoing:       "Active",
  review:        "In Review",
  completed:     "Completed",
  done:          "Completed",
  closed:        "Completed",
  delivered:     "Delivered",
  archived:      "Archived",
};

// ─── Tally mascot — watering pose (D-219: original inline SVG restored) ───────

function TallyWatering() {
  return (
    <div
      className="relative select-none flex-shrink-0"
      style={REDUCED ? {} : { animation: "tally-float 2.8s ease-in-out infinite" }}
      aria-hidden="true"
    >
      {/* Original Tally SVG — do not modify */}
      <svg viewBox="0 0 110 98" width="72" height="72">
        <ellipse cx="62" cy="95" rx="22" ry="4.5" fill="rgba(14,106,48,0.22)" />
        <path d="M50 54 Q36 60 30 72" stroke="#4B2FC4" strokeWidth="7" strokeLinecap="round" fill="none" />
        <rect x="12" y="66" width="22" height="16" rx="5" fill="#FFC21A" />
        <rect x="16" y="61" width="14" height="7" rx="3" fill="#E5A823" />
        <path d="M12 74 L2 84" stroke="#FFC21A" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="0" cy="88" r="2.5" fill="#2A62EC" opacity="0.8" />
        <circle cx="5" cy="93" r="1.8" fill="#2A62EC" opacity="0.65" />
        <circle cx="-4" cy="94" r="1.8" fill="#2A62EC" opacity="0.55" />
        <path d="M62 14 Q84 8 88 30 Q92 52 78 66 Q66 76 50 70 Q34 60 36 40 Q40 20 62 14Z" fill="#4B2FC4" />
        <ellipse cx="62" cy="50" rx="15" ry="17" fill="#FFF6E6" />
        <circle cx="62" cy="58" r="6" fill="#FFC21A" />
        <text x="62" y="61.5" textAnchor="middle" fontSize="7" fill="#3B2A00" fontFamily="sans-serif" fontWeight="bold">★</text>
        <path d="M78 48 Q88 40 86 26" stroke="#4B2FC4" strokeWidth="7" strokeLinecap="round" fill="none" />
        <circle cx="56" cy="36" r="6" fill="white" />
        <circle cx="70" cy="36" r="6" fill="white" />
        <circle cx="57" cy="37" r="3.5" fill="#1B2340" />
        <circle cx="71" cy="37" r="3.5" fill="#1B2340" />
        <circle cx="58" cy="36" r="1.3" fill="white" opacity="0.9" />
        <circle cx="72" cy="36" r="1.3" fill="white" opacity="0.9" />
        <ellipse cx="48" cy="46" rx="6" ry="3.5" fill="#FF9E8A" opacity="0.42" />
        <ellipse cx="76" cy="46" rx="6" ry="3.5" fill="#FF9E8A" opacity="0.42" />
        <path d="M55 54 Q62 61 69 54" stroke="#1B2340" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <line x1="62" y1="14" x2="68" y2="2" stroke="#1B2340" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="69" cy="-0.5" r="5.5" fill="#FFC21A" />
        <ellipse cx="54" cy="74" rx="9" ry="5" fill="#3A22A0" />
        <ellipse cx="72" cy="74" rx="9" ry="5" fill="#3A22A0" />
      </svg>
      {/* Water bottle overlay — aligned to Tally's raised right hand tip */}
      <svg
        viewBox="0 0 18 28"
        width="13"
        height="20"
        style={{
          position: "absolute",
          top: "2px",
          right: "-2px",
          transformOrigin: "50% 100%",
        }}
        className={REDUCED ? "" : "tally-bottle"}
      >
        {/* cap */}
        <rect x="6" y="0" width="6" height="4" rx="1.5" fill="#2A62EC" />
        {/* neck */}
        <rect x="7" y="4" width="4" height="3" rx="1" fill="#4A7FDE" />
        {/* body */}
        <rect x="4" y="7" width="10" height="17" rx="3" fill="#5B9EEF" />
        {/* label stripe */}
        <rect x="4" y="12" width="10" height="6" rx="1" fill="#3A80D2" opacity="0.6" />
        {/* shine */}
        <line x1="6.5" y1="9" x2="6.5" y2="22" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
      </svg>
    </div>
  );
}

// ─── Mini tree icons for legend (scaled-down SVGs, same shapes as scene trees) ─

function MiniSeedling({ c }) {
  return (
    <svg viewBox="0 0 44 68" width="20" height="31" aria-hidden>
      <line x1="22" y1="63" x2="22" y2="38" stroke={c.base} strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="13" cy="46" rx="11" ry="6" fill={c.top} transform="rotate(-30 13 46)" opacity="0.92" />
      <ellipse cx="31" cy="39" rx="11" ry="6" fill={c.mid} transform="rotate(28 31 39)" opacity="0.92" />
      <ellipse cx="22" cy="36" rx="5.5" ry="5.5" fill={c.hi} opacity="0.85" />
    </svg>
  );
}
function MiniSapling({ c }) {
  return (
    <svg viewBox="0 0 56 88" width="22" height="35" aria-hidden>
      <path d="M24 66 Q22 56 25 50 Q28 46 31 50 Q34 56 32 66 Z" fill="#7A5A2A" />
      <ellipse cx="28" cy="42" rx="24" ry="20" fill={c.base} />
      <ellipse cx="28" cy="33" rx="18" ry="15" fill={c.mid} />
      <ellipse cx="24" cy="26" rx="12" ry="10" fill={c.top} />
    </svg>
  );
}
function MiniFullTree({ c }) {
  return (
    <svg viewBox="0 0 68 106" width="24" height="38" aria-hidden>
      <path d="M28 96 Q26 74 30 56 Q34 50 38 56 Q42 74 40 96 Z" fill="#6B4C1E" />
      <ellipse cx="34" cy="46" rx="30" ry="25" fill={c.base} />
      <ellipse cx="34" cy="36" rx="23" ry="19" fill={c.mid} />
      <ellipse cx="30" cy="26" rx="15" ry="13" fill={c.top} />
      <circle cx="34" cy="11" r="5" fill="#FFC21A" />
      <polygon points="34,5 35.8,10 41,10 37,13.5 38.5,18.5 34,15.5 29.5,18.5 31,13.5 27,10 32.2,10" fill="#FFE566" />
    </svg>
  );
}

// ─── Legend — real SVG icons, data-matched items only ────────────────────────

function GardenLegend() {
  const cOnTrack  = bandColors("On track");
  const cAtRisk   = bandColors("At risk");
  const cOffTrack = bandColors("Off track");
  const cNeutral  = bandColors("Not started");

  const stages = [
    { Icon: MiniSeedling, c: cOnTrack, label: "Planning",   desc: "Project in planning — seedling" },
    { Icon: MiniSapling,  c: cOnTrack, label: "In Progress", desc: "Project actively running — sapling" },
    { Icon: MiniFullTree, c: cOnTrack, label: "Completed",   desc: "Project delivered — full tree with star" },
  ];

  const bands = [
    { label: "On track",    swatch: `linear-gradient(135deg,${cOnTrack.base},${cOnTrack.hi})` },
    { label: "At risk",     swatch: `linear-gradient(135deg,${cAtRisk.base},${cAtRisk.hi})`   },
    { label: "Off track",   swatch: `linear-gradient(135deg,${cOffTrack.base},${cOffTrack.hi})` },
    { label: "Not started", swatch: `linear-gradient(135deg,${cNeutral.base},${cNeutral.hi})`  },
  ];

  return (
    <div className="flex flex-col gap-3 mt-1">
      {/* Stage row: tree icons */}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {stages.map(({ Icon, c, label, desc }) => (
          <span key={label} className="flex items-end gap-1.5 text-[11px] text-[#4F5B75]" title={desc}>
            <Icon c={c} />
            <span className="font-semibold leading-none mb-0.5">{label}</span>
          </span>
        ))}
      </div>
      {/* Health band row: color swatches */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {bands.map(({ label, swatch }) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-[#4F5B75]">
            <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ background: swatch }} />
            <span className="font-semibold">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function GardenEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <TallyWatering />
      <p className="text-sm font-semibold text-text-primary mt-1">No projects yet</p>
      <p className="text-[13px] text-slate-500 text-center max-w-xs">
        Your projects will grow here as your team starts working.
      </p>
      <a
        href="/director/projects"
        className="mt-1 h-9 px-5 rounded-xl border border-ink/10 bg-accent text-white text-sm font-semibold flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        Create a project
      </a>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
// projects: [{ id, title, status, healthScore: number|null, healthBand: string }]
// onTrackPct: number 0-100 (computed by caller from garden API)

const BAND_PRIORITY = { "Off track": 0, "At risk": 1, "On track": 2, "Not started": 3 };
function sortByCriticality(arr) {
  return [...arr].sort((a, b) => (BAND_PRIORITY[a.healthBand] ?? 4) - (BAND_PRIORITY[b.healthBand] ?? 4));
}

export default function OrgGarden({ projects, onTrackPct = 0, totalCount, className = "", showLegend = false }) {
  const sorted = Array.isArray(projects) ? sortByCriticality(projects) : [];
  const displayProjects = sorted.slice(0, 7);
  const hiddenCount = (totalCount ?? sorted.length) - displayProjects.length;
  const isEmpty = displayProjects.length === 0;

  const pctLabel = isEmpty ? "" : `${onTrackPct}% on track`;

  return (
    <div
      className={`flex flex-col gap-3 ${className}`}
      role="img"
      aria-label={`Progress Garden — ${isEmpty ? "no projects" : pctLabel}`}
    >
      {isEmpty ? (
        <GardenEmpty />
      ) : (
        <>
          {/* ── Scene ── */}
          <div
            className="relative flex items-end justify-start gap-2 sm:gap-4 min-h-[120px] pt-16 overflow-x-auto pb-1 px-2 sm:px-3"
          >
            {/* Tally mascot */}
            <div className="flex-shrink-0 self-end">
              <TallyWatering />
            </div>

            {/* Trees */}
            {displayProjects.map((p, i) => {
              const key     = (p.status ?? "planning").toLowerCase().trim();
              const Tree    = STATUS_TREE[key] ?? Seedling;
              const lbl     = STATUS_LABEL[key] ?? p.status ?? "Planning";
              const c       = bandColors(p.healthBand ?? "Not started");
              const swayStyle = REDUCED ? {} : {
                animation: `tree-sway ${2.5 + i * 0.3}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
                transformOrigin: "bottom center",
                display: "block",
              };

              return (
                <div
                  key={p.id ?? i}
                  className="relative flex-shrink-0 flex flex-col items-center group"
                  tabIndex={0}
                  aria-label={`${p.title}: ${lbl}, ${p.healthBand ?? "Not started"}`}
                  style={{ isolation: "isolate" }}
                >
                  <Tree c={c} swayStyle={swayStyle} />

                  {/* Tooltip — above tree; pt-16 on scene gives 64px clearance within
                      the overflow-x-auto scroll container so it isn't clipped */}
                  <div
                    role="tooltip"
                    className="
                      pointer-events-none absolute left-1/2 -translate-x-1/2 z-50
                      bottom-full mb-1
                      bg-[#14203D] text-white rounded-xl px-3 py-2
                      w-[140px] whitespace-normal text-center shadow-xl
                      opacity-0 group-hover:opacity-100 group-focus:opacity-100
                      transition-opacity duration-150
                    "
                  >
                    <p className="text-[12px] font-semibold leading-snug">{p.title}</p>
                    <p className="text-[11px] text-white/65 leading-snug mt-0.5 capitalize">{lbl}</p>
                    <p className="text-[11px] font-bold leading-snug mt-0.5" style={{ color: "#FFC21A" }}>
                      {p.healthBand ?? "Not started"}
                      {p.healthScore != null ? ` · ${p.healthScore}%` : ""}
                    </p>
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#14203D]" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── "+N more" indicator ── */}
          {hiddenCount > 0 && (
            <div className="flex-shrink-0 self-end mb-1 flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold text-slate-400 tabular-nums">+{hiddenCount}</span>
              <a
                href="/director/garden"
                className="text-[10px] font-semibold text-accent-text hover:underline whitespace-nowrap"
                aria-label={`View ${hiddenCount} more projects in full garden`}
              >
                more
              </a>
            </div>
          )}

          {/* ── Ground strip ── */}
          <div
            className="rounded-full h-2 w-full"
            style={{ background: "linear-gradient(90deg,#EAEDF4 0%,#D5DCEA 45%,#EAEDF4 100%)" }}
          />

          {/* ── Label ── */}
          <p className="text-center text-[11px] font-black uppercase tracking-[0.13em] text-[#4F5B75]">
            {pctLabel}
          </p>
        </>
      )}

      {/* ── Legend (optional) ── */}
      {showLegend && !isEmpty && <GardenLegend />}

      <style>{`
        @keyframes tree-sway {
          0%,100% { transform: rotate(-2.5deg); }
          50%     { transform: rotate(2.5deg);  }
        }
        @keyframes tally-float {
          0%,100% { transform: translateY(0px);  }
          50%     { transform: translateY(-7px); }
        }
        @keyframes bottle-tilt {
          0%,100% { transform: rotate(-8deg); }
          50%     { transform: rotate(4deg);  }
        }
        .tally-bottle { animation: bottle-tilt 2.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          [style*="tree-sway"],
          [style*="tally-float"],
          .tally-bottle { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
