export default function StatusBar({ message, type }) {
  if (!message) return null;

  const styles = {
    info: 'bg-[#1f6feb]/10 text-[#58a6ff] border-[#1f6feb]/30',
    success: 'bg-[#238636]/10 text-[#3fb950] border-[#238636]/30',
    error: 'bg-[#da3633]/10 text-[#f85149] border-[#da3633]/30',
    loading: 'bg-[#161b22] text-[#8b949e] border-[#30363d]',
  }[type] || '';

  return (
    <div className={`mt-3 px-3 py-[5px] rounded-md text-[14px] flex items-center gap-2 border ${styles}`}>
      {type === 'loading' && (
        <div className="w-3.5 h-3.5 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin shrink-0" />
      )}
      {type === 'success' && (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
        </svg>
      )}
      {type === 'error' && (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.03 4.97a.751.751 0 0 0-1.042.018.751.751 0 0 0-.018 1.042L6.94 8 4.97 9.97a.749.749 0 0 0 .326 1.275.749.749 0 0 0 .734-.215L8 9.06l1.97 1.97a.749.749 0 0 0 1.275-.326.749.749 0 0 0-.215-.734L9.06 8l1.97-1.97a.749.749 0 0 0-.326-1.275.749.749 0 0 0-.734.215L8 6.94Z" />
        </svg>
      )}
      <span>{message}</span>
    </div>
  );
}
