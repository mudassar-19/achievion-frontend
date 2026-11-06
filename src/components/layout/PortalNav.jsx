import { NavLink } from "react-router-dom";

// Shared portal navigation (V2 Phase 0.4). Data-driven: a portal passes 3-6 groups
//   [{ label: "Work", items: [{ icon, label, to, end?, badge? }] }]
// Visual language follows the Director rail: tinted pill for the active item, no side stripe.
// Each portal keeps its own role accent through `theme` (useRoleTheme()).

function GroupLabel({ label }) {
  return (
    <p className="mx-5 mt-5 mb-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-600 select-none">
      {label}
    </p>
  );
}

function PortalNavItem({ icon: Icon, label, to, end = false, badge, theme }) {
  return (
    <NavLink
      to={to}
      end={end}
      className="block mx-2 rounded-xl select-none focus-visible:outline-none focus-visible:ring-2"
      style={({ isActive }) => ({
        background: isActive ? theme.accentLight : "transparent",
        "--tw-ring-color": theme.border,
      })}
    >
      {({ isActive }) => (
        <span
          className={[
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-100",
            isActive
              ? "font-semibold"
              : "font-medium text-[color:var(--nav-text)] hover:text-[color:var(--nav-text-hover)] hover:bg-[var(--nav-bg-hover)]",
          ].join(" ")}
          style={isActive ? { color: theme.text } : undefined}
        >
          <Icon size={17} strokeWidth={isActive ? 2 : 1.75} className="shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0 truncate">{label}</span>
          {badge > 0 && (
            <span
              className="shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none tabular-nums"
              style={{ background: theme.accentLight, color: theme.text, boxShadow: `inset 0 0 0 1px ${theme.border}` }}
            >
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </span>
      )}
    </NavLink>
  );
}

export default function PortalNav({ groups, theme, label = "Primary navigation" }) {
  return (
    <nav className="flex-1 min-h-0 pb-3 flex flex-col overflow-y-auto" aria-label={label}>
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <div key={g.label} role="group" aria-label={g.label}>
            <GroupLabel label={g.label} />
            <div className="flex flex-col gap-0.5">
              {g.items.map((it) => (
                <PortalNavItem key={it.to} {...it} theme={theme} />
              ))}
            </div>
          </div>
        ))}
    </nav>
  );
}
