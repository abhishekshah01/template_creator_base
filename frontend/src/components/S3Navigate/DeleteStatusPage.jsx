import { useMemo, useState } from 'react';

import AwsAlert2 from './AwsAlert2';
import AwsAlertSolid from './AwsAlertSolid';
import { AwsButton, AwsSearchInput, SortTriangleV2 } from './AwsControls';
import { bytesToHuman, formatAwsDate, fileExt } from './format';
import { colors } from './theme';

const FAIL_RED = '#ff3233';
const SUCCESS_GREEN = '#73ffa6';
const ZERO_GRAY = '#a49d91';

function bucketFromSource(source) {
  const m = (source || '').match(/^s3:\/\/([^/]+)/);
  return m ? m[1] : '';
}

function fmtPct(p) {
  if (!isFinite(p) || p === 0) return '0%';
  if (p === 100) return '100.00%';
  return p.toFixed(2) + '%';
}

export default function DeleteStatusPage({ source, results, onClose }) {
  const ok = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);
  const okBytes = ok.reduce((s, r) => s + (Number(r.size) || 0), 0);
  const failedBytes = failed.reduce((s, r) => s + (Number(r.size) || 0), 0);
  const total = ok.length + failed.length;
  const okPct = total ? (ok.length / total) * 100 : 0;
  const failPct = total ? (failed.length / total) * 100 : 0;
  const hasFailure = failed.length > 0;
  const allPerm = hasFailure && failed.every(r => r.errorKind === 'perm');
  const bucket = bucketFromSource(source);

  const [tab, setTab] = useState(hasFailure ? 'failed' : 'files');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });

  const failedRows = useMemo(() => buildRows(failed, filter, sort), [failed, filter, sort]);
  const allRows = useMemo(() => buildRows(results, filter, sort), [results, filter, sort]);

  function toggleSort(key) {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }

  return (
    <div>
      <div className="mb-4">
        {!hasFailure ? (
          <AwsAlertSolid
            variant="success"
            title={`Successfully deleted ${ok.length} object${ok.length === 1 ? '' : 's'}`}
          >
            For more information, see the <strong>Files and folders</strong> table.
          </AwsAlertSolid>
        ) : allPerm ? (
          <AwsAlert2
            variant="error"
            title={`Insufficient permissions to delete objects${bucket ? ` from s3bucket:${bucket}` : ''}`}
          >
            After you or your administrator has updated your permissions to allow the{' '}
            <code style={{ fontFamily: 'inherit', fontWeight: 600 }}>tc:s3:DeleteObject</code> action,{' '}
            <button
              type="button"
              onClick={onClose}
              className="underline underline-offset-2 hover:opacity-90"
              style={{ color: '#45abfe' }}
            >
              close this page
            </button>
            {' '}and retry.
          </AwsAlert2>
        ) : (
          <AwsAlert2 variant="error" title="Failed to delete objects">
            For more information, see the <strong>Error</strong> column in the{' '}
            <strong>Failed to delete</strong> table below.
          </AwsAlert2>
        )}
      </div>

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h1 className="text-[24px] font-bold" style={{ color: colors.text.primary }}>
          Delete objects: status
        </h1>
        <AwsButton variant="primary" onClick={onClose}>Close</AwsButton>
      </div>

      <div className="mb-4">
        <AwsAlert2 variant="info">
          After you navigate away from this page, the following information is no longer available.
        </AwsAlert2>
      </div>

      <div
        className="rounded-[12px] p-5 mb-6"
        style={{ backgroundColor: colors.bg.card, border: `1px solid ${colors.border.cardOutline}` }}
      >
        <h2 className="text-[18px] font-bold mb-4" style={{ color: colors.text.primary }}>Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 text-[14px]">
          <SummaryField label="Source" divider>
            <span className="break-all" style={{ color: colors.text.buttonActive }}>{source}</span>
          </SummaryField>
          <SummaryField label="Succeeded" divider>
            <SummaryStat count={ok.length} bytes={okBytes} pct={okPct} tone="success" />
          </SummaryField>
          <SummaryField label="Failed">
            <SummaryStat count={failed.length} bytes={failedBytes} pct={failPct} tone="fail" />
          </SummaryField>
        </div>
      </div>

      <div
        className="mb-4 flex gap-6"
        style={{ borderBottom: `2px solid ${colors.border.rowSeparator}` }}
      >
        {hasFailure ? (
          <TabBtn active={tab === 'failed'} onClick={() => setTab('failed')}>
            Failed to delete
          </TabBtn>
        ) : (
          <TabBtn active={tab === 'files'} onClick={() => setTab('files')}>
            Files and folders
          </TabBtn>
        )}
        <TabBtn active={tab === 'configuration'} onClick={() => setTab('configuration')}>
          Configuration
        </TabBtn>
      </div>

      {tab === 'failed' && hasFailure && (
        <FailedTable
          rows={failedRows}
          failedCount={failed.length}
          failedBytes={failedBytes}
          filter={filter}
          setFilter={setFilter}
          sort={sort}
          toggleSort={toggleSort}
        />
      )}

      {tab === 'files' && !hasFailure && (
        <FilesTable
          rows={allRows}
          totalCount={ok.length}
          totalBytes={okBytes}
          filter={filter}
          setFilter={setFilter}
          sort={sort}
          toggleSort={toggleSort}
        />
      )}

      {tab === 'configuration' && (
        <div
          className="rounded-[12px] p-5 text-[13px]"
          style={{ backgroundColor: colors.bg.card, border: `1px solid ${colors.border.cardOutline}`, color: colors.text.info }}
        >
          Bypass governance retention: <span style={{ color: colors.text.selectedRow }}>No</span>
          {' · '}
          Quiet mode: <span style={{ color: colors.text.selectedRow }}>No</span>
        </div>
      )}
    </div>
  );
}

