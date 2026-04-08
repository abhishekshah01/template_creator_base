import { useState } from 'react';

const DUMMY_CONFIGS = [
  { id: 'cfg_001', template_name: 'lumina-stays-v1', env_vars: 5, internal: true, public: true, summary: 'Hospitality management system', updated: '2 hours ago' },
  { id: 'cfg_002', template_name: 'propnex_crm_prebuilt-v0', env_vars: 3, internal: true, public: false, summary: 'Real estate CRM platform', updated: '1 day ago' },
  { id: 'cfg_003', template_name: 'real-estate-v0', env_vars: 4, internal: true, public: false, summary: 'Property listing and search', updated: '3 days ago' },
  { id: 'cfg_004', template_name: 'lead-gen-v2', env_vars: 6, internal: false, public: true, summary: 'Lead generation automation', updated: '1 week ago' },
  { id: 'cfg_005', template_name: 'booking-engine-v1', env_vars: 8, internal: true, public: true, summary: 'Hotel booking and reservations', updated: '2 weeks ago' },
];

function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function MoreIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
    </svg>
  );
}

export default function AllConfigs({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [menuOpen, setMenuOpen] = useState(null);

  const filtered = DUMMY_CONFIGS.filter(c => {
    if (filter === 'internal' && !c.internal) return false;
    if (filter === 'public' && !c.public) return false;
    if (search && !c.template_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-medium text-gh-text">Category Configs</h2>
          <p className="text-xs text-gh-text-secondary mt-0.5">{DUMMY_CONFIGS.length} configs total</p>
        </div>
        <button onClick={() => onNavigate('config-create')}
          className="flex items-center gap-1.5 px-4 py-2 bg-gh-btn-primary text-white text-sm rounded-md hover:bg-gh-btn-primary-hover transition-colors font-medium">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create New
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-gh-canvas border border-gh-border rounded-md px-3 py-2">
          <SearchIcon className="w-4 h-4 text-gh-text-muted shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search configs by name..."
            className="flex-1 bg-transparent text-sm text-gh-text outline-none placeholder:text-gh-text-muted" />
        </div>
        <div className="flex gap-0.5 bg-gh-surface border border-gh-border rounded-md p-0.5">
          {['all', 'internal', 'public'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-gh-accent-blue text-white'
                  : 'text-gh-text-secondary hover:text-gh-text'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gh-surface border border-gh-border rounded-md overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gh-border bg-gh-canvas-subtle">
          <div className="flex-1 text-xs text-gh-text-secondary font-medium">Name</div>
          <div className="w-[80px] text-xs text-gh-text-secondary font-medium text-center">Env Vars</div>
          <div className="w-[100px] text-xs text-gh-text-secondary font-medium text-center">Visibility</div>
          <div className="w-[100px] text-xs text-gh-text-secondary font-medium text-right">Updated</div>
          <div className="w-8" />
        </div>

        {/* Table Rows */}
        {filtered.map((config, idx) => (
          <div key={config.id}
            onClick={() => onNavigate('config-detail', config.id)}
            className="flex items-center gap-3 px-4 py-3 border-b border-gh-border-muted last:border-b-0 hover:bg-gh-surface-hover cursor-pointer transition-colors group">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gh-text group-hover:text-gh-accent-blue-text transition-colors truncate">
                {config.template_name}
              </div>
              <div className="text-[11px] text-gh-text-muted truncate mt-0.5">{config.summary}</div>
            </div>
            <div className="w-[80px] text-center">
              <span className="text-xs text-gh-text-secondary font-mono">{config.env_vars}</span>
            </div>
            <div className="w-[100px] flex justify-center gap-1">
              {config.internal && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-gh-accent-blue/15 text-gh-accent-blue-text border-gh-accent-blue/30">
                  Internal
                </span>
              )}
              {config.public && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium bg-gh-accent-green/15 text-gh-accent-green-text border-gh-accent-green/30">
                  Public
                </span>
              )}
            </div>
            <div className="w-[100px] text-right">
              <span className="text-[11px] text-gh-text-muted">{config.updated}</span>
            </div>
            <div className="w-8 flex justify-center relative">
              <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === idx ? null : idx); }}
                className="p-1 rounded hover:bg-gh-overlay transition-colors text-gh-text-muted hover:text-gh-text">
                <MoreIcon className="w-4 h-4" />
              </button>
              {menuOpen === idx && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                  <div className="absolute right-0 top-8 z-20 bg-gh-overlay border border-gh-border rounded-md shadow-xl py-1 min-w-[130px]">
                    <button onClick={e => { e.stopPropagation(); setMenuOpen(null); onNavigate('config-detail', config.id); }}
                      className="w-full px-3 py-1.5 text-xs text-gh-text-secondary hover:bg-gh-accent-blue hover:text-white text-left transition-colors">
                      Edit
                    </button>
                    <button onClick={e => { e.stopPropagation(); setMenuOpen(null); }}
                      className="w-full px-3 py-1.5 text-xs text-gh-text-secondary hover:bg-gh-accent-blue hover:text-white text-left transition-colors">
                      Duplicate
                    </button>
                    <hr className="border-gh-border my-1" />
                    <button onClick={e => { e.stopPropagation(); setMenuOpen(null); }}
                      className="w-full px-3 py-1.5 text-xs text-gh-accent-red-text hover:bg-gh-accent-red hover:text-white text-left transition-colors">
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-gh-text-muted">
            No configs match your search
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="mt-3 text-[11px] text-gh-text-muted px-1">
          Showing {filtered.length} of {DUMMY_CONFIGS.length} configs
        </div>
      )}
    </>
  );
}
