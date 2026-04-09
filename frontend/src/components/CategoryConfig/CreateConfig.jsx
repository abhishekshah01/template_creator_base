import { useState, useRef, useEffect } from 'react';
import { api, AuthError } from '../../api';

const SOURCE_BADGE = {
  envcore: { label: 'ENVCORE', cls: 'bg-gh-accent-blue/15 text-gh-accent-blue-text border-gh-accent-blue/30' },
  modified: { label: 'MODIFIED', cls: 'bg-gh-accent-amber/15 text-gh-accent-amber-text border-gh-accent-amber/30' },
  manual: { label: 'MANUAL', cls: 'bg-gh-accent-purple/15 text-gh-accent-purple-text border-gh-accent-purple/30' },
  existing: { label: 'EXISTING', cls: 'bg-[#30363d] text-[#8b949e] border-[#484f58]' },
};

export default function CreateConfig({ bearerToken, onTokenExpired, onNavigate, editConfigId, cachedConfigs = [], refreshConfigs, markConfigsStale }) {
  const [mode, setMode] = useState('create'); // 'create' | 'edit'
  const [configId, setConfigId] = useState(editConfigId || '');
  const [templateName, setTemplateName] = useState('');
  const [jobId, setJobId] = useState('');
  const [internal, setInternal] = useState(true);
  const [isPublic, setIsPublic] = useState(false);

  const [variables, setVariables] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState('');

  const [loading, setLoading] = useState('');
  const [loadExistingInput, setLoadExistingInput] = useState('');
  const [loadStatus, setLoadStatus] = useState(null);
  const [fetchStatus, setFetchStatus] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [result, setResult] = useState(null);

  const listRef = useRef(null);

  // Auto-load if editConfigId is provided — fetch directly, skip cache
  useEffect(() => {
    if (editConfigId && bearerToken) {
      fetchFullConfig(String(editConfigId));
    }
  }, [editConfigId]);

  // --- Load existing config ---
  async function loadConfig(id) {
    if (!bearerToken) { setLoadStatus({ message: 'Set your API token first.', type: 'error' }); return; }
    const input = id || loadExistingInput.trim();
    if (!input) { setLoadStatus({ message: 'Enter a template name or config ID.', type: 'error' }); return; }

    // Try to find in cached configs first (by template_name or id)
    let foundConfig = cachedConfigs.find(c =>
      c.template_name === input || String(c.id) === input
    );

    if (foundConfig) {
      // Found in cache — fetch full config by id
      return fetchFullConfig(String(foundConfig.id));
    }

    // Not in cache — prompt sync
    setLoadStatus({ message: 'sync_needed', type: 'sync' });
  }

  async function syncAndRetry() {
    const input = loadExistingInput.trim();
    setLoading('load');
    setLoadStatus({ message: 'Syncing configs...', type: 'loading' });
    try {
      const freshConfigs = await refreshConfigs();
      const found = freshConfigs.find(c =>
        c.template_name === input || String(c.id) === input
      );
      if (found) {
        return fetchFullConfig(String(found.id));
      } else {
        setLoadStatus({ message: `No config found with name "${input}". You can create a new one.`, type: 'error' });
      }
    } catch (e) {
      setLoadStatus({ message: e.message, type: 'error' });
    } finally {
      setLoading('');
    }
  }

  async function fetchFullConfig(configId) {
    setLoading('load');
    setLoadStatus({ message: 'Loading config...', type: 'loading' });
    try {
      const data = await api.getCategoryConfig(configId, bearerToken);
      setConfigId(String(data.id || configId));
      setTemplateName(data.template_name || '');
      setJobId(data.summary_source_job_id || '');
      setInternal(data.internal ?? true);
      setIsPublic(data.public ?? false);

      const envConfig = data.default_env_config || {};
      const vars = Object.entries(envConfig).map(([key, value]) => ({
        key, value: String(value), originalValue: String(value), source: 'existing',
      }));
      setVariables(vars);
      setSelected(new Set(vars.map((_, i) => i)));

      setMode('edit');
      setLoadStatus({ message: `Loaded "${data.template_name}" — you can now edit and update.`, type: 'success' });
      setSubmitStatus(null);
      setResult(null);
    } catch (e) {
      if (e instanceof AuthError) onTokenExpired?.();
      setLoadStatus({ message: e.message, type: 'error' });
    } finally {
      setLoading('');
    }
  }

  function resetToCreate() {
    setMode('create');
    setConfigId('');
    setTemplateName('');
    setJobId('');
    setInternal(true);
    setIsPublic(false);
    setVariables([]);
    setSelected(new Set());
    setLoadStatus(null);
    setFetchStatus(null);
    setSubmitStatus(null);
    setResult(null);
    setLoadExistingInput('');
  }

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
      return { ...v, value, source: value !== v.originalValue ? 'modified' : (v.source === 'modified' ? 'envcore' : v.source) };
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

    const defaultEnvConfig = {};
    for (const idx of selected) {
      const v = variables[idx];
      if (v && v.key.trim()) defaultEnvConfig[v.key] = v.value;
    }

    setLoading('submit');
    setSubmitStatus({ message: mode === 'edit' ? 'Updating config...' : 'Creating config...', type: 'loading' });
    setResult(null);
    try {
      let data;
      if (mode === 'edit') {
        data = await api.updateCategoryConfig({
          config_id: configId,
          template_name: templateName,
          config: {},
          default_env_config: defaultEnvConfig,
          summary_source_job_id: jobId,
          internal,
          public: isPublic,
          bearer_token: bearerToken,
        });
      } else {
        data = await api.createCategoryConfig({
          template_name: templateName,
          config: {},
          default_env_config: defaultEnvConfig,
          summary_source_job_id: jobId,
          internal,
          public: isPublic,
          bearer_token: bearerToken,
        });
      }
      setResult(data.response);
      setSubmitStatus({ message: mode === 'edit' ? 'Config updated successfully!' : 'Config created successfully!', type: 'success' });
      markConfigsStale?.();
    } catch (e) {
      if (e instanceof AuthError) onTokenExpired?.();
      setSubmitStatus({ message: e.message, type: 'error' });
    } finally {
      setLoading('');
    }
  }

  const selectedCount = selected.size;
  const inputCls = "w-full px-3 py-[5px] bg-[#0d1117] border border-[#30363d] rounded-md text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb] focus:shadow-[0_0_0_3px_rgba(31,111,235,0.3)] placeholder:text-[#484f58] transition-shadow";

  return (
    <div className="max-w-[768px]">
      {/* Page header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[20px] font-semibold text-[#e6edf3]">
          {mode === 'edit' ? 'Edit category config' : 'Create a new category config'}
        </h1>
        {mode === 'edit' && (
          <button onClick={resetToCreate}
            className="px-3 py-[5px] bg-[#21262d] border border-[#30363d] text-[14px] text-[#c9d1d9] rounded-md hover:bg-[#30363d] transition-colors">
            New config
          </button>
        )}
      </div>
      <p className="text-[13px] text-[#8b949e] mb-4">
        {mode === 'edit'
          ? 'Modify the config fields below and click "Update config" to save changes.'
          : 'Define a template configuration with environment variables and visibility settings.'}
      </p>

      {/* Mode banner */}
      {mode === 'edit' && (
        <div className="mb-4 px-3 py-[7px] rounded-md text-[13px] flex items-center gap-2 border bg-[#1f6feb]/8 text-[#58a6ff] border-[#1f6feb]/20">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z" />
          </svg>
          Editing config <span className="font-semibold text-[#e6edf3]">{templateName}</span> <span className="text-[#484f58]">(ID: {configId})</span>
        </div>
      )}

      {/* Load existing config */}
      {mode === 'create' && (
        <>
          <div className="mb-4 p-4 border border-dashed border-[#30363d] rounded-md bg-[#161b22]">
            <div className="text-[13px] text-[#8b949e] mb-2">
              Want to edit an existing config? Enter its ID or template name below.
            </div>
            <div className="flex gap-2">
              <input type="text" value={loadExistingInput} onChange={e => setLoadExistingInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadConfig()}
                placeholder="Config ID or template name"
                className="flex-1 px-3 py-[5px] bg-[#0d1117] border border-[#30363d] rounded-md text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb] placeholder:text-[#484f58] font-mono" />
              <button onClick={() => loadConfig()} disabled={loading === 'load'}
                className="px-3 py-[5px] bg-[#21262d] border border-[#30363d] text-[14px] text-[#c9d1d9] rounded-md hover:bg-[#30363d] disabled:opacity-50 transition-colors flex items-center gap-1.5">
                {loading === 'load' && <div className="w-3.5 h-3.5 border-2 border-[#30363d] border-t-[#e6edf3] rounded-full animate-spin" />}
                {loading === 'load' ? 'Loading...' : 'Load'}
              </button>
            </div>
            {loadStatus && loadStatus.type === 'sync' && (
              <div className="mt-2 px-3 py-[7px] rounded-md text-[13px] flex items-center gap-2 border bg-[#9e6a03]/8 text-[#d29922] border-[#9e6a03]/20">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
                </svg>
                <span>Configs may be out of date. Sync to get the latest data and retry.</span>
                <button onClick={syncAndRetry} disabled={loading === 'load'}
                  className="text-[#58a6ff] hover:underline font-medium ml-1 flex items-center gap-1">
                  {loading === 'load' && <div className="w-3 h-3 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin" />}
                  Sync & Retry
                </button>
              </div>
            )}
            {loadStatus && loadStatus.type !== 'sync' && (
              <div className={`mt-2 px-3 py-[5px] rounded-md text-[13px] flex items-center gap-2 border ${
                { success: 'bg-[#238636]/8 text-[#3fb950] border-[#238636]/20',
                  error: 'bg-[#da3633]/8 text-[#f85149] border-[#da3633]/20',
                  loading: 'bg-[#0d1117] text-[#8b949e] border-[#21262d]',
                }[loadStatus.type] || ''}`}>
                {loadStatus.type === 'loading' && <div className="w-3.5 h-3.5 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin shrink-0" />}
                {loadStatus.type === 'success' && <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" /></svg>}
                {loadStatus.type === 'error' && <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>}
                <span>{loadStatus.message}</span>
              </div>
            )}
          </div>
          <hr className="border-[#30363d] mb-6" />
        </>
      )}

      {/* Template Name */}
      <div className="mb-6">
        <label className="block text-[14px] font-semibold text-[#e6edf3] mb-1">
          Template name {mode === 'create' && <span className="text-[#f85149]">*</span>}
        </label>
        <p className="text-[12px] text-[#8b949e] mb-2">
          A unique identifier for this config. Use lowercase with hyphens or underscores.
        </p>
        <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
          placeholder="e.g. propnex-crm-v0"
          readOnly={mode === 'edit'}
          className={`${inputCls} ${mode === 'edit' ? 'opacity-60 cursor-not-allowed' : ''}`} />
      </div>

      {/* Summary Source Job ID */}
      <div className="mb-6">
        <label className="block text-[14px] font-semibold text-[#e6edf3] mb-1">
          Summary source job ID {mode === 'create' && <span className="text-[#f85149]">*</span>}
        </label>
        <p className="text-[12px] text-[#8b949e] mb-2">
          The job ID to use as the source for this config. Also used to fetch env variables from the pod.
        </p>
        <div className="flex gap-2">
          <input type="text" value={jobId} onChange={e => setJobId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchEnvVars()}
            placeholder="e.g. 71503f24-6251-4e30-97a8-fe4603c14d7f"
            className={`flex-1 ${inputCls} font-mono`} />
          <button onClick={fetchEnvVars} disabled={loading === 'fetch'}
            className="px-3 py-[5px] bg-[#21262d] border border-[#30363d] text-[14px] text-[#c9d1d9] rounded-md hover:bg-[#30363d] disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1.5">
            {loading === 'fetch' && <div className="w-3.5 h-3.5 border-2 border-[#30363d] border-t-[#e6edf3] rounded-full animate-spin" />}
            {loading === 'fetch' ? 'Fetching...' : 'Fetch env vars'}
          </button>
        </div>
        {fetchStatus && (
          <div className={`mt-2 px-3 py-[5px] rounded-md text-[13px] flex items-center gap-2 border ${
            { success: 'bg-[#238636]/8 text-[#3fb950] border-[#238636]/20',
              error: 'bg-[#da3633]/8 text-[#f85149] border-[#da3633]/20',
              loading: 'bg-[#0d1117] text-[#8b949e] border-[#21262d]',
            }[fetchStatus.type] || ''}`}>
            {fetchStatus.type === 'loading' && <div className="w-3.5 h-3.5 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin shrink-0" />}
            {fetchStatus.type === 'success' && <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" /></svg>}
            <span>{fetchStatus.message}</span>
          </div>
        )}
      </div>

      <hr className="border-[#30363d] mb-6" />

      {/* Visibility */}
      <div className="mb-6">
        <label className="block text-[14px] font-semibold text-[#e6edf3] mb-1">Visibility</label>
        <p className="text-[12px] text-[#8b949e] mb-3">Control who can access this template config.</p>
        <div className="border border-[#30363d] rounded-md overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[#30363d]">
            <div>
              <div className="text-[14px] font-medium text-[#e6edf3]">Internal</div>
              <div className="text-[12px] text-[#8b949e] mt-0.5">Only visible to internal team members.</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[12px] text-[#8b949e] font-medium">{internal ? 'On' : 'Off'}</span>
              <button type="button" onClick={() => setInternal(!internal)}
                className={`relative w-[48px] h-[24px] rounded-full transition-colors border flex items-center ${
                  internal ? 'bg-[#1f6feb] border-[#1f6feb]' : 'bg-[#21262d] border-[#30363d]'
                }`}>
                <span className={`absolute left-[8px] text-[10px] font-bold leading-none transition-opacity ${internal ? 'opacity-100 text-white' : 'opacity-0'}`}>|</span>
                <span className={`absolute right-[7px] text-[9px] leading-none transition-opacity ${internal ? 'opacity-0' : 'opacity-100 text-[#484f58]'}`}>○</span>
                <span className={`absolute top-[3px] w-[16px] h-[16px] rounded-[4px] shadow-sm transition-all duration-200 ${internal ? 'left-[28px] bg-[#161b22]' : 'left-[3px] bg-[#30363d]'}`} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <div className="text-[14px] font-medium text-[#e6edf3]">Public</div>
              <div className="text-[12px] text-[#8b949e] mt-0.5">Accessible to all platform users.</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[12px] text-[#8b949e] font-medium">{isPublic ? 'On' : 'Off'}</span>
              <button type="button" onClick={() => setIsPublic(!isPublic)}
                className={`relative w-[48px] h-[24px] rounded-full transition-colors border flex items-center ${
                  isPublic ? 'bg-[#238636] border-[#238636]' : 'bg-[#21262d] border-[#30363d]'
                }`}>
                <span className={`absolute left-[8px] text-[10px] font-bold leading-none transition-opacity ${isPublic ? 'opacity-100 text-white' : 'opacity-0'}`}>|</span>
                <span className={`absolute right-[7px] text-[9px] leading-none transition-opacity ${isPublic ? 'opacity-0' : 'opacity-100 text-[#484f58]'}`}>○</span>
                <span className={`absolute top-[3px] w-[16px] h-[16px] rounded-[4px] shadow-sm transition-all duration-200 ${isPublic ? 'left-[28px] bg-[#161b22]' : 'left-[3px] bg-[#30363d]'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-[#30363d] mb-6" />

      {/* Default Env Config */}
      <div className="mb-6">
        <label className="block text-[14px] font-semibold text-[#e6edf3] mb-1">Default environment config</label>
        <p className="text-[12px] text-[#8b949e] mb-3">Select which env variables to include. Use "Fetch env vars" above, or add them manually.</p>

        {variables.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[12px] text-[#8b949e]">{selectedCount} of {variables.length} selected</span>
              <span className="text-[#484f58]">·</span>
              <button onClick={() => selectAll(true)} className="text-[13px] text-[#58a6ff] hover:underline">Select all</button>
              <button onClick={() => selectAll(false)} className="text-[13px] text-[#58a6ff] hover:underline">Deselect all</button>
              <div className="ml-auto flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded-md px-2.5 py-1">
                <svg className="w-3.5 h-3.5 text-[#484f58]" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
                </svg>
                <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
                  placeholder="Filter..." className="bg-transparent text-[12px] text-[#e6edf3] outline-none placeholder:text-[#484f58] w-24" />
              </div>
            </div>

            <div className="border border-[#30363d] rounded-md overflow-hidden">
              <div className="flex items-center gap-3 px-3.5 py-2 bg-[#161b22] border-b border-[#30363d] text-[12px] text-[#8b949e] font-medium">
                <div className="w-5 shrink-0" />
                <div className="w-[160px] shrink-0">Key</div>
                <div className="flex-1">Value</div>
                <div className="w-[72px] text-center shrink-0">Source</div>
              </div>
              <div ref={listRef} className="max-h-[360px] overflow-y-auto">
                {filtered.map((v) => {
                  const idx = v._idx;
                  const badge = SOURCE_BADGE[v.source] || SOURCE_BADGE.envcore;
                  const isSelected = selected.has(idx);
                  return (
                    <div key={idx} onClick={() => toggleVar(idx)}
                      className={`flex items-center gap-3 px-3.5 py-2 border-b border-[#21262d] last:border-b-0 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#1f6feb]/5' : 'hover:bg-[#161b22]'
                      }`}>
                      <div className="w-5 shrink-0 flex justify-center" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleVar(idx)}
                          className="w-[14px] h-[14px] accent-[#1f6feb] cursor-pointer" />
                      </div>
                      <div className="w-[160px] shrink-0" onClick={e => { if (v.source === 'manual') e.stopPropagation(); }}>
                        {v.source === 'manual' ? (
                          <input type="text" value={v.key} onChange={e => updateKey(idx, e.target.value)}
                            placeholder="KEY_NAME"
                            className="w-full px-2 py-1 bg-[#0d1117] border border-[#30363d] rounded-md text-[12px] text-[#bc8cff] outline-none focus:border-[#1f6feb] font-mono placeholder:text-[#484f58]" />
                        ) : (
                          <span className={`text-[12px] font-mono ${isSelected ? 'text-[#e6edf3]' : 'text-[#8b949e]'}`}>{v.key}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                        <input type="text" value={v.value} onChange={e => updateValue(idx, e.target.value)}
                          className="w-full px-2 py-1 bg-[#0d1117] border border-[#30363d] rounded-md text-[12px] text-[#e6edf3] outline-none focus:border-[#1f6feb] font-mono" />
                      </div>
                      <div className="w-[72px] shrink-0 flex justify-center">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase ${badge.cls}`}>{badge.label}</span>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-[12px] text-[#484f58] text-center py-6">No variables match your filter</div>
                )}
              </div>
            </div>
            <button onClick={addVariable} className="mt-2 flex items-center gap-1.5 text-[13px] text-[#58a6ff] hover:underline">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
              </svg>
              Add a variable
            </button>
          </>
        )}

        {variables.length === 0 && (
          <div className="border border-dashed border-[#30363d] rounded-md p-6 text-center">
            <div className="text-[14px] text-[#484f58] mb-1">No environment variables yet</div>
            <div className="text-[12px] text-[#484f58] mb-3">Fetch from a job pod or add manually.</div>
            <button onClick={addVariable} className="text-[13px] text-[#58a6ff] hover:underline">Add a variable manually</button>
          </div>
        )}
      </div>

      <hr className="border-[#30363d] mb-6" />

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button onClick={submitConfig} disabled={loading === 'submit'}
          className="px-4 py-[5px] bg-[#238636] text-white text-[14px] font-medium rounded-md hover:bg-[#2ea043] disabled:opacity-50 transition-colors flex items-center gap-2">
          {loading === 'submit' && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading === 'submit' ? (mode === 'edit' ? 'Updating...' : 'Creating...') : (mode === 'edit' ? 'Update config' : 'Create config')}
        </button>
        <button onClick={() => onNavigate?.('config-all')}
          className="px-4 py-[5px] bg-transparent border border-[#30363d] text-[14px] text-[#8b949e] rounded-md hover:bg-[#21262d] hover:text-[#e6edf3] transition-colors">
          Cancel
        </button>
      </div>

      {/* Status */}
      {submitStatus && (
        <div className={`mt-4 px-3 py-[7px] rounded-md text-[13px] flex items-center gap-2 border ${
          { success: 'bg-[#238636]/8 text-[#3fb950] border-[#238636]/20',
            error: 'bg-[#da3633]/8 text-[#f85149] border-[#da3633]/20',
            loading: 'bg-[#0d1117] text-[#8b949e] border-[#21262d]',
          }[submitStatus.type] || ''}`}>
          {submitStatus.type === 'loading' && <div className="w-3.5 h-3.5 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin shrink-0" />}
          {submitStatus.type === 'success' && <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" /></svg>}
          {submitStatus.type === 'error' && <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>}
          <span>{submitStatus.message}</span>
        </div>
      )}

      {result && (
        <div className="mt-4 p-3.5 bg-[#238636]/8 border border-[#238636]/20 rounded-md">
          <div className="text-[14px] text-[#3fb950] font-medium flex items-center gap-2 mb-2">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" /></svg>
            {mode === 'edit' ? 'Config updated!' : 'Config created!'}
          </div>
          <pre className="text-[12px] text-[#3fb950] bg-[#0d1117] px-3.5 py-2.5 rounded-md overflow-x-auto font-mono whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
