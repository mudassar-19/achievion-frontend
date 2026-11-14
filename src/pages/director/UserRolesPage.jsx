import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Minus, Plus, Building2, UserCog } from "lucide-react";
import LastSeen from "@/components/ui/LastSeen";
import { DepartmentsDrawer, MemberDrawer } from "./people/PeopleDrawers";

import PageHeader from "@/components/ui/PageHeader";
import Drawer     from "@/components/ui/Drawer";
import api        from "@/lib/api";
import useUiStore from "@/stores/uiStore";
import TallyLoader from "@/components/ui/TallyLoader";
import { avatarUrl } from "@/lib/avatar";
import OrgCodeBadge  from "@/components/ui/OrgCodeBadge";

// Roles that have XP and are eligible for Director adjustment (D6, D-025).
const XP_ELIGIBLE = new Set(["Team Lead", "Senior Developer", "Junior Developer", "Senior Designer", "Junior Designer", "Senior Tester", "Junior Tester", "Developer", "Designer", "Tester"]);

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

function RoleBadge({ role, roleLabel }) {
  const cat  = roleCategory(role);
  const rcfg = ROLE_CATEGORY_COLOR[cat] ?? ROLE_CATEGORY_COLOR.developer;
  return (
    <span className={[
      "text-[14px] font-bold px-2.5 py-1 rounded-full border w-fit whitespace-nowrap",
      rcfg.text, rcfg.bg, rcfg.border,
    ].join(" ")}>
      {roleLabel || role}
    </span>
  );
}

// ── AdjustXpDrawer ────────────────────────────────────────────────────────────
const REASON_MIN = 5;
const REASON_MAX = 300;
const AMOUNT_MAX = 500;

