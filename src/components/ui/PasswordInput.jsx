import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Input from "@/components/ui/Input";

/**
 * PasswordInput — wraps Input with a show/hide toggle via Eye / EyeOff icons.
 * Accepts all the same props as Input; `type` is managed internally.
 */
const PasswordInput = forwardRef(function PasswordInput(
  { label = "Password", placeholder = "••••••••", ...props },
  ref
) {
  const [visible, setVisible] = useState(false);

  const toggle = () => setVisible((v) => !v);

  return (
    <Input
      ref={ref}
      label={label}
      type={visible ? "text" : "password"}
      placeholder={placeholder}
      suffix={
        <button
          type="button"
          onClick={toggle}
          aria-label={visible ? "Hide password" : "Show password"}
          className="text-text-disabled hover:text-text-secondary transition-colors duration-150 focus-visible:outline-none focus-visible:text-cyan-DEFAULT"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
      {...props}
    />
  );
});

export default PasswordInput;
