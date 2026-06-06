import { useMemo, useState } from 'react';

import AwsAlert2 from '../S3Navigate/AwsAlert2';
import AwsAlertSolid from '../S3Navigate/AwsAlertSolid';
import { AwsButton } from '../S3Navigate/AwsControls';
import { colors } from '../S3Navigate/theme';
import { s3api } from '../S3Navigate/api';
import { PermissionDeniedError } from '../../api';

import { CMS_PREFIX, CMS_S3_PREFIX_LABEL } from './config';

export default function InvalidateTab() {
  const [raw, setRaw] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [denied, setDenied] = useState(null);

  const parsed = useMemo(() => parsePaths(raw), [raw]);
  const canRun = parsed.valid.length > 0 && !running;

  async function handleInvalidate() {
    if (!canRun) return;
    setRunning(true);
    setDenied(null);
    setResults(null);
    const out = [];
    for (const p of parsed.valid) {
      try {
        await s3api.invalidateCache(p.cfPath);
        out.push({ ...p, ok: true });
      } catch (e) {
        const isPerm = e instanceof PermissionDeniedError;
        out.push({ ...p, ok: false, error: isPerm ? 'Access denied' : e.message });
        if (isPerm) {
          setDenied(e);
          for (const rest of parsed.valid.slice(out.length)) {
            out.push({ ...rest, ok: false, error: 'Access denied' });
          }
          break;
        }
      }
    }
    setRunning(false);
    setResults(out);
  }

  function reset() {
    setRaw('');
    setResults(null);
    setDenied(null);
  }

  return (
    <div>
      {results && !running && !denied && <ResultBanner results={results} />}

      {denied && (
        <div className="mb-4">
          <AwsAlert2 variant="error" title="Insufficient permissions to invalidate">
            Your account is missing the <code style={{ fontFamily: 'inherit', fontWeight: 600 }}>tc:s3:InvalidateCache</code> action.
          </AwsAlert2>
        </div>
      )}

      <Card>
        <h2 className="text-[18px] font-bold" style={{ color: colors.text.primary }}>Invalidate CloudFront cache</h2>
        <p className="text-[13px] mt-0.5 mb-3" style={{ color: colors.text.info }}>
          One path per line. Paths are relative to <span className="font-mono">{CMS_S3_PREFIX_LABEL}</span> and get sent to CloudFront as <span className="font-mono">/{CMS_PREFIX}&lt;path&gt;</span>. Wildcards (<span className="font-mono">images/*</span>) are allowed.
        </p>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          disabled={running}
          rows={8}
          placeholder={'banner.png\nimages/*\nsubfolder/file.pdf'}
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
            {parsed.valid.length} valid · {parsed.invalid.length > 0 ? (
              <span style={{ color: '#ff3233' }}>{parsed.invalid.length} invalid</span>
            ) : (
              <span>0 invalid</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-5">
          {results && <AwsButton onClick={reset}>Clear</AwsButton>}
          <AwsButton variant="primary" onClick={handleInvalidate} disabled={!canRun}>
            {running ? 'Invalidating…' : 'Invalidate'}
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
    let rel = line.replace(/^\/+/, '');
    if (rel.startsWith(CMS_PREFIX)) rel = rel.slice(CMS_PREFIX.length);
    if (!rel) { invalid.push(line); continue; }
    if (!/^[A-Za-z0-9_./\-*]+$/.test(rel)) { invalid.push(line); continue; }
    valid.push({ relPath: rel, cfPath: '/' + CMS_PREFIX + rel });
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
        <AwsAlertSolid variant="success" title={`Submitted ${ok} invalidation${ok === 1 ? '' : 's'}`}>
          CloudFront will clear these paths within ~15 minutes.
        </AwsAlertSolid>
        <div className="mt-3"><ResultTable results={results} /></div>
      </div>
    );
  }
  return (
    <div className="mb-4">
      <AwsAlert2 variant="error" title={`${fail} invalidation${fail === 1 ? '' : 's'} failed`}>
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
            <Th>CloudFront path</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={`${r.cfPath}-${i}`}>
              <Td><span className="break-all">{r.cfPath}</span></Td>
              <Td>
                {r.ok ? (
                  <span style={{ color: '#73ffa6' }}>Submitted</span>
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
