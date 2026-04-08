export default function StepCard({ number, title, time, status, children }) {
  const borderColor = {
    active: 'border-gh-accent-blue shadow-[0_0_0_1px_rgba(31,111,235,0.2)]',
    completed: 'border-gh-accent-green/30',
    disabled: 'opacity-35 pointer-events-none',
    locked: 'border-gh-accent-green/30',
  }[status] || 'border-gh-border';

  const numberBg = {
    active: 'bg-gh-accent-blue text-white',
    completed: 'bg-gh-accent-green text-white',
    locked: 'bg-gh-accent-green text-white',
  }[status] || 'bg-gh-overlay';

  return (
    <div className={`bg-gh-surface border border-gh-border rounded-md p-5 mb-3 transition-all ${borderColor}`}>
      <div className="flex items-center gap-2.5 mb-3.5">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all ${numberBg}`}>
          {status === 'completed' || status === 'locked' ? '✓' : number}
        </div>
        <span className="text-sm font-medium flex-1 text-gh-text">{title}</span>
        {time && <span className="text-[11px] text-gh-text-muted">{time}</span>}
      </div>
      <div className={status === 'locked' ? 'opacity-60 pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}
