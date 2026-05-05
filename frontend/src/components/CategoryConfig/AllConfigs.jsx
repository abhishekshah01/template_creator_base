import { useState, useEffect } from 'react';
import { usePersistedState } from '../../hooks/usePersistedState';
import Banner from '../Banner';

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

// --- Icons (GitHub Octicons 16px) ---
function SearchIcon({ className }) {
  return <svg className={className} viewBox="0 0 16 16" fill="currentColor"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" /></svg>;
}
function IssueOpenIcon({ className }) {
  return <svg className={className} viewBox="0 0 16 16" fill="currentColor"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" /></svg>;
}
function ChevronDown({ className }) {
  return <svg className={className} viewBox="0 0 16 16" fill="currentColor"><path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" /></svg>;
}
function TagIcon({ className }) {
  return <svg className={className} viewBox="0 0 16 16" fill="currentColor"><path d="M1 7.775V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 0 1 0 2.474l-5.026 5.026a1.75 1.75 0 0 1-2.474 0l-6.25-6.25A1.752 1.752 0 0 1 1 7.775Zm1.5 0c0 .066.026.13.073.177l6.25 6.25a.25.25 0 0 0 .354 0l5.025-5.025a.25.25 0 0 0 0-.354l-6.25-6.25a.25.25 0 0 0-.177-.073H2.75a.25.25 0 0 0-.25.25ZM6 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" /></svg>;
}
function DatabaseIcon({ className }) {
  return <svg className={className} viewBox="0 0 16 16" fill="currentColor"><path d="M1 3.5c0-.626.292-1.165.7-1.59C2.105 1.496 2.747 1.2 3.45 1h9.1c.703.2 1.345.496 1.75.91.408.425.7.964.7 1.59v9c0 .626-.292 1.165-.7 1.59-.405.414-1.047.71-1.75.91h-9.1c-.703-.2-1.345-.496-1.75-.91C1.292 13.665 1 13.126 1 12.5Zm1.5 0c0 .238.148.473.36.674.213.2.526.374.89.5V5.5h8.5V4.674c.364-.126.677-.3.89-.5.212-.201.36-.436.36-.674 0-.238-.148-.473-.36-.674A2.727 2.727 0 0 0 12.25 2.5h-8.5a2.727 2.727 0 0 0-.89.326c-.212.201-.36.436-.36.674Zm0 3.5V9h9V7Zm9 3.5H2.5V12.5c0 .238.148.473.36.674.213.2.526.374.89.5h8.5c.364-.126.677-.3.89-.5.212-.201.36-.436.36-.674Z" /></svg>;
}

// GitHub-style label — tinted bg, colored text, colored border
function Label({ text, color }) {
  const colors = {
    blue:   { bg: 'rgba(31,111,235,0.15)', text: '#58a6ff', border: 'rgba(31,111,235,0.4)' },
    green:  { bg: 'rgba(35,134,54,0.15)',  text: '#3fb950', border: 'rgba(35,134,54,0.4)' },
    purple: { bg: 'rgba(137,87,229,0.15)', text: '#bc8cff', border: 'rgba(137,87,229,0.4)' },
    gray:   { bg: 'rgba(139,148,158,0.1)', text: '#8b949e', border: 'rgba(139,148,158,0.3)' },
    red:    { bg: 'rgba(218,54,51,0.15)',   text: '#f85149', border: 'rgba(218,54,51,0.4)' },
    cyan:   { bg: 'rgba(57,211,210,0.12)',  text: '#56d4dd', border: 'rgba(57,211,210,0.3)' },
  };
  const c = colors[color] || colors.gray;
  return (
    <span className="text-[12px] font-medium px-[7px] py-[2px] rounded-full leading-tight inline-block"
      style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {text}
    </span>
  );
}

