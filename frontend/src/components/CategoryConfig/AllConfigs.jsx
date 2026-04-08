import { useState } from 'react';

// Dummy data matching real API shape
const DUMMY_CONFIGS = [
  {
    id: 1,
    template_name: 'propnex_crm_scratch-v0',
    config: { app_summary: '<analysis>**original_problem_statement:** \nBuild a real estate CRM template that can be sold to customers. They start using this template on Emergent and can customize it for their own needs. The CRM should be designed for a mid-sized real estate agency with a hierarchical structure (Admin > Manager > Agent).\n\n**PRODUCT REQUIREMENTS...' },
    default_env_config: { DB_NAME: 'propnex_crm', MONGO_URL: 'mongodb://localhost:27017', CORS_ORIGINS: '*' },
    public: false, internal: true,
    summary_source_job_id: '71503f24-6251-4e30-97a8-fe4603c14d7f',
    created_at: '2026-04-07T10:33:34.741710Z',
    updated_at: '2026-04-07T10:35:56.918297Z',
  },
  {
    id: 2,
    template_name: 'lumina-stays-v1',
    config: { app_summary: 'Hospitality management system for hotel booking, reservations, and admin panel with payment integration and multi-property support.' },
    default_env_config: { DB_NAME: 'lumina_stays', MONGO_URL: 'mongodb://localhost:27017', CORS_ORIGINS: '*', JWT_ALGORITHM: 'HS256', JWT_SECRET_KEY: 'your_secret' },
    public: true, internal: true,
    summary_source_job_id: 'a2c8f1e0-3b5d-4a1e-9c7f-2d4e6f8a0b1c',
    created_at: '2026-04-01T08:12:00.000000Z',
    updated_at: '2026-04-06T14:22:10.000000Z',
  },
  {
    id: 3,
    template_name: 'lead-gen-v2',
    config: null,
    default_env_config: { DB_NAME: 'leadgen', MONGO_URL: 'mongodb://localhost:27017', CORS_ORIGINS: '*', RATELIMIT_ENABLED: 'True', SECRET_KEY: 'change-me', MAX_BODY_SIZE: '5242880' },
    public: true, internal: false,
    summary_source_job_id: null,
    created_at: '2026-03-15T12:00:00.000000Z',
    updated_at: '2026-03-15T12:00:00.000000Z',
  },
  {
    id: 4,
    template_name: 'real-estate-v0',
    config: { app_summary: 'Property listing and search application with map integration, favorites, and agent contact system.' },
    default_env_config: { DB_NAME: 'real_estate', MONGO_URL: 'mongodb://localhost:27017', CORS_ORIGINS: '*', EMERGENT_AUTH_URL: 'https://auth.emergentagent.com' },
    public: false, internal: true,
    summary_source_job_id: 'f5d2e1a0-9b8c-4d3e-a7f6-1c2d3e4f5a6b',
    created_at: '2026-03-20T09:30:00.000000Z',
    updated_at: '2026-04-02T11:45:00.000000Z',
  },
  {
    id: 5,
    template_name: 'booking-engine-v1',
    config: { app_summary: 'Hotel booking engine with availability calendar, room management, and Stripe payment integration for direct bookings.' },
    default_env_config: { DB_NAME: 'booking_engine', MONGO_URL: 'mongodb://localhost:27017', CORS_ORIGINS: '*', STRIPE_KEY: 'sk_test_xxx', JWT_SECRET_KEY: 'booking_secret' },
    public: true, internal: true,
    summary_source_job_id: 'c3b2a1d0-5e4f-6a7b-8c9d-0e1f2a3b4c5d',
    created_at: '2026-02-28T16:00:00.000000Z',
    updated_at: '2026-03-25T10:15:00.000000Z',
  },
  {
    id: 6,
    template_name: 'analytics-dashboard-v0',
    config: null,
    default_env_config: { DB_NAME: 'analytics', MONGO_URL: 'mongodb://localhost:27017', CORS_ORIGINS: 'http://localhost:3000' },
    public: false, internal: true,
    summary_source_job_id: null,
    created_at: '2026-02-10T11:00:00.000000Z',
    updated_at: '2026-02-10T11:00:00.000000Z',
  },
];

// --- Helpers ---
function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function extractSummaryPreview(config) {
  if (!config?.app_summary) return null;
  let text = config.app_summary;
  // Strip analysis tags and markdown
  text = text.replace(/<\/?analysis>/g, '');
  text = text.replace(/\*\*[^*]+\*\*/g, '');
  text = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  // Take first ~120 chars
  if (text.length > 120) text = text.slice(0, 120).trim() + '...';
  return text || null;
}

// --- Icons ---
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
function DatabaseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M1 3.5c0-.626.292-1.165.7-1.59C2.105 1.496 2.747 1.2 3.45 1h9.1c.703.2 1.345.496 1.75.91.408.425.7.964.7 1.59v9c0 .626-.292 1.165-.7 1.59-.405.414-1.047.71-1.75.91h-9.1c-.703-.2-1.345-.496-1.75-.91C1.292 13.665 1 13.126 1 12.5Zm1.5 0c0 .238.148.473.36.674.213.2.526.374.89.5V5.5h8.5V4.674c.364-.126.677-.3.89-.5.212-.201.36-.436.36-.674 0-.238-.148-.473-.36-.674A2.727 2.727 0 0 0 12.25 2.5h-8.5a2.727 2.727 0 0 0-.89.326c-.212.201-.36.436-.36.674Zm0 3.5V9h9V7Zm9 3.5H2.5V12.5c0 .238.148.473.36.674.213.2.526.374.89.5h8.5c.364-.126.677-.3.89-.5.212-.201.36-.436.36-.674Z" />
    </svg>
  );
}

