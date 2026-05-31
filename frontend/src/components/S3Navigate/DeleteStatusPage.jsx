import { useState } from 'react';
import { bytesToHuman, formatAwsDate, fileExt } from './format';
import AwsAlert from './AwsAlert';

// AWS-console-style "Delete objects: status" summary. Shown after a delete
// run finishes. {source, results} is the same shape DeletePage emits.
export default function DeleteStatusPage({ source, results, onClose }) {
  const [tab, setTab] = useState('failed'); // 'failed' | 'configuration'
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const failedBytes = failed.reduce((sum, r) => sum + (Number(r.size) || 0), 0);
  const hasFailure = failed.length > 0;

  return (
    <div>
      {hasFailure ? (
        <div className="mb-4">
          <AwsAlert variant="error" tone="solid" title="Failed to delete objects">
            For more information, see the Error column in the Failed to delete table below.
          </AwsAlert>
        </div>
      ) : (
        <div className="mb-4">
          <AwsAlert variant="success" tone="solid" title={`Successfully deleted ${ok.length} object${ok.length === 1 ? '' : 's'}`}>
            Source: <span className="font-mono">{source}</span>
          </AwsAlert>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[28px] font-bold text-[#e6edf3]">Delete objects: status</h1>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-[4px] bg-[#ff9900] hover:bg-[#ec7211] text-[#16191f] text-[14px] font-bold transition-colors"
        >
          Close
        </button>
      </div>

      <div className="mb-4">
        <AwsAlert variant="info" tone="outlined">
          After you navigate away from this page, the following information is no longer available.
        </AwsAlert>
      </div>

      {/* Summary card */}
      <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-5 mb-6">
        <h2 className="text-[16px] font-bold text-[#e6edf3] mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-12 text-[14px]">
          <div>
            <div className="font-bold text-[#e6edf3]">Source</div>
            <div className="text-[#58a6ff] font-mono break-all">{source}</div>
          </div>
          <div>
            <div className="font-bold text-[#e6edf3]">Successfully deleted</div>
            <div className="text-[#c9d1d9]">{ok.length} object{ok.length === 1 ? '' : 's'}</div>
          </div>
          <div>
            <div className="font-bold text-[#e6edf3]">Failed to delete</div>
            <div className={failed.length ? 'text-[#f85149]' : 'text-[#c9d1d9]'}>
              {failed.length === 0
                ? '0 objects'
                : <span className="inline-flex items-center gap-1">✘ {failed.length} object{failed.length === 1 ? '' : 's'}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#30363d] mb-4 flex gap-6">
        <TabBtn active={tab === 'failed'} onClick={() => setTab('failed')}>Failed to delete</TabBtn>
        <TabBtn active={tab === 'configuration'} onClick={() => setTab('configuration')}>Configuration</TabBtn>
      </div>

      {tab === 'failed' && (
        <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-5">
          <h2 className="text-[16px] font-bold text-[#e6edf3] mb-3">
            <span className="text-[#f85149]">✘</span> Failed to delete{' '}
            <span className="text-[#8b949e] font-normal">
              ({failed.length} object{failed.length === 1 ? '' : 's'}, {bytesToHuman(failedBytes)})
            </span>
          </h2>
          <div className="border border-[#30363d] rounded-[4px] overflow-hidden">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="bg-[#0d1117] border-b border-[#30363d] text-[#e6edf3]">
                  <th className="text-left px-3 py-2 font-semibold">Name</th>
                  <th className="text-left px-3 py-2 font-semibold">Folder</th>
                  <th className="text-left px-3 py-2 font-semibold">Type</th>
                  <th className="text-left px-3 py-2 font-semibold">Last modified</th>
                  <th className="text-left px-3 py-2 font-semibold">Size</th>
                  <th className="text-left px-3 py-2 font-semibold">Error</th>
                </tr>
              </thead>
              <tbody>
                {failed.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-[13px] text-[#8b949e]">All objects deleted successfully.</td></tr>
                )}
                {failed.map((r) => {
                  const parts = r.key.split('/');
                  const name = parts[parts.length - 1] || r.key;
                  const folder = parts.slice(0, -1).join('/') || '-';
                  return (
                    <tr key={r.key} className="border-b border-[#21262d]">
                      <td className="px-3 py-2.5 text-[#c9d1d9] break-all">{name || r.key}</td>
                      <td className="px-3 py-2.5 text-[#8b949e]">{folder}</td>
                      <td className="px-3 py-2.5 text-[#c9d1d9]">{r.isFolder ? 'Folder' : (fileExt(name) || '-')}</td>
                      <td className="px-3 py-2.5 text-[#c9d1d9]">{r.last_modified ? formatAwsDate(r.last_modified) : '-'}</td>
                      <td className="px-3 py-2.5 text-[#c9d1d9]">{r.size != null ? bytesToHuman(r.size) : '-'}</td>
                      <td className="px-3 py-2.5 text-[#f85149]">✘ {r.error || 'Access denied'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'configuration' && (
        <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-5 text-[13px] text-[#8b949e]">
          Bypass governance retention: <span className="text-[#c9d1d9]">No</span> · Quiet mode: <span className="text-[#c9d1d9]">No</span>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative py-2 text-[15px] font-semibold ${active ? 'text-[#58a6ff]' : 'text-[#c9d1d9] hover:text-[#e6edf3]'}`}
    >
      {children}
      {active && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#58a6ff]" />}
    </button>
  );
}
