import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import PageHeader from "@/components/ui/PageHeader";
import api from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import TallyLoader from "@/components/ui/TallyLoader";
import { avatarUrl } from "@/lib/avatar";

const ROLE_CATEGORY_COLOR = {
  manager:   { text: "text-[#131E86]", bg: "bg-[#2A62EC]/10", border: "border-[#2A62EC]/25" },
  team_lead: { text: "text-[#08695F]", bg: "bg-[#0A7F76]/10", border: "border-[#0A7F76]/25" },
  developer: { text: "text-[#131E86]", bg: "bg-[#2A62EC]/10", border: "border-[#2A62EC]/25" },
  designer:  { text: "text-[#1948BD]", bg: "bg-[#2A62EC]/10", border: "border-[#2A62EC]/25" },
  tester:    { text: "text-accent-text", bg: "bg-accent/10", border: "border-accent/20" },
};

function roleCategory(role) {
  if (role === "Manager")          return "manager";
  if (role === "Team Lead")        return "team_lead";
  if (role?.includes("Designer"))  return "designer";
  if (role?.includes("Tester"))    return "tester";
  return "developer";
}

function RoleBadge({ role }) {
  const cat  = roleCategory(role);
  const rcfg = ROLE_CATEGORY_COLOR[cat] ?? ROLE_CATEGORY_COLOR.developer;
  return (
    <span className={[
      "text-[14px] font-bold px-2.5 py-1 rounded-full border w-fit whitespace-nowrap",
      rcfg.text, rcfg.bg, rcfg.border,
    ].join(" ")}>
      {role}
    </span>
  );
}

export default function UserRolesPage() {
  const addToast = useUiStore((s) => s.addToast);
  const [team,    setTeam]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/director/team")
      .then((d) => setTeam(Array.isArray(d) ? d : (d.members ?? [])))
      .catch(() => addToast({ type: "error", message: "Failed to load team members." }))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center py-24">
        <TallyLoader />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 max-w-[1280px] mx-auto w-full">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34 }}
      >
        <PageHeader title="Team Roster" subtitle={`${team.length} team member${team.length !== 1 ? "s" : ""}`} />
      </motion.div>

      {/* ── Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.08 }}
        className="glass-panel rounded-2xl border border-ink/[0.07] overflow-hidden"
      >
        <div className="grid grid-cols-[1fr_180px] gap-4 px-6 py-3.5 border-b border-ink/[0.06] bg-ink/[0.025]">
          {["Employee", "Role"].map((h) => (
            <p key={h} className="text-[14px] font-black uppercase tracking-[0.18em] text-slate-600">{h}</p>
          ))}
        </div>

        {team.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-slate-600">No team members found.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-ink/[0.04]">
            {team.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, delay: 0.08 + i * 0.04 }}
                className="grid grid-cols-[1fr_180px] gap-4 items-center px-6 py-4 hover:bg-ink/[0.03] transition-colors duration-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full overflow-hidden border border-ink/[0.10] bg-bg-base shrink-0">
                    <img
                      src={avatarUrl("bottts", member.name)}
                      alt={member.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">{member.name}</p>
                    <p className="text-[14px] text-slate-600 truncate">{member.email}</p>
                  </div>
                </div>

                <RoleBadge role={member.role} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

    </div>
  );
}