function buildRows(items, filter, sort) {
  const out = items
    .filter(r => !filter.trim() || r.key.toLowerCase().includes(filter.trim().toLowerCase()))
    .map(r => {
      const parts = r.key.split('/').filter(Boolean);
      const name = parts[parts.length - 1] || r.key;
      const folder = parts.slice(0, -1).join('/') || '—';
      return { ...r, _name: name, _folder: folder };
    });
  const { key, dir } = sort;
  const mult = dir === 'asc' ? 1 : -1;
  function valueFor(row) {
    if (key === 'name') return row._name;
    if (key === 'folder') return row._folder;
    if (key === 'type') return row.isFolder ? 'Folder' : (fileExt(row._name) || '');
    if (key === 'last_modified') return row.last_modified || null;
    if (key === 'size') return row.size == null ? null : Number(row.size);
    if (key === 'error') return row.error || '';
    if (key === 'status') return row.ok ? 1 : 0;
    return null;
  }
  out.sort((a, b) => {
    const av = valueFor(a);
    const bv = valueFor(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return -1 * mult;
    if (av > bv) return  1 * mult;
    return 0;
  });
  return out;
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

function FailedTable({ rows, failedCount, failedBytes, filter, setFilter, sort, toggleSort }) {
  return (
    <div
      className="rounded-[12px] p-5"
      style={{ backgroundColor: colors.bg.card, border: `1px solid ${colors.border.cardOutline}` }}
    >
      <h2 className="text-[18px] font-bold mb-3 inline-flex items-center gap-2" style={{ color: colors.text.primary }}>
        <span style={{ color: '#dbd8d3' }}><FailIcon size={16} strokeWidth={2.6} /></span>
        <span>
          Failed to delete{' '}
          <span className="font-normal" style={{ color: colors.text.info }}>
            ({failedCount} object{failedCount === 1 ? '' : 's'}, {bytesToHuman(failedBytes)})
          </span>
        </span>
      </h2>

      <div className="mb-3 max-w-[640px]">
        <AwsSearchInput value={filter} onChange={setFilter} placeholder="Find objects by name" />
      </div>

      <div className="rounded-[4px] overflow-x-auto min-w-0">
        <table
          className="w-full text-[14px] text-left"
          style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}
        >
          <colgroup>
            <col style={{ width: '25%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead>
            <tr>
              <SortHeader label="Name" col="name" sort={sort} onToggle={toggleSort} showDivider />
              <SortHeader label="Folder" col="folder" sort={sort} onToggle={toggleSort} showDivider />
              <SortHeader label="Type" col="type" sort={sort} onToggle={toggleSort} showDivider />
              <SortHeader label="Last modified" col="last_modified" sort={sort} onToggle={toggleSort} showDivider />
              <SortHeader label="Size" col="size" sort={sort} onToggle={toggleSort} showDivider />
              <SortHeader label="Error" col="error" sort={sort} onToggle={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '24px 12px', textAlign: 'center', color: colors.text.info }}>
                  No failed objects match your search.
                </td>
              </tr>
            )}
            {rows.map(r => (
              <tr key={r.key}>
                <Td>
                  <span className="break-all">
                    <span className="inline-block align-text-bottom mr-2">
                      {r.isFolder ? <FolderIcon /> : <FileIcon />}
                    </span>
                    <span
                      className="underline decoration-1 underline-offset-4"
                      style={{ color: colors.text.buttonActive }}
                    >
                      {r.isFolder ? `${r._name}/` : r._name}
                    </span>
                  </span>
                </Td>
                <Td muted>{r._folder}</Td>
                <Td>{r.isFolder ? 'Folder' : (fileExt(r._name) || '—')}</Td>
                <Td>{r.last_modified ? formatAwsDate(r.last_modified) : '—'}</Td>
                <Td>{r.size != null ? bytesToHuman(r.size) : '—'}</Td>
                <Td>
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
                    {r.error || 'Access denied'}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilesTable({ rows, totalCount, totalBytes, filter, setFilter, sort, toggleSort }) {
  return (
    <div
      className="rounded-[12px] p-5"
      style={{ backgroundColor: colors.bg.card, border: `1px solid ${colors.border.cardOutline}` }}
    >
      <h2 className="text-[18px] font-bold mb-3" style={{ color: colors.text.primary }}>
        Files and folders{' '}
        <span className="font-normal" style={{ color: colors.text.info }}>
          ({totalCount} total, {bytesToHuman(totalBytes || 0)})
        </span>
      </h2>

      <div className="mb-3 max-w-[640px]">
        <AwsSearchInput value={filter} onChange={setFilter} placeholder="Find by name" />
      </div>

      <div className="rounded-[4px] overflow-x-auto min-w-0">
        <table
          className="w-full text-[14px] text-left"
          style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}
        >
          <colgroup>
            <col style={{ width: '32%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '18%' }} />
          </colgroup>
          <thead>
            <tr>
              <SortHeader label="Name" col="name" sort={sort} onToggle={toggleSort} showDivider />
              <SortHeader label="Folder" col="folder" sort={sort} onToggle={toggleSort} showDivider />
              <SortHeader label="Type" col="type" sort={sort} onToggle={toggleSort} showDivider />
              <SortHeader label="Size" col="size" sort={sort} onToggle={toggleSort} showDivider />
              <SortHeader label="Status" col="status" sort={sort} onToggle={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '24px 12px', textAlign: 'center', color: colors.text.info }}>
                  No items match your search.
                </td>
              </tr>
            )}
            {rows.map((r, idx) => {
              const isLast = idx === rows.length - 1;
              return (
              <tr key={r.key}>
                <Td dense noBorder={isLast}>
                  <span className="break-all">
                    <span className="inline-block align-text-bottom mr-2">
                      {r.isFolder ? <FolderIcon /> : <FileIcon />}
                    </span>
                    <span
                      className="underline decoration-1 underline-offset-4"
                      style={{ color: colors.text.buttonActive }}
                    >
                      {r.isFolder ? `${r._name}/` : r._name}
                    </span>
                  </span>
                </Td>
                <Td dense muted noBorder={isLast}>—</Td>
                <Td dense noBorder={isLast}>{r.isFolder ? 'Folder' : (fileExt(r._name) || '—')}</Td>
                <Td dense noBorder={isLast}>{r.size != null ? bytesToHuman(r.size) : '—'}</Td>
                <Td dense noBorder={isLast}>
                  <span className="inline-flex items-center gap-1.5" style={{ color: SUCCESS_GREEN }}>
                    <CheckCircleIcon
                      size={16}
                      strokeWidth={1.4}
                      style={{ display: 'inline-block', verticalAlign: 'middle' }}
                    />
                    Succeeded
                  </span>
                </Td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
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

function SortHeader({ label, col, sort, onToggle, showDivider = false }) {
  const active = sort.key === col;
  return (
    <th
      style={{
        padding: '4px 12px',
        textAlign: 'left',
        fontWeight: 700,
        color: colors.text.info,
        borderBottom: `1px solid ${colors.border.rowSeparator}`,
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(col)}
        className="flex items-center justify-between w-full"
        style={{ color: colors.text.info }}
      >
        <span>{label}</span>
        <SortTriangleV2 active={active} direction={active ? sort.dir : null} />
      </button>
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

function Td({ children, muted = false, dense = false, noBorder = false }) {
  return (
    <td
      style={{
        padding: dense ? '3px 12px' : '8px 12px',
        verticalAlign: 'middle',
        color: muted ? colors.text.info : colors.text.selectedRow,
        borderBottom: noBorder ? 'none' : `1px solid ${colors.border.rowSeparator}`,
      }}
    >
      {children}
    </td>
  );
}

function TabBtn({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative py-2 text-[14px] font-bold"
      style={{ color: active ? colors.text.buttonActive : colors.text.selectedRow }}
    >
      {children}
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 right-0 -bottom-[2px]"
          style={{ height: 3, backgroundColor: colors.text.buttonActive }}
        />
      )}
    </button>
  );
}

function FailIcon({ size = 14, strokeWidth = 1.6, style }) {
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

function FileIcon() {
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

function FolderIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0 mt-0.5"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{ color: colors.text.buttonActive }}
      aria-hidden="true"
    >
      <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25V4.75A1.75 1.75 0 0 0 14.25 3H7.5l-.99-1.485A1 1 0 0 0 5.677 1H1.75Z" />
    </svg>
  );
}
