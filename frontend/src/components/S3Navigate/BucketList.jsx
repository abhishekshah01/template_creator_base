import { useEffect, useMemo, useState } from 'react';
import { s3api } from './api';
import { formatAwsDate } from './format';

const PAGE_SIZE = 10;

export default function BucketList({ onOpenBucket }) {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null); // bucket name

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await s3api.listBuckets();
      setBuckets(data.buckets || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return buckets;
    return buckets.filter(b => b.name.toLowerCase().includes(q));
  }, [buckets, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > pageCount) setPage(1); }, [pageCount, page]);

  return (
    <div>
      <h1 style={{ fontSize: 28, lineHeight: '36px' }} className="font-bold text-[#e6edf3] mb-1">Buckets</h1>

      <div className="border-b border-[#30363d] mb-6 flex gap-6">
        <Tab active>General purpose buckets <Pill>All AWS Regions</Pill></Tab>
      </div>

      <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-bold text-[#e6edf3]">
            General purpose buckets <span className="text-[#8b949e] font-normal">({buckets.length})</span>
            <InfoIcon />
          </h2>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <RefreshButton onClick={load} loading={loading} />
        </div>

        <p className="text-[13px] text-[#8b949e] mb-3">Buckets are containers for data stored in S3.</p>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 relative max-w-[640px]">
            <SearchIcon />
            <input
              value={filter}
              onChange={e => { setFilter(e.target.value); setPage(1); }}
              placeholder="Find buckets by name"
              data-testid="s3-bucket-search"
              className="w-full pl-9 pr-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-[4px] text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb]"
            />
          </div>
          <Pager page={page} pageCount={pageCount} onChange={setPage} />
        </div>

        {/* Table */}
        <div className="border border-[#30363d] rounded-[4px] overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-[#0d1117] border-b border-[#30363d] text-[#e6edf3]">
                <th className="w-10 px-3 py-2"></th>
                <th className="text-left px-3 py-2 font-semibold">
                  <span className="inline-flex items-center gap-1">Name <SortArrows /></span>
                </th>
                <th className="text-left px-3 py-2 font-semibold">
                  <span className="inline-flex items-center gap-1">AWS Region <FilterTriangle /></span>
                </th>
                <th className="text-left px-3 py-2 font-semibold">
                  <span className="inline-flex items-center gap-1">Creation date <FilterTriangle /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-[#8b949e] text-[13px]">Loading buckets…</td></tr>
              )}
              {err && !loading && (
                <tr><td colSpan={4} className="px-3 py-6 text-[13px] text-[#f85149]">{err}</td></tr>
              )}
              {!loading && !err && pageItems.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-[#8b949e] text-[13px]">No buckets match your search.</td></tr>
              )}
              {!loading && !err && pageItems.map(b => (
                <tr key={b.name}
                  className={`border-b border-[#21262d] hover:bg-[#161b22] transition-colors ${selected === b.name ? 'bg-[#1f6feb]/10' : ''}`}>
                  <td className="px-3 py-3">
                    <input type="radio" name="bucket" className="accent-[#1f6feb] w-4 h-4"
                      checked={selected === b.name} onChange={() => setSelected(b.name)} />
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => onOpenBucket(b)}
                      data-testid={`s3-bucket-${b.name}`}
                      className="text-[#58a6ff] hover:underline decoration-1 underline-offset-2 text-left">
                      {b.name}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-[#c9d1d9]">{regionLabel(b.region)}</td>
                  <td className="px-3 py-3 text-[#c9d1d9] whitespace-nowrap">{formatAwsDate(b.creation_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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

// ---------- Shared button / icon primitives (used by other views too) ----------

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
