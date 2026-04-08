export default function StepCard({ number, title, time, status, children }) {
  const isActive = status === 'active';
  const isComplete = status === 'completed' || status === 'locked';
  const isDisabled = status === 'disabled';

  return (
    <div className={`border rounded-md mb-3 transition-all ${
      isActive
        ? 'border-[#30363d] bg-[#0d1117]'
        : isComplete
          ? 'border-[#238636]/30 bg-[#0d1117]'
          : 'border-[#21262d] bg-[#010409] opacity-40 pointer-events-none'
    }`}>
      {/* Header */}
      <div className={`flex items-center gap-2.5 px-4 py-2.5 border-b ${
        isActive ? 'border-[#30363d] bg-[#161b22]' : isComplete ? 'border-[#238636]/20 bg-[#161b22]' : 'border-[#21262d]'
      }`}>
        <span className="text-[14px] font-semibold flex-1 text-[#e6edf3]">
          {title}
        </span>
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
