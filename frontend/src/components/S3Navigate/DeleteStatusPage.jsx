import { useState } from 'react';

import AwsAlert2 from './AwsAlert2';
import { AwsButton, AwsSearchInput } from './AwsControls';

const FAIL_RED = '#ff3233';
import { bytesToHuman, formatAwsDate, fileExt } from './format';
import { colors } from './theme';

export default function DeleteStatusPage({ source, results, onClose }) {
  const [tab, setTab] = useState('failed');
  const [filter, setFilter] = useState('');
  const ok = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);
  const failedBytes = failed.reduce((s, r) => s + (Number(r.size) || 0), 0);
  const hasFailure = failed.length > 0;

  const filteredFailed = failed.filter(r => !filter.trim()
    || r.key.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <div>
      <div className="mb-4">
        {hasFailure ? (
          <AwsAlert2 variant="error" title="Failed to delete objects">
            For more information, see the <strong>Error</strong> column in the{' '}
            <strong>Failed to delete</strong> table below.
          </AwsAlert2>
        ) : (
          <AwsAlert2
            variant="info"
            title={`Successfully deleted ${ok.length} object${ok.length === 1 ? '' : 's'}`}
          >
            Source: <strong>{source}</strong>
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
          <SummaryField label="Successfully deleted" divider>
            <span style={{ color: colors.text.selectedRow }}>
              {ok.length} object{ok.length === 1 ? '' : 's'}
            </span>
          </SummaryField>
          <SummaryField label="Failed to delete">
            {failed.length === 0 ? (
              <span style={{ color: colors.text.selectedRow }}>0 objects</span>
            ) : (
              <span className="inline-flex items-center gap-1.5" style={{ color: FAIL_RED }}>
                <FailIcon />
                {failed.length} object{failed.length === 1 ? '' : 's'}, {bytesToHuman(failedBytes)}
              </span>
            )}
          </SummaryField>
        </div>
      </div>

      <div
        className="mb-4 flex gap-6"
        style={{ borderBottom: `2px solid ${colors.border.rowSeparator}` }}
      >
        <TabBtn active={tab === 'failed'} onClick={() => setTab('failed')}>
          Failed to delete
        </TabBtn>
        <TabBtn active={tab === 'configuration'} onClick={() => setTab('configuration')}>
          Configuration
        </TabBtn>
      </div>

      {tab === 'failed' && (
        <div
          className="rounded-[12px] p-5"
          style={{ backgroundColor: colors.bg.card, border: `1px solid ${colors.border.cardOutline}` }}
        >
          <h2 className="text-[18px] font-bold mb-3 inline-flex items-center gap-2" style={{ color: colors.text.primary }}>
            <span style={{ color: FAIL_RED }}><FailIcon /></span>
            <span>
              Failed to delete{' '}
              <span className="font-normal" style={{ color: colors.text.info }}>
                ({failed.length} object{failed.length === 1 ? '' : 's'}, {bytesToHuman(failedBytes)})
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
                <col />
                <col style={{ width: 200 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 220 }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 160 }} />
              </colgroup>
              <thead>
                <tr>
                  <HeaderCell>Name</HeaderCell>
                  <HeaderCell>Folder</HeaderCell>
                  <HeaderCell>Type</HeaderCell>
                  <HeaderCell>Last modified</HeaderCell>
                  <HeaderCell>Size</HeaderCell>
                  <HeaderCell>Error</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {filteredFailed.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px 12px', textAlign: 'center', color: colors.text.info }}>
                      No failed objects match your search.
                    </td>
                  </tr>
                )}
                {filteredFailed.map(r => {
                  const parts = r.key.split('/').filter(Boolean);
                  const name = parts[parts.length - 1] || r.key;
                  const folder = parts.slice(0, -1).join('/') || '—';
                  return (
                    <tr key={r.key}>
                      <Td>
                        <span className="break-all underline decoration-1 underline-offset-4" style={{ color: colors.text.buttonActive }}>
                          {r.isFolder ? `${name}/` : name}
                        </span>
                      </Td>
                      <Td muted>{folder}</Td>
                      <Td>{r.isFolder ? 'Folder' : (fileExt(name) || '—')}</Td>
                      <Td>{r.last_modified ? formatAwsDate(r.last_modified) : '—'}</Td>
                      <Td>{r.size != null ? bytesToHuman(r.size) : '—'}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5" style={{ color: FAIL_RED }}>
                          <FailIcon />
                          {r.error || 'Access denied'}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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

function HeaderCell({ children }) {
  return (
    <th
      style={{
        padding: '4px 12px',
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

function Td({ children, muted = false }) {
  return (
    <td
      style={{
        padding: '8px 12px',
        verticalAlign: 'middle',
        color: muted ? colors.text.info : colors.text.selectedRow,
        borderBottom: `1px solid ${colors.border.rowSeparator}`,
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

function FailIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" />
      <path d="m5.5 5.5 5 5M10.5 5.5l-5 5" />
    </svg>
  );
}
