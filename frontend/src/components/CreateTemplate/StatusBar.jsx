export default function StatusBar({ message, type }) {
  if (!message) return null;

  const styles = {
    info: 'bg-blue-950 text-blue-300 border-blue-900',
    success: 'bg-green-950 text-green-300 border-green-900',
    error: 'bg-red-950/50 text-red-300 border-red-900/50',
    loading: 'bg-slate-800 text-slate-400 border-slate-700',
  }[type] || '';

  return (
    <div className={`mt-3 px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2 border ${styles}`}>
      {type === 'loading' && (
        <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-blue-300 rounded-full animate-spin shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}
