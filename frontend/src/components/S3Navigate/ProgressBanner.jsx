const BG = '#0255b1';
const TEXT = '#e3e1e1';
const TRACK = '#123c70';
const FILL = '#e3e1e1';

export default function ProgressBanner({
  title = 'Uploading',
  noun = 'file',
  totalFiles,
  completedFiles,
  totalBytes,
  uploadedBytes,
  rateBytesPerSec,
  etaSeconds,
  onCancel,
  cancelling = false,
}) {
  const pct = totalBytes > 0 ? Math.min(100, (uploadedBytes / totalBytes) * 100) : 0;
  const filesRemaining = Math.max(0, totalFiles - completedFiles);
  const bytesRemaining = Math.max(0, totalBytes - uploadedBytes);
  const remainingPct = totalBytes > 0 ? Math.max(0, 100 - pct) : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-[8px] px-4 py-3"
      style={{ backgroundColor: BG, color: TEXT }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Spinner />
          <span className="font-bold text-[14px]" style={{ color: TEXT }}>
            {cancelling ? 'Cancelling…' : title}
          </span>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="shrink-0 px-3 py-1 text-[13px] rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
            style={{ border: `1px solid ${TEXT}`, color: TEXT }}
          >
            Cancel
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <div
          className="flex-1 h-[6px] rounded-full overflow-hidden"
          style={{ backgroundColor: TRACK }}
          aria-hidden="true"
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              backgroundColor: FILL,
              transition: 'width 200ms linear',
            }}
          />
        </div>
        <span className="text-[12px] tabular-nums" style={{ color: TEXT }}>
          {pct.toFixed(pct === 100 || pct === 0 ? 0 : 0)}%
        </span>
      </div>

      <div className="mt-3 space-y-1 text-[13px]" style={{ color: TEXT }}>
        <div>
          Total remaining: {filesRemaining} {noun}{filesRemaining === 1 ? '' : 's'}: {formatBytes(bytesRemaining)} ({remainingPct.toFixed(remainingPct === 0 ? 0 : 1)}%)
        </div>
        <div>
          Estimated time remaining: {etaSeconds == null ? 'calculating…' : formatDuration(etaSeconds)}
        </div>
        <div>
          Transfer rate: {rateBytesPerSec == null ? '0 B/s' : `${formatBytes(rateBytesPerSec)}/s`}
        </div>
      </div>
    </div>
  );
}

function formatBytes(n) {
  if (n == null || !isFinite(n)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function formatDuration(seconds) {
  if (!isFinite(seconds) || seconds < 0) return 'calculating…';
  if (seconds < 1) return '< 1s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={{ animation: 'tc-spin 0.9s linear infinite' }}
    >
      <circle cx="8" cy="8" r="6" fill="none" stroke={TEXT} strokeOpacity="0.35" strokeWidth="2" />
      <path d="M8 2 a6 6 0 0 1 6 6" fill="none" stroke={TEXT} strokeWidth="2" strokeLinecap="round" />
      <style>{`@keyframes tc-spin { to { transform: rotate(360deg); } } svg { transform-origin: center; }`}</style>
    </svg>
  );
}
