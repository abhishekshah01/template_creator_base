import { useEffect, useMemo, useState } from 'react';

import AwsAlert2 from './AwsAlert2';
import { AwsButton, AwsRadio, AwsSearchInput, CopyIcon as AwsCopyIcon, RefreshIcon, SortTriangleV2 } from './AwsControls';
import PermissionDeniedBanner from './PermissionDeniedBanner';
import { s3api } from './api';
import { PermissionDeniedError } from '../../api';
import { formatAwsDate } from './format';
import { colors } from './theme';

const PAGE_SIZE = 10;
const COLUMNS = [
  { key: 'name',          label: 'Name',          width: null },          // leftover
  { key: 'region',        label: 'AWS Region',    width: 260 },
  { key: 'creation_date', label: 'Creation date', width: 260 },
];

export default function BucketList({ onOpenBucket }) {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [denied, setDenied] = useState(null);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });

  async function load({ force = false } = {}) {
    setLoading(true);
    setErr(null);
    setDenied(null);
    try {
      const data = await s3api.listBuckets(force);
      setBuckets(data.buckets || []);
    } catch (e) {
      if (e instanceof PermissionDeniedError) {
        setDenied(e);
        setBuckets([]);
      } else {
        setErr(e.message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows = q ? buckets.filter(b => b.name.toLowerCase().includes(q)) : buckets;
    const { key, dir } = sort;
    const mult = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * mult;
      if (av > bv) return  1 * mult;
      return 0;
    });
  }, [buckets, filter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > pageCount) setPage(1); }, [pageCount, page]);

  const selectedBucket = pageItems.find(b => b.name === selected) || filtered.find(b => b.name === selected) || null;
  const hasSelection = !!selectedBucket;

  function toggleSort(key) {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }

  function copyArn() {
    if (!selectedBucket) return;
    navigator.clipboard.writeText(`arn:aws:s3:::${selectedBucket.name}`);
  }

  return (
    <div>
      <h1 className="text-[24px] font-bold mb-3" style={{ color: colors.text.primary }}>Buckets</h1>

      <div className="mb-6 flex gap-6" style={{ borderBottom: `2px solid ${colors.border.rowSeparator}` }}>
        <SectionTab active>
          General purpose buckets <RegionPill>All AWS Regions</RegionPill>
        </SectionTab>
        <SectionTab>Directory buckets</SectionTab>
      </div>

      {err && (
        <div className="mb-4">
          <AwsAlert2
            variant="error"
            title="Couldn't load buckets"
            onDismiss={() => setErr(null)}
          >
            {err}
          </AwsAlert2>
        </div>
      )}

      <div
        className="rounded-[12px] p-5"
        style={{
          backgroundColor: colors.bg.card,
          border: `1px solid ${colors.border.cardOutline}`,
        }}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="text-[18px] font-bold inline-flex items-center gap-2" style={{ color: colors.text.primary }}>
            <span>
              General purpose buckets <span style={{ color: colors.text.info }} className="font-normal">
                {hasSelection ? `(1/${buckets.length})` : `(${buckets.length})`}
              </span>
            </span>
            <span className="text-[14px] font-normal underline decoration-dotted underline-offset-2 cursor-help" style={{ color: colors.text.buttonActive }}>Info</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <AwsButton variant="icon" title="Refresh" onClick={() => load({ force: true })} icon={<RefreshIcon />} />
          <AwsButton disabled={!hasSelection} onClick={copyArn} icon={<AwsCopyIcon />}>Copy ARN</AwsButton>
          <AwsButton disabled>Empty</AwsButton>
          <AwsButton disabled>Delete</AwsButton>
          <div className="ml-auto">
            <AwsButton variant="primary" disabled>Create bucket</AwsButton>
          </div>
        </div>

        <p className="text-[13px] mb-4" style={{ color: colors.text.info }}>
          Buckets are containers for data stored in S3.
        </p>

        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex-1 max-w-[640px] min-w-[280px]">
            <AwsSearchInput
              value={filter}
              onChange={(v) => { setFilter(v); setPage(1); }}
              placeholder="Find buckets by name"
            />
          </div>
          <BucketPager page={page} pageCount={pageCount} onChange={setPage} />
        </div>

        <div className="rounded-[4px] overflow-x-auto min-w-0">
          <table
            className="w-full text-[14px] text-left"
            style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}
          >
            <colgroup>
              <col style={{ width: 44 }} />
              {COLUMNS.map((c) => (
                <col key={c.key} style={c.width ? { width: c.width } : undefined} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <HeaderCell aria-hidden="true" showDivider />
                {COLUMNS.map((col, idx) => {
                  const isSorted = sort.key === col.key;
                  const isLast = idx === COLUMNS.length - 1;
                  return (
                    <HeaderCell key={col.key} showDivider={!isLast}>
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="flex items-center justify-between w-full pr-2"
                        style={{ color: colors.text.info }}
                      >
                        <span>{col.label}</span>
                        <SortTriangleV2
                          active={isSorted}
                          direction={isSorted ? sort.dir : null}
                        />
                      </button>
                    </HeaderCell>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <BodyMessage>Loading buckets…</BodyMessage>
              )}
              {!loading && denied && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} style={{ padding: '12px 0' }}>
                    <PermissionDeniedBanner
                      error={denied}
                      onRefresh={() => load({ force: true })}
                    />
                  </td>
                </tr>
              )}
              {!loading && !denied && !err && pageItems.length === 0 && (
                <BodyMessage>No buckets match your search.</BodyMessage>
              )}
              {!loading && !denied && pageItems.map(b => (
                <BucketRow
                  key={b.name}
                  bucket={b}
                  selected={selected === b.name}
                  onSelect={() => setSelected(selected === b.name ? null : b.name)}
                  onOpen={() => onOpenBucket(b)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BucketRow({ bucket, selected, onSelect, onOpen }) {
  const ringColor = selected ? colors.border.rowSelected : 'transparent';
  const separator = `1px solid ${colors.border.rowSeparator}`;
  const cellBase = {
    padding: '8px 12px',
    backgroundColor: selected ? colors.bg.rowSelected : 'transparent',
    color: colors.text.selectedRow,
    verticalAlign: 'middle',
  };
  const top = `2px solid ${ringColor}`;
  const bottom = selected
    ? `2px solid ${ringColor}`
    : separator;

  return (
    <tr>
      <td
        style={{
          ...cellBase,
          borderTop: top,
          borderBottom: bottom,
          borderLeft: `2px solid ${ringColor}`,
          borderTopLeftRadius: selected ? 8 : 0,
          borderBottomLeftRadius: selected ? 8 : 0,
        }}
      >
        <AwsRadio
          checked={selected}
          onChange={onSelect}
          ariaLabel={`Select bucket ${bucket.name}`}
        />
      </td>
      <td style={{ ...cellBase, borderTop: top, borderBottom: bottom }}>
        <button
          type="button"
          onClick={onOpen}
          className="text-left underline decoration-1 underline-offset-2 break-words"
          style={{ color: colors.text.buttonActive }}
        >
          {bucket.name}
        </button>
      </td>
      <td style={{ ...cellBase, borderTop: top, borderBottom: bottom }}>
        {regionLabel(bucket.region)}
      </td>
      <td
        style={{
          ...cellBase,
          borderTop: top,
          borderBottom: bottom,
          borderRight: `2px solid ${ringColor}`,
          borderTopRightRadius: selected ? 8 : 0,
          borderBottomRightRadius: selected ? 8 : 0,
        }}
      >
        {formatAwsDate(bucket.creation_date)}
      </td>
    </tr>
  );
}

function BodyMessage({ children, error = false }) {
  return (
    <tr>
      <td
        colSpan={4}
        style={{
          padding: '24px 12px',
          textAlign: 'center',
          color: error ? '#e35b66' : colors.text.info,
          fontSize: 13,
        }}
      >
        {children}
      </td>
    </tr>
  );
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
      {children}
      {showDivider && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 0,
            top: 6,
            bottom: 6,
            width: 1,
            backgroundColor: colors.border.rowSeparator,
          }}
        />
      )}
    </th>
  );
}

function SectionTab({ active, children }) {
  return (
    <button
      className="relative py-2 text-[15px] font-semibold"
      style={{ color: active ? colors.text.buttonActive : colors.text.info }}
    >
      {children}
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 right-0"
          style={{
            height: 3,
            bottom: 0,
            backgroundColor: colors.text.buttonActive,
            zIndex: 2,
          }}
        />
      )}
    </button>
  );
}

function RegionPill({ children }) {
  return (
    <span
      className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] align-middle font-normal"
      style={{
        backgroundColor: '#21262d',
        color: colors.text.selectedRow,
      }}
    >
      {children}
    </span>
  );
}

