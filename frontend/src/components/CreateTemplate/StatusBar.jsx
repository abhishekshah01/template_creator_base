export default function StatusBar({ message, type }) {
  if (!message) return null;

  const styles = {
    info: 'bg-gh-accent-blue/10 text-gh-accent-blue-text border-gh-accent-blue/30',
    success: 'bg-gh-accent-green/10 text-gh-accent-green-text border-gh-accent-green/30',
    error: 'bg-gh-accent-red/10 text-gh-accent-red-text border-gh-accent-red/30',
    loading: 'bg-gh-overlay text-gh-text-secondary border-gh-border',
  }[type] || '';

  return (
    <div className={`mt-3 px-3.5 py-2.5 rounded-md text-xs flex items-center gap-2 border ${styles}`}>
      {type === 'loading' && (
        <div className="w-3.5 h-3.5 border-2 border-gh-border border-t-gh-accent-blue-text rounded-full animate-spin shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}
