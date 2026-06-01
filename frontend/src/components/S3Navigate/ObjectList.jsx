import { useEffect, useMemo, useState } from 'react';

import AwsAlert2 from './AwsAlert2';
import {
  AwsButton,
  AwsCheckbox,
  AwsSearchInput,
  CopyIcon as AwsCopyIcon,
  DownloadIcon,
  OpenExternalIcon,
  RefreshIcon,
  SortTriangleV2,
  UploadIcon,
} from './AwsControls';
import { s3api } from './api';
import { bytesToHuman, formatAwsDate, fileExt } from './format';
import { colors } from './theme';

const COLUMNS = [
  { key: 'name',          label: 'Name',          width: null },   // leftover
  { key: 'type',          label: 'Type',          width: 150 },
  { key: 'last_modified', label: 'Last modified', width: 200 },
  { key: 'size',          label: 'Size',          width: 150 },
  { key: 'storage_class', label: 'Storage class', width: 150 },
];

export default function ObjectList({
  bucket,
  prefix,
  refreshTick = 0,
  onOpenObject,
  onOpenPrefix,
  onCopyToast,
  onOpenUpload,
  onOpenCreateFolder,
  onOpenDelete,
}) {
  const [data, setData] = useState({ folders: [], files: [], is_truncated: false, next_continuation_token: null });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [pageStack, setPageStack] = useState([]);
  const [currentToken, setCurrentToken] = useState(null);
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });

  async function load(token = null, { force = false } = {}) {
    setLoading(true);
    setErr(null);
    try {
      const d = await s3api.listObjects(bucket, prefix, token, force);
      setData(d);
      setCurrentToken(token);
      setSelected(new Set());
    } catch (e) {
      setErr(e.message);
      setData({ folders: [], files: [], is_truncated: false, next_continuation_token: null });
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPageStack([]); setCurrentToken(null); load(null); }, [bucket, prefix, refreshTick]);

  const filteredFolders = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return data.folders;
    return data.folders.filter(f => f.name.toLowerCase().includes(q));
  }, [data.folders, filter]);

  const filteredFiles = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return data.files;
    return data.files.filter(f => f.name.toLowerCase().includes(q));
  }, [data.files, filter]);

  const sortedFiles = useMemo(() => {
    const { key, dir } = sort;
    const mult = dir === 'asc' ? 1 : -1;
    const out = [...filteredFiles];
    out.sort((a, b) => {
      const av = a[key === 'type' ? 'name' : key];
      const bv = b[key === 'type' ? 'name' : key];
      if (key === 'type') {
        const at = fileExt(a.name) || '';
        const bt = fileExt(b.name) || '';
        if (at < bt) return -1 * mult;
        if (at > bt) return  1 * mult;
        return 0;
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * mult;
      if (av > bv) return  1 * mult;
      return 0;
    });
    return out;
  }, [filteredFiles, sort]);

  const totalCount = (data.folders?.length || 0) + (data.files?.length || 0);
  const selectedKeys = Array.from(selected);
  const singleSelectedKey = selectedKeys.length === 1 ? selectedKeys[0] : null;
  const hasSelection = selectedKeys.length > 0;

  function toggleSort(key) {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }

  function toggleSelect(key) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  }
  function toggleAll() {
    if (selected.size === sortedFiles.length && sortedFiles.length > 0) setSelected(new Set());
    else setSelected(new Set(sortedFiles.map(f => f.key)));
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      onCopyToast?.('Copied');
    } catch {
      onCopyToast?.('Copy failed');
    }
  }

  async function copyS3Uri() {
    if (!singleSelectedKey) return;
    copy(`s3://${bucket}/${singleSelectedKey}`);
  }
  async function copyUrl() {
    if (!singleSelectedKey) return;
    try {
      const { url } = await s3api.objectUrl(bucket, singleSelectedKey, false);
      copy(url);
    } catch (e) { setErr(e.message); }
  }
  async function downloadSel() {
    if (!singleSelectedKey) return;
    try {
      const { url } = await s3api.objectUrl(bucket, singleSelectedKey, true);
      window.open(url, '_blank', 'noopener');
    } catch (e) { setErr(e.message); }
  }
  async function openSel() {
    if (!singleSelectedKey) return;
    try {
      const { url } = await s3api.objectUrl(bucket, singleSelectedKey, false);
      window.open(url, '_blank', 'noopener');
    } catch (e) { setErr(e.message); }
  }
  function deleteSel() {
    if (selected.size === 0) return;
    const fileMeta = new Map(filteredFiles.map(f => [f.key, f]));
    const folderMeta = new Map(filteredFolders.map(f => [f.prefix, f]));
    const payload = selectedKeys.map(k => {
      const f = fileMeta.get(k);
      if (f) return { key: k, size: f.size, last_modified: f.last_modified, isFolder: false };
      const fd = folderMeta.get(k);
      if (fd) return { key: k, isFolder: true };
      return { key: k };
    });
    onOpenDelete?.(payload);
  }

  const countLabel = hasSelection ? `${selected.size}/${totalCount}` : `${totalCount}`;
  const allChecked = sortedFiles.length > 0 && selected.size >= sortedFiles.length;
  const someChecked = !allChecked && selected.size > 0;

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <h1 className="text-[24px] font-bold break-all" style={{ color: colors.text.primary }}>
          {prefix ? prefix : `${bucket}/`}
        </h1>
        <AwsButton
          icon={<AwsCopyIcon />}
          onClick={() => copy(`s3://${bucket}/${prefix || ''}`)}
        >
          Copy S3 URI
        </AwsButton>
      </div>

      <div className="mb-6 flex gap-6" style={{ borderBottom: `2px solid ${colors.border.rowSeparator}` }}>
        <SectionTab active>Objects</SectionTab>
      </div>

      {err && (
        <div className="mb-4">
          <AwsAlert2
            variant="error"
            title="Couldn't load objects"
            onDismiss={() => setErr(null)}
          >
            {err}
          </AwsAlert2>
        </div>
      )}

      <div
        className="rounded-[8px] p-5"
        style={{
          backgroundColor: colors.bg.card,
          border: `2px solid ${colors.border.cardOutline}`,
        }}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="text-[18px] font-bold inline-flex items-center gap-2" style={{ color: colors.text.primary }}>
            <span>
              Objects <span style={{ color: colors.text.info }} className="font-normal">({countLabel})</span>
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <AwsButton variant="icon" title="Refresh" onClick={() => load(currentToken, { force: true })} icon={<RefreshIcon />} />
          <AwsButton disabled={!singleSelectedKey} onClick={copyS3Uri} icon={<AwsCopyIcon />}>Copy S3 URI</AwsButton>
          <AwsButton disabled={!singleSelectedKey} onClick={copyUrl} icon={<AwsCopyIcon />}>Copy URL</AwsButton>
          <AwsButton disabled={!singleSelectedKey} onClick={downloadSel} icon={<DownloadIcon />}>Download</AwsButton>
          <AwsButton disabled={!singleSelectedKey} onClick={openSel} rightIcon={<OpenExternalIcon />}>Open</AwsButton>
          <AwsButton disabled={!hasSelection} onClick={deleteSel}>Delete</AwsButton>
          <AwsButton disabled>Actions ▾</AwsButton>
          <AwsButton onClick={() => onOpenCreateFolder?.()}>Create folder</AwsButton>
          <AwsButton variant="primary" onClick={() => onOpenUpload?.()} icon={<UploadIcon />}>Upload</AwsButton>
        </div>

        <p className="text-[13px] mb-4" style={{ color: colors.text.info }}>
          Objects are the fundamental entities stored in Amazon S3. You can use{' '}
          <span className="underline decoration-dotted underline-offset-2 cursor-help" style={{ color: colors.text.buttonActive }}>Amazon S3 inventory</span>{' '}
          to get a list of all objects in your bucket. For others to access your objects, you'll need to explicitly grant them permissions.{' '}
          <span className="underline decoration-dotted underline-offset-2 cursor-help" style={{ color: colors.text.buttonActive }}>Learn more</span>
        </p>

        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex-1 max-w-[640px] min-w-[280px]">
            <AwsSearchInput
              value={filter}
              onChange={setFilter}
              placeholder="Find objects by prefix"
            />
          </div>
          <ObjectPager
            hasPrev={pageStack.length > 0}
            hasNext={!!data.is_truncated}
            pageNumber={pageStack.length + 1}
            onPrev={() => {
              const next = [...pageStack];
              const prevToken = next.pop();
              setPageStack(next);
              load(prevToken || null);
            }}
            onNext={() => {
              setPageStack(prev => [...prev, currentToken]);
              load(data.next_continuation_token);
            }}
          />
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
                <HeaderCell aria-hidden="true" showDivider>
                  <AwsCheckbox
                    checked={allChecked}
                    indeterminate={someChecked}
                    onChange={toggleAll}
                    ariaLabel="Select all on this page"
                  />
                </HeaderCell>
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
                <BodyMessage>Loading objects…</BodyMessage>
              )}
              {!loading && !err && filteredFolders.length === 0 && sortedFiles.length === 0 && (
                <BodyMessage>No objects here.</BodyMessage>
              )}

              {!loading && filteredFolders.map(f => (
                <FolderRow key={f.prefix} folder={f} onOpen={() => onOpenPrefix(f.prefix)} />
              ))}

              {!loading && sortedFiles.map(f => (
                <FileRow
                  key={f.key}
                  file={f}
                  selected={selected.has(f.key)}
                  onSelect={() => toggleSelect(f.key)}
                  onOpen={() => onOpenObject(f)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FolderRow({ folder, onOpen }) {
  const separator = `1px solid ${colors.border.rowSeparator}`;
  const cellBase = {
    padding: '8px 12px',
    color: colors.text.selectedRow,
    verticalAlign: 'middle',
    borderTop: '2px solid transparent',
    borderBottom: separator,
  };
  return (
    <tr>
      <td style={{ ...cellBase, borderLeft: '2px solid transparent' }} />
      <td style={cellBase}>
        <button
          type="button"
          onClick={onOpen}
          className="text-left underline decoration-1 underline-offset-2 break-words inline-flex items-center gap-2"
          style={{ color: colors.text.buttonActive }}
        >
          <FolderIcon />
          <span>{folder.name}/</span>
        </button>
      </td>
      <td style={cellBase}>Folder</td>
      <td style={{ ...cellBase, color: colors.text.info }}>—</td>
      <td style={{ ...cellBase, color: colors.text.info }}>—</td>
      <td style={{ ...cellBase, borderRight: '2px solid transparent', color: colors.text.info }}>—</td>
    </tr>
  );
}

function FileRow({ file, selected, onSelect, onOpen }) {
  const ringColor = selected ? colors.border.rowSelected : 'transparent';
  const separator = `1px solid ${colors.border.rowSeparator}`;
  const cellBase = {
    padding: '8px 12px',
    backgroundColor: selected ? colors.bg.rowSelected : 'transparent',
    color: selected ? colors.text.primary : colors.text.selectedRow,
    verticalAlign: 'middle',
  };
  const top = `2px solid ${ringColor}`;
  const bottom = selected ? `2px solid ${ringColor}` : separator;
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
        <AwsCheckbox
          checked={selected}
          onChange={onSelect}
          ariaLabel={`Select ${file.name}`}
        />
      </td>
      <td style={{ ...cellBase, borderTop: top, borderBottom: bottom }}>
        <button
          type="button"
          onClick={onOpen}
          className="text-left underline decoration-1 underline-offset-2 break-all inline-flex items-start gap-2"
          style={{ color: colors.text.buttonActive }}
        >
          <span className="mt-0.5 shrink-0"><FileIcon16 /></span>
          <span>{file.name}</span>
        </button>
      </td>
      <td style={{ ...cellBase, borderTop: top, borderBottom: bottom }}>{fileExt(file.name) || '—'}</td>
      <td style={{ ...cellBase, borderTop: top, borderBottom: bottom }} className="break-words">
        {formatAwsDate(file.last_modified)}
      </td>
      <td style={{ ...cellBase, borderTop: top, borderBottom: bottom }}>{bytesToHuman(file.size)}</td>
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
        {prettyStorageClass(file.storage_class)}
      </td>
    </tr>
  );
}

function BodyMessage({ children }) {
  return (
    <tr>
      <td
        colSpan={6}
        style={{
          padding: '24px 12px',
          textAlign: 'center',
          color: colors.text.info,
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
            bottom: -2,
            backgroundColor: colors.text.buttonActive,
            zIndex: 2,
          }}
        />
      )}
    </button>
  );
}

function FolderIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z" />
    </svg>
  );
}

function FileIcon16() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" style={{ color: colors.text.info }}>
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
    </svg>
  );
}

function ObjectPager({ hasPrev, hasNext, pageNumber, onPrev, onNext }) {
  return (
    <div className="inline-flex items-center gap-2 text-[14px]" style={{ color: colors.text.selectedRow }}>
      <PagerBtn disabled={!hasPrev} onClick={onPrev}>
        <PagerChevron direction="left" />
      </PagerBtn>
      <span
        className="min-w-[24px] text-center px-1 text-[16px]"
        style={{ color: colors.text.primary, fontWeight: 700 }}
      >
        {pageNumber}
      </span>
      <PagerBtn disabled={!hasNext} onClick={onNext}>
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

function prettyStorageClass(s) {
  if (!s) return 'Standard';
  return s.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}
