export default function StepCard({ number, title, time, status, children }) {
  const borderColor = {
    active: 'border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]',
    completed: 'border-green-500/20',
    disabled: 'opacity-35 pointer-events-none',
    locked: 'border-green-500/20',
  }[status] || 'border-slate-700';

  const numberBg = {
    active: 'bg-blue-500 text-white',
    completed: 'bg-green-500 text-slate-900',
    locked: 'bg-green-500 text-slate-900',
  }[status] || 'bg-slate-700';

  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-xl p-5 mb-3 transition-all ${borderColor}`}>
      <div className="flex items-center gap-2.5 mb-3.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all ${numberBg}`}>
          {status === 'completed' || status === 'locked' ? '✓' : number}
        </div>
        <span className="text-sm font-medium flex-1">{title}</span>
        {time && <span className="text-[11px] text-slate-500">{time}</span>}
      </div>
      <div className={status === 'locked' ? 'opacity-60 pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}
