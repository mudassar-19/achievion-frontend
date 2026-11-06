import AuthLayout from "@/components/layout/AuthLayout";

/**
 * MultiStepAuthLayout
 * Wraps children inside AuthLayout's visual shell, augmented with a step
 * progress indicator at the top of the card.
 *
 * Props:
 *  - currentStep  {number}  1-based active step
 *  - totalSteps   {number}  total number of steps
 *  - title        {string}  optional heading rendered above the indicator
 *  - children     {node}
 */
export default function MultiStepAuthLayout({
  children,
  currentStep = 1,
  totalSteps = 3,
  title,
}) {
  return (
    <AuthLayout>
      {/* Step progress indicator */}
      <div className="mb-6 flex flex-col gap-3">
        {title && (
          <p className="text-xs font-semibold uppercase tracking-widest text-text-disabled text-center">
            {title}
          </p>
        )}

        {/* Connected dots */}
        <div className="flex items-center justify-center gap-0">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const step     = i + 1;
            const isActive = step === currentStep;
            const isDone   = step < currentStep;

            return (
              <div key={step} className="flex items-center">
                {/* Dot */}
                <div
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded-pill",
                    "text-[14px] font-bold transition-all duration-300",
                    isActive
                      ? "bg-cyan-DEFAULT text-bg-base shadow-glow-cyan-sm"
                      : isDone
                      ? "bg-cyan-DEFAULT/30 text-cyan-DEFAULT"
                      : "bg-bg-elevated border border-bg-border text-text-primary",
                  ].join(" ")}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isDone ? (
                    <svg
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3"
                      aria-hidden="true"
                    >
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>

                {/* Connector line (not after last step) */}
                {step < totalSteps && (
                  <div
                    className={[
                      "h-px w-8 transition-all duration-300",
                      isDone ? "bg-cyan-DEFAULT/50" : "bg-bg-border",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step label */}
        <p className="text-center text-xs text-text-disabled">
          Step {currentStep} of {totalSteps}
        </p>
      </div>

      {/* Page-specific content */}
      {children}
    </AuthLayout>
  );
}
