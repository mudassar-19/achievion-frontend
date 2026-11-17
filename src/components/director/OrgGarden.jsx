import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { fmtDateShort } from "@/lib/dates";
/**
 * ProgressGarden (formerly OrgGarden) — D-208 (UI-A1b); rebuilt in QA3 round 4 (C-21, C-4, C-22; D-QA3B-12).
 * One component for the Garden page (variant "full") and the dashboard (variant "mini").
 * Each tree = one project. Stage = project status. Color = project's own health band (D-077/D-134).
 * No org-level burnout here (that lives in Team Well-being / Org Health).
 * Mascot: Tally the gardener — original inline SVG (D-219).
 */


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

function TallyWatering({ size = 72 }) {
  return (
    <div className="tally-body relative select-none flex-shrink-0" aria-hidden="true">
      {/* Original Tally SVG — do not modify */}
      <svg viewBox="0 0 110 98" width={size} height={size}>
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
        className="tally-bottle"
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
      {/* QA2-63: no "Create a project" button. A Manager creates projects (D-109); the Director only watches them. */}
      <p className="text-[12px] text-slate-400 text-center max-w-xs">Projects are created by your Managers.</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
// projects: [{ id, title, status, healthScore, healthBand, progressPct, deadline, manager }] in the order the page lists them.
// filter: a health band or "All": trees outside it fade, the rest get a ring (the scene follows the filter chips).
const BAND_PRIORITY = { "Off track": 0, "At risk": 1, "On track": 2, "Not started": 3 };
const byCriticality = (a, b) => (BAND_PRIORITY[a.healthBand] ?? 4) - (BAND_PRIORITY[b.healthBand] ?? 4);
const stageOf = (p) => STATUS_TREE[(p.status ?? "planning").toLowerCase().trim()] ?? Seedling;
const labelOf = (p) => STATUS_LABEL[(p.status ?? "planning").toLowerCase().trim()] ?? p.status ?? "Planning";
const healthText = (p) => (p.healthBand === "Not started" || p.healthScore == null ? "Not started" : `Health ${p.healthScore}%`);

function ProjectCard({ p }) {
  const rows = [["Health", `${p.healthBand ?? "Not started"}${p.healthScore != null ? ` (${p.healthScore}%)` : ""}`], ["Completed", p.progressPct != null ? `${p.progressPct}% of tasks` : "—"],
    ["Stage", labelOf(p)], ["Deadline", p.deadline ? fmtDateShort(p.deadline) : "Not set"], ["Manager", p.manager ?? "Not assigned"]];
  return (
    <div role="tooltip" className="absolute bottom-full left-1/2 z-40 mb-2 w-52 -translate-x-1/2 rounded-xl bg-[#14203D] p-3 text-left text-white shadow-xl">
      <p className="text-xs font-bold leading-snug [overflow-wrap:anywhere]">{p.title}</p>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px]">
        {rows.map(([k, v]) => (<div key={k} className="contents"><dt className="text-white/70">{k}</dt><dd className="font-semibold">{v}</dd></div>))}
      </dl>
      <Link to={`/director/projects/${p.id}`} className="mt-2 inline-block text-[11px] font-bold text-[#FFC21A] underline-offset-2 hover:underline">Open project</Link>
    </div>
  );
}

export default function OrgGarden({ projects, onTrackPct = 0, totalCount, className = "", showLegend = false, variant = "full", filter = "All" }) {
  const mini = variant === "mini";
  const list = Array.isArray(projects) ? projects : [];
  const shown = mini ? [...list].sort(byCriticality).slice(0, 7) : list;
  const hidden = (totalCount ?? list.length) - shown.length;
  const navigate = useNavigate();
  const root = useRef(null);
  const [active, setActive] = useState(null);   // tapped (touch) or keyboard-focused tree
  const [hover, setHover] = useState(null);
  const open = hover ?? active;
  const thirsty = shown.find((p) => p.healthBand === "At risk") ?? shown.find((p) => p.healthBand === "Off track");

  // GSAP: the bar fills, trees rise in, Tally waters the thirsty tree. Nothing moves when the person asks for reduced motion.
  useEffect(() => {
    if (!root.current || !shown.length) return undefined;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".garden-fill", { width: 0, duration: 0.9, ease: "power2.out" });
      gsap.from(".garden-tree", { y: 14, opacity: 0, duration: 0.5, stagger: 0.05, ease: "power2.out", clearProps: "opacity,transform" });
      gsap.to(".tally-bottle", { rotation: -28, transformOrigin: "50% 100%", duration: 0.9, yoyo: true, repeat: -1, ease: "sine.inOut" });
      gsap.to(".garden-drop", { y: 26, opacity: 0, duration: 0.9, stagger: 0.25, repeat: -1, ease: "power1.in" });
      gsap.to(".tally-body", { y: -4, duration: 1.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
    }, root);
    return () => mm.revert();
  }, [shown.length, thirsty?.id]);

  if (!list.length) return <div className={className}><GardenEmpty /></div>;

  const pick = (p) => {
    if (window.matchMedia?.("(hover: hover)").matches) navigate(`/director/projects/${p.id}`);
    else setActive((a) => (a === p.id ? null : p.id));
  };
  const dim = (p) => filter !== "All" && p.healthBand !== filter;
  const cols = mini ? "grid-cols-4 sm:grid-cols-7" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

  return (
    <div ref={root} className={`flex flex-col gap-3 ${className}`} onKeyDown={(e) => { if (e.key === "Escape") { setActive(null); setHover(null); } }}>
      {/* Scene: sky, hills, grass and path behind the trees */}
      <div className="relative overflow-hidden rounded-2xl border border-ink/[0.07]" style={{ background: "linear-gradient(#DCE9FB 0, #EEF4FC 100px, #D6EBD0 100px, #BFE0B5 100%)" }}>
        <div aria-hidden="true" className="absolute right-[8%] top-4 h-10 w-10 rounded-full bg-[#FFE08A]" />
        <div aria-hidden="true" className="absolute -left-[8%] top-[62px] h-16 w-[55%] rounded-[50%] bg-[#DCEFD6]" />
        <div aria-hidden="true" className="absolute -right-[8%] top-[48px] h-20 w-[65%] rounded-[50%] bg-[#CBE6C4]" />
        <ul className={`relative grid ${cols} gap-x-2 gap-y-4 px-3 pb-6 pt-14 sm:px-5`} aria-label="Projects, one tree each">
          {shown.map((p, i) => {
            const Tree = stageOf(p), c = bandColors(p.healthBand ?? "Not started"), isOpen = open === p.id, water = thirsty?.id === p.id;
            return (
              <li key={p.id ?? i} className="garden-tree relative flex min-w-0 flex-col items-center"
                style={{ opacity: dim(p) ? 0.28 : 1, filter: dim(p) ? "grayscale(0.6)" : undefined, transition: "opacity .2s" }}
                onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)}>
                {isOpen && <ProjectCard p={p} />}
                <div className="relative flex items-end">
                  {water && !mini && (
                    <span className="pointer-events-none absolute -left-[60px] bottom-0 hidden sm:block"><TallyWatering size={56} />
                      <span aria-hidden="true" className="absolute -right-1 top-9 flex gap-1.5"><i className="garden-drop h-1.5 w-1.5 rounded-full bg-[#2A62EC]" /><i className="garden-drop h-1.5 w-1.5 rounded-full bg-[#2A62EC]" /><i className="garden-drop h-1.5 w-1.5 rounded-full bg-[#2A62EC]" /></span>
                    </span>
                  )}
                  <button type="button" onClick={() => pick(p)} onFocus={() => setActive(p.id)} aria-label={`${p.title}: ${labelOf(p)}, ${p.healthBand ?? "Not started"}. Open project`}
                    className={`rounded-xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${filter !== "All" && !dim(p) ? "ring-2 ring-[#14203D]/30" : ""}`}>
                    <Tree c={c} />
                  </button>
                </div>
                <p title={p.title} className={`mt-1 w-full text-center font-bold leading-tight text-[#14203D] ${mini ? "truncate text-[10px]" : "line-clamp-2 text-xs"}`}>{p.title}</p>
                <p className={`text-center font-semibold tabular-nums text-[#2F3B57] ${mini ? "text-[10px]" : "text-[11px]"}`}>{healthText(p)}</p>
              </li>
            );
          })}
        </ul>
        {mini && thirsty && <span className="absolute bottom-1 left-2 hidden sm:block"><TallyWatering size={40} /></span>}
      </div>

      {hidden > 0 && <Link to="/director/garden" className="self-end text-[11px] font-bold text-accent-text hover:underline">+{hidden} more in the full garden</Link>}

      {/* Progress: the bar really fills to the percentage */}
      <div>
        <div className="mb-1 flex items-baseline justify-between text-xs font-bold text-[#14203D]"><span>Projects on track</span><span className="tabular-nums">{onTrackPct}%</span></div>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={onTrackPct} aria-label="Projects on track" className="h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.08]">
          <div className="garden-fill h-full rounded-full" style={{ width: `${onTrackPct}%`, background: "linear-gradient(90deg,#0C5E2A,#1DA64D)" }} />
        </div>
      </div>

      {showLegend && <GardenLegend />}
    </div>
  );
}
