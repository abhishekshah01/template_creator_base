import { useEffect, useRef, useState, useMemo } from 'react';

import AwsAlert2 from './AwsAlert2';
import AwsAlertSolid from './AwsAlertSolid';
import { AwsButton, AwsCheckbox, AwsSearchInput, SortTriangleV2, OpenExternalIconV2 } from './AwsControls';
import PermissionDeniedBanner from './PermissionDeniedBanner';
import ProgressBanner from './ProgressBanner';
import { s3api } from './api';
import { PermissionDeniedError, UploadAbortedError } from '../../api';
import { bytesToHuman, fileExt } from './format';
import { colors } from './theme';

const FAIL_RED = '#ff3233';
const SUCCESS_GREEN = '#73ffa6';
const ZERO_GRAY = '#a49d91';

function fmtPct(p) {
  if (!isFinite(p) || p === 0) return '0%';
  if (p === 100) return '100.00%';
  return p.toFixed(2) + '%';
}

function prettifyError(message) {
  if (!message) return 'Upload failed';
  const stripped = message.replace(/^[^:]*failed:\s*/i, '');
  try {
    const parsed = JSON.parse(stripped);
    return parsed.detail || parsed.message || stripped;
  } catch {
    return stripped || message;
  }
}

export default function UploadPage({ bucket, prefix, onCancel, onDone }) {
  const inputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState({});
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState(null);
  const [denied, setDenied] = useState(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [dragging, setDragging] = useState(false);

  const [loadedByKey, setLoadedByKey] = useState({});
  const [rateBps, setRateBps] = useState(null);
  const [etaSeconds, setEtaSeconds] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const abortRef = useRef(null);
  const sampleRef = useRef([]);

  const totalBytes = items.reduce((s, it) => s + (it.file.size || 0), 0);
  const hasProgress = Object.keys(progress).length > 0;
  const uploadedBytes = Object.values(loadedByKey).reduce((s, b) => s + (b || 0), 0);
  const completedFiles = items.filter(it => {
    const s = progress[it.relPath]?.status;
    return s === 'done' || s === 'failed';
  }).length;

  useEffect(() => {
    if (!running) {
      sampleRef.current = [];
      setRateBps(null);
      setEtaSeconds(null);
      return;
    }
    const id = setInterval(() => {
      const now = performance.now();
      const samples = sampleRef.current;
      samples.push({ t: now, bytes: uploadedBytes });
      const cutoff = now - 2500;
      while (samples.length > 2 && samples[0].t < cutoff) samples.shift();
      if (samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = (last.t - first.t) / 1000;
        if (dt > 0.4) {
          const rate = (last.bytes - first.bytes) / dt;
          setRateBps(rate);
          const remaining = Math.max(0, totalBytes - uploadedBytes);
          setEtaSeconds(rate > 0 ? remaining / rate : null);
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, uploadedBytes, totalBytes]);

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
    setDenied(null);
    setCancelling(false);
    setLoadedByKey({});
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let stopAt = -1;
    let aborted = false;
    for (let i = 0; i < items.length; i++) {
      if (ctrl.signal.aborted) { stopAt = i - 1; aborted = true; break; }
      const { file, relPath } = items[i];
      const key = (prefix || '') + relPath;
      setProgress(p => ({ ...p, [relPath]: { pct: 0, status: 'starting' } }));
      try {
        await s3api.uploadObject(file, bucket, key, (pct, loaded) => {
          setProgress(p => ({ ...p, [relPath]: { pct, status: 'uploading' } }));
          setLoadedByKey(m => ({ ...m, [relPath]: loaded }));
        }, ctrl.signal);
        setProgress(p => ({ ...p, [relPath]: { pct: 100, status: 'done' } }));
        setLoadedByKey(m => ({ ...m, [relPath]: file.size || 0 }));
      } catch (e) {
        if (e instanceof UploadAbortedError) {
          setProgress(p => ({ ...p, [relPath]: { pct: 0, status: 'failed', err: 'Cancelled' } }));
          stopAt = i; aborted = true; break;
        }
        setProgress(p => ({ ...p, [relPath]: { pct: 0, status: 'failed', err: e.message } }));
        if (e instanceof PermissionDeniedError) {
          setDenied(e);
          stopAt = i;
          break;
        }
      }
    }
    if (stopAt >= 0) {
      setProgress(p => {
        const next = { ...p };
        for (let i = stopAt + 1; i < items.length; i++) {
          next[items[i].relPath] = {
            pct: 0,
            status: 'failed',
            err: aborted ? 'Cancelled' : 'Access denied',
          };
        }
        return next;
      });
    }
    setRunning(false);
    setCancelling(false);
    abortRef.current = null;
  }

  function cancelUpload() {
    if (!running || cancelling) return;
    setCancelling(true);
    abortRef.current?.abort();
  }

  const finished = !running && hasProgress && items.every(it => {
    const s = progress[it.relPath]?.status;
    return s === 'done' || s === 'failed';
  });
  const succeededItems = items.filter(it => progress[it.relPath]?.status === 'done');
  const failedItems = items.filter(it => progress[it.relPath]?.status === 'failed');
  const okBytes = succeededItems.reduce((s, it) => s + (it.file.size || 0), 0);
  const failedBytes = failedItems.reduce((s, it) => s + (it.file.size || 0), 0);
  const totalFinished = succeededItems.length + failedItems.length;
  const okPct = totalFinished ? (succeededItems.length / totalFinished) * 100 : 0;
  const failPct = totalFinished ? (failedItems.length / totalFinished) * 100 : 0;
  const anyFailed = failedItems.length > 0;
  const allChecked = sorted.length > 0 && selected.size >= sorted.length;
  const someChecked = !allChecked && selected.size > 0;

  return (
    <div>
      {running && (
        <div className="mb-4">
          <ProgressBanner
            title="Uploading"
            totalFiles={items.length}
            completedFiles={completedFiles}
            totalBytes={totalBytes}
            uploadedBytes={uploadedBytes}
            rateBytesPerSec={rateBps}
            etaSeconds={etaSeconds}
            onCancel={cancelUpload}
            cancelling={cancelling}
          />
        </div>
      )}

      {!finished && (
        <>
          <h1 className="text-[28px] font-bold mb-1 inline-flex items-baseline gap-2" style={{ color: colors.text.primary }}>
            Upload
            <span className="text-[14px] font-normal underline decoration-dotted underline-offset-2 cursor-help" style={{ color: colors.text.buttonActive }}>
              Info
            </span>
          </h1>
          <p className="text-[14px] mb-5 max-w-[860px]" style={{ color: colors.text.info }}>
            Add the files and folders you want to upload to S3. Files are uploaded with a presigned PUT URL minted by the Emergent app-service; this app never touches AWS credentials directly.
          </p>
        </>
      )}

      {denied && (
        <div className="mb-4">
          <PermissionDeniedBanner error={denied} />
        </div>
      )}

      {err && (
        <div className="mb-4">
          <AwsAlert2 variant="error" title="Upload error" onDismiss={() => setErr(null)}>
            {err}
          </AwsAlert2>
        </div>
      )}

      {finished && (
        <div className="mb-4">
          {anyFailed ? (
            <AwsAlert2 variant="error" title="Failed to upload some objects">
              For more information, see the <strong>Status</strong> column in the table below.
            </AwsAlert2>
          ) : (
            <AwsAlertSolid
              variant="success"
              title={`Successfully uploaded ${succeededItems.length} object${succeededItems.length === 1 ? '' : 's'}`}
            >
              For more information, see the <strong>Files and folders</strong> table.
            </AwsAlertSolid>
          )}
        </div>
      )}

      {finished && (
        <>
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h1 className="text-[24px] font-bold" style={{ color: colors.text.primary }}>
              Upload: status
            </h1>
            <AwsButton variant="primary" onClick={() => onDone?.(succeededItems.length)}>Close</AwsButton>
          </div>
          <div className="mb-4">
            <AwsAlert2 variant="info">
              After you navigate away from this page, the following information is no longer available.
            </AwsAlert2>
          </div>
        </>
      )}

      {finished && (
        <div
          className="rounded-[12px] p-5 mb-4"
          style={{ backgroundColor: colors.bg.card, border: `1px solid ${colors.border.cardOutline}` }}
        >
          <h2 className="text-[18px] font-bold mb-4" style={{ color: colors.text.primary }}>Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 text-[14px]">
            <SummaryField label="Destination" divider>
              <span className="break-all" style={{ color: colors.text.buttonActive }}>
                s3://{bucket}/{prefix || ''}
              </span>
            </SummaryField>
            <SummaryField label="Succeeded" divider>
              <SummaryStat count={succeededItems.length} bytes={okBytes} pct={okPct} tone="success" />
            </SummaryField>
            <SummaryField label="Failed">
              <SummaryStat count={failedItems.length} bytes={failedBytes} pct={failPct} tone="fail" />
            </SummaryField>
          </div>
        </div>
      )}

      {!finished && (<>
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
      </>)}

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
            {!finished && (
              <p className="text-[14px] mt-1" style={{ color: colors.text.info }}>
                All files and folders in this table will be uploaded.
              </p>
            )}
          </div>
          {!finished && (
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
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mt-3 mb-3">
          <div className="flex-1 max-w-[400px]">
            <AwsSearchInput value={filter} onChange={setFilter} placeholder="Find by name" />
          </div>
          {!finished && (
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
          )}
        </div>

        <div className="rounded-[4px] overflow-x-auto min-w-0">
          <table
            className="w-full text-[14px] text-left"
            style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}
          >
            <colgroup>
              {!finished && <col style={{ width: 44 }} />}
              <col />
              <col style={{ width: 180 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 110 }} />
              {hasProgress && <col style={{ width: 130 }} />}
            </colgroup>
            <thead>
              <tr>
                {!finished && (
                  <HeaderCell showDivider>
                    <AwsCheckbox
                      checked={allChecked}
                      indeterminate={someChecked}
                      onChange={toggleAll}
                      ariaLabel="Select all rows"
                    />
                  </HeaderCell>
                )}
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
                      finished={finished}
                      isLast={idx === sorted.length - 1}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!finished && (
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
      )}

      {!finished && (
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={running}
            className="px-4 py-1.5 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: colors.text.buttonActive }}
          >
            Cancel
          </button>
          <AwsButton
            variant="primary"
            onClick={uploadAll}
            disabled={running || items.length === 0}
          >
            {running ? 'Uploading…' : 'Upload'}
          </AwsButton>
        </div>
      )}
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
        padding: '4px 12px',
        color: colors.text.info,
        position: 'relative',
        textAlign: 'left',
        fontWeight: 700,
        borderBottom: `1px solid ${colors.border.rowSeparator}`,
      }}
    >
      {children}
      {showDivider && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 0,
            top: 4,
            bottom: 6,
            width: 2,
            backgroundColor: '#8c8c95',
          }}
        />
      )}
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

function FileRow({ item, selected, mergeTop, mergeBottom, onSelect, progress, showProgress, finished = false, isLast = false }) {
  const name = basename(item.relPath);
  const folder = dirname(item.relPath);

  if (finished) {
    const td = {
      padding: '3px 12px',
      verticalAlign: 'middle',
      color: colors.text.selectedRow,
      borderBottom: isLast ? 'none' : `1px solid ${colors.border.rowSeparator}`,
    };
    return (
      <tr>
        <td style={td}>
          <span className="break-all">
            <span className="inline-block align-text-bottom mr-2">
              <FileIconSvg />
            </span>
            <span
              className="underline decoration-1 underline-offset-4"
              style={{ color: colors.text.buttonActive }}
            >
              {name}
            </span>
          </span>
        </td>
        <td style={{ ...td, color: colors.text.info }}>—</td>
        <td style={td}>{item.file.type || '-'}</td>
        <td style={td}>{bytesToHuman(item.file.size)}</td>
        {showProgress && <td style={td}><StatusCell progress={progress} /></td>}
      </tr>
    );
  }

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
  if (progress.status === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5" style={{ color: SUCCESS_GREEN }}>
        <CheckCircleIcon size={16} strokeWidth={1.4} />
        Succeeded
      </span>
    );
  }
  if (progress.status === 'failed') {
    return (
      <span
        className="break-all"
        style={{
          display: 'inline-block',
          maxWidth: '100%',
          color: FAIL_RED,
          paddingBottom: 4,
          backgroundImage: `linear-gradient(to right, ${colors.text.selectedRow} 50%, transparent 50%)`,
          backgroundSize: '6px 1px',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'left bottom',
        }}
      >
        <FailIcon
          size={16}
          strokeWidth={1.4}
          style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }}
        />
        {prettifyError(progress.err)}
      </span>
    );
  }
  return null;
}

