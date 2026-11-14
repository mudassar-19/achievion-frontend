import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardCheck, PlusCircle, Copy, Check, Lock, AlertCircle } from "lucide-react";
import Input  from "@/components/ui/Input";
import useOrgAuthStore from "@/stores/orgAuthStore";
import api from "@/lib/api";

// ── Role groups for the dropdown ──────────────────────────────────────────────
const ROLE_GROUPS = [
  {
    label: "Leadership",
    roles: ["Manager", "Team Lead"],
  },
  {
    label: "Developers",
    roles: ["Senior Developer", "Junior Developer"],
  },
  {
    label: "Designers",
    roles: ["Senior Designer", "Junior Designer"],
  },
  {
    label: "Testers",
    roles: ["Senior Tester", "Junior Tester"],
  },
];

const BUILTIN_ROLES = ROLE_GROUPS.flatMap((g) => g.roles);

// ── Select shared class ───────────────────────────────────────────────────────
const SELECT_CLS =
  "w-full rounded-xl border border-slate-600 bg-[#FFFFFF] py-2.5 px-3 text-sm text-text-primary outline-none " +
  "focus:border-accent focus:shadow-card-hover transition-all";

// ── Approval Pending Modal ────────────────────────────────────────────────────
function ApprovalModal({ result, onCreateAnother, onViewList }) {
  const [copied, setCopied] = useState(false);

  function copyPassword() {
    if (!result?.data?.password) return;
    navigator.clipboard.writeText(result.data.password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const emp = result?.data ?? {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.93 }}
        className="w-full max-w-md rounded-2xl border border-ink/10 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] p-7 flex flex-col gap-5 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <ClipboardCheck size={22} className="text-amber-400" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-black text-text-primary">Sent for Approval</h3>
            <p className="text-xs text-text-secondary">Awaiting Director sign-off</p>
          </div>
        </div>

        {/* Employee summary */}
        {emp.name && (
          <div className="rounded-xl border border-ink/8 bg-ink/[0.03] px-4 py-3 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-text-disabled text-xs">Name</span>
              <span className="text-text-primary font-semibold">{emp.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-disabled text-xs">Email</span>
              <span className="text-slate-300">{emp.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-disabled text-xs">Role</span>
              <span className="text-slate-300">{emp.role}</span>
            </div>
          </div>
        )}

        {/* Password */}
        {emp.password && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[14px] font-bold uppercase tracking-widest text-text-disabled">Generated Password</p>
            <div className="flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5">
              <code className="flex-1 text-sm font-mono font-bold text-accent-text tracking-wider select-all">
                {emp.password}
              </code>
              <button
                onClick={copyPassword}
                className="p-1.5 rounded-lg hover:bg-ink/10 transition-colors text-slate-400 hover:text-text-primary"
                title="Copy password"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="text-[14px] text-text-disabled">Save this password — it won't be shown again.</p>
          </div>
        )}

        {/* Warning banner */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <Lock size={14} className="text-amber-400 mt-0.5 shrink-0" strokeWidth={2} />
          <p className="text-xs text-amber-300 leading-relaxed">
            The account <strong>cannot be used to log in</strong> until the Director approves this request.
            Once approved, the employee can sign in with the password above.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onCreateAnother}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent/15 border border-accent/25 text-accent-text text-sm font-bold hover:bg-accent/25 transition-colors"
          >
            <PlusCircle size={15} strokeWidth={2} />
            Create Another
          </button>
          <button
            onClick={onViewList}
            className="w-full px-4 py-2.5 rounded-xl border border-ink/10 text-sm font-semibold text-slate-400 hover:text-text-primary hover:bg-ink/5 transition-colors"
          >
            Go to Employee List
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Create Employee form ──────────────────────────────────────────────────────
const containerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
};

const EMPTY_FORM = { name: "", email: "", role: "Junior Developer" };

export default function CreateEmployee() {
  const navigate = useNavigate();
  const orgToken = useOrgAuthStore((s) => s.orgToken);

  const [form,        setForm]        = useState(EMPTY_FORM);
  const [errors,      setErrors]      = useState({});
  const [apiErr,      setApiErr]      = useState("");
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [customRoles, setCustomRoles] = useState([]);

  useEffect(() => {
    api.get("/api/director/settings/custom-roles")
      .then((d) => setCustomRoles((d?.customRoles ?? []).filter((r) => r.active)))
      .catch(() => {});
  }, []);

  const update = (field) => (e) => {
    setApiErr("");
    setErrors((p) => ({ ...p, [field]: undefined }));
    setForm((p) => ({ ...p, [field]: e.target.value }));
  };

  function validate() {
    const errs = {};
    if (!form.name.trim())  errs.name  = "Full name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email.";
    const allRoles = [...BUILTIN_ROLES, ...customRoles.map((r) => r.label)];
    if (!form.role || !allRoles.includes(form.role)) errs.role = "Select a valid role.";
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setApiErr("");
    setLoading(true);

    try {
      const res = await api.post(
        "/api/org/employees/create",
        {
          name:  form.name.trim(),
          email: form.email.trim(),
          role:  form.role,
        },
        { headers: { Authorization: `Bearer ${orgToken}` } }
      );
      setResult(res);
    } catch (err) {
      setApiErr(err.message ?? "Failed to create employee.");
    } finally {
      setLoading(false);
    }
  }

  function handleCreateAnother() {
    setResult(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setApiErr("");
  }

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-8 py-8 min-h-full max-w-2xl">

      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent-text mb-1">Admin Panel</p>
        <h1 className="text-3xl font-black text-text-primary">Create Employee</h1>
        <p className="text-sm text-text-secondary mt-1">
          A temporary password will be generated and shown once.
        </p>
      </div>

      <div className="rounded-2xl border border-ink/8 bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF] p-6">
        <motion.form
          onSubmit={handleSubmit}
          noValidate
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-5"
        >
          {/* API error */}
          <AnimatePresence>
            {apiErr && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[#D1291F]/10 border border-[#D1291F]/30"
              >
                <AlertCircle size={14} className="text-[#B01F17] shrink-0 mt-px" strokeWidth={2} />
                <p className="text-xs font-semibold text-[#B01F17] leading-snug">{apiErr}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Full Name */}
          <motion.div variants={itemVariants}>
            <Input
              label="Full Name"
              id="emp-name"
              placeholder="Alex Mercer"
              value={form.name}
              onChange={update("name")}
              error={errors.name}
              required
            />
          </motion.div>

          {/* Email */}
          <motion.div variants={itemVariants}>
            <Input
              label="Email Address"
              id="emp-email"
              type="email"
              placeholder="alex@yourcompany.com"
              value={form.email}
              onChange={update("email")}
              error={errors.email}
              required
            />
          </motion.div>

          {/* Role */}
          <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
            <label htmlFor="emp-role" className="text-sm font-semibold text-slate-300">
              Role <span className="text-danger ml-1">*</span>
            </label>
            <select
              id="emp-role"
              value={form.role}
              onChange={update("role")}
              className={[SELECT_CLS, errors.role ? "border-danger" : ""].join(" ")}
            >
              {ROLE_GROUPS.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.roles.map((r) => (
                    <option key={r} value={r} className="bg-[#FFFFFF]">{r}</option>
                  ))}
                </optgroup>
              ))}
              {customRoles.length > 0 && (
                <optgroup label="Custom Roles">
                  {customRoles.map((r) => (
                    <option key={r.key} value={r.label} className="bg-[#FFFFFF]">{r.label}</option>
                  ))}
                </optgroup>
              )}
            </select>
            {errors.role && <p className="text-xs text-danger">{errors.role}</p>}
          </motion.div>

          {/* Submit */}
          <motion.div variants={itemVariants} className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent/15 border border-accent/25 text-accent-text text-sm font-bold hover:bg-accent/25 transition-colors disabled:opacity-40"
            >
              {loading ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-accent/30 border-t-[var(--accent-text)] animate-spin" />Creating…</> : "Create Employee"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/org/employees")}
              className="px-4 py-2.5 rounded-xl border border-ink/10 text-sm font-semibold text-slate-400 hover:text-text-primary hover:bg-ink/5 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </motion.form>
      </div>

      {/* Success/Approval modal */}
      <AnimatePresence>
        {result && (
          <ApprovalModal
            result={result}
            onCreateAnother={handleCreateAnother}
            onViewList={() => navigate("/org/employees")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
