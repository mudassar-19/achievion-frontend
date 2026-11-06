// Page container used by every portal page (Director standard): 1280px max, 32px side padding, 24px rhythm.
export default function Page({ children, className = "gap-6" }) {
  return <div className={`flex flex-col px-4 sm:px-8 py-8 min-h-full max-w-[1280px] mx-auto w-full ${className}`}>{children}</div>;
}
