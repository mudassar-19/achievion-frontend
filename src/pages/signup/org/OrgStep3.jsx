import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import MultiStepAuthLayout from "@/components/layout/MultiStepAuthLayout";
import Button from "@/components/ui/Button";
import useSignupStore from "@/stores/signupStore";
import api from "@/lib/api";

const contentVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
};

export default function OrgStep3() {
  const navigate     = useNavigate();
  const clearOrgData = useSignupStore((s) => s.clearOrgData);
  const orgData      = useSignupStore((s) => s.orgData);

  
  

  const [phase,   setPhase]   = useState("loading");
  const [errMsg,  setErrMsg]  = useState("");
  const [orgCode, setOrgCode] = useState("");

  useEffect(() => {
    if (!orgData.name?.trim() || !orgData.email?.trim()) {
      navigate("/register/step-1", { replace: true });
      return;
    }
    const state = useSignupStore.getState();
    if (state.registrationFired) return;
    state.setRegistrationFired(true);

    async function submit() {
      try {
        const res = await api.post("/api/org/register", {
          orgName:    orgData.name.trim(),
          adminEmail: orgData.email.trim(),
          password:   orgData.password,
        });

        if (!res.orgCode) throw new Error("Registration failed — unexpected server response.");
        setOrgCode(res.orgCode);
        setPhase("success");
      } catch (err) {
        const is409 = err.status === 409;
        setErrMsg(
          is409
            ? "This organization email is already registered. Please log in instead."
            : (err.message ?? "Registration failed. Please try again.")
        );
        setPhase(is409 ? "already_exists" : "error");
      }
    }

    submit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGoToLogin() {
    clearOrgData();
    navigate("/org/login");
  }

  if (phase === "loading") {
    return (
      <MultiStepAuthLayout currentStep={2} totalSteps={2} title="Register Software House">
        <div className="flex flex-col items-center gap-6 py-8 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 size={40} className="text-cyan-DEFAULT" strokeWidth={1.5} />
          </motion.div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-bold text-text-primary">Creating your workspace…</p>
            <p className="text-xs text-text-secondary">Setting up {orgData.name}</p>
          </div>
        </div>
      </MultiStepAuthLayout>
    );
  }

  if (phase === "already_exists") {
    return (
      <MultiStepAuthLayout currentStep={2} totalSteps={2} title="Register Software House">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-text-primary">Already registered</h2>
            <p className="text-sm text-danger leading-snug">{errMsg}</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button variant="primary" size="md" className="w-full" onClick={() => { clearOrgData(); navigate("/org/login"); }}>
              Go to Login →
            </Button>
            <Button variant="ghost" size="md" className="w-full" onClick={() => { clearOrgData(); navigate("/register/step-1"); }}>
              ← Register with different email
            </Button>
          </div>
        </div>
      </MultiStepAuthLayout>
    );
  }

  if (phase === "error") {
    return (
      <MultiStepAuthLayout currentStep={2} totalSteps={2} title="Register Software House">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-text-primary">Registration failed</h2>
            <p className="text-sm text-danger leading-snug">{errMsg}</p>
          </div>
          <Button variant="primary" size="md" className="w-full" onClick={() => { clearOrgData(); navigate("/register/step-1"); }}>
            ← Try Again
          </Button>
        </div>
      </MultiStepAuthLayout>
    );
  }

  return (
    <MultiStepAuthLayout currentStep={2} totalSteps={2} title="Register Software House">
      <motion.div
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center gap-6 text-center"
      >
        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-text-primary">Workspace created!</h2>
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{orgData.name}</span> is ready.
          </p>
          {orgCode && (
            <div className="mt-2 flex flex-col items-center gap-1">
              <p className="text-xs text-text-disabled">Your organization code</p>
              <span className="font-mono text-xl font-black tracking-widest text-accent-text">
                {orgCode}
              </span>
              <p className="text-[14px] text-slate-500">
                Share this with employees so they can join
              </p>
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="w-full flex flex-col gap-3">
          <Button variant="primary" size="md" className="w-full" onClick={handleGoToLogin}>
            Go to Admin Login →
          </Button>
          <Link to="/" className="text-xs text-center text-text-disabled hover:text-text-secondary transition-colors block">
            ← Back to home
          </Link>
        </motion.div>
      </motion.div>
    </MultiStepAuthLayout>
  );
}
