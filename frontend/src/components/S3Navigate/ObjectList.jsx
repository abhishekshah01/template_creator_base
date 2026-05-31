import { useEffect, useMemo, useState, useRef } from 'react';
import { s3api } from './api';
import { bytesToHuman, formatAwsDate, fileExt } from './format';
import {
  PrimaryBtn, SecondaryBtn, RefreshButton, CopyIcon,
  SearchIcon, InfoIcon, SortArrows, FilterTriangle, Pager,
} from './BucketList';

export default function ObjectList({ bucket, prefix, onOpenObject, onOpenPrefix, onCopyToast }) {
  const [data, setData] = useState({ folders: [], files: [], is_truncated: false, next_continuation_token: null });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(new Set()); // set of keys (full key, with prefix)
  const [showUpload, setShowUpload] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pageStack, setPageStack] = useState([]); // tokens of pages we navigated FROM (for back nav)
  const [currentToken, setCurrentToken] = useState(null); // token that loaded the current page

  async function load(token = null) {
    setLoading(true);
    setErr(null);
    try {
      const d = await s3api.listObjects(bucket, prefix, token);
      setData(d);
      setCurrentToken(token);
      setSelected(new Set());
    } catch (e) {
      setErr(e.message);
      setData({ folders: [], files: [], is_truncated: false, next_continuation_token: null });
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPageStack([]); setCurrentToken(null); load(null); }, [bucket, prefix]);

  const filteredFolders = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return data.folders;
    return data.folders.filter(f => f.name.toLowerCase().includes(q));
  }, [data.folders, filter]);

  const filteredFiles = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return data.files;
    return data.files.filter(f => f.name.toLowerCase().includes(q));
  }, [data.files, filter]);

  const totalCount = (data.folders?.length || 0) + (data.files?.length || 0);
  const selectedKeys = Array.from(selected);
  const singleSelected = selectedKeys.length === 1 ? selectedKeys[0] : null;

  function toggleSelect(key) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  }
  function toggleAll() {
    if (selected.size === filteredFiles.length && filteredFiles.length > 0) setSelected(new Set());
    else setSelected(new Set(filteredFiles.map(f => f.key)));
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      onCopyToast?.('Copied');
    } catch {
      onCopyToast?.('Copy failed');
    }
  }

  async function copyS3Uri() {
    if (!singleSelected) return;
    copy(`s3://${bucket}/${singleSelected}`);
  }
  async function copyUrl() {
    if (!singleSelected) return;
    try {
      const { url } = await s3api.objectUrl(bucket, singleSelected, false);
      copy(url);
    } catch (e) { setErr(e.message); }
  }
  async function downloadSel() {
    if (!singleSelected) return;
    try {
      const { url } = await s3api.objectUrl(bucket, singleSelected, true);
      window.open(url, '_blank', 'noopener');
    } catch (e) { setErr(e.message); }
  }
  async function openSel() {
    if (!singleSelected) return;
    try {
      const { url } = await s3api.objectUrl(bucket, singleSelected, false);
      window.open(url, '_blank', 'noopener');
    } catch (e) { setErr(e.message); }
  }
  async function deleteSel() {
    setConfirmDelete(selectedKeys);
  }
  async function confirmDeleteAction() {
    const keys = confirmDelete || [];
    for (const k of keys) {
      try { await s3api.deleteObject(bucket, k); } catch (e) { setErr(e.message); }
    }
    setConfirmDelete(null);
    load();
  }

  // selection-count label like "Objects (1/333)"
  const countLabel = selected.size > 0
    ? `${selected.size}/${totalCount}`
    : `${totalCount}`;

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-[28px] font-bold text-[#e6edf3]">{prefix ? prefix : bucket + '/'}</h1>
        <SecondaryBtn icon={<CopyIcon />} onClick={() => copy(`s3://${bucket}/${prefix || ''}`)}>Copy S3 URI</SecondaryBtn>
      </div>

      <div className="border-b border-[#30363d] mb-6 flex gap-6">
        <Tab active>Objects</Tab>
        <Tab>Properties</Tab>
      </div>

      <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-5">
        <h2 className="text-[18px] font-bold text-[#e6edf3] mb-3">
          Objects <span className="text-[#8b949e] font-normal">({countLabel})</span>
        </h2>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <RefreshButton onClick={() => load()} loading={loading} />
          <SecondaryBtn icon={<CopyIcon />} disabled={!singleSelected} onClick={copyS3Uri}>Copy S3 URI</SecondaryBtn>
          <SecondaryBtn icon={<CopyIcon />} disabled={!singleSelected} onClick={copyUrl}>Copy URL</SecondaryBtn>
          <SecondaryBtn icon={<DownloadIcon />} disabled={!singleSelected} onClick={downloadSel}>Download</SecondaryBtn>
          <SecondaryBtn disabled={!singleSelected} onClick={openSel}>Open <ExtLinkIcon /></SecondaryBtn>
          <SecondaryBtn disabled={selected.size === 0} onClick={deleteSel}>Delete</SecondaryBtn>
          <ActionsDropdown disabled={selected.size === 0} />
          <PrimaryBtn onClick={() => setShowUpload(true)}>
            <span className="inline-flex items-center gap-1.5"><UploadIcon /> Upload</span>
          </PrimaryBtn>
        </div>

        <p className="text-[13px] text-[#8b949e] mb-3">
          Objects are the fundamental entities stored in Amazon S3. You can use{' '}
          <span className="text-[#58a6ff] underline decoration-dotted underline-offset-2 cursor-help">Amazon S3 inventory</span> to get a list of all objects in your bucket. For others to access your objects, you'll need to explicitly grant them permissions. <span className="text-[#58a6ff] underline decoration-dotted underline-offset-2 cursor-help">Learn more</span>
        </p>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 relative max-w-[640px]">
            <SearchIcon />
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Find objects by prefix"
              data-testid="s3-object-search"
              className="w-full pl-9 pr-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-[4px] text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb]"
            />
          </div>
          <label className="flex items-center gap-2 text-[14px] text-[#c9d1d9]">
            <span className="inline-block w-9 h-5 rounded-full bg-[#30363d] relative">
              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#8b949e]" />
            </span>
            <span>Show versions</span>
          </label>

          <PagerWrap>
            <button
              disabled={!pageStack.length}
              onClick={() => {
                const next = [...pageStack];
                const prevToken = next.pop();
                setPageStack(next);
                load(prevToken || null);
              }}
              className="px-2 py-1 rounded text-[#58a6ff] hover:bg-[#161b22] disabled:opacity-40">
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.275.326.749.749 0 0 1-.215.734L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z" />
              </svg>
            </button>
            <span className="text-[13px] font-bold text-[#e6edf3] px-2">{pageStack.length + 1}</span>
            <button
              disabled={!data.is_truncated}
              onClick={() => {
                setPageStack(prev => [...prev, currentToken]);
                load(data.next_continuation_token);
              }}
              className="px-2 py-1 rounded text-[#58a6ff] hover:bg-[#161b22] disabled:opacity-40">
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </PagerWrap>
        </div>

        {/* Table */}
        <div className="border border-[#30363d] rounded-[4px] overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-[#0d1117] border-b border-[#30363d] text-[#e6edf3]">
                <th className="w-10 px-3 py-2">
                  <input type="checkbox"
                    checked={filteredFiles.length > 0 && selected.size === filteredFiles.length}
                    onChange={toggleAll}
                    className="accent-[#1f6feb] w-4 h-4" />
                </th>
                <th className="text-left px-3 py-2 font-semibold">
                  <span className="inline-flex items-center gap-1">Name <SortArrows /></span>
                </th>
                <th className="text-left px-3 py-2 font-semibold">
                  <span className="inline-flex items-center gap-1">Type <FilterTriangle /></span>
                </th>
                <th className="text-left px-3 py-2 font-semibold">
                  <span className="inline-flex items-center gap-1">Last modified <FilterTriangle /></span>
                </th>
                <th className="text-left px-3 py-2 font-semibold">
                  <span className="inline-flex items-center gap-1">Size <FilterTriangle /></span>
                </th>
                <th className="text-left px-3 py-2 font-semibold">
                  <span className="inline-flex items-center gap-1">Storage class <FilterTriangle /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-[#8b949e] text-[13px]">Loading objects…</td></tr>
              )}
              {err && !loading && (
                <tr><td colSpan={6} className="px-3 py-6 text-[13px] text-[#f85149]">{err}</td></tr>
              )}
              {!loading && !err && filteredFolders.length === 0 && filteredFiles.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-[#8b949e] text-[13px]">No objects here.</td></tr>
              )}

              {/* Folders first */}
              {!loading && filteredFolders.map(f => (
                <tr key={f.prefix} className="border-b border-[#21262d] hover:bg-[#161b22] transition-colors">
                  <td className="px-3 py-2.5"></td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => onOpenPrefix(f.prefix)}
                      data-testid={`s3-folder-${f.name}`}
                      className="inline-flex items-center gap-2 text-[#58a6ff] hover:underline decoration-1 underline-offset-2">
                      <FolderIcon />
                      <span className="truncate">{f.name}/</span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-[#c9d1d9]">Folder</td>
                  <td className="px-3 py-2.5 text-[#6e7681]">-</td>
                  <td className="px-3 py-2.5 text-[#6e7681]">-</td>
                  <td className="px-3 py-2.5 text-[#6e7681]">-</td>
                </tr>
              ))}

              {/* Files */}
              {!loading && filteredFiles.map(f => {
                const isSel = selected.has(f.key);
                return (
                  <tr key={f.key} className={`border-b border-[#21262d] hover:bg-[#161b22] transition-colors ${isSel ? 'bg-[#1f6feb]/10' : ''}`}>
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={isSel} onChange={() => toggleSelect(f.key)}
                        className="accent-[#1f6feb] w-4 h-4" />
                    </td>
                    <td className="px-3 py-2.5 max-w-[420px]">
                      <button onClick={() => onOpenObject(f)}
                        data-testid={`s3-object-${f.name}`}
                        className="inline-flex items-center gap-2 text-[#58a6ff] hover:underline decoration-1 underline-offset-2 text-left">
                        <FileIcon16 />
                        <span className="break-all">{f.name}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-[#c9d1d9]">{fileExt(f.name) || '-'}</td>
                    <td className="px-3 py-2.5 text-[#c9d1d9] whitespace-nowrap">{formatAwsDate(f.last_modified)}</td>
                    <td className="px-3 py-2.5 text-[#c9d1d9]">{bytesToHuman(f.size)}</td>
                    <td className="px-3 py-2.5 text-[#c9d1d9]">{prettyStorageClass(f.storage_class)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showUpload && (
        <UploadModal bucket={bucket} prefix={prefix} onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); }} />
      )}
      {confirmDelete && (
        <ConfirmDeleteModal keys={confirmDelete} bucket={bucket}
          onCancel={() => setConfirmDelete(null)} onConfirm={confirmDeleteAction} />
      )}
    </div>
  );
}

