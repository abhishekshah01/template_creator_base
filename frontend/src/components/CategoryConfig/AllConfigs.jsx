import { useState, useEffect } from 'react';

// --- Helpers ---
function timeAgo(dateStr) {
  if (!dateStr) return '';
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
  text = text.replace(/<\/?analysis>/g, '');
  text = text.replace(/\*\*[^*]+\*\*/g, '');
  text = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
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
function RefreshIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

export default function AllConfigs({ onNavigate, bearerToken, onTokenExpired, cachedConfigs = [], configsStale, configsLoaded, refreshConfigs }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [hasSummaryFilter, setHasSummaryFilter] = useState(false);
  const [showLabelMenu, setShowLabelMenu] = useState(false);

  const configs = cachedConfigs;

  async function handleRefresh() {
    if (!bearerToken) {
      setError('Set your API token in the sidebar first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await refreshConfigs();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Fetch on initial mount only if not already loaded
  useEffect(() => {
    if (bearerToken && !configsLoaded) handleRefresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close menus on outside click
  useEffect(() => {
    function handleClick() { setShowSortMenu(false); setShowLabelMenu(false); }
    if (showSortMenu || showLabelMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showSortMenu, showLabelMenu]);

  // Filter
  let filtered = configs.filter(c => {
    if (tab === 'internal' && !c.internal) return false;
    if (tab === 'public' && !c.public) return false;
    if (hasSummaryFilter && !c.config?.app_summary) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = c.template_name?.toLowerCase().includes(q);
      const matchJobId = c.summary_source_job_id?.toLowerCase().includes(q);
      const matchSummary = (c.config?.app_summary || '').toLowerCase().includes(q);
      return matchName || matchJobId || matchSummary;
    }
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'newest': return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      case 'oldest': return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      case 'recently-updated': return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      case 'name-asc': return (a.template_name || '').localeCompare(b.template_name || '');
      case 'name-desc': return (b.template_name || '').localeCompare(a.template_name || '');
      case 'env-vars': return Object.keys(b.default_env_config || {}).length - Object.keys(a.default_env_config || {}).length;
      default: return 0;
    }
  });

  const allCount = configs.length;
  const internalCount = configs.filter(c => c.internal).length;
  const publicCount = configs.filter(c => c.public).length;

  const SORT_OPTIONS = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'recently-updated', label: 'Recently updated' },
    { key: 'name-asc', label: 'Name (A-Z)' },
    { key: 'name-desc', label: 'Name (Z-A)' },
    { key: 'env-vars', label: 'Most env vars' },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gh-text">Category Configs</h1>
      </div>

      {/* Token warning */}
      {!bearerToken && (
        <div className="mb-4 px-4 py-3 rounded-md text-sm border bg-gh-accent-amber/15 text-gh-accent-amber-text border-gh-accent-amber/30">
          Set your API token in the sidebar to load configs.
        </div>
      )}

      {/* Search bar + action buttons */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 flex items-center bg-gh-canvas border border-gh-border rounded-md overflow-hidden">
          <div className="px-3 py-[7px] flex items-center gap-2 flex-1">
            <SearchIcon className="w-4 h-4 text-gh-text-muted shrink-0" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, job ID, or summary..."
              className="flex-1 bg-transparent text-sm text-gh-text outline-none placeholder:text-gh-text-muted" />
          </div>
        </div>
        <button onClick={handleRefresh} disabled={loading}
          data-testid="refresh-configs-btn"
          className="flex items-center gap-1.5 px-3 py-[7px] bg-gh-btn border border-gh-border rounded-md text-sm text-gh-text hover:bg-gh-btn-hover transition-colors disabled:opacity-50">
          <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <div className="relative">
          <button onClick={e => { e.stopPropagation(); setShowLabelMenu(!showLabelMenu); setShowSortMenu(false); }}
            className={`flex items-center gap-1.5 px-3 py-[7px] bg-gh-btn border border-gh-border rounded-md text-sm text-gh-text hover:bg-gh-btn-hover transition-colors ${hasSummaryFilter ? '!border-[#58a6ff] !text-[#58a6ff]' : ''}`}>
            <TagIcon className="w-4 h-4" />
            <span>Labels</span>
          </button>
          {showLabelMenu && (
            <div className="absolute right-0 top-10 z-20 w-[200px] bg-[#161b22] border border-[#30363d] rounded-md shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-3 py-2 text-[12px] font-semibold text-[#e6edf3] border-b border-[#21262d]">Filter by label</div>
              <button onClick={() => { setHasSummaryFilter(!hasSummaryFilter); setShowLabelMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#c9d1d9] hover:bg-[#1f6feb]/15 transition-colors text-left">
                <div className={`w-[14px] h-[14px] rounded-[3px] flex items-center justify-center ${hasSummaryFilter ? 'bg-[#1f6feb]' : 'border border-[#484f58]'}`}>
                  {hasSummaryFilter && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" /></svg>}
                </div>
                <span className="text-[11px] font-medium px-[5px] py-[1px] rounded-full" style={{ backgroundColor: 'rgba(137,87,229,0.2)', color: '#bc8cff', border: '1px solid rgba(137,87,229,0.4)' }}>has summary</span>
              </button>
            </div>
          )}
        </div>
        <button onClick={() => onNavigate('config-create')}
          data-testid="new-config-btn"
          className="flex items-center gap-1.5 px-4 py-[7px] bg-gh-btn-primary text-white text-sm font-medium rounded-md hover:bg-gh-btn-primary-hover transition-colors">
          New config
        </button>
      </div>

      {/* Active filters bar */}
      {(search || hasSummaryFilter || sortBy !== 'newest') && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {search && (
            <span className="inline-flex items-center gap-1 text-[12px] px-2 py-[2px] rounded-full bg-[#1f6feb]/10 text-[#58a6ff] border border-[#1f6feb]/25">
              Search: "{search}"
              <button onClick={() => setSearch('')} className="hover:text-white ml-0.5">×</button>
            </span>
          )}
          {hasSummaryFilter && (
            <span className="inline-flex items-center gap-1 text-[12px] px-2 py-[2px] rounded-full bg-[#8957e5]/10 text-[#bc8cff] border border-[#8957e5]/25">
              has summary
              <button onClick={() => setHasSummaryFilter(false)} className="hover:text-white ml-0.5">×</button>
            </span>
          )}
          {sortBy !== 'newest' && (
            <span className="inline-flex items-center gap-1 text-[12px] px-2 py-[2px] rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]">
              Sort: {SORT_OPTIONS.find(o => o.key === sortBy)?.label}
              <button onClick={() => setSortBy('newest')} className="hover:text-white ml-0.5">×</button>
            </span>
          )}
          <button onClick={() => { setSearch(''); setHasSummaryFilter(false); setSortBy('newest'); setTab('all'); }}
            className="text-[12px] text-[#58a6ff] hover:underline">
            Clear all filters
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-md text-sm border bg-gh-accent-red/10 text-gh-accent-red-text border-gh-accent-red/30">
          {error}
        </div>
      )}

      {configsStale && (
        <div className="mb-4 px-4 py-[7px] rounded-md text-[13px] border bg-[#9e6a03]/8 text-[#d29922] border-[#9e6a03]/20 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
          </svg>
          <span>Data may be out of sync.</span>
          <button onClick={handleRefresh} className="text-[#58a6ff] hover:underline font-medium ml-1">Refresh</button>
        </div>
      )}

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
          <div className="ml-auto flex items-center gap-1 relative">
            {/* Sort dropdown */}
            <div className="relative">
              <button onClick={e => { e.stopPropagation(); setShowSortMenu(!showSortMenu); setShowLabelMenu(false); }}
                className="flex items-center gap-0.5 px-2 py-1 text-xs text-gh-text-secondary hover:text-gh-text transition-colors">
                <SortIcon className="w-3.5 h-3.5 mr-0.5" />
                <span>Sort</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-8 z-20 w-[180px] bg-[#161b22] border border-[#30363d] rounded-md shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="px-3 py-2 text-[12px] font-semibold text-[#e6edf3] border-b border-[#21262d]">Sort by</div>
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.key} onClick={() => { setSortBy(opt.key); setShowSortMenu(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-[6px] text-[13px] transition-colors text-left ${
                        sortBy === opt.key ? 'text-[#e6edf3] bg-[#1f6feb]/10' : 'text-[#8b949e] hover:bg-[#1f6feb]/10 hover:text-[#e6edf3]'
                      }`}>
                      <span className="w-3 text-center">{sortBy === opt.key ? '✓' : ''}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && configs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-5 h-5 border-2 border-gh-border border-t-gh-accent-blue-text rounded-full animate-spin mx-auto mb-3" />
            <div className="text-sm text-gh-text-secondary">Loading configs...</div>
          </div>
        )}

        {/* Config rows */}
        {!loading && filtered.map(config => {
          const envVarCount = Object.keys(config.default_env_config || {}).length;
          const preview = extractSummaryPreview(config.config);
          const hasSummary = !!config.config?.app_summary;

          return (
            <div key={config.id}
              data-testid={`config-row-${config.id}`}
              onClick={() => onNavigate('config-detail', config.id)}
              className="flex items-start gap-3 px-4 py-3 border-b border-gh-border-muted hover:bg-gh-surface-hover cursor-pointer transition-colors group">
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
                  {config.summary_source_job_id && (
                    <span className="text-[11px] font-mono font-medium px-[7px] py-[1px] rounded-full leading-tight"
                      style={{ backgroundColor: 'rgba(139,148,158,0.15)', color: '#8b949e', border: '1px solid rgba(139,148,158,0.3)' }}>
                      {config.summary_source_job_id}
                    </span>
                  )}
                </div>

                {/* Summary preview */}
                {preview && (
                  <div className="text-xs text-[#c9d1d9] mt-1 leading-relaxed truncate max-w-[600px]">
                    {preview}
                  </div>
                )}

                {/* Meta line */}
                <div className="flex items-center gap-2 text-xs text-gh-text-secondary mt-1 flex-wrap">
                  <span>{envVarCount} env vars</span>
                  {config.created_at && (
                    <>
                      <span>·</span>
                      <span>created {timeAgo(config.created_at)}</span>
                    </>
                  )}
                  {config.updated_at && config.created_at !== config.updated_at && (
                    <>
                      <span>·</span>
                      <span>updated {timeAgo(config.updated_at)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty states */}
        {!loading && configs.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16">
            <DatabaseIcon className="w-6 h-6 text-gh-text-muted mx-auto mb-3" />
            <div className="text-lg font-medium text-gh-text mb-1">No results matched your search.</div>
            <div className="text-sm text-gh-text-secondary">Try a different search term or filter.</div>
          </div>
        )}

        {!loading && configs.length === 0 && !error && bearerToken && (
          <div className="text-center py-16">
            <DatabaseIcon className="w-6 h-6 text-gh-text-muted mx-auto mb-3" />
            <div className="text-lg font-medium text-gh-text mb-1">No configs yet.</div>
            <div className="text-sm text-gh-text-secondary">Create your first category config to get started.</div>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="mt-4 text-center text-xs text-gh-text-muted">
          Showing {filtered.length} of {allCount} configs
        </div>
      )}
    </div>
  );
}
