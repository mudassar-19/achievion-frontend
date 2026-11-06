import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import Input         from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import Button        from "@/components/ui/Button";
import AuthLayout    from "@/components/layout/AuthLayout";
import api           from "@/lib/api";

const containerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
};

export default function ForgotPasswordPage() {
  const [form, setForm]         = useState({ email: "", code: "", newPassword: "", confirm: "" });
  const [codeSent, setCodeSent] = useState(false); // step 1 done: a code was requested
  const [errors, setErrors]     = useState({});
  const [apiErr, setApiErr]     = useState("");
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const update = (field) => (e) => {
    setErrors((p) => ({ ...p, [field]: undefined }));
    setApiErr("");
    setForm((p) => ({ ...p, [field]: e.target.value }));
  };

  function validate() {
    const errs = {};
    if (!form.email.trim())                       errs.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email))    errs.email = "Enter a valid email.";
    if (!form.newPassword)                        errs.newPassword = "New password is required.";
    else if (form.newPassword.length < 8)         errs.newPassword = "Minimum 8 characters.";
    if (form.confirm !== form.newPassword)        errs.confirm = "Passwords do not match.";
    return errs;
  }

  // Step 1: ask for a one-time code (the answer is the same whether or not the account exists).
  async function sendCode() {
    if (!/\S+@\S+\.\S+/.test(form.email)) { setErrors({ email: "Enter a valid email." }); return; }
    setLoading(true); setApiErr("");
    try {
      await api.post("/api/auth/forgot-password", { email: form.email.trim() });
      setCodeSent(true);
    } catch (err) {
      setApiErr(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!codeSent) { sendCode(); return; }
    const errs = validate();
    if (!form.code.trim()) errs.code = "Enter the code we sent you.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", {
        email:       form.email.trim(),
        code:        form.code.trim(),
        newPassword: form.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setApiErr(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-5 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 size={26} className="text-emerald-400" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-xl font-black text-text-primary">Password Reset!</h2>
            <p className="text-sm text-text-secondary mt-1">Your password has been updated. You can now log in.</p>
          </div>
          <Link to="/login" className="w-full">
            <Button variant="primary" size="md" className="w-full">Back to Login</Button>
          </Link>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-5"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col gap-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2A62EC]/10 border border-[#2A62EC]/20 mb-1">
            <KeyRound size={20} className="text-[#1948BD]" strokeWidth={1.75} />
          </div>
          <h2 className="text-2xl font-black text-text-primary">Reset Password</h2>
          <p className="text-sm text-text-secondary">{codeSent ? "If that account exists, we sent a 6-digit code. It works once and expires in 10 minutes." : "Enter your email and we will send you a one-time code."}</p>
        </motion.div>

        {/* Error banner */}
        {apiErr && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 rounded-xl border border-danger/20 bg-danger/08 px-4 py-3 text-sm text-danger"
          >
            <AlertCircle size={15} strokeWidth={2} className="shrink-0" />
            {apiErr}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <motion.div variants={itemVariants}>
            <Input
              label="Email Address"
              id="fp-email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={update("email")}
              error={errors.email}
              autoComplete="email"
              required
            />
          </motion.div>

          {codeSent && (
            <motion.div variants={itemVariants}>
              <Input
                label="Reset code"
                id="fp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={form.code}
                onChange={update("code")}
                error={errors.code}
                required
              />
            </motion.div>
          )}

          {codeSent && <motion.div variants={itemVariants}>
            <PasswordInput
              label="New Password"
              id="fp-password"
              placeholder="Min. 8 characters"
              value={form.newPassword}
              onChange={update("newPassword")}
              error={errors.newPassword}
              autoComplete="new-password"
              required
            />
          </motion.div>}

          {codeSent && <motion.div variants={itemVariants}>
            <PasswordInput
              label="Confirm New Password"
              id="fp-confirm"
              placeholder="Repeat new password"
              value={form.confirm}
              onChange={update("confirm")}
              error={errors.confirm}
              autoComplete="new-password"
              required
            />
          </motion.div>}

          <motion.div variants={itemVariants}>
            <Button type="submit" variant="primary" size="md" loading={loading} className="w-full">
              {codeSent ? "Reset Password" : "Send reset code"}
            </Button>
          </motion.div>
        </form>

        <motion.p variants={itemVariants} className="text-center text-xs text-text-disabled">
          <Link to="/login" className="text-cyan-DEFAULT hover:text-cyan-300 font-medium transition-colors">
            ← Back to Login
          </Link>
        </motion.p>
      </motion.div>
    </AuthLayout>
  );
}
