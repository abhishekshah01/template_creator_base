import { useState, useRef } from 'react';
import { api, AuthError } from '../../api';

const SOURCE_BADGE = {
  envcore: { label: 'ENVCORE', cls: 'bg-gh-accent-blue/15 text-gh-accent-blue-text border-gh-accent-blue/30' },
  modified: { label: 'MODIFIED', cls: 'bg-gh-accent-amber/15 text-gh-accent-amber-text border-gh-accent-amber/30' },
  manual: { label: 'MANUAL', cls: 'bg-gh-accent-purple/15 text-gh-accent-purple-text border-gh-accent-purple/30' },
};

export default function CreateConfig({ bearerToken, onTokenExpired, onNavigate }) {
  const [templateName, setTemplateName] = useState('');
  const [jobId, setJobId] = useState('');
  const [internal, setInternal] = useState(true);
  const [isPublic, setIsPublic] = useState(false);

  const [variables, setVariables] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState('');

  const [loading, setLoading] = useState('');
  const [fetchStatus, setFetchStatus] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [result, setResult] = useState(null);

  const listRef = useRef(null);

  // --- Env var logic ---
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
      return { ...v, value, source: value !== v.originalValue ? 'modified' : 'envcore' };
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

  // --- Submit ---
  async function submitConfig() {
    if (!templateName.trim()) { setSubmitStatus({ message: 'Template name is required.', type: 'error' }); return; }
    if (!bearerToken) { setSubmitStatus({ message: 'Set your API token in the sidebar first.', type: 'error' }); return; }
    if (!jobId.trim()) { setSubmitStatus({ message: 'Job ID is required.', type: 'error' }); return; }

    const defaultEnvConfig = {};
    for (const idx of selected) {
      const v = variables[idx];
      if (v && v.key.trim()) defaultEnvConfig[v.key] = v.value;
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

  const selectedCount = selected.size;

  return (
    <div className="max-w-[768px]">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gh-text">Create a new category config</h1>
        <p className="text-sm text-gh-text-secondary mt-1">
          Define a template configuration with environment variables and visibility settings.
        </p>
      </div>

      <hr className="border-gh-border mb-6" />

      {/* Template Name — required */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gh-text mb-1.5">
          Template name <span className="text-gh-accent-red-text">*</span>
        </label>
        <p className="text-xs text-gh-text-secondary mb-2">
          A unique identifier for this config. Use lowercase with hyphens or underscores.
        </p>
        <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
          placeholder="e.g. propnex-crm-v0"
          className="w-full max-w-md px-3 py-[5px] bg-gh-canvas border border-gh-border rounded-md text-sm text-gh-text outline-none focus:border-gh-accent-blue focus:shadow-[0_0_0_3px_rgba(31,111,235,0.3)] placeholder:text-gh-text-muted transition-shadow" />
      </div>

      {/* Summary Source Job ID — required */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gh-text mb-1.5">
          Summary source job ID <span className="text-gh-accent-red-text">*</span>
        </label>
        <p className="text-xs text-gh-text-secondary mb-2">
          The job ID to use as the source for this config. Also used to fetch env variables from the pod.
        </p>
        <div className="flex gap-2 max-w-lg">
          <input type="text" value={jobId} onChange={e => setJobId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchEnvVars()}
            placeholder="e.g. 71503f24-6251-4e30-97a8-fe4603c14d7f"
            className="flex-1 px-3 py-[5px] bg-gh-canvas border border-gh-border rounded-md text-sm text-gh-text outline-none focus:border-gh-accent-blue focus:shadow-[0_0_0_3px_rgba(31,111,235,0.3)] placeholder:text-gh-text-muted font-mono transition-shadow" />
          <button onClick={fetchEnvVars} disabled={loading === 'fetch'}
            className="px-3 py-[5px] bg-gh-btn border border-gh-border rounded-md text-sm text-gh-text hover:bg-gh-btn-hover disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1.5">
            {loading === 'fetch' && <div className="w-3.5 h-3.5 border-2 border-gh-border border-t-gh-text rounded-full animate-spin" />}
            {loading === 'fetch' ? 'Fetching...' : 'Fetch env vars'}
          </button>
        </div>
        {fetchStatus && (
          <div className={`mt-2 px-3 py-2 rounded-md text-xs flex items-center gap-2 border ${
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
      </div>

      <hr className="border-gh-border mb-6" />

      {/* Visibility */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gh-text mb-1.5">Visibility</label>
        <p className="text-xs text-gh-text-secondary mb-3">
          Control who can access this template config.
        </p>
        <div className="max-w-lg border border-gh-border rounded-md overflow-hidden">
          {/* Internal */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gh-border">
            <div>
              <div className="text-sm font-medium text-gh-text">Internal</div>
              <div className="text-xs text-gh-text-secondary mt-0.5">Only visible to internal team members.</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gh-text-muted">{internal ? 'On' : 'Off'}</span>
              <button type="button" onClick={() => setInternal(!internal)}
                className={`relative w-[50px] h-[26px] rounded-full transition-colors border ${
                  internal
                    ? 'bg-gh-accent-blue border-gh-accent-blue'
                    : 'bg-gh-overlay border-gh-border'
                }`}>
                <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  internal ? 'translate-x-[24px]' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
          {/* Public */}
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-gh-text">Public</div>
              <div className="text-xs text-gh-text-secondary mt-0.5">Accessible to all platform users.</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gh-text-muted">{isPublic ? 'On' : 'Off'}</span>
              <button type="button" onClick={() => setIsPublic(!isPublic)}
                className={`relative w-[50px] h-[26px] rounded-full transition-colors border ${
                  isPublic
                    ? 'bg-gh-accent-green border-gh-accent-green'
                    : 'bg-gh-overlay border-gh-border'
                }`}>
                <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  isPublic ? 'translate-x-[24px]' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-gh-border mb-6" />

      {/* Default Env Config */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gh-text mb-1.5">Default environment config</label>
        <p className="text-xs text-gh-text-secondary mb-3">
          Select which env variables to include. Use "Fetch env vars" above, or add them manually.
        </p>

        {variables.length > 0 && (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-gh-text-secondary">{selectedCount} of {variables.length} selected</span>
              <span className="text-gh-text-muted">·</span>
              <button onClick={() => selectAll(true)} className="text-xs text-gh-accent-blue-text hover:underline">Select all</button>
              <button onClick={() => selectAll(false)} className="text-xs text-gh-accent-blue-text hover:underline">Deselect all</button>
              <div className="ml-auto flex items-center gap-1.5 bg-gh-canvas border border-gh-border rounded-md px-2.5 py-1">
                <svg className="w-3.5 h-3.5 text-gh-text-muted" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
                </svg>
                <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
                  placeholder="Filter..."
                  className="bg-transparent text-xs text-gh-text outline-none placeholder:text-gh-text-muted w-24" />
              </div>
            </div>

            {/* Table */}
            <div className="border border-gh-border rounded-md overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-3.5 py-2 bg-gh-canvas-subtle border-b border-gh-border text-xs text-gh-text-secondary font-medium">
                <div className="w-5 shrink-0" />
                <div className="w-[160px] shrink-0">Key</div>
                <div className="flex-1">Value</div>
                <div className="w-[72px] text-center shrink-0">Source</div>
              </div>

              {/* Rows */}
              <div ref={listRef} className="max-h-[360px] overflow-y-auto">
                {filtered.map((v) => {
                  const idx = v._idx;
                  const badge = SOURCE_BADGE[v.source] || SOURCE_BADGE.envcore;
                  const isSelected = selected.has(idx);
                  return (
                    <div key={idx} onClick={() => toggleVar(idx)}
                      className={`flex items-center gap-3 px-3.5 py-2 border-b border-gh-border-muted last:border-b-0 cursor-pointer transition-colors ${
                        isSelected ? 'bg-gh-accent-blue/5' : 'hover:bg-gh-surface-hover'
                      }`}>
                      <div className="w-5 shrink-0 flex justify-center" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleVar(idx)}
                          className="w-[14px] h-[14px] accent-[#1f6feb] cursor-pointer" />
                      </div>
                      <div className="w-[160px] shrink-0" onClick={e => { if (v.source === 'manual') e.stopPropagation(); }}>
                        {v.source === 'manual' ? (
                          <input type="text" value={v.key} onChange={e => updateKey(idx, e.target.value)}
                            placeholder="KEY_NAME"
                            className="w-full px-2 py-1 bg-gh-canvas border border-gh-border rounded-md text-xs text-gh-accent-purple-text outline-none focus:border-gh-accent-blue font-mono placeholder:text-gh-text-muted" />
                        ) : (
                          <span className={`text-xs font-mono ${isSelected ? 'text-gh-text' : 'text-gh-text-secondary'}`}>{v.key}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                        <input type="text" value={v.value}
                          onChange={e => updateValue(idx, e.target.value)}
                          className="w-full px-2 py-1 bg-gh-canvas border border-gh-border rounded-md text-xs text-gh-text outline-none focus:border-gh-accent-blue font-mono" />
                      </div>
                      <div className="w-[72px] shrink-0 flex justify-center">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-xs text-gh-text-muted text-center py-6">No variables match your filter</div>
                )}
              </div>
            </div>

            {/* Add variable */}
            <button onClick={addVariable}
              className="mt-2 flex items-center gap-1.5 text-xs text-gh-accent-blue-text hover:underline">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
              </svg>
              Add a variable
            </button>
          </>
        )}

        {variables.length === 0 && (
          <div className="border border-gh-border rounded-md p-6 text-center border-dashed">
            <div className="text-sm text-gh-text-muted mb-1">No environment variables yet</div>
            <div className="text-xs text-gh-text-muted mb-3">Fetch from a job pod or add manually.</div>
            <button onClick={addVariable}
              className="text-xs text-gh-accent-blue-text hover:underline">
              Add a variable manually
            </button>
          </div>
        )}
      </div>

      <hr className="border-gh-border mb-6" />

      {/* Submit area */}
      <div className="flex items-center gap-3">
        <button onClick={submitConfig} disabled={loading === 'submit'}
          className="px-4 py-[5px] bg-gh-btn-primary text-white text-sm font-medium rounded-md hover:bg-gh-btn-primary-hover disabled:opacity-50 transition-colors flex items-center gap-2">
          {loading === 'submit' && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading === 'submit' ? 'Creating...' : 'Create config'}
        </button>
        <button onClick={() => onNavigate?.('config-all')}
          className="px-4 py-[5px] bg-transparent border border-gh-border text-sm text-gh-text-secondary rounded-md hover:bg-gh-btn-hover hover:text-gh-text transition-colors">
          Cancel
        </button>
      </div>

      {/* Status messages */}
      {submitStatus && (
        <div className={`mt-4 px-3.5 py-2.5 rounded-md text-xs flex items-center gap-2 border ${
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
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Config created successfully!
          </div>
          <pre className="text-xs text-gh-accent-green-text bg-gh-canvas px-3.5 py-2.5 rounded-md overflow-x-auto font-mono whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
