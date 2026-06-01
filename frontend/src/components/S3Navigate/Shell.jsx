import { useState } from 'react';

import { colors } from './theme';

export default function Shell({ children, username, onSignOut, onHome, onOpenAdmins, activeView, sidebarCollapsed, onToggleSidebar }) {
  const onAdmins = activeView === 'admins';
  const onBuckets = !onAdmins;
  return (
    <div className="aws-s3-section flex min-h-full">
      {!sidebarCollapsed && (
        <aside
          className="w-[240px] shrink-0 py-5 px-4"
          style={{
            borderRight: `1px solid ${colors.border.rowSeparator}`,
            backgroundColor: '#181a1b',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold" style={{ color: colors.text.selectedRow }}>AWS S3 Navigate</h2>
            <button
              onClick={onToggleSidebar}
              title="Collapse"
              className="p-1 rounded"
              style={{ color: colors.text.info }}
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.275.326.749.749 0 0 1-.215.734L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z" />
              </svg>
            </button>
          </div>

          <SidebarSection label="Buckets" defaultOpen>
            <SidebarLink active={onBuckets} label="General purpose buckets" onClick={onHome} />
          </SidebarSection>

          <SidebarSection label="Settings" defaultOpen>
            <SidebarLink active={onAdmins} label="Admin users" onClick={onOpenAdmins} />
          </SidebarSection>
        </aside>
      )}
      {sidebarCollapsed && (
        <button
          onClick={onToggleSidebar}
          title="Expand sidebar"
          className="self-start mt-4 ml-1 p-1.5 rounded"
          style={{ color: colors.text.info }}
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <div
          className="px-6 py-3 flex items-center justify-end gap-3 text-[14px]"
          style={{ borderBottom: `1px solid ${colors.border.rowSeparator}` }}
        >
          <span style={{ color: colors.text.info }}>
            Signed in as{' '}
            <span className="font-mono font-semibold" style={{ color: colors.text.selectedRow }}>
              {username || '—'}
            </span>
          </span>
          <button
            onClick={onSignOut}
            className="ml-2 inline-flex items-center px-4 h-[30px] text-[14px] font-bold transition-colors"
            style={{
              backgroundColor: colors.bg.card,
              border: `2px solid ${colors.border.buttonActive}`,
              color: colors.text.buttonActive,
              borderRadius: 20,
            }}
          >
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
    <div className="mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="group w-full flex items-center gap-2 text-[14px] font-bold py-1 transition-colors text-[#dbd8d3] hover:text-[#45abfe]"
      >
        <SectionArrow open={open} />
        <span>{label}</span>
      </button>
      {open && <div className="pl-6 mt-1">{children}</div>}
    </div>
  );
}

function SectionArrow({ open }) {
  return (
    <svg
      className={`transition-transform ${open ? '' : '-rotate-90'} shrink-0`}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="#bab4ab"
      style={{ flex: 'none' }}
    >
      <path d="M3 5h10l-5 7Z" />
    </svg>
  );
}

function SidebarLink({ label, active, onClick }) {
  const cls = active
    ? 'text-[#45abfe] font-bold'
    : 'text-[#dbd8d3] hover:text-[#45abfe]';
  return (
    <button
      onClick={onClick}
      className={`block w-full text-left py-1 text-[14px] transition-colors ${cls}`}
    >
      {label}
    </button>
  );
}
