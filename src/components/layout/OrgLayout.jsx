import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, LogOut, PlusCircle, ClipboardList } from "lucide-react";
import useOrgAuthStore from "@/stores/orgAuthStore";
import useUiStore from "@/stores/uiStore";
import ToastContainer from "@/components/ui/ToastContainer";
import { NavToggle, NavScrim } from "./ShellNav";
import socket, { joinRooms } from "@/utils/socket";
import DirectorSetupModal from "@/components/org/DirectorSetupModal";

const TOPBAR_H  = 56;
const SIDEBAR_W = 220;

const NAV = [
  { label: "Dashboard",        icon: LayoutDashboard, to: "/org/dashboard",         end: true  },
  { label: "Employees",        icon: Users,           to: "/org/employees",          end: true  },
  { label: "Create Employee",  icon: PlusCircle,      to: "/org/employees/create",   end: true  },
  { label: "Approvals",        icon: ClipboardList,   to: "/org/approvals",          end: true  },
];

function NavItem({ icon: Icon, label, to, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 mx-2 px-3.5 py-2.5 rounded-lg text-sm font-medium",
          "transition-all duration-150 border-l-2",
          isActive
            ? "text-accent-text bg-accent/10 border-accent"
            : "text-[color:var(--nav-text)] hover:text-[color:var(--nav-text-hover)] hover:bg-[var(--nav-bg-hover)] border-transparent",
        ].join(" ")
      }
    >
      <Icon size={16} strokeWidth={1.75} className="shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function OrgLayout() {
  const navOpen  = useUiStore((s) => s.navOpen);
  const org      = useOrgAuthStore((s) => s.org);
  const clearOrg = useOrgAuthStore((s) => s.clearOrg);
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);

  const [showSetup, setShowSetup] = useState(!org?.directorSetupComplete);

  // Connect socket to org room for real-time approval notifications
  useEffect(() => {
    if (!org?.orgDbId) return;

    joinRooms({ orgId: org.orgDbId }); // (re)joins on every reconnect too (FE-042)

    function handleApprovalResolved(data) {
      const desc = data.description ? ` — ${data.description}` : "";
      if (data.status === "APPROVED") {
        addToast({ type: "success", message: `Request approved${desc}` });
      } else {
        const reason = data.rejectionReason ? `: ${data.rejectionReason}` : "";
        addToast({ type: "error", message: `Request rejected${desc}${reason}`, duration: 7000 });
      }
    }

    socket.on("approval:resolved", handleApprovalResolved);

    return () => {
      socket.off("approval:resolved", handleApprovalResolved);
    };
  }, [org?.orgDbId, addToast]);

  function handleSignOut() {
    socket.disconnect(); // listeners are removed by the effect cleanup (FE-038)
    clearOrg();
    navigate("/org/login", { replace: true });
  }

  return (
    <div className="bg-bg-base font-sans text-text-primary antialiased">

      {/* ── Top bar ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 border-b border-ink/5 bg-bg-surface"
        style={{ height: TOPBAR_H }}
      >
        {/* Brand + org name */}
        <div className="flex items-center gap-3 min-w-0">
          <NavToggle />
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#2A62EC] shadow-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6z" />
            </svg>
          </span>
          <div className="flex flex-col leading-none gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-text-primary leading-tight truncate max-w-[200px]">{org?.name ?? "Admin Panel"}</span>
              {org?.orgCode && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/08 border border-accent/20 cursor-pointer"
                  onClick={() => navigator.clipboard.writeText(org.orgCode)}
                  title="Click to copy org code"
                >
                  <span className="font-mono text-[14px] font-bold text-accent-text tracking-widest">
                    {org.orgCode}
                  </span>
                </div>
              )}
            </div>
            <span className="text-[14px] font-medium text-slate-600 tracking-wide">powered by Achievion</span>
          </div>
        </div>

        {/* Sign out */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-[#B01F17] hover:bg-[#D1291F]/08 border border-transparent hover:border-[#D1291F]/20 transition-all"
          >
            <LogOut size={13} strokeWidth={2} />
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside
        data-open={navOpen}
        className="shell-aside fixed left-0 z-40 flex flex-col border-r border-ink/5 bg-bg-surface overflow-y-auto"
        style={{ top: TOPBAR_H, bottom: 0, width: SIDEBAR_W }}
      >
        <nav className="flex flex-col gap-0.5 py-4 flex-1 min-h-0">
          {NAV.map((item) => <NavItem key={item.label} {...item} />)}
        </nav>
      </aside>

      {/* ── Main scrollable area ── */}
      <main
        id="main"
        className="shell-main fixed overflow-y-auto"
        style={{ top: TOPBAR_H, left: SIDEBAR_W, right: 0, bottom: 0 }}
      >
        <Outlet />
      </main>

      <NavScrim />
      <ToastContainer />

      {/* Director setup — blocks portal until director is registered */}
      {showSetup && (
        <DirectorSetupModal onComplete={() => setShowSetup(false)} />
      )}
    </div>
  );
}
