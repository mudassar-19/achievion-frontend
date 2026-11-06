/**
 * OrgGarden — Direction C: projects as a living garden, Tally watering.
 * score 0-100  → tree health colour + tier label.
 * projects[]   → each maps to seedling (planning) | sapling (active) | full tree (completed).
 * Falls back to MOCK_PROJECTS when no real data is passed.
 * prefers-reduced-motion: all CSS animations off, static scene preserved.
 */

const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ─── Colour tiers ────────────────────────────────────────────────────────────

function healthColors(score) {
  if (score >= 75)
    return { base: "#0C5E2A", mid: "#14803A", top: "#1DA64D", hi: "#2DC95E", label: "Thriving" };
  if (score >= 40)
    return { base: "#526A14", mid: "#6A8A1C", top: "#82A828", hi: "#9CC835", label: "Growing" };
  return   { base: "#8A6010", mid: "#AA8020", top: "#C89830", hi: "#E0B448", label: "At Risk" };
}

// ─── SVG trees ───────────────────────────────────────────────────────────────

function Seedling({ c, swayStyle }) {
  return (
    <svg viewBox="0 0 44 68" width="40" height="61" aria-hidden style={swayStyle}>
      {/* ground shadow */}
      <ellipse cx="22" cy="64" rx="11" ry="3" fill="rgba(14,106,48,0.14)" />
      {/* stem */}
      <line x1="22" y1="63" x2="22" y2="38" stroke={c.base} strokeWidth="3.5" strokeLinecap="round" />
      {/* left leaf */}
      <ellipse cx="13" cy="46" rx="11" ry="6" fill={c.top}
        transform="rotate(-30 13 46)" opacity="0.92" />
      {/* right leaf */}
      <ellipse cx="31" cy="39" rx="11" ry="6" fill={c.mid}
        transform="rotate(28 31 39)" opacity="0.92" />
      {/* bud */}
      <ellipse cx="22" cy="36" rx="5.5" ry="5.5" fill={c.hi} opacity="0.85" />
      <ellipse cx="20" cy="34" rx="2.5" ry="2" fill="rgba(255,255,255,0.18)" />
    </svg>
  );
}

function Sapling({ c, swayStyle }) {
  return (
    <svg viewBox="0 0 56 88" width="50" height="79" aria-hidden style={swayStyle}>
      {/* ground shadow */}
      <ellipse cx="28" cy="84" rx="16" ry="4.5" fill="rgba(14,106,48,0.15)" />
      {/* trunk */}
      <path d="M24 66 Q22 56 25 50 Q28 46 31 50 Q34 56 32 66 Z" fill="#7A5A2A" />
      {/* bark marks */}
      <path d="M26 62 Q28 57 26 50" stroke="#9B7840" strokeWidth="1.2"
        fill="none" strokeLinecap="round" opacity="0.4" />
      {/* canopy base */}
      <ellipse cx="28" cy="42" rx="24" ry="20" fill={c.base} />
      {/* mid layer */}
      <ellipse cx="28" cy="33" rx="18" ry="15" fill={c.mid} />
      {/* top highlight */}
      <ellipse cx="24" cy="26" rx="12" ry="10" fill={c.top} />
      {/* sun-rim */}
      <ellipse cx="43" cy="44" rx="7" ry="14" fill="rgba(255,255,255,0.1)" />
      {/* sheen */}
      <ellipse cx="20" cy="24" rx="5" ry="4" fill={c.hi} opacity="0.55" />
    </svg>
  );
}

