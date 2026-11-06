import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// Card with a title bar (extracted from the Director dashboard "Widget"). Icon colour defaults to the role accent.
export default function Panel({ title, icon: Icon, iconColor, delay = 0, className = "", action, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`glass-panel rounded-2xl flex flex-col border border-ink/[0.07] ${className}`}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink/[0.05] shrink-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={15} strokeWidth={2} style={{ color: iconColor ?? "var(--accent)" }} aria-hidden="true" />}
          <h2 className="text-sm font-black text-text-primary">{title}</h2>
        </div>
        {action && (action.onClick ? (
          <button type="button" onClick={action.onClick}
            className="inline-flex items-center min-h-[2rem] px-1.5 -mr-1.5 text-[14px] text-slate-500 hover:text-text-primary transition-colors rounded">
            {action.label}
          </button>
        ) : (
          <Link
            to={action.to}
            className="inline-flex items-center min-h-[2rem] px-1.5 -mr-1.5 text-[14px] text-slate-500 hover:text-text-primary transition-colors rounded"
          >
            {action.label}
          </Link>
        ))}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </motion.div>
  );
}
