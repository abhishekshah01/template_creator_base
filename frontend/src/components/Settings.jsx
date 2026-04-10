import { useState, useEffect } from 'react';
import { api } from '../api';

// ── Icons ──────────────────────────────────────────────────────────────────────
function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}
function EyeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z" />
    </svg>
  );
}
function EyeOffIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M.143 2.31a.75.75 0 0 1 1.047-.167l14.5 10.5a.75.75 0 1 1-.88 1.214l-2.248-1.628C11.346 13.19 9.792 14 8 14c-1.981 0-3.67-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.619 1.619 0 0 1 0-1.798c.353-.533.995-1.364 1.861-2.18L.31 3.357A.75.75 0 0 1 .143 2.31Zm5.386 4.394-1.326-.96a6.1 6.1 0 0 0-.554.638c-.58.873-.58 1.28 0 2.152C4.406 9.773 5.92 12.5 8 12.5c1.045 0 2.01-.417 2.87-1.058L9.15 10.17a2 2 0 0 1-2.623-3.467ZM8 3.5c-.983 0-1.865.281-2.66.674l1.123.813A4.5 4.5 0 0 1 8 4.5c1.473 0 2.825.742 3.955 1.715 1.124.967 1.954 2.096 2.366 2.717a.12.12 0 0 1 0 .136c-.268.403-.694.977-1.263 1.578l1.08.782c.703-.784 1.256-1.587 1.592-2.096a1.619 1.619 0 0 0 0-1.798c-.45-.677-1.367-1.931-2.637-3.022C11.671 2.992 9.981 2 8 2Z" />
    </svg>
  );
}
function XIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}
function CopyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
      <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
    </svg>
  );
}
function ServerIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75V5a1.75 1.75 0 0 1-1.75 1.75H1.75A1.75 1.75 0 0 1 0 5V2.75C0 1.784.784 1 1.75 1ZM1.5 2.75v2.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25ZM1.75 7h12.5c.966 0 1.75.784 1.75 1.75v2.5A1.75 1.75 0 0 1 14.25 13H1.75A1.75 1.75 0 0 1 0 11.25v-2.5C0 7.784.784 7 1.75 7Zm-.25 1.75v2.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Z" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
// localStorage helpers
function loadEphHistory() {
  try { return JSON.parse(localStorage.getItem('eph_history') || '[]'); } catch { return []; }
}
function saveEphHistory(arr) {
  localStorage.setItem('eph_history', JSON.stringify(arr.slice(0, 5)));
}

