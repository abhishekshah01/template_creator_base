import { useState, useRef } from 'react';
import { api, AuthError } from '../api';
import { usePersistedState, SET_OPTS } from '../hooks/usePersistedState';
import { CheckCircle } from './Icons';

export default function UpdateCategory({ bearerToken, onTokenExpired }) {
  const [jobId, setJobId] = usePersistedState('uC.jobId', '');
  const [templateName, setTemplateName] = usePersistedState('uC.templateName', '');
  const [internal, setInternal] = usePersistedState('uC.internal', true);
  const [isPublic, setIsPublic] = usePersistedState('uC.isPublic', false);

  // Each entry: { key, value, originalValue, source }
  // source: 'envcore' | 'modified' | 'manual'
  const [variables, setVariables] = usePersistedState('uC.variables', []);
  const [selected, setSelected] = usePersistedState('uC.selected', new Set(), SET_OPTS);
  const [filter, setFilter] = usePersistedState('uC.filter', '');

  const [loading, setLoading] = useState('');
  const [fetchStatus, setFetchStatus] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [result, setResult] = usePersistedState('uC.result', null);

  const listRef = useRef(null);

  async function fetchEnvVars() {
    if (!jobId.trim()) { setFetchStatus({ message: 'Please enter a Job ID', type: 'error' }); return; }

    setLoading('fetch');
    setFetchStatus({ message: 'Fetching env variables from pod...', type: 'loading' });
    try {
      const data = await api.getEnvVariables(jobId);
      const fetched = data.env_variables || {};
      const vars = Object.entries(fetched).map(([key, value]) => ({
        key, value, originalValue: value, source: 'envcore',
      }));
      setVariables(vars);
      setSelected(new Set());
      setFetchStatus({ message: `Found ${vars.length} env variable(s)`, type: 'success' });
    } catch (e) {
      setFetchStatus({ message: e.message, type: 'error' });
    } finally {
      setLoading('');
    }
  }

  function toggleVar(idx) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function selectAll(checked) {
    setSelected(checked ? new Set(variables.map((_, i) => i)) : new Set());
  }

  function updateValue(idx, value) {
    setVariables(prev => prev.map((v, i) => {
      if (i !== idx) return v;
      if (v.source === 'manual') return { ...v, value };
      const source = value !== v.originalValue ? 'modified' : 'envcore';
      return { ...v, value, source };
    }));
  }

  function updateKey(idx, key) {
    setVariables(prev => prev.map((v, i) => i === idx ? { ...v, key } : v));
  }

  function addVariable() {
    setVariables(prev => [...prev, { key: '', value: '', originalValue: '', source: 'manual' }]);
    const newIdx = variables.length;
    setSelected(prev => new Set([...prev, newIdx]));
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50);
  }

  const filtered = filter
    ? variables.map((v, idx) => ({ ...v, _idx: idx })).filter(v => v.key.toLowerCase().includes(filter.toLowerCase()))
    : variables.map((v, idx) => ({ ...v, _idx: idx }));

  async function submitConfig() {
    if (!templateName.trim()) { setSubmitStatus({ message: 'Please enter a Template Name', type: 'error' }); return; }
    if (!bearerToken) { setSubmitStatus({ message: 'Please set your API token in the sidebar first.', type: 'error' }); return; }
    if (!jobId.trim()) { setSubmitStatus({ message: 'Please enter a Job ID', type: 'error' }); return; }

    const defaultEnvConfig = {};
    for (const idx of selected) {
      const v = variables[idx];
      if (v && v.key.trim()) {
        defaultEnvConfig[v.key] = v.value;
      }
    }

    setLoading('submit');
    setSubmitStatus({ message: 'Creating category config...', type: 'loading' });
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
      setSubmitStatus({ message: 'Category config created successfully!', type: 'success' });
    } catch (e) {
      if (e instanceof AuthError) onTokenExpired();
      setSubmitStatus({ message: e.message, type: 'error' });
    } finally {
      setLoading('');
    }
  }

  const SOURCE_BADGE = {
    envcore: { label: 'ENVCORE', cls: 'bg-gh-accent-blue/15 text-gh-accent-blue-text border-gh-accent-blue/30' },
    modified: { label: 'MODIFIED', cls: 'bg-gh-accent-amber/15 text-gh-accent-amber-text border-gh-accent-amber/30' },
    manual: { label: 'MANUAL', cls: 'bg-gh-accent-purple/15 text-gh-accent-purple-text border-gh-accent-purple/30' },
  };

  return (
    <>
      <h2 className="text-lg font-medium mb-5">Update Category Config</h2>

      {/* Job ID & Template Name */}
      <div className="bg-gh-surface border border-gh-border rounded-md p-5 mb-3">
        <h3 className="text-sm font-medium mb-3">Job & Template Details</h3>

        {!bearerToken && (
          <div className="mb-3 px-3.5 py-2.5 rounded-md text-xs flex items-center gap-2 border bg-gh-accent-amber/15 text-gh-accent-amber-text border-gh-accent-amber/30">
            Set your API token in the sidebar before submitting.
          </div>
        )}

        <div className="flex gap-3 mb-3">
          <div className="flex-[2]">
            <label className="block text-[11px] text-gh-text-secondary uppercase tracking-wider mb-1 font-medium">Job ID</label>
            <input type="text" value={jobId} onChange={e => setJobId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchEnvVars()}
              placeholder="e.g. 54ae01c4-d111-447a-baa4-c35854d2c5f1"
              className="w-full px-3 py-2 bg-gh-canvas border border-gh-border rounded-md text-sm text-gh-text outline-none focus:border-gh-accent-blue placeholder:text-gh-text-muted" />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] text-gh-text-secondary uppercase tracking-wider mb-1 font-medium">Template Name</label>
            <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
              placeholder="e.g. lead-gen-v2"
              className="w-full px-3 py-2 bg-gh-canvas border border-gh-border rounded-md text-sm text-gh-text outline-none focus:border-gh-accent-blue placeholder:text-gh-text-muted" />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gh-border">
          <label className="block text-[11px] text-gh-text-secondary uppercase tracking-wider mb-2.5 font-medium">Visibility</label>
          <div className="flex flex-col gap-2">
            <div onClick={() => setInternal(!internal)}
              className={`flex items-center justify-between gap-3 px-3.5 py-3 rounded-md cursor-pointer transition-all border ${
                internal
                  ? 'bg-gh-accent-blue/15 border-gh-accent-blue/30'
                  : 'bg-gh-overlay border-gh-border hover:border-gh-text-muted'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm transition-colors ${
                  internal ? 'bg-gh-accent-blue/20 text-gh-accent-blue-text' : 'bg-gh-surface text-gh-text-secondary'
                }`}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <div>
                  <div className={`text-sm font-medium transition-colors ${internal ? 'text-gh-accent-blue-text' : 'text-gh-text'}`}>Internal</div>
                  <div className="text-[11px] text-gh-text-secondary">Only visible to internal team members</div>
                </div>
              </div>
              <button type="button"
                className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 ${internal ? 'bg-gh-accent-blue' : 'bg-gh-overlay'}`}>
                <span className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${internal ? 'translate-x-[18px]' : 'translate-x-0'}`} />
              </button>
            </div>
            <div onClick={() => setIsPublic(!isPublic)}
              className={`flex items-center justify-between gap-3 px-3.5 py-3 rounded-md cursor-pointer transition-all border ${
                isPublic
                  ? 'bg-gh-accent-green/10 border-gh-accent-green/30'
                  : 'bg-gh-overlay border-gh-border hover:border-gh-text-muted'
              }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm transition-colors ${
                  isPublic ? 'bg-gh-accent-green/20 text-gh-accent-green-text' : 'bg-gh-surface text-gh-text-secondary'
                }`}>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <div>
                  <div className={`text-sm font-medium transition-colors ${isPublic ? 'text-gh-accent-green-text' : 'text-gh-text'}`}>Public</div>
                  <div className="text-[11px] text-gh-text-secondary">Accessible to all platform users</div>
                </div>
              </div>
              <button type="button"
                className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 ${isPublic ? 'bg-gh-accent-green' : 'bg-gh-overlay'}`}>
                <span className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${isPublic ? 'translate-x-[18px]' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Env Variables */}
      <div className="bg-gh-surface border border-gh-border rounded-md p-5 mb-3">
        <h3 className="text-sm font-medium mb-3">Default Env Config</h3>
        <p className="text-xs text-gh-text-secondary mb-3">
          Fetch env variables from the job's pod, then select which ones to include in the category config.
        </p>
        <button onClick={fetchEnvVars} disabled={loading === 'fetch'}
          className="px-4 py-2 bg-gh-accent-blue text-white text-sm rounded-md hover:bg-gh-accent-blue disabled:opacity-50 flex items-center gap-2">
          {loading === 'fetch' && <div className="w-3.5 h-3.5 border-2 border-blue-300/30 border-t-white rounded-full animate-spin" />}
          {loading === 'fetch' ? 'Fetching...' : 'Fetch Env Variables'}
        </button>

        {fetchStatus && (
          <div className={`mt-3 px-3.5 py-2.5 rounded-md text-xs flex items-center gap-2 border ${
            { info: 'bg-gh-accent-blue/10 text-gh-accent-blue-text border-gh-accent-blue/30',
              success: 'bg-gh-accent-green/10 text-gh-accent-green-text border-gh-accent-green/30',
              error: 'bg-gh-accent-red/10 text-gh-accent-red-text border-gh-accent-red/30',
              loading: 'bg-gh-surface text-gh-text-secondary border-gh-border',
            }[fetchStatus.type] || ''}`}>
            {fetchStatus.type === 'loading' && (
              <div className="w-3.5 h-3.5 border-2 border-gh-text-muted border-t-gh-accent-blue-text rounded-full animate-spin shrink-0" />
            )}
            <span>{fetchStatus.message}</span>
          </div>
        )}

        {variables.length > 0 && (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 mt-4 mb-2 flex-wrap">
              <span className="text-[11px] bg-gh-accent-blue/15 text-gh-accent-blue-text border border-gh-accent-blue/30 px-2 py-0.5 rounded-md font-medium">
                {selected.size} selected
              </span>
              <button onClick={() => selectAll(true)}
                className="text-[11px] text-gh-text-secondary hover:text-gh-text transition-colors">Select All</button>
              <button onClick={() => selectAll(false)}
                className="text-[11px] text-gh-text-secondary hover:text-gh-text transition-colors">Deselect All</button>
              <div className="ml-auto flex items-center gap-1.5 bg-gh-overlay border border-gh-border rounded-md px-2.5 py-1.5">
                <svg className="w-3 h-3 text-gh-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
                  placeholder="Filter variables..."
                  className="bg-transparent text-[11px] text-gh-text outline-none placeholder:text-gh-text-muted w-28" />
              </div>
            </div>

            {/* Table header */}
            <div className="border border-gh-border rounded-t-md bg-gh-overlay">
              <div className="flex items-center gap-3 px-3.5 py-2.5 text-[10px] text-gh-text-secondary uppercase tracking-wider font-semibold">
                <div className="w-5 shrink-0" />
                <div className="w-[160px] shrink-0">Key Name</div>
                <div className="flex-1">Current Value</div>
                <div className="w-[80px] text-center shrink-0">Source</div>
              </div>
            </div>

            {/* Table rows */}
            <div ref={listRef} className="max-h-[380px] overflow-y-auto border border-t-0 border-gh-border rounded-b-md">
              {filtered.map((v) => {
                const idx = v._idx;
                const badge = SOURCE_BADGE[v.source] || SOURCE_BADGE.envcore;
                const isSelected = selected.has(idx);
                return (
                  <div key={idx} onClick={() => toggleVar(idx)}
                    className={`flex items-center gap-3 pr-3.5 py-2.5 border-b border-gh-border last:border-b-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gh-accent-blue/10 border-l-2 border-l-gh-accent-blue pl-[12px]'
                        : 'hover:bg-gh-surface-hover border-l-2 border-l-transparent pl-[12px]'
                    }`}>
                    <div className="w-5 shrink-0 flex justify-center" onClick={e => e.stopPropagation()}>
                      <div onClick={() => toggleVar(idx)}
                        className={`w-[18px] h-[18px] rounded flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gh-accent-blue border border-gh-accent-blue'
                            : 'bg-transparent border border-slate-600 hover:border-slate-400'
                        }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="w-[160px] shrink-0" onClick={e => { if (v.source === 'manual') e.stopPropagation(); }}>
                      {v.source === 'manual' ? (
                        <input type="text" value={v.key} onChange={e => updateKey(idx, e.target.value)}
                          placeholder="KEY_NAME"
                          className="w-full px-2 py-1 bg-gh-overlay border border-gh-border rounded text-xs text-gh-accent-purple-text outline-none focus:border-gh-accent-blue font-mono font-medium placeholder:text-gh-text-muted" />
                      ) : (
                        <span className={`text-xs font-mono font-medium ${isSelected ? 'text-gh-accent-blue-text' : 'text-gh-text'}`}>
                          {v.key}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                      <input type="text" value={v.value}
                        onChange={e => updateValue(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gh-overlay border border-gh-border rounded-md text-xs text-gh-text outline-none focus:border-gh-accent-blue font-mono" />
                    </div>
                    <div className="w-[80px] shrink-0 flex justify-center">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wider ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-xs text-gh-text-secondary text-center py-6">No variables match your filter</div>
              )}
            </div>

            {/* Add variable */}
            <div className="mt-3">
              <button onClick={addVariable}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gh-accent-blue/15 border border-gh-accent-blue/30 text-gh-accent-blue-text text-xs rounded-md hover:bg-blue-600/25 transition-colors font-medium">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                New Variable
              </button>
            </div>
          </>
        )}
      </div>

      {/* Submit */}
      <div className="bg-gh-surface border border-gh-border rounded-md p-5 mb-3">
        <button onClick={submitConfig} disabled={loading === 'submit'}
          className="px-4 py-2 bg-gh-btn-primary text-white text-sm rounded-md hover:bg-gh-btn-primary-hover disabled:opacity-50 flex items-center gap-2">
          {loading === 'submit' && <div className="w-3.5 h-3.5 border-2 border-green-300/30 border-t-white rounded-full animate-spin" />}
          {loading === 'submit' ? 'Creating...' : 'Create Category Config'}
        </button>

        {submitStatus && (
          <div className={`mt-3 px-3.5 py-2.5 rounded-md text-xs flex items-center gap-2 border ${
            { info: 'bg-gh-accent-blue/10 text-gh-accent-blue-text border-gh-accent-blue/30',
              success: 'bg-gh-accent-green/10 text-gh-accent-green-text border-gh-accent-green/30',
              error: 'bg-gh-accent-red/10 text-gh-accent-red-text border-gh-accent-red/30',
              loading: 'bg-gh-surface text-gh-text-secondary border-gh-border',
            }[submitStatus.type] || ''}`}>
            {submitStatus.type === 'loading' && (
              <div className="w-3.5 h-3.5 border-2 border-gh-text-muted border-t-gh-accent-blue-text rounded-full animate-spin shrink-0" />
            )}
            <span>{submitStatus.message}</span>
          </div>
        )}

        {result && (
          <div className="mt-4 p-3.5 bg-gh-accent-green/10 border border-gh-accent-green/30 rounded-md">
            <div className="text-sm text-gh-accent-green-text font-medium flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" /> Category config created!
            </div>
            <pre className="text-xs text-gh-accent-green-text bg-gh-canvas px-3.5 py-2.5 rounded-md overflow-x-auto font-mono whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}
