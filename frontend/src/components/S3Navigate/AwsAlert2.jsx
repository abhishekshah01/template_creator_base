import { colors } from './theme';

const VARIANTS = {
  error: {
    bg: '#390000',
    border: '#bd0000',
    iconColor: '#bd0000',
    Icon: ErrorCircleIcon,
  },
  warning: {
    bg: '#2a2100',
    border: '#d79000',
    iconColor: '#ffcf6f',
    Icon: WarningTriangleIcon,
  },
  info: {
    bg: '#001f3a',
    border: '#0073bb',
    iconColor: '#45abfe',
    Icon: InfoCircleIcon,
  },
  tip: {
    bg: '#1a0a35',
    border: '#7730e8',
    iconColor: '#dcc6ff',
    Icon: LightbulbIcon,
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

function InfoCircleIcon() {
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
      {/* 'i' body */}
      <path d="M8 7v4" />
      {/* 'i' dot — near-zero-length segment so the round line-cap renders as a circle */}
      <path d="M8 5h.01" />
    </svg>
  );
}

function LightbulbIcon() {
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
      {/* 7 rays evenly distributed around the upper hemisphere, radial from
          the bulb centre (~8,6.5). Length ~1.5, all clear of the bulb body. */}
      <path d="M8 2.5V1" />
      <path d="m10.9 3 1.2-1.2" />
      <path d="m5.1 3-1.2-1.2" />
      <path d="m11.7 4.8 1.4-.8" />
      <path d="m4.3 4.8-1.4-.8" />
      <path d="M11.5 6.5H13.2" />
      <path d="M4.5 6.5H2.8" />
      {/* Bulb */}
      <path d="M8 3.5C6 3.5 5 5 5 6.5c0 1.3.55 2.3 1.35 2.9.3.2.5.5.5.9v.2h3.3v-.2c0-.4.2-.7.5-.9C10.45 8.8 11 7.8 11 6.5c0-1.5-1-3-3-3Z" />
      {/* Base bands */}
      <path d="M6.7 11.6h2.6" />
      <path d="M7 13.1h2" />
    </svg>
  );
}

function WarningTriangleIcon() {
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
      <path d="M6.52 1.88l-5.33 9.76c-.13.23-.19.5-.19.76 0 .88.71 1.59 1.59 1.59H13.4c.88 0 1.59-.71 1.59-1.59 0-.27-.07-.53-.19-.76L9.48 1.88C9.18 1.34 8.62 1 8 1s-1.18.34-1.48.88Z" />
      <path d="M8 5v4" />
      {/* Near-zero-length segment so the round line-cap renders as a dot
          instead of the elongated pill the original 2-unit M8 10v2 gave. */}
      <path d="M8 11.5h.01" />
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
