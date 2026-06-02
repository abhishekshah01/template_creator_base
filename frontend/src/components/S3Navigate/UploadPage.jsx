import { useRef, useState, useMemo } from 'react';

import AwsAlert2 from './AwsAlert2';
import { AwsButton, AwsCheckbox, AwsSearchInput, SortTriangleV2, OpenExternalIconV2 } from './AwsControls';
import { s3api } from './api';
import { bytesToHuman, fileExt } from './format';
import { colors } from './theme';

export default function UploadPage({ bucket, prefix, onCancel, onDone }) {
  const inputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState({});
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [dragging, setDragging] = useState(false);

  const totalBytes = items.reduce((s, it) => s + (it.file.size || 0), 0);
  const hasProgress = Object.keys(progress).length > 0;

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
      if (seen.has(it.relPath)) continue;
      seen.add(it.relPath);
      out.push(it);
    }
    return out;
  }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
  }

  const filtered = useMemo(() => items.filter(
    it => !filter.trim() || it.relPath.toLowerCase().includes(filter.trim().toLowerCase())
  ), [items, filter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sort.dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const an = basename(a.relPath), bn = basename(b.relPath);
      const af = dirname(a.relPath),  bf = dirname(b.relPath);
      switch (sort.key) {
        case 'name':   return dir * an.localeCompare(bn);
        case 'folder': return dir * af.localeCompare(bf);
        case 'type':   return dir * (a.file.type || '').localeCompare(b.file.type || '');
        case 'size':   return dir * ((a.file.size || 0) - (b.file.size || 0));
        default:       return 0;
      }
    });
    return arr;
  }, [filtered, sort]);

  function toggleOne(key) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  }
  function toggleAll() {
    if (sorted.length > 0 && selected.size >= sorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map(it => it.relPath)));
    }
  }
  function removeSelected() {
    setItems(prev => prev.filter(it => !selected.has(it.relPath)));
    setSelected(new Set());
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
    const failed = items.length - done;
    if (failed === 0 && done > 0) {
      onDone?.(done);
    } else if (failed > 0) {
      setErr(`${failed} file${failed === 1 ? '' : 's'} failed to upload. Remove or retry the failed rows.`);
    }
  }

  const allDone = items.length > 0 && items.every(it => progress[it.relPath]?.status === 'done');
  const allChecked = sorted.length > 0 && selected.size >= sorted.length;
  const someChecked = !allChecked && selected.size > 0;

  return (
    <div>
      <h1 className="text-[28px] font-bold mb-1 inline-flex items-baseline gap-2" style={{ color: colors.text.primary }}>
        Upload
        <span className="text-[14px] font-normal underline decoration-dotted underline-offset-2 cursor-help" style={{ color: colors.text.buttonActive }}>
          Info
        </span>
      </h1>
      <p className="text-[14px] mb-5 max-w-[860px]" style={{ color: colors.text.info }}>
        Add the files and folders you want to upload to S3. Files are uploaded with a presigned PUT URL minted by the Emergent app-service; this app never touches AWS credentials directly.
      </p>

      {err && (
        <div className="mb-4">
          <AwsAlert2 variant="error" title="Upload error" onDismiss={() => setErr(null)}>
            {err}
          </AwsAlert2>
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="px-6 py-9 mb-4 text-center text-[14px] transition-colors"
        style={{
          border: `2px dashed ${colors.border.rowSelected}`,
          borderRadius: 8,
          backgroundColor: dragging ? 'rgba(69,171,254,0.06)' : 'transparent',
          color: colors.text.selectedRow,
        }}
      >
        Drag and drop files and folders you want to upload here, or choose{' '}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="font-bold hover:underline underline-offset-2"
          style={{ color: colors.text.primary }}
        >
          Add files
        </button>
        {' '}or{' '}
        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          className="font-bold hover:underline underline-offset-2"
          style={{ color: colors.text.primary }}
        >
          Add folder
        </button>
        .
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        webkitdirectory=""
        directory=""
        onChange={(e) => { addFiles(e.target.files, { isFolder: true }); e.target.value = ''; }}
      />

      <div
        className="rounded-[12px] p-5 mb-4"
        style={{ backgroundColor: colors.bg.card, border: `1px solid ${colors.border.cardOutline}` }}
      >
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <h2 className="text-[18px] font-bold" style={{ color: colors.text.primary }}>
              Files and folders{' '}
              <span className="font-normal" style={{ color: colors.text.info }}>
                {items.length > 0
                  ? `(${items.length} total, ${bytesToHuman(totalBytes)})`
                  : '(0)'}
              </span>
            </h2>
            <p className="text-[14px] mt-1" style={{ color: colors.text.info }}>
              All files and folders in this table will be uploaded.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AwsButton
              disabled={selected.size === 0 || running}
              onClick={removeSelected}
            >
              Remove
            </AwsButton>
            <AwsButton disabled={running} onClick={() => inputRef.current?.click()}>
              Add files
            </AwsButton>
            <AwsButton disabled={running} onClick={() => folderInputRef.current?.click()}>
              Add folder
            </AwsButton>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-3 mb-3">
          <div className="flex-1 max-w-[400px]">
            <AwsSearchInput value={filter} onChange={setFilter} placeholder="Find by name" />
          </div>
          <div className="flex items-center gap-2 text-[14px]" style={{ color: colors.text.info }}>
            <button
              type="button"
              className="w-[22px] h-[22px] inline-flex items-center justify-center rounded hover:bg-white/5"
              aria-label="Previous page"
            >
              ‹
            </button>
            <span>1</span>
            <button
              type="button"
              className="w-[22px] h-[22px] inline-flex items-center justify-center rounded hover:bg-white/5"
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>

        <div className="rounded-[4px] overflow-x-auto min-w-0">
          <table
            className="w-full text-[14px] text-left"
            style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}
          >
            <colgroup>
              <col style={{ width: 44 }} />
              <col />
              <col style={{ width: 180 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 110 }} />
              {hasProgress && <col style={{ width: 130 }} />}
            </colgroup>
            <thead>
              <tr>
                <HeaderCell showDivider>
                  <AwsCheckbox
                    checked={allChecked}
                    indeterminate={someChecked}
                    onChange={toggleAll}
                    ariaLabel="Select all rows"
                  />
                </HeaderCell>
                <SortHeader label="Name" col="name" sort={sort} setSort={setSort} showDivider />
                <SortHeader label="Folder" col="folder" sort={sort} setSort={setSort} showDivider />
                <SortHeader label="Type" col="type" sort={sort} setSort={setSort} showDivider />
                <SortHeader
                  label="Size"
                  col="size"
                  sort={sort}
                  setSort={setSort}
                  showDivider={hasProgress}
                />
                {hasProgress && (
                  <HeaderCell>
                    <span style={{ color: colors.text.info, fontWeight: 700 }}>Status</span>
                  </HeaderCell>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={hasProgress ? 6 : 5}
                    style={{
                      padding: '40px 12px',
                      textAlign: 'center',
                      borderBottom: `1px solid ${colors.border.rowSeparator}`,
                    }}
                  >
                    <div className="font-bold mb-1" style={{ color: colors.text.primary }}>
                      No files or folders
                    </div>
                    <div className="text-[13px]" style={{ color: colors.text.info }}>
                      You have not chosen any files or folders to upload.
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((it, idx) => {
                  const isSel = selected.has(it.relPath);
                  const prevSel = idx > 0 && selected.has(sorted[idx - 1].relPath);
                  const nextSel = idx < sorted.length - 1 && selected.has(sorted[idx + 1].relPath);
                  return (
                    <FileRow
                      key={it.relPath + idx}
                      item={it}
                      selected={isSel}
                      mergeTop={isSel && prevSel}
                      mergeBottom={isSel && nextSel}
                      onSelect={() => toggleOne(it.relPath)}
                      progress={progress[it.relPath]}
                      showProgress={hasProgress}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="rounded-[12px] p-5 mb-4"
        style={{ backgroundColor: colors.bg.card, border: `1px solid ${colors.border.cardOutline}` }}
      >
        <h2 className="text-[18px] font-bold inline-flex items-baseline gap-2 mb-3" style={{ color: colors.text.primary }}>
          Destination
          <span className="text-[12px] font-normal underline decoration-dotted underline-offset-2 cursor-help" style={{ color: colors.text.buttonActive }}>
            Info
          </span>
        </h2>
        <div className="text-[14px] font-bold mb-1" style={{ color: colors.text.primary }}>Destination</div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="inline-flex items-center gap-1.5 underline underline-offset-2 text-[14px]"
          style={{ color: colors.text.buttonActive }}
        >
          s3://{bucket}/{prefix || ''}
          <OpenExternalIconV2 />
        </a>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={running}
          className="px-4 py-1.5 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: colors.text.buttonActive }}
        >
          {allDone ? 'Close' : 'Cancel'}
        </button>
        {allDone ? (
          <AwsButton variant="primary" onClick={onCancel}>Done</AwsButton>
        ) : (
          <AwsButton
            variant="primary"
            onClick={uploadAll}
            disabled={running || items.length === 0}
          >
            {running ? 'Uploading…' : 'Upload'}
          </AwsButton>
        )}
      </div>
    </div>
  );
}

function basename(p) {
  const parts = p.split('/');
  return parts[parts.length - 1];
}
function dirname(p) {
  const parts = p.split('/');
  return parts.slice(0, -1).join('/') || '-';
}

function HeaderCell({ children, showDivider }) {
  return (
    <th
      style={{
        padding: '8px 12px',
        color: colors.text.info,
        position: 'relative',
        textAlign: 'left',
        fontWeight: 700,
        borderBottom: `1px solid ${colors.border.rowSeparator}`,
      }}
    >
      <span style={{ position: 'relative', display: 'block' }}>
        {children}
        {showDivider && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: -12,
              top: -2,
              bottom: -2,
              width: 1,
              backgroundColor: colors.border.rowSeparator,
            }}
          />
        )}
      </span>
    </th>
  );
}

function SortHeader({ label, col, sort, setSort, showDivider }) {
  const active = sort.key === col;
  function onClick() {
    if (active) setSort({ key: col, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    else setSort({ key: col, dir: 'asc' });
  }
  return (
    <HeaderCell showDivider={showDivider}>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center justify-between w-full pr-2"
        style={{ color: colors.text.info }}
      >
        <span>{label}</span>
        <SortTriangleV2 active={active} direction={active ? sort.dir : null} />
      </button>
    </HeaderCell>
  );
}

function FileRow({ item, selected, mergeTop, mergeBottom, onSelect, progress, showProgress }) {
  const ringColor = selected ? colors.border.rowSelected : 'transparent';
  const separator = `1px solid ${colors.border.rowSeparator}`;
  const top = (selected && mergeTop) ? 'none' : `2px solid ${ringColor}`;
  const bottom = selected ? `2px solid ${ringColor}` : separator;
  const left = selected ? `2px solid ${ringColor}` : 'none';
  const right = selected ? `2px solid ${ringColor}` : 'none';

  const baseTd = {
    padding: '8px 12px',
    verticalAlign: 'middle',
    backgroundColor: selected ? colors.bg.rowSelected : 'transparent',
    color: colors.text.selectedRow,
    borderTop: top,
    borderBottom: bottom,
  };

  const name = basename(item.relPath);
  const folder = dirname(item.relPath);

  return (
    <tr>
      <td style={{ ...baseTd, borderLeft: left }}>
        <AwsCheckbox checked={selected} onChange={onSelect} ariaLabel={`Select ${name}`} />
      </td>
      <td style={baseTd}>
        <span className="break-all" style={{ color: colors.text.selectedRow }}>
          {name}
        </span>
      </td>
      <td style={baseTd}>
        <span style={{ color: colors.text.info }}>{folder}</span>
      </td>
      <td style={baseTd}>{item.file.type || '-'}</td>
      <td style={{ ...baseTd, borderRight: showProgress ? undefined : right }}>
        {bytesToHuman(item.file.size)}
      </td>
      {showProgress && (
        <td style={{ ...baseTd, borderRight: right }}>
          <StatusCell progress={progress} />
        </td>
      )}
    </tr>
  );
}

function StatusCell({ progress }) {
  if (!progress) return <span style={{ color: colors.text.info }}>Queued</span>;
  if (progress.status === 'starting') return <span style={{ color: colors.text.info }}>Starting…</span>;
  if (progress.status === 'uploading') return <span style={{ color: colors.text.selectedRow }}>{progress.pct}%</span>;
  if (progress.status === 'done') return <span style={{ color: '#3fb950' }}>Done</span>;
  if (progress.status === 'failed') return <span style={{ color: '#fe6b58' }} title={progress.err}>Failed</span>;
  return null;
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
