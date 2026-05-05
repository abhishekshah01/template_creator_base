import { useState } from 'react';
import { api, AuthError } from '../api';
import { usePersistedState } from '../hooks/usePersistedState';
import Banner from './Banner';

export default function TemplateSummary({ bearerToken, onTokenExpired }) {
  const [templateName, setTemplateName] = usePersistedState('tS.templateName', '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [result, setResult] = usePersistedState('tS.result', null);

  async function generateSummary() {
    if (!templateName.trim()) { setStatus({ message: 'Please enter a template name.', type: 'error' }); return; }
    if (!bearerToken) { setStatus({ message: 'Set your API token in Settings before generating.', type: 'error' }); return; }

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

  const statusVariant = { error: 'critical', success: 'success', loading: 'info', info: 'info' };

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-[#e6edf3]">Generate Summary</h1>
        <p className="text-[14px] text-[#8b949e] mt-1">
          Generate an app summary for a template. This calls the agent service to produce metadata and description.
        </p>
      </div>

      {/* Token warning */}
      {!bearerToken && (
        <Banner variant="warning" className="mb-4">
          Set your API token in Settings before generating a summary.
        </Banner>
      )}

      {/* Form card */}
      <div className="border border-[#30363d] rounded-[6px] overflow-hidden">
        {/* Card header */}
        <div className="px-4 py-3 bg-[#161b22] border-b border-[#30363d]">
          <h2 className="text-[14px] font-semibold text-[#e6edf3]">Template details</h2>
        </div>

        {/* Card body */}
        <div className="px-4 py-4 bg-[#0d1117]">
          <div className="mb-4">
            <label className="block text-[14px] font-semibold text-[#e6edf3] mb-1.5">
              Template name <span className="text-[#f85149]">*</span>
            </label>
            <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateSummary()}
              placeholder="e.g. real-estate-v0"
              className="w-full px-3 py-[5px] bg-[#0d1117] border border-[#30363d] rounded-[6px] text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb] focus:shadow-[0_0_0_3px_rgba(31,111,235,0.3)] placeholder:text-[#484f58] transition-shadow" />
            <p className="text-[12px] text-[#8b949e] mt-1.5">The unique identifier for the template to generate a summary for.</p>
          </div>

          <button onClick={generateSummary} disabled={loading}
            data-testid="generate-summary-btn"
            className="px-4 py-[5px] bg-[#238636] text-white text-[14px] font-medium rounded-[6px] hover:bg-[#2ea043] disabled:opacity-50 flex items-center gap-2 transition-colors">
            {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Generating...' : 'Generate Summary'}
          </button>

          {/* Status banner */}
          {status && (
            <div className="mt-4">
              {status.type === 'loading' ? (
                <Banner variant="info">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-[#30363d] border-t-[#0576ff] rounded-full animate-spin shrink-0" />
                    {status.message}
                  </div>
                </Banner>
              ) : (
                <Banner variant={statusVariant[status.type] || 'info'}>
                  {status.message}
                </Banner>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="mt-4 border border-[#238636]/40 rounded-[6px] overflow-hidden">
          <div className="px-4 py-3 bg-[#238636]/10 border-b border-[#238636]/40 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#388f3f]" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
            </svg>
            <span className="text-[14px] font-semibold text-[#e6edf3]">Summary generated</span>
          </div>
          <pre className="px-4 py-4 bg-[#0d1117] text-[13px] text-[#c9d1d9] font-mono leading-relaxed overflow-auto max-h-[500px] whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
