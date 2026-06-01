import { colors, radii } from './theme';

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
          border: `2px solid ${disabled ? colors.border.buttonInactive : colors.border.buttonActive}`,
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
          border: `2px solid ${colors.border.primaryButton}`,
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
        border: `2px solid ${disabled ? colors.border.buttonInactive : colors.border.buttonActive}`,
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

// Shared recipe for every icon — stroke=currentColor so they inherit color
// from the surrounding button text. strokeWidth is overridable per icon.
const ICON_BASE_PROPS = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};
const DEFAULT_STROKE = 2;

export function RefreshIcon({ className = 'w-[14px] h-[14px]', strokeWidth = DEFAULT_STROKE }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS} strokeWidth={strokeWidth}>
      <path d="M15 0v5l-5-.04" />
      <path d="M15 8c0 3.87-3.13 7-7 7s-7-3.13-7-7 3.13-7 7-7c2.79 0 5.2 1.63 6.33 4" />
    </svg>
  );
}

export function AwsRadio({ checked = false, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={!!checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full shrink-0 cursor-pointer"
      style={{
        backgroundColor: checked ? colors.border.rowSelected : 'transparent',
        border: `2px solid ${checked ? colors.border.rowSelected : colors.text.buttonInactive}`,
      }}
    >
      {checked && (
        <span
          style={{
            display: 'block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: colors.text.selectedRow,
          }}
        />
      )}
    </button>
  );
}

export function AwsCheckbox({ checked = false, indeterminate = false, onChange, ariaLabel }) {
  const isOn = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : !!checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className="inline-flex items-center justify-center w-[16px] h-[16px] rounded-[2px] shrink-0 cursor-pointer"
      style={{
        backgroundColor: isOn ? colors.border.rowSelected : '#e8e6e2',
        border: `2px solid ${isOn ? colors.border.rowSelected : colors.text.buttonInactive}`,
      }}
    >
      {indeterminate ? (
        <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <path d="M2 5h6" />
        </svg>
      ) : checked ? (
        <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 5l2 2 4-4" />
        </svg>
      ) : null}
    </button>
  );
}

export function SettingsIcon({ className = 'w-[14px] h-[14px]', strokeWidth = DEFAULT_STROKE }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS} strokeWidth={strokeWidth}>
      <path d="M6.11 1.729c-.07-.42.44-.729.86-.729h2.02c.43 0 .79.31.86.729l.17.999c.05.29.24.529.5.679.06.03.11.06.17.1.25.15.56.2.84.1l.95-.35c.4-.15.85 0 1.07.38l1.01 1.747c.21.37.13.839-.2 1.108l-.78.64c-.23.189-.34.479-.33.768v.2c0 .29.11.579.33.769l.78.639c.33.27.42.739.2 1.108l-1.01 1.748c-.21.37-.66.529-1.06.38l-.95-.35a.966.966 0 0 0-.84.1c-.06.03-.11.07-.17.1-.26.14-.45.389-.5.679l-.17.998A.878.878 0 0 1 9 15H6.98a.87.87 0 0 1-.86-.729l-.17-.998a.988.988 0 0 0-.5-.68c-.06-.03-.11-.06-.17-.1a.996.996 0 0 0-.84-.1l-.95.35c-.4.15-.85 0-1.06-.38l-1.01-1.747a.873.873 0 0 1 .2-1.108l.78-.64c.23-.189.34-.479.33-.768v-.2c0-.3-.11-.579-.33-.769l-.78-.639a.861.861 0 0 1-.2-1.108l1.01-1.748c.21-.37.66-.529 1.07-.38l.95.35c.28.1.58.06.84-.1.06-.03.11-.07.17-.1.26-.14.45-.379.5-.678l.15-1Z" />
      <path d="M10 8c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2Z" />
    </svg>
  );
}

export function CopyIcon({ className = 'w-[14px] h-[14px]', strokeWidth = DEFAULT_STROKE }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS} strokeWidth={strokeWidth}>
      <path d="M15 5H5v10h10V5Z" />
      <path d="M13 1H1v11" />
    </svg>
  );
}

export function DownloadIcon({ className = 'w-[14px] h-[14px]', strokeWidth = DEFAULT_STROKE }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS} strokeWidth={strokeWidth}>
      <path d="M1 15h14M13 6l-5 5-5-5M8 10V1" />
    </svg>
  );
}

export function OpenExternalIcon({ className = 'w-[14px] h-[14px]', strokeWidth = DEFAULT_STROKE }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS} strokeWidth={strokeWidth}>
      <path d="M13 9.012v-6H7" />
      <path d="M13 3 7 9" />
    </svg>
  );
}

export function UploadIcon({ className = 'w-[14px] h-[14px]', strokeWidth = DEFAULT_STROKE }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS} strokeWidth={strokeWidth}>
      <path d="M1 1h14M13 6 8 1 3 6M8 5v10" />
    </svg>
  );
}

export function UploadIconV2({ className = 'w-[14px] h-[14px]', strokeWidth = 2 }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS} strokeWidth={strokeWidth}>
      <path d="M1 1h14M13 10 8 5l-5 5M8 6v9" />
    </svg>
  );
}

export function OpenExternalIconV2({ className = 'w-[14px] h-[14px]', strokeWidth = 2 }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS} strokeWidth={strokeWidth}>
      <path d="M13 9.012v-6H7" />
      <path d="M13.02 3 7 9.01" />
      <path d="M3 5.012v8h8.01" />
    </svg>
  );
}

export function ActionsArrowIcon({ size = 12, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} stroke={color} strokeWidth="1" strokeLinejoin="round">
      <path d="m8 11 4-6H4l4 6Z" />
    </svg>
  );
}

export function SortTriangle({ direction, active }) {
  const color = active ? colors.text.primary : '#9ba0a6';
  const d = direction === 'asc'
    ? 'm8 5 4 6H4l4-6Z'
    : 'm8 11 4-6H4l4 6Z';
  return (
    <svg
      width="14"
      height="14"
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

// Active column = filled solid triangle in the sort direction.
// Inactive columns = hollow (stroked-only) downward triangle as the sort affordance.
export function SortTriangleV2({ direction, active, size = 16 }) {
  if (!active) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        stroke="#9ba0a6"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="m8 11 4-6H4l4 6Z" />
      </svg>
    );
  }
  const d = direction === 'asc' ? 'm8 5 4 6H4l4-6Z' : 'm8 11 4-6H4l4 6Z';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={colors.text.selectedRow}
      stroke={colors.text.selectedRow}
      strokeWidth="1"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

function MagnifierIcon({ className = 'w-[18px] h-[18px]', strokeWidth = DEFAULT_STROKE }) {
  return (
    <svg className={className} {...ICON_BASE_PROPS} strokeWidth={strokeWidth}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="m11 11 3 3" />
    </svg>
  );
}

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
