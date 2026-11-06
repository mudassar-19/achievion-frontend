import { motion } from "framer-motion";

const variantStyles = {
  // Solid vivid cyan — near-black text for max contrast, strong layered glow
  primary:
    "bg-accent text-accent-on font-bold border border-transparent " +
    "shadow-card " +
    "hover:bg-accent hover:shadow-card-hover",

  // Thick visible border, bright text — clearly readable on the dark background
  secondary:
    "bg-transparent text-slate-100 font-semibold border-2 border-slate-500 " +
    "hover:border-cyan-300 hover:text-text-primary hover:shadow-card-hover",

  // Subtle but legible — more visible border than before
  ghost:
    "bg-transparent text-slate-300 font-medium border border-slate-600 " +
    "hover:border-slate-400 hover:text-text-primary hover:bg-ink/5",

  // Vivid danger — same treatment as primary
  danger:
    "bg-danger text-white font-bold border border-transparent " +
    "shadow-card " +
    "hover:brightness-110 hover:shadow-card-hover",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-7 py-3 text-base rounded-xl",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  onClick,
  type = "button",
  ...props
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={disabled || loading ? {} : { scale: 1.02 }}
      whileTap={disabled || loading ? {} : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={[
        "inline-flex items-center justify-center gap-2",
        "font-medium tracking-wide",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-DEFAULT/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
        variantStyles[variant] ?? variantStyles.primary,
        sizeStyles[size] ?? sizeStyles.md,
        className,
      ].join(" ")}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {children}
    </motion.button>
  );
}
