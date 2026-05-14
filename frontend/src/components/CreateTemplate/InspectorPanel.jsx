import { useState, useRef, useEffect } from 'react';
import { api } from '../../api';

// --- Syntax-colored JSON renderer ---
function JsonValue({ value, indent = 0 }) {
  if (value === null) return <span className="text-[#484f58]">null</span>;
  if (typeof value === 'boolean') return <span className="text-[#f47067]">{value.toString()}</span>;
  if (typeof value === 'number') return <span className="text-[#6cb6ff]">{value}</span>;
  if (typeof value === 'string') {
    if (value.length > 200) return <span className="text-[#a5d6ff]">"{value.slice(0, 200)}..."</span>;
    return <span className="text-[#a5d6ff]">"{value}"</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-[#8b949e]">[]</span>;
    return (
      <span>
        {'[\n'}
        {value.map((item, i) => (
          <span key={i}>
            {'  '.repeat(indent + 1)}<JsonValue value={item} indent={indent + 1} />
            {i < value.length - 1 ? ',\n' : '\n'}
          </span>
        ))}
        {'  '.repeat(indent)}{']'}
      </span>
    );
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return <span className="text-[#8b949e]">{'{}'}</span>;
    if (keys.length === 1 && keys[0] === '$oid') return <span className="text-[#f47067]">ObjectId("{value.$oid}")</span>;
    if (keys.length === 1 && keys[0] === '$date') return <span className="text-[#7ee787]">{value.$date}</span>;
    return (
      <span>
        {'{\n'}
        {keys.map((key, i) => (
          <span key={key}>
            {'  '.repeat(indent + 1)}<span className="text-[#d2a8ff]">"{key}"</span>: <JsonValue value={value[key]} indent={indent + 1} />
            {i < keys.length - 1 ? ',\n' : '\n'}
          </span>
        ))}
        {'  '.repeat(indent)}{'}'}
      </span>
    );
  }
  return <span>{String(value)}</span>;
}

// Per-reason messages for inspector and terminal (kept separate from left-side StatusBar)
const INSPECTOR_MESSAGES = {
  paused:      'Job is paused. Resume it to inspect collections.',
  'not-found': 'Job not found in this environment.',
  other:       'Could not connect to job.',
};
const TERMINAL_MESSAGES = {
  paused:      'Job is paused. Resume the job to enable the terminal.',
  'not-found': 'Job not found. Switch environment or fix the Job ID.',
  other:       'Connection failed. See error details on the left.',
};

export default function InspectorPanel({ jobId, dbName, collections, inspectCollection, onInspected, status = 'idle', errorReason = '' }) {
  const isReady = status === 'ready';

  // Document viewer state
  const [activeCollection, setActiveCollection] = useState('');
  const [viewerData, setViewerData] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState('');

  // Terminal state
  const [termInput, setTermInput] = useState('');
  const [termHistory, setTermHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [termOutput, setTermOutput] = useState([
    { type: 'system', text: 'Waiting for a job connection...' },
  ]);
  const [termLoading, setTermLoading] = useState(false);
  const termEndRef = useRef(null);
  const termInputRef = useRef(null);

  // Drag resize
  const [splitRatio, setSplitRatio] = useState(0.6);
  const isDragging = useRef(false);
  const panelRef = useRef(null);

  // Reset viewer and terminal on status/db change
  useEffect(() => {
    setActiveCollection('');
    setViewerData(null);
    setViewerError('');
    setTermInput('');
    setTermHistory([]);
    setHistoryIdx(-1);

    if (status === 'ready' && dbName) {
      setTermOutput([{ type: 'system', text: `Connected to ${dbName}. Type mongosh commands (read-only).` }]);
    } else if (status === 'loading') {
      setTermOutput([{ type: 'system', text: 'Connecting to job...' }]);
    } else if (status === 'error') {
      setTermOutput([{ type: 'system', text: TERMINAL_MESSAGES[errorReason] || TERMINAL_MESSAGES.other }]);
    } else {
      setTermOutput([{ type: 'system', text: 'Connect to a job to use the terminal.' }]);
    }
  }, [status, dbName, errorReason]);

  // React to external inspect request (eye icon click)
  useEffect(() => {
    if (isReady && inspectCollection && inspectCollection !== activeCollection) {
      loadCollection(inspectCollection);
      onInspected?.();
    }
  }, [inspectCollection, status]);

  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [termOutput]);

  async function loadCollection(name) {
    setActiveCollection(name);
    setViewerData(null);
    setViewerError('');
    setViewerLoading(true);
    try {
      const data = await api.getCollectionData(jobId, dbName, name, 20);
      setViewerData(data);
    } catch (e) {
      setViewerError(e.message);
    } finally {
      setViewerLoading(false);
    }
  }

  async function runCommand() {
    const cmd = termInput.trim();
    if (!cmd) return;

    setTermHistory(prev => [...prev, cmd]);
    setHistoryIdx(-1);
    setTermOutput(prev => [...prev, { type: 'input', text: cmd }]);
    setTermInput('');
    setTermLoading(true);

    try {
      const data = await api.runMongosh(jobId, dbName, cmd);
      setTermOutput(prev => [...prev, { type: data.error ? 'error' : 'output', text: data.output }]);
    } catch (e) {
      setTermOutput(prev => [...prev, { type: 'error', text: e.message }]);
    } finally {
      setTermLoading(false);
      termInputRef.current?.focus();
    }
  }

  function handleTermKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (termHistory.length > 0) {
        const idx = historyIdx === -1 ? termHistory.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(idx);
        setTermInput(termHistory[idx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx >= 0) {
        const idx = historyIdx + 1;
        if (idx >= termHistory.length) {
          setHistoryIdx(-1);
          setTermInput('');
        } else {
          setHistoryIdx(idx);
          setTermInput(termHistory[idx]);
        }
      }
    }
  }

  function handleDragStart(e) {
    e.preventDefault();
    isDragging.current = true;
    const onMove = (ev) => {
      if (!isDragging.current || !panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      const ratio = (ev.clientY - rect.top) / rect.height;
      setSplitRatio(Math.min(0.8, Math.max(0.2, ratio)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }

  const collNames = (collections || []).map(c => c.name);

  return (
    <div ref={panelRef} className="flex flex-col h-full border-l border-[#30363d] bg-[#010409]">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d] bg-[#161b22] shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#8b949e]" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1c-3.68 0-6 1.316-6 3v8c0 1.684 2.32 3 6 3s6-1.316 6-3V4c0-1.684-2.32-3-6-3Z" />
          </svg>
          <span className="text-[13px] font-semibold text-[#e6edf3]">Inspector</span>
          {isReady && dbName && (
            <span className="text-[11px] text-[#484f58] font-mono">{dbName}</span>
          )}
        </div>
        {status === 'loading' && (
          <div className="w-3.5 h-3.5 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin" />
        )}
        {status === 'error' && (
          <span className="text-[11px] font-medium text-[#f85149] bg-[#da3633]/10 border border-[#da3633]/30 rounded-full px-2 py-0.5">Error</span>
        )}
        {isReady && (
          <span className="text-[11px] font-medium text-[#3fb950] bg-[#238636]/10 border border-[#238636]/30 rounded-full px-2 py-0.5">Connected</span>
        )}
      </div>

      {/* Document Viewer (top) */}
      <div className="flex flex-col overflow-hidden" style={{ height: `${splitRatio * 100}%` }}>
        {isReady ? (
          <>
            {/* Collection tabs */}
            <div className="flex items-center gap-0 border-b border-[#21262d] bg-[#0d1117] overflow-x-auto shrink-0">
              {collNames.map(name => (
                <button key={name} onClick={() => loadCollection(name)}
                  className={`px-3 py-[6px] text-[12px] border-b-2 transition-colors whitespace-nowrap ${
                    activeCollection === name
                      ? 'text-[#e6edf3] border-[#f78166] bg-[#161b22]'
                      : 'text-[#8b949e] border-transparent hover:text-[#e6edf3] hover:border-[#30363d]'
                  }`}>
                  {name}
                </button>
              ))}
            </div>

            {/* Viewer content */}
            <div className="flex-1 overflow-y-auto">
              {!activeCollection && (
                <div className="flex items-center justify-center h-full text-[13px] text-[#484f58]">
                  Click a collection tab to preview documents
                </div>
              )}

              {viewerLoading && (
                <div className="flex items-center justify-center h-full gap-2">
                  <div className="w-4 h-4 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin" />
                  <span className="text-[13px] text-[#8b949e]">Loading...</span>
                </div>
              )}

              {viewerError && (
                <div className="p-3 m-3 rounded-md text-[12px] bg-[#da3633]/10 text-[#f85149] border border-[#da3633]/30">
                  {viewerError}
                </div>
              )}

              {viewerData && !viewerLoading && (
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] text-[#8b949e]">
                      Showing {Math.min(viewerData.limit, viewerData.documents?.length || 0)} of {viewerData.count} documents
                    </span>
                  </div>

                  {viewerData.documents?.length > 0 ? (
                    <div className="space-y-2">
                      {viewerData.documents.map((doc, i) => (
                        <div key={i} className="border border-[#30363d] rounded-md overflow-hidden">
                          <div className="px-3 py-1.5 bg-[#161b22] border-b border-[#21262d] flex items-center justify-between">
                            <span className="text-[11px] text-[#f47067] font-mono">
                              {doc._id?.$oid || doc._id || `doc_${i}`}
                            </span>
                            <span className="text-[10px] text-[#484f58]">#{i + 1}</span>
                          </div>
                          <pre className="p-3 text-[11px] font-mono leading-[18px] overflow-x-auto text-[#c9d1d9]">
                            <JsonValue value={doc} />
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[13px] text-[#484f58]">Collection is empty</div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Idle / Loading / Error empty states */
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            {status === 'idle' && (
              <>
                <svg className="w-12 h-12 text-[#30363d] mb-3" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
                </svg>
                <p className="text-[14px] text-[#8b949e] font-medium">No job connected</p>
                <p className="text-[12px] text-[#484f58] mt-1 text-center leading-relaxed">
                  Enter a Job ID and click &quot;Fetch Job Info&quot; to inspect collections and run commands.
                </p>
              </>
            )}

            {status === 'loading' && (
              <>
                <div className="w-8 h-8 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin mb-3" />
                <p className="text-[14px] text-[#8b949e]">Fetching job details...</p>
              </>
            )}

            {status === 'error' && (
              <p className="text-[12px] text-[#484f58] italic">
                {INSPECTOR_MESSAGES[errorReason] || INSPECTOR_MESSAGES.other}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Drag handle */}
      <div onMouseDown={handleDragStart}
        className="h-[5px] bg-[#0d1117] border-y border-[#21262d] cursor-row-resize hover:bg-[#1f6feb]/20 transition-colors shrink-0" />

      {/* Terminal (bottom) — always visible */}
      <div className="flex flex-col overflow-hidden" style={{ height: `${(1 - splitRatio) * 100}%` }}>
        {/* Terminal header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#21262d] bg-[#161b22] shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-[#8b949e]" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25ZM7.25 8a.749.749 0 0 1-.22.53l-2.25 2.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L5.44 8 3.72 6.28a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l2.25 2.25c.141.14.22.331.22.53Zm1.5 1.5h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5Z" />
            </svg>
            <span className="text-[12px] font-medium text-[#e6edf3]">Terminal</span>
          </div>
          <button onClick={() => {
            if (isReady) {
              setTermOutput([{ type: 'system', text: `Connected to ${dbName}. Type mongosh commands (read-only).` }]);
            } else {
              setTermOutput([{ type: 'system', text: 'Terminal cleared.' }]);
            }
          }}
            className="text-[11px] text-[#8b949e] hover:text-[#e6edf3] transition-colors">
            Clear
          </button>
        </div>

        {/* Terminal output */}
        <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[12px] leading-[18px]"
          onClick={() => isReady && termInputRef.current?.focus()}>
          {termOutput.map((line, i) => (
            <div key={i} className="mb-1">
              {line.type === 'system' && (
                <span className="text-[#484f58] italic">{line.text}</span>
              )}
              {line.type === 'input' && (
                <div>
                  <span className="text-[#3fb950]">mongosh&gt; </span>
                  <span className="text-[#e6edf3]">{line.text}</span>
                </div>
              )}
              {line.type === 'output' && (
                <pre className="text-[#c9d1d9] whitespace-pre-wrap">{line.text}</pre>
              )}
              {line.type === 'error' && (
                <pre className="text-[#f85149] whitespace-pre-wrap">{line.text}</pre>
              )}
            </div>
          ))}
          {termLoading && (
            <div className="flex items-center gap-2 text-[#8b949e]">
              <div className="w-3 h-3 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin" />
              running...
            </div>
          )}
          <div ref={termEndRef} />
        </div>

        {/* Terminal input */}
        <div className="flex items-center gap-2 px-3 py-2 border-t border-[#21262d] bg-[#0d1117] shrink-0">
          <span className={`text-[12px] font-mono shrink-0 ${isReady ? 'text-[#3fb950]' : 'text-[#484f58]'}`}>mongosh&gt;</span>
          <input
            ref={termInputRef}
            type="text"
            value={termInput}
            onChange={e => setTermInput(e.target.value)}
            onKeyDown={handleTermKeyDown}
            disabled={termLoading || !isReady}
            placeholder={isReady ? 'db.collection.find()' : 'Connect to a job to use the terminal'}
            className="flex-1 bg-transparent text-[12px] text-[#e6edf3] font-mono outline-none placeholder:text-[#484f58] disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
}
