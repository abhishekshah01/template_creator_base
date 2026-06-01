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
            backgroundColor: colors.bg.page,
          }}
        >
          <div
            className="flex items-center justify-between pb-3 mb-3"
            style={{ borderBottom: `1px solid ${colors.border.rowSeparator}` }}
          >
            <h2 className="text-[15px] font-bold" style={{ color: colors.text.primary }}>AWS S3 Navigate</h2>
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
        className="w-full flex items-center gap-1.5 text-[14px] font-bold py-1"
        style={{ color: colors.text.primary }}
      >
        <svg
          className={`w-3 h-3 transition-transform ${open ? '' : '-rotate-90'}`}
          viewBox="0 0 16 16"
          fill="currentColor"
        >
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
    <button
      onClick={onClick}
      className="block w-full text-left py-1 text-[14px] transition-colors"
      style={{
        color: active ? colors.text.buttonActive : colors.text.selectedRow,
        fontWeight: active ? 700 : 400,
      }}
    >
      {label}
    </button>
  );
}
