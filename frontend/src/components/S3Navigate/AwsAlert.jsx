// AWS-console-style alert banner. Two visual tones:
//   solid    — bright bg, white text/icon (used for action results like "Successfully created folder")
//   outlined — dark muted bg + colored border, used for inline warnings/info inside a page

const VARIANTS = {
  success: {
    solid:    { bg: '#1f7a3f', border: '#1f7a3f', icon: '#ffffff', text: '#ffffff' },
    outlined: { bg: 'rgba(31,122,63,0.12)', border: '#1f7a3f', icon: '#3fb950', text: '#e6edf3' },
  },
  error: {
    solid:    { bg: '#b00f1f', border: '#b00f1f', icon: '#ffffff', text: '#ffffff' },
    outlined: { bg: 'rgba(176,15,31,0.15)', border: '#e35b66', icon: '#e35b66', text: '#e6edf3' },
  },
  warning: {
    solid:    { bg: '#946800', border: '#946800', icon: '#ffffff', text: '#ffffff' },
    outlined: { bg: 'rgba(148,104,0,0.15)', border: '#d4a017', icon: '#d4a017', text: '#e6edf3' },
  },
  info: {
    solid:    { bg: '#0b5cad', border: '#0b5cad', icon: '#ffffff', text: '#ffffff' },
    outlined: { bg: 'rgba(11,92,173,0.15)', border: '#58a6ff', icon: '#58a6ff', text: '#e6edf3' },
  },
};

const ICONS = {
  success: 'M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.78 5.97a.75.75 0 0 0-1.06-1.06L6.5 9.13 5.28 7.9a.75.75 0 0 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.06 0Z',
  error:   'M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.28 4.72a.75.75 0 0 0-1.06 0L8 6.94 5.78 4.72a.749.749 0 1 0-1.06 1.06L6.94 8 4.72 10.22a.749.749 0 1 0 1.06 1.06L8 9.06l2.22 2.22a.749.749 0 1 0 1.06-1.06L9.06 8l2.22-2.22a.749.749 0 0 0 0-1.06Z',
  warning: 'M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  info:    'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
};

export default function AwsAlert({ variant = 'info', tone = 'solid', title, onDismiss, className = '', children }) {
  const v = VARIANTS[variant]?.[tone] || VARIANTS.info.solid;
  const iconPath = ICONS[variant] || ICONS.info;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-[4px] border text-[14px] leading-[1.45] ${className}`}
      style={{ backgroundColor: v.bg, borderColor: v.border, color: v.text }}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <svg className="w-5 h-5 shrink-0 mt-0.5" style={{ color: v.icon }} viewBox="0 0 16 16" fill="currentColor">
        <path d={iconPath} />
      </svg>
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold mb-0.5">{title}</div>}
        {children && <div className={title ? 'opacity-90' : ''}>{children}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          title="Dismiss"
          className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: v.text }}
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
      )}
    </div>
  );
}
