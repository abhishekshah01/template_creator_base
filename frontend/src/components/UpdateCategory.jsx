import { useState, useRef, useEffect, useCallback } from 'react';
import { api, AuthError } from '../api';
import { CheckCircle } from './Icons';

// --- Source tab icons ---
function CloudDownload({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
    </svg>
  );
}
function Upload({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function Code({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
function Plus({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function Search({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function Trash({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

const SOURCE_TABS = [
  { id: 'fetch', label: 'Fetch from Pod', icon: CloudDownload },
  { id: 'upload', label: 'Upload JSON', icon: Upload },
  { id: 'paste', label: 'Paste JSON', icon: Code },
];

const SOURCE_BADGE = {
  envcore: { label: 'ENVCORE', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  json: { label: 'JSON', cls: 'bg-purple-500/15 text-purple-400 border-purple-500/25' },
  manual: { label: 'MANUAL', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  modified: { label: 'MODIFIED', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
};

export default function UpdateCategory({ bearerToken, onTokenExpired }) {
  const [jobId, setJobId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [internal, setInternal] = useState(true);
  const [isPublic, setIsPublic] = useState(false);

  // Each entry: { key, value, originalValue, source, selected }
  const [variables, setVariables] = useState([]);
  const [activeTab, setActiveTab] = useState('fetch');
  const [filter, setFilter] = useState('');

  // Paste JSON state
  const [pasteJson, setPasteJson] = useState('');
  const [pasteError, setPasteError] = useState('');
  const pasteRef = useRef(null);

  // Upload JSON state
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState('');
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  const listRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const el = listRef.current;
    if (!el || variables.length === 0) return;
    const check = () => setShowScrollHint(el.scrollHeight > el.clientHeight && el.scrollTop + el.clientHeight < el.scrollHeight - 10);
    check();
    el.addEventListener('scroll', check);
    return () => el.removeEventListener('scroll', check);
  }, [variables]);

  // --- Merge variables helper (dedupes by key, new values overwrite) ---
  function mergeVariables(existing, incoming, source) {
    const map = new Map(existing.map(v => [v.key, v]));
    for (const [key, value] of Object.entries(incoming)) {
      map.set(key, { key, value, originalValue: value, source, selected: true });
    }
    return [...map.values()];
  }

  // --- Tab: Fetch from Pod ---
  async function fetchEnvVars() {
    if (!jobId.trim()) { setStatus({ message: 'Please enter a Job ID', type: 'error' }); return; }
    setLoading('fetch');
    setStatus({ message: 'Fetching env variables from pod...', type: 'loading' });
    try {
      const data = await api.getEnvVariables(jobId);
      const fetched = data.env_variables || {};
      setVariables(prev => mergeVariables(prev, fetched, 'envcore'));
      const count = Object.keys(fetched).length;
      setStatus({ message: `Fetched ${count} variable(s) from pod`, type: 'success' });
    } catch (e) {
      setStatus({ message: e.message, type: 'error' });
    } finally {
      setLoading('');
    }
  }

  // --- Tab: Paste JSON ---
  function parsePasteJson() {
    setPasteError('');
    try {
      const parsed = JSON.parse(pasteJson);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setPasteError('JSON must be a flat object of key-value pairs');
        return;
      }
      const flat = {};
      for (const [k, v] of Object.entries(parsed)) {
        flat[k] = String(v);
      }
      setVariables(prev => mergeVariables(prev, flat, 'json'));
      setStatus({ message: `Loaded ${Object.keys(flat).length} variable(s) from JSON`, type: 'success' });
      setPasteJson('');
    } catch (e) {
      setPasteError(`Invalid JSON: ${e.message}`);
    }
  }

  // --- Tab: Upload JSON ---
  function handleFileUpload(file) {
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setStatus({ message: 'Please upload a .json file', type: 'error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (typeof parsed !== 'object' || Array.isArray(parsed)) {
          setStatus({ message: 'JSON must be a flat object of key-value pairs', type: 'error' });
          return;
        }
        const flat = {};
        for (const [k, v] of Object.entries(parsed)) {
          flat[k] = String(v);
        }
        setVariables(prev => mergeVariables(prev, flat, 'json'));
        setStatus({ message: `Loaded ${Object.keys(flat).length} variable(s) from ${file.name}`, type: 'success' });
      } catch {
        setStatus({ message: 'Failed to parse JSON file', type: 'error' });
      }
    };
    reader.readAsText(file);
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    handleFileUpload(file);
  }, []);

  // --- Variable table actions ---
  function toggleVar(idx) {
    setVariables(prev => prev.map((v, i) => i === idx ? { ...v, selected: !v.selected } : v));
  }

  function updateValue(idx, value) {
    setVariables(prev => prev.map((v, i) => {
      if (i !== idx) return v;
      const source = value !== v.originalValue ? 'modified' : v.source === 'modified' ? 'envcore' : v.source;
      return { ...v, value, source: value !== v.originalValue ? 'modified' : (v.originalValue === v.value ? v.source : 'modified') };
    }));
  }

  function updateKey(idx, key) {
    setVariables(prev => prev.map((v, i) => i === idx ? { ...v, key } : v));
  }

  function selectAll(checked) {
    setVariables(prev => prev.map(v => ({ ...v, selected: checked })));
  }

  function deleteSelected() {
    const count = variables.filter(v => v.selected).length;
    if (count === 0) return;
    if (!confirm(`Delete ${count} selected variable(s)?`)) return;
    setVariables(prev => prev.filter(v => !v.selected));
  }

  function addVariable() {
    setVariables(prev => [...prev, { key: '', value: '', originalValue: '', source: 'manual', selected: true }]);
    // Scroll to bottom after render
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50);
  }

  // --- Filter ---
  const filtered = filter
    ? variables.filter(v => v.key.toLowerCase().includes(filter.toLowerCase()))
    : variables;

  const selectedCount = variables.filter(v => v.selected).length;

  // --- Submit ---
  async function submitConfig() {
    if (!templateName.trim()) { setStatus({ message: 'Please enter a Template Name', type: 'error' }); return; }
    if (!bearerToken) { setStatus({ message: 'Please set your API token in the sidebar first.', type: 'error' }); return; }
    if (!jobId.trim()) { setStatus({ message: 'Please enter a Job ID', type: 'error' }); return; }

    const defaultEnvConfig = {};
    for (const v of variables) {
      if (v.selected && v.key.trim()) {
        defaultEnvConfig[v.key] = v.value;
      }
    }

    setLoading('submit');
    setStatus({ message: 'Creating category config...', type: 'loading' });
    setResult(null);
    try {
      const data = await api.createCategoryConfig({
        template_name: templateName,
        default_env_config: defaultEnvConfig,
        summary_source_job_id: jobId,
        internal,
        public: isPublic,
        bearer_token: bearerToken,
      });
      setResult(data.response);
      setStatus({ message: 'Category config created successfully!', type: 'success' });
    } catch (e) {
      if (e instanceof AuthError) onTokenExpired();
      setStatus({ message: e.message, type: 'error' });
    } finally {
      setLoading('');
    }
  }

  // --- Line numbers for paste editor ---
  const lineCount = Math.max((pasteJson || '').split('\n').length, 1);

  return (
    <>
      <h2 className="text-lg font-medium mb-5">Update Category Config</h2>

      {/* Job ID & Template Name */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-3">
        <h3 className="text-sm font-medium mb-3">Job & Template Details</h3>

        {!bearerToken && (
          <div className="mb-3 px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2 border bg-amber-950/50 text-amber-300 border-amber-900/50">
            Set your API token in the sidebar before submitting.
          </div>
        )}

        <div className="flex gap-3 mb-3">
          <div className="flex-[2]">
            <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1 font-medium">Job ID</label>
            <input type="text" value={jobId} onChange={e => setJobId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchEnvVars()}
              placeholder="e.g. 54ae01c4-d111-447a-baa4-c35854d2c5f1"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500 placeholder:text-slate-600" />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1 font-medium">Template Name</label>
            <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
              placeholder="e.g. lead-gen-v2"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500 placeholder:text-slate-600" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700">
          <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-2.5 font-medium">Visibility</label>
          <div className="flex flex-col gap-2">
            <div onClick={() => setInternal(!internal)}
              className={`flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg cursor-pointer transition-all border ${
                internal
                  ? 'bg-blue-950/40 border-blue-500/30'
                  : 'bg-slate-900 border-slate-700 hover:border-slate-600'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
                  internal ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <div>
                  <div className={`text-sm font-medium transition-colors ${internal ? 'text-blue-200' : 'text-slate-300'}`}>Internal</div>
                  <div className="text-[11px] text-slate-500">Only visible to internal team members</div>
                </div>
              </div>
              <button type="button"
                className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 ${internal ? 'bg-blue-600' : 'bg-slate-600'}`}>
                <span className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${internal ? 'translate-x-[18px]' : 'translate-x-0'}`} />
              </button>
            </div>
            <div onClick={() => setIsPublic(!isPublic)}
              className={`flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg cursor-pointer transition-all border ${
                isPublic
                  ? 'bg-emerald-950/40 border-emerald-500/30'
                  : 'bg-slate-900 border-slate-700 hover:border-slate-600'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${
                  isPublic ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <div>
                  <div className={`text-sm font-medium transition-colors ${isPublic ? 'text-emerald-200' : 'text-slate-300'}`}>Public</div>
                  <div className="text-[11px] text-slate-500">Accessible to all platform users</div>
                </div>
              </div>
              <button type="button"
                className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 ${isPublic ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                <span className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${isPublic ? 'translate-x-[18px]' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Env Config Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-3">
        <h3 className="text-sm font-medium mb-1">Default Env Config</h3>
        <p className="text-xs text-slate-500 mb-4">
          Add environment variables from any source. They merge into a unified list below.
        </p>

        {/* Three-tab source selector */}
        <div className="flex border border-slate-700 rounded-lg overflow-hidden mb-4">
          {SOURCE_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-blue-300 border-blue-500'
                  : 'bg-slate-850 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/50'
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content: Fetch from Pod */}
        {activeTab === 'fetch' && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4">
            <p className="text-xs text-slate-500 mb-3">Enter a Job ID above, then fetch env variables directly from the running pod.</p>
            <button onClick={fetchEnvVars} disabled={loading === 'fetch'}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {loading === 'fetch' && <div className="w-3.5 h-3.5 border-2 border-blue-300/30 border-t-white rounded-full animate-spin" />}
              {loading === 'fetch' ? 'Fetching...' : 'Fetch Env Variables'}
            </button>
          </div>
        )}

        {/* Tab content: Upload JSON */}
        {activeTab === 'upload' && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`bg-slate-900 border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer transition-all ${
              dragOver ? 'border-blue-500 bg-blue-950/20' : 'border-slate-700 hover:border-slate-500'
            }`}>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden"
              onChange={e => { handleFileUpload(e.target.files[0]); e.target.value = ''; }} />
            <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? 'text-blue-400' : 'text-slate-500'}`} />
            <div className="text-sm text-slate-300 mb-1">
              {dragOver ? 'Drop your JSON file here' : 'Drag & drop a JSON file'}
            </div>
            <div className="text-[11px] text-slate-500">or click to browse</div>
            <div className="text-[10px] text-slate-600 mt-2">Accepts .json files with flat key-value objects</div>
          </div>
        )}

        {/* Tab content: Paste JSON */}
        {activeTab === 'paste' && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden mb-4">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-900">
              <span className="text-[11px] text-slate-500 font-medium">JSON</span>
              <span className="text-[10px] text-slate-600">{pasteJson.length > 0 ? `${pasteJson.split('\n').length} lines` : 'empty'}</span>
            </div>
            <div className="flex">
              {/* Line numbers */}
              <div className="select-none text-right pr-3 pl-3 py-3 text-[11px] font-mono text-slate-600 leading-[20px] bg-slate-950/50 border-r border-slate-800">
                {Array.from({ length: lineCount }, (_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              {/* Editor */}
              <textarea
                ref={pasteRef}
                value={pasteJson}
                onChange={e => { setPasteJson(e.target.value); setPasteError(''); }}
                placeholder={'{\n  "MONGO_URL": "mongodb://localhost:27017",\n  "DB_NAME": "my_database"\n}'}
                spellCheck={false}
                className="flex-1 bg-slate-950 text-slate-200 text-xs font-mono p-3 leading-[20px] outline-none resize-y min-h-[200px] placeholder:text-slate-700"
              />
            </div>
            {pasteError && (
              <div className="px-3 py-2 bg-red-950/50 border-t border-red-900/50 text-xs text-red-400">
                {pasteError}
              </div>
            )}
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-slate-700">
              <button onClick={() => { setPasteJson(''); setPasteError(''); }}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
                Clear
              </button>
              <button onClick={parsePasteJson} disabled={!pasteJson.trim()}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                Parse & Load
              </button>
            </div>
          </div>
        )}

        {/* Unified Variable Table */}
        {variables.length > 0 && (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[11px] bg-blue-500/15 text-blue-300 border border-blue-500/25 px-2 py-0.5 rounded-md font-medium">
                {selectedCount} selected
              </span>
              <button onClick={() => selectAll(true)}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors">Select All</button>
              <button onClick={() => selectAll(false)}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors">Deselect All</button>
              {selectedCount > 0 && (
                <button onClick={deleteSelected}
                  className="text-[11px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                  <Trash className="w-3 h-3" /> Bulk Delete
                </button>
              )}
              <div className="ml-auto flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5">
                <Search className="w-3 h-3 text-slate-500" />
                <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
                  placeholder="Filter variables..."
                  className="bg-transparent text-[11px] text-slate-200 outline-none placeholder:text-slate-600 w-28" />
              </div>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-3 px-3.5 py-2 text-[10px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-700">
              <div className="w-4" />
              <div className="w-[180px] shrink-0">Variable Key</div>
              <div className="flex-1">Configuration Value</div>
              <div className="w-[70px] text-right">Source</div>
            </div>

            {/* Rows */}
            <div ref={listRef} className="max-h-[380px] overflow-y-auto border border-slate-700 rounded-b-lg border-t-0">
              {filtered.map((v, idx) => {
                const realIdx = variables.indexOf(v);
                const badge = SOURCE_BADGE[v.source] || SOURCE_BADGE.manual;
                return (
                  <div key={realIdx}
                    className={`flex items-center gap-3 px-3.5 py-2.5 border-b border-slate-800 last:border-b-0 transition-colors group ${
                      v.selected ? 'bg-slate-850 hover:bg-slate-800/80' : 'hover:bg-slate-800/40'
                    }`}>
                    <input type="checkbox" checked={v.selected} onChange={() => toggleVar(realIdx)}
                      className="w-4 h-4 accent-blue-600 shrink-0 cursor-pointer" />
                    <div className="w-[180px] shrink-0">
                      {v.source === 'manual' && v.originalValue === '' ? (
                        <input type="text" value={v.key} onChange={e => updateKey(realIdx, e.target.value)}
                          placeholder="KEY_NAME"
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-blue-300 outline-none focus:border-blue-500 font-mono placeholder:text-slate-600" />
                      ) : (
                        <span className={`text-xs font-mono ${v.selected ? 'text-blue-300' : 'text-slate-400'}`}>{v.key}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <input type="text" value={v.value}
                        onChange={e => updateValue(realIdx, e.target.value)}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-slate-300 outline-none focus:border-blue-500 font-mono" />
                    </div>
                    <div className="w-[70px] flex justify-end">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-xs text-slate-500 text-center py-6">
                  {filter ? 'No variables match your filter' : 'No variables added yet'}
                </div>
              )}
            </div>
            {showScrollHint && <p className="text-center text-[11px] text-slate-500 py-1.5">Scroll to see all {variables.length} variables</p>}

            {/* Bottom action bar */}
            <div className="flex items-center justify-between mt-3">
              <button onClick={addVariable}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/15 border border-blue-500/25 text-blue-300 text-xs rounded-lg hover:bg-blue-600/25 transition-colors font-medium">
                <Plus className="w-3.5 h-3.5" /> New Variable
              </button>
              <span className="text-[11px] text-slate-500">{variables.length} total &middot; {selectedCount} will be included</span>
            </div>
          </>
        )}

        {variables.length === 0 && (
          <div className="text-center py-6 text-xs text-slate-500">
            No variables loaded yet. Use one of the tabs above to add env variables.
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-3">
        <button onClick={submitConfig} disabled={loading === 'submit'}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
          {loading === 'submit' && <div className="w-3.5 h-3.5 border-2 border-green-300/30 border-t-white rounded-full animate-spin" />}
          {loading === 'submit' ? 'Creating...' : 'Create Category Config'}
        </button>

        {status && (
          <div className={`mt-3 px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2 border ${
            { info: 'bg-blue-950 text-blue-300 border-blue-900',
              success: 'bg-green-950 text-green-300 border-green-900',
              error: 'bg-red-950/50 text-red-300 border-red-900/50',
              loading: 'bg-slate-800 text-slate-400 border-slate-700',
            }[status.type] || ''}`}>
            {status.type === 'loading' && (
              <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-blue-300 rounded-full animate-spin shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        {result && (
          <div className="mt-4 p-3.5 bg-green-950 border border-green-900 rounded-lg">
            <div className="text-sm text-green-300 font-medium flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" /> Category config created!
            </div>
            <pre className="text-xs text-green-400 bg-slate-950 px-3.5 py-2.5 rounded-md overflow-x-auto font-mono whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}