function AdjustXpDrawer({ employee, open, onClose, onSuccess }) {
  const addToast = useUiStore((s) => s.addToast);
  const [amount,  setAmount]  = useState(10);
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);
  const [apiErr,  setApiErr]  = useState(null);
  const amountRef = useRef(null);

  // Reset form when target changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) { setAmount(10); setReason(""); setApiErr(null); }
  }, [open, employee?.id]);

  const clampAmount = (v) => {
    const n = parseInt(v, 10);
    if (isNaN(n)) return 0;
    return Math.max(-AMOUNT_MAX, Math.min(AMOUNT_MAX, n));
  };

  const reasonErr = reason.length > 0 && reason.trim().length < REASON_MIN
    ? `At least ${REASON_MIN} characters`
    : reason.length > REASON_MAX
    ? `${REASON_MAX} characters maximum`
    : null;

  const amountErr = amount === 0
    ? "Amount must not be zero"
    : Math.abs(amount) > AMOUNT_MAX
    ? `Maximum ±${AMOUNT_MAX} XP`
    : null;

  const canSubmit = !loading && !reasonErr && !amountErr
    && reason.trim().length >= REASON_MIN
    && amount !== 0;

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    setApiErr(null);
    try {
      const adjustId = crypto.randomUUID();
      const result = await api.post(`/api/director/team/${employee.id}/adjust-xp`, {
        amount, reason: reason.trim(), adjustId,
      });
      if (result.duplicate) {
        addToast({ type: "info", message: "This adjustment was already applied." });
      } else {
        const sign   = amount >= 0 ? "+" : "";
        const change = `${sign}${result.applied ?? amount} XP`;
        addToast({
          type:    "success",
          message: `${employee.name}: ${change}. XP ${result.before ?? "??"} → ${result.after ?? "??"}`,
        });
        onSuccess?.();
      }
      onClose();
    } catch (err) {
      setApiErr(err?.response?.data?.error ?? err?.message ?? "Adjustment failed.");
    } finally {
      setLoading(false);
    }
  }

  const isNeg = amount < 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={employee ? `Adjust XP — ${employee.name}` : "Adjust XP"}
      width={440}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-muted transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className={[
              "px-5 py-2 rounded-xl text-sm font-bold transition-all duration-150",
              canSubmit
                ? "bg-[#2A62EC] text-white hover:bg-[#1948BD] active:scale-[.97] shadow-[0_2px_8px_rgba(42,98,236,.30)]"
                : "bg-bg-muted text-text-secondary cursor-not-allowed",
            ].join(" ")}
          >
            {loading ? "Applying…" : "Apply Adjustment"}
          </button>
        </>
      }
    >
      {employee && (
        <div className="flex flex-col gap-6 px-6 py-6">

          {/* Employee summary */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full overflow-hidden border border-ink/[0.10] bg-bg-base shrink-0">
              <img
                src={avatarUrl("bottts", employee.name)}
                alt={employee.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{employee.name}</p>
              <RoleBadge role={employee.role} roleLabel={employee.roleLabel} />
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-2">
            <label htmlFor="xp-amount" className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              XP Amount
            </label>
            <div className="flex items-center gap-2">
              {/* Quick-step buttons */}
              <button
                type="button"
                onClick={() => setAmount((v) => clampAmount(v - 10))}
                disabled={loading}
                aria-label="Decrease by 10"
                className="h-10 w-10 rounded-xl flex items-center justify-center border border-ink/[0.08] text-text-secondary hover:bg-bg-muted hover:text-text-primary transition-colors disabled:opacity-40 shrink-0"
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>

              <div className="relative flex-1">
                <input
                  id="xp-amount"
                  ref={amountRef}
                  type="number"
                  min={-AMOUNT_MAX}
                  max={AMOUNT_MAX}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(clampAmount(e.target.value))}
                  disabled={loading}
                  className={[
                    "w-full text-center text-2xl font-black rounded-xl border px-4 py-2.5 outline-none transition-colors bg-bg-base",
                    "focus:border-[#2A62EC] focus:ring-2 focus:ring-[#2A62EC]/20",
                    amountErr ? "border-red-400" : "border-ink/[0.10]",
                    isNeg     ? "text-red-500" : "text-[#2A62EC]",
                    "disabled:opacity-50",
                  ].join(" ")}
                  aria-describedby={amountErr ? "amount-err" : undefined}
                />
                {/* +/- sign hint */}
                <span className={[
                  "absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold pointer-events-none select-none",
                  isNeg ? "text-red-400" : "text-[#2A62EC]/60",
                ].join(" ")}>
                  {isNeg ? "deduct" : "add"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setAmount((v) => clampAmount(v + 10))}
                disabled={loading}
                aria-label="Increase by 10"
                className="h-10 w-10 rounded-xl flex items-center justify-center border border-ink/[0.08] text-text-secondary hover:bg-bg-muted hover:text-text-primary transition-colors disabled:opacity-40 shrink-0"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {amountErr && (
                <motion.p
                  id="amount-err"
                  key="amount-err"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className="text-xs text-red-500 font-medium"
                  role="alert"
                >
                  {amountErr}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Quick-select chips */}
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {[-100, -50, -10, 10, 50, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(clampAmount(v))}
                  disabled={loading}
                  className={[
                    "px-3 py-1 rounded-lg text-xs font-bold border transition-colors",
                    amount === v
                      ? v < 0
                        ? "bg-red-50 border-red-300 text-red-600"
                        : "bg-[#2A62EC]/10 border-[#2A62EC]/30 text-[#1948BD]"
                      : "border-ink/[0.07] text-text-secondary hover:bg-bg-muted hover:text-text-primary",
                    "disabled:opacity-40",
                  ].join(" ")}
                >
                  {v > 0 ? `+${v}` : v}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="xp-reason" className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Reason <span className="text-red-400 font-bold">*</span>
              </label>
              <span className={[
                "text-xs tabular-nums font-medium transition-colors",
                reason.length > REASON_MAX ? "text-red-500" : "text-text-secondary",
              ].join(" ")}>
                {reason.length}/{REASON_MAX}
              </span>
            </div>
            <textarea
              id="xp-reason"
              rows={4}
              placeholder="Explain why you're adjusting this employee's XP…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              className={[
                "w-full resize-none rounded-xl border px-4 py-3 text-sm text-text-primary bg-bg-base",
                "outline-none transition-colors placeholder:text-text-secondary/50",
                "focus:border-[#2A62EC] focus:ring-2 focus:ring-[#2A62EC]/20",
                reasonErr ? "border-red-400" : "border-ink/[0.10]",
                "disabled:opacity-50",
              ].join(" ")}
              aria-describedby={reasonErr ? "reason-err" : undefined}
            />
            <AnimatePresence mode="wait">
              {reasonErr && (
                <motion.p
                  id="reason-err"
                  key="reason-err"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14 }}
                  className="text-xs text-red-500 font-medium"
                  role="alert"
                >
                  {reasonErr}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* API error */}
          <AnimatePresence>
            {apiErr && (
              <motion.div
                key="api-err"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {apiErr}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Limits note */}
          <p className="text-xs text-text-secondary/70 leading-relaxed border-t border-ink/[0.05] pt-4">
            Limits: ±{AMOUNT_MAX} XP per adjustment · 3 per employee per day ·
            Applies only to Team Lead, Developer, Designer, and Tester roles ·
            Logged to audit trail and employee is notified.
          </p>

        </div>
      )}
    </Drawer>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UserRolesPage() {
  const addToast = useUiStore((s) => s.addToast);
  const [team,    setTeam]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjTarget, setAdjTarget] = useState(null); // employee to adjust
  const [deptOpen, setDeptOpen] = useState(false);  // Batch 5 (D4): departments drawer
  const [detail, setDetail] = useState(null);       // Batch 5 (N4, N5, X17): one member's department, skills, phone, last seen
  const refresh = () => api.get("/api/director/team").then((d) => setTeam(Array.isArray(d) ? d : (d.members ?? []))).catch(() => {});

  function fetchTeam() {
    setLoading(true);
    api.get("/api/director/team")
      .then((d) => setTeam(Array.isArray(d) ? d : (d.members ?? [])))
      .catch(() => addToast({ type: "error", message: "Failed to load team members." }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTeam();
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
        <PageHeader title="Team Roster" subtitle={`${team.length} team member${team.length !== 1 ? "s" : ""}`}
          primary={{ label: "Departments", icon: Building2, onClick: () => setDeptOpen(true) }} />
      </motion.div>

      {/* ── Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.08 }}
        className="glass-panel rounded-2xl border border-ink/[0.07] overflow-hidden"
      >
        <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_160px_160px_auto] gap-4 px-6 py-3.5 border-b border-ink/[0.06] bg-ink/[0.025]">
          {["Employee", "Role", "Project", ""].map((h, i) => (
            <p key={i} className={`text-[14px] font-black uppercase tracking-[0.18em] text-slate-600 ${i === 1 || i === 2 ? "hidden md:block" : ""}`}>{h}</p>
          ))}
        </div>

        {team.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-slate-600">No team members yet.</p>
            <p className="text-xs text-slate-400">Share your workspace code so members can join.</p>
            <OrgCodeBadge />
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-ink/[0.04]">
            {team.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, delay: 0.08 + i * 0.04 }}
                className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_160px_160px_auto] md:gap-4 md:items-center px-6 py-4 hover:bg-ink/[0.03] transition-colors duration-100"
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
                    <p data-member-meta className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-text-secondary">
                      <span className="truncate">{member.department || "No department"}</span>
                      {member.skills?.length > 0 && <span className="truncate" title={member.skills.join(", ")}>{member.skills.slice(0, 3).join(", ")}{member.skills.length > 3 ? ` +${member.skills.length - 3}` : ""}</span>}
                      <LastSeen at={member.lastSeenAt} />
                    </p>
                  </div>
                </div>

                <div className="hidden md:block"><RoleBadge role={member.role} roleLabel={member.roleLabel} /></div>

                <p className="hidden md:block text-[13px] text-slate-500 truncate" title={Array.isArray(member.projects) && member.projects.length > 0 ? member.projects.map(p => p.name).join(", ") : undefined}>
                  {Array.isArray(member.projects) && member.projects.length > 0
                    ? member.projects.map((p) => p.name).join(", ")
                    : "—"}
                </p>

                {/* Adjust XP — only for XP-eligible roles */}
                <div className="flex items-center justify-start gap-1.5 md:justify-end">
                  <button type="button" onClick={() => setDetail(member)} aria-label={`Department, skills and contact of ${member.name}`} title="Department, skills and contact"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink/[0.09] text-text-secondary transition-colors hover:bg-ink/[0.05] hover:text-text-primary">
                    <UserCog size={14} aria-hidden="true" />
                  </button>
                  {XP_ELIGIBLE.has(member.role) ? (
                    <button
                      type="button"
                      onClick={() => setAdjTarget(member)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-ink/[0.09] text-text-secondary hover:border-[#2A62EC]/40 hover:text-[#2A62EC] hover:bg-[#2A62EC]/[0.06] transition-all duration-150 group"
                      aria-label={`Adjust XP for ${member.name}`}
                    >
                      <Zap size={12} strokeWidth={2.5} className="transition-transform group-hover:scale-110" />
                      <span className="hidden sm:inline">XP</span>
                    </button>
                  ) : (
                    <span className="w-[52px]" aria-hidden />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <DepartmentsDrawer open={deptOpen} onClose={() => setDeptOpen(false)} onChanged={refresh} />
      <MemberDrawer member={detail} open={!!detail} onClose={() => setDetail(null)} onChanged={refresh} />

      {/* ── Adjust XP Drawer ── */}
      <AdjustXpDrawer
        employee={adjTarget}
        open={!!adjTarget}
        onClose={() => setAdjTarget(null)}
        onSuccess={fetchTeam}
      />

    </div>
  );
}
