import { useEffect, useState } from 'react';

import { AuthError } from '../../api';
import { s3api } from '../S3Navigate/api';
import { colors } from '../S3Navigate/theme';

import CmsSignIn from './SignIn';
import UploadTab from './UploadTab';
import DeleteTab from './DeleteTab';
import InvalidateTab from './InvalidateTab';
import { CMS_S3_PREFIX_LABEL } from './config';

const TABS = [
  { id: 'upload',     label: 'Upload' },
  { id: 'delete',     label: 'Delete' },
  { id: 'invalidate', label: 'Invalidate cache' },
];

export default function CmsPortal() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upload');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await s3api.me();
        if (active) setSession(me);
      } catch (e) {
        if (active && !(e instanceof AuthError)) {
          // surfaced through sign-in screen as needed; silent here is fine
        }
        if (active) setSession(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ backgroundColor: '#0f1419', color: colors.text.info }}>
        Loading…
      </div>
    );
  }

  if (!session) {
    return <CmsSignIn onSignedIn={setSession} />;
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: '#0f1419', color: colors.text.primary }}>
      <Header session={session} onSignOut={() => { s3api.signOut(); setSession(null); }} />

      <div className="px-6 pt-6 pb-2">
        <h1 className="text-[28px] font-bold" style={{ color: colors.text.primary }}>CMS Portal</h1>
        <p className="text-[14px] mt-1" style={{ color: colors.text.info }}>
          Scope: <span className="font-mono">{CMS_S3_PREFIX_LABEL}</span>
        </p>
      </div>

      <div className="px-6">
        <div className="flex gap-6" style={{ borderBottom: `2px solid ${colors.border.rowSeparator}` }}>
          {TABS.map(t => (
            <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </TabBtn>
          ))}
        </div>
      </div>

      <div className="px-6 py-6">
        {tab === 'upload'     && <UploadTab />}
        {tab === 'delete'     && <DeleteTab />}
        {tab === 'invalidate' && <InvalidateTab />}
      </div>
    </div>
  );
}

function Header({ session, onSignOut }) {
  return (
    <div
      className="flex items-center justify-end gap-4 px-6 py-2 text-[13px]"
      style={{ backgroundColor: '#0a0e13', borderBottom: `1px solid ${colors.border.rowSeparator}`, color: colors.text.info }}
    >
      <span>
        Signed in as <span className="font-bold" style={{ color: colors.text.selectedRow }}>{session.username}</span>
      </span>
      <button
        type="button"
        onClick={onSignOut}
        className="px-3 py-1 rounded-full hover:bg-white/5 transition-colors"
        style={{ border: `1px solid ${colors.text.buttonActive}`, color: colors.text.buttonActive }}
      >
        Sign out
      </button>
    </div>
  );
}

function TabBtn({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative py-2 text-[14px] font-bold"
      style={{ color: active ? colors.text.buttonActive : colors.text.selectedRow }}
    >
      {children}
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 -bottom-[2px]"
          style={{ height: 3, backgroundColor: colors.text.buttonActive }}
        />
      )}
    </button>
  );
}