function regionLabel(code) {
  const map = {
    'us-east-1': 'US East (N. Virginia) us-east-1',
    'us-east-2': 'US East (Ohio) us-east-2',
    'us-west-1': 'US West (N. California) us-west-1',
    'us-west-2': 'US West (Oregon) us-west-2',
    'eu-west-1': 'Europe (Ireland) eu-west-1',
    'eu-west-2': 'Europe (London) eu-west-2',
    'eu-central-1': 'Europe (Frankfurt) eu-central-1',
    'ap-south-1': 'Asia Pacific (Mumbai) ap-south-1',
    'ap-southeast-1': 'Asia Pacific (Singapore) ap-southeast-1',
    'ap-northeast-1': 'Asia Pacific (Tokyo) ap-northeast-1',
  };
  return map[code] || code;
}

function BucketPager({ page, pageCount, onChange }) {
  // Windowed view: keep the current page in the middle when there are many.
  // For <= 7 pages, render them all. Beyond that, show 7 around current.
  const windowSize = 7;
  let start = 1;
  let end = pageCount;
  if (pageCount > windowSize) {
    const half = Math.floor(windowSize / 2);
    start = Math.max(1, page - half);
    end = Math.min(pageCount, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
  }
  const pages = [];
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <div className="inline-flex items-center gap-2 text-[14px]" style={{ color: colors.text.selectedRow }}>
      <PagerBtn disabled={page <= 1} onClick={() => onChange(Math.max(1, page - 1))}>
        <PagerChevron direction="left" />
      </PagerBtn>
      {pages.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className="min-w-[24px] px-1 text-[16px]"
          style={{
            color: page === n ? colors.text.primary : colors.text.buttonActive,
            fontWeight: page === n ? 700 : 600,
            cursor: 'pointer',
          }}
        >
          {n}
        </button>
      ))}
      <PagerBtn disabled={page >= pageCount} onClick={() => onChange(Math.min(pageCount, page + 1))}>
        <PagerChevron direction="right" />
      </PagerBtn>
    </div>
  );
}

