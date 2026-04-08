import { useState, useRef, useEffect } from 'react';
import { api } from '../../api';
import StepCard from './StepCard';
import StatusBar from './StatusBar';
import ProgressBar from './ProgressBar';

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

  async function fetchJob() {
    if (!jobId.trim()) { setStatusFor(1, 'Please enter a Job ID', 'error'); return; }
    if (!templateName.trim()) { setStatusFor(1, 'Please enter a Template Name', 'error'); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) { setStatusFor(1, 'Template name: only letters, numbers, hyphens, underscores', 'error'); return; }

    setLoading('fetch');
    setJobPaused(false);
    setStatusFor(1, 'Fetching job details...', 'loading');
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

      setStatusFor(1, 'Fetching database collections...', 'loading');
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

  // GitHub new-repo style: 14px base, compact spacing
  const inputCls = "w-full px-3 py-[5px] bg-[#0d1117] border border-[#30363d] rounded-md text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb] focus:shadow-[0_0_0_3px_rgba(31,111,235,0.3)] placeholder:text-[#484f58] transition-shadow";
  const btnPrimary = "px-3 py-[5px] bg-[#238636] text-white text-[14px] font-medium rounded-md hover:bg-[#2ea043] disabled:opacity-50 transition-colors flex items-center gap-2";
  const btnDefault = "px-3 py-[5px] bg-[#21262d] border border-[#30363d] text-[14px] text-[#c9d1d9] rounded-md hover:bg-[#30363d] hover:border-[#484f58] disabled:opacity-50 transition-colors flex items-center gap-2";
  const btnDanger = "px-3 py-[5px] bg-[#da3633] text-white text-[14px] rounded-md hover:bg-[#b62324] disabled:opacity-50 transition-colors flex items-center gap-2";
  const btnGhost = "px-3 py-[5px] text-[12px] text-[#8b949e] border border-[#30363d] rounded-md hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors";
  const labelCls = "block text-[14px] font-semibold text-[#e6edf3] mb-1";
  const helperCls = "text-[12px] text-[#8b949e]";
  const spinner = "w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin";

  return (
    <div className="max-w-[680px]">
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

      <ProgressBar currentStep={step} onStepClick={(n) => scrollToStep(n)} />

      {/* Step 1 */}
      <div ref={el => stepsRef.current[1] = el}>
        <StepCard number={1} title="Identify Job" time={times[1]} status={stepStatus(1)}>
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
            <button onClick={fetchJob} disabled={loading === 'fetch'} className={`${btnDefault} shrink-0`}>
              Fetch Job Info
            </button>
          </div>
          {jobPaused && (
            <div className="mb-3 bg-[#9e6a03]/15 border border-[#9e6a03]/30 rounded-md px-3 py-2 text-[12px] text-[#d29922] flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
              </svg>
              <strong>Job is paused</strong> ({podStatus}). Resume first, then retry.
            </div>
          )}
          <StatusBar {...(statuses[1] || {})} />
          {userId && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-[3px] rounded-full font-mono"
                style={{ backgroundColor: 'rgba(31,111,235,0.15)', color: '#58a6ff', border: '1px solid rgba(31,111,235,0.3)' }}>
                User <span className="text-[#c9d1d9]">{userId}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-[3px] rounded-full font-mono"
                style={{ backgroundColor: 'rgba(35,134,54,0.15)', color: '#3fb950', border: '1px solid rgba(35,134,54,0.3)' }}>
                Env <span className="text-[#c9d1d9]">{envId}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-[3px] rounded-full font-mono"
                style={{ backgroundColor: 'rgba(137,87,229,0.15)', color: '#bc8cff', border: '1px solid rgba(137,87,229,0.3)' }}>
                Pod <span className="text-[#c9d1d9]">{podName}</span>
              </span>
            </div>
          )}
        </StepCard>
      </div>

      {/* Step 2 */}
      <div ref={el => stepsRef.current[2] = el}>
        <StepCard number={2} title="Clear Database Collections" time={times[2]} status={stepStatus(2)}>
          <p className={`${helperCls} mb-3`}>Select collections to delete. Unselected will be preserved.</p>
          <div className="flex gap-1.5 mb-2">
            <button onClick={() => selectAll(true)} className={btnGhost}>Select All</button>
            <button onClick={() => selectAll(false)} className={btnGhost}>Deselect All</button>
          </div>
          <div ref={listRef} className="max-h-[240px] overflow-y-auto border border-[#30363d] rounded-md">
            {collections.length === 0
              ? <p className="text-[12px] text-[#484f58] p-4 text-center">No collections found.</p>
              : collections.map(c => (
                  <div key={c.name} onClick={() => toggleCollection(c.name)}
                    className={`flex items-center gap-2.5 px-3 py-[6px] text-[13px] border-b border-[#21262d] last:border-b-0 cursor-pointer transition-colors ${
                      selected.has(c.name) ? 'bg-[#da3633]/5' : 'hover:bg-[#161b22]'
                    }`}>
                    <input type="checkbox" checked={selected.has(c.name)} readOnly
                      className="w-[14px] h-[14px] accent-[#da3633] pointer-events-none" />
                    <span className={`font-mono text-[12px] ${selected.has(c.name) ? 'text-[#f85149]' : 'text-[#e6edf3]'}`}>{c.name}</span>
                  </div>
                ))
            }
          </div>
          <div className="flex gap-2 mt-3">
            {collections.length > 0 && (
              <button onClick={deleteSelected} disabled={loading === 'delete' || selected.size === 0} className={btnDanger}>
                {loading === 'delete' && <div className={spinner} />}
                {loading === 'delete' ? 'Working...' : `Delete Selected (${selected.size})`}
              </button>
            )}
            <button onClick={skipDelete} className={btnGhost}>Skip (DB already clean)</button>
          </div>
          <StatusBar {...(statuses[2] || {})} />
        </StepCard>
      </div>

      {/* Step 3 */}
      <div ref={el => stepsRef.current[3] = el}>
        <StepCard number={3} title="Pause Job" time={times[3]} status={stepStatus(3)}>
          <div className="bg-[#9e6a03]/15 border border-[#9e6a03]/30 rounded-md px-3 py-2 mb-3 text-[12px] text-[#d29922] flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
            </svg>
            Do NOT refresh the app preview before pausing — it re-seeds the database.
          </div>
          <p className={`${helperCls} mb-3`}>Creates a restic snapshot of the cleaned state.</p>
          <button onClick={pauseJob} disabled={loading === 'pause'} className={btnDefault}>
            {loading === 'pause' && <div className={spinner} />}
            {loading === 'pause' ? 'Working...' : 'Pause Job'}
          </button>
          <StatusBar {...(statuses[3] || {})} />
        </StepCard>
      </div>

      {/* Step 4 */}
      <div ref={el => stepsRef.current[4] = el}>
        <StepCard number={4} title="Create Template" time={times[4]} status={stepStatus(4)}>
          <p className={`${helperCls} mb-3`}>Runs the creation script on the dev VM. Sanitizes .env and stores in GCS.</p>
          <button onClick={createTemplate} disabled={loading === 'create'} className={btnPrimary}>
            {loading === 'create' && <div className={spinner} />}
            {loading === 'create' ? 'Working...' : 'Create Template'}
          </button>
          <StatusBar {...(statuses[4] || {})} />
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
  );
}
