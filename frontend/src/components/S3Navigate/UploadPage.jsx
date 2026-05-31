import { useRef, useState } from 'react';
import { s3api } from './api';
import { bytesToHuman, fileExt } from './format';
import { PrimaryBtn, SecondaryBtn, InfoIcon } from './BucketList';
import AwsAlert from './AwsAlert';

// AWS-console-style full-page Upload view. Replaces the modal flow.
//   destination = s3://{bucket}/{prefix}
// Calls onDone(uploadedCount) when at least one file succeeds, so the parent
// can refresh the listing and show a success banner.
export default function UploadPage({ bucket, prefix, onCancel, onDone }) {
  const inputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [items, setItems] = useState([]); // {file, relPath}
  const [progress, setProgress] = useState({});
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState(null);

  function addFiles(fileList, { isFolder = false } = {}) {
    const next = Array.from(fileList || []).map(f => ({
      file: f,
      relPath: isFolder && f.webkitRelativePath ? f.webkitRelativePath : f.name,
    }));
    setItems(prev => dedupe([...prev, ...next]));
  }
  function dedupe(list) {
    const seen = new Set();
    const out = [];
    for (const it of list) {
      const key = it.relPath;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
    return out;
  }
  function onDrop(e) {
    e.preventDefault();
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
  }
  function removeAt(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function uploadAll() {
    if (!items.length) return;
    setRunning(true);
    setErr(null);
    let done = 0;
    for (const { file, relPath } of items) {
      const key = (prefix || '') + relPath;
      setProgress(p => ({ ...p, [relPath]: { pct: 0, status: 'starting' } }));
      try {
        const { url } = await s3api.uploadUrl(bucket, key, file.type || 'application/octet-stream');
        await putWithProgress(url, file, (pct) =>
          setProgress(p => ({ ...p, [relPath]: { pct, status: 'uploading' } }))
        );
        setProgress(p => ({ ...p, [relPath]: { pct: 100, status: 'done' } }));
        done += 1;
      } catch (e) {
        setProgress(p => ({ ...p, [relPath]: { pct: 0, status: 'failed', err: e.message } }));
        setErr(e.message);
      }
    }
    setRunning(false);
    if (done > 0) onDone?.(done);
  }

  const allDone = items.length > 0 && items.every(it => progress[it.relPath]?.status === 'done');

  return (
    <div>
      <h1 style={{ fontSize: 28, lineHeight: '36px' }} className="font-bold text-[#e6edf3] mb-1">
        Upload <InfoIcon />
      </h1>
      <p className="text-[13px] text-[#8b949e] mb-5 max-w-[820px]">
        Add the files and folders you want to upload to S3. Files are uploaded with
        a presigned PUT URL minted by app-service; this app never touches AWS
        credentials directly.
      </p>

      {err && (
        <div className="mb-4">
          <AwsAlert variant="error" tone="outlined" onDismiss={() => setErr(null)}>
            {err}
          </AwsAlert>
        </div>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="border border-dashed border-[#30363d] rounded-[4px] bg-[#0d1117] px-6 py-8 mb-4 text-center text-[14px] text-[#c9d1d9]"
      >
        Drag and drop files and folders you want to upload here, or choose{' '}
        <button onClick={() => inputRef.current?.click()} className="text-[#58a6ff] underline">
          Add files
        </button>
        {' '}or{' '}
        <button onClick={() => folderInputRef.current?.click()} className="text-[#58a6ff] underline">
          Add folder
        </button>
        .
      </div>

      {/* Files table */}
      <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-bold text-[#e6edf3]">
            Files and folders <span className="text-[#8b949e] font-normal">({items.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <SecondaryBtn disabled={!items.length} onClick={() => setItems([])}>Remove</SecondaryBtn>
            <SecondaryBtn onClick={() => inputRef.current?.click()}>Add files</SecondaryBtn>
            <SecondaryBtn onClick={() => folderInputRef.current?.click()}>Add folder</SecondaryBtn>
          </div>
        </div>
        <p className="text-[12px] text-[#8b949e] mb-3">
          All files and folders in this table will be uploaded.
        </p>

        <input ref={inputRef} type="file" multiple className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          // webkitdirectory enables folder picking in Chromium/Safari; harmless elsewhere
          webkitdirectory=""
          directory=""
          onChange={(e) => { addFiles(e.target.files, { isFolder: true }); e.target.value = ''; }}
        />

        <div className="border border-[#30363d] rounded-[4px] overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-[#0d1117] border-b border-[#30363d] text-[#e6edf3]">
                <th className="text-left px-3 py-2 font-semibold">Name</th>
                <th className="text-left px-3 py-2 font-semibold">Folder</th>
                <th className="text-left px-3 py-2 font-semibold">Type</th>
                <th className="text-left px-3 py-2 font-semibold">Size</th>
                <th className="text-left px-3 py-2 font-semibold">Status</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[13px] text-[#8b949e]">
                    <div className="font-semibold text-[#c9d1d9]">No files or folders</div>
                    <div className="mt-1">You have not chosen any files or folders to upload.</div>
                  </td>
                </tr>
              )}
              {items.map((it, i) => {
                const parts = it.relPath.split('/');
                const name = parts[parts.length - 1];
                const folder = parts.slice(0, -1).join('/') || '-';
                const p = progress[it.relPath];
                return (
                  <tr key={it.relPath + i} className="border-b border-[#21262d]">
                    <td className="px-3 py-2.5 text-[#c9d1d9] break-all">{name}</td>
                    <td className="px-3 py-2.5 text-[#8b949e]">{folder}</td>
                    <td className="px-3 py-2.5 text-[#c9d1d9]">{fileExt(name) || '-'}</td>
                    <td className="px-3 py-2.5 text-[#c9d1d9]">{bytesToHuman(it.file.size)}</td>
                    <td className="px-3 py-2.5">
                      {!p && <span className="text-[#8b949e]">queued</span>}
                      {p?.status === 'starting' && <span className="text-[#8b949e]">starting…</span>}
                      {p?.status === 'uploading' && <span className="text-[#c9d1d9]">{p.pct}%</span>}
                      {p?.status === 'done' && <span className="text-[#3fb950]">done</span>}
                      {p?.status === 'failed' && <span className="text-[#f85149]" title={p.err}>failed</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {!running && (
                        <button onClick={() => removeAt(i)} className="text-[12px] text-[#58a6ff] hover:underline">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Destination */}
      <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-5 mb-6">
        <h2 className="text-[16px] font-bold text-[#e6edf3] mb-0.5">Destination <InfoIcon /></h2>
        <div className="mt-3 text-[13px] text-[#c9d1d9]">
          <div className="font-bold mb-1">Destination</div>
          <div className="font-mono text-[#58a6ff] break-all">
            s3://{bucket}/{prefix || ''}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-3 mt-6">
        <button onClick={onCancel} className="px-4 py-1.5 text-[14px] text-[#58a6ff] hover:underline">
          {allDone ? 'Close' : 'Cancel'}
        </button>
        {allDone ? (
          <PrimaryBtn onClick={onCancel}>Done</PrimaryBtn>
        ) : (
          <PrimaryBtn onClick={uploadAll} disabled={running || items.length === 0}>
            {running ? 'Uploading…' : 'Upload'}
          </PrimaryBtn>
        )}
      </div>
    </div>
  );
}

function putWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    if (file.type) xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error (check bucket CORS)'));
    xhr.send(file);
  });
}
