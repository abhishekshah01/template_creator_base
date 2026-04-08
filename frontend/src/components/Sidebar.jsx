import { useState } from 'react';
import { FileText, FilePlus, Settings } from './Icons';

const navItems = [
  { id: 'create-template', label: 'Create Template', icon: FilePlus, section: 'Workflows' },
  { id: 'template-summary', label: 'Template Summary', icon: FileText, section: 'Tools' },
  { id: 'update-category', label: 'Update Category Config', icon: Settings, section: 'Tools' },
];

export default function Sidebar({ activePage, onNavigate, bearerToken, onTokenChange }) {
  const [showToken, setShowToken] = useState(false);

  const sections = {};
  navItems.forEach(item => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  return (
    <aside className="w-60 bg-slate-950 border-r border-slate-800 h-screen fixed top-0 left-0 flex flex-col">
      <div className="px-4 pt-5 pb-4 border-b border-slate-800">
        <h1 className="text-base font-semibold text-slate-200">Template Manager</h1>
        <span className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400 font-medium uppercase tracking-wider">
          eph-leadgen1
        </span>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="mb-4">
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 pb-2">
              {section}
            </div>
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all mb-0.5 cursor-pointer
                  ${activePage === item.id
                    ? 'bg-blue-900/40 text-blue-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
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
        Template Manager v0.2
      </div>
    </aside>
  );
}