function PagerWrap({ children }) {
  return <div className="inline-flex items-center text-[14px] text-[#c9d1d9]">{children}</div>;
}

function Tab({ active, children }) {
  return (
    <button className={`relative py-2 text-[15px] font-semibold ${active ? 'text-[#58a6ff]' : 'text-[#c9d1d9] hover:text-[#e6edf3]'}`}>
      {children}
      {active && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#58a6ff]" />}
    </button>
  );
}

function FolderIcon() {
  return (
    <svg className="w-4 h-4 text-[#58a6ff]" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z" />
    </svg>
  );
}

function FileIcon16() {
  return (
    <svg className="w-4 h-4 text-[#8b949e]" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
      <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z" />
    </svg>
  );
}

function ExtLinkIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Z" />
      <path d="M14 1H9.5a.75.75 0 0 0 0 1.5h2.69L6.97 7.72a.749.749 0 1 0 1.06 1.06L13.25 3.56v2.69a.75.75 0 0 0 1.5 0V1.75A.75.75 0 0 0 14 1Z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
      <path d="M7.25 3.311 5.28 5.28a.749.749 0 1 1-1.06-1.06l3.25-3.25a.749.749 0 0 1 1.06 0l3.25 3.25a.749.749 0 1 1-1.06 1.06L8.75 3.311V10a.75.75 0 0 1-1.5 0Z" />
    </svg>
  );
}

