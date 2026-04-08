export default function StatusBar({ message, type }) {
  if (!message) return null;

  const styles = {
    info: 'bg-[#1f6feb]/10 text-[#58a6ff] border-[#1f6feb]/30',
    success: 'bg-[#238636]/10 text-[#3fb950] border-[#238636]/30',
    error: 'bg-[#da3633]/10 text-[#f85149] border-[#da3633]/30',
    loading: 'bg-[#161b22] text-[#8b949e] border-[#30363d]',
  }[type] || '';

  return (
    <div className={`mt-3 px-3 py-2 rounded-md text-xs flex items-center gap-2 border ${styles}`}>
      {type === 'loading' && (
        <div className="w-3.5 h-3.5 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}
