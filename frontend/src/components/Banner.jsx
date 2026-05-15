/**
 * Primer-style Banner component (GitHub dark theme).
 *
 * Variants: critical | warning | info | success | upsell
 * Specs: 14px text, 1.5 line-height, 8px padding, 6px radius, 1px border.
 * Colors sourced from primer/primitives dark theme tokens.
 */

const VARIANTS = {
  critical: {
    bg: 'rgba(195,19,40,0.1)',
    border: 'rgba(195,19,40,0.4)',
    icon: '#eb3342',
  },
  warning: {
    bg: 'rgba(137,89,6,0.15)',
    border: 'rgba(137,89,6,0.4)',
    icon: '#aa7109',
  },
  info: {
    bg: 'rgba(0,91,209,0.1)',
    border: 'rgba(0,91,209,0.4)',
    icon: '#0576ff',
  },
  success: {
    bg: 'rgba(47,111,55,0.15)',
    border: 'rgba(47,111,55,0.4)',
    icon: '#388f3f',
  },
  upsell: {
    bg: 'rgba(119,48,232,0.1)',
    border: 'rgba(119,48,232,0.4)',
    icon: '#975bf1',
  },
};

const ICON_PATHS = {
  critical: 'M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z',
  warning: 'M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  info: 'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
  success: 'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z',
  upsell: 'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
};

export default function Banner({ variant = 'info', onDismiss, action, iconPath: customIconPath, className = '', children }) {
  const v = VARIANTS[variant] || VARIANTS.info;
  const iconPath = customIconPath || ICON_PATHS[variant] || ICON_PATHS.info;

  return (
    <div className={`flex items-center gap-1 p-2 rounded-[6px] border text-[14px] leading-[1.5] ${className}`}
      style={{ background: `linear-gradient(${v.bg}, ${v.bg}), #0c1117`, borderColor: v.border }}>
      <svg className="w-4 h-4 shrink-0 mx-2" style={{ color: v.icon }} viewBox="0 0 16 16" fill="currentColor">
        <path d={iconPath} />
      </svg>
      <span className="flex-1 text-[#e6edf3]">{children}</span>
      {action && <div className="shrink-0 mr-1">{action}</div>}
      {onDismiss && (
        <button onClick={onDismiss}
          title="Dismiss"
          className="p-2 rounded-[6px] text-[#8b949e] hover:text-[#e6edf3] hover:bg-white/5 transition-colors shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
      )}
    </div>
  );
}
