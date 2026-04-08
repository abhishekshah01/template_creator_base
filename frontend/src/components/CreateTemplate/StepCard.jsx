export default function StepCard({ number, title, time, status, children }) {
  const isActive = status === 'active';
  const isComplete = status === 'completed' || status === 'locked';

  return (
    <div className={`border rounded-md mb-3 transition-all ${
      isActive
        ? 'border-[#30363d] bg-[#0d1117]'
        : isComplete
          ? 'border-[#238636]/30 bg-[#0d1117]'
          : 'border-[#21262d] bg-[#010409] opacity-40 pointer-events-none'
    }`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${
        isActive ? 'border-[#30363d] bg-[#161b22]' : isComplete ? 'border-[#238636]/20 bg-[#161b22]' : 'border-[#21262d]'
      }`}>
        <span className="text-[14px] font-semibold text-[#e6edf3]">
          {title}
        </span>
        {isComplete && (
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
