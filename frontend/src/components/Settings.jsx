import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Settings({ activeEnv, standardEnvs, onSwitchEnv, envConfig }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  // Editable overrides
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    loadConfig();
  }, [activeEnv]);

  async function loadConfig() {
    setLoading(true);
    try {
      const data = await api.getEnvironments();
      setConfig(data.active_config);
      setOverrides({});
    } catch (e) {
      setStatus({ message: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function setOverride(key, value) {
    setOverrides(prev => ({ ...prev, [key]: value }));
  }

  function getVal(key) {
    return overrides[key] !== undefined ? overrides[key] : (config?.[key] || '');
  }

  const hasChanges = Object.keys(overrides).length > 0;

  const inputCls = "w-full px-3 py-[5px] bg-[#0d1117] border border-[#30363d] rounded-md text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb] focus:shadow-[0_0_0_3px_rgba(31,111,235,0.3)] placeholder:text-[#484f58] font-mono transition-shadow";
  const readOnlyCls = "w-full px-3 py-[5px] bg-[#161b22] border border-[#21262d] rounded-md text-[14px] text-[#8b949e] font-mono cursor-not-allowed";

  if (loading) {
    return (
      <div className="max-w-[680px] flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin" />
        <span className="ml-3 text-[14px] text-[#8b949e]">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[680px]">
      {/* Page header */}
      <h1 className="text-[20px] font-semibold text-[#e6edf3] mb-1">Settings</h1>
      <p className="text-[13px] text-[#8b949e] mb-6">Manage environment configuration and API endpoints.</p>

      {/* ── General ──────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-[16px] font-semibold text-[#e6edf3] pb-2 border-b border-[#21262d] mb-4">General</h2>

        <div className="mb-5">
          <label className="block text-[14px] font-semibold text-[#e6edf3] mb-1">Active environment</label>
          <p className="text-[12px] text-[#8b949e] mb-2">Select the environment this dashboard connects to. Ephemeral environments auto-generate URLs from the name.</p>

          {/* Environment selector */}
          <div className="flex gap-2 mb-3">
            {standardEnvs.map(env => (
              <button key={env.name} onClick={() => onSwitchEnv(env.name)}
                className={`px-3 py-[5px] rounded-md text-[14px] font-medium border transition-colors ${
                  activeEnv === env.name
                    ? 'bg-[#1f6feb]/15 text-[#58a6ff] border-[#1f6feb]/40'
                    : 'bg-[#21262d] text-[#c9d1d9] border-[#30363d] hover:bg-[#30363d]'
                }`}>
                {env.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-[13px] text-[#8b949e]">Ephemeral:</span>
            <div className="flex gap-1.5 flex-1">
              <span className="text-[14px] text-[#484f58] self-center">eph-</span>
              <input type="text"
                defaultValue={activeEnv?.startsWith('eph-') ? activeEnv.replace('eph-', '') : ''}
                placeholder="e.g. leadgen1"
                onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) onSwitchEnv(`eph-${e.target.value.trim()}`); }}
                className="flex-1 px-3 py-[5px] bg-[#0d1117] border border-[#30363d] rounded-md text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb] placeholder:text-[#484f58] font-mono" />
            </div>
          </div>

          {/* Current env info */}
          <div className="mt-3 flex items-center gap-2">
            <span className="w-[8px] h-[8px] rounded-full bg-[#3fb950]" />
            <span className="text-[13px] text-[#8b949e]">Currently connected to</span>
            <span className="text-[13px] font-semibold text-[#e6edf3]">{activeEnv}</span>
            <span className="text-[11px] px-[6px] py-[1px] rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]">
              {config?.type || 'ephemeral'}
            </span>
          </div>
        </div>
      </div>

      {/* ── API Endpoints ──────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-[16px] font-semibold text-[#e6edf3] pb-2 border-b border-[#21262d] mb-4">API Endpoints</h2>
        <p className="text-[12px] text-[#8b949e] mb-4">These URLs are auto-configured when you switch environments. They can be overridden for custom setups.</p>

        <div className="border border-[#30363d] rounded-md overflow-hidden divide-y divide-[#21262d]">
          {/* Base URL */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[14px] font-medium text-[#e6edf3]">Base URL</label>
              <span className="text-[11px] text-[#484f58]">Category Config API</span>
            </div>
            <input type="text" value={getVal('api_url')} readOnly className={readOnlyCls} />
            <p className="text-[11px] text-[#484f58] mt-1">Auto-configured from environment selection.</p>
          </div>

          {/* Pause URL */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[14px] font-medium text-[#e6edf3]">Pause URL</label>
              <span className="text-[11px] text-[#484f58]">Pause/Resume Jobs</span>
            </div>
            <input type="text" value={getVal('pause_url')} readOnly className={readOnlyCls} />
          </div>

          {/* Envcore URL */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[14px] font-medium text-[#e6edf3]">Envcore URL</label>
              <span className="text-[11px] text-[#484f58]">Pod Execution</span>
            </div>
            <input type="text" value={getVal('envcore_url')} readOnly className={readOnlyCls} />
            <p className="text-[11px] text-[#484f58] mt-1">Same across all environments.</p>
          </div>

          {/* DB DSN */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[14px] font-medium text-[#e6edf3]">Database</label>
              <span className="text-[11px] text-[#484f58]">PostgreSQL</span>
            </div>
            <input type="text" value={getVal('db_dsn')} readOnly className={readOnlyCls} />
          </div>
        </div>
      </div>

      {/* ── Template Creation ──────────────────────── */}
      <div className="mb-8">
        <h2 className="text-[16px] font-semibold text-[#e6edf3] pb-2 border-b border-[#21262d] mb-4">Template Creation</h2>
        <p className="text-[12px] text-[#8b949e] mb-4">Configuration for the template creation workflow (Step 4).</p>

        <div className="border border-[#30363d] rounded-md overflow-hidden divide-y divide-[#21262d]">
          {/* Source Bucket */}
          <div className="px-4 py-3">
            <label className="block text-[14px] font-medium text-[#e6edf3] mb-1">Source Bucket</label>
            <input type="text" value={getVal('source_bucket')} readOnly className={readOnlyCls} />
            <p className="text-[11px] text-[#484f58] mt-1">GCS bucket containing job snapshots.</p>
          </div>

          {/* Destination Bucket */}
          <div className="px-4 py-3">
            <label className="block text-[14px] font-medium text-[#e6edf3] mb-1">Destination Bucket</label>
            <input type="text" value={getVal('dest_bucket')} readOnly className={readOnlyCls} />
            <p className="text-[11px] text-[#484f58] mt-1">GCS bucket where templates are stored.</p>
          </div>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className={`mb-4 px-3 py-[7px] rounded-md text-[13px] flex items-center gap-2 border ${
          status.type === 'success' ? 'bg-[#238636]/8 text-[#3fb950] border-[#238636]/20' :
          'bg-[#da3633]/8 text-[#f85149] border-[#da3633]/20'
        }`}>
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}
