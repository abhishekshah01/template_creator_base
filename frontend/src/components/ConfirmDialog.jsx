import { useEffect } from 'react';

export default function ConfirmDialog({
  title,
  description,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default', // 'default' | 'danger'
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const confirmCls = variant === 'danger'
    ? 'px-3 py-[5px] bg-[#8b1a1a] text-white text-[14px] font-medium border border-[#da3633]/40 rounded-md hover:bg-[#a32424] transition-colors'
    : 'px-3 py-[5px] bg-[#238636] text-white text-[14px] font-medium rounded-md hover:bg-[#2ea043] transition-colors';
  const cancelCls = 'px-3 py-[5px] bg-[#21262d] border border-[#30363d] text-[14px] text-[#c9d1d9] rounded-md hover:bg-[#30363d] hover:border-[#484f58] transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_120ms_ease-out]"
      onClick={onCancel}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>
      <div className="w-full max-w-[440px] bg-[#21262d] border border-[#30363d] rounded-md shadow-2xl animate-[scaleIn_140ms_ease-out]"
        onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[#30363d]">
          <h2 className="text-[16px] font-semibold text-[#e6edf3]">{title}</h2>
          {description && <p className="mt-1.5 text-[13px] leading-[1.5] text-[#8b949e]">{description}</p>}
        </div>
        {details && details.length > 0 && (
          <div className="px-4 py-3 max-h-[220px] overflow-y-auto bg-[#0d1117] border-b border-[#30363d]">
            <div className="text-[11px] uppercase tracking-wide text-[#484f58] mb-2 font-semibold">
              {details.length} item{details.length > 1 ? 's' : ''}
            </div>
            <ul className="space-y-1">
              {details.map(d => (
                <li key={d} className="font-mono text-[12px] text-[#c9d1d9] px-2 py-1 bg-[#161b22] border border-[#21262d] rounded">{d}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 p-3 bg-[#161b22] rounded-b-md">
          <button onClick={onCancel} className={cancelCls}>{cancelLabel}</button>
          <button onClick={onConfirm} className={confirmCls} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
