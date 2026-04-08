const STEPS = ['Identify Job', 'Clear Database', 'Pause Job', 'Create Template'];

export default function ProgressBar({ currentStep, totalSteps = 4 }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const isComplete = step < currentStep;
        const isActive = step === currentStep;
        const isLast = step === totalSteps;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all ${
                isComplete
                  ? 'bg-[#238636] text-white'
                  : isActive
                    ? 'bg-[#1f6feb] text-white'
                    : 'bg-[#21262d] text-[#484f58]'
              }`}>
                {isComplete ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                  </svg>
                ) : step}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${
                isComplete
                  ? 'text-[#3fb950]'
                  : isActive
                    ? 'text-[#e6edf3]'
                    : 'text-[#484f58]'
              }`}>{label}</span>
            </div>
            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 mx-3">
                <div className={`h-[2px] rounded-full transition-all ${
                  isComplete ? 'bg-[#238636]' : 'bg-[#21262d]'
                }`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
