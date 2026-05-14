import { useEffect, useState } from 'react';
import DotsLoader from './DotsLoader';
import { DEPLOY_PHASE_LABELS } from '../constants/deployPhases';

function formatElapsed(seconds) {
  if (seconds == null || seconds < 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeAgo(dateStr, nowMs) {
  if (!dateStr) return '';
  const seconds = Math.floor(((nowMs ?? 0) - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function DeployPanel({
  deployStatus, deploySteps, deployUrl, deployments,
  refreshing = false,
  freshFetch = false,
  onStartDeploy, onSkipDeploy, onClose,
}) {
  const hasDeployments = (deployments || []).length > 0;
  const isIdle = deployStatus === 'idle';
  const isDeploying = deployStatus === 'deploying';
  const isSuccess = deployStatus === 'success';
  const isFailed = deployStatus === 'failed';
  const isSkipped = deployStatus === 'skipped';

  const title = isDeploying ? 'Deploying...'
    : isFailed ? 'Deployment failed'
      : (isSuccess || hasDeployments) ? 'Manage Deployments'
        : 'Deploy';

  return (
    <div className="h-full flex flex-col bg-black border border-[#30363d] rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#161b22] shrink-0">
        <div className="flex items-center gap-2">
          <CloudIcon className="w-4 h-4 text-[#8b949e]" />
          <span className="text-[14px] font-semibold text-[#e6edf3]">{title}</span>
          {isDeploying && <DotsLoader size={14} dotSize={2} className="text-[#58a6ff] ml-1" />}
        </div>
        {onClose && (
          <button onClick={onClose} title="Close" className="p-1 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Different-job refetch: clear UI, show skeleton + message instead of stale data */}
        {freshFetch ? (
          <FreshFetchView />
        ) : (
          <>
            {isIdle && !hasDeployments && (
              <IdleView onStart={onStartDeploy} onSkip={onSkipDeploy} />
            )}
            {isIdle && hasDeployments && (
              <ManageView url={deployUrl || deployments[0]?.deploy_url} deployments={deployments} refreshing={refreshing} onRedeploy={onStartDeploy} />
            )}
            {(isDeploying || isFailed) && (
              <ProgressView steps={deploySteps} isFailed={isFailed} onRetry={onStartDeploy} onSkip={onSkipDeploy} />
            )}
            {isSuccess && (
              <ManageView url={deployUrl} deployments={deployments} onRedeploy={onStartDeploy} />
            )}
            {isSkipped && (
              <div className="text-center py-12 text-[14px] text-[#8b949e]">
                Deployment skipped.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Shown when fetchJob is in-flight for a NEW job — clears stale preview/URL/list
// and signals that fresh deployment data is on the way.
function FreshFetchView() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-[13px] text-[#8b949e]">
        <div className="w-3.5 h-3.5 border-2 border-[#30363d] border-t-[#8b949e] rounded-full animate-spin" />
        Fetching deployments for the new job…
      </div>
      <div className="w-full h-[120px] rounded-xl border border-[#30363d] bg-[#010409] animate-pulse mb-4" />
      <div className="flex items-center gap-3 mb-5">
        <div className="h-[22px] w-[60px] rounded-full bg-[#21262d] animate-pulse" />
        <div className="h-[14px] w-[180px] rounded bg-[#21262d] animate-pulse" />
      </div>
      <div className="border border-[#21262d] rounded-md p-4 bg-[#0c1117]">
        <div className="h-[15px] w-[120px] bg-[#21262d] rounded animate-pulse mb-1.5" />
        <div className="h-[12px] w-[200px] bg-[#21262d] rounded animate-pulse mb-4" />
        {[120, 100, 110].map((w, i) => (
          <div key={i} className="flex items-start gap-3 py-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#21262d] mt-1.5 animate-pulse" />
            <div className="flex-1">
              <div className="h-[14px] rounded bg-[#21262d] animate-pulse mb-1" style={{ width: `${w}px` }} />
              <div className="h-[11px] w-[140px] rounded bg-[#21262d] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IdleView({ onStart }) {
  return (
    <div className="border border-dashed border-[#30363d] rounded-2xl bg-[#0c1117] p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
      <div className="text-[20px] font-bold text-[#e6edf3] mb-3">Take your app live!</div>
      <p className="text-[14px] text-[#8b949e] leading-relaxed max-w-[280px] mb-6">
        Deploy to a hosted production-ready environment and get a live URL for your app.
      </p>
      <div className="inline-flex items-center gap-2 mb-5">
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 49 48" fill="none">
          <g clipPath="url(#deploy_coin_clip)">
            <circle opacity="0.1" cx="24.5" cy="24" r="24" fill="#F3CA5F" />
            <path fill="#F3CA5F" d="M24.5002 4.79883C35.104 4.79896 43.7004 13.3952 43.7004 23.999C43.7004 34.6028 35.104 43.1991 24.5002 43.1992C13.8964 43.1992 5.30005 34.6029 5.30005 23.999C5.30005 13.3952 13.8964 4.79883 24.5002 4.79883ZM25.4797 15.8135C24.8472 14.2461 24.3146 13.7212 23.5549 15.5928C21.893 19.5817 19.9091 21.4827 16.0032 23.1289C15.611 23.3101 14.9043 23.6249 14.8997 23.998C14.9043 24.3712 15.6064 24.686 16.0032 24.8672C19.9045 26.5086 21.8931 28.4141 23.5549 32.4033C24.3238 34.3087 24.8579 33.7101 25.4797 32.1826C27.1463 28.327 29.0079 26.5378 32.9387 24.8672C33.3507 24.6707 34.0306 24.4099 34.0999 24.0186V23.9736C34.0309 23.5852 33.3554 23.3206 32.9387 23.124V23.1289C29.0083 21.4583 27.1463 19.6705 25.4797 15.8135Z" />
            <path fill="url(#deploy_coin_grad)" style={{ mixBlendMode: 'overlay' }} d="M24.5002 4.79883C35.104 4.79896 43.7004 13.3952 43.7004 23.999C43.7004 34.6028 35.104 43.1991 24.5002 43.1992C13.8964 43.1992 5.30005 34.6029 5.30005 23.999C5.30005 13.3952 13.8964 4.79883 24.5002 4.79883ZM25.4797 15.8135C24.8472 14.2461 24.3146 13.7212 23.5549 15.5928C21.893 19.5817 19.9091 21.4827 16.0032 23.1289C15.611 23.3101 14.9043 23.6249 14.8997 23.998C14.9043 24.3712 15.6064 24.686 16.0032 24.8672C19.9045 26.5086 21.8931 28.4141 23.5549 32.4033C24.3238 34.3087 24.8579 33.7101 25.4797 32.1826C27.1463 28.327 29.0079 26.5378 32.9387 24.8672C33.3507 24.6707 34.0306 24.4099 34.0999 24.0186V23.9736C34.0309 23.5852 33.3554 23.3206 32.9387 23.124V23.1289C29.0083 21.4583 27.1463 19.6705 25.4797 15.8135Z" />
          </g>
          <defs>
            <linearGradient id="deploy_coin_grad" x1="24.5002" y1="4.79883" x2="24.5002" y2="43.1992" gradientUnits="userSpaceOnUse">
              <stop stopColor="white" />
              <stop offset="1" />
            </linearGradient>
            <clipPath id="deploy_coin_clip">
              <rect width="48" height="48" fill="white" transform="translate(0.5)" />
            </clipPath>
          </defs>
        </svg>
        <span className="text-[13.5px] font-medium text-[#F3CA5F]">50 credits / month</span>
      </div>
      <button onClick={onStart}
        className="px-6 py-2.5 bg-[#37007a] text-white text-[14px] font-semibold rounded-md border border-[#8957e5]/40 hover:bg-[#6e40c9] hover:border-[#8957e5]/70 hover:shadow-[0_0_20px_rgba(137,87,229,0.30)] transition-all flex items-center justify-center gap-2">
        <CloudUploadIcon className="w-4 h-4" />
        Start Deployment
      </button>
    </div>
  );
}

function ProgressView({ steps, isFailed, onRetry, onSkip }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (isFailed) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isFailed]);

  const expected = ['build', 'mongodb_migrate', 'manage_secrets', 'deploy', 'health_check'];
  const stepsByName = Object.fromEntries((steps || []).map(s => [s.name, s]));
  const extras = (steps || []).filter(s => !expected.includes(s.name)).map(s => s.name);
  const ordered = [...expected, ...extras];

  return (
    <>
      {!isFailed && (
        <div className="text-center mb-4">
          <div className="text-[16px] font-semibold text-[#e6edf3]">Your app will be live soon</div>
          <div className="text-[12px] text-[#8b949e] mt-0.5">Usually 5–7 minutes.</div>
        </div>
      )}
      <div className="border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117]">
        {ordered.map((name, i) => {
          const step = stepsByName[name];
          const status = step?.status || 'pending';
          const isActive = status === 'running';
          const isDone = status === 'success';
          const isFailedRow = status === 'failed';
          let elapsed = '';
          if (step?.created_at && (isActive || isDone || isFailedRow)) {
            const start = new Date(step.created_at).getTime();
            const end = (isDone || isFailedRow) && step.updated_at
              ? new Date(step.updated_at).getTime()
              : now;
            elapsed = formatElapsed(Math.floor((end - start) / 1000));
          }
          return (
            <div key={name}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-[#21262d]' : ''} ${isActive ? 'bg-gradient-to-r from-[#1f6feb]/10 to-transparent' : ''
                }`}>
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {isActive && <DotsLoader size={14} dotSize={2} className="text-[#58a6ff]" />}
                {isDone && (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="#3fb950">
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                  </svg>
                )}
                {isFailedRow && (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="#f85149">
                    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                )}
                {status === 'pending' && <div className="w-3 h-3 rounded-full border border-[#484f58]" />}
              </div>
              <span className={`flex-1 font-mono text-[13px] ${isActive ? 'text-[#58a6ff] font-medium'
                  : isDone ? 'text-[#c9d1d9]'
                    : isFailedRow ? 'text-[#f85149]'
                      : 'text-[#8b949e]'
                }`}>
                {DEPLOY_PHASE_LABELS[name] || name}{isActive ? '...' : ''}
              </span>
              {elapsed && (
                <span className="font-mono text-[12px] text-[#8b949e] tabular-nums">{elapsed}</span>
              )}
            </div>
          );
        })}
      </div>
      {isFailed && (
        <div className="flex gap-2 mt-3">
          <button onClick={onRetry}
            className="px-3 py-[5px] bg-[#1f6feb] text-white text-[14px] font-medium rounded-md hover:bg-[#388bfd] border border-[#1f6feb]/60 transition-colors">
            Retry Deploy
          </button>
          <button onClick={onSkip}
            className="px-3 py-[5px] text-[14px] text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] hover:border-[#484f58] transition-colors">
            Skip
          </button>
        </div>
      )}
    </>
  );
}

function ManageView({ url, deployments, refreshing = false, onRedeploy }) {
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  // Reset the loaded state when the URL changes (e.g. after a redeploy).
  useEffect(() => { setPreviewLoaded(false); }, [url]);

  function copyUrl() {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => { });
  }

  return (
    <>
      {refreshing && (
        <div className="flex items-center gap-2 mb-4 text-[13px] text-[#8b949e]">
          <div className="w-3.5 h-3.5 border-2 border-[#30363d] border-t-[#8b949e] rounded-full animate-spin" />
          Fetching latest deployments…
        </div>
      )}
      {/* Top section: preview + URL/actions */}
      {url && (
        <div className="flex gap-3 mb-4">
          <a href={url} target="_blank" rel="noopener noreferrer"
            title="Open in new tab"
            className="relative group block w-[180px] h-[120px] rounded-xl border border-[#30363d] bg-black shrink-0 p-[5px]">
            <div className="relative w-full h-full rounded-lg overflow-hidden bg-black">
              <iframe src={url} title="App preview"
                width="1280" height="880"
                onLoad={() => setPreviewLoaded(true)}
                className={`border-0 absolute top-0 left-0 pointer-events-none transition-opacity duration-200 ${previewLoaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ transform: 'scale(0.1328125)', transformOrigin: 'top left' }}
                sandbox="allow-scripts allow-same-origin allow-forms" />
              {!previewLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="w-4 h-4 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <svg className="w-5 h-5 text-[#e6edf3]" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z" />
                </svg>
              </div>
            </div>
          </a>
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-2 text-[14px] px-3 py-1 rounded-full font-medium mb-2.5"
              style={{ color: '#3fb950', border: '1px solid rgba(63,185,80,0.55)' }}>
              <span className="w-2 h-2 rounded-full bg-[#3fb950] shadow-[0_0_6px_rgba(63,185,80,0.7)]" />
              Live
            </span>
            <div className="flex items-center gap-1.5 mb-2 min-w-0">
              <a href={url} target="_blank" rel="noopener noreferrer"
                title={url}
                className="flex-1 min-w-0 truncate text-[15px] text-[#c9d1d9] underline decoration-[#30363d] underline-offset-[3px] hover:decoration-[#8b949e]">
                {url}
              </a>
              <button onClick={copyUrl} title={copied ? 'Copied!' : 'Copy URL'}
                className="p-1 rounded text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#30363d] transition-colors shrink-0">
                {copied ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="#3fb950"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" /><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" /></svg>
                )}
              </button>
            </div>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-[6px] bg-white text-[#0d1117] text-[13.5px] font-medium rounded-md hover:bg-[#f0f6fc] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z" />
              </svg>
              Visit
            </a>
          </div>
        </div>
      )}

      {/* Deployments timeline */}
      {(deployments || []).length > 0 && (
        <div className="mt-5 border border-[#21262d] rounded-md p-4 bg-[#0c1117]">
          <div className="mb-3">
            <div className="text-[15px] font-semibold text-[#e6edf3]">Deployments</div>
            <div className="text-[12.5px] text-[#8b949e] mt-0.5">All deployed versions of your app</div>
          </div>
          <div className="-mx-2">
            {deployments.slice(0, 10).map((d, i) => {
              const runId = d.id || d.run_id;
              return (
                <div key={runId || i}
                  className={`flex items-start gap-3 text-[13.5px] px-2 py-2 rounded-md transition-colors ${i === 0 ? 'bg-[rgba(46,160,67,0.10)] hover:bg-[rgba(46,160,67,0.14)]' : 'hover:bg-[rgba(255,255,255,0.04)]'
                    }`}>
                  <div className="flex flex-col items-center pt-1 shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-[#3fb950]' : 'bg-[#484f58]'}`} />
                    {i < deployments.slice(0, 10).length - 1 && <div className="w-px flex-1 bg-[#30363d] mt-1 min-h-[20px]" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="text-[#e6edf3] font-medium">Deployment {deployments.length - i}</div>
                    <div className="text-[11.5px] text-[#8b949e] mt-0.5">
                      {d.created_at ? timeAgo(d.created_at, now) : 'unknown time'}
                      {runId && <span className="font-mono ml-2">{String(runId).slice(0, 8)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[#30363d]">
        <button onClick={onRedeploy}
          className="px-4 py-[7px] bg-white text-[#0d1117] text-[14px] font-semibold rounded-md hover:bg-[#f0f6fc] transition-colors">
          Re-deploy changes
        </button>
      </div>
    </>
  );
}

function CloudIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96Z" />
    </svg>
  );
}

function CloudUploadIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96ZM14 13v4h-4v-4H7l5-5 5 5h-3Z" />
    </svg>
  );
}
