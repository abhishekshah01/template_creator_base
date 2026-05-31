import { useState } from 'react';
import { s3api } from './api';
import { PrimaryBtn, InfoIcon } from './BucketList';
import AwsAlert from './AwsAlert';

// AWS-console-style Create folder page. S3 doesn't have real folders —
// we create a zero-byte object whose key ends in "/" so the listing
// shows it as a folder. The slash is auto-appended; user can't type one.
//
// onDone(folderName) is called after a successful create.
export default function CreateFolderPage({ bucket, prefix, onCancel, onDone }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState(null);
  const [creating, setCreating] = useState(false);

  function validate(value) {
    if (!value) return "Folder name can't be empty.";
    if (value.includes('/')) return 'Folder names can\'t contain "/".';
    if (value.length > 200) return 'Folder name is too long.';
    return null;
  }

  async function handleCreate(e) {
    e?.preventDefault?.();
    const trimmed = name.trim();
    const v = validate(trimmed);
    if (v) { setErr(v); return; }
    setCreating(true);
    setErr(null);
    const key = (prefix || '') + trimmed + '/';
    try {
      const { url } = await s3api.uploadUrl(bucket, key, 'application/x-directory');
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/x-directory' },
        body: new Blob([], { type: 'application/x-directory' }),
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      });
      onDone?.(trimmed);
    } catch (e) {
      setErr(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-[920px]">
      <h1 style={{ fontSize: 28, lineHeight: '36px' }} className="font-bold text-[#e6edf3] mb-1">
        Create folder <InfoIcon />
      </h1>
      <p className="text-[13px] text-[#8b949e] mb-5">
        Use folders to group objects in buckets. When you create a folder, S3 creates an object
        using the name that you specify followed by a slash (/). This object then appears as a
        folder in the console.
      </p>

      <div className="mb-4">
        <AwsAlert variant="info" tone="outlined">
          Folders are a UX convenience over S3 prefixes — they don't enforce
          permissions and aren't billed separately.
        </AwsAlert>
      </div>

      {err && (
        <div className="mb-4">
          <AwsAlert variant="error" tone="outlined" onDismiss={() => setErr(null)}>
            {err}
          </AwsAlert>
        </div>
      )}

      <form onSubmit={handleCreate} className="border border-[#30363d] rounded-md bg-[#0d1117] p-5 mb-6">
        <h2 className="text-[16px] font-bold text-[#e6edf3] mb-4">Folder</h2>
        <label className="block text-[13px] font-semibold text-[#e6edf3] mb-1">Folder name</label>
        <div className="flex items-center gap-2 max-w-[640px]">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter folder name"
            disabled={creating}
            className="flex-1 px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-[2px] text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb] focus:shadow-[0_0_0_3px_rgba(31,111,235,0.25)] placeholder:text-[#484f58]"
            autoFocus
          />
          <span className="text-[14px] text-[#8b949e]">/</span>
        </div>
        <p className="mt-2 text-[12px] text-[#8b949e]">
          Folder names can't contain "/" and are limited to 200 characters.
        </p>
      </form>

      <div className="flex items-center justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-1.5 text-[14px] text-[#58a6ff] hover:underline">
          Cancel
        </button>
        <PrimaryBtn onClick={handleCreate} disabled={creating || !name.trim()}>
          {creating ? 'Creating…' : 'Create folder'}
        </PrimaryBtn>
      </div>
    </div>
  );
}