function PagerBtn({ disabled, onClick, children }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="px-2 py-1"
      style={{
        color: colors.text.info,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function PagerChevron({ direction }) {
  const d = direction === 'left' ? 'M10 4l-4 4 4 4' : 'M6 4l4 4-4 4';
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

// Helpers reused by ObjectList / ObjectDetail / UploadPage / etc. Kept exported
// from this file for back-compat with their existing import paths.

export function Tab({ active, children }) {
  return (
    <button className={`relative py-2 text-[15px] font-semibold ${active ? 'text-[#58a6ff]' : 'text-[#c9d1d9] hover:text-[#e6edf3]'}`}>
      {children}
      {active && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#58a6ff]" />}
    </button>
  );
}

export function Pill({ children }) {
  return (
    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[11px] bg-[#161b22] border border-[#30363d] text-[#c9d1d9] align-middle">
      {children}
    </span>
  );
}

export function PrimaryBtn({ children, onClick, disabled, ...rest }) {
  return (
    <button onClick={onClick} disabled={disabled} {...rest}
      className="px-3 py-1.5 rounded-[4px] bg-[#ff9900] hover:bg-[#ec7211] text-[#16191f] text-[14px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
      {children}
    </button>
  );
}

export function SecondaryBtn({ children, icon, onClick, disabled, ...rest }) {
  return (
    <button onClick={onClick} disabled={disabled} {...rest}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border text-[14px] transition-colors ${
        disabled
          ? 'border-[#30363d] text-[#6e7681] cursor-not-allowed'
          : 'border-[#58a6ff] text-[#58a6ff] hover:bg-[#58a6ff]/10'
      }`}>
      {icon}
      {children}
    </button>
  );
}

export function RefreshButton({ onClick, loading }) {
  return (
    <button onClick={onClick} title="Refresh"
      className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-[#58a6ff] text-[#58a6ff] hover:bg-[#58a6ff]/10 transition-colors disabled:opacity-50"
      disabled={loading}>
      <svg className={`w-4 h-4 ${loading ? 'animate-spin-slow' : ''}`} viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
      </svg>
    </button>
  );
}

export function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
      <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" viewBox="0 0 16 16" fill="currentColor">
      <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <span className="ml-1.5 align-middle text-[#58a6ff] text-[13px] font-normal underline decoration-dotted underline-offset-2 cursor-help">Info</span>
  );
}

export function SortArrows() {
  return (
    <svg className="w-3 h-3 text-[#58a6ff]" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.427 9.573 7.396 12.5a.75.75 0 0 0 1.208 0L11.573 9.573a.75.75 0 0 0-1.061-1.06L8.75 10.273V4a.75.75 0 0 0-1.5 0v6.273L5.488 8.513a.75.75 0 0 0-1.061 1.06Z" transform="rotate(180 8 8)" />
    </svg>
  );
}

export function FilterTriangle() {
  return (
    <svg className="w-3 h-3 text-[#8b949e]" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 5h10l-5 6Z" />
    </svg>
  );
}

export function Pager({ page, pageCount, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 text-[14px] text-[#c9d1d9]">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1}
        className="px-2 py-1 rounded text-[#58a6ff] hover:bg-[#161b22] disabled:opacity-40">
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.275.326.749.749 0 0 1-.215.734L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z" />
        </svg>
      </button>
      {Array.from({ length: pageCount }).slice(0, 5).map((_, i) => (
        <button key={i} onClick={() => onChange(i + 1)}
          className={`min-w-[24px] px-1.5 py-0.5 rounded text-[13px] ${page === i + 1 ? 'text-[#e6edf3] font-bold' : 'text-[#58a6ff] hover:underline'}`}>
          {i + 1}
        </button>
      ))}
      <button onClick={() => onChange(Math.min(pageCount, page + 1))} disabled={page >= pageCount}
        className="px-2 py-1 rounded text-[#58a6ff] hover:bg-[#161b22] disabled:opacity-40">
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
    </div>
  );
}
