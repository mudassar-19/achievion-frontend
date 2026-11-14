import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import Input          from "@/components/ui/Input";
import PasswordInput  from "@/components/ui/PasswordInput";
import Button         from "@/components/ui/Button";
import useAuthStore from "@/stores/authStore";
import usePerfLog from "@/hooks/usePerfLog";

import { homePathFor } from "@/utils/roleTheme";
const containerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
};

// Classify API error message → which field/banner it targets
function classifyError(message) {
  if (!message) return { type: "banner", variant: "error" };
  const m = message.toLowerCase();
  if (m.includes("organization code") || m.includes("org code")) {
    return { type: "field", field: "orgCode" };
  }
  if (m.includes("email") || m.includes("password") || m.includes("credentials")) {
    return { type: "field", field: "password" };
  }
  if (m.includes("suspended")) {
    return { type: "banner", variant: "error" };
  }
  if (m.includes("pending") || m.includes("review")) {
    return { type: "banner", variant: "warning" };
  }
  return { type: "banner", variant: "error" };
}

export default function LoginForm() {
  const navigate = useNavigate();
  const { log } = usePerfLog();

  const loginAction  = useAuthStore((s) => s.login);
  const storeLoading = useAuthStore((s) => s.isLoading);
  const storeError   = useAuthStore((s) => s.error);
  const clearError   = useAuthStore((s) => s.clearError);

  const [form,        setForm]        = useState({ orgPrefix: "", orgSuffix: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const isLoading = storeLoading;

  const prefixRef = useRef(null);
  const suffixRef = useRef(null);

  function clearOrgError() {
    clearError();
    setFieldErrors((prev) => ({ ...prev, orgCode: undefined }));
  }

  // ── Paste on either input: parse the full "ABCDEF-1234" code ──────────────
  function handleOrgPaste(e) {
    e.preventDefault();
    clearOrgError();
    const raw = e.clipboardData.getData("text").trim().toUpperCase().replace(/\s/g, "");

    let prefix = "", suffix = "";

    if (raw.includes("-")) {
      const dash  = raw.indexOf("-");
      prefix = raw.slice(0, dash).replace(/[^A-Z0-9]/g, "").slice(0, 6);
      suffix = raw.slice(dash + 1).replace(/[^0-9]/g, "").slice(0, 4);
    } else {
      // No dash — try letters-then-digits split first (e.g. "ACME4821")
      const lettersRun = raw.match(/^[A-Z]+/)?.[0] ?? "";
      const afterLetters = raw.slice(lettersRun.length);
      const digitsRun  = afterLetters.replace(/[^0-9]/g, "").slice(0, 4);

      if (lettersRun && digitsRun) {
        prefix = lettersRun.slice(0, 6);
        suffix = digitsRun;
      } else {
        // Mixed (e.g. "TEST784821"): take first 6 chars as prefix, trailing digits as suffix
        const clean = raw.replace(/[^A-Z0-9]/g, "");
        prefix = clean.slice(0, 6);
        suffix = clean.slice(6).replace(/[^0-9]/g, "").slice(0, 4);
      }
    }

    setForm((prev) => ({ ...prev, orgPrefix: prefix, orgSuffix: suffix }));
    // Focus suffix if it was populated; otherwise keep prefix focused
    if (suffix) {
      suffixRef.current?.focus();
    } else {
      prefixRef.current?.focus();
    }
  }

  // ── Prefix field: alphanumeric, max 6, auto-jumps ────────────────────────
  function handlePrefixChange(e) {
    clearOrgError();
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setForm((prev) => ({ ...prev, orgPrefix: val }));
    if (val.length === 6) suffixRef.current?.focus();
  }

  function handlePrefixKeyDown(e) {
    // Dash or space → jump to suffix immediately
    if (e.key === "-" || e.key === " ") {
      e.preventDefault();
      suffixRef.current?.focus();
      return;
    }
    // If prefix is full and user types a digit → redirect the digit to suffix
    if (form.orgPrefix.length >= 6 && /^[0-9]$/.test(e.key)) {
      e.preventDefault();
      suffixRef.current?.focus();
      setForm((prev) => ({
        ...prev,
        orgSuffix: (prev.orgSuffix + e.key).slice(0, 4),
      }));
    }
  }

  // ── Suffix field: digits only, max 4 ─────────────────────────────────────
  function handleSuffixChange(e) {
    clearOrgError();
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
    setForm((prev) => ({ ...prev, orgSuffix: val }));
  }

  function handleSuffixKeyDown(e) {
    // Backspace on empty suffix → jump back to prefix
    if (e.key === "Backspace" && form.orgSuffix === "") {
      e.preventDefault();
      prefixRef.current?.focus();
    }
  }

  const update = (field) => (e) => {
    clearError();
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  function validate() {
    const errs = {};
    if (!form.orgPrefix.trim() || !form.orgSuffix.trim())
      errs.orgCode = "Organization code is required (e.g. TECHCO-4821).";
    else if (form.orgSuffix.length !== 4)
      errs.orgCode = "Numeric part must be exactly 4 digits.";
    if (!form.email.trim())                    errs.email    = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email    = "Enter a valid email.";
    if (!form.password)                        errs.password = "Password is required.";
    return errs;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});

    const orgCode = `${form.orgPrefix.trim()}-${form.orgSuffix.trim()}`;
    const t0 = performance.now();
    const result = await loginAction(form.email.trim(), form.password, orgCode);

    if (result.success) {
      log("login", performance.now() - t0, "/login");
      const dest = homePathFor(useAuthStore.getState().user ?? { role: result.role }); // FE-003 + U-1 landing page
      navigate(dest, { replace: true });
      return;
    }

    // Route API error to correct field or banner
    if (result.error) {
      const { type, field } = classifyError(result.error);
      if (type === "field") {
        setFieldErrors((prev) => ({ ...prev, [field]: result.error }));
      }
      // Banner errors are already in storeError via the loginAction
    }
  };

  // Determine if storeError should render as a warning banner
  const errorClassification = storeError ? classifyError(storeError) : null;
  const showBanner    = errorClassification?.type === "banner";
  const bannerVariant = errorClassification?.variant ?? "error";

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-5"
    >
      {/* ── Status banners ── */}
      <AnimatePresence>
        {showBanner && storeError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={[
              "flex items-start gap-2.5 px-3.5 py-3 rounded-xl border",
              bannerVariant === "warning"
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-[#D1291F]/10 border-[#D1291F]/30",
            ].join(" ")}
          >
            <AlertCircle
              size={14}
              strokeWidth={2}
              className={[
                "shrink-0 mt-px",
                bannerVariant === "warning" ? "text-amber-400" : "text-[#B01F17]",
              ].join(" ")}
            />
            <p className={[
              "text-xs font-semibold leading-snug",
              bannerVariant === "warning" ? "text-amber-400" : "text-[#B01F17]",
            ].join(" ")}>
              {storeError}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sign-in form ── */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* Organization Code — split into prefix (alpha) + suffix (numeric) */}
        <motion.div variants={itemVariants}>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Organization Code <span className="text-[#B01F17]">*</span>
          </label>
          <div className="flex items-stretch gap-2">
            {/* Alpha part — letters + digits, max 6 */}
            <input
              ref={prefixRef}
              id="login-orgprefix"
              type="text"
              inputMode="text"
              aria-label="Organization code, letters part"
              placeholder="TECHCO"
              value={form.orgPrefix}
              onChange={handlePrefixChange}
              onKeyDown={handlePrefixKeyDown}
              onPaste={handleOrgPaste}
              autoComplete="off"
              spellCheck={false}
              maxLength={6}
              className={[
                "flex-1 min-w-0 bg-ink/5 border rounded-xl px-3 py-2.5 text-sm text-text-primary font-mono uppercase tracking-widest",
                "placeholder:text-slate-600 outline-none transition-colors",
                fieldErrors.orgCode
                  ? "border-[#D1291F]/60 focus:border-[#D1291F]"
                  : "border-ink/10 focus:border-cyan-500/60",
              ].join(" ")}
            />
            {/* Dash separator */}
            <span className="flex items-center text-slate-500 font-mono text-base select-none px-0.5">—</span>
            {/* Numeric part — digits only, max 4 */}
            <input
              ref={suffixRef}
              id="login-orgsuffix"
              type="text"
              inputMode="numeric"
              aria-label="Organization code, number part"
              placeholder="4821"
              value={form.orgSuffix}
              onChange={handleSuffixChange}
              onKeyDown={handleSuffixKeyDown}
              onPaste={handleOrgPaste}
              autoComplete="off"
              spellCheck={false}
              maxLength={4}
              className={[
                "w-[72px] shrink-0 bg-ink/5 border rounded-xl px-3 py-2.5 text-sm text-text-primary font-mono tracking-widest",
                "placeholder:text-slate-600 outline-none transition-colors",
                fieldErrors.orgCode
                  ? "border-[#D1291F]/60 focus:border-[#D1291F]"
                  : "border-ink/10 focus:border-cyan-500/60",
              ].join(" ")}
            />
          </div>
          {fieldErrors.orgCode ? (
            <p className="mt-1 text-[14px] text-[#B01F17]">{fieldErrors.orgCode}</p>
          ) : (
            <p className="mt-1 text-[14px] text-text-disabled">
              Get this code from your organization administrator
            </p>
          )}
        </motion.div>

        {/* Email */}
        <motion.div variants={itemVariants}>
          <Input
            label="Email address"
            id="login-email"
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={update("email")}
            error={fieldErrors.email}
            required
            autoComplete="email"
          />
        </motion.div>

        {/* Password */}
        <motion.div variants={itemVariants} className="flex flex-col gap-1">
          <PasswordInput
            label="Password"
            id="login-password"
            placeholder="••••••••"
            value={form.password}
            onChange={update("password")}
            error={fieldErrors.password}
            required
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs text-text-disabled hover:text-cyan-DEFAULT transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isLoading}
            className="w-full"
          >
            Sign In
          </Button>
        </motion.div>
      </form>

      {/* Footer */}
      <motion.p variants={itemVariants} className="text-center text-xs text-text-disabled">
        New organization?{" "}
        <Link to="/register/step-1" className="text-cyan-DEFAULT hover:text-cyan-300 font-medium transition-colors">
          Register workspace
        </Link>
      </motion.p>
    </motion.div>
  );
}
