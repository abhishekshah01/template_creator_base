import { useState } from 'react';

import AwsAlert2 from './AwsAlert2';
import { AwsButton, AwsSearchInput, SortTriangleV2 } from './AwsControls';
import PermissionDeniedBanner from './PermissionDeniedBanner';
import { s3api } from './api';
import { PermissionDeniedError } from '../../api';
import { bytesToHuman, formatAwsDate, fileExt } from './format';
import { colors } from './theme';

export default function DeletePage({ bucket, prefix, objects, onCancel, onDone }) {
  const [confirmText, setConfirmText] = useState('');
  const [filter, setFilter] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [denied, setDenied] = useState(null);
  const canDelete = confirmText === 'delete' && !deleting && objects.length > 0;

  const filtered = objects.filter(o => !filter.trim()
    || o.key.toLowerCase().includes(filter.trim().toLowerCase()));

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true);
    setDenied(null);
    const results = [];
    let permissionBlocked = false;
    for (const o of objects) {
      try {
        await s3api.deleteObject(bucket, o.key);
        results.push({ ...o, ok: true });
      } catch (e) {
        if (e instanceof PermissionDeniedError) {
          setDenied(e);
          permissionBlocked = true;
          break;
        }
        results.push({ ...o, ok: false, error: e.message || 'Access denied' });
      }
    }
    setDeleting(false);
    if (permissionBlocked) return;
    onDone?.({
      source: `s3://${bucket}/${prefix || ''}`,
      results,
    });
  }

  return (
    <div>
      <h1 className="text-[24px] font-bold mb-4 inline-flex items-center gap-2" style={{ color: colors.text.primary }}>
        Delete objects
        <span className="text-[14px] font-normal underline decoration-dotted underline-offset-2 cursor-help" style={{ color: colors.text.buttonActive }}>
          Info
        </span>
      </h1>

      {denied && (
        <div className="mb-4">
          <PermissionDeniedBanner error={denied} tone="solid" />
        </div>
      )}

      <div className="mb-6">
        <AwsAlert2
          variant="warning"
          title="Deleting these objects is permanent"
        >
          If a folder is selected for deletion, all objects in the folder will be deleted, and any new
          objects added while the delete action is in progress might also be deleted. If an object is
          selected for deletion, any new objects with the same name that are uploaded before the delete
          action is completed will also be deleted.
        </AwsAlert2>
      </div>

      <div
        className="rounded-[12px] p-5 mb-4"
        style={{
          backgroundColor: colors.bg.card,
          border: `1px solid ${colors.border.cardOutline}`,
        }}
      >
        <h2 className="text-[18px] font-bold mb-3" style={{ color: colors.text.primary }}>
          Specified objects <span className="font-normal" style={{ color: colors.text.info }}>({objects.length})</span>
        </h2>

        <div className="mb-3">
          <AwsSearchInput
            value={filter}
            onChange={setFilter}
            placeholder="Find objects by name"
          />
        </div>

        <div className="rounded-[4px] overflow-x-auto min-w-0">
          <table
            className="w-full text-[14px] text-left"
            style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}
          >
            <colgroup>
              <col />
              <col style={{ width: 150 }} />
              <col style={{ width: 240 }} />
              <col style={{ width: 130 }} />
            </colgroup>
            <thead>
              <tr>
                <HeaderCell showDivider>
                  <SortHeaderButton label="Name" direction="asc" active />
                </HeaderCell>
                <HeaderCell showDivider>
                  <SortHeaderButton label="Type" />
                </HeaderCell>
                <HeaderCell showDivider>
                  <SortHeaderButton label="Last modified" />
                </HeaderCell>
                <HeaderCell>
                  <SortHeaderButton label="Size" />
                </HeaderCell>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.key}>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <FileIcon />
                      <a className="underline decoration-1 underline-offset-2 break-all" style={{ color: colors.text.buttonActive }}>
                        {o.key}
                        {o.isFolder ? '' : ' ↗'}
                      </a>
                    </span>
                  </Td>
                  <Td>{o.isFolder ? 'Folder' : (fileExt(o.key) || '—')}</Td>
                  <Td>{o.last_modified ? formatAwsDate(o.last_modified) : '—'}</Td>
                  <Td>{o.size != null ? bytesToHuman(o.size) : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="rounded-[12px] p-5 mb-6"
        style={{
          backgroundColor: colors.bg.card,
          border: `1px solid ${colors.border.cardOutline}`,
        }}
      >
        <h2 className="text-[18px] font-bold mb-2" style={{ color: colors.text.primary }}>Delete objects?</h2>
        <p className="text-[14px] mb-3" style={{ color: colors.text.selectedRow }}>
          To confirm deletion, type <span className="italic font-semibold">delete</span> in the text input field.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="delete"
          disabled={deleting}
          autoFocus
          className="w-full max-w-[640px] h-[34px] px-3 text-[14px] outline-none focus:shadow-[0_0_0_2px_rgba(31,111,235,0.3)] placeholder:italic"
          style={{
            backgroundColor: '#0d1117',
            border: `1px solid ${colors.border.inputDefault}`,
            borderRadius: 8,
            color: colors.text.primary,
          }}
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="px-4 py-1.5 text-[14px] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: colors.text.buttonActive }}
        >
          Cancel
        </button>
        <AwsButton
          variant="primary"
          onClick={handleDelete}
          disabled={!canDelete}
        >
          {deleting ? 'Deleting…' : 'Delete objects'}
        </AwsButton>
      </div>
    </div>
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
      <span style={{ position: 'relative', display: 'block' }}>
        {children}
        {showDivider && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: -12,
              top: -2,
              bottom: -2,
              width: 1,
              backgroundColor: colors.border.rowSeparator,
            }}
          />
        )}
      </span>
    </th>
  );
}

function SortHeaderButton({ label, direction, active }) {
  return (
    <button
      type="button"
      className="flex items-center justify-between w-full pr-2"
      style={{ color: colors.text.info }}
    >
      <span>{label}</span>
      <SortTriangleV2 active={active} direction={active ? direction : null} />
    </button>
  );
}

function Td({ children }) {
  return (
    <td
      style={{
        padding: '8px 12px',
        verticalAlign: 'middle',
        color: colors.text.selectedRow,
        borderBottom: `1px solid ${colors.border.rowSeparator}`,
      }}
    >
      {children}
    </td>
  );
}

function FileIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" style={{ color: colors.text.selectedRow }}>
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
    </svg>
  );
}
