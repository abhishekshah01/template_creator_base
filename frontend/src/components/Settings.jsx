import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Settings({ activeEnv, standardEnvs, onSwitchEnv }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ephInput, setEphInput] = useState('');
  const [showEphInput, setShowEphInput] = useState(false);

  useEffect(() => {
    loadConfig();
    setEphInput('');
    setShowEphInput(false);
  }, [activeEnv]);

  async function loadConfig() {
    setLoading(true);
    try {
      const data = await api.getEnvironments();
      setConfig(data.active_config);
    } catch {} finally {
      setLoading(false);
    }
  }

  function getVal(key) { return config?.[key] || ''; }

  function switchEph() {
    if (ephInput.trim()) onSwitchEnv(`eph-${ephInput.trim()}`);
  }

  const isEph = activeEnv?.startsWith('eph-');
  const readOnlyCls = "w-full px-3 py-[6px] bg-[#161b22] border border-[#21262d] rounded-md text-[15px] text-[#c9d1d9] font-mono cursor-default select-all";

  if (loading) {
    return (
      <div className="max-w-[780px] flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin" />
        <span className="ml-3 text-[15px] text-[#8b949e]">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[780px]">
      <h1 className="text-[24px] font-bold text-[#e6edf3] mb-6">Settings</h1>

      {/* ── General ──────────────────────────────── */}
      <h2 className="text-[20px] font-semibold text-[#e6edf3] pb-3 border-b border-[#30363d] mb-5">General</h2>

      <div className="mb-8">
        <label className="block text-[16px] font-semibold text-[#e6edf3] mb-1">Active environment</label>
        <p className="text-[14px] text-[#8b949e] mb-4">Select the environment this dashboard connects to.</p>

        {/* Unified environment list */}
        <div className="border border-[#30363d] rounded-md overflow-hidden mb-4">
          {/* Standard envs */}
          {standardEnvs.map(env => (
            <button key={env.name} onClick={() => onSwitchEnv(env.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-[#21262d] last:border-b-0 text-left transition-colors ${
                activeEnv === env.name ? 'bg-[#161b22]' : 'hover:bg-[#161b22]'
              }`}>
              <span className={`w-[10px] h-[10px] rounded-full shrink-0 ${activeEnv === env.name ? 'bg-[#3fb950]' : 'bg-[#30363d]'}`} />
              <span className={`text-[15px] font-medium flex-1 ${activeEnv === env.name ? 'text-[#e6edf3]' : 'text-[#8b949e]'}`}>
                {env.label}
              </span>
              <span className="text-[12px] text-[#484f58]">standard</span>
              {activeEnv === env.name && (
                <svg className="w-4 h-4 text-[#3fb950] shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                </svg>
              )}
            </button>
          ))}

          {/* Ephemeral — show active if applicable */}
          {isEph && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#21262d] bg-[#161b22]">
              <span className="w-[10px] h-[10px] rounded-full bg-[#3fb950] shrink-0" />
              <span className="text-[15px] font-medium text-[#e6edf3] flex-1">{activeEnv}</span>
              <span className="text-[12px] text-[#484f58]">ephemeral</span>
              <svg className="w-4 h-4 text-[#3fb950] shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
            </div>
          )}

          {/* Connect to custom eph */}
          <div className="px-4 py-3">
            {!showEphInput ? (
              <button onClick={() => setShowEphInput(true)}
                className="text-[14px] text-[#58a6ff] hover:underline flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
                </svg>
                Connect to ephemeral environment
              </button>
            ) : (
              <div className="flex gap-2 items-center">
                <span className="text-[14px] text-[#484f58] font-mono shrink-0">eph-</span>
                <input type="text" value={ephInput} onChange={e => setEphInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') switchEph(); if (e.key === 'Escape') setShowEphInput(false); }}
                  placeholder="e.g. leadgen1"
                  autoFocus
                  className="flex-1 px-3 py-[5px] bg-[#0d1117] border border-[#30363d] rounded-md text-[15px] text-[#e6edf3] outline-none focus:border-[#1f6feb] focus:shadow-[0_0_0_3px_rgba(31,111,235,0.3)] placeholder:text-[#484f58] font-mono" />
                <button onClick={switchEph} disabled={!ephInput.trim()}
                  className="px-4 py-[5px] bg-[#238636] text-white text-[14px] font-medium rounded-md hover:bg-[#2ea043] disabled:opacity-50 transition-colors shrink-0">
                  Switch
                </button>
                <button onClick={() => { setShowEphInput(false); setEphInput(''); }}
                  className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Connected status — purple info box like GitHub */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-md border border-[#8957e5]/30 bg-[#8957e5]/8">
          <svg className="w-5 h-5 text-[#bc8cff] shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.75 7.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" />
            <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z" />
          </svg>
          <span className="text-[14px] text-[#e6edf3]">
            Connected to <span className="font-semibold">{activeEnv}</span>
            <span className="ml-2 text-[12px] px-[7px] py-[2px] rounded-full font-medium"
              style={isEph
                ? { backgroundColor: 'rgba(137,87,229,0.15)', color: '#bc8cff', border: '1px solid rgba(137,87,229,0.35)' }
                : { backgroundColor: 'rgba(31,111,235,0.15)', color: '#58a6ff', border: '1px solid rgba(31,111,235,0.35)' }
              }>
              {config?.type || 'ephemeral'}
            </span>
            <span className="text-[#8b949e] ml-1"> — all API calls use this environment's endpoints.</span>
          </span>
        </div>
      </div>

      {/* ── API Endpoints ──────────────────────────── */}
      <h2 className="text-[20px] font-semibold text-[#e6edf3] pb-3 border-b border-[#30363d] mb-5">API Endpoints</h2>
      <p className="text-[14px] text-[#8b949e] mb-4">Auto-configured when you switch environments. All API calls use these endpoints.</p>

      <div className="border border-[#30363d] rounded-md overflow-hidden divide-y divide-[#21262d] mb-8">
        {[
          { label: 'Base URL', key: 'api_url', desc: 'Category Config API' },
          { label: 'Pause URL', key: 'pause_url', desc: 'Pause/Resume Jobs' },
          { label: 'Envcore URL', key: 'envcore_url', desc: 'Pod Execution', note: 'Same across all environments.' },
          { label: 'Database', key: 'db_dsn', desc: 'PostgreSQL' },
        ].map(field => (
          <div key={field.key} className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[15px] font-semibold text-[#e6edf3]">{field.label}</label>
              <span className="text-[12px] text-[#484f58]">{field.desc}</span>
            </div>
            <input type="text" value={getVal(field.key)} readOnly className={readOnlyCls} />
            {field.note && <p className="text-[13px] text-[#484f58] mt-1.5">{field.note}</p>}
          </div>
        ))}
      </div>

      {/* ── Template Creation ──────────────────────── */}
      <h2 className="text-[20px] font-semibold text-[#e6edf3] pb-3 border-b border-[#30363d] mb-5">Template Creation</h2>
      <p className="text-[14px] text-[#8b949e] mb-4">Configuration for creating templates from job snapshots.</p>

      <div className="border border-[#30363d] rounded-md overflow-hidden divide-y divide-[#21262d] mb-8">
        {[
          { label: 'Source Bucket', key: 'source_bucket', note: 'GCS bucket containing job snapshots.' },
          { label: 'Destination Bucket', key: 'dest_bucket', note: 'GCS bucket where templates are stored.' },
        ].map(field => (
          <div key={field.key} className="px-5 py-4">
            <label className="block text-[15px] font-semibold text-[#e6edf3] mb-2">{field.label}</label>
            <input type="text" value={getVal(field.key)} readOnly className={readOnlyCls} />
            <p className="text-[13px] text-[#484f58] mt-1.5">{field.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
