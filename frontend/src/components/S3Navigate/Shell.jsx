import { useState } from 'react';

// AWS S3 Navigate sub-nav, mirrors the AWS console layout. Only the routes
// we actually use are kept; the rest of the AWS sidebar (Directory/Table/
// Vector buckets, Access management, Storage Lens, Marketplace, etc.) is stripped.
export default function Shell({ children, username, onSignOut, onHome, sidebarCollapsed, onToggleSidebar }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] -mx-6 -my-8">
      {/* Sub-sidebar */}
      {!sidebarCollapsed && (
        <aside className="w-[240px] shrink-0 border-r border-[#30363d] bg-[#0d1117] py-5 px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-[#e6edf3]">AWS S3 Navigate</h2>
            <button onClick={onToggleSidebar} title="Collapse"
              className="p-1 rounded hover:bg-[#161b22] text-[#8b949e] hover:text-[#e6edf3]">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.275.326.749.749 0 0 1-.215.734L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z" />
              </svg>
            </button>
          </div>

          <SidebarSection label="Buckets" defaultOpen>
            <SidebarLink active label="General purpose buckets" onClick={onHome} />
          </SidebarSection>
        </aside>
      )}
      {sidebarCollapsed && (
        <button onClick={onToggleSidebar} title="Expand sidebar"
          className="self-start mt-4 ml-1 p-1.5 rounded hover:bg-[#161b22] text-[#8b949e] hover:text-[#e6edf3]">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top utility bar (account chip + sign-out) */}
        <div className="px-6 py-3 border-b border-[#30363d] flex items-center justify-end gap-3 text-[13px]">
          <span className="text-[#8b949e]">Signed in as <span className="text-[#e6edf3] font-mono">{username || '—'}</span></span>
          <button onClick={onSignOut}
            className="ml-2 px-2.5 py-1 rounded border border-[#30363d] hover:border-[#58a6ff] hover:text-[#58a6ff] text-[#c9d1d9] transition-colors">
            Sign out
          </button>
        </div>
        <div className="flex-1 px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

function SidebarSection({ label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-2">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 text-[14px] font-bold text-[#e6edf3] hover:text-white py-1">
        <svg className={`w-3 h-3 transition-transform ${open ? '' : '-rotate-90'}`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
        </svg>
        <span>{label}</span>
      </button>
      {open && <div className="pl-4 mt-1">{children}</div>}
    </div>
  );
}

function SidebarLink({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`block w-full text-left py-1 text-[13px] transition-colors ${
        active
          ? 'text-[#58a6ff] font-semibold'
          : 'text-[#c9d1d9] hover:text-[#e6edf3]'
      }`}>
      {label}
    </button>
  );
}