function FullTree({ c, swayStyle }) {
  return (
    <svg viewBox="0 0 68 106" width="60" height="94" aria-hidden style={swayStyle}>
      {/* ground shadow */}
      <ellipse cx="34" cy="102" rx="23" ry="5.5" fill="rgba(14,106,48,0.18)" />
      {/* trunk */}
      <path d="M28 96 Q26 74 30 56 Q34 50 38 56 Q42 74 40 96 Z" fill="#6B4C1E" />
      {/* bark detail */}
      <path d="M30 86 Q33 78 30 66" stroke="#9B7240" strokeWidth="1.5"
        fill="none" strokeLinecap="round" opacity="0.38" />
      <path d="M37 92 Q34 83 37 73" stroke="#9B7240" strokeWidth="1.5"
        fill="none" strokeLinecap="round" opacity="0.38" />
      {/* base canopy */}
      <ellipse cx="34" cy="46" rx="30" ry="25" fill={c.base} />
      {/* mid layer */}
      <ellipse cx="34" cy="36" rx="23" ry="19" fill={c.mid} />
      {/* top */}
      <ellipse cx="30" cy="26" rx="15" ry="13" fill={c.top} />
      {/* highlight */}
      <ellipse cx="26" cy="21" rx="8" ry="7" fill={c.hi} opacity="0.65" />
      {/* sun-rim */}
      <ellipse cx="51" cy="48" rx="9" ry="18" fill="rgba(255,255,255,0.1)" />
      {/* completion star */}
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

// ─── Mock data (fallback when no real projects passed) ────────────────────────

const MOCK_PROJECTS = [
  { name: "Platform Alpha",   status: "completed" },
  { name: "Beta Dashboard",   status: "active" },
  { name: "API Gateway v2",   status: "planning" },
  { name: "Mobile Client",    status: "active" },
  { name: "Analytics Suite",  status: "completed" },
];

// ─── Tally mascot — watering pose ────────────────────────────────────────────

function TallyWatering() {
  return (
    <svg viewBox="0 0 110 98" width="72" height="72" aria-hidden>
      {/* ground shadow */}
      <ellipse cx="62" cy="95" rx="22" ry="4.5" fill="rgba(14,106,48,0.22)" />

      {/* left arm + watering can */}
      <path d="M50 54 Q36 60 30 72" stroke="#4B2FC4" strokeWidth="7"
        strokeLinecap="round" fill="none" />
      {/* can body */}
      <rect x="12" y="66" width="22" height="16" rx="5" fill="#FFC21A" />
      {/* can rim */}
      <rect x="16" y="61" width="14" height="7" rx="3" fill="#E5A823" />
      {/* spout */}
      <path d="M12 74 L2 84" stroke="#FFC21A" strokeWidth="3.5" strokeLinecap="round" />
      {/* water drops */}
      <circle cx="0" cy="88" r="2.5" fill="#2A62EC" opacity="0.8" />
      <circle cx="5" cy="93" r="1.8" fill="#2A62EC" opacity="0.65" />
      <circle cx="-4" cy="94" r="1.8" fill="#2A62EC" opacity="0.55" />

      {/* body */}
      <path d="M62 14 Q84 8 88 30 Q92 52 78 66
               Q66 76 50 70 Q34 60 36 40 Q40 20 62 14Z"
        fill="#4B2FC4" />
      {/* belly */}
      <ellipse cx="62" cy="50" rx="15" ry="17" fill="#FFF6E6" />
      {/* gold badge */}
      <circle cx="62" cy="58" r="6" fill="#FFC21A" />
      <text x="62" y="61.5" textAnchor="middle" fontSize="7"
        fill="#3B2A00" fontFamily="sans-serif" fontWeight="bold">★</text>

      {/* right arm up */}
      <path d="M78 48 Q88 40 86 26" stroke="#4B2FC4" strokeWidth="7"
        strokeLinecap="round" fill="none" />

      {/* eyes whites */}
      <circle cx="56" cy="36" r="6" fill="white" />
      <circle cx="70" cy="36" r="6" fill="white" />
      {/* pupils */}
      <circle cx="57" cy="37" r="3.5" fill="#1B2340" />
      <circle cx="71" cy="37" r="3.5" fill="#1B2340" />
      {/* eye gleam */}
      <circle cx="58" cy="36" r="1.3" fill="white" opacity="0.9" />
      <circle cx="72" cy="36" r="1.3" fill="white" opacity="0.9" />
      {/* cheeks */}
      <ellipse cx="48" cy="46" rx="6" ry="3.5" fill="#FF9E8A" opacity="0.42" />
      <ellipse cx="76" cy="46" rx="6" ry="3.5" fill="#FF9E8A" opacity="0.42" />
      {/* smile */}
      <path d="M55 54 Q62 61 69 54"
        stroke="#1B2340" strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* antenna */}
      <line x1="62" y1="14" x2="68" y2="2"
        stroke="#1B2340" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="69" cy="-0.5" r="5.5" fill="#FFC21A" />

      {/* feet */}
      <ellipse cx="54" cy="74" rx="9" ry="5" fill="#3A22A0" />
      <ellipse cx="72" cy="74" rx="9" ry="5" fill="#3A22A0" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OrgGarden({ score = 0, projects, className = "" }) {
  const c       = healthColors(score);
  const trees   = (Array.isArray(projects) && projects.length ? projects : MOCK_PROJECTS).slice(0, 7);

  return (
    <div
      className={`flex flex-col gap-3 ${className}`}
      role="img"
      aria-label={`Org Garden — ${c.label}, health score ${score}%`}
    >
      {/* ── Scene ── */}
      <div className="relative flex items-end justify-start gap-2 sm:gap-4
                      min-h-[120px] overflow-x-auto overflow-y-visible pb-1 px-2 sm:px-3">

        {/* Tally mascot */}
        <div
          className="flex-shrink-0 self-end mb-1 select-none"
          style={REDUCED ? {} : { animation: "tally-float 2.8s ease-in-out infinite" }}
        >
          <TallyWatering />
        </div>

        {/* Trees */}
        {trees.map((p, i) => {
          const key  = (p.status ?? "planning").toLowerCase().trim();
          const Tree = STATUS_TREE[key] ?? Seedling;
          const lbl  = STATUS_LABEL[key] ?? p.status ?? "Planning";
          const swayStyle = REDUCED ? {} : {
            animation: `tree-sway ${2.5 + i * 0.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
            transformOrigin: "bottom center",
            display: "block",
          };

          return (
            <div
              key={i}
              className="relative flex-shrink-0 flex flex-col items-center group"
              tabIndex={0}
              aria-label={`${p.name}: ${lbl}, health ${score}%`}
            >
              <Tree c={c} swayStyle={swayStyle} />

              {/* Tooltip */}
              <div
                role="tooltip"
                className="
                  pointer-events-none absolute bottom-full left-1/2 mb-2
                  -translate-x-1/2 z-20
                  bg-[#14203D] text-white rounded-xl px-3 py-2
                  whitespace-nowrap shadow-xl
                  opacity-0 group-hover:opacity-100 group-focus:opacity-100
                  transition-opacity duration-150
                "
              >
                <p className="text-[12px] font-semibold leading-snug">{p.name}</p>
                <p className="text-[11px] text-white/65 leading-snug mt-0.5 capitalize">{lbl}</p>
                <p className="text-[11px] font-bold leading-snug mt-0.5"
                   style={{ color: "#FFC21A" }}>Health: {score}%</p>
                {/* caret */}
                <span
                  className="absolute top-full left-1/2 -translate-x-1/2
                             border-4 border-transparent border-t-[#14203D]"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Ground strip ── */}
      <div
        className="rounded-full h-2 w-full"
        style={{ background: "linear-gradient(90deg,#EAEDF4 0%,#D5DCEA 45%,#EAEDF4 100%)" }}
      />

      {/* ── Label ── */}
      <p className="text-center text-[11px] font-black uppercase tracking-[0.13em] text-[#4F5B75]">
        {c.label} · {score}%
      </p>

      <style>{`
        @keyframes tree-sway {
          0%,100% { transform: rotate(-2.5deg); }
          50%     { transform: rotate(2.5deg);  }
        }
        @keyframes tally-float {
          0%,100% { transform: translateY(0px);  }
          50%     { transform: translateY(-7px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="tree-sway"],
          [style*="tally-float"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
