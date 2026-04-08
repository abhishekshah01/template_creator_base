import { useState } from 'react';
import { api, AuthError } from '../api';
import { CheckCircle } from './Icons';

export default function TemplateSummary({ bearerToken, onTokenExpired }) {
  const [templateName, setTemplateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  async function generateSummary() {
    if (!templateName.trim()) { setStatus({ message: 'Please enter a Template Name', type: 'error' }); return; }
    if (!bearerToken) { setStatus({ message: 'Please set your API token in the sidebar first.', type: 'error' }); return; }

    setLoading(true);
    setStatus({ message: 'Generating template summary (this may take a moment)...', type: 'loading' });
    setResult(null);
    try {
      const data = await api.generateTemplateSummary(templateName, bearerToken);
      setResult(data.response);
      setStatus({ message: 'Summary generated successfully!', type: 'success' });
    } catch (e) {
      if (e instanceof AuthError) onTokenExpired();
      setStatus({ message: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="text-lg font-medium mb-5">Template Summary</h2>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-3">
        <p className="text-xs text-slate-500 mb-3">
          Generate an app summary for a template. This calls the agent service to produce metadata and description.
        </p>
        <div className="mb-3">
          <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1 font-medium">Template Name</label>
          <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generateSummary()}
            placeholder="e.g. real-estate-v0"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500 placeholder:text-slate-600" />
        </div>

        {!bearerToken && (
          <div className="mb-3 px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2 border bg-amber-950/50 text-amber-300 border-amber-900/50">
            Set your API token in the sidebar before generating.
          </div>
        )}

        <button onClick={generateSummary} disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
          {loading && <div className="w-3.5 h-3.5 border-2 border-blue-300/30 border-t-white rounded-full animate-spin" />}
          {loading ? 'Generating...' : 'Generate Summary'}
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
              <CheckCircle className="w-4 h-4" /> Summary generated!
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
