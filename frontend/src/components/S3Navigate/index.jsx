import { useEffect, useState, useCallback } from 'react';
import Shell from './Shell';
import Breadcrumb from './Breadcrumb';
import SignIn from './SignIn';
import BucketList from './BucketList';
import ObjectList from './ObjectList';
import ObjectDetail from './ObjectDetail';
import { s3api, getToken, GateError } from './api';

// Top-level state machine for AWS S3 Navigate.
// view: 'signin' | 'buckets' | 'objects' | 'object'
export default function S3Navigate() {
  const [view, setView] = useState('signin');
  const [session, setSession] = useState(null); // {username, expires_at}
  // Skip the boot delay entirely when there's no token — we know we're showing sign-in.
  const [bootChecked, setBootChecked] = useState(() => !getToken());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bucket, setBucket] = useState(null);
  const [prefix, setPrefix] = useState('');
  const [objectKey, setObjectKey] = useState(null);
  const [toast, setToast] = useState(null);

  // Validate existing token on mount (skipped when there's nothing to validate)
  useEffect(() => {
    if (!getToken()) return;
    let alive = true;
    s3api.me()
      .then(me => { if (alive) { setSession(me); setView('buckets'); } })
      .catch(() => { if (alive) setView('signin'); })
      .finally(() => { if (alive) setBootChecked(true); });
    return () => { alive = false; };
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(t => (t === msg ? null : t)), 1800);
  }

  const handleGateError = useCallback((err) => {
    if (err instanceof GateError) {
      setSession(null);
      setView('signin');
    }
  }, []);

  function onSignedIn(data) {
    setSession({ username: data.username, expires_at: data.expires_at });
    setView('buckets');
    setBucket(null);
    setPrefix('');
    setObjectKey(null);
  }

  async function onSignOut() {
    await s3api.signOut();
    setSession(null);
    setView('signin');
  }

  function openBucket(b) {
    setBucket(b.name);
    setPrefix('');
    setObjectKey(null);
    setView('objects');
  }
  function openPrefix(p) {
    setPrefix(p);
    setObjectKey(null);
    setView('objects');
  }
  function openObject(f) {
    setObjectKey(f.key);
    setView('object');
  }
  function goHome() {
    setBucket(null);
    setPrefix('');
    setObjectKey(null);
    setView('buckets');
  }

  // Build breadcrumb crumbs for the current view
  function crumbs() {
    const c = [{ label: 'AWS S3 Navigate', onClick: goHome }];
    if (view === 'buckets') {
      c.push({ label: 'Buckets' });
      return c;
    }
    c.push({ label: 'Buckets', onClick: goHome });
    if (bucket) {
      c.push({
        label: bucket,
        onClick: () => { setPrefix(''); setObjectKey(null); setView('objects'); },
      });
    }
    // Prefix crumbs ("foo/", "foo/bar/", ...)
    if (prefix) {
      const parts = prefix.split('/').filter(Boolean);
      let acc = '';
      parts.forEach((part, idx) => {
        acc += part + '/';
        const targetPrefix = acc; // snapshot so the handler doesn't close over the loop variable
        const isLastBeforeObject = idx === parts.length - 1 && view === 'objects';
        c.push({
          label: part + '/',
          onClick: isLastBeforeObject ? undefined : (() => {
            setPrefix(targetPrefix);
            setObjectKey(null);
            setView('objects');
          }),
        });
      });
    }
    if (view === 'object' && objectKey) {
      const name = objectKey.split('/').pop();
      c.push({ label: name });
    }
    return c;
  }

  if (!bootChecked) {
    return <div className="text-[#8b949e] text-[14px] p-8">Checking session…</div>;
  }

  if (view === 'signin') {
    return <SignIn onSignedIn={onSignedIn} />;
  }

  return (
    <Shell
      username={session?.username}
      onSignOut={onSignOut}
      onHome={goHome}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed(v => !v)}
    >
      <Breadcrumb crumbs={crumbs()} />

      <ErrorBoundary onAuth={handleGateError}>
        {view === 'buckets' && (
          <BucketList onOpenBucket={openBucket} />
        )}
        {view === 'objects' && bucket && (
          <ObjectList
            bucket={bucket}
            prefix={prefix}
            onOpenPrefix={openPrefix}
            onOpenObject={openObject}
            onCopyToast={showToast}
          />
        )}
        {view === 'object' && bucket && objectKey && (
          <ObjectDetail
            bucket={bucket}
            objKey={objectKey}
            onBack={() => setView('objects')}
            onCopyToast={showToast}
          />
        )}
      </ErrorBoundary>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded-md bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-[13px] shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          {toast}
        </div>
      )}
    </Shell>
  );
}

// Minimal error boundary so a GateError thrown from a leaf can bounce to signin.
import { Component } from 'react';
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) {
    if (err && err.name === 'GateError') this.props.onAuth?.(err);
  }
  render() {
    if (this.state.err) {
      if (this.state.err.name === 'GateError') return null;
      return <div className="text-[#f85149] text-[14px] p-4">{this.state.err.message}</div>;
    }
    return this.props.children;
  }
}
