import { useState, useRef, useEffect } from 'react';
import { api, AuthError } from '../api';
import { CheckCircle } from './Icons';

export default function UpdateCategory({ bearerToken, onTokenExpired }) {
  const [jobId, setJobId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [internal, setInternal] = useState(true);
  const [isPublic, setIsPublic] = useState(false);

  const [envVars, setEnvVars] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [editedValues, setEditedValues] = useState({});

  const [loading, setLoading] = useState('');
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  const listRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const el = listRef.current;
    if (!el || Object.keys(envVars).length === 0) return;
    const check = () => setShowScrollHint(el.scrollHeight > el.clientHeight && el.scrollTop + el.clientHeight < el.scrollHeight - 10);
    check();
    el.addEventListener('scroll', check);
    return () => el.removeEventListener('scroll', check);
  }, [envVars]);

  async function fetchEnvVars() {
    if (!jobId.trim()) { setStatus({ message: 'Please enter a Job ID', type: 'error' }); return; }

    setLoading('fetch');
    setStatus({ message: 'Fetching env variables from pod...', type: 'loading' });
    try {
      const data = await api.getEnvVariables(jobId);
      setEnvVars(data.env_variables || {});
      setEditedValues({ ...data.env_variables });
      setSelected(new Set());
      const count = Object.keys(data.env_variables || {}).length;
      setStatus({ message: `Found ${count} env variable(s)`, type: 'success' });
    } catch (e) {
      setStatus({ message: e.message, type: 'error' });
    } finally {
      setLoading('');
    }
  }

  function toggleVar(key) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function selectAll(checked) {
    setSelected(checked ? new Set(Object.keys(envVars)) : new Set());
  }

  function updateEditedValue(key, value) {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  }

  async function submitConfig() {
    if (!templateName.trim()) { setStatus({ message: 'Please enter a Template Name', type: 'error' }); return; }
    if (!bearerToken) { setStatus({ message: 'Please set your API token in the sidebar first.', type: 'error' }); return; }
    if (!jobId.trim()) { setStatus({ message: 'Please enter a Job ID', type: 'error' }); return; }

    const defaultEnvConfig = {};
    for (const key of selected) {
      defaultEnvConfig[key] = editedValues[key] ?? envVars[key] ?? '';
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

  const envKeys = Object.keys(envVars);

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

      {/* Env Variables */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-3">
        <h3 className="text-sm font-medium mb-3">Default Env Config</h3>
        <p className="text-xs text-slate-500 mb-3">
          Fetch env variables from the job's pod, then select which ones to include in the category config.
        </p>
        <button onClick={fetchEnvVars} disabled={loading === 'fetch'}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mb-3">
          {loading === 'fetch' && <div className="w-3.5 h-3.5 border-2 border-blue-300/30 border-t-white rounded-full animate-spin" />}
          {loading === 'fetch' ? 'Fetching...' : 'Fetch Env Variables'}
        </button>

        {envKeys.length > 0 && (
          <>
            <div className="flex gap-2 mb-2">
              <button onClick={() => selectAll(true)} className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-400 text-xs rounded-lg hover:bg-slate-700 hover:text-slate-200">Select All</button>
              <button onClick={() => selectAll(false)} className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-400 text-xs rounded-lg hover:bg-slate-700 hover:text-slate-200">Deselect All</button>
              <span className="text-[11px] text-slate-500 self-center ml-auto">{selected.size} of {envKeys.length} selected</span>
            </div>
            <div ref={listRef} className={`max-h-[350px] overflow-y-auto border rounded-lg ${showScrollHint ? 'border-blue-500 border-b-2' : 'border-slate-700'}`}>
              {envKeys.map(key => (
                <div key={key} className="flex items-start gap-2.5 px-3.5 py-2.5 border-b border-slate-900 last:border-b-0 hover:bg-slate-700/50 transition-colors">
                  <input type="checkbox" checked={selected.has(key)} onChange={() => toggleVar(key)}
                    className="w-4 h-4 accent-blue-600 mt-1.5 shrink-0 cursor-pointer" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-slate-300 mb-1">{key}</div>
                    <input type="text"
                      value={editedValues[key] ?? ''}
                      onChange={e => updateEditedValue(key, e.target.value)}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-slate-400 outline-none focus:border-blue-500 font-mono" />
                  </div>
                </div>
              ))}
            </div>
            {showScrollHint && <p className="text-center text-[11px] text-slate-500 py-1.5">Scroll to see all {envKeys.length} variables</p>}
          </>
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
