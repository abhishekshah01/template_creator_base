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
          <h2 className="text-lg font-medium">Category Configs</h2>
          <p className="text-xs text-slate-500 mt-0.5">{DUMMY_CONFIGS.length} configs total</p>
        </div>
        <button onClick={() => onNavigate('config-create')}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create New
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
          <SearchIcon className="w-4 h-4 text-slate-500 shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search configs by name..."
            className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600" />
        </div>
        <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
          {['all', 'internal', 'public'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-700 bg-slate-900/60">
          <div className="flex-1 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Name</div>
          <div className="w-[100px] text-[10px] text-slate-500 uppercase tracking-wider font-semibold text-center">Env Vars</div>
          <div className="w-[100px] text-[10px] text-slate-500 uppercase tracking-wider font-semibold text-center">Visibility</div>
          <div className="w-[100px] text-[10px] text-slate-500 uppercase tracking-wider font-semibold text-right">Updated</div>
          <div className="w-8" />
        </div>

        {/* Table Rows */}
        {filtered.map((config, idx) => (
          <div key={config.id}
            onClick={() => onNavigate('config-detail', config.id)}
            className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-700/50 last:border-b-0 hover:bg-slate-700/30 cursor-pointer transition-colors group">
            {/* Name + Summary */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-200 group-hover:text-blue-300 transition-colors truncate">
                {config.template_name}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">{config.summary}</div>
            </div>
            {/* Env Vars Count */}
            <div className="w-[100px] text-center">
              <span className="text-xs text-slate-400 font-mono">{config.env_vars} vars</span>
            </div>
            {/* Visibility Badges */}
            <div className="w-[100px] flex justify-center gap-1">
              {config.internal && (
                <span className="text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase bg-blue-500/15 text-blue-400 border-blue-500/30">
                  Int
                </span>
              )}
              {config.public && (
                <span className="text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                  Pub
                </span>
              )}
            </div>
            {/* Updated */}
            <div className="w-[100px] text-right">
              <span className="text-[11px] text-slate-500">{config.updated}</span>
            </div>
            {/* Actions */}
            <div className="w-8 flex justify-center relative">
              <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === idx ? null : idx); }}
                className="p-1 rounded hover:bg-slate-600 transition-colors text-slate-500 hover:text-slate-200">
                <MoreIcon className="w-4 h-4" />
              </button>
              {menuOpen === idx && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                  <div className="absolute right-0 top-8 z-20 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[120px]">
                    <button onClick={e => { e.stopPropagation(); setMenuOpen(null); onNavigate('config-detail', config.id); }}
                      className="w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 text-left transition-colors">
                      Edit
                    </button>
                    <button onClick={e => { e.stopPropagation(); setMenuOpen(null); }}
                      className="w-full px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 text-left transition-colors">
                      Duplicate
                    </button>
                    <button onClick={e => { e.stopPropagation(); setMenuOpen(null); }}
                      className="w-full px-3 py-1.5 text-xs text-red-400 hover:bg-slate-700 text-left transition-colors">
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-500">
            No configs match your search
          </div>
        )}
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="mt-3 text-[11px] text-slate-500 px-1">
          Showing {filtered.length} of {DUMMY_CONFIGS.length} configs
        </div>
      )}
    </>
  );
}
