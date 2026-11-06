import { forwardRef, useState } from "react";

const Input = forwardRef(function Input(
  {
    label,
    id,
    type = "text",
    placeholder = "",
    value,
    onChange,
    error,
    hint,
    disabled = false,
    required = false,
    prefix,        // icon or text rendered inside left edge
    suffix,        // icon or text rendered inside right edge
    className = "",
    inputClassName = "",
    ...props
  },
  ref
) {
  const [focused, setFocused] = useState(false);

  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={["flex flex-col gap-1.5 w-full", className].join(" ")}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-slate-300"
        >
          {label}
          {required && (
            <span className="ml-1 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Input wrapper */}
      <div
        className={[
          "relative flex items-center",
          "rounded-xl border transition-all duration-200",
          "bg-[#FFFFFF]",
          error
            ? "border-danger shadow-card"
            : focused
            ? "border-accent shadow-card"
            : "border-slate-600 hover:border-slate-500",
          disabled && "opacity-40 cursor-not-allowed",
        ].join(" ")}
      >
        {/* Prefix */}
        {prefix && (
          <span className="flex items-center pl-3 text-text-secondary shrink-0">
            {prefix}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={[
            "flex-1 bg-transparent py-2.5 px-3 text-sm text-text-primary",
            "placeholder:text-slate-600",
            "outline-none",
            "disabled:cursor-not-allowed",
            // keep text white during browser autofill / paste
            "[&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_#FFFFFF]",
            "[&:-webkit-autofill]:[-webkit-text-fill-color:#14203D]",
            "[-webkit-text-fill-color:#14203D]",
            inputClassName,
          ].join(" ")}
          {...props}
        />

        {/* Suffix */}
        {suffix && (
          <span className="flex items-center pr-3 text-text-secondary shrink-0">
            {suffix}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-danger flex items-center gap-1" role="alert">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 5a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1zm0 8a1.25 1.25 0 110 2.5A1.25 1.25 0 0112 15z" />
          </svg>
          {error}
        </p>
      )}

      {/* Hint (only when no error) */}
      {hint && !error && (
        <p className="text-xs text-text-disabled">{hint}</p>
      )}
    </div>
  );
});

export default Input;
