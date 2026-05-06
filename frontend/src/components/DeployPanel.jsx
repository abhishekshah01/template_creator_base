import DotsLoader from './DotsLoader';

export const DEPLOY_PHASE_LABELS = {
  build: 'Building Package',
  mongodb_migrate: 'Migrate Database',
  manage_secrets: 'Export Secrets',
  deploy: 'Deploy',
  health_check: 'Run Health Check',
  transfer_files: 'Transfer Files',
  switch_traffic: 'Switch Traffic',
  cleanup_old_deployment: 'Clean Up',
};

function formatElapsed(seconds) {
  if (seconds == null || seconds < 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
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
    <div className="h-full flex flex-col bg-[#0d1117] border border-[#30363d] rounded-md overflow-hidden">
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
        {isIdle && !hasDeployments && (
          <IdleView onStart={onStartDeploy} onSkip={onSkipDeploy} />
        )}
        {isIdle && hasDeployments && (
          <ManageView url={deployUrl || deployments[0]?.deploy_url} deployments={deployments} onRedeploy={onStartDeploy} />
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
      </div>
    </div>
  );
}

function IdleView({ onStart, onSkip }) {
  return (
    <div className="text-center py-10">
      <div className="text-[18px] font-semibold text-[#e6edf3] mb-2">Take your app live</div>
      <p className="text-[13px] text-[#8b949e] mb-6 max-w-[260px] mx-auto leading-relaxed">
        Deploy to a hosted production-ready environment and get a live URL for your app.
      </p>
      <button onClick={onStart}
        className="w-full max-w-[260px] mx-auto px-4 py-2 bg-[#238636] text-white text-[14px] font-medium rounded-md hover:bg-[#2ea043] border border-[#2ea043]/60 transition-colors flex items-center justify-center gap-2 mb-2">
        <CloudUploadIcon className="w-4 h-4" />
        Start Deployment
      </button>
      <button onClick={onSkip}
        className="text-[13px] text-[#8b949e] hover:text-[#e6edf3] transition-colors">
        Skip (already deployed)
      </button>
    </div>
  );
}

function ProgressView({ steps, isFailed, onRetry, onSkip }) {
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
              : Date.now();
            elapsed = formatElapsed(Math.floor((end - start) / 1000));
          }
          return (
            <div key={name}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-[#21262d]' : ''} ${
                isActive ? 'bg-gradient-to-r from-[#1f6feb]/10 to-transparent' : ''
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
              <span className={`flex-1 font-mono text-[13px] ${
                isActive ? 'text-[#58a6ff] font-medium'
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

function ManageView({ url, deployments, onRedeploy }) {
  return (
    <>
      {url && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] px-2 py-[2px] rounded-full font-medium"
              style={{ backgroundColor: 'rgba(35,134,54,0.15)', color: '#3fb950', border: '1px solid rgba(35,134,54,0.3)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
              Live
            </span>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="block font-mono text-[12px] text-[#58a6ff] hover:underline truncate mb-3 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2">
            {url}
          </a>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-[5px] bg-[#21262d] border border-[#30363d] text-[14px] text-[#c9d1d9] rounded-md hover:bg-[#30363d] hover:border-[#484f58] transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z" />
            </svg>
            Visit
          </a>
        </div>
      )}

      {(deployments || []).length > 0 && (
        <div className="mt-5 border-t border-[#30363d] pt-4">
          <div className="text-[11px] uppercase tracking-wide text-[#8b949e] mb-3 font-semibold">Deployment history</div>
          <div className="space-y-2.5">
            {deployments.slice(0, 10).map((d, i) => (
              <div key={d.id || d.run_id || i} className="flex items-start gap-3 text-[13px]">
                <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${i === 0 ? 'bg-[#3fb950]' : 'bg-[#484f58]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[#c9d1d9] truncate">Deployment {deployments.length - i}</div>
                  {d.created_at && (
                    <div className="text-[11px] text-[#8b949e]">{timeAgo(d.created_at)}{d.run_id ? ` · ${String(d.run_id).slice(0, 8)}` : ''}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={onRedeploy}
        className="w-full mt-5 px-4 py-2 bg-[#1f6feb] text-white text-[14px] font-medium rounded-md hover:bg-[#388bfd] border border-[#1f6feb]/60 transition-colors">
        Re-deploy changes
      </button>
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
