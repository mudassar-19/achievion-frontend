import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, User, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import useAuthStore from "@/stores/authStore";
import { useRoleTheme } from "@/utils/roleTheme";
import api from "@/lib/api";

const SCOPE_LABEL = {
  org:  "Org-Wide",
  team: "My Team",
  role: "My Role",
};

const RANK_COLORS = {
  1: { text: "text-[#7A5200]", bg: "bg-[#FFC21A]/10" },
  2: { text: "text-slate-300", bg: "bg-ink/5"       },
  3: { text: "text-[#7B4C1E]", bg: "bg-[#cd7f32]/10" },
};

const rowVariants = {
  hidden:  { opacity: 0, x: 10 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
};
const listVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

/**
 * LeaderboardCard
 * @param {"org"|"team"|"role"} scope  — controls which leaderboard endpoint is called
 */
export default function LeaderboardCard({ scope = "org" }) {
  const theme = useRoleTheme();
  const user  = useAuthStore((s) => s.user);

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/gamification/leaderboard?scope=${scope}`)
      .then((r) => { setRows(r.rows ?? []); setLoading(false); })
      .catch((e) => { console.error(e); setLoading(false); });
  }, [scope]);

  const userRow   = rows.find((r) => r.isUser);
  const aboveUser = userRow ? rows.find((r) => r.rank === userRow.rank - 1) : null;
  const gap       = aboveUser ? ((aboveUser.xp ?? 0) - (userRow?.xp ?? 0)).toLocaleString() : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col rounded-2xl overflow-hidden bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] border border-ink/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(20,32,61,0.05)]"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink/[0.06]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFC21A]/10 border border-[#8A6200]/20">
            <Trophy size={14} className="text-[#7A5200]" strokeWidth={2} />
          </span>
          <h2 className="text-sm font-bold text-text-primary">Leaderboard</h2>
        </div>
        <span
          className="text-[14px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: theme.accentLight,
            border: `1px solid ${theme.border}`,
            color: theme.text,
          }}
        >
          {SCOPE_LABEL[scope]}
        </span>
      </div>

      {/* Rows */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="text-xs text-slate-500">Loading…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <span className="text-xs text-slate-500 italic">No data yet.</span>
        </div>
      ) : (
        <motion.ul
          initial="hidden"
          animate="visible"
          variants={listVariants}
          className="flex flex-col divide-y divide-ink/[0.04]"
        >
          {rows.map((row) => {
            const rankStyle = RANK_COLORS[row.rank];
            return (
              <motion.li
                key={`${row.rank}-${row.name}`}
                variants={rowVariants}
                className={[
                  "flex items-center gap-3 px-5 py-3 transition-colors",
                  row.isUser
                    ? "border-l-2 -ml-[2px]"
                    : "hover:bg-ink/[0.025]",
                ].join(" ")}
                style={
                  row.isUser
                    ? { background: `${theme.accentLight}`, borderLeftColor: theme.accent }
                    : {}
                }
              >
                {/* Rank */}
                <span
                  className={[
                    "shrink-0 w-6 text-center text-sm font-black tabular-nums",
                    rankStyle ? rankStyle.text : "text-slate-500",
                  ].join(" ")}
                >
                  #{row.rank}
                </span>

                {/* Avatar bubble */}
                <span
                  className={[
                    "shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-black",
                    row.isUser
                      ? "text-text-primary shadow-lg"
                      : "bg-bg-elevated border border-ink/10 text-slate-400",
                  ].join(" ")}
                  style={
                    row.isUser
                      ? { background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentLight})` }
                      : {}
                  }
                  aria-hidden
                >
                  {row.isUser ? (user?.username?.[0] ?? "Y") : <User size={13} strokeWidth={1.75} />}
                </span>

                {/* Name */}
                <span
                  className={[
                    "flex-1 text-sm font-semibold truncate",
                    row.isUser ? "text-text-primary" : "text-slate-400",
                  ].join(" ")}
                >
                  {row.isUser ? (user?.username ?? row.name) : row.name}
                  {row.isUser && (
                    <span
                      className="ml-1.5 text-[14px] font-bold uppercase tracking-widest"
                      style={{ color: theme.text }}
                    >
                      you
                    </span>
                  )}
                </span>

                {/* XP */}
                <span className="shrink-0 text-xs font-bold tabular-nums text-slate-500">
                  {(row.xp ?? 0).toLocaleString()}
                </span>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-ink/[0.06]">
        {gap ? (
          <p className="text-[14px] text-slate-600">
            <span style={{ color: theme.text }} className="font-semibold">{gap} XP</span> behind #{(userRow?.rank ?? 1) - 1}
          </p>
        ) : (
          <p className="text-[14px] text-slate-600">You&apos;re at the top! 🏆</p>
        )}
        <Link
          to="/workspace/leaderboard"
          className="flex items-center gap-1 text-[14px] font-semibold text-slate-600 hover:text-slate-700 transition-colors"
        >
          Full board <ExternalLink size={10} strokeWidth={2} />
        </Link>
      </div>
    </motion.div>
  );
}
