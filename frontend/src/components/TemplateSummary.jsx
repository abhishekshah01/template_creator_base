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

      <div className="bg-gh-surface border border-gh-border rounded-md p-5 mb-3">
        <p className="text-xs text-gh-text-secondary mb-3">
          Generate an app summary for a template. This calls the agent service to produce metadata and description.
        </p>
        <div className="mb-3">
          <label className="block text-[11px] text-gh-text-secondary uppercase tracking-wider mb-1 font-medium">Template Name</label>
          <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generateSummary()}
            placeholder="e.g. real-estate-v0"
            className="w-full px-3 py-2 bg-gh-canvas border border-gh-border rounded-md text-sm text-gh-text outline-none focus:border-gh-accent-blue placeholder:text-gh-text-muted" />
        </div>

        {!bearerToken && (
          <div className="mb-3 px-3.5 py-2.5 rounded-md text-xs flex items-center gap-2 border bg-gh-accent-amber/15 text-gh-accent-amber-text border-gh-accent-amber/30">
            Set your API token in the sidebar before generating.
          </div>
        )}

        <button onClick={generateSummary} disabled={loading}
          className="px-4 py-2 bg-gh-accent-blue text-white text-sm rounded-md hover:bg-gh-accent-blue disabled:opacity-50 flex items-center gap-2">
          {loading && <div className="w-3.5 h-3.5 border-2 border-gh-accent-blue/30 border-t-white rounded-full animate-spin" />}
          {loading ? 'Generating...' : 'Generate Summary'}
        </button>

        {status && (
          <div className={`mt-3 px-3.5 py-2.5 rounded-md text-xs flex items-center gap-2 border ${
            { info: 'bg-gh-accent-blue/10 text-gh-accent-blue-text border-gh-accent-blue/30',
              success: 'bg-gh-accent-green/10 text-gh-accent-green-text border-gh-accent-green/30',
              error: 'bg-gh-accent-red/10 text-gh-accent-red-text border-gh-accent-red/30',
              loading: 'bg-gh-surface text-gh-text-secondary border-gh-border',
            }[status.type] || ''}`}>
            {status.type === 'loading' && (
              <div className="w-3.5 h-3.5 border-2 border-gh-text-muted border-t-gh-accent-blue-text rounded-full animate-spin shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        {result && (
          <div className="mt-4 p-3.5 bg-gh-accent-green/10 border border-gh-accent-green/30 rounded-md">
            <div className="text-sm text-gh-accent-green-text font-medium flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" /> Summary generated!
            </div>
            <pre className="text-xs text-gh-accent-green-text bg-gh-canvas px-3.5 py-2.5 rounded-md overflow-auto max-h-[400px] font-mono whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}
