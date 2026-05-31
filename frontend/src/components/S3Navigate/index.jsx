import { useEffect, useState, useCallback, Component } from 'react';
import Shell from './Shell';
import Breadcrumb from './Breadcrumb';
import SignIn from './SignIn';
import BucketList from './BucketList';
import ObjectList from './ObjectList';
import ObjectDetail from './ObjectDetail';
import UploadPage from './UploadPage';
import CreateFolderPage from './CreateFolderPage';
import DeletePage from './DeletePage';
import DeleteStatusPage from './DeleteStatusPage';
import AwsAlert from './AwsAlert';
import { s3api, getToken, GateError } from './api';

// Top-level state machine for AWS S3 Navigate.
// view: 'signin' | 'buckets' | 'objects' | 'object'
//     | 'upload' | 'createFolder' | 'deleteObjects' | 'deleteStatus'
export default function S3Navigate() {
  const [view, setView] = useState('signin');
  const [session, setSession] = useState(null); // {username, expires_at}
  const [bootChecked, setBootChecked] = useState(() => !getToken());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bucket, setBucket] = useState(null);
  const [prefix, setPrefix] = useState('');
  const [objectKey, setObjectKey] = useState(null);
  const [toast, setToast] = useState(null);
  const [pageBanner, setPageBanner] = useState(null); // {variant, title, body}
  // Selection / status passed between Object list -> Delete -> Status views.
  const [pendingDelete, setPendingDelete] = useState([]); // [{key, size, last_modified, isFolder}]
  const [deleteSummary, setDeleteSummary] = useState(null); // {source, results}
  // Bumped after a write so ObjectList re-fetches its listing.
  const [refreshTick, setRefreshTick] = useState(0);

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

  function showBanner(banner) {
    setPageBanner(banner);
    // success banners auto-dismiss; errors stick until closed
    if (banner?.variant === 'success') {
      setTimeout(() => setPageBanner(b => (b === banner ? null : b)), 6000);
    }
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
    setPageBanner(null);
    setView('objects');
  }
  function openPrefix(p) {
    setPrefix(p);
    setObjectKey(null);
    setPageBanner(null);
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
    setPageBanner(null);
    setView('buckets');
  }
  function backToObjects() {
    setObjectKey(null);
    setView('objects');
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
        onClick: () => { setPrefix(''); setObjectKey(null); setPageBanner(null); setView('objects'); },
      });
    }
    if (prefix) {
      const parts = prefix.split('/').filter(Boolean);
      let acc = '';
      parts.forEach((part, idx) => {
        acc += part + '/';
        const targetPrefix = acc;
        const isLast = idx === parts.length - 1;
        c.push({
          label: part + '/',
          onClick: (isLast && view === 'objects') ? undefined : (() => {
            setPrefix(targetPrefix);
            setObjectKey(null);
            setPageBanner(null);
            setView('objects');
          }),
        });
      });
    }
    if (view === 'object' && objectKey) {
      const name = objectKey.split('/').pop();
      c.push({ label: name });
    }
    if (view === 'upload') c.push({ label: 'Upload' });
    if (view === 'createFolder') c.push({ label: 'Create folder' });
    if (view === 'deleteObjects') c.push({ label: 'Delete objects' });
    if (view === 'deleteStatus') c.push({ label: 'Delete objects' });
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

      {pageBanner && (
        <div className="mb-4">
          <AwsAlert
            variant={pageBanner.variant}
            tone={pageBanner.tone || (pageBanner.variant === 'success' ? 'solid' : 'outlined')}
            title={pageBanner.title}
            onDismiss={() => setPageBanner(null)}
          >
            {pageBanner.body}
          </AwsAlert>
        </div>
      )}

      <ErrorBoundary onAuth={handleGateError}>
        {view === 'buckets' && (
          <BucketList onOpenBucket={openBucket} />
        )}
        {view === 'objects' && bucket && (
          <ObjectList
            bucket={bucket}
            prefix={prefix}
            refreshTick={refreshTick}
            onOpenPrefix={openPrefix}
            onOpenObject={openObject}
            onCopyToast={showToast}
            onOpenUpload={() => { setPageBanner(null); setView('upload'); }}
            onOpenCreateFolder={() => { setPageBanner(null); setView('createFolder'); }}
            onOpenDelete={(selected) => { setPendingDelete(selected); setPageBanner(null); setView('deleteObjects'); }}
          />
        )}
        {view === 'object' && bucket && objectKey && (
          <ObjectDetail
            bucket={bucket}
            objKey={objectKey}
            onBack={backToObjects}
            onCopyToast={showToast}
          />
        )}
        {view === 'upload' && bucket && (
          <UploadPage
            bucket={bucket}
            prefix={prefix}
            onCancel={() => setView('objects')}
            onDone={(count) => {
              setRefreshTick(t => t + 1);
              setView('objects');
              showBanner({
                variant: 'success',
                title: `Successfully uploaded ${count} object${count === 1 ? '' : 's'}`,
                body: <>to <span className="font-mono">s3://{bucket}/{prefix || ''}</span></>,
              });
            }}
          />
        )}
        {view === 'createFolder' && bucket && (
          <CreateFolderPage
            bucket={bucket}
            prefix={prefix}
            onCancel={() => setView('objects')}
            onDone={(name) => {
              setRefreshTick(t => t + 1);
              setView('objects');
              showBanner({
                variant: 'success',
                title: <>Successfully created folder "{name}".</>,
              });
            }}
          />
        )}
        {view === 'deleteObjects' && bucket && (
          <DeletePage
            bucket={bucket}
            prefix={prefix}
            objects={pendingDelete}
            onCancel={() => setView('objects')}
            onDone={(summary) => {
              setDeleteSummary(summary);
              setRefreshTick(t => t + 1);
              setView('deleteStatus');
            }}
          />
        )}
        {view === 'deleteStatus' && deleteSummary && (
          <DeleteStatusPage
            source={deleteSummary.source}
            results={deleteSummary.results}
            onClose={() => { setDeleteSummary(null); setView('objects'); }}
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