function SummaryField({ label, children, divider = false }) {
  return (
    <div
      className="px-6 first:pl-0 last:pr-0"
      style={divider ? { borderRight: `1px solid ${colors.border.rowSeparator}` } : undefined}
    >
      <div className="font-bold mb-1" style={{ color: colors.text.primary }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function SummaryStat({ count, bytes, pct, tone }) {
  const isZero = count === 0;
  const color = isZero
    ? ZERO_GRAY
    : (tone === 'success' ? SUCCESS_GREEN : FAIL_RED);
  const Icon = isZero
    ? DotsIcon
    : (tone === 'success' ? CheckCircleIcon : FailIcon);
  const noun = `file${count === 1 ? '' : 's'}`;
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color }}>
      <Icon size={16} strokeWidth={1.4} />
      {count} {noun}, {bytesToHuman(bytes || 0)} ({fmtPct(pct)})
    </span>
  );
}

function CheckCircleIcon({ size = 16, strokeWidth = 1.6, style }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <circle cx="8" cy="8" r="7" />
      <path d="M4.5 7.5 7 10l4-5" />
    </svg>
  );
}

function FailIcon({ size = 16, strokeWidth = 1.6, style }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <circle cx="8" cy="8" r="7" />
      <path d="m5.5 5.5 5 5M10.5 5.5l-5 5" />
    </svg>
  );
}

function FileIconSvg() {
  return (
    <svg
      className="w-4 h-4 shrink-0 mt-0.5"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{ color: colors.text.selectedRow }}
      aria-hidden="true"
    >
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
    </svg>
  );
}

function DotsIcon({ size = 16, strokeWidth = 1.6, style }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
      style={style}
    >
      <circle
        cx="8"
        cy="8"
        r="7"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <path d="M9 7H7v2h2V7ZM6 7H4v2h2V7ZM12 7h-2v2h2V7Z" fill="currentColor" />
    </svg>
  );
}
