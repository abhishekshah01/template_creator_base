import { useState, useRef, useEffect } from 'react';
import { api } from '../../api';
import StepCard from './StepCard';
import StatusBar from './StatusBar';
import ProgressBar from './ProgressBar';
import { RefreshCw, AlertTriangle, CheckCircle } from '../Icons';

function now() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function CreateTemplate() {
  const [step, setStep] = useState(1);
  const [jobId, setJobId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [userId, setUserId] = useState('');
  const [envId, setEnvId] = useState('');
  const [podName, setPodName] = useState('');
  const [dbName, setDbName] = useState('');
  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [times, setTimes] = useState({});
  const [statuses, setStatuses] = useState({});
  const [gcsPath, setGcsPath] = useState('');
  const [logOutput, setLogOutput] = useState('');
  const [loading, setLoading] = useState('');
  const [jobPaused, setJobPaused] = useState(false);
  const [podStatus, setPodStatus] = useState('');

  const stepsRef = useRef({});

  function scrollToStep(n) {
    setTimeout(() => stepsRef.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  }

  function setStatusFor(stepNum, message, type) {
    setStatuses(prev => ({ ...prev, [stepNum]: { message, type } }));
  }

  function completeStep(n) {
    setTimes(prev => ({ ...prev, [n]: now() }));
    setStep(n + 1);
    scrollToStep(n + 1);
  }

  function reset() {
    if (step > 1 && !confirm('Reset the entire flow? All progress will be lost.')) return;
    setStep(1); setJobId(''); setTemplateName(''); setUserId(''); setEnvId('');
    setPodName(''); setDbName(''); setCollections([]); setSelected(new Set());
    setTimes({}); setStatuses({}); setGcsPath(''); setLogOutput(''); setLoading('');
    setJobPaused(false); setPodStatus('');
  }

  function stepStatus(n) {
    if (n < step) return 'locked';
    if (n === step) return 'active';
    return 'disabled';
  }

  // Step 1: Fetch Job
  async function fetchJob() {
    if (!jobId.trim()) { setStatusFor(1, 'Please enter a Job ID', 'error'); return; }
    if (!templateName.trim()) { setStatusFor(1, 'Please enter a Template Name', 'error'); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) { setStatusFor(1, 'Template name: only letters, numbers, hyphens, underscores', 'error'); return; }

    setLoading('fetch');
    setJobPaused(false);
    setStatusFor(1, 'Fetching job info...', 'loading');
    try {
      const info = await api.getJobInfo(jobId);
      setUserId(info.user_id || '');
      setEnvId(info.env_id || '');
      setPodName(info.pod_info?.pod_name || '');
      setPodStatus(info.pod_status || '');

      if (info.is_paused) {
        setJobPaused(true);
        setStatusFor(1, `Job is paused (${info.pod_status}). Resume the job on the platform before proceeding.`, 'error');
        return;
      }

      setStatusFor(1, 'Fetching collections...', 'loading');
      const coll = await api.getCollections(jobId);
      setDbName(coll.db_name);
      setCollections(coll.collections);
      setSelected(new Set());
      setStatusFor(1, `Found ${coll.collections.length} collection(s) in "${coll.db_name}"`, 'success');
      completeStep(1);
    } catch (e) {
      setStatusFor(1, e.message, 'error');
    } finally {
      setLoading('');
    }
  }

  // Step 2: Delete Collections
  async function deleteSelected() {
    const toDelete = [...selected];
    if (toDelete.length === 0) { skipDelete(); return; }
    if (!confirm(`Delete ${toDelete.length} collection(s)?\n\n${toDelete.join('\n')}\n\nThis cannot be undone.`)) return;

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

  function selectAll(checked) {
    setSelected(checked ? new Set(collections.map(c => c.name)) : new Set());
  }

  // Step 3: Pause
  async function pauseJob() {
    setLoading('pause');
    setStatusFor(3, 'Pausing job and triggering restic backup...', 'loading');
    try {
      const data = await api.pauseJob(jobId);
      setStatusFor(3, `Job paused: ${data.message || data.status}`, 'success');
      completeStep(3);
    } catch (e) {
      setStatusFor(3, e.message, 'error');
    } finally {
      setLoading('');
    }
  }

  // Step 4: Create Template
  async function createTemplate() {
    if (!userId) { setStatusFor(4, 'User ID not found.', 'error'); return; }
    setLoading('create');
    setStatusFor(4, 'Creating template (this may take a few minutes)...', 'loading');
    try {
      const data = await api.createTemplate(jobId, userId, templateName);
      if (data.output) setLogOutput(data.output);
      if (data.status === 'success') {
        setGcsPath(data.gcs_path);
        setStatusFor(4, 'Template created successfully!', 'success');
        completeStep(4);
      } else {
        setLogOutput(data.error || data.output);
        throw new Error('Template creation failed -- check log output');
      }
    } catch (e) {
      setStatusFor(4, e.message, 'error');
    } finally {
      setLoading('');
    }
  }

  const listRef = useRef(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const el = listRef.current;
    if (!el || collections.length === 0) return;
    const check = () => setShowScrollHint(el.scrollHeight > el.clientHeight && el.scrollTop + el.clientHeight < el.scrollHeight - 10);
    check();
    el.addEventListener('scroll', check);
    return () => el.removeEventListener('scroll', check);
  }, [collections]);

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-medium">Create Template</h2>
        <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 text-xs hover:text-slate-200 hover:border-slate-500 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      <ProgressBar currentStep={step} />

      {/* Step 1 */}
      <div ref={el => stepsRef.current[1] = el}>
        <StepCard number={1} title="Identify Job" time={times[1]} status={stepStatus(1)}>
          <div className="flex gap-3 mb-3">
            <div className="flex-[2]">
              <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1 font-medium">Job ID</label>
              <input type="text" value={jobId} onChange={e => setJobId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchJob()}
                placeholder="e.g. 54ae01c4-d111-447a-baa4-c35854d2c5f1"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500 placeholder:text-slate-600" />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1 font-medium">Template Name</label>
              <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchJob()}
                placeholder="e.g. lead-gen-v2"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 outline-none focus:border-blue-500 placeholder:text-slate-600" />
            </div>
          </div>
          <button onClick={fetchJob} disabled={loading === 'fetch'}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {loading === 'fetch' && <div className="w-3.5 h-3.5 border-2 border-blue-300/30 border-t-white rounded-full animate-spin" />}
            {loading === 'fetch' ? 'Working...' : 'Fetch Job Info'}
          </button>
          {jobPaused && (
            <div className="mt-3 bg-amber-900/30 border border-amber-800/50 rounded-lg px-3.5 py-3 text-xs text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <div>
                <strong>Job is paused</strong> (status: {podStatus}). Resume the job on the Emergent platform first, then click "Fetch Job Info" again.
              </div>
            </div>
          )}
          {userId && (
            <div className="flex gap-2 mt-2.5 flex-wrap">
              <span className="text-[11px] bg-slate-950 border border-slate-700 px-2.5 py-1 rounded-md text-slate-400">User: <strong className="text-slate-200">{userId.slice(0, 8)}...</strong></span>
              <span className="text-[11px] bg-slate-950 border border-slate-700 px-2.5 py-1 rounded-md text-slate-400">Env: <strong className="text-slate-200">{envId.slice(0, 8)}...</strong></span>
              <span className="text-[11px] bg-slate-950 border border-slate-700 px-2.5 py-1 rounded-md text-slate-400">Pod: <strong className="text-slate-200">{podName.slice(0, 12)}...</strong></span>
            </div>
          )}
          <StatusBar {...(statuses[1] || {})} />
        </StepCard>
      </div>

      {/* Step 2 */}
      <div ref={el => stepsRef.current[2] = el}>
        <StepCard number={2} title="Clear Database Collections" time={times[2]} status={stepStatus(2)}>
          <p className="text-xs text-slate-500 mb-3">Select which collections to delete. Unselected collections will be preserved.</p>
          <div className="flex gap-2 mb-2">
            <button onClick={() => selectAll(true)} className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-400 text-xs rounded-lg hover:bg-slate-700 hover:text-slate-200">Select All</button>
            <button onClick={() => selectAll(false)} className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-400 text-xs rounded-lg hover:bg-slate-700 hover:text-slate-200">Deselect All</button>
          </div>
          <div ref={listRef} className={`max-h-[260px] overflow-y-auto border rounded-lg ${showScrollHint ? 'border-blue-500 border-b-2' : 'border-slate-700'}`}>
            {collections.length === 0
              ? <p className="text-xs text-slate-500 p-3.5 text-center">No collections found. Database is already empty.</p>
              : collections.map(c => (
                  <div key={c.name} onClick={() => toggleCollection(c.name)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm border-b border-slate-900 last:border-b-0 cursor-pointer hover:bg-slate-700/50 transition-colors">
                    <input type="checkbox" checked={selected.has(c.name)} readOnly
                      className="w-4 h-4 accent-red-600 pointer-events-none" />
                    <span className="text-slate-200">{c.name}</span>
                  </div>
                ))
            }
          </div>
          {showScrollHint && <p className="text-center text-[11px] text-slate-500 py-1.5">Scroll to see all {collections.length} collections</p>}
          <div className="flex gap-2 mt-3">
            {collections.length > 0 && (
              <button onClick={deleteSelected} disabled={loading === 'delete' || selected.size === 0}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                {loading === 'delete' && <div className="w-3.5 h-3.5 border-2 border-red-300/30 border-t-white rounded-full animate-spin" />}
                {loading === 'delete' ? 'Working...' : `Delete Selected (${selected.size})`}
              </button>
            )}
            <button onClick={skipDelete} className="px-3 py-2 text-xs text-slate-500 border border-slate-700 rounded-lg hover:text-slate-300 hover:border-slate-500">
              Skip (DB already clean)
            </button>
          </div>
          <StatusBar {...(statuses[2] || {})} />
        </StepCard>
      </div>

      {/* Step 3 */}
      <div ref={el => stepsRef.current[3] = el}>
        <StepCard number={3} title="Pause Job (Trigger Restic Backup)" time={times[3]} status={stepStatus(3)}>
          <div className="bg-amber-900/30 border border-amber-800/50 rounded-lg px-3.5 py-2.5 mb-3 text-xs text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Do NOT refresh the app preview before pausing! The preview will re-seed the database.
          </div>
          <p className="text-xs text-slate-500 mb-3">Pausing creates a restic snapshot of the current (cleaned) state.</p>
          <button onClick={pauseJob} disabled={loading === 'pause'}
            className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
            {loading === 'pause' && <div className="w-3.5 h-3.5 border-2 border-amber-300/30 border-t-white rounded-full animate-spin" />}
            {loading === 'pause' ? 'Working...' : 'Pause Job'}
          </button>
          <StatusBar {...(statuses[3] || {})} />
        </StepCard>
      </div>

      {/* Step 4 */}
      <div ref={el => stepsRef.current[4] = el}>
        <StepCard number={4} title="Create Template" time={times[4]} status={stepStatus(4)}>
          <p className="text-xs text-slate-500 mb-3">Runs the template creation script on the dev VM. Auto-sanitizes .env secrets and stores in GCS.</p>
          <button onClick={createTemplate} disabled={loading === 'create'}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
            {loading === 'create' && <div className="w-3.5 h-3.5 border-2 border-green-300/30 border-t-white rounded-full animate-spin" />}
            {loading === 'create' ? 'Working...' : 'Create Template'}
          </button>
          <StatusBar {...(statuses[4] || {})} />
          {logOutput && (
            <pre className="mt-3 bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-400 max-h-[200px] overflow-y-auto whitespace-pre-wrap font-mono">
              {logOutput}
            </pre>
          )}
          {gcsPath && (
            <div className="mt-4 p-3.5 bg-green-950 border border-green-900 rounded-lg">
              <div className="text-sm text-green-300 font-medium flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4" /> Template created successfully!
              </div>
              <div className="font-mono text-xs text-green-400 bg-slate-950 px-3.5 py-2.5 rounded-md break-all">{gcsPath}</div>
            </div>
          )}
        </StepCard>
      </div>
    </>
  );
}
