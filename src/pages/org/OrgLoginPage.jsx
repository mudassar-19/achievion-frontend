import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, AlertCircle } from "lucide-react";
import GlassCard    from "@/components/ui/GlassCard";
import Input        from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import Button       from "@/components/ui/Button";
import useOrgAuthStore from "@/stores/orgAuthStore";
import api from "@/lib/api";

const DOT_STYLE = {
  backgroundImage: "radial-gradient(rgb(var(--c-accent) / 0.07) 1px, transparent 1px)",
  backgroundSize:  "28px 28px",
};

const containerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
};

export default function OrgLoginPage() {
  const navigate = useNavigate();
  const setOrg   = useOrgAuthStore((s) => s.setOrg);

  const [form,    setForm]    = useState({ email: "", password: "" });
  const [errors,  setErrors]  = useState({});
  const [apiErr,  setApiErr]  = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => {
    setApiErr("");
    setErrors((p) => ({ ...p, [field]: undefined }));
    setForm((p) => ({ ...p, [field]: e.target.value }));
  };

  function validate() {
    const errs = {};
    if (!form.email.trim())    errs.email    = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email.";
    if (!form.password)        errs.password = "Password is required.";
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
      const res = await api.post("/api/org/login", {
        email:    form.email.trim(),
        password: form.password,
      });
      setOrg(res.data.org, res.data.token);
      navigate("/org/dashboard", { replace: true });
    } catch (err) {
      setApiErr(err.message ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative overflow-hidden min-h-screen flex flex-col items-center justify-center bg-bg-base px-4 py-12"
      style={DOT_STYLE}
    >
      {/* Glow orb */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.18, 0.32, 0.18] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full blur-3xl"
        style={{ background: "rgb(var(--c-accent) / 0.07)" }}
      />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-[#2A62EC] shadow-card">
            <Building2 size={22} className="text-accent-on" strokeWidth={1.75} />
          </span>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-black text-text-primary tracking-tight">Software House Login</h1>
            <p className="text-sm text-text-secondary">Sign in to your organisation admin panel.</p>
          </div>
        </div>

        <GlassCard padding="lg">
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
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[#D1291F]/10 border border-[#D1291F]/30"
                >
                  <AlertCircle size={14} className="text-[#B01F17] shrink-0 mt-px" strokeWidth={2} />
                  <p className="text-xs font-semibold text-[#B01F17] leading-snug">{apiErr}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div variants={itemVariants}>
              <Input
                label="Admin Email"
                id="org-login-email"
                type="email"
                placeholder="admin@yourcompany.com"
                value={form.email}
                onChange={update("email")}
                error={errors.email}
                required
                autoComplete="email"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <PasswordInput
                label="Password"
                id="org-login-password"
                placeholder="••••••••"
                value={form.password}
                onChange={update("password")}
                error={errors.password}
                required
                autoComplete="current-password"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full"
              >
                Sign In to Admin Panel
              </Button>
            </motion.div>
          </motion.form>
        </GlassCard>

        {/* Footer links */}
        <p className="text-center text-xs text-text-disabled">
          Not an admin?{" "}
          <Link to="/login" className="text-cyan-DEFAULT hover:text-cyan-300 font-medium transition-colors">
            Employee login
          </Link>
          {" · "}
          <Link to="/register/step-1" className="text-purple-DEFAULT hover:text-purple-400 font-medium transition-colors">
            Register organisation
          </Link>
        </p>
      </div>
    </div>
  );
}
