import { useState } from 'react';
import { FileText, FilePlus, Settings } from './Icons';

function Database({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}
function List({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
function PlusCircle({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}
function Sparkles({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 15l.5 1.5L21 17.5l-1.5.5L19 19.5l-.5-1.5L17 17.5l1.5-.5L19 15z" />
    </svg>
  );
}
function Chevron({ className, open }) {
  return (
    <svg className={`${className} transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

const navStructure = [
  {
    section: 'Workflows',
    items: [
      { id: 'create-template', label: 'Create Template', icon: FilePlus },
    ],
  },
  {
    section: 'Category Config',
    icon: Database,
    collapsible: true,
    items: [
      { id: 'config-all', label: 'All Configs', icon: List },
      { id: 'config-create', label: 'Create Config', icon: PlusCircle },
      { id: 'config-summary', label: 'Generate Summary', icon: Sparkles },
    ],
  },
  {
    section: 'Tools',
    items: [
      { id: 'template-summary', label: 'Template Summary', icon: FileText },
    ],
  },
];

export default function Sidebar({ activePage, onNavigate, bearerToken, onTokenChange }) {
  const [showToken, setShowToken] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  function toggleSection(section) {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  }

  // Auto-expand section if active page is inside it
  function isSectionActive(group) {
    return group.items.some(item => item.id === activePage);
  }

  return (
    <aside className="w-60 bg-slate-950 border-r border-slate-800 h-screen fixed top-0 left-0 flex flex-col">
      <div className="px-4 pt-5 pb-4 border-b border-slate-800">
        <h1 className="text-base font-semibold text-slate-200">Template Manager</h1>
        <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400 font-medium uppercase tracking-wider">
          eph-leadgen1
        </span>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {navStructure.map(group => {
          const isOpen = !collapsed[group.section] || isSectionActive(group);
          const sectionActive = isSectionActive(group);

          return (
            <div key={group.section} className="mb-3">
              {group.collapsible ? (
                <button
                  onClick={() => toggleSection(group.section)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-colors cursor-pointer ${
                    sectionActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                  }`}>
                  {group.icon && <group.icon className="w-3.5 h-3.5" />}
                  <span className="flex-1 text-left">{group.section}</span>
                  <Chevron className="w-3 h-3" open={isOpen} />
                </button>
              ) : (
                <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 pb-1.5">
                  {group.section}
                </div>
              )}

              {(!group.collapsible || isOpen) && (
                <div className={group.collapsible ? 'mt-1' : ''}>
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center gap-2.5 py-2 rounded-lg text-[13px] transition-all mb-0.5 cursor-pointer ${
                        group.collapsible ? 'pl-6 pr-3' : 'px-3'
                      } ${activePage === item.id
                        ? 'bg-blue-900/40 text-blue-300'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bearer Token Config */}
      <div className="px-3 py-3 border-t border-slate-800">
        <button onClick={() => setShowToken(!showToken)}
          className="flex items-center gap-2 w-full text-[11px] text-slate-500 hover:text-slate-300 transition-colors mb-2 cursor-pointer">
          <div className={`w-2 h-2 rounded-full shrink-0 ${bearerToken ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>API Token {bearerToken ? '(set)' : '(not set)'}</span>
          <svg className={`w-3 h-3 ml-auto transition-transform ${showToken ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        {showToken && (
          <textarea
            value={bearerToken}
            onChange={e => onTokenChange(e.target.value)}
            placeholder="Paste bearer token here..."
            rows={3}
            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-[11px] text-slate-300 outline-none focus:border-blue-500 placeholder:text-slate-600 font-mono resize-none"
          />
        )}
      </div>

      <div className="px-4 py-3 border-t border-slate-800 text-[11px] text-slate-600">
        Template Manager v0.3
      </div>
    </aside>
  );
}
