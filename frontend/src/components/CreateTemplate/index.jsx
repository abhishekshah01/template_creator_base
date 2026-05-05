import { useState, useRef, useEffect } from 'react';
import { api } from '../../api';
import { usePersistedState, SET_OPTS } from '../../hooks/usePersistedState';
import { useConfirm } from '../../hooks/useConfirm';
import StepCard from './StepCard';
import StatusBar from './StatusBar';
import ProgressBar from './ProgressBar';
import InspectorPanel from './InspectorPanel';
import Banner from '../Banner';

function now() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const CAUTION_KEYWORDS = [
  'setting', 'config', 'rule', 'permission', 'role', 'auth',
  'feature', 'flag', 'schema', 'migration', 'secret', 'credential',
  'env', 'key', 'token', 'webhook', 'integration',
  'preference', 'meta', 'field',
  'policy', 'policies',
];

function collectionInfo(name) {
  const lower = name.toLowerCase();
  const caution = CAUTION_KEYWORDS.some(k => lower.includes(k));
  const message = caution
    ? `"${name}" may contain configuration required for the app to run. Preview on the right before deleting.`
    : `Deletes all "${name}" records. Preview on the right before deleting.`;
  return { caution, message };
}

const INITIAL_SUB = { status: 'idle', message: '', time: '' };

const SUB_OPTS = {
  sanitize: (sub) => (sub && sub.status === 'loading' ? INITIAL_SUB : sub),
};

const STATUSES_OPTS = {
  sanitize: (statuses) => {
    if (!statuses || typeof statuses !== 'object') return {};
    const out = {};
    for (const [k, v] of Object.entries(statuses)) {
      if (v && v.type !== 'loading') out[k] = v;
    }
    return out;
  },
};

function SubStepRow({ label, sub }) {
  const { status, message, time } = sub;
  const labelColor = status === 'idle' ? '#8b949e' : '#e6edf3';
  let icon;
  if (status === 'loading') {
    icon = <div className="w-3.5 h-3.5 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin" />;
  } else if (status === 'success') {
    icon = (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="#3fb950">
        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
      </svg>
    );
  } else if (status === 'error') {
    icon = (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="#f85149">
        <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
      </svg>
    );
  } else {
    icon = <div className="w-3 h-3 rounded-full border border-[#484f58]" />;
  }
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-4 h-4 flex items-center justify-center shrink-0 mt-[2px]">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium" style={{ color: labelColor }}>{label}</span>
          {time && <span className="text-[11px] text-[#484f58] font-mono">{time}</span>}
        </div>
        {message && <div className="text-[12px] text-[#8b949e] mt-0.5">{message}</div>}
      </div>
    </div>
  );
}