export default function AllConfigs({ onNavigate, bearerToken, onTokenExpired, cachedConfigs = [], configsStale, configsLoaded, refreshConfigs, activeEnv = '', envError, previousEnv, onSwitchBack, envSwitching, setEnvError }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [search, setSearch] = usePersistedState('aC.search', '');
  const [tab, setTab] = usePersistedState('aC.tab', 'all');
  const [sortBy, setSortBy] = usePersistedState('aC.sortBy', 'newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [hasSummaryFilter, setHasSummaryFilter] = usePersistedState('aC.hasSummaryFilter', false);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [currentPage, setCurrentPage] = usePersistedState('aC.page', 1);
  const [pageSize, setPageSize] = usePersistedState('aC.pageSize', 25);

  const configs = cachedConfigs;

  async function handleRefresh() {
    if (!bearerToken) {
      setError('Set your API token in the sidebar first.');
      setIsAuthError(false);
      return;
    }
    setLoading(true);
    setError(null);
    setIsAuthError(false);
    try {
      await refreshConfigs();
    } catch (e) {
      if (e.name === 'AuthError') {
        setIsAuthError(true);
        setError('Authentication failed — API token is expired or invalid.');
      } else {
        // Escalate to global env error so the empty state shows consistently
        setEnvError?.(`Could not reach "${activeEnv}". The environment may not exist or its services are not running.`);
      }
    } finally {
      setLoading(false);
    }
  }

  // Clear local auth error when env changes
  useEffect(() => {
    setError(null);
    setIsAuthError(false);
  }, [activeEnv]);

  // Fetch only when cache is empty AND not during an env switch (App.jsx handles that fetch)
  useEffect(() => {
    if (bearerToken && !configsLoaded && !envError && !envSwitching) handleRefresh();
  }, [configsLoaded, bearerToken, envError, envSwitching]); // eslint-disable-line react-hooks/exhaustive-deps

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
      return (c.template_name?.toLowerCase().includes(q)) ||
        (c.summary_source_job_id?.toLowerCase().includes(q)) ||
        ((c.config?.app_summary || '').toLowerCase().includes(q));
    }
    return true;
  });

  // Sort
  const SORT_OPTIONS = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'recently-updated', label: 'Recently updated' },
    { key: 'name-asc', label: 'Name (A-Z)' },
    { key: 'name-desc', label: 'Name (Z-A)' },
    { key: 'env-vars', label: 'Most env vars' },
  ];

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

  // Pagination math
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filtered.length);
  const paginated = filtered.slice(startIdx, endIdx);

  // Clamp current page when filters shrink the result set
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  function getPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (current > 3) pages.push('…');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push('…');
    pages.push(total);
    return pages;
  }

  // If env is broken, show clean empty state
  if (envError) {
    return (
      <div>
        <div className="border border-[#30363d] rounded-md overflow-hidden">
          <div className="text-center py-20 px-6">
            <svg className="w-12 h-12 text-[#484f58] mx-auto mb-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
            </svg>
            <div className="text-[20px] font-semibold text-[#e6edf3] mb-2">
              Could not connect to <span className="font-mono">{activeEnv}</span>
            </div>
            <p className="text-[14px] text-[#8b949e] mb-6 max-w-md mx-auto">
              The environment may not exist or its services are not running. Check the environment name and try again.
            </p>
            <div className="flex items-center justify-center gap-3">
              {previousEnv && onSwitchBack && (
                <button onClick={onSwitchBack}
                  className="px-4 py-[6px] bg-[#238636] text-white text-[14px] font-medium rounded-md hover:bg-[#2ea043] border border-[#2ea043]/60 transition-colors">
                  Switch back to {previousEnv}
                </button>
              )}
              <button onClick={() => onNavigate('settings')}
                className="px-4 py-[6px] bg-[#21262d] border border-[#30363d] text-[14px] text-[#c9d1d9] rounded-md hover:bg-[#30363d] transition-colors">
                Go to Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Token warning */}
      {!bearerToken && (
        <Banner variant="warning" className="mb-4">
          Set your API token in the sidebar to load configs.
        </Banner>
      )}

      {/* Error banners */}
      {error && (
        <div className="mb-4 space-y-2">
          <Banner variant="critical" onDismiss={() => { setError(null); setIsAuthError(false); }}>
            {error}
          </Banner>
          {isAuthError && (
            <Banner variant="warning" onDismiss={() => setIsAuthError(false)}>
              Regenerate your token, enter a valid token for <strong className="text-white">{activeEnv}</strong>, or switch to the correct environment.
            </Banner>
          )}
        </div>
      )}

      {/* Search bar + filters — GitHub issues style */}
      <div className="flex items-center gap-2 mb-4">
        {/* Search input with integrated label filter */}
        <div className="flex-1 flex items-stretch border border-[#30363d] rounded-md overflow-hidden">
          <div className="flex items-center gap-2 flex-1 px-3 py-[6px] bg-[#0d1117]">
            <SearchIcon className="w-4 h-4 text-[#484f58] shrink-0" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search configs..."
              className="flex-1 bg-transparent text-[14px] text-[#e6edf3] outline-none placeholder:text-[#484f58]" />
          </div>
        </div>

        {/* Labels filter */}
        <div className="relative">
          <button onClick={e => { e.stopPropagation(); setShowLabelMenu(!showLabelMenu); setShowSortMenu(false); }}
            className={`flex items-center gap-1.5 px-3 py-[6px] bg-[#21262d] border border-[#30363d] rounded-md text-[14px] text-[#c9d1d9] hover:bg-[#30363d] hover:border-[#484f58] transition-colors ${hasSummaryFilter ? '!border-[#8957e5] !text-[#bc8cff]' : ''}`}>
            <TagIcon className="w-4 h-4" />
            Labels
            <ChevronDown className="w-4 h-4 text-[#484f58]" />
          </button>
          {showLabelMenu && (
            <div className="absolute right-0 top-10 z-20 w-[220px] bg-[#161b22] border border-[#30363d] rounded-md shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-3 py-2 text-[12px] font-semibold text-[#e6edf3] border-b border-[#21262d]">Filter by label</div>
              <button onClick={() => { setHasSummaryFilter(!hasSummaryFilter); setShowLabelMenu(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-[#c9d1d9] hover:bg-[#1f6feb]/10 transition-colors text-left">
                <div className={`w-[16px] h-[16px] rounded-[3px] flex items-center justify-center shrink-0 ${hasSummaryFilter ? 'bg-[#1f6feb]' : 'border border-[#484f58]'}`}>
                  {hasSummaryFilter && <svg className="w-3 h-3 text-white" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" /></svg>}
                </div>
                <Label text="has summary" color="purple" />
              </button>
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <button onClick={e => { e.stopPropagation(); setShowSortMenu(!showSortMenu); setShowLabelMenu(false); }}
            className="flex items-center gap-1.5 px-3 py-[6px] bg-[#21262d] border border-[#30363d] rounded-md text-[14px] text-[#c9d1d9] hover:bg-[#30363d] hover:border-[#484f58] transition-colors">
            Sort
            <ChevronDown className="w-4 h-4 text-[#484f58]" />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-10 z-20 w-[200px] bg-[#161b22] border border-[#30363d] rounded-md shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-3 py-2 text-[12px] font-semibold text-[#e6edf3] border-b border-[#21262d]">Sort by</div>
              {SORT_OPTIONS.map(opt => (
                <button key={opt.key} onClick={() => { setSortBy(opt.key); setShowSortMenu(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-[7px] text-[14px] transition-colors text-left ${
                    sortBy === opt.key ? 'text-[#e6edf3] font-medium' : 'text-[#8b949e] hover:bg-[#1f6feb]/10 hover:text-[#e6edf3]'
                  }`}>
                  <span className="w-4 text-center text-[#58a6ff]">{sortBy === opt.key ? '✓' : ''}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New config button */}
        <button onClick={() => onNavigate('config-create')}
          data-testid="new-config-btn"
          className="flex items-center gap-1.5 px-4 py-[6px] bg-[#238636] text-white text-[14px] font-medium rounded-md hover:bg-[#2ea043] border border-[#2ea043]/60 transition-colors shrink-0">
          New config
        </button>
      </div>

      {/* Active filter chips */}
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
            Clear all
          </button>
        </div>
      )}

      {/* Issues-style table */}
      <div className="border border-[#30363d] rounded-md overflow-hidden">
        {/* Tab header — matches GitHub "Open / Closed" bar */}
        <div className="flex items-center px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex items-center gap-4 flex-1">
            {[
              { key: 'all', label: 'All', count: allCount, icon: IssueOpenIcon },
              { key: 'internal', label: 'Internal', count: internalCount },
              { key: 'public', label: 'Public', count: publicCount },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 text-[14px] transition-colors ${
                  tab === t.key ? 'font-semibold text-[#e6edf3]' : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}>
                {t.icon && <t.icon className="w-4 h-4" />}
                {t.label}
                <span className={`text-[12px] px-[6px] py-[1px] rounded-full leading-tight ${
                  tab === t.key ? 'bg-[#e6edf3] text-[#0d1117] font-semibold' : 'bg-[#21262d] text-[#8b949e]'
                }`}>{t.count}</span>
              </button>
            ))}
          </div>
          {/* Refresh in header */}
          <button onClick={handleRefresh} disabled={loading}
            data-testid="refresh-configs-btn"
            title="Refresh configs"
            className="text-[14px] text-[#8b949e] hover:text-[#e6edf3] transition-colors disabled:opacity-50">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        </div>

        {/* Loading state — during own fetch or env switch */}
        {(loading || envSwitching) && configs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-5 h-5 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin mx-auto mb-3" />
            <div className="text-[14px] text-[#8b949e]">{envSwitching ? 'Switching environment...' : 'Loading configs...'}</div>
          </div>
        )}

        {/* Config rows — GitHub issue row style */}
        {!loading && paginated.map(config => {
          const envVarCount = Object.keys(config.default_env_config || {}).length;
          const preview = extractSummaryPreview(config.config);
          const hasSummary = !!config.config?.app_summary;

          return (
            <div key={config.id}
              data-testid={`config-row-${config.id}`}
              onClick={() => onNavigate('config-detail', config.id)}
              className="flex items-start px-4 py-2.5 border-b border-[#21262d] last:border-b-0 hover:bg-[#161b22] cursor-pointer transition-colors group">
              <div className="flex-1 min-w-0">
                {/* Title line + labels */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[16px] font-semibold text-[#e6edf3] group-hover:text-[#58a6ff] transition-colors leading-snug">
                    {config.template_name}
                  </span>
                  {config.internal && <Label text="internal" color="blue" />}
                  {config.public && <Label text="public" color="green" />}
                  {hasSummary && <Label text="has summary" color="purple" />}
                  {config.summary_source_job_id && <Label text={config.summary_source_job_id} color="gray" />}
                </div>

                {/* Summary preview */}
                {preview && (
                  <div className="text-[14px] text-[#8b949e] mt-0.5 truncate max-w-[700px] leading-snug">
                    {preview}
                  </div>
                )}

                {/* Meta line — matches GitHub "#1234 · opened 3 days ago" */}
                <div className="text-[12px] text-[#8b949e] mt-1 leading-snug">
                  <span>#{config.id}</span>
                  {config.created_at && <span> · created {timeAgo(config.created_at)}</span>}
                  {config.updated_at && config.created_at !== config.updated_at && (
                    <span> · updated {timeAgo(config.updated_at)}</span>
                  )}
                  <span> · {envVarCount} env var{envVarCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty states */}
        {!loading && configs.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16">
            <SearchIcon className="w-6 h-6 text-[#484f58] mx-auto mb-3" />
            <div className="text-[20px] font-semibold text-[#e6edf3] mb-1">No results matched your search.</div>
            <div className="text-[14px] text-[#8b949e]">Try a different search term or filter.</div>
          </div>
        )}

        {!loading && configs.length === 0 && !error && bearerToken && (
          <div className="text-center py-16">
            <DatabaseIcon className="w-6 h-6 text-[#484f58] mx-auto mb-3" />
            <div className="text-[20px] font-semibold text-[#e6edf3] mb-1">No configs yet.</div>
            <div className="text-[14px] text-[#8b949e]">Create your first category config to get started.</div>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[12px] text-[#8b949e]">
            Showing <span className="font-semibold text-[#e6edf3]">{startIdx + 1}–{endIdx}</span> of{' '}
            <span className="font-semibold text-[#e6edf3]">{filtered.length}</span>
            {filtered.length !== allCount && <span className="text-[#484f58]"> (filtered from {allCount})</span>}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(safePage - 1)}
                disabled={safePage === 1}
                className="px-3 py-[5px] text-[14px] text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] hover:border-[#484f58] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#21262d] disabled:hover:border-[#30363d] transition-colors">
                Previous
              </button>
              {getPageNumbers(safePage, totalPages).map((p, i) => p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-[14px] text-[#484f58] select-none">…</span>
              ) : (
                <button key={p} onClick={() => setCurrentPage(p)}
                  className={`min-w-[32px] px-2 py-[5px] text-[14px] rounded-md border transition-colors ${
                    p === safePage
                      ? 'bg-[#1f6feb] text-white border-[#1f6feb] font-semibold'
                      : 'bg-[#21262d] text-[#c9d1d9] border-[#30363d] hover:bg-[#30363d] hover:border-[#484f58]'
                  }`}>
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(safePage + 1)}
                disabled={safePage === totalPages}
                className="px-3 py-[5px] text-[14px] text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] hover:border-[#484f58] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#21262d] disabled:hover:border-[#30363d] transition-colors">
                Next
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#8b949e]">Per page</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] text-[12px] px-2 py-[3px] rounded-md hover:border-[#484f58] focus:border-[#1f6feb] focus:outline-none cursor-pointer">
              {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
