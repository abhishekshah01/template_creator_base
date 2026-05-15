/**
 * StatusBar — Primer-style inline status banner for workflow steps.
 * Uses same color tokens as the shared Banner component.
 */

const STYLES = {
  info:    { bg: 'rgba(0,91,209,0.1)',   border: 'rgba(0,91,209,0.4)',   icon: '#0576ff' },
  success: { bg: 'rgba(47,111,55,0.15)',  border: 'rgba(47,111,55,0.4)',  icon: '#388f3f' },
  error:   { bg: 'rgba(195,19,40,0.1)',   border: 'rgba(195,19,40,0.4)', icon: '#eb3342' },
  loading: { bg: 'rgba(48,54,61,0.3)',    border: 'rgba(48,54,61,0.6)',   icon: '#8b949e' },
};

const ICON_PATHS = {
  success: 'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z',
  error:   'M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z',
  info:    'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
};

// Hint icon (info circle)
const HINT_STYLE = { bg: 'rgba(0,91,209,0.1)', border: 'rgba(0,91,209,0.4)', icon: '#0576ff' };

export default function StatusBar({ message, type, hint, action }) {
  if (!message || message === 'failed') return null;

  const s = STYLES[type] || STYLES.info;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-1 p-2 rounded-[6px] border text-[14px] leading-[1.5]"
        style={{ backgroundColor: s.bg, borderColor: s.border }}>
        {type === 'loading' && (
          <div className="w-4 h-4 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin shrink-0 mx-2" />
        )}
        {type !== 'loading' && (
          <svg className="w-4 h-4 shrink-0 mx-2" style={{ color: s.icon }} viewBox="0 0 16 16" fill="currentColor">
            <path d={ICON_PATHS[type] || ICON_PATHS.info} />
          </svg>
        )}
        <span className="flex-1 text-[#e6edf3]">{message}</span>
        {action && <span className="shrink-0 mr-1">{action}</span>}
      </div>
      {hint && (
        <div className="flex items-center gap-1 p-2 rounded-[6px] border text-[14px] leading-[1.5]"
          style={{ backgroundColor: HINT_STYLE.bg, borderColor: HINT_STYLE.border }}>
          <svg className="w-4 h-4 shrink-0 mx-2" style={{ color: HINT_STYLE.icon }} viewBox="0 0 16 16" fill="currentColor">
            <path d={ICON_PATHS.info} />
          </svg>
          <span className="flex-1 text-[#e6edf3]">{hint}</span>
        </div>
      )}
    </div>
  );
}
