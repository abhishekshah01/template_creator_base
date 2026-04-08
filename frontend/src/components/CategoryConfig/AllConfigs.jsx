import { useState } from 'react';

const DUMMY_CONFIGS = [
  { id: 'cfg_001', template_name: 'lumina-stays-v1', env_vars: 5, internal: true, public: true, summary: 'Hospitality management system for booking and reservations', updated: 'last week', owner: 'abhishek' },
  { id: 'cfg_002', template_name: 'propnex_crm_prebuilt-v0', env_vars: 3, internal: true, public: false, summary: 'Real estate CRM platform with lead tracking', updated: '2 weeks ago', owner: 'sritam' },
  { id: 'cfg_003', template_name: 'real-estate-v0', env_vars: 4, internal: true, public: false, summary: 'Property listing search and management app', updated: '3 weeks ago', owner: 'abhishek' },
  { id: 'cfg_004', template_name: 'lead-gen-v2', env_vars: 6, internal: false, public: true, summary: 'Lead generation automation with multi-channel outreach', updated: 'last month', owner: 'anshul' },
  { id: 'cfg_005', template_name: 'booking-engine-v1', env_vars: 8, internal: true, public: true, summary: 'Hotel booking engine with payment integration', updated: 'last month', owner: 'sritam' },
  { id: 'cfg_006', template_name: 'analytics-dashboard-v0', env_vars: 4, internal: true, public: false, summary: 'Analytics and reporting dashboard for business metrics', updated: '2 months ago', owner: 'abhishek' },
];

// --- Icons ---
function ConfigIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
    </svg>
  );
}
function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
    </svg>
  );
}
function TagIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M1 7.775V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 0 1 0 2.474l-5.026 5.026a1.75 1.75 0 0 1-2.474 0l-6.25-6.25A1.752 1.752 0 0 1 1 7.775Zm1.5 0c0 .066.026.13.073.177l6.25 6.25a.25.25 0 0 0 .354 0l5.025-5.025a.25.25 0 0 0 0-.354l-6.25-6.25a.25.25 0 0 0-.177-.073H2.75a.25.25 0 0 0-.25.25ZM6 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
    </svg>
  );
}
function CommentIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
    </svg>
  );
}
function ChevronDown({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
    </svg>
  );
}
function SortIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M15 8a.75.75 0 0 1-.75.75H1.75a.75.75 0 0 1 0-1.5h12.5A.75.75 0 0 1 15 8ZM2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm3 8.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  );
}

const LABEL_COLORS = {
  internal: { bg: '#1f6feb', text: '#ffffff' },
  public: { bg: '#238636', text: '#ffffff' },
  'has-summary': { bg: '#8957e5', text: '#ffffff' },
};