export default function CreateTemplate({ bearerToken = "" }) {
  const [step, setStep] = usePersistedState('cT.step', 1);
  const [jobId, setJobId] = usePersistedState('cT.jobId', '');
  const [templateName, setTemplateName] = usePersistedState('cT.templateName', '');
  const [userId, setUserId] = usePersistedState('cT.userId', '');
  const [envId, setEnvId] = usePersistedState('cT.envId', '');
  const [podName, setPodName] = usePersistedState('cT.podName', '');
  const [dbName, setDbName] = usePersistedState('cT.dbName', '');
  const [collections, setCollections] = usePersistedState('cT.collections', []);
  const [selected, setSelected] = usePersistedState('cT.selected', new Set(), SET_OPTS);
  const [times, setTimes] = usePersistedState('cT.times', {});
  const [statuses, setStatuses] = usePersistedState('cT.statuses', {}, STATUSES_OPTS);
  const [gcsPath, setGcsPath] = usePersistedState('cT.gcsPath', '');
  const [logOutput, setLogOutput] = usePersistedState('cT.logOutput', '');
  const [loading, setLoading] = useState('');
  const [jobPaused, setJobPaused] = usePersistedState('cT.jobPaused', false);
  const [podStatus, setPodStatus] = usePersistedState('cT.podStatus', '');

  // Inspector panel state — re-derived from persisted data on mount, not persisted directly
  const [inspectCollection, setInspectCollection] = usePersistedState('cT.inspectCollection', '');
  const [inspectorStatus, setInspectorStatus] = useState('idle'); // 'idle' | 'loading' | 'error' | 'ready'
  const [inspectorReason, setInspectorReason] = useState('');     // 'paused' | 'not-found' | 'other'

  // Step 3 sub-step status (pause + create run sequentially under one button)
  const [pauseSub, setPauseSub] = usePersistedState('cT.pauseSub', INITIAL_SUB, SUB_OPTS);
  const [createSub, setCreateSub] = usePersistedState('cT.createSub', INITIAL_SUB, SUB_OPTS);

  const { confirm, dialog: confirmDialog } = useConfirm();

  // Resume flow state for paused jobs
  const [resumeState, setResumeState] = useState('idle'); // 'idle' | 'resuming' | 'success' | 'error'
  const [resumeError, setResumeError] = useState('');
  const [resumeElapsed, setResumeElapsed] = useState(0);
  const resumeStartRef = useRef(null);

  // Tick a 1s counter for the entire active resume window (click → success/error).
  useEffect(() => {
    if (resumeState !== 'resuming') {
      resumeStartRef.current = null;
      setResumeElapsed(0);
      return;
    }
    if (!resumeStartRef.current) resumeStartRef.current = Date.now();
    const id = setInterval(() => {
      setResumeElapsed(Math.floor((Date.now() - resumeStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [resumeState]);

  // On mount, re-derive transient inspector state from persisted data
  // so a refresh lands in the same visual state as before.
  useEffect(() => {
    if (jobPaused) {
      setInspectorStatus('error');
      setInspectorReason('paused');
    } else if (dbName && collections.length > 0) {
      setInspectorStatus('ready');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepsRef = useRef({});

  function scrollToStep(n) {
    setTimeout(() => stepsRef.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }

  function setStatusFor(stepNum, message, type, hint) {
    setStatuses(prev => ({ ...prev, [stepNum]: { message, type, hint } }));
  }

  function completeStep(n) {
    setTimes(prev => ({ ...prev, [n]: now() }));
    setStep(n + 1);
    scrollToStep(n + 1);
  }

  async function reset() {
    if (step > 1) {
      const ok = await confirm({
        title: 'Reset workflow?',
        description: "All progress in this flow will be lost. You'll need to start again from Step 1.",
        confirmLabel: 'Reset',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });
      if (!ok) return;
    }
    setStep(1); setJobId(''); setTemplateName(''); setUserId(''); setEnvId('');
    setPodName(''); setDbName(''); setCollections([]); setSelected(new Set());
    setTimes({}); setStatuses({}); setGcsPath(''); setLogOutput(''); setLoading('');
    setJobPaused(false); setPodStatus('');
    setInspectorStatus('idle'); setInspectorReason('');
    setPauseSub(INITIAL_SUB); setCreateSub(INITIAL_SUB);
    setResumeState('idle'); setResumeError(''); setResumeElapsed(0);
  }

  function stepStatus(n) {
    if (n < step) return 'locked';
    if (n === step) return 'active';
    return 'disabled';
  }

  async function fetchJob() {
    if (!jobId.trim()) { setStatusFor(1, 'Please enter a Job ID', 'error'); return; }
    if (!templateName.trim()) { setStatusFor(1, 'Please enter a Template Name', 'error'); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) { setStatusFor(1, 'Template name: only letters, numbers, hyphens, underscores', 'error'); return; }

    setLoading('fetch');
    setJobPaused(false);
    setUserId('');
    setEnvId('');
    setPodName('');
    setInspectorStatus('loading');
    setInspectorReason('');
    setStatusFor(1, 'Fetching job details...', 'loading');
    try {
      const info = await api.getJobInfo(jobId, bearerToken);
      setUserId(info.user_id || '');
      setEnvId(info.env_id || '');
      setPodName(info.pod_info?.pod_name || '');
      setPodStatus(info.pod_status || '');

      if (info.is_paused) {
        setJobPaused(true);
        setStep(1);
        setTimes(prev => { const { 1: _, ...rest } = prev; return rest; });
        setPodStatus(info.pod_status || 'PAUSED');
        setStatusFor(1, 'failed', 'error');
        setInspectorStatus('error');
        setInspectorReason('paused');
        return;
      }

      setStatusFor(1, 'Fetching database collections...', 'loading');
      const coll = await api.getCollections(jobId);
      setDbName(coll.db_name);
      setCollections(coll.collections);
      setSelected(new Set());
      setStatusFor(1, `Found ${coll.collections.length} collection(s) in "${coll.db_name}"`, 'success');
      setInspectorStatus('ready');
      completeStep(1);
    } catch (e) {
      setStep(1);
      setTimes(prev => { const { 1: _, ...rest } = prev; return rest; });
      // Clear stale data from any previous successful fetch
      setCollections([]);
      setDbName('');
      setUserId('');
      setEnvId('');
      setPodName('');
      const msg = e.message || '';
      if (msg.toLowerCase().includes('timed out') || msg.toLowerCase().includes('pod exec failed')) {
        setJobPaused(true);
        setPodStatus(podStatus || 'POD_NOT_FOUND');
        setStatusFor(1, 'failed', 'error');
        setInspectorStatus('error');
        setInspectorReason('paused');
      } else {
        const dotIdx = msg.indexOf('. ');
        if (dotIdx > 0 && msg.toLowerCase().includes('not found')) {
          const errorMsg = msg.slice(0, dotIdx + 1);
          const hintMsg = msg.slice(dotIdx + 2);
          setStatusFor(1, errorMsg, 'error', hintMsg);
          setInspectorStatus('error');
          setInspectorReason('not-found');
        } else {
          setStatusFor(1, msg, 'error');
          setInspectorStatus('error');
          setInspectorReason('other');
        }
      }
    } finally {
      setLoading('');
    }
  }

  async function deleteSelected() {
    const toDelete = [...selected];
    if (toDelete.length === 0) { skipDelete(); return; }
    const ok = await confirm({
      title: `Delete ${toDelete.length} collection${toDelete.length > 1 ? 's' : ''}?`,
      description: `These collections will be permanently dropped from "${dbName}". This cannot be undone.`,
      details: toDelete,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    setLoading('delete');
    setStatusFor(2, `Deleting ${toDelete.length} collection(s)...`, 'loading');
    try {
      const data = await api.deleteCollections(jobId, dbName, toDelete);
      const dropped = data.results.filter(r => r.status === 'dropped').length;
      const failed = data.results.filter(r => r.status === 'failed');
      if (failed.length > 0) {
        setStatusFor(2, `Dropped ${dropped}, failed ${failed.length}: ${failed.map(f => f.collection).join(', ')}`, 'error');
      } else {
        setStatusFor(2, `Dropped ${dropped} collection(s)`, 'success');
        completeStep(2);
      }
    } catch (e) {
      setStatusFor(2, e.message, 'error');
    } finally {
      setLoading('');
    }
  }

  function skipDelete() {
    setStatusFor(2, 'Skipped collection cleanup', 'info');
    completeStep(2);
  }

  function toggleCollection(name) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function inspectCollectionFromEye(name) {
    setInspectCollection(name);
  }

  function selectAll(checked) {
    setSelected(checked ? new Set(collections.map(c => c.name)) : new Set());
  }

  async function resumeJob() {
    if (!jobId || resumeState === 'resuming') return;
    setResumeState('resuming');
    setResumeError('');
    try {
      await api.restartJob(jobId, bearerToken);
    } catch (e) {
      setResumeState('error');
      setResumeError(e.message);
      return;
    }

    const startTime = Date.now();
    const MAX_WAIT_MS = 90_000;
    const POLL_INTERVAL_MS = 3000;
    const startingJobId = jobId;

    const pollOnce = async () => {
      if (jobId !== startingJobId) return;
      if (Date.now() - startTime > MAX_WAIT_MS) {
        setResumeState('error');
        setResumeError('Environment did not become ready within 90 seconds. Try again.');
        return;
      }
      try {
        const info = await api.getJobInfo(jobId, bearerToken);
        if (!info.is_paused) {
          setResumeState('success');
          setTimeout(() => {
            if (jobId !== startingJobId) return;
            setResumeState('idle');
            setJobPaused(false);
            fetchJob();
          }, 1200);
          return;
        }
      } catch {
        // transient error during polling — keep going until timeout
      }
      setTimeout(pollOnce, POLL_INTERVAL_MS);
    };
    setTimeout(pollOnce, POLL_INTERVAL_MS);
  }

  async function runCreateTemplate() {
    if (!userId) {
      setCreateSub({ status: 'error', message: 'User ID not found.', time: now() });
      return;
    }
    setLoading('create');

    if (pauseSub.status !== 'success') {
      setPauseSub({ status: 'loading', message: 'Pausing job and triggering restic backup...', time: '' });
      try {
        const data = await api.pauseJob(jobId);
        setPauseSub({ status: 'success', message: `Job paused: ${data.message || data.status}`, time: now() });
      } catch (e) {
        setPauseSub({ status: 'error', message: e.message, time: now() });
        setLoading('');
        return;
      }
    }

    setCreateSub({ status: 'loading', message: 'Creating template (this may take a few minutes)...', time: '' });
    setGcsPath('');
    setLogOutput('');
    try {
      const data = await api.createTemplate(jobId, userId, templateName);
      if (data.output) setLogOutput(data.output);
      if (data.status === 'success') {
        setGcsPath(data.gcs_path);
        setCreateSub({ status: 'success', message: 'Template created successfully!', time: now() });
        completeStep(3);
      } else {
        setLogOutput(data.error || data.output);
        setCreateSub({ status: 'error', message: 'Template creation failed -- check log output', time: now() });
      }
    } catch (e) {
      setCreateSub({ status: 'error', message: e.message, time: now() });
    } finally {
      setLoading('');
    }
  }

  const listRef = useRef(null);

  // GitHub new-repo style: 14px base, compact spacing
  const inputCls = "w-full px-3 py-[5px] bg-[#0d1117] border border-[#30363d] rounded-md text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb] focus:shadow-[0_0_0_3px_rgba(31,111,235,0.3)] placeholder:text-[#484f58] transition-shadow";
  const btnPrimary = "px-3 py-[5px] bg-[#238636] text-white text-[14px] font-medium rounded-md hover:bg-[#2ea043] disabled:opacity-50 transition-colors flex items-center gap-2";
  const btnDefault = "px-3 py-[5px] bg-[#21262d] border border-[#30363d] text-[14px] text-[#c9d1d9] rounded-md hover:bg-[#30363d] hover:border-[#484f58] disabled:opacity-50 transition-colors flex items-center gap-2";
  const btnDanger = "px-3 py-[5px] bg-[#8b1a1a] text-white text-[14px] font-medium border border-[#da3633]/40 rounded-md hover:bg-[#a32424] disabled:opacity-50 transition-colors flex items-center gap-2";
  const btnGhost = "px-3 py-[5px] text-[14px] text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] hover:border-[#484f58] transition-colors";
  const labelCls = "block text-[14px] font-semibold text-[#e6edf3] mb-1";
  const helperCls = "text-[12px] text-[#8b949e]";
  const spinner = "w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin";

  return (
    <>
    <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 64px)' }}>
    {/* Left: Workflow */}
    <div className="flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[20px] font-semibold text-[#e6edf3]">Create Template</h1>
        <button onClick={reset} className={btnDefault}>
          Reset
        </button>
      </div>
      <p className={`${helperCls} mb-4`}>
        Automate template creation from an ephemeral job environment. Required fields are marked with an asterisk (*).
      </p>

      <ProgressBar currentStep={step} totalSteps={3} onStepClick={(n) => scrollToStep(n)} />

      {/* Step 1 */}
      <div ref={el => stepsRef.current[1] = el}>
        <StepCard number={1} title="Identify Job" time={times[1]} status={stepStatus(1)} hasError={statuses[1]?.type === 'error'}>
          <div className="flex gap-3 items-end mb-3">
            <div className="flex-[2]">
              <label className={labelCls}>Job ID <span className="text-[#f85149]">*</span></label>
              <input type="text" value={jobId} onChange={e => setJobId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchJob()}
                placeholder="54ae01c4-d111-447a-baa4-c35854d2c5f1"
                className={`${inputCls} font-mono`} />
            </div>
            <div className="flex-1">
              <label className={labelCls}>Template Name <span className="text-[#f85149]">*</span></label>
              <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchJob()}
                placeholder="lead-gen-v2"
                className={inputCls} />
            </div>
            <button onClick={fetchJob} disabled={loading === 'fetch'} className={`${btnDefault} shrink-0`} data-testid="fetch-job-btn">
              Fetch Job Info
            </button>
          </div>
          {jobPaused && (() => {
            const isResuming = resumeState === 'resuming';
            const isSuccess = resumeState === 'success';
            const isError = resumeState === 'error';
            const variant = isSuccess ? 'success' : isError ? 'critical' : isResuming ? 'upsell' : 'warning';
            const message = isResuming
              ? `Resuming environment... ${resumeElapsed}s elapsed.`
              : isSuccess
                ? 'Environment is ready. Continuing...'
                : isError
                  ? `Resume failed: ${resumeError}`
                  : 'This job is paused. Click Resume Job to wake the environment — takes ~30–60s.';
            return (
              <Banner
                variant={variant}
                className="mb-3"
                action={isSuccess ? null : (
                  <button onClick={resumeJob} disabled={isResuming} className={btnDefault} data-testid="resume-job-btn">
                    {isResuming && <div className={spinner} />}
                    {isResuming ? 'Resuming...' : isError ? 'Retry' : 'Resume Job'}
                  </button>
                )}
              >
                {message}
              </Banner>
            );
          })()}
          <StatusBar {...(statuses[1] || {})} />
          {(userId || envId || podName) && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {userId && (
                <span className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-[3px] rounded-full font-mono"
                  style={{ backgroundColor: 'rgba(31,111,235,0.15)', color: '#58a6ff', border: '1px solid rgba(31,111,235,0.3)' }}>
                  User <span className="text-[#c9d1d9]">{userId}</span>
                </span>
              )}
              {envId && (
                <span className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-[3px] rounded-full font-mono"
                  style={{ backgroundColor: 'rgba(35,134,54,0.15)', color: '#3fb950', border: '1px solid rgba(35,134,54,0.3)' }}>
                  Env <span className="text-[#c9d1d9]">{envId}</span>
                </span>
              )}
              {podName && (
                <span className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-[3px] rounded-full font-mono"
                  style={{ backgroundColor: 'rgba(137,87,229,0.15)', color: '#bc8cff', border: '1px solid rgba(137,87,229,0.3)' }}>
                  Pod <span className="text-[#c9d1d9]">{podName}</span>
                </span>
              )}
            </div>
          )}
        </StepCard>
      </div>

      {/* Step 2 */}
      <div ref={el => stepsRef.current[2] = el}>
        <StepCard number={2} title="Clear Database Collections" time={times[2]} status={stepStatus(2)} hasError={statuses[2]?.type === 'error'}>
          <p className={`${helperCls} mb-3`}>Select collections to delete. Unselected will be preserved.</p>
          {collections.length > 0 && (
            <Banner variant="info" className="mb-3">
              Not sure what a table contains? Click its name in the Inspector → to preview the data.
            </Banner>
          )}
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => selectAll(true)}
              className="text-[13px] text-[#58a6ff] hover:underline">
              Select all
            </button>
            <button onClick={() => selectAll(false)}
              className="text-[13px] text-[#58a6ff] hover:underline">
              Deselect all
            </button>
            <span className="text-[12px] text-[#484f58] ml-auto">{selected.size} of {collections.length} selected</span>
          </div>
          <div ref={listRef} className="max-h-[240px] overflow-y-auto border border-[#30363d] rounded-md">
            {collections.length === 0
              ? <p className="text-[12px] text-[#484f58] p-4 text-center">No collections found.</p>
              : collections.map(c => {
                  const checked = selected.has(c.name);
                  const info = collectionInfo(c.name);
                  return (
                    <div key={c.name} onClick={() => toggleCollection(c.name)}
                      className={`flex items-center gap-2.5 px-3 py-[7px] text-[13px] border-b border-[#21262d] last:border-b-0 cursor-pointer transition-colors group ${
                        checked ? 'bg-[#da3633]/5' : 'hover:bg-[#161b22]'
                      }`}>
                      <div className={`w-[16px] h-[16px] rounded-[4px] flex items-center justify-center shrink-0 transition-all ${
                        checked
                          ? 'bg-[#da3633] border border-[#da3633]'
                          : 'bg-transparent border border-[#484f58]'
                      }`}>
                        {checked && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                          </svg>
                        )}
                      </div>
                      <span className={`font-mono text-[12px] flex-1 ${checked ? 'text-[#f85149]' : 'text-[#e6edf3]'}`}>{c.name}</span>
                      <div className="relative shrink-0 group/info" onClick={e => e.stopPropagation()}>
                        <svg className={`w-3.5 h-3.5 cursor-help ${info.caution ? 'text-[#aa7109]' : 'text-[#484f58] hover:text-[#8b949e]'}`}
                          viewBox="0 0 16 16" fill="currentColor">
                          <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
                        </svg>
                        <div className="absolute right-0 top-[calc(100%+4px)] w-[260px] z-20 invisible group-hover/info:visible bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-[12px] leading-[1.5] text-[#c9d1d9] shadow-lg pointer-events-none">
                          {info.message}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); inspectCollectionFromEye(c.name); }}
                        className="p-1 rounded hover:bg-[#30363d] text-[#484f58] hover:text-[#e6edf3] transition-colors opacity-0 group-hover:opacity-100"
                        title="View collection data">
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.824.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z" />
                        </svg>
                      </button>
                    </div>
                  );
                })
            }
          </div>
          <div className="flex gap-2 mt-3">
            {collections.length > 0 && (
            <button onClick={deleteSelected} disabled={loading === 'delete' || selected.size === 0} className={btnDanger} data-testid="delete-selected-btn">
                {loading === 'delete' && <div className={spinner} />}
                {loading === 'delete' ? 'Working...' : `Delete Selected (${selected.size})`}
              </button>
            )}
          <button onClick={skipDelete} className={btnGhost} data-testid="skip-delete-btn">Skip (DB already clean)</button>
          </div>
          <StatusBar {...(statuses[2] || {})} />
        </StepCard>
      </div>

      {/* Step 3 */}
      <div ref={el => stepsRef.current[3] = el}>
        <StepCard number={3} title="Create Template" time={times[3]} status={stepStatus(3)}
          hasError={pauseSub.status === 'error' || createSub.status === 'error'}>
          <Banner variant="info" className="mb-3">
            Don't refresh the app preview before clicking Create — it re-seeds the database.
          </Banner>
          <p className={`${helperCls} mb-3`}>Pauses the job (restic snapshot) and runs the creation script on the dev VM. Sanitizes .env and stores in GCS.</p>
          <button onClick={runCreateTemplate} disabled={loading === 'create'} className={btnPrimary} data-testid="create-template-btn">
            {loading === 'create' && <div className={spinner} />}
            {loading === 'create' ? 'Working...' : 'Create Template'}
          </button>

          {(pauseSub.status !== 'idle' || createSub.status !== 'idle') && (
            <div className="mt-4 border border-[#30363d] rounded-md bg-[#0d1117] px-3 divide-y divide-[#21262d]">
              <SubStepRow label="Pause job" sub={pauseSub} />
              <SubStepRow label="Create template" sub={createSub} />
            </div>
          )}

          {logOutput && (
            <pre className="mt-3 bg-[#0d1117] border border-[#30363d] rounded-md p-3 text-[11px] text-[#8b949e] max-h-[180px] overflow-y-auto whitespace-pre-wrap font-mono">
              {logOutput}
            </pre>
          )}
          {gcsPath && (
            <div className="mt-3 p-3 bg-[#238636]/10 border border-[#238636]/30 rounded-md">
              <div className="text-[14px] text-[#3fb950] font-medium flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                </svg>
                Template created successfully!
              </div>
              <div className="font-mono text-[12px] text-[#3fb950] bg-[#0d1117] px-3 py-2 rounded-md break-all">{gcsPath}</div>
            </div>
          )}
        </StepCard>
      </div>
    </div>

    {/* Right: Inspector Panel (always visible) */}
    <div className="w-[480px] shrink-0 sticky top-0 h-[calc(100vh-64px)]">
      <InspectorPanel
        jobId={jobId}
        dbName={dbName}
        collections={collections}
        inspectCollection={inspectCollection}
        onInspected={() => setInspectCollection('')}
        status={inspectorStatus}
        errorReason={inspectorReason}
      />
    </div>

    </div>
    {confirmDialog}
    </>
  );
}
