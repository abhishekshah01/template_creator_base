import { useEffect, useRef, useState } from 'react';

import AwsAlert2 from '../S3Navigate/AwsAlert2';
import AwsAlertSolid from '../S3Navigate/AwsAlertSolid';
import { AwsButton } from '../S3Navigate/AwsControls';
import ProgressBanner from '../S3Navigate/ProgressBanner';
import { bytesToHuman } from '../S3Navigate/format';
import { colors } from '../S3Navigate/theme';
import { s3api } from '../S3Navigate/api';
import { PermissionDeniedError, UploadAbortedError } from '../../api';

import { CMS_BUCKET, CMS_PREFIX, CMS_S3_PREFIX_LABEL } from './config';

export default function UploadTab() {
  const fileInputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState({});
  const [running, setRunning] = useState(false);
  const [denied, setDenied] = useState(null);
  const [completed, setCompleted] = useState(false);

  const [loadedByKey, setLoadedByKey] = useState({});
  const [rateBps, setRateBps] = useState(null);
  const [etaSeconds, setEtaSeconds] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const abortRef = useRef(null);
  const sampleRef = useRef([]);

  const totalBytes = items.reduce((s, it) => s + (it.file.size || 0), 0);
  const uploadedBytes = Object.values(loadedByKey).reduce((s, b) => s + (b || 0), 0);
  const completedFiles = items.filter(it => {
    const s = progress[it.relPath]?.status;
    return s === 'done' || s === 'failed';
  }).length;
  const succeeded = items.filter(it => progress[it.relPath]?.status === 'done');
  const failed = items.filter(it => progress[it.relPath]?.status === 'failed');

  useEffect(() => {
    if (!running) return undefined;
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

  function addFiles(fileList) {
    const next = Array.from(fileList || []).map(f => ({
      file: f,
      relPath: f.name,
    }));
    setItems(prev => dedupe([...prev, ...next]));
    setCompleted(false);
    setProgress({});
    setLoadedByKey({});
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

  function updateRelPath(idx, value) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, relPath: value } : it));
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleUpload() {
    if (!items.length || running) return;
    setRunning(true);
    setDenied(null);
    setCompleted(false);
    setCancelling(false);
    setLoadedByKey({});
    sampleRef.current = [];
    setRateBps(null);
    setEtaSeconds(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    for (const { file, relPath } of items) {
      if (ctrl.signal.aborted) break;
      const key = CMS_PREFIX + sanitizeRel(relPath);
      setProgress(p => ({ ...p, [relPath]: { pct: 0, status: 'starting' } }));
      try {
        await s3api.uploadObject(file, CMS_BUCKET, key, (pct, loaded) => {
          setProgress(p => ({ ...p, [relPath]: { pct, status: 'uploading' } }));
          setLoadedByKey(m => ({ ...m, [relPath]: loaded }));
        }, ctrl.signal);
        setProgress(p => ({ ...p, [relPath]: { pct: 100, status: 'done' } }));
        setLoadedByKey(m => ({ ...m, [relPath]: file.size || 0 }));
      } catch (e) {
        if (e instanceof UploadAbortedError) {
          setProgress(p => ({ ...p, [relPath]: { pct: 0, status: 'failed', err: 'Cancelled' } }));
          break;
        }
        if (e instanceof PermissionDeniedError) {
          setDenied(e);
          setProgress(p => ({ ...p, [relPath]: { pct: 0, status: 'failed', err: 'Access denied' } }));
          break;
        }
        setProgress(p => ({ ...p, [relPath]: { pct: 0, status: 'failed', err: e.message } }));
      }
    }

    setRunning(false);
    setCancelling(false);
    setCompleted(true);
    abortRef.current = null;
  }

  function cancelUpload() {
    if (!running || cancelling) return;
    setCancelling(true);
    abortRef.current?.abort();
  }

  function reset() {
    setItems([]);
    setProgress({});
    setLoadedByKey({});
    setCompleted(false);
    setDenied(null);
  }

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

      {completed && !running && !denied && (
        <div className="mb-4">
          {failed.length === 0 ? (
            <AwsAlertSolid
              variant="success"
              title={`Successfully uploaded ${succeeded.length} file${succeeded.length === 1 ? '' : 's'}`}
            >
              Files were uploaded to <strong>{CMS_S3_PREFIX_LABEL}</strong>.
            </AwsAlertSolid>
          ) : (
            <AwsAlert2 variant="error" title={`${failed.length} file${failed.length === 1 ? '' : 's'} failed to upload`}>
              See the per-row Status below for details.
            </AwsAlert2>
          )}
        </div>
      )}

      {denied && (
        <div className="mb-4">
          <AwsAlert2 variant="error" title="Insufficient permissions to upload">
            Your account is missing the <code style={{ fontFamily: 'inherit', fontWeight: 600 }}>tc:s3:PutObject</code> action on this bucket.
          </AwsAlert2>
        </div>
      )}

      <Card>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[18px] font-bold" style={{ color: colors.text.primary }}>Upload</h2>
            <p className="text-[13px] mt-0.5" style={{ color: colors.text.info }}>
              Destination is fixed: <span className="font-mono">{CMS_S3_PREFIX_LABEL}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {items.length > 0 && !running && (
              <AwsButton onClick={reset}>Clear</AwsButton>
            )}
            <AwsButton disabled={running} onClick={() => fileInputRef.current?.click()}>
              Add files
            </AwsButton>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />

        {items.length === 0 ? (
          <EmptyDrop onPick={() => fileInputRef.current?.click()} />
        ) : (
          <ItemTable
            items={items}
            progress={progress}
            running={running}
            onChangeRelPath={updateRelPath}
            onRemove={removeItem}
          />
        )}

        <div className="flex items-center justify-end gap-3 mt-4">
          <AwsButton
            variant="primary"
            onClick={handleUpload}
            disabled={running || items.length === 0}
          >
            {running ? 'Uploading…' : 'Upload'}
          </AwsButton>
        </div>
      </Card>
    </div>
  );
}

