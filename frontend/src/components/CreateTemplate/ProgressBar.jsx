export default function ProgressBar({ currentStep, totalSteps = 4, onStepClick }) {
  return (
    <>
      <style>{`
        @keyframes step-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(31,111,235,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(31,111,235,0); }
        }
        .step-active-pulse { animation: step-pulse 2s ease-in-out infinite; }

        @keyframes line-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
        .line-fill-animate {
          animation: line-fill 0.6s ease-out forwards;
        }
      `}</style>

      <div className="flex items-center mb-8 px-4">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isComplete = step < currentStep;
          const isActive = step === currentStep;
          const isLast = step === totalSteps;
          const isClickable = isComplete;
          // Line before this step is filled if this step is active or complete
          const lineFilled = step <= currentStep;

          return (
            <div key={step} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
              {/* Step circle */}
              <div
                className={`${isClickable ? 'cursor-pointer group' : ''}`}
                onClick={() => isClickable && onStepClick?.(step)}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-300 ${
                  isComplete
                    ? 'bg-[#238636] text-white group-hover:bg-[#2ea043] group-hover:scale-110'
                    : isActive
                      ? 'bg-[#1f6feb] text-white step-active-pulse'
                      : 'bg-[#21262d] text-[#484f58] border-2 border-[#30363d]'
                }`}>
                  {isComplete ? (
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                    </svg>
                  ) : step}
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-2 h-[3px] bg-[#21262d] rounded-full overflow-hidden relative">
                  {lineFilled && (
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full ${
                        isComplete ? 'bg-[#238636]' : 'bg-[#1f6feb]'
                      } ${step === currentStep - 1 || (isActive && step === currentStep) ? 'line-fill-animate' : 'w-full'}`}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
