import { useState, useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { usePersistedState, SET_OPTS } from '../../hooks/usePersistedState';
import { api, AuthError } from '../../api';
import Banner from '../Banner';

// CodeMirror theme + JSON syntax highlighting tuned to match the
// original JsonHighlight pre-block look (#0d1117 bg, blue keys, light
// blue strings, orange literals, gray punctuation).
const requestEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: '#0d1117',
    color: '#c9d1d9',
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': { padding: '12px 14px', caretColor: '#e6edf3' },
  '.cm-line': { padding: 0, lineHeight: '1.6' },
  '.cm-gutters': { backgroundColor: '#0d1117', border: 'none' },
  '.cm-cursor': { borderLeftColor: '#e6edf3' },
  '.cm-selectionBackground, ::selection': { backgroundColor: '#1f6feb40 !important' },
  '.cm-scroller': { fontFamily: 'inherit' },
}, { dark: true });

const requestHighlight = HighlightStyle.define([
  { tag: t.propertyName,   color: '#79c0ff' },
  { tag: t.string,         color: '#a5d6ff' },
  { tag: [t.number, t.bool, t.null], color: '#f0883e' },
  { tag: [t.punctuation, t.brace, t.squareBracket, t.separator], color: '#8b949e' },
]);

const JSON_THEMES = {
  request: {
    key: 'text-[#79c0ff]',    // blue keys
    string: 'text-[#a5d6ff]', // light blue strings
    literal: 'text-[#f0883e]',// orange bools/numbers
    bracket: 'text-[#8b949e]',// gray braces
    text: 'text-[#e6edf3]',
  },
  response: {
    key: 'text-[#56d4dd]',    // teal keys
    string: 'text-[#adbac7]', // muted gray strings
    literal: 'text-[#f0883e]',// orange bools/numbers (same as request)
    bracket: 'text-[#636e7b]',
    text: 'text-[#cdd9e5]',
  },
};

function JsonHighlight({ json, theme = 'request' }) {
  const t = JSON_THEMES[theme] || JSON_THEMES.request;
  const text = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
  return text.split('\n').map((line, i) => (
    <span key={i} className="block">{
      line.split(/("[^"]*"\s*:)|(".*?")|(\btrue\b|\bfalse\b|\bnull\b)|(\b\d+(?:\.\d+)?\b)|([{}[\],])/g).map((part, j) => {
        if (!part) return null;
        if (/^"[^"]*"\s*:$/.test(part)) return <span key={j} className={t.key}>{part}</span>;
        if (/^".*"$/.test(part)) return <span key={j} className={t.string}>{part}</span>;
        if (/^(true|false|null)$/.test(part)) return <span key={j} className={t.literal}>{part}</span>;
        if (/^\d+(?:\.\d+)?$/.test(part)) return <span key={j} className={t.literal}>{part}</span>;
        if (/^[{}[\],]+$/.test(part)) return <span key={j} className={t.bracket}>{part}</span>;
        return <span key={j} className={t.text}>{part}</span>;
      })
    }</span>
  ));
}

const SOURCE_BADGE = {
  envcore: { label: 'ENVCORE', cls: 'bg-gh-accent-blue/15 text-gh-accent-blue-text border-gh-accent-blue/30' },
  modified: { label: 'MODIFIED', cls: 'bg-gh-accent-amber/15 text-gh-accent-amber-text border-gh-accent-amber/30' },
  manual: { label: 'MANUAL', cls: 'bg-gh-accent-purple/15 text-gh-accent-purple-text border-gh-accent-purple/30' },
  existing: { label: 'EXISTING', cls: 'bg-[#30363d] text-[#8b949e] border-[#484f58]' },
};

