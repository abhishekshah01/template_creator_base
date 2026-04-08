export default function StepCard({ number, title, time, status, hasError, children }) {
  const isActive = status === 'active';
  const isComplete = status === 'completed' || status === 'locked';
  const isDisabled = status === 'disabled';

  return (
    <div className={`border rounded-md mb-3 transition-all ${
      isDisabled
        ? 'border-[#21262d] bg-[#010409] opacity-40 pointer-events-none'
        : 'border-[#30363d] bg-[#0d1117]'
    }`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${
        isDisabled ? 'border-[#21262d]' : 'border-[#30363d] bg-[#161b22]'
      }`}>
        <span className="text-[14px] font-semibold text-[#e6edf3]">
          {title}
        </span>
        {hasError && (
          <svg className="w-4 h-4 text-[#f85149] shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
          </svg>
        )}
        {!hasError && isComplete && (
          <svg className="w-4 h-4 text-[#3fb950] shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
          </svg>
        )}
        <span className="flex-1" />
        {time && (
          <span className="text-[11px] text-[#484f58] font-mono">{time}</span>
        )}
      </div>
      {/* Body */}
      <div className="px-4 py-3">
        {children}
      </div>
    </div>
  );
}
