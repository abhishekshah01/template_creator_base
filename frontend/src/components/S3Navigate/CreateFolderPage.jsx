import { useState } from 'react';

import AwsAlert2 from './AwsAlert2';
import { AwsButton, OpenExternalIconV2 } from './AwsControls';
import PermissionDeniedBanner from './PermissionDeniedBanner';
import { s3api } from './api';
import { PermissionDeniedError } from '../../api';
import { colors } from './theme';

export default function CreateFolderPage({ bucket, prefix, onCancel, onDone }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState(null);
  const [denied, setDenied] = useState(null);
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
    setDenied(null);
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
      if (e instanceof PermissionDeniedError) setDenied(e);
      else setErr(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-[1100px]">
      <h1 className="text-[28px] font-bold mb-1 inline-flex items-baseline gap-2" style={{ color: colors.text.primary }}>
        Create folder
        <span className="text-[14px] font-normal underline decoration-dotted underline-offset-2 cursor-help" style={{ color: colors.text.buttonActive }}>
          Info
        </span>
      </h1>
      <p className="text-[14px] mb-5 max-w-[1000px]" style={{ color: colors.text.info }}>
        Use folders to group objects in buckets. When you create a folder, S3 creates an object using the name that you specify followed by a slash (/). This object then appears as a folder in the console.
      </p>

      <div className="mb-4">
        <AwsAlert2 variant="info" title="Folders are a UX convenience over S3 prefixes">
          They don't enforce permissions and aren't billed separately — the slash in the key is what makes the object appear as a folder when you list the bucket.
        </AwsAlert2>
      </div>

      {denied && (
        <div className="mb-4">
          <PermissionDeniedBanner error={denied} />
        </div>
      )}

      {err && (
        <div className="mb-4">
          <AwsAlert2 variant="error" title="Could not create the folder" onDismiss={() => setErr(null)}>
            {err}
          </AwsAlert2>
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="rounded-[12px] p-5 mb-6"
        style={{ backgroundColor: colors.bg.card, border: `1px solid ${colors.border.cardOutline}` }}
      >
        <h2 className="text-[18px] font-bold mb-4" style={{ color: colors.text.primary }}>Folder</h2>
        <label className="block text-[14px] font-bold mb-1" style={{ color: colors.text.primary }}>
          Folder name
        </label>
        <div className="flex items-center gap-3 max-w-[860px]">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter folder name"
            disabled={creating}
            autoFocus
            className="flex-1 h-[34px] px-3 text-[14px] outline-none focus:shadow-[0_0_0_2px_rgba(31,111,235,0.3)] placeholder:italic"
            style={{
              backgroundColor: '#0d1117',
              border: `1px solid ${colors.border.inputDefault}`,
              borderRadius: 8,
              color: colors.text.primary,
            }}
          />
          <span className="text-[18px]" style={{ color: colors.text.selectedRow }}>/</span>
        </div>
        <p className="mt-2 text-[14px]" style={{ color: colors.text.info }}>
          Folder names can't contain "/".{' '}
          <a
            href="https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline underline-offset-2"
            style={{ color: colors.text.buttonActive }}
          >
            See rules for naming
            <OpenExternalIconV2 />
          </a>
        </p>
      </form>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={creating}
          className="px-4 py-1.5 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: colors.text.buttonActive }}
        >
          Cancel
        </button>
        <AwsButton
          variant="primary"
          onClick={handleCreate}
          disabled={creating || !name.trim()}
        >
          {creating ? 'Creating…' : 'Create folder'}
        </AwsButton>
      </div>
    </div>
  );
}
