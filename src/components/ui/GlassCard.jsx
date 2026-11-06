import { motion } from "framer-motion";

const enterVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

export default function GlassCard({
  children,
  className = "",
  /** Pass false to skip the entrance animation (e.g. inside lists with their own stagger) */
  animate = true,
  /** Override entrance variants for custom stagger parents */
  variants,
  /** Extra padding preset: "none" | "sm" | "md" | "lg" */
  padding = "md",
  ...props
}) {
  const paddingStyles = {
    none: "",
    sm:   "p-3",
    md:   "p-5",
    lg:   "p-8",
  };

  return (
    <motion.div
      variants={variants ?? (animate ? enterVariants : undefined)}
      initial={animate ? "hidden" : false}
      animate={animate ? "visible" : false}
      className={[
        // Distinct gradient — lifts clearly off the #080d18 base
        "bg-gradient-to-b from-[#EAEDF4] to-[#FFFFFF]",
        // Crisp border + subtle inner highlight line
        "border border-ink/10",
        // Deep drop shadow + inner top highlight
        "shadow-[0_8px_40px_rgba(0,0,0,0.6),_inset_0_1px_0_rgba(20,32,61,0.07)]",
        "backdrop-blur-sm",
        "rounded-2xl",
        paddingStyles[padding] ?? paddingStyles.md,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </motion.div>
  );
}
