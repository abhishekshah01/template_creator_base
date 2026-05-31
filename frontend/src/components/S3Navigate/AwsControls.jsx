import { colors, radii } from './theme';

// Pill-shaped AWS Cloudscape-style action button used in toolbars.
//   variant='default'  – outlined; blue when enabled, dim when disabled
//   variant='primary'  – orange fill (Upload / Create admin)
//   variant='icon'     – circular icon-only refresh-style button
//
// Disabled `default` buttons keep their resting outline but switch to the
// inactive palette (border/text/icon all in muted gray). No hover effect on
// the disabled state.
export function AwsButton({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  type = 'button',
  title,
  icon,
  rightIcon,
  className = '',
}) {
  if (variant === 'icon') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`inline-flex items-center justify-center w-[32px] h-[32px] rounded-full transition-colors disabled:cursor-not-allowed ${className}`}
        style={{
          backgroundColor: 'transparent',
          border: `1px solid ${disabled ? colors.border.buttonInactive : colors.border.buttonActive}`,
          color: disabled ? colors.icon.buttonInactive : colors.icon.buttonActive,
        }}
      >
        {icon}
      </button>
    );
  }

  if (variant === 'primary') {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`inline-flex items-center gap-2 px-4 h-[32px] text-[14px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        style={{
          backgroundColor: colors.fill.primaryButton,
          border: `1px solid ${colors.border.primaryButton}`,
          color: colors.text.primaryButton,
          borderRadius: radii.pill,
        }}
      >
        {icon}
        {children}
        {rightIcon}
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-2 px-4 h-[32px] text-[14px] font-bold transition-colors disabled:cursor-not-allowed ${className}`}
      style={{
        backgroundColor: colors.bg.card,
        border: `1px solid ${disabled ? colors.border.buttonInactive : colors.border.buttonActive}`,
        color: disabled ? colors.text.buttonInactive : colors.text.buttonActive,
        borderRadius: radii.pill,
      }}
    >
      {icon}
      {children}
      {rightIcon}
    </button>
  );
}

// All section icons use the same stroke-based recipe: 16x16 viewBox, fill=none,
// stroke=currentColor (so they inherit from the button text color), 1.4 stroke,
// rounded caps + joins. Paths transcribed verbatim from AWS Cloudscape where
// available — anything that diverges is noted on the function.

const ICON_BASE_PROPS = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function RefreshIcon({ className = 'w-[14px] h-[14px]' }) {
  // Cloudscape "refresh" — open arrow at 1-o'clock, sweeping clockwise.
  return (
    <svg className={className} {...ICON_BASE_PROPS}>
      <path d="M14 6.5V2l-1.39 1.39A6 6 0 1 0 14 8M14 6.5H9.5" />
    </svg>
  );
}

export function SettingsIcon({ className = 'w-[14px] h-[14px]' }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS}>
      <path d="M6.11 1.729c-.07-.42.44-.729.86-.729h2.02c.43 0 .79.31.86.729l.17.999c.05.29.24.529.5.679.06.03.11.06.17.1.25.15.56.2.84.1l.95-.35c.4-.15.85 0 1.07.38l1.01 1.747c.21.37.13.839-.2 1.108l-.78.64c-.23.189-.34.479-.33.768v.2c0 .29.11.579.33.769l.78.639c.33.27.42.739.2 1.108l-1.01 1.748c-.21.37-.66.529-1.06.38l-.95-.35a.966.966 0 0 0-.84.1c-.06.03-.11.07-.17.1-.26.14-.45.389-.5.679l-.17.998A.878.878 0 0 1 9 15H6.98a.87.87 0 0 1-.86-.729l-.17-.998a.988.988 0 0 0-.5-.68c-.06-.03-.11-.06-.17-.1a.996.996 0 0 0-.84-.1l-.95.35c-.4.15-.85 0-1.06-.38l-1.01-1.747a.873.873 0 0 1 .2-1.108l.78-.64c.23-.189.34-.479.33-.768v-.2c0-.3-.11-.579-.33-.769l-.78-.639a.861.861 0 0 1-.2-1.108l1.01-1.748c.21-.37.66-.529 1.07-.38l.95.35c.28.1.58.06.84-.1.06-.03.11-.07.17-.1.26-.14.45-.379.5-.678l.15-1Z" />
      <path d="M10 8c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2Z" />
    </svg>
  );
}

export function CopyIcon({ className = 'w-[14px] h-[14px]' }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS}>
      <path d="M15 5H5v10h10V5Z" />
      <path d="M13 1H1v11" />
    </svg>
  );
}

export function DownloadIcon({ className = 'w-[14px] h-[14px]' }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS}>
      <path d="M1 15h14M13 6l-5 5-5-5M8 10V1" />
    </svg>
  );
}

export function OpenExternalIcon({ className = 'w-[14px] h-[14px]' }) {
  // AWS "external-link" — top-right corner L + diagonal slash from origin.
  return (
    <svg className={className} {...ICON_BASE_PROPS}>
      <path d="M13 9.012v-6H7" />
      <path d="M13 3 7 9" />
    </svg>
  );
}

export function UploadIcon({ className = 'w-[14px] h-[14px]' }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS}>
      <path d="M1 1h14M13 6 8 1 3 6M8 5v10" />
    </svg>
  );
}

// Filled rounded triangle used as the column-header sort marker. Path
// matches AWS Cloudscape "down" exactly; "up" is the vertical mirror.
// Rounded vertices come from stroke-linejoin=round with stroke=fill so the
// outline thickens the shape symmetrically.
export function SortTriangle({ direction, active }) {
  const color = active ? colors.text.primary : '#5e6166';
  const d = direction === 'asc'
    ? 'm8 5 4 6H4l4-6Z'
    : 'm8 11 4-6H4l4 6Z';
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill={color}
      stroke={color}
      strokeWidth="1.2"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

// Magnifying glass for AwsSearchInput. Stroked, rounded caps.
function MagnifierIcon({ className = 'w-[14px] h-[14px]' }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="m11 11 3 3" />
    </svg>
  );
}

// AWS-style search input. Magnifier on the left, italic placeholder, light
// border. Use for the "find by…" filters at the top of tables.
export function AwsSearchInput({ value, onChange, placeholder, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.icon.search }}>
        <MagnifierIcon />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 h-[34px] bg-transparent text-[14px] outline-none placeholder:italic"
        style={{
          border: `1px solid ${colors.border.inputDefault}`,
          borderRadius: radii.input,
          color: colors.text.primary,
        }}
      />
      <style>{`
        .aws-s3-section input::placeholder { color: ${colors.text.placeholder}; }
      `}</style>
    </div>
  );
}