function ActionsDropdown({ disabled }) {
  return (
    <button disabled={disabled}
      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-[4px] border text-[14px] transition-colors ${
        disabled ? 'border-[#30363d] text-[#6e7681] cursor-not-allowed' : 'border-[#58a6ff] text-[#58a6ff] hover:bg-[#58a6ff]/10'
      }`}>
      Actions
      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
        <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
      </svg>
    </button>
  );
}

function prettyStorageClass(s) {
  if (!s) return 'Standard';
  return s.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

// ---------- Upload / Create folder / Delete modals ----------

function ModalShell({ title, children, onClose, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#161b22] border border-[#30363d] rounded-md w-full max-w-[520px] mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#30363d]">
          <h3 className="text-[16px] font-bold text-[#e6edf3]">{title}</h3>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#e6edf3]">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="px-5 py-3 border-t border-[#30363d] flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

function UploadModal({ bucket, prefix, onClose, onDone }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({}); // filename -> {pct, status}
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState(null);

  function pick() { inputRef.current?.click(); }
  function onPicked(e) {
    setFiles(Array.from(e.target.files || []));
  }

  async function uploadAll() {
    setRunning(true);
    setErr(null);
    for (const file of files) {
      const key = (prefix || '') + file.name;
      setProgress(p => ({ ...p, [file.name]: { pct: 0, status: 'starting' } }));
      try {
        const { url } = await s3api.uploadUrl(bucket, key, file.type || 'application/octet-stream');
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', url);
          if (file.type) xhr.setRequestHeader('Content-Type', file.type);
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              const pct = Math.round((ev.loaded / ev.total) * 100);
              setProgress(p => ({ ...p, [file.name]: { pct, status: 'uploading' } }));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setProgress(p => ({ ...p, [file.name]: { pct: 100, status: 'done' } }));
              resolve();
            } else {
              reject(new Error(`HTTP ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('Network error (check bucket CORS)'));
          xhr.send(file);
        });
      } catch (e) {
        setProgress(p => ({ ...p, [file.name]: { pct: 0, status: 'failed', err: e.message } }));
        setErr(e.message);
      }
    }
    setRunning(false);
  }

  const allDone = files.length > 0 && files.every(f => progress[f.name]?.status === 'done');

  return (
    <ModalShell title="Upload"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1.5 rounded border border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]">Cancel</button>
          {allDone ? (
            <PrimaryBtn onClick={onDone}>Done</PrimaryBtn>
          ) : (
            <PrimaryBtn onClick={uploadAll} disabled={running || files.length === 0}>
              {running ? 'Uploading…' : `Upload ${files.length || ''}`}
            </PrimaryBtn>
          )}
        </>
      }>
      <p className="text-[13px] text-[#8b949e] mb-3">Destination: <span className="text-[#c9d1d9] font-mono">s3://{bucket}/{prefix || ''}</span></p>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={onPicked} />
      <button onClick={pick}
        className="w-full py-6 border border-dashed border-[#30363d] hover:border-[#58a6ff] rounded text-[14px] text-[#c9d1d9]">
        Click to pick files
      </button>
      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-[13px]">
          {files.map(f => {
            const p = progress[f.name];
            return (
              <li key={f.name} className="flex items-center justify-between gap-2">
                <span className="text-[#c9d1d9] truncate">{f.name}</span>
                <span className="text-[#8b949e] shrink-0">
                  {p?.status === 'done' && <span className="text-[#3fb950]">100%</span>}
                  {p?.status === 'uploading' && <span>{p.pct}%</span>}
                  {p?.status === 'failed' && <span className="text-[#f85149]">failed</span>}
                  {!p && <span>queued</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {err && <div className="mt-3 text-[12px] text-[#f85149]">{err}</div>}
    </ModalShell>
  );
}

function ConfirmDeleteModal({ keys, bucket, onCancel, onConfirm }) {
  return (
    <ModalShell title={`Delete ${keys.length} object${keys.length === 1 ? '' : 's'}`}
      onClose={onCancel}
      footer={
        <>
          <button onClick={onCancel} className="px-3 py-1.5 rounded border border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1.5 rounded bg-[#da3633] hover:bg-[#b62324] text-white text-[14px] font-semibold">
            Delete permanently
          </button>
        </>
      }>
      <p className="text-[13px] text-[#c9d1d9] mb-3">This permanently deletes the following object(s) from <span className="font-mono">s3://{bucket}/</span>:</p>
      <ul className="text-[13px] text-[#8b949e] font-mono space-y-1 max-h-[200px] overflow-auto">
        {keys.map(k => <li key={k} className="break-all">• {k}</li>)}
      </ul>
    </ModalShell>
  );
}