export default function Settings({ activeEnv, standardEnvs, onSwitchEnv, envConfig, bearerToken = '', onTokenChange }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ephInput, setEphInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [ephHistory, setEphHistory] = useState(loadEphHistory);

  useEffect(() => {
    loadConfig();
    setEphInput('');
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

  function connectEph() {
    if (!ephInput.trim()) return;
    const name = `eph-${ephInput.trim()}`;
    onSwitchEnv(name);
    const updated = [name, ...ephHistory.filter(e => e !== name)].slice(0, 5);
    setEphHistory(updated);
    saveEphHistory(updated);
    setEphInput('');
  }

  function connectFromHistory(name) {
    onSwitchEnv(name);
    const updated = [name, ...ephHistory.filter(e => e !== name)].slice(0, 5);
    setEphHistory(updated);
    saveEphHistory(updated);
  }

  function removeFromHistory(name, e) {
    e.stopPropagation();
    const updated = ephHistory.filter(h => h !== name);
    setEphHistory(updated);
    saveEphHistory(updated);
  }

  function handleCopyToken() {
    if (!bearerToken) return;
    navigator.clipboard.writeText(bearerToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleCopyField(key, value) {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 1800);
    });
  }

  const isEph = activeEnv?.startsWith('eph-');
  const readOnlyCls = "w-full px-3 py-[6px] bg-[#0d1117] border border-[#21262d] rounded-md text-[14px] text-[#c9d1d9] font-mono cursor-default select-all";

  if (loading) {
    return (
      <div className="max-w-[760px] flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin" />
        <span className="ml-3 text-[15px] text-[#8b949e]">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[760px] space-y-10">
      {/* Page Header */}
      <div>
        <h1 className="text-[24px] font-bold text-[#e6edf3]">Settings</h1>
        <p className="text-[14px] text-[#8b949e] mt-1">Configure environments, credentials, and system preferences.</p>
      </div>

      {/* ── Active Environment ──────────────────────────── */}
      <section>
        <div className="pb-3 border-b border-[#21262d] mb-5">
          <h2 className="text-[17px] font-semibold text-[#e6edf3]">Active Environment</h2>
          <p className="text-[13px] text-[#8b949e] mt-0.5">All API calls use the selected environment's endpoints.</p>
        </div>

        {/* Unified env list — flat rows, no colored cards */}
        <div className="border border-[#30363d] rounded-md overflow-hidden divide-y divide-[#21262d] mb-4">
          {standardEnvs.map(env => {
            const isActive = activeEnv === env.name;
            return (
              <button key={env.name} onClick={() => onSwitchEnv(env.name)}
                data-testid={`env-card-${env.name}`}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? 'bg-[#161b22]' : 'hover:bg-[#161b22]'}`}>
                <span className="w-3.5 flex items-center justify-center shrink-0">
                  {isActive && <CheckIcon className="w-3.5 h-3.5 text-[#3fb950]" />}
                </span>
                <span className={`flex-1 text-[14px] ${isActive ? 'text-[#e6edf3] font-medium' : 'text-[#c9d1d9]'}`}>{env.label}</span>
                <span className="text-[12px] text-[#6e7681]">standard</span>
              </button>
            );
          })}

          {/* Active ephemeral row */}
          {isEph && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#161b22]">
              <span className="w-3.5 flex items-center justify-center shrink-0">
                <CheckIcon className="w-3.5 h-3.5 text-[#3fb950]" />
              </span>
              <span className="flex-1 text-[14px] text-[#e6edf3] font-medium font-mono">{activeEnv}</span>
              <span className="text-[12px] text-[#6e7681] mr-3">ephemeral</span>
              <button onClick={() => onSwitchEnv(standardEnvs[0]?.name || 'dev')}
                className="text-[12px] text-[#6e7681] hover:text-[#f85149] transition-colors">
                disconnect
              </button>
            </div>
          )}
        </div>

        {/* Ephemeral connect area */}
        <div className="border border-[#30363d] rounded-md overflow-hidden">
          <div className="px-4 py-3 bg-[#161b22] border-b border-[#21262d]">
            <span className="text-[13px] font-medium text-[#e6edf3]">
              {isEph ? 'Switch ephemeral environment' : 'Connect to ephemeral'}
            </span>
            <p className="text-[12px] text-[#6e7681] mt-0.5">Temporary environments for active job sessions.</p>
          </div>
          <div className="px-4 py-3">
            {/* Recent history — neutral monospace pills */}
            {ephHistory.length > 0 && (
              <div className="mb-3">
                <p className="text-[12px] text-[#6e7681] mb-2">Recent</p>
                <div className="flex flex-wrap gap-1.5">
                  {ephHistory.map(env => {
                    const isActiveEnv = activeEnv === env;
                    return (
                      <button key={env} onClick={() => connectFromHistory(env)}
                        data-testid={`eph-history-${env}`}
                        className={`group flex items-center gap-1 px-2.5 py-[4px] rounded-md text-[12px] font-mono border transition-colors ${
                          isActiveEnv
                            ? 'bg-[#21262d] text-[#e6edf3] border-[#484f58]'
                            : 'text-[#8b949e] border-[#30363d] hover:bg-[#21262d] hover:text-[#c9d1d9] hover:border-[#484f58]'
                        }`}>
                        {isActiveEnv && <CheckIcon className="w-3 h-3 text-[#3fb950] shrink-0" />}
                        <span>{env}</span>
                        <span onClick={e => removeFromHistory(env, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-[#6e7681] hover:text-[#f85149]">
                          <XIcon className="w-3 h-3" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Connect input */}
            <div className="flex items-stretch border border-[#30363d] rounded-md overflow-hidden focus-within:border-[#58a6ff] transition-colors">
              <span className="px-3 py-2 text-[13px] font-mono text-[#6e7681] bg-[#161b22] border-r border-[#30363d] shrink-0 flex items-center">eph-</span>
              <input type="text" value={ephInput} onChange={e => setEphInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') connectEph(); }}
                placeholder="environment-name"
                data-testid="eph-env-input"
                className="flex-1 px-3 py-2 bg-[#0d1117] text-[13px] text-[#e6edf3] font-mono outline-none placeholder:text-[#484f58]"
              />
              <button onClick={connectEph} disabled={!ephInput.trim()}
                data-testid="eph-connect-btn"
                className="px-4 py-2 bg-[#21262d] text-[#e6edf3] text-[13px] font-medium border-l border-[#30363d] hover:bg-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                Connect
              </button>
            </div>
          </div>
        </div>

        {/* Status — minimal one-liner */}
        <div className="mt-3 flex items-center gap-2 px-1">
          <span className="w-2 h-2 rounded-full bg-[#3fb950] shrink-0" />
          <span className="text-[12px] text-[#6e7681]">
            Connected to <span className="text-[#c9d1d9] font-medium">{activeEnv}</span>
            <span className="ml-1.5 text-[#484f58]">· {config?.type || (isEph ? 'ephemeral' : 'standard')}</span>
          </span>
        </div>
      </section>

      {/* ── Secrets & Variables ─────────────────────────── */}
      <section>
        <div className="pb-3 border-b border-[#21262d] mb-5">
          <h2 className="text-[17px] font-semibold text-[#e6edf3]">Secrets &amp; Variables</h2>
          <p className="text-[13px] text-[#8b949e] mt-0.5">Credentials stored locally in your browser — never transmitted to our servers.</p>
        </div>

        <div className="border border-[#30363d] rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#161b22] border-b border-[#21262d] flex items-center justify-between">
            <div>
              <div className="text-[14px] font-semibold text-[#e6edf3]">Bearer Token</div>
              <div className="text-[12px] text-[#8b949e] mt-0.5">Authenticates requests to the Category Config API</div>
            </div>
            <span data-testid="token-status-badge"
              className={`flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full border font-medium ${
                bearerToken
                  ? 'bg-[#238636]/10 text-[#3fb950] border-[#238636]/30'
                  : 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/30'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${bearerToken ? 'bg-[#3fb950]' : 'bg-[#f85149]'}`} />
              {bearerToken ? 'Configured' : 'Not set'}
            </span>
          </div>

          {/* Input */}
          <div className="px-4 py-4 bg-[#0d1117]">
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={bearerToken}
                onChange={e => {
                  let val = e.target.value;
                  if (val.toLowerCase().startsWith('bearer ')) val = val.slice(7);
                  onTokenChange?.(val.trim());
                }}
                placeholder="Paste your bearer token here..."
                data-testid="settings-token-input"
                className="w-full px-3 py-2.5 pr-24 bg-[#161b22] border border-[#30363d] rounded-md text-[13px] text-[#e6edf3] font-mono outline-none focus:border-[#1f6feb] focus:shadow-[0_0_0_3px_rgba(31,111,235,0.15)] placeholder:text-[#484f58] transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                {bearerToken && (
                  <button onClick={handleCopyToken}
                    data-testid="copy-token-btn"
                    title="Copy token"
                    className="p-1.5 text-[#8b949e] hover:text-[#e6edf3] transition-colors rounded">
                    {copied ? <CheckIcon className="w-4 h-4 text-[#3fb950]" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button onClick={() => setShowToken(v => !v)}
                  data-testid="toggle-token-visibility-btn"
                  title={showToken ? 'Hide token' : 'Show token'}
                  className="p-1.5 text-[#8b949e] hover:text-[#e6edf3] transition-colors rounded">
                  {showToken ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
                {bearerToken && (
                  <button onClick={() => onTokenChange?.('')}
                    data-testid="clear-token-btn"
                    title="Clear token"
                    className="p-1.5 text-[#8b949e] hover:text-[#f85149] transition-colors rounded">
                    <XIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[12px] text-[#484f58] mt-2">Token is stored in browser localStorage. The "Bearer " prefix is added automatically to all requests.</p>
          </div>
        </div>
      </section>

      {/* ── API Endpoints ──────────────────────────────── */}
      <section>
        <div className="pb-3 border-b border-[#21262d] mb-5">
          <h2 className="text-[17px] font-semibold text-[#e6edf3] flex items-center gap-2">
            <ServerIcon className="w-4 h-4 text-[#8b949e]" />
            API Endpoints
          </h2>
          <p className="text-[13px] text-[#8b949e] mt-0.5">Auto-configured when you switch environments.</p>
        </div>
        <div className="border border-[#30363d] rounded-lg overflow-hidden divide-y divide-[#21262d]">
          {[
            { label: 'Base URL', key: 'api_url', desc: 'Category Config API' },
            { label: 'Pause URL', key: 'pause_url', desc: 'Pause / Resume Jobs' },
            { label: 'Envcore URL', key: 'envcore_url', desc: 'Pod Execution', note: 'Same across all environments.' },
            { label: 'Database', key: 'db_dsn', desc: 'PostgreSQL' },
          ].map(field => (
            <div key={field.key} className="px-4 py-3.5 group">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-semibold text-[#e6edf3]">{field.label}</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyField(field.key, getVal(field.key))}
                    title="Copy value"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-[#484f58] hover:text-[#8b949e]">
                    {copiedField === field.key
                      ? <CheckIcon className="w-3.5 h-3.5 text-[#3fb950]" />
                      : <CopyIcon className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-[11px] text-[#484f58] bg-[#161b22] px-2 py-0.5 rounded border border-[#21262d]">{field.desc}</span>
                </div>
              </div>
              <input type="text" value={getVal(field.key)} readOnly className={readOnlyCls} />
              {field.note && <p className="text-[12px] text-[#484f58] mt-1">{field.note}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Template Creation ──────────────────────────── */}
      <section>
        <div className="pb-3 border-b border-[#21262d] mb-5">
          <h2 className="text-[17px] font-semibold text-[#e6edf3]">Template Creation</h2>
          <p className="text-[13px] text-[#8b949e] mt-0.5">GCS buckets used when creating templates from job snapshots.</p>
        </div>
        <div className="border border-[#30363d] rounded-lg overflow-hidden divide-y divide-[#21262d]">
          {[
            { label: 'Source Bucket', key: 'source_bucket', note: 'GCS bucket containing job snapshots.' },
            { label: 'Destination Bucket', key: 'dest_bucket', note: 'GCS bucket where templates are stored.' },
          ].map(field => (
            <div key={field.key} className="px-4 py-3.5 group">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-semibold text-[#e6edf3]">{field.label}</label>
                <button
                  onClick={() => handleCopyField(field.key, getVal(field.key))}
                  title="Copy value"
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-[#484f58] hover:text-[#8b949e]">
                  {copiedField === field.key
                    ? <CheckIcon className="w-3.5 h-3.5 text-[#3fb950]" />
                    : <CopyIcon className="w-3.5 h-3.5" />}
                </button>
              </div>
              <input type="text" value={getVal(field.key)} readOnly className={readOnlyCls} />
              <p className="text-[12px] text-[#484f58] mt-1">{field.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
