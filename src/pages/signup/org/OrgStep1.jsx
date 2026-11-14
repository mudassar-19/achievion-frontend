import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import MultiStepAuthLayout from "@/components/layout/MultiStepAuthLayout";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import Button from "@/components/ui/Button";
import useSignupStore from "@/stores/signupStore";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
};

export default function OrgStep1() {
  const navigate      = useNavigate();
  const updateOrgData = useSignupStore((s) => s.updateOrgData);
  const stored        = useSignupStore((s) => s.orgData);

  const [form, setForm] = useState({
    name:     stored.name     ?? "",
    email:    stored.email    ?? "",
    password: stored.password ?? "",
  });
  const [errors, setErrors] = useState({});

  const update = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim())   errs.name     = "Organisation name is required.";
    if (!form.email.trim())  errs.email    = "Admin email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email.";
    if (!form.password)      errs.password = "Password is required.";
    else if (form.password.length < 8) errs.password = "Minimum 8 characters.";
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    updateOrgData({ name: form.name, email: form.email, password: form.password });
    navigate("/register/step-3");
  };

  return (
    <MultiStepAuthLayout currentStep={1} totalSteps={2} title="Register Software House">
      <motion.form
        onSubmit={handleSubmit}
        noValidate
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-5"
      >
        <motion.div variants={itemVariants} className="flex flex-col gap-1 text-center">
          <h2 className="text-xl font-bold text-text-primary">Set up your workspace</h2>
          <p className="text-xs text-text-secondary">
            You can update these details later in settings.
          </p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Input
            label="Organisation Name"
            id="org-name"
            placeholder="Acme Software"
            value={form.name}
            onChange={update("name")}
            error={errors.name}
            required
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Input
            label="Admin Email"
            id="org-email"
            type="email"
            placeholder="admin@acme.io"
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
            id="org-password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={update("password")}
            error={errors.password}
            required
            autoComplete="new-password"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Button type="submit" variant="primary" size="md" className="w-full">
            Register Workspace →
          </Button>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs text-text-secondary">
            Already have a workspace?{" "}
            <Link to="/login" className="font-semibold text-accent-text hover:underline">
              Log in
            </Link>
          </p>
          <Link to="/" className="text-xs text-text-disabled hover:text-text-secondary transition-colors">
            ← Back to home
          </Link>
        </motion.div>
      </motion.form>
    </MultiStepAuthLayout>
  );
}
