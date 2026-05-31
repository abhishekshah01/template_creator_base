// Shared content primitives for guide pages. Designed to match the GitHub-dark
// aesthetic the rest of the app uses (see Settings, TemplateSummary, CreateConfig).

import { imageUrl } from './images';

// ───────── headings ─────────

export function H1({ children, id }) {
  return (
    <h1 id={id} className="text-[28px] font-semibold text-[#e6edf3] tracking-tight leading-[1.2] mt-1 mb-4">
      {children}
    </h1>
  );
}

export function H2({ children, id }) {
  return (
    <h2 id={id} className="text-[19px] font-semibold text-[#e6edf3] tracking-tight leading-[1.3] mt-11 mb-3 scroll-mt-24">
      {children}
    </h2>
  );
}

export function H3({ children, id }) {
  return (
    <h3 id={id} className="text-[16px] font-semibold text-[#e6edf3] tracking-tight leading-[1.35] mt-7 mb-2 scroll-mt-24">
      {children}
    </h3>
  );
}

// ───────── text ─────────

export function Lead({ children }) {
  return (
    <p className="text-[16px] text-[#c9d1d9] leading-[1.65] mt-2 mb-6">
      {children}
    </p>
  );
}

export function P({ children }) {
  return (
    <p className="text-[15px] text-[#c9d1d9] leading-[1.7] my-3">
      {children}
    </p>
  );
}

export function UL({ children }) {
  return (
    <ul className="list-disc pl-5 my-3 space-y-1.5 text-[15px] text-[#c9d1d9] leading-[1.65] marker:text-[#6e7681]">
      {children}
    </ul>
  );
}

export function OL({ children }) {
  return (
    <ol className="list-decimal pl-5 my-3 space-y-1.5 text-[15px] text-[#c9d1d9] leading-[1.65] marker:text-[#8b949e]">
      {children}
    </ol>
  );
}

export function LI({ children }) {
  return <li className="pl-0.5">{children}</li>;
}

// Inline link.
export function A({ children, href, onClick }) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="text-[#58a6ff] hover:underline underline-offset-2 inline align-baseline"
      >
        {children}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-[#58a6ff] hover:underline underline-offset-2">
      {children}
    </a>
  );
}

// Inline code — matches the existing app's compact inline-code style.
export function Code({ children }) {
  return (
    <code className="font-mono text-[0.86em] px-[5px] py-[1px] rounded bg-[#161b22] border border-[#30363d] text-[#e6edf3] whitespace-nowrap">
      {children}
    </code>
  );
}

// ───────── callouts ─────────

const NOTE_VARIANTS = {
  default:  { bg: '#161b22',              border: '#30363d',              accent: '#8b949e' },
  info:     { bg: 'rgba(0,91,209,0.08)',  border: 'rgba(0,91,209,0.35)',  accent: '#58a6ff' },
  warning:  { bg: 'rgba(137,89,6,0.12)',  border: 'rgba(137,89,6,0.4)',   accent: '#d29922' },
  caution:  { bg: 'rgba(137,89,6,0.12)',  border: 'rgba(137,89,6,0.4)',   accent: '#d29922' },
  critical: { bg: 'rgba(195,19,40,0.08)', border: 'rgba(195,19,40,0.4)',  accent: '#f85149' },
  success:  { bg: 'rgba(47,111,55,0.12)', border: 'rgba(47,111,55,0.4)',  accent: '#3fb950' },
  upsell:   { bg: 'rgba(119,48,232,0.08)', border: 'rgba(119,48,232,0.4)', accent: '#bc8cff' },
};

const NOTE_ICONS = {
  info:     'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
  warning:  'M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  caution:  'M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
  critical: 'M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
  success:  'M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72-4.25 4.25a.75.75 0 0 1-1.06 0L4.22 8.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L7 8.94l3.72-3.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z',
  upsell:   'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
};

export function Note({ children, title, tone = 'default' }) {
  const v = NOTE_VARIANTS[tone] || NOTE_VARIANTS.default;
  const iconPath = NOTE_ICONS[tone];
  return (
    <div
      className="my-4 rounded-[6px] border px-4 py-3 flex gap-3"
      style={{ backgroundColor: v.bg, borderColor: v.border }}
    >
      {iconPath && (
        <svg
          className="w-4 h-4 shrink-0 mt-[2px]"
          viewBox="0 0 16 16"
          fill="currentColor"
          style={{ color: v.accent }}
        >
          <path d={iconPath} />
        </svg>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="text-[14.5px] font-semibold text-[#e6edf3] mb-0.5 leading-[1.5]">
            {title}
          </div>
        )}
        <div className="text-[14.5px] leading-[1.65] text-[#c9d1d9]">
          {children}
        </div>
      </div>
    </div>
  );
}

// ───────── tables / lists ─────────

export function Steps({ children }) {
  return (
    <div className="my-5 rounded-[6px] border border-[#30363d] overflow-hidden bg-[#0d1117]">
      {children}
    </div>
  );
}
export function Step({ n, title, children }) {
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-[#21262d] last:border-b-0">
      <div className="w-5 h-5 rounded-full bg-[#161b22] border border-[#30363d] text-[#8b949e] text-[12px] font-semibold flex items-center justify-center shrink-0 mt-[1px]">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-[#e6edf3] mb-0.5">{title}</div>
        <div className="text-[14.5px] text-[#c9d1d9] leading-[1.65]">{children}</div>
      </div>
    </div>
  );
}

export function Scenarios({ children }) {
  return <div className="my-5 grid gap-2">{children}</div>;
}
export function Scenario({ when, then }) {
  return (
    <div className="rounded-[6px] border border-[#30363d] overflow-hidden bg-[#0d1117]">
      <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] text-[12px] uppercase tracking-[0.08em] text-[#8b949e] font-semibold">
        When {when}
      </div>
      <div className="px-4 py-3 text-[14.5px] text-[#c9d1d9] leading-[1.65]">{then}</div>
    </div>
  );
}

export function KV({ label, children }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-2.5 border-b border-[#21262d] last:border-b-0">
      <div className="sm:w-[160px] shrink-0 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#8b949e] pt-[2px]">
        {label}
      </div>
      <div className="flex-1 text-[14.5px] text-[#c9d1d9] leading-[1.65]">{children}</div>
    </div>
  );
}
export function KVList({ children }) {
  return (
    <div className="my-4 rounded-[6px] border border-[#30363d] bg-[#0d1117] px-4">
      {children}
    </div>
  );
}

// ───────── screenshot ─────────

export function Screenshot({ name, caption, aspect = '16/9' }) {
  const src = name ? imageUrl(name) : null;

  if (src) {
    return (
      <figure className="my-5">
        <img
          src={src}
          alt={caption || name || 'screenshot'}
          className="w-full rounded-[6px] border border-[#30363d] block"
        />
        {caption && (
          <figcaption className="text-[13px] text-[#8b949e] mt-2 text-center leading-snug">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure className="my-5">
      <div
        className="w-full rounded-[6px] border border-dashed border-[#30363d] bg-[#0d1117] flex flex-col items-center justify-center gap-1.5 px-6 py-8 text-center"
        style={{ aspectRatio: aspect }}
      >
        <div className="text-[11px] uppercase tracking-[0.1em] text-[#6e7681]">
          Screenshot placeholder
        </div>
        <div className="text-[13.5px] text-[#8b949e] max-w-[480px] leading-snug">
          {caption}
        </div>
        {name && (
          <div className="text-[11px] text-[#484f58] font-mono mt-0.5">
            {name}.png
          </div>
        )}
      </div>
    </figure>
  );
}
