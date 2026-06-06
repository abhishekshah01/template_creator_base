import { useEffect, useMemo, useRef, useState } from 'react';

import AwsAlert2 from '../S3Navigate/AwsAlert2';
import AwsAlertSolid from '../S3Navigate/AwsAlertSolid';
import { AwsButton } from '../S3Navigate/AwsControls';
import ProgressBanner from '../S3Navigate/ProgressBanner';
import { colors } from '../S3Navigate/theme';
import { s3api } from '../S3Navigate/api';
import { PermissionDeniedError } from '../../api';

import { CMS_BUCKET, CMS_PREFIX, CMS_S3_PREFIX_LABEL } from './config';

export default function DeleteTab() {
  const [raw, setRaw] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [results, setResults] = useState(null);
  const [denied, setDenied] = useState(null);
  const [deletedBytes, setDeletedBytes] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(null);
  const cancelRef = useRef(false);
  const sampleRef = useRef([]);

  const parsed = useMemo(() => parsePaths(raw), [raw]);
  const canDelete = confirmText === 'delete' && !deleting && parsed.valid.length > 0;

  // We don't know sizes (no listing call). For progress purposes,
  // treat each object as 1 "unit" by setting totalBytes = count.
  const totalUnits = parsed.valid.length;

  useEffect(() => {
    if (!deleting) return undefined;
    const id = setInterval(() => {
      const now = performance.now();
      const samples = sampleRef.current;
      samples.push({ t: now, units: completedCount });
      const cutoff = now - 2500;
      while (samples.length > 2 && samples[0].t < cutoff) samples.shift();
      if (samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = (last.t - first.t) / 1000;
        if (dt > 0.4) {
          const unitsPerSec = (last.units - first.units) / dt;
          const remaining = Math.max(0, totalUnits - completedCount);
          setEtaSeconds(unitsPerSec > 0 ? remaining / unitsPerSec : null);
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [deleting, completedCount, totalUnits]);

  async function handleDelete() {
    if (!canDelete) return;
    sampleRef.current = [];
    setEtaSeconds(null);
    setDeleting(true);
    setCancelling(false);
    cancelRef.current = false;
    setDeletedBytes(0);
    setCompletedCount(0);
    setDenied(null);

    const out = [];
    for (let i = 0; i < parsed.valid.length; i++) {
      if (cancelRef.current) {
        for (let j = i; j < parsed.valid.length; j++) {
          out.push({ ...parsed.valid[j], ok: false, error: 'Cancelled' });
        }
        break;
      }
      const item = parsed.valid[i];
      try {
        await s3api.deleteObject(CMS_BUCKET, item.fullKey);
        out.push({ ...item, ok: true });
        setDeletedBytes(b => b + 1);
        setCompletedCount(c => c + 1);
      } catch (e) {
        const isPerm = e instanceof PermissionDeniedError;
        out.push({ ...item, ok: false, error: isPerm ? 'Access denied' : e.message });
        setCompletedCount(c => c + 1);
        if (isPerm) {
          setDenied(e);
          for (let j = i + 1; j < parsed.valid.length; j++) {
            out.push({ ...parsed.valid[j], ok: false, error: 'Access denied' });
          }
          break;
        }
      }
    }
    setDeleting(false);
    setCancelling(false);
    setResults(out);
  }

  function cancelDelete() {
    if (!deleting || cancelling) return;
    setCancelling(true);
    cancelRef.current = true;
  }

  function reset() {
    setRaw('');
    setConfirmText('');
    setResults(null);
    setDenied(null);
  }

  return (
    <div>
      {deleting && (
        <div className="mb-4">
          <ProgressBanner
            title="Deleting"
            noun="object"
            totalFiles={totalUnits}
            completedFiles={completedCount}
            totalBytes={totalUnits}
            uploadedBytes={deletedBytes}
            rateBytesPerSec={null}
            etaSeconds={etaSeconds}
            onCancel={cancelDelete}
            cancelling={cancelling}
          />
        </div>
      )}

      {results && !deleting && !denied && (
        <ResultBanner results={results} />
      )}

      {denied && (
        <div className="mb-4">
          <AwsAlert2 variant="error" title="Insufficient permissions to delete">
            Your account is missing the <code style={{ fontFamily: 'inherit', fontWeight: 600 }}>tc:s3:DeleteObject</code> action on this bucket.
          </AwsAlert2>
        </div>
      )}

      <Card>
        <h2 className="text-[18px] font-bold" style={{ color: colors.text.primary }}>Delete objects</h2>
        <p className="text-[13px] mt-0.5 mb-3" style={{ color: colors.text.info }}>
          One path per line. Paths are relative to <span className="font-mono">{CMS_S3_PREFIX_LABEL}</span>.
        </p>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          disabled={deleting}
          rows={8}
          placeholder={'banner.png\nimages/hero.webp\nsubfolder/file.pdf'}
          className="w-full px-3 py-2 text-[13px] outline-none focus:shadow-[0_0_0_2px_rgba(124,58,237,0.3)] disabled:opacity-60 font-mono"
          style={{
            backgroundColor: '#0d1117',
            border: `1px solid ${colors.border.inputDefault}`,
            borderRadius: 6,
            color: colors.text.primary,
            resize: 'vertical',
          }}
        />

        {parsed.valid.length + parsed.invalid.length > 0 && (
          <div className="mt-3 text-[13px]" style={{ color: colors.text.info }}>
            {parsed.valid.length} valid · {parsed.invalid.length > 0 && (
              <span style={{ color: '#ff3233' }}>{parsed.invalid.length} invalid</span>
            )}
            {parsed.invalid.length === 0 && <span>{parsed.invalid.length} invalid</span>}
          </div>
        )}

        {parsed.valid.length > 0 && !results && (
          <div className="mt-4">
            <p className="text-[13px] mb-2" style={{ color: colors.text.selectedRow }}>
              To confirm deletion, type <span className="italic font-semibold">delete</span> in the field below.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete"
              disabled={deleting}
              className="w-full max-w-[480px] h-[34px] px-3 text-[14px] outline-none focus:shadow-[0_0_0_2px_rgba(124,58,237,0.3)]"
              style={{
                backgroundColor: '#0d1117',
                border: `1px solid ${colors.border.inputDefault}`,
                borderRadius: 6,
                color: colors.text.primary,
              }}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-5">
          {results && (
            <AwsButton onClick={reset}>Clear</AwsButton>
          )}
          <AwsButton variant="primary" onClick={handleDelete} disabled={!canDelete}>
            {deleting ? 'Deleting…' : 'Delete'}
          </AwsButton>
        </div>
      </Card>

      {parsed.invalid.length > 0 && (
        <div className="mt-4">
          <Card>
            <h3 className="text-[14px] font-bold mb-2" style={{ color: colors.text.primary }}>
              Invalid paths ({parsed.invalid.length})
            </h3>
            <ul className="text-[13px] font-mono space-y-0.5" style={{ color: '#ff3233' }}>
              {parsed.invalid.map((line, i) => (
                <li key={i} className="break-all">{line || '(empty line)'}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function parsePaths(raw) {
  const valid = [];
  const invalid = [];
  const lines = (raw || '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
  for (const line of lines) {
    let rel = line;
    if (rel.startsWith('s3://')) {
      const m = rel.match(/^s3:\/\/([^/]+)\/(.+)$/);
      if (m && m[1] === CMS_BUCKET && m[2].startsWith(CMS_PREFIX)) {
        rel = m[2].slice(CMS_PREFIX.length);
      } else {
        invalid.push(line);
        continue;
      }
    }
    rel = rel.replace(/^\/+/, '');
    if (!rel) {
      invalid.push(line);
      continue;
    }
    valid.push({ relPath: rel, fullKey: CMS_PREFIX + rel });
  }
  return { valid, invalid };
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

function ResultBanner({ results }) {
  const ok = results.filter(r => r.ok).length;
  const fail = results.length - ok;
  if (fail === 0) {
    return (
      <div className="mb-4">
        <AwsAlertSolid variant="success" title={`Successfully deleted ${ok} object${ok === 1 ? '' : 's'}`}>
          See the table below for details.
        </AwsAlertSolid>
        <div className="mt-3"><ResultTable results={results} /></div>
      </div>
    );
  }
  return (
    <div className="mb-4">
      <AwsAlert2 variant="error" title={`${fail} object${fail === 1 ? '' : 's'} failed to delete`}>
        See the table below for per-row details.
      </AwsAlert2>
      <div className="mt-3"><ResultTable results={results} /></div>
    </div>
  );
}

function ResultTable({ results }) {
  return (
    <div
      className="rounded-[12px] p-5"
      style={{ backgroundColor: colors.bg.card, border: `1px solid ${colors.border.cardOutline}` }}
    >
      <table className="w-full text-[13px] text-left font-mono" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            <Th>Path</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={`${r.relPath}-${i}`}>
              <Td><span className="break-all">{r.relPath}</span></Td>
              <Td>
                {r.ok ? (
                  <span style={{ color: '#73ffa6' }}>Deleted</span>
                ) : (
                  <span style={{ color: '#ff3233' }}>{r.error || 'Failed'}</span>
                )}
              </Td>
            </tr>
          ))}
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
