import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, UserCheck, UserX, Building2,
  PlusCircle, ArrowRight, Copy,
} from "lucide-react";
import useOrgAuthStore from "@/stores/orgAuthStore";
import useUiStore from "@/stores/uiStore";
import api from "@/lib/api";

import TallyLoader from "@/components/ui/TallyLoader";
// ── Role badge colours ────────────────────────────────────────────────────────
const ROLE_BADGE = {
  director:  { bg: "bg-violet-500/15", text: "text-violet-400",  border: "border-violet-500/25" },
  manager:   { bg: "bg-blue-500/15",   text: "text-blue-400",    border: "border-blue-500/25"   },
  team_lead: { bg: "bg-indigo-500/15", text: "text-indigo-400",  border: "border-indigo-500/25" },
  developer: { bg: "bg-cyan-500/15",   text: "text-cyan-400",    border: "border-cyan-500/25"   },
  designer:  { bg: "bg-pink-500/15",   text: "text-pink-400",    border: "border-pink-500/25"   },
  tester:    { bg: "bg-amber-500/15",  text: "text-amber-400",   border: "border-amber-500/25"  },
};

function RoleBadge({ roleCategory, role }) {
  const s = ROLE_BADGE[roleCategory] ?? ROLE_BADGE.developer;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[14px] font-bold border ${s.bg} ${s.text} ${s.border}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    suspended: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    deleted:   "bg-red-500/15 text-red-400 border-red-500/25",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[14px] font-bold border ${styles[status] ?? styles.active}`}>
      {status}
    </span>
  );
}

function InitialsAvatar({ name }) {
  const initials = name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";
  return (
    <div className="h-9 w-9 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center shrink-0">
      <span className="text-[14px] font-black text-accent-text">{initials}</span>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.4, 0, 0.2, 1] } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

export default function OrgDashboard() {
  const navigate = useNavigate();
  const orgToken = useOrgAuthStore((s) => s.orgToken);
  const org      = useOrgAuthStore((s) => s.org);
  const addToast = useUiStore((s) => s.addToast);

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  function handleCopyOrgCode() {
    if (!org?.orgCode) return;
    navigator.clipboard.writeText(org.orgCode).then(() => {
      addToast({ type: "success", message: "Org code copied to clipboard!" });
    });
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/api/org/dashboard", {
          headers: { Authorization: `Bearer ${orgToken}` },
        });
        setData(res.data);
      } catch (err) {
        setError(err.message ?? "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgToken]);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <TallyLoader />
          <p className="text-sm text-text-secondary">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-full items-center justify-center py-24">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Employees",
      value: data.totalMembers,
      icon: Users,
      color: "var(--accent-text)",
      bg:   "rgb(var(--c-accent) / 0.06)",
      border: "rgb(var(--c-accent) / 0.16)",
      glow:   "rgb(var(--c-accent) / 0.10)",
    },
    {
      label: "Active Members",
      value: data.activeMembers,
      icon: UserCheck,
      color: "#0E6A30",
      bg:   "rgba(18,128,59,0.06)",
      border: "rgba(18,128,59,0.16)",
      glow:   "rgba(18,128,59,0.10)",
    },
    {
      label: "Suspended",
      value: data.suspendedMembers,
      icon: UserX,
      color: "#7A5200",
      bg:   "rgba(255,194,26,0.06)",
      border: "rgba(255,194,26,0.18)",
      glow:   "rgba(255,194,26,0.10)",
    },
    {
      label: "Departments",
      value: (data.departments ?? []).length,
      icon: Building2,
      color: "#1948BD",
      bg:   "rgba(42,98,236,0.06)",
      border: "rgba(42,98,236,0.16)",
      glow:   "rgba(42,98,236,0.10)",
    },
  ];

  return (
    <div className="flex flex-col gap-7 px-4 sm:px-8 py-8 min-h-full">

      {/* ── Page header ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent-text mb-1">
          Admin Panel
        </p>
        <h1 className="text-3xl font-black text-text-primary">Organization Overview</h1>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <p className="text-sm text-text-secondary">{data.orgName}</p>
          {org?.orgCode && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-accent-text tracking-wider text-lg">
                  {org.orgCode}
                </span>
                <button
                  onClick={handleCopyOrgCode}
                  title="Copy org code"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-accent-text hover:bg-accent/10 transition-all"
                >
                  <Copy size={14} strokeWidth={2} />
                </button>
              </div>
              <p className="text-xs text-slate-600">Share this code with employees for login</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              variants={fadeUp}
              className="rounded-2xl p-5 flex items-start gap-4 border bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF]"
              style={{ borderColor: s.border, boxShadow: "var(--shadow-1)" }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border" style={{ background: s.bg, borderColor: s.border }}>
                <Icon size={19} style={{ color: s.color }} strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-2xl font-black text-text-primary leading-none">{s.value}</p>
                <p className="text-[14px] font-semibold text-slate-500 mt-0.5">{s.label}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Departments ── */}
      {data.departments?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <p className="text-xs font-bold uppercase tracking-widest text-text-disabled mb-2">Departments</p>
          <div className="flex flex-wrap gap-2">
            {data.departments.map((d) => (
              <span key={d} className="px-3 py-1 rounded-full border border-accent/20 bg-accent/08 text-accent-text text-xs font-semibold">
                {d}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Recent employees + Quick actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent employees table */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="lg:col-span-2 rounded-2xl flex flex-col border border-ink/8 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF]"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink/[0.05]">
            <h2 className="text-sm font-black text-text-primary">Recent Employees</h2>
            <button
              onClick={() => navigate("/org/employees")}
              className="text-[14px] text-accent-text hover:text-cyan-300 font-semibold uppercase tracking-widest transition-colors"
            >
              View All →
            </button>
          </div>

          {data.recentMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Users size={28} className="text-text-disabled" strokeWidth={1.5} />
              <p className="text-sm text-slate-600">No employees yet.</p>
              <button onClick={() => navigate("/org/employees/create")} className="text-xs text-accent-text font-semibold">
                Create your first employee →
              </button>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-ink/[0.04]">
              {data.recentMembers.map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 px-5 py-3.5">
                  <InitialsAvatar name={emp.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{emp.name}</p>
                    <p className="text-[14px] text-slate-500 truncate">{emp.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RoleBadge roleCategory={emp.roleCategory} role={emp.role} />
                    <StatusBadge status={emp.status} />
                  </div>
                  <button
                    onClick={() => navigate("/org/employees")}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-accent-text hover:bg-accent/08 transition-all"
                  >
                    <ArrowRight size={13} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="rounded-2xl flex flex-col gap-3 p-5 border border-ink/8 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF]"
        >
          <h2 className="text-sm font-black text-text-primary">Quick Actions</h2>

          <button
            onClick={() => navigate("/org/employees/create")}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-accent/20 bg-accent/08 text-accent-text hover:bg-accent/15 transition-colors text-sm font-semibold"
          >
            <PlusCircle size={16} strokeWidth={2} />
            Create Employee
          </button>

          <button
            onClick={() => navigate("/org/employees")}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-ink/10 bg-ink/[0.03] text-slate-300 hover:text-text-primary hover:bg-ink/[0.06] transition-colors text-sm font-semibold"
          >
            <Users size={16} strokeWidth={1.75} />
            View All Employees
          </button>

          {/* Role breakdown */}
          {Object.keys(data.membersByRole).length > 0 && (
            <div className="mt-1 flex flex-col gap-2">
              <p className="text-[14px] font-bold uppercase tracking-widest text-text-disabled">By Role</p>
              {Object.entries(data.membersByRole).map(([cat, count]) => {
                const s = ROLE_BADGE[cat] ?? ROLE_BADGE.developer;
                return (
                  <div key={cat} className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${s.text}`}>{cat.replace("_", " ")}</span>
                    <span className="text-xs font-bold text-text-primary">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

    </div>
  );
}
