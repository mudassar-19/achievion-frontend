import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, UserPlus, KeyRound, AlertCircle } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import useOrgAuthStore from "@/stores/orgAuthStore";

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-2 rounded-xl bg-[#FFFFFF] border border-slate-700 px-3 py-2.5">
        <span className="flex-1 font-mono text-sm text-text-primary break-all">{value}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg bg-ink/5 hover:bg-accent/10 border border-ink/10 hover:border-accent/30 transition-all"
          aria-label={`Copy ${label}`}
        >
          {copied
            ? <Check size={13} className="text-accent-text" strokeWidth={2.5} />
            : <Copy size={13} className="text-slate-400" strokeWidth={2} />
          }
        </button>
      </div>
    </div>
  );
}

export default function DirectorSetupModal({ onComplete }) {
  const orgToken = useOrgAuthStore((s) => s.orgToken);
  const setOrg   = useOrgAuthStore((s) => s.setOrg);
  const org      = useOrgAuthStore((s) => s.org);

  const [phase,   setPhase]   = useState("form");   // "form" | "credentials"
  const [form,    setForm]    = useState({ name: "", email: "" });
  const [errors,  setErrors]  = useState({});
  const [apiErr,  setApiErr]  = useState("");
  const [loading, setLoading] = useState(false);
  const [creds,   setCreds]   = useState({ email: "", password: "" });

  const update = (field) => (e) => {
    setApiErr("");
    setErrors((p) => ({ ...p, [field]: undefined }));
    setForm((p) => ({ ...p, [field]: e.target.value }));
  };

  function validate() {
    const errs = {};
    if (!form.name.trim())  errs.name  = "Director name is required.";
    if (!form.email.trim()) errs.email = "Director email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email.";
    return errs;
  }

  async function handleRegister(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setApiErr("");
    setLoading(true);

    try {
      const res = await api.post(
        "/api/org/setup-director",
        { directorName: form.name.trim(), directorEmail: form.email.trim() },
        { headers: { Authorization: `Bearer ${orgToken}` } }
      );

      setCreds({
        email:    res.data.directorEmail,
        password: res.data.generatedPassword,
      });
      setOrg({ ...org, directorSetupComplete: true }, orgToken);
      setPhase("credentials");
    } catch (err) {
      setApiErr(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Blurred backdrop — covers entire viewport */}
      <div
        className="fixed inset-0 z-50 backdrop-blur-md bg-ink/60"
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="w-full max-w-md rounded-2xl bg-[#FFFFFF] border border-ink/10 shadow-[0_24px_64px_rgba(0,0,0,0.7)] overflow-hidden"
        >
          <AnimatePresence mode="wait" initial={false}>

            {/* ── Phase: form ───────────────────────────────────────────── */}
            {phase === "form" && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0  }}
                exit={{    opacity: 0, x:  20 }}
                transition={{ duration: 0.25 }}
                className="p-8"
              >
                {/* Header */}
                <div className="flex flex-col items-center gap-3 mb-7 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-[#2A62EC]/20 border border-ink/10">
                    <UserPlus size={22} className="text-accent-text" strokeWidth={1.75} />
                  </span>
                  <div>
                    <h2 className="text-xl font-black text-text-primary">Register Your Director</h2>
                    <p className="text-sm text-slate-400 mt-1 leading-snug">
                      Set up the director account for your engineering team's portal.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleRegister} noValidate className="flex flex-col gap-4">
                  {apiErr && (
                    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[#D1291F]/10 border border-[#D1291F]/30">
                      <AlertCircle size={14} className="text-[#B01F17] shrink-0 mt-px" strokeWidth={2} />
                      <p className="text-xs font-semibold text-[#B01F17] leading-snug">{apiErr}</p>
                    </div>
                  )}

                  <Input
                    label="Director's Full Name"
                    id="dir-name"
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={update("name")}
                    error={errors.name}
                    required
                    autoComplete="name"
                  />

                  <Input
                    label="Director's Email"
                    id="dir-email"
                    type="email"
                    placeholder="director@acme.io"
                    value={form.email}
                    onChange={update("email")}
                    error={errors.email}
                    required
                    autoComplete="email"
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={loading}
                    className="w-full mt-1"
                  >
                    Register Director
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ── Phase: credentials ────────────────────────────────────── */}
            {phase === "credentials" && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x:  0 }}
                exit={{    opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="p-8"
              >
                {/* Header */}
                <div className="flex flex-col items-center gap-3 mb-7 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFC21A]/20 to-[#2A62EC]/20 border border-ink/10">
                    <KeyRound size={22} className="text-[#7A5200]" strokeWidth={1.75} />
                  </span>
                  <div>
                    <h2 className="text-xl font-black text-text-primary">Director Registered!</h2>
                    <p className="text-sm text-slate-400 mt-1 leading-snug">
                      Share these credentials with your director. They will not be shown again.
                    </p>
                  </div>
                </div>

                {/* Warning banner */}
                <div className="mb-5 flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-[#FFC21A]/10 border border-[#8A6200]/30">
                  <AlertCircle size={14} className="text-[#7A5200] shrink-0 mt-px" strokeWidth={2} />
                  <p className="text-xs font-semibold text-[#7A5200] leading-snug">
                    Copy and save these credentials now — the password will not be shown again.
                  </p>
                </div>

                <div className="flex flex-col gap-3 mb-6">
                  <CopyField label="Email" value={creds.email} />
                  <CopyField label="Password" value={creds.password} />
                </div>

                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={onComplete}
                >
                  Done — Enter Portal
                </Button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}
