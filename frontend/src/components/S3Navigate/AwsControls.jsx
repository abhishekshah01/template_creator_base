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

  // default: outlined pill
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

export function RefreshIcon({ className = 'w-[14px] h-[14px]' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M14.95 7.16a.75.75 0 0 0-1.49.18A5.5 5.5 0 1 1 8 2.5c1.612 0 3.083.694 4.106 1.806L11.06 5.354A.25.25 0 0 0 11.237 5.78h3.013c.138 0 .25-.112.25-.25V2.518a.25.25 0 0 0-.427-.177l-1.092 1.092A6.97 6.97 0 0 0 8 1.5a7 7 0 1 0 6.95 5.66Z" />
    </svg>
  );
}

// Sort-direction triangles used in column headers. The "default" variant is
// the muted ▽ shown on inactive columns as an affordance.
export function SortTriangle({ direction, active }) {
  // direction: 'asc' | 'desc' | null
  const fill = active ? colors.text.primary : '#5e6166';
  if (direction === 'asc') {
    return (
      <svg className="w-[10px] h-[10px]" viewBox="0 0 10 10">
        <path d="M5 1.5 9 8H1Z" fill={fill} />
      </svg>
    );
  }
  return (
    <svg className="w-[10px] h-[10px]" viewBox="0 0 10 10">
      <path d="M5 8.5 1 2h8Z" fill={fill} />
    </svg>
  );
}

// AWS-style search input. Magnifier on the left, italic placeholder, light
// border. Use for the "find by…" filters at the top of tables.
export function AwsSearchInput({ value, onChange, placeholder, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px]"
        style={{ color: colors.icon.search }}
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M10.5 1a5.5 5.5 0 0 1 4.383 8.823l3.147 3.146a.75.75 0 1 1-1.061 1.06l-3.146-3.146A5.5 5.5 0 1 1 10.5 1Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
      </svg>
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

// Optional thin column separator used between header cells. Mirrors AWS S3
// where the column dividers are short vertical lines flanked by whitespace.
export function ColumnDivider() {
  return (
    <span
      aria-hidden="true"
      className="inline-block align-middle mx-3"
      style={{
        width: '1px',
        height: '20px',
        backgroundColor: '#3d4145',
      }}
    />
  );
}