function sanitizeRel(p) {
  return (p || '').replace(/^\/+/, '');
}

function Card({ children }) {
  return (
    <div
      className="rounded-[12px] p-5"
      style={{ backgroundColor: colors.bg.card, border: `1px solid ${colors.border.cardOutline}` }}
    >
      {children}
    </div>
  );
}

function EmptyDrop({ onPick }) {
  return (
    <div
      onClick={onPick}
      role="button"
      tabIndex={0}
      className="px-6 py-12 text-center text-[14px] cursor-pointer transition-colors"
      style={{
        border: `2px dashed ${colors.border.rowSelected}`,
        borderRadius: 8,
        color: colors.text.selectedRow,
      }}
    >
      Click to choose files. Destination prefix is locked.
    </div>
  );
}

function ItemTable({ items, progress, running, onChangeRelPath, onRemove }) {
  return (
    <div className="rounded-[4px] overflow-x-auto">
      <table className="w-full text-[14px] text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            <Th>File</Th>
            <Th>Relative path under prefix</Th>
            <Th>Size</Th>
            <Th>Status</Th>
            <Th>{''}</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => {
            const p = progress[it.relPath];
            return (
              <tr key={`${it.relPath}-${idx}`}>
                <Td>
                  <span className="break-all" style={{ color: colors.text.selectedRow }}>{it.file.name}</span>
                </Td>
                <Td>
                  <input
                    value={it.relPath}
                    onChange={(e) => onChangeRelPath(idx, e.target.value)}
                    disabled={running}
                    className="w-full h-[30px] px-2 text-[13px] outline-none focus:shadow-[0_0_0_2px_rgba(124,58,237,0.3)] disabled:opacity-60"
                    style={{
                      backgroundColor: '#0d1117',
                      border: `1px solid ${colors.border.inputDefault}`,
                      borderRadius: 4,
                      color: colors.text.primary,
                    }}
                  />
                </Td>
                <Td>{bytesToHuman(it.file.size)}</Td>
                <Td><StatusCell progress={p} /></Td>
                <Td>
                  {!running && (
                    <button
                      type="button"
                      onClick={() => onRemove(idx)}
                      className="text-[13px] hover:underline"
                      style={{ color: colors.text.buttonActive }}
                    >
                      Remove
                    </button>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        padding: '6px 12px',
        textAlign: 'left',
        fontWeight: 700,
        color: colors.text.info,
        borderBottom: `1px solid ${colors.border.rowSeparator}`,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }) {
  return (
    <td
      style={{
        padding: '6px 12px',
        verticalAlign: 'middle',
        color: colors.text.selectedRow,
        borderBottom: `1px solid ${colors.border.rowSeparator}`,
      }}
    >
      {children}
    </td>
  );
}

function StatusCell({ progress }) {
  if (!progress) return <span style={{ color: colors.text.info }}>Queued</span>;
  if (progress.status === 'starting') return <span style={{ color: colors.text.info }}>Starting…</span>;
  if (progress.status === 'uploading') return <span style={{ color: colors.text.selectedRow }}>{progress.pct}%</span>;
  if (progress.status === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5" style={{ color: '#73ffa6' }}>
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="7" />
          <path d="M4.5 7.5 7 10l4-5" />
        </svg>
        Succeeded
      </span>
    );
  }
  if (progress.status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5" style={{ color: '#ff3233' }} title={progress.err}>
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="7" />
          <path d="m5.5 5.5 5 5M10.5 5.5l-5 5" />
        </svg>
        Failed
      </span>
    );
  }
  return null;
}