export default function AllConfigs({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const filtered = DUMMY_CONFIGS.filter(c => {
    if (tab === 'internal' && !c.internal) return false;
    if (tab === 'public' && !c.public) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.template_name.toLowerCase().includes(q) || (c.config?.app_summary || '').toLowerCase().includes(q);
    }
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

      {/* Search bar + action buttons */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center bg-gh-canvas border border-gh-border rounded-md overflow-hidden">
          <div className="px-3 py-[7px] flex items-center gap-2 flex-1">
            <SearchIcon className="w-4 h-4 text-gh-text-muted shrink-0" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search all configs..."
              className="flex-1 bg-transparent text-sm text-gh-text outline-none placeholder:text-gh-text-muted" />
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-[7px] bg-gh-btn border border-gh-border rounded-md text-sm text-gh-text hover:bg-gh-btn-hover transition-colors">
          <TagIcon className="w-4 h-4" />
          <span>Labels</span>
        </button>
        <button onClick={() => onNavigate('config-create')}
          className="flex items-center gap-1.5 px-4 py-[7px] bg-gh-btn-primary text-white text-sm font-medium rounded-md hover:bg-gh-btn-primary-hover transition-colors">
          New config
        </button>
      </div>

      {/* Table */}
      <div className="border border-gh-border rounded-md overflow-hidden">
        {/* Tab header + filters */}
        <div className="flex items-center px-4 py-3 bg-gh-canvas-subtle border-b border-gh-border">
          <div className="flex items-center gap-4">
            {[
              { key: 'all', label: 'All', count: allCount },
              { key: 'internal', label: 'Internal', count: internalCount },
              { key: 'public', label: 'Public', count: publicCount },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  tab === t.key ? 'font-semibold text-gh-text' : 'text-gh-text-secondary hover:text-gh-text'
                }`}>
                {t.key === 'all' && <DatabaseIcon className="w-4 h-4" />}
                {t.label}
                <span className={`text-xs px-[6px] py-[1px] rounded-full leading-tight ${
                  tab === t.key ? 'bg-gh-text text-gh-canvas font-medium' : 'bg-gh-overlay text-gh-text-secondary'
                }`}>{t.count}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1">
            {['Visibility', 'Sort'].map(label => (
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
        {filtered.map(config => {
          const envVarCount = Object.keys(config.default_env_config || {}).length;
          const preview = extractSummaryPreview(config.config);
          const hasSummary = !!config.config?.app_summary;

          return (
            <div key={config.id}
              onClick={() => onNavigate('config-detail', config.id)}
              className="flex items-start gap-3 px-4 py-3 border-b border-gh-border-muted hover:bg-gh-surface-hover cursor-pointer transition-colors group">
              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Title + labels */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gh-text group-hover:text-gh-accent-blue-text transition-colors">
                    {config.template_name}
                  </span>
                  {config.internal && (
                    <span className="text-[11px] font-medium px-[7px] py-[1px] rounded-full leading-tight"
                      style={{ backgroundColor: 'rgba(31,111,235,0.2)', color: '#58a6ff', border: '1px solid rgba(31,111,235,0.4)' }}>
                      internal
                    </span>
                  )}
                  {config.public && (
                    <span className="text-[11px] font-medium px-[7px] py-[1px] rounded-full leading-tight"
                      style={{ backgroundColor: 'rgba(35,134,54,0.2)', color: '#3fb950', border: '1px solid rgba(35,134,54,0.4)' }}>
                      public
                    </span>
                  )}
                  {hasSummary && (
                    <span className="text-[11px] font-medium px-[7px] py-[1px] rounded-full leading-tight"
                      style={{ backgroundColor: 'rgba(137,87,229,0.2)', color: '#bc8cff', border: '1px solid rgba(137,87,229,0.4)' }}>
                      has summary
                    </span>
                  )}
                </div>

                {/* Summary preview */}
                {preview && (
                  <div className="text-xs text-gh-text-secondary mt-1 leading-relaxed truncate max-w-[600px]">
                    {preview}
                  </div>
                )}

                {/* Meta line */}
                <div className="flex items-center gap-2 text-xs text-gh-text-muted mt-1 flex-wrap">
                  <span>{envVarCount} env vars</span>
                  <span>·</span>
                  <span>created {timeAgo(config.created_at)}</span>
                  {config.created_at !== config.updated_at && (
                    <>
                      <span>·</span>
                      <span>updated {timeAgo(config.updated_at)}</span>
                    </>
                  )}
                  {config.summary_source_job_id && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-gh-text-disabled">
                        job:{config.summary_source_job_id.slice(0, 8)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <DatabaseIcon className="w-6 h-6 text-gh-text-muted mx-auto mb-3" />
            <div className="text-lg font-medium text-gh-text mb-1">No results matched your search.</div>
            <div className="text-sm text-gh-text-secondary">Try a different search term or filter.</div>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="mt-4 text-center text-xs text-gh-text-muted">
          Showing {filtered.length} of {allCount} configs
        </div>
      )}
    </div>
  );
}
