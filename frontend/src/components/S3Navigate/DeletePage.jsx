import { useState } from 'react';
import { s3api } from './api';
import { bytesToHuman, formatAwsDate, fileExt } from './format';
import { InfoIcon } from './BucketList';
import AwsAlert from './AwsAlert';

// AWS-console-style Delete objects page. Lists the objects the user
// selected, requires them to type "delete" to confirm, then runs each
// delete sequentially. onDone is invoked with {results, source} so the
// parent can show the post-delete summary view.
export default function DeletePage({ bucket, prefix, objects, onCancel, onDone }) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const canDelete = confirmText === 'delete' && !deleting && objects.length > 0;

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true);
    const results = [];
    for (const o of objects) {
      try {
        await s3api.deleteObject(bucket, o.key);
        results.push({ ...o, ok: true });
      } catch (e) {
        results.push({ ...o, ok: false, error: e.message || 'Access denied' });
      }
    }
    setDeleting(false);
    onDone?.({
      source: `s3://${bucket}/${prefix || ''}`,
      results,
    });
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, lineHeight: '36px' }} className="font-bold text-[#e6edf3] mb-4">
        Delete objects <InfoIcon />
      </h1>

      <div className="mb-4">
        <AwsAlert variant="warning" tone="outlined" title="Selected objects will be permanently deleted">
          If a folder is selected for deletion, every object under that prefix is
          deleted too. This action can't be undone.
        </AwsAlert>
      </div>

      {/* Specified objects */}
      <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-5 mb-4">
        <h2 className="text-[16px] font-bold text-[#e6edf3] mb-3">
          Specified objects <span className="text-[#8b949e] font-normal">({objects.length})</span>
        </h2>

        <div className="border border-[#30363d] rounded-[4px] overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-[#0d1117] border-b border-[#30363d] text-[#e6edf3]">
                <th className="text-left px-3 py-2 font-semibold">Name</th>
                <th className="text-left px-3 py-2 font-semibold">Type</th>
                <th className="text-left px-3 py-2 font-semibold">Last modified</th>
                <th className="text-left px-3 py-2 font-semibold">Size</th>
              </tr>
            </thead>
            <tbody>
              {objects.map((o) => (
                <tr key={o.key} className="border-b border-[#21262d]">
                  <td className="px-3 py-2.5 text-[#c9d1d9] break-all">{o.key}</td>
                  <td className="px-3 py-2.5 text-[#c9d1d9]">{o.isFolder ? 'Folder' : (fileExt(o.key) || '-')}</td>
                  <td className="px-3 py-2.5 text-[#c9d1d9]">{o.last_modified ? formatAwsDate(o.last_modified) : '-'}</td>
                  <td className="px-3 py-2.5 text-[#c9d1d9]">{o.size != null ? bytesToHuman(o.size) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation */}
      <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-5 mb-6">
        <h2 className="text-[16px] font-bold text-[#e6edf3] mb-2">Delete objects?</h2>
        <p className="text-[13px] text-[#c9d1d9] mb-3">
          To confirm deletion, type <span className="italic font-semibold">delete</span> in the text input field.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="delete"
          disabled={deleting}
          className="w-full max-w-[640px] px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-[2px] text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb] placeholder:text-[#484f58]"
          autoFocus
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-1.5 text-[14px] text-[#58a6ff] hover:underline">
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={!canDelete}
          className="px-4 py-1.5 rounded-[4px] bg-[#ff9900] hover:bg-[#ec7211] disabled:opacity-50 disabled:cursor-not-allowed text-[#16191f] text-[14px] font-bold transition-colors"
        >
          {deleting ? 'Deleting…' : 'Delete objects'}
        </button>
      </div>
    </div>
  );
}
