import { colors } from './theme';

const VARIANTS = {
  error: {
    bg: '#390000',
    border: '#bd0000',
    iconColor: '#bd0000',
    Icon: ErrorCircleIcon,
  },
};

export default function AwsAlert2({ variant = 'error', title, onDismiss, className = '', children }) {
  const v = VARIANTS[variant] || VARIANTS.error;
  const Icon = v.Icon;
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 px-4 py-3 rounded-[8px] text-[14px] leading-[1.45] ${className}`}
      style={{
        backgroundColor: v.bg,
        border: `2px solid ${v.border}`,
        color: colors.text.selectedRow,
      }}
    >
      <span className="shrink-0 mt-0.5" style={{ color: v.iconColor }}>
        <Icon />
      </span>
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-bold mb-0.5" style={{ color: colors.text.selectedRow }}>
            {title}
          </div>
        )}
        {children && <div>{children}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          title="Dismiss"
          className="shrink-0 -mt-1 -mr-1 p-1 rounded hover:bg-white/5 transition-colors"
          style={{ color: colors.text.selectedRow }}
        >
          <DismissIcon />
        </button>
      )}
    </div>
  );
}

function ErrorCircleIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="7" />
      <path d="m5.5 5.5 5 5M10.5 5.5l-5 5" />
    </svg>
  );
}

function DismissIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}
