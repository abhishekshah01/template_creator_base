import { useState, useEffect } from 'react';
import { api, AuthError } from '../../api';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ConfigDetail({ configId, onNavigate, bearerToken, onTokenExpired }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (configId && bearerToken) fetchConfig();
  }, [configId]);

  async function fetchConfig() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getCategoryConfig(configId, bearerToken);
      setConfig(data);
    } catch (e) {
      if (e instanceof AuthError) onTokenExpired?.();
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin" />
        <span className="ml-3 text-[14px] text-[#8b949e]">Loading config...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <button onClick={() => onNavigate('config-all')}
          className="flex items-center gap-1.5 text-[14px] text-[#8b949e] hover:text-[#58a6ff] transition-colors mb-4">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z" /></svg>
          Back to All Configs
        </button>
        <div className="px-4 py-3 rounded-md text-[14px] border bg-[#da3633]/8 text-[#f85149] border-[#da3633]/20">{error}</div>
      </div>
    );
  }

  if (!config) return null;

  const envVars = Object.entries(config.default_env_config || {});

  return (
    <div>
      {/* Back link */}
      <button onClick={() => onNavigate('config-all')}
        className="flex items-center gap-1.5 text-[14px] text-[#8b949e] hover:text-[#58a6ff] transition-colors mb-4">
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z" /></svg>
        Back to All Configs
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-[24px] font-bold text-[#e6edf3] leading-tight">{config.template_name}</h1>
        <button onClick={() => onNavigate('config-edit', configId)}
          className="px-3 py-[5px] bg-[#21262d] border border-[#30363d] text-[14px] text-[#c9d1d9] rounded-md hover:bg-[#30363d] hover:border-[#484f58] transition-colors flex items-center gap-1.5 shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z" />
          </svg>
          Edit
        </button>
      </div>

      {/* Labels + meta */}
      <div className="flex items-center gap-2 mb-4">
        {config.internal && (
          <span className="text-[12px] font-medium px-[8px] py-[2px] rounded-full leading-tight"
            style={{ backgroundColor: 'rgba(31,111,235,0.15)', color: '#58a6ff', border: '1px solid rgba(31,111,235,0.4)' }}>
            internal
          </span>
        )}
        {config.public && (
          <span className="text-[12px] font-medium px-[8px] py-[2px] rounded-full leading-tight"
            style={{ backgroundColor: 'rgba(35,134,54,0.15)', color: '#3fb950', border: '1px solid rgba(35,134,54,0.4)' }}>
            public
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-[14px] text-[#8b949e] mb-6 pb-4 border-b border-[#30363d]">
        <span className="font-mono text-[#484f58]">#{config.id}</span>
        {config.created_at && (
          <>
            <span className="text-[#30363d]">·</span>
            <span>Created {timeAgo(config.created_at)}</span>
          </>
        )}
        {config.updated_at && config.updated_at !== config.created_at && (
          <>
            <span className="text-[#30363d]">·</span>
            <span>Updated {timeAgo(config.updated_at)}</span>
          </>
        )}
      </div>

      {/* Details table */}
      <div className="border border-[#30363d] rounded-md overflow-hidden mb-6">
        <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d]">
          <span className="text-[14px] font-semibold text-[#e6edf3]">Details</span>
        </div>
        <div className="divide-y divide-[#21262d]">
          <div className="flex px-4 py-2.5">
            <span className="w-[160px] text-[13px] text-[#8b949e] shrink-0">ID</span>
            <span className="text-[14px] text-[#e6edf3] font-mono">{config.id}</span>
          </div>
          <div className="flex px-4 py-2.5">
            <span className="w-[160px] text-[13px] text-[#8b949e] shrink-0">Template name</span>
            <span className="text-[14px] text-[#e6edf3] font-mono">{config.template_name}</span>
          </div>
          {config.summary_source_job_id && (
            <div className="flex px-4 py-2.5">
              <span className="w-[160px] text-[13px] text-[#8b949e] shrink-0">Source Job ID</span>
              <span className="text-[14px] text-[#e6edf3] font-mono">{config.summary_source_job_id}</span>
            </div>
          )}
          {config.created_at && (
            <div className="flex px-4 py-2.5">
              <span className="w-[160px] text-[13px] text-[#8b949e] shrink-0">Created</span>
              <span className="text-[14px] text-[#e6edf3]">{timeAgo(config.created_at)} · {new Date(config.created_at).toLocaleString()}</span>
            </div>
          )}
          {config.updated_at && (
            <div className="flex px-4 py-2.5">
              <span className="w-[160px] text-[13px] text-[#8b949e] shrink-0">Updated</span>
              <span className="text-[14px] text-[#e6edf3]">{timeAgo(config.updated_at)} · {new Date(config.updated_at).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Env config */}
      {envVars.length > 0 && (
        <div className="mb-6">
          <div className="border border-[#30363d] rounded-md overflow-hidden">
            <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
              <span className="text-[14px] font-semibold text-[#e6edf3]">Default environment config</span>
              <span className="text-[12px] text-[#8b949e]">{envVars.length} variable{envVars.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 border-b border-[#30363d] text-[12px] text-[#8b949e] font-medium bg-[#161b22]">
              <div className="w-[180px] shrink-0">Key</div>
              <div className="flex-1">Value</div>
            </div>
            {envVars.map(([key, value]) => (
              <div key={key} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#21262d] last:border-b-0 hover:bg-[#161b22] transition-colors">
                <span className="w-[180px] shrink-0 text-[14px] font-mono text-[#58a6ff]">{key}</span>
                <span className="text-[14px] font-mono text-[#c9d1d9] truncate">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* App summary */}
      {config.config?.app_summary && (
        <div className="mb-6">
          <div className="border border-[#30363d] rounded-md overflow-hidden">
            <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d]">
              <span className="text-[14px] font-semibold text-[#e6edf3]">App summary</span>
            </div>
            <div className="px-5 py-4 text-[14px] text-[#c9d1d9] leading-[1.6] whitespace-pre-wrap max-h-[400px] overflow-y-auto">
              {config.config.app_summary}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