export default function AllConfigs({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const filtered = DUMMY_CONFIGS.filter(c => {
    if (tab === 'internal' && !c.internal) return false;
    if (tab === 'public' && !c.public) return false;
    if (search && !c.template_name.toLowerCase().includes(search.toLowerCase()) && !c.summary.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allCount = DUMMY_CONFIGS.length;
  const internalCount = DUMMY_CONFIGS.filter(c => c.internal).length;
  const publicCount = DUMMY_CONFIGS.filter(c => c.public).length;

  return (
    <div>
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gh-text">Category Configs</h1>
      </div>

      {/* Search bar + action buttons row (GitHub-style) */}
      <div className="flex items-center gap-2 mb-4">
        {/* Search input */}
        <div className="flex-1 flex items-center bg-gh-canvas border border-gh-border rounded-md overflow-hidden">
          <div className="px-3 py-[7px] flex items-center gap-2 flex-1">
            <SearchIcon className="w-4 h-4 text-gh-text-muted shrink-0" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search all configs..."
              className="flex-1 bg-transparent text-sm text-gh-text outline-none placeholder:text-gh-text-muted" />
          </div>
        </div>

        {/* Labels button */}
        <button className="flex items-center gap-1.5 px-3 py-[7px] bg-gh-btn border border-gh-border rounded-md text-sm text-gh-text hover:bg-gh-btn-hover transition-colors">
          <TagIcon className="w-4 h-4" />
          <span>Labels</span>
        </button>

        {/* New config button (green like GitHub "New issue") */}
        <button onClick={() => onNavigate('config-create')}
          className="flex items-center gap-1.5 px-4 py-[7px] bg-gh-btn-primary text-white text-sm font-medium rounded-md hover:bg-gh-btn-primary-hover transition-colors">
          New config
        </button>
      </div>

      {/* Table container */}
      <div className="border border-gh-border rounded-md overflow-hidden">
        {/* Tab header (Open/Closed style) + filter dropdowns */}
        <div className="flex items-center px-4 py-3 bg-gh-canvas-subtle border-b border-gh-border">
          {/* Tabs */}
          <div className="flex items-center gap-4">
            <button onClick={() => setTab('all')}
              className={`flex items-center gap-1.5 text-sm ${tab === 'all' ? 'font-semibold text-gh-text' : 'text-gh-text-secondary hover:text-gh-text'}`}>
              <ConfigIcon className="w-4 h-4" />
              All
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'all' ? 'bg-gh-text text-gh-canvas' : 'bg-gh-overlay text-gh-text-secondary'}`}>{allCount}</span>
            </button>
            <button onClick={() => setTab('internal')}
              className={`flex items-center gap-1.5 text-sm ${tab === 'internal' ? 'font-semibold text-gh-text' : 'text-gh-text-secondary hover:text-gh-text'}`}>
              Internal
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'internal' ? 'bg-gh-text text-gh-canvas' : 'bg-gh-overlay text-gh-text-secondary'}`}>{internalCount}</span>
            </button>
            <button onClick={() => setTab('public')}
              className={`flex items-center gap-1.5 text-sm ${tab === 'public' ? 'font-semibold text-gh-text' : 'text-gh-text-secondary hover:text-gh-text'}`}>
              Public
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'public' ? 'bg-gh-text text-gh-canvas' : 'bg-gh-overlay text-gh-text-secondary'}`}>{publicCount}</span>
            </button>
          </div>

          {/* Filter dropdowns (right side) */}
          <div className="ml-auto flex items-center gap-1">
            {['Visibility', 'Owner', 'Sort'].map(label => (
              <button key={label}
                className="flex items-center gap-0.5 px-2 py-1 text-xs text-gh-text-secondary hover:text-gh-text transition-colors">
                {label === 'Sort' && <SortIcon className="w-3.5 h-3.5 mr-0.5" />}
                <span>{label}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Config rows */}
        {filtered.map(config => (
          <div key={config.id}
            onClick={() => onNavigate('config-detail', config.id)}
            className="flex items-start gap-3 px-4 py-3 border-b border-gh-border-muted hover:bg-gh-surface-hover cursor-pointer transition-colors group">
            {/* Config icon */}
            <ConfigIcon className="w-4 h-4 text-gh-accent-green-text mt-0.5 shrink-0" />

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Title row with labels */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gh-text group-hover:text-gh-accent-blue-text transition-colors">
                  {config.template_name}
                </span>
                {/* Labels */}
                {config.internal && (
                  <span className="text-xs font-medium px-[7px] py-[1px] rounded-full border"
                    style={{ backgroundColor: LABEL_COLORS.internal.bg + '20', color: LABEL_COLORS.internal.text, borderColor: LABEL_COLORS.internal.bg + '40' }}>
                    internal
                  </span>
                )}
                {config.public && (
                  <span className="text-xs font-medium px-[7px] py-[1px] rounded-full border"
                    style={{ backgroundColor: LABEL_COLORS.public.bg + '20', color: LABEL_COLORS.public.text, borderColor: LABEL_COLORS.public.bg + '40' }}>
                    public
                  </span>
                )}
                {config.env_vars > 5 && (
                  <span className="text-xs font-medium px-[7px] py-[1px] rounded-full border"
                    style={{ backgroundColor: LABEL_COLORS['has-summary'].bg + '20', color: LABEL_COLORS['has-summary'].text, borderColor: LABEL_COLORS['has-summary'].bg + '40' }}>
                    {config.env_vars} env vars
                  </span>
                )}
              </div>
              {/* Meta line */}
              <div className="text-xs text-gh-text-muted mt-0.5">
                <span className="text-gh-text-secondary">{config.summary}</span>
              </div>
              <div className="text-xs text-gh-text-muted mt-0.5">
                {config.id.replace('cfg_', '#')} · {config.owner} updated {config.updated} · {config.env_vars} env vars
              </div>
            </div>

            {/* Right side: comment/action count */}
            <div className="flex items-center gap-3 shrink-0 mt-1">
              <span className="flex items-center gap-1 text-xs text-gh-text-muted hover:text-gh-accent-blue-text transition-colors">
                <CommentIcon className="w-4 h-4" />
                {config.env_vars}
              </span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <ConfigIcon className="w-6 h-6 text-gh-text-muted mx-auto mb-3" />
            <div className="text-lg font-medium text-gh-text mb-1">No results matched your search.</div>
            <div className="text-sm text-gh-text-secondary">Try a different search term or filter.</div>
          </div>
        )}
      </div>

      {/* Footer info */}
      {filtered.length > 0 && (
        <div className="mt-4 text-center text-xs text-gh-text-muted">
          Showing {filtered.length} of {allCount} configs
        </div>
      )}
    </div>
  );
}
