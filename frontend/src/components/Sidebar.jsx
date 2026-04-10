import { useState, useEffect } from 'react';

// --- GitHub Octicons (16px filled) ---
function WorkflowIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v3.585a.746.746 0 0 1 0 .83v8.085A1.75 1.75 0 0 1 14.25 16H6.5a.75.75 0 0 1 0-1.5h7.75a.25.25 0 0 0 .25-.25V6.5h-13v1.75a.75.75 0 0 1-1.5 0ZM1.5 5h13V1.75a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25ZM0 12a3.5 3.5 0 0 1 3.5-3.5.75.75 0 0 1 0 1.5A2 2 0 0 0 1.5 12a2 2 0 0 0 2 2 .75.75 0 0 1 0 1.5A3.5 3.5 0 0 1 0 12Z" />
    </svg>
  );
}
function DatabaseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1c-3.68 0-6 1.316-6 3v8c0 1.684 2.32 3 6 3s6-1.316 6-3V4c0-1.684-2.32-3-6-3ZM2.5 9.756V7.244C3.626 7.88 5.592 8.25 8 8.25s4.374-.37 5.5-1.006v2.512C12.334 10.576 10.24 11 8 11s-4.334-.424-5.5-1.244ZM13.5 4c0 .55-1.639 1.75-5.5 1.75S2.5 4.55 2.5 4 4.139 2.25 8 2.25 13.5 3.45 13.5 4Zm0 8c0 .55-1.639 1.75-5.5 1.75S2.5 12.55 2.5 12v-2.756C3.626 10.076 5.592 10.5 8 10.5s4.374-.424 5.5-1.256Z" />
    </svg>
  );
}
function ListIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm3.75-1.5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5Zm0 5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5Zm0 5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5ZM3 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </svg>
  );
}
function PlusCircleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm7.25-3.25v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5a.75.75 0 0 1 1.5 0Z" />
    </svg>
  );
}
function SparkleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.492 7.492 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.492 7.492 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.492 7.492 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.492 7.492 0 0 0 4.464-4.464Z" />
    </svg>
  );
}
function FileIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
    </svg>
  );
}
function KeyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M10.5 0a5.499 5.499 0 1 1-1.288 10.848l-1.02 1.02a.749.749 0 0 1-.53.22H7v.75a.749.749 0 0 1-.22.53l-.5.5a.749.749 0 0 1-.53.22H5v.75a.749.749 0 0 1-.22.53l-1 1a.749.749 0 0 1-.53.22h-2A.75.75 0 0 1 .5 15.5v-2c0-.199.079-.389.22-.53l5.33-5.33A5.5 5.5 0 0 1 10.5 0ZM9 5.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z" />
    </svg>
  );
}
function ChevronIcon({ className, open }) {
  return (
    <svg className={`${className} transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
      viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294a6.084 6.084 0 0 1 0 .772c-.01.147.04.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.948 7.948 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.103-.303c-.066-.019-.176-.011-.299.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.212.224l-.288 1.107c-.17.645-.716 1.195-1.459 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.065-1.289-.615-1.459-1.26l-.288-1.107a.352.352 0 0 0-.212-.224 5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.049-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.04-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.103.303c.066.019.176.011.299-.071.214-.143.437-.272.668-.386a.352.352 0 0 0 .212-.224l.288-1.107C5.9.645 6.446.095 7.189.031 7.898 8 0Zm1.474 1.346a.52.52 0 0 0-.486-.346 6.517 6.517 0 0 0-.976 0 .52.52 0 0 0-.486.346l-.288 1.107a1.856 1.856 0 0 1-1.103 1.196 4.279 4.279 0 0 0-.497.287 1.856 1.856 0 0 1-1.592.18l-1.103-.303a.52.52 0 0 0-.566.197 6.434 6.434 0 0 0-.523.905.52.52 0 0 0 .08.543l.814.806c.36.357.548.886.521 1.453a4.568 4.568 0 0 0 0 .575c.027.567-.161 1.096-.521 1.453l-.814.806a.52.52 0 0 0-.08.543c.133.32.286.628.523.905a.52.52 0 0 0 .566.197l1.103-.303a1.856 1.856 0 0 1 1.592.18c.16.107.328.2.497.287a1.856 1.856 0 0 1 1.103 1.196l.288 1.107a.52.52 0 0 0 .486.346 6.517 6.517 0 0 0 .976 0 .52.52 0 0 0 .486-.346l.288-1.107a1.856 1.856 0 0 1 1.103-1.196c.17-.087.337-.18.497-.287a1.856 1.856 0 0 1 1.592-.18l1.103.303a.52.52 0 0 0 .566-.197c.237-.277.39-.585.523-.905a.52.52 0 0 0-.08-.543l-.814-.806a1.856 1.856 0 0 1-.521-1.453 4.568 4.568 0 0 0 0-.575c.027-.567.161-1.096.521-1.453l.814-.806a.52.52 0 0 0 .08-.543 6.434 6.434 0 0 0-.523-.905.52.52 0 0 0-.566-.197l-1.103.303a1.856 1.856 0 0 1-1.592-.18 4.318 4.318 0 0 0-.497-.287 1.856 1.856 0 0 1-1.103-1.196ZM8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    </svg>
  );
}

const navStructure = [
  {
    section: 'Workflows',
    items: [
      { id: 'create-template', label: 'Create Template', icon: WorkflowIcon },
    ],
  },
  {
    section: 'Category Config',
    icon: DatabaseIcon,
    collapsible: true,
    items: [
      { id: 'config-all', label: 'All Configs', icon: ListIcon },
      { id: 'config-create', label: 'Create Config', icon: PlusCircleIcon },
      { id: 'config-summary', label: 'Generate Summary', icon: SparkleIcon },
    ],
  },
  {
    section: 'System',
    items: [
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

export default function Sidebar({ activePage, onNavigate, bearerToken, onTokenChange, width = 260, activeEnv, standardEnvs = [], onSwitchEnv }) {
  const [collapsed, setCollapsed] = useState({});
  const [showEnvMenu, setShowEnvMenu] = useState(false);
  const [ephInput, setEphInput] = useState('');
  const [ephHistory, setEphHistory] = useState([]);

  // Reload history whenever dropdown opens
  useEffect(() => {
    if (showEnvMenu) {
      try { setEphHistory(JSON.parse(localStorage.getItem('eph_history') || '[]')); } catch {}
    }
  }, [showEnvMenu]);

  function handleEphConnect(envName) {
    onSwitchEnv(envName);
    const history = JSON.parse(localStorage.getItem('eph_history') || '[]');
    const updated = [envName, ...history.filter(e => e !== envName)].slice(0, 5);
    localStorage.setItem('eph_history', JSON.stringify(updated));
    setEphHistory(updated);
    setShowEnvMenu(false);
    setEphInput('');
  }

  function toggleSection(section) {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  }

  function isSectionActive(group) {
    return group.items.some(item => item.id === activePage);
  }

  return (
    <aside className="bg-black border-r border-[#30363d] h-screen fixed top-0 left-0 flex flex-col" style={{ width }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-[#30363d]">
        <h1 className="text-[15px] font-semibold text-[#e6edf3] mb-2">template-automation-v0</h1>
        {/* Environment switcher */}
        <div className="relative">
          <button onClick={() => setShowEnvMenu(!showEnvMenu)}
            data-testid="env-switcher-btn"
            className="flex items-center gap-1.5 text-[13px] px-2.5 py-[5px] rounded-md text-[#e6edf3] border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] transition-colors w-full outline-none">
            {/* server icon */}
            <svg className="w-[14px] h-[14px] shrink-0 text-[#8b949e]" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75V5a1.75 1.75 0 0 1-1.75 1.75H1.75A1.75 1.75 0 0 1 0 5V2.75C0 1.784.784 1 1.75 1ZM1.5 2.75v2.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25ZM1.75 7h12.5c.966 0 1.75.784 1.75 1.75v2.5A1.75 1.75 0 0 1 14.25 13H1.75A1.75 1.75 0 0 1 0 11.25v-2.5C0 7.784.784 7 1.75 7Zm-.25 1.75v2.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Z" />
            </svg>
            <span className="flex-1 text-left truncate font-medium text-[12px]">{activeEnv || 'select env'}</span>
            <svg className={`w-3 h-3 shrink-0 text-[#8b949e] transition-transform ${showEnvMenu ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
            </svg>
          </button>
          {showEnvMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowEnvMenu(false)} />
              <div className="absolute left-0 right-0 top-[33px] z-20 bg-[#161b22] border border-[#30363d] rounded-lg shadow-[0_8px_24px_rgba(1,4,9,0.6)] overflow-hidden">

                {/* Header */}
                <div className="px-4 py-2 border-b border-[#21262d]">
                  <span className="text-[12px] text-[#8b949e]">Switch environment</span>
                </div>

                {/* Standard envs */}
                {standardEnvs.map(env => {
                  const isActive = activeEnv === env.name;
                  return (
                    <button key={env.name}
                      onClick={() => { onSwitchEnv(env.name); setShowEnvMenu(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-[6px] text-left transition-colors ${isActive ? 'bg-[#b1bac40f]' : 'hover:bg-[#b1bac40f]'}`}>
                      <span className="w-3.5 flex items-center justify-center shrink-0">
                        {isActive && (
                          <svg className="w-[13px] h-[13px] text-[#e6edf3]" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                          </svg>
                        )}
                      </span>
                      <span className={`flex-1 text-[14px] ${isActive ? 'text-[#e6edf3] font-medium' : 'text-[#c9d1d9]'}`}>{env.label}</span>
                      <span className="text-[12px] text-[#8b949e]">standard</span>
                    </button>
                  );
                })}

                {/* Recent ephemeral */}
                {ephHistory.length > 0 && (
                  <div className="border-t border-[#21262d]">
                    <div className="px-4 pt-2 pb-1">
                      <span className="text-[12px] text-[#8b949e]">Recent</span>
                    </div>
                    {ephHistory.slice(0, 3).map(env => {
                      const isActive = activeEnv === env;
                      return (
                        <button key={env}
                          onClick={() => handleEphConnect(env)}
                          data-testid={`sidebar-eph-recent-${env}`}
                          className={`w-full flex items-center gap-2 px-4 py-[6px] text-left transition-colors ${isActive ? 'bg-[#b1bac40f]' : 'hover:bg-[#b1bac40f]'}`}>
                          <span className="w-3.5 flex items-center justify-center shrink-0">
                            {isActive && (
                              <svg className="w-[13px] h-[13px] text-[#e6edf3]" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                              </svg>
                            )}
                          </span>
                          <span className={`flex-1 text-[13px] font-mono truncate ${isActive ? 'text-[#e6edf3] font-semibold' : 'text-[#c9d1d9]'}`}>{env}</span>
                          {isActive && <span className="text-[12px] text-[#8b949e] shrink-0">active</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* New ephemeral input */}
                <div className="border-t border-[#21262d] px-3 py-2.5">
                  <div className="text-[12px] text-[#8b949e] mb-1.5">
                    {ephHistory.length > 0 ? 'Connect to new' : 'Ephemeral'}
                  </div>
                  <div className="flex items-stretch border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117] focus-within:border-[#58a6ff] transition-colors">
                    <span className="px-2.5 text-[12px] font-mono text-[#6e7681] bg-[#161b22] border-r border-[#30363d] shrink-0 flex items-center">eph-</span>
                    <input type="text" value={ephInput} onChange={e => setEphInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && ephInput.trim()) handleEphConnect(`eph-${ephInput.trim()}`); }}
                      placeholder="env-name"
                      className="flex-1 px-2.5 py-[6px] bg-transparent text-[13px] text-[#e6edf3] outline-none placeholder:text-[#484f58] font-mono min-w-0" />
                    <button
                      onClick={() => { if (ephInput.trim()) handleEphConnect(`eph-${ephInput.trim()}`); }}
                      disabled={!ephInput.trim()}
                      className="px-3 text-[12px] font-medium text-[#e6edf3] bg-[#21262d] hover:bg-[#30363d] border-l border-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0">
                      Go
                    </button>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {navStructure.map((group, gi) => {
          const isOpen = group.collapsible ? (!collapsed[group.section] || isSectionActive(group)) : true;
          const sectionActive = isSectionActive(group);

          return (
            <div key={group.section} className={gi > 0 ? 'mt-4' : ''}>
              {/* Section header */}
              {group.collapsible ? (
                <button
                  onClick={() => toggleSection(group.section)}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer mb-1 ${
                    sectionActive ? 'text-[#58a6ff]' : 'text-[#8b949e] hover:text-[#e6edf3]'
                  }`}>
                  {group.icon && <group.icon className="w-4 h-4" />}
                  <span className="flex-1 text-left">{group.section}</span>
                  <ChevronIcon className="w-3.5 h-3.5" open={isOpen} />
                </button>
              ) : (
                <div className="text-[11px] font-bold text-[#484f58] uppercase tracking-wider px-2 mb-1">
                  {group.section}
                </div>
              )}

              {/* Nav items */}
              {isOpen && group.items.map(item => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    data-testid={`nav-${item.id}`}
                    className={`w-full flex items-center gap-2.5 py-[7px] rounded-md text-[14px] transition-all cursor-pointer mb-[2px] ${
                      group.collapsible ? 'pl-7 pr-3' : 'px-2'
                    } ${isActive
                      ? 'bg-[#161b22] text-[#e6edf3] font-medium border border-[#30363d]'
                      : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3] border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-[16px] h-[16px] shrink-0 ${isActive ? 'text-[#e6edf3]' : 'text-[#6e7681]'}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* API Token status — click to go to Settings */}
      <div className="px-3 py-3 border-t border-[#30363d]">
        <button
          onClick={() => onNavigate('settings')}
          data-testid="api-token-btn"
          title="Configure API token in Settings"
          className="w-full flex items-center gap-2.5 px-2 py-[7px] rounded-md text-[14px] text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3] transition-colors cursor-pointer border border-transparent">
          <KeyIcon className="w-[16px] h-[16px] shrink-0 text-[#6e7681]" />
          <span className="flex-1 text-left text-[13px]">API Token</span>
          <span data-testid="token-status-indicator"
            className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
              bearerToken
                ? 'bg-[#238636]/10 text-[#3fb950] border-[#238636]/30'
                : 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/30'
            }`}>
            {bearerToken ? 'Set' : 'Not set'}
          </span>
        </button>
      </div>
    </aside>
  );
}