export default function CreateConfig({ bearerToken, onTokenExpired, onNavigate, editConfigId, cachedConfigs = [], refreshConfigs, markConfigsStale, envConfig }) {
  const [mode, setMode] = usePersistedState('cC.mode', 'create'); // 'create' | 'edit'
  const [configId, setConfigId] = usePersistedState('cC.configId', editConfigId || '');
  const [templateName, setTemplateName] = usePersistedState('cC.templateName', '');
  const [jobId, setJobId] = usePersistedState('cC.jobId', '');
  const [internal, setInternal] = usePersistedState('cC.internal', true);
  const [isPublic, setIsPublic] = usePersistedState('cC.isPublic', false);

  const [variables, setVariables] = usePersistedState('cC.variables', []);
  const [selected, setSelected] = usePersistedState('cC.selected', new Set(), SET_OPTS);
  const [filter, setFilter] = usePersistedState('cC.filter', '');
  // Existing `config` blob (contains the generated summary). Preserved on update so we don't wipe it.
  const [existingConfig, setExistingConfig] = usePersistedState('cC.existingConfig', {});

  const [loading, setLoading] = useState('');
  const [loadExistingInput, setLoadExistingInput] = usePersistedState('cC.loadExistingInput', '');
  const [loadStatus, setLoadStatus] = useState(null);
  const [fetchStatus, setFetchStatus] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [result, setResult] = usePersistedState('cC.result', null);

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
    if (!input) { setLoadStatus({ message: 'Enter a config ID or template name.', type: 'error' }); return; }

    // If numeric, fetch directly by ID
    if (/^\d+$/.test(input)) {
      return fetchFullConfig(input);
    }

    // Otherwise, search by template name — fetch all configs and find
    setLoading('load');
    setLoadStatus({ message: 'Searching...', type: 'loading' });
    try {
      const allConfigs = await api.listCategoryConfigs(bearerToken);
      const list = Array.isArray(allConfigs) ? allConfigs : (allConfigs?.configs || allConfigs?.data || allConfigs?.results || []);
      const found = list.find(c => c.template_name === input || String(c.id) === input);
      if (found) {
        return fetchFullConfig(String(found.id));
      } else {
        setLoadStatus({ message: `No config found matching "${input}".`, type: 'error' });
      }
    } catch (e) {
      if (e instanceof AuthError) onTokenExpired?.();
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
      setExistingConfig(data.config && typeof data.config === 'object' ? data.config : {});

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
    setExistingConfig({});
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
          config: existingConfig,
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

  // --- Compute live API preview ---
  const baseApiUrl = envConfig?.api_url || '';
  const apiEndpoint = mode === 'edit'
    ? `${baseApiUrl}/internal/category-config/${configId || '{config_id}'}`
    : `${baseApiUrl}/internal/category-config`;
  const apiMethod = mode === 'edit' ? 'PUT' : 'POST';

  const defaultEnvConfigPreview = {};
  for (const idx of selected) {
    const v = variables[idx];
    if (v && v.key.trim()) defaultEnvConfigPreview[v.key] = v.value;
  }

  const requestBody = {
    template_name: templateName || '',
    config: {},
    default_env_config: defaultEnvConfigPreview,
    summary_source_job_id: jobId || '',
    internal,
    public: isPublic,
  };

  const maskedToken = bearerToken
    ? bearerToken.slice(0, 12) + '...' + bearerToken.slice(-4)
    : '<not set>';

  return (
    <div className="flex gap-6 items-start">
      {/* ═══ LEFT COLUMN: Form ═══ */}
      <div className="flex-1 min-w-0 max-w-[768px]">
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
            {loadStatus && loadStatus.type === 'loading' && (
              <div className="mt-2 flex items-center gap-2 text-[14px] text-[#8b949e]">
                <div className="w-4 h-4 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin shrink-0" />
                {loadStatus.message}
              </div>
            )}
            {loadStatus && loadStatus.type === 'success' && (
              <Banner variant="success" className="mt-2">{loadStatus.message}</Banner>
            )}
            {loadStatus && loadStatus.type === 'error' && (
              <Banner variant="critical" className="mt-2">{loadStatus.message}</Banner>
            )}
          </div>
          <hr className="border-[#30363d] mb-6" />
        </>
      )}

      <div className="bg-[#010409] border border-[#30363d] rounded-md p-5 mb-6">
      {/* Template Name */}
      <div className="mb-6">
        <label className="block text-[14px] font-semibold text-[#e6edf3] mb-1">
          Template name {mode === 'create' && <span className="text-[#f85149]">*</span>}
        </label>
        <p className="flex items-center gap-1.5 text-[12px] text-[#8b949e] mb-2">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
          </svg>
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
        <p className="flex items-center gap-1.5 text-[12px] text-[#8b949e] mb-2">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
          </svg>
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

      <hr className="border-[#21262d] mb-6" />

      {/* Visibility */}
      <div className="mb-6">
        <label className="block text-[14px] font-semibold text-[#e6edf3] mb-1">Visibility</label>
        <p className="flex items-center gap-1.5 text-[12px] text-[#8b949e] mb-3">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
          </svg>
          Control who can access this template config.
        </p>
        <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-[#30363d]">
            <div>
              <div className="text-[14px] font-medium text-[#e6edf3]">Internal</div>
              <div className="text-[12px] text-[#8b949e] mt-0.5">Only visible to internal team members.</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[12px] text-[#8b949e] font-medium">{internal ? 'On' : 'Off'}</span>
              <button type="button" onClick={() => setInternal(!internal)}
                className={`relative w-[48px] h-[24px] rounded-[6px] transition-colors border flex items-center ${
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
                className={`relative w-[48px] h-[24px] rounded-[6px] transition-colors border flex items-center ${
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

      <hr className="border-[#21262d] mb-6" />

      {/* Default Env Config */}
      <div className="mb-6">
        <label className="block text-[14px] font-semibold text-[#e6edf3] mb-1">Default environment config</label>
        <p className="flex items-center gap-1.5 text-[12px] text-[#8b949e] mb-3">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
          </svg>
          Select which env variables to include. Use "Fetch env vars" above, or add them manually.
        </p>

        {variables.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[12px] text-[#8b949e]">{selectedCount} of {variables.length} selected</span>
              <span className="text-[#484f58]">·</span>
              <button onClick={() => selectAll(true)} className="text-[13px] text-[#58a6ff] hover:underline">Select all</button>
              <button onClick={() => selectAll(false)} className="text-[13px] text-[#58a6ff] hover:underline">Deselect all</button>
              <div className="ml-auto flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded-md px-2.5 py-1 transition-colors focus-within:border-[#1f6feb] focus-within:ring-1 focus-within:ring-[#1f6feb]/40">
                <svg className="w-3.5 h-3.5 text-[#484f58]" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
                </svg>
                <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
                  placeholder="Filter..." className="bg-transparent text-[12px] text-[#e6edf3] outline-none placeholder:text-[#484f58] w-56" />
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
      </div>{/* end form card */}

      <hr className="border-[#30363d] mb-6" />

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button onClick={submitConfig} disabled={loading === 'submit'}
          data-testid="submit-config-btn"
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
      {submitStatus && submitStatus.type !== 'loading' && (
        <Banner variant={submitStatus.type === 'success' ? 'success' : 'critical'} className="mt-4">
          {submitStatus.message}
        </Banner>
      )}
      {submitStatus && submitStatus.type === 'loading' && (
        <div className="mt-4 flex items-center gap-2 text-[14px] text-[#8b949e]">
          <div className="w-4 h-4 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin shrink-0" />
          {submitStatus.message}
        </div>
      )}
      </div>{/* end left column */}

      {/* ═══ RIGHT COLUMN: API Preview ═══ */}
      <div className="w-[420px] shrink-0 sticky top-8 self-start">
        {/* Endpoint bar — Postman-style */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[13px] font-semibold px-2.5 py-[5px] rounded-md border shrink-0 ${
            apiMethod === 'PUT'
              ? 'text-[#f0883e] bg-[#f0883e]/10 border-[#f0883e]/30'
              : 'text-[#3fb950] bg-[#238636]/10 border-[#238636]/30'
          }`}>
            {apiMethod}
          </span>
          <div className="flex-1 min-w-0 px-3 py-[5px] bg-[#0d1117] border border-[#30363d] rounded-md text-[13px] text-[#8b949e] font-mono truncate" title={apiEndpoint}>
            {apiEndpoint || '/internal/category-config'}
          </div>
          <button onClick={submitConfig} disabled={loading === 'submit'}
            className="px-4 py-[5px] bg-[#1f6feb] hover:bg-[#388bfd] text-white text-[14px] font-medium rounded-md border border-[#1f6feb] disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1.5">
            {loading === 'submit' && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading === 'submit' ? 'Sending...' : 'Send'}
          </button>
        </div>

        {/* Request body */}
        <div className="border border-[#30363d] rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
            <span className="text-[13px] font-medium text-[#e6edf3]">Request Body</span>
            <button
              onClick={() => navigator.clipboard.writeText(JSON.stringify(requestBody, null, 2))}
              className="text-[12px] text-[#8b949e] hover:text-[#e6edf3] transition-colors">
              Copy
            </button>
          </div>
          <CodeMirror
            value={JSON.stringify(requestBody, null, 2)}
            extensions={[json(), syntaxHighlighting(requestHighlight), requestEditorTheme]}
            editable={false}
            basicSetup={{
              lineNumbers: false,
              foldGutter: false,
              highlightActiveLine: false,
              highlightActiveLineGutter: false,
            }}
            style={{ maxHeight: '400px', overflow: 'auto' }}
          />
        </div>

        {/* Response — appears after send */}
        {(result || (submitStatus && submitStatus.type === 'error')) && (
          <div className="mt-3 border border-[#30363d] rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
              <span className="text-[13px] font-medium text-[#e6edf3]">Response</span>
              {result && <span className="text-[13px] font-mono text-[#3fb950]">HTTP 200</span>}
              {submitStatus?.type === 'error' && !result && <span className="text-[13px] font-mono text-[#f85149]">Error</span>}
            </div>
            <pre className="px-3.5 py-3 text-[13px] font-mono leading-[1.6] overflow-x-auto max-h-[350px] overflow-y-auto bg-[#0d1117]">
              {result ? (
                <JsonHighlight json={result} theme="response" />
              ) : submitStatus?.type === 'error' ? (
                <code className="text-[#f85149]">{submitStatus.message}</code>
              ) : null}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
