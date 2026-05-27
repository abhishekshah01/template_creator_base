import { useState, useEffect } from 'react';
import { usePersistedState } from '../../hooks/usePersistedState';
import { api, AuthError } from '../../api';
import Banner from '../Banner';

// --- Icons (GitHub Octicons 16px) ---
function SearchIcon({ className }) {
  return <svg className={className} viewBox="0 0 16 16" fill="currentColor"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" /></svg>;
}
function ListUnorderedIcon({ className }) {
  return <svg className={className} viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 3.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm0 4.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM1.75 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5.75 4a.75.75 0 0 1 .75-.75h7.75a.75.75 0 0 1 0 1.5H6.5A.75.75 0 0 1 5.75 4Zm0 4.5a.75.75 0 0 1 .75-.75h7.75a.75.75 0 0 1 0 1.5H6.5a.75.75 0 0 1-.75-.75Zm0 4.5a.75.75 0 0 1 .75-.75h7.75a.75.75 0 0 1 0 1.5H6.5a.75.75 0 0 1-.75-.75Z" /></svg>;
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

// Pulsing placeholder row, sized to match a real config row so loading
// doesn't shift layout when the data arrives.
function SkeletonRow({ widths }) {
  // widths is destructured per-row so each skeleton looks different — uniform
  // widths look obviously fake, varied widths feel more like real content.
  const { title, label1, label2, label3, summary, meta } = widths;
  return (
    <div className="flex items-start px-4 py-2.5 border-b border-[#21262d] last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-[18px] bg-[#21262d] rounded animate-pulse" style={{ width: title }} />
          {label1 && <div className="h-[18px] bg-[#21262d] rounded-full animate-pulse" style={{ width: label1 }} />}
          {label2 && <div className="h-[18px] bg-[#21262d] rounded-full animate-pulse" style={{ width: label2 }} />}
          {label3 && <div className="h-[18px] bg-[#21262d] rounded-full animate-pulse" style={{ width: label3 }} />}
        </div>
        {summary && <div className="h-[14px] bg-[#21262d] rounded animate-pulse mb-1.5" style={{ width: summary }} />}
        <div className="h-[12px] bg-[#21262d] rounded animate-pulse" style={{ width: meta }} />
      </div>
    </div>
  );
}

const SKELETON_ROWS = [
  { title: 180, label1: 56,  label2: 80,  label3: null, summary: 420, meta: 240 },
  { title: 140, label1: 56,  label2: null, label3: null, summary: 380, meta: 200 },
  { title: 220, label1: 56,  label2: 70,  label3: 90,   summary: 480, meta: 280 },
  { title: 160, label1: 70,  label2: null, label3: null, summary: 320, meta: 220 },
  { title: 200, label1: 56,  label2: 80,  label3: null, summary: 440, meta: 260 },
  { title: 130, label1: null, label2: null, label3: null, summary: 360, meta: 180 },
];

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

export default function AllConfigs({ onNavigate, bearerToken, onTokenExpired, activeEnv = '', envError, previousEnv, onSwitchBack, envSwitching, setEnvError }) {
  const [templates, setTemplates] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [search, setSearch] = usePersistedState('aC.search', '');
  const [sortBy, setSortBy] = usePersistedState('aC.sortBy', 'default');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentPage, setCurrentPage] = usePersistedState('aC.page', 1);
  const [pageSize, setPageSize] = usePersistedState('aC.pageSize', 20);

  const configs = templates;

  async function handleRefresh(page = currentPage) {
    if (!bearerToken) {
      setError('Set your API token in the sidebar first.');
      setIsAuthError(false);
      return;
    }
    setLoading(true);
    setError(null);
    setIsAuthError(false);
    try {
      const data = await api.getTemplateSection({ page, pageSize, bearerToken });
      const list = Array.isArray(data?.templates) ? data.templates : [];
      setTemplates(list);
      const pg = data?.pagination || {};
      setTotal(typeof pg.total === 'number' ? pg.total : list.length);
      setTotalPages(typeof pg.totalPages === 'number' ? pg.totalPages : 1);
    } catch (e) {
      if (e instanceof AuthError || e.name === 'AuthError') {
        setIsAuthError(true);
        setError('Authentication failed — API token is expired or invalid.');
        onTokenExpired?.();
      } else {
        setEnvError?.(`Could not reach "${activeEnv}". The environment may not exist or its services are not running.`);
      }
    } finally {
      setLoading(false);
    }
  }

  // Clear local auth error when env changes; reset to page 1
  useEffect(() => {
    setError(null);
    setIsAuthError(false);
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEnv]);

  // Fetch on page/pageSize/env/token change (skip during env switch)
  useEffect(() => {
    if (bearerToken && !envError && !envSwitching) handleRefresh(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, bearerToken, activeEnv, envError, envSwitching]);

  // Close menus on outside click
  useEffect(() => {
    function handleClick() { setShowSortMenu(false); }
    if (showSortMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showSortMenu]);

  // Filter (client-side, current page only)
  let filtered = configs.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.name?.toLowerCase().includes(q)) ||
      (c.slug?.toLowerCase().includes(q)) ||
      (c.description?.toLowerCase().includes(q)) ||
      (c.categoryLabel?.toLowerCase().includes(q));
  });

  // Sort
  const SORT_OPTIONS = [
    { key: 'default', label: 'Default order' },
    { key: 'name-asc', label: 'Name (A-Z)' },
    { key: 'name-desc', label: 'Name (Z-A)' },
    { key: 'category', label: 'Category' },
  ];

  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc': return (a.name || a.slug || '').localeCompare(b.name || b.slug || '');
      case 'name-desc': return (b.name || b.slug || '').localeCompare(a.name || a.slug || '');
      case 'category': return (a.category || '').localeCompare(b.category || '');
      default: return 0;
    }
  });

  // Server-side pagination: render the current page's items (filtered/sorted client-side).
  // Numbered pagination removed — we don't have a total from the API yet.
  const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
  const paginated = filtered;

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
        <div className="flex-1 flex items-stretch border border-[#30363d] rounded-md overflow-hidden transition-colors focus-within:border-[#1f6feb] focus-within:ring-1 focus-within:ring-[#1f6feb]/40">
          <div className="flex items-center gap-2 flex-1 px-3 py-[6px] bg-[#0d1117]">
            <SearchIcon className="w-4 h-4 text-[#484f58] shrink-0" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search configs..."
              className="flex-1 bg-transparent text-[14px] text-[#e6edf3] outline-none placeholder:text-[#484f58]" />
          </div>
        </div>

        {/* Sort */}
        <div className="relative">
          <button onClick={e => { e.stopPropagation(); setShowSortMenu(!showSortMenu); }}
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
      {(search || sortBy !== 'default') && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {search && (
            <span className="inline-flex items-center gap-1 text-[12px] px-2 py-[2px] rounded-full bg-[#1f6feb]/10 text-[#58a6ff] border border-[#1f6feb]/25">
              Search: "{search}"
              <button onClick={() => setSearch('')} className="hover:text-white ml-0.5">×</button>
            </span>
          )}
          {sortBy !== 'default' && (
            <span className="inline-flex items-center gap-1 text-[12px] px-2 py-[2px] rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]">
              Sort: {SORT_OPTIONS.find(o => o.key === sortBy)?.label}
              <button onClick={() => setSortBy('default')} className="hover:text-white ml-0.5">×</button>
            </span>
          )}
          <button onClick={() => { setSearch(''); setSortBy('default'); }}
            className="text-[12px] text-[#58a6ff] hover:underline">
            Clear all
          </button>
        </div>
      )}

      {/* Issues-style table */}
      <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#010409]">
        {/* Header bar — total count + refresh */}
        <div className="flex items-center px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex items-center gap-2 flex-1">
            <ListUnorderedIcon className="w-4 h-4 text-[#8b949e]" />
            <span className="text-[14px] font-semibold text-[#e6edf3]">All Templates</span>
            <span className="text-[12px] px-[6px] py-[1px] rounded-full bg-[#21262d] text-[#8b949e] leading-tight">{total}</span>
          </div>
          <button onClick={() => handleRefresh()} disabled={loading}
            data-testid="refresh-configs-btn"
            title="Refresh"
            className="text-[14px] text-[#8b949e] hover:text-[#e6edf3] transition-colors disabled:opacity-50">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        </div>

        {/* Loading state — skeleton rows match real layout so transition is seamless.
            Shown for both initial load AND refresh-click (regardless of cached data),
            and stays visible until `loading` flips to false — prevents the brief blank
            gap where parent had updated cachedConfigs but our own `loading` wasn't
            cleared yet. */}
        {(loading || envSwitching) && (
          <>
            {SKELETON_ROWS.map((widths, i) => <SkeletonRow key={i} widths={widths} />)}
          </>
        )}

        {/* Template rows — GitHub issue row style */}
        {!loading && !envSwitching && paginated.map(t => {
          const displayName = t.name || t.slug || 'Untitled';
          const desc = t.description || '';
          const featureCount = t.features?.length || 0;
          const pageCount = t.pages?.length || 0;
          return (
            <div key={t.id}
              data-testid={`config-row-${t.id}`}
              className="flex items-start gap-3 px-4 py-2.5 border-b border-[#21262d] last:border-b-0">
              {/* Thumbnail */}
              {t.heroImage ? (
                <img src={t.heroImage} alt="" loading="lazy"
                  className="w-12 h-12 rounded-md object-cover bg-[#0d1117] shrink-0 mt-0.5 border border-[#21262d]" />
              ) : (
                <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[#161b22] to-[#0d1117] shrink-0 mt-0.5 border border-[#21262d]" />
              )}

              <div className="flex-1 min-w-0">
                {/* Title + labels */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => onNavigate('config-detail', t.id)}
                    className="text-[15px] font-semibold text-[#e6edf3] hover:text-[#58a6ff] hover:underline transition-colors leading-snug text-left">
                    {displayName}
                  </button>
                  {t.categoryLabel && <Label text={t.categoryLabel} color="blue" />}
                  {t.category && !t.categoryLabel && <Label text={t.category} color="gray" />}
                </div>

                {/* Description */}
                {desc && (
                  <div className="text-[13px] text-[#8b949e] mt-0.5 truncate max-w-[700px] leading-snug">
                    {desc}
                  </div>
                )}

                {/* Meta line */}
                <div className="text-[12px] text-[#8b949e] mt-1 leading-snug truncate">
                  <span className="font-mono">{t.slug || `#${t.id?.slice(0, 8)}`}</span>
                  {featureCount > 0 && <span> · {featureCount} feature{featureCount !== 1 ? 's' : ''}</span>}
                  {pageCount > 0 && <span> · {pageCount} page{pageCount !== 1 ? 's' : ''}</span>}
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty states */}
        {!loading && !envSwitching && configs.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16">
            <SearchIcon className="w-6 h-6 text-[#484f58] mx-auto mb-3" />
            <div className="text-[20px] font-semibold text-[#e6edf3] mb-1">No results matched your search.</div>
            <div className="text-[14px] text-[#8b949e]">Try a different search term or clear the filter.</div>
          </div>
        )}

        {!loading && !envSwitching && configs.length === 0 && !error && bearerToken && (
          <div className="text-center py-16">
            <DatabaseIcon className="w-6 h-6 text-[#484f58] mx-auto mb-3" />
            <div className="text-[20px] font-semibold text-[#e6edf3] mb-1">No templates yet.</div>
            <div className="text-[14px] text-[#8b949e]">Create your first template to get started.</div>
          </div>
        )}
      </div>

      {!loading && templates.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[12px] text-[#8b949e]">
            {(() => {
              const start = (currentPage - 1) * pageSize + 1;
              const end = Math.min(currentPage * pageSize, total);
              return (
                <>
                  Showing <span className="font-semibold text-[#e6edf3]">{start}–{end}</span>{' '}
                  of <span className="font-semibold text-[#e6edf3]">{total}</span>
                  {filtered.length !== templates.length && (
                    <span className="text-[#484f58]"> (filtered to {filtered.length} on this page)</span>
                  )}
                </>
              );
            })()}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-[5px] text-[14px] text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] hover:border-[#484f58] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#21262d] disabled:hover:border-[#30363d] transition-colors">
              Previous
            </button>
            {(() => {
              const pages = [];
              const max = totalPages;
              const cur = currentPage;
              if (max <= 7) {
                for (let p = 1; p <= max; p++) pages.push(p);
              } else {
                pages.push(1);
                if (cur > 3) pages.push('…');
                for (let p = Math.max(2, cur - 1); p <= Math.min(max - 1, cur + 1); p++) pages.push(p);
                if (cur < max - 2) pages.push('…');
                pages.push(max);
              }
              return pages.map((p, i) => p === '…' ? (
                <span key={`e-${i}`} className="px-2 text-[14px] text-[#484f58] select-none">…</span>
              ) : (
                <button key={p} onClick={() => setCurrentPage(p)}
                  className={`min-w-[32px] px-2 py-[5px] text-[14px] rounded-md border transition-colors ${
                    p === currentPage
                      ? 'bg-[#1f6feb] text-white border-[#1f6feb] font-semibold'
                      : 'bg-[#21262d] text-[#c9d1d9] border-[#30363d] hover:bg-[#30363d] hover:border-[#484f58]'
                  }`}>
                  {p}
                </button>
              ));
            })()}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-[5px] text-[14px] text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] hover:border-[#484f58] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#21262d] disabled:hover:border-[#30363d] transition-colors">
              Next
            </button>
          </div>

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
