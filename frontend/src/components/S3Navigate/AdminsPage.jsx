import { useEffect, useMemo, useState } from 'react';

import AwsAlert from './AwsAlert';
import { AwsButton, AwsCheckbox, AwsSearchInput, RefreshIcon, SortTriangleV2 } from './AwsControls';
import { s3api } from './api';
import { formatAwsDate } from './format';
import { colors } from './theme';

const COL_WIDTH = 150;
const COLUMNS = [
  { key: 'account_id',    label: 'Account ID',  width: COL_WIDTH },
  { key: 'email',         label: 'Email',       width: COL_WIDTH },
  { key: 'username',      label: 'Username',    width: COL_WIDTH },
  { key: 'created_at',    label: 'Created',     width: COL_WIDTH },
  { key: 'last_login_at', label: 'Last login',  width: COL_WIDTH },
  { key: 'is_active',     label: 'Status',      width: null }, // leftover
];

export default function AdminsPage({ currentUsername, onSelfDeactivated, onCopyToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [sort, setSort] = useState({ key: 'account_id', dir: 'asc' });
  const [modal, setModal] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await s3api.listAdmins();
      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let rows = items;
    if (q) {
      rows = rows.filter(u =>
        u.account_id.includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q),
      );
    }
    const { key, dir } = sort;
    const mult = dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;   // nulls always at bottom
      if (bv == null) return -1;
      if (av < bv) return -1 * mult;
      if (av > bv) return  1 * mult;
      return 0;
    });
  }, [items, filter, sort]);

  const activeCount = items.filter(u => u.is_active).length;
  const selected = filtered.find(u => u.id === selectedId) || null;
  const singleSelected = !!selected;
  const isSelfSelected = selected?.username === currentUsername;
  const isLastActive = selected?.is_active && activeCount === 1;

  function toggleSort(key) {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
    });
  }

  function copy(text) {
    navigator.clipboard.writeText(text).then(
      () => onCopyToast?.('Copied'),
      () => onCopyToast?.('Copy failed'),
    );
  }

  async function applyUpdate(id, patches, opts = {}) {
    await s3api.updateAdmin(id, patches);
    if (opts.isSelfDeactivate) {
      onSelfDeactivated?.();
      return;
    }
    setSelectedId(null);
    await load();
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[24px] font-bold" style={{ color: colors.text.primary }}>
          Admin users {selected
            ? <span style={{ color: colors.text.info }}>(1/{items.length})</span>
            : <span style={{ color: colors.text.info }}>({items.length})</span>}
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: colors.text.info }}>
          {activeCount} active. Anyone listed here can sign in to AWS S3 Navigate.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <AwsButton variant="icon" title="Refresh" onClick={load} icon={<RefreshIcon />} />
        <AwsButton disabled={!singleSelected} onClick={() => setModal({ kind: 'edit', target: selected })}>
          Edit
        </AwsButton>
        <AwsButton disabled={!singleSelected} onClick={() => setModal({ kind: 'reset', target: selected })}>
          Reset password
        </AwsButton>
        <AwsButton
          disabled={!singleSelected || (selected.is_active && isLastActive)}
          title={isLastActive ? 'Cannot deactivate the last active admin' : undefined}
          onClick={() => {
            if (!selected) return;
            if (selected.is_active) {
              setModal({
                kind: 'confirm',
                target: selected,
                copy: {
                  title: 'Deactivate admin?',
                  destructiveLabel: 'Deactivate admin',
                  warningTitle: isSelfSelected
                    ? 'This will sign you out immediately'
                    : `This will sign out ${selected.username} immediately`,
                  body: isSelfSelected
                    ? <>You're deactivating your own account. Your current session will be deleted, you'll be returned to the sign-in page, and you won't be able to sign in until another admin reactivates you.</>
                    : <><span className="font-mono">{selected.username}</span> ({selected.email}) will lose access to AWS S3 Navigate. Their existing sessions will be revoked. Reactivate from this page later if needed.</>,
                  confirmPrompt: selected.username,
                },
              });
            } else {
              applyUpdate(selected.id, { is_active: true }).catch(e => setError(e.message));
            }
          }}
        >
          {selected?.is_active === false ? 'Reactivate' : 'Deactivate'}
        </AwsButton>
        <div className="ml-auto">
          <AwsButton variant="primary" onClick={() => setModal({ kind: 'create' })}>
            Create admin
          </AwsButton>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <AwsAlert variant="error" tone="outlined" title="Couldn’t load admins" onDismiss={() => setError(null)}>
            {error}
          </AwsAlert>
        </div>
      )}

      <div className="mb-4 max-w-[460px]">
        <AwsSearchInput
          value={filter}
          onChange={setFilter}
          placeholder="Find admins by account ID, email, or username"
        />
      </div>

      <div className="rounded-[4px] overflow-x-auto min-w-0" style={{ backgroundColor: colors.bg.card }}>
        <table
          className="w-full text-[14px] text-left border-collapse"
          style={{ tableLayout: 'fixed' }}
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
                  indeterminate={!!selected}
                  onChange={() => setSelectedId(null)}
                  ariaLabel="Clear selection"
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
                      className="inline-flex items-center gap-2"
                      style={{ color: colors.text.tableHeader }}
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
              <tr><td colSpan={COLUMNS.length + 1} className="px-3 py-6" style={{ color: colors.text.info }}>Loading admins…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 1} className="px-3 py-6" style={{ color: colors.text.info }}>No admins match this filter.</td></tr>
            )}
            {!loading && filtered.map(u => {
              const isSel = u.id === selectedId;
              const isSelf = u.username === currentUsername;
              // 2px ring around the selected row: top/bottom on the <tr> and
              // left/right on the first/last <td>. Text stays default white.
              const ringTopBottom = isSel
                ? `2px solid ${colors.border.rowSelected}`
                : `1px solid ${colors.border.rowSeparator}`;
              const ringSide = isSel
                ? `2px solid ${colors.border.rowSelected}`
                : 'none';
              return (
                <tr
                  key={u.id}
                  style={{
                    backgroundColor: isSel ? colors.bg.rowSelected : 'transparent',
                    color: colors.text.primary,
                    borderTop: ringTopBottom,
                    borderBottom: ringTopBottom,
                  }}
                >
                  <Td style={{ borderLeft: ringSide }}>
                    <AwsCheckbox
                      checked={isSel}
                      onChange={() => setSelectedId(isSel ? null : u.id)}
                      ariaLabel={`Select ${u.username}`}
                    />
                  </Td>
                  <Td>
                    <button
                      onClick={() => copy(u.account_id)}
                      className="font-mono"
                      style={{ color: 'inherit' }}
                      title="Copy account ID"
                    >
                      {u.account_id}
                    </button>
                  </Td>
                  <Td className="break-words">{u.email}</Td>
                  <Td className="break-words">
                    {u.username}
                    {isSelf && (
                      <span className="ml-2 text-[11px] uppercase tracking-wider" style={{ color: colors.text.info }}>
                        you
                      </span>
                    )}
                  </Td>
                  <Td className="break-words">{formatAwsDate(u.created_at)}</Td>
                  <Td className="break-words">{u.last_login_at ? formatAwsDate(u.last_login_at) : '—'}</Td>
                  <Td style={{ borderRight: ringSide }}>
                    {u.is_active
                      ? <Badge color="#7af0a0" bg="rgba(0,90,40,0.25)">Active</Badge>
                      : <Badge color={colors.text.info} bg="rgba(139,148,158,0.18)">Inactive</Badge>}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal?.kind === 'create' && (
        <CreateAdminModal
          onCancel={() => setModal(null)}
          onDone={async () => { setModal(null); await load(); }}
        />
      )}
      {modal?.kind === 'edit' && modal.target && (
        <EditAdminModal
          target={modal.target}
          onCancel={() => setModal(null)}
          onDone={async () => { setModal(null); setSelectedId(null); await load(); }}
        />
      )}
      {modal?.kind === 'reset' && modal.target && (
        <ResetPasswordModal
          target={modal.target}
          isSelf={modal.target.username === currentUsername}
          onCancel={() => setModal(null)}
          onDone={() => setModal(null)}
        />
      )}
      {modal?.kind === 'confirm' && modal.target && (
        <ConfirmDestructiveModal
          {...modal.copy}
          onCancel={() => setModal(null)}
          onConfirm={async () => {
            const isSelfTarget = modal.target.username === currentUsername;
            try {
              await applyUpdate(modal.target.id, { is_active: false }, { isSelfDeactivate: isSelfTarget });
              setModal(null);
            } catch (e) {
              setError(e.message);
              setModal(null);
            }
          }}
        />
      )}
    </div>
  );
}

function Td({ children, className = '', style }) {
  return (
    <td className={`align-middle ${className}`} style={{ padding: '12px', ...style }}>{children}</td>
  );
}

// Header cell with an inset column divider on its right edge: the line stops
// short of the top + bottom of the cell so it doesn't visually merge with
// the underline below the header row.
function HeaderCell({ children, showDivider }) {
  return (
    <th
      style={{
        padding: '6px 12px',
        color: colors.text.tableHeader,
        position: 'relative',
        textAlign: 'left',
        fontWeight: 700,
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

function Badge({ color, bg, children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-semibold rounded-[2px]"
      style={{ color, backgroundColor: bg }}>
      {children}
    </span>
  );
}

function ModalShell({ title, body, footer, onCancel, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`rounded-[4px] shadow-[0_24px_64px_rgba(0,0,0,0.6)] ${wide ? 'w-full max-w-[560px]' : 'w-full max-w-[440px]'}`}
        style={{ backgroundColor: colors.bg.card }}
      >
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${colors.border.buttonInactive}` }}>
          <h2 className="text-[18px] font-bold" style={{ color: colors.text.primary }}>{title}</h2>
        </div>
        <div className="px-5 py-4">{body}</div>
        <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: `1px solid ${colors.border.buttonInactive}` }}>
          {footer}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', hint, placeholder, disabled, mono, maxLength }) {
  return (
    <div>
      <label className="block text-[13px] font-bold mb-1" style={{ color: colors.text.primary }}>{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`w-full h-[34px] px-3 text-[14px] outline-none disabled:opacity-60 focus:shadow-[0_0_0_2px_rgba(31,111,235,0.3)] ${mono ? 'font-mono' : ''}`}
        style={{
          backgroundColor: '#0d1117',
          border: `1px solid ${colors.border.inputDefault}`,
          borderRadius: '4px',
          color: colors.text.primary,
        }}
      />
      {hint && <div className="mt-1 text-[12px]" style={{ color: colors.text.info }}>{hint}</div>}
    </div>
  );
}

function CreateAdminModal({ onCancel, onDone }) {
  const [accountId, setAccountId] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      await s3api.createAdmin({ account_id: accountId.trim(), email: email.trim(), username: username.trim(), password });
      onDone();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title="Create admin"
      body={
        <div className="space-y-3">
          <FormField label="Account ID (12 digits)" value={accountId} onChange={setAccountId} placeholder="000000000000" maxLength={12} mono />
          <FormField label="Email (@emergent.sh)" value={email} onChange={setEmail} placeholder="user@emergent.sh" type="email" />
          <FormField label="Username" value={username} onChange={setUsername} placeholder="alice" />
          <FormField label="Password" value={password} onChange={setPassword} type="password" hint="Min 8 chars · upper · lower · digit" />
          {err && <div className="text-[13px]" style={{ color: '#e35b66' }}>{err}</div>}
        </div>
      }
      footer={
        <>
          <AwsButton onClick={onCancel}>Cancel</AwsButton>
          <AwsButton variant="primary" disabled={submitting} onClick={submit}>
            {submitting ? 'Creating…' : 'Create admin'}
          </AwsButton>
        </>
      }
      onCancel={onCancel}
    />
  );
}

function EditAdminModal({ target, onCancel, onDone }) {
  const [email, setEmail] = useState(target.email);
  const [username, setUsername] = useState(target.username);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const dirty = email.trim() !== target.email || username.trim() !== target.username;

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      const patches = {};
      if (email.trim() !== target.email) patches.email = email.trim();
      if (username.trim() !== target.username) patches.username = username.trim();
      await s3api.updateAdmin(target.id, patches);
      onDone();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title={<>Edit admin <span className="font-normal text-[14px] ml-1" style={{ color: colors.text.info }}>({target.account_id})</span></>}
      body={
        <div className="space-y-3">
          <FormField label="Account ID" value={target.account_id} disabled mono hint="Account ID is immutable." />
          <FormField label="Email" value={email} onChange={setEmail} type="email" />
          <FormField label="Username" value={username} onChange={setUsername} />
          {err && <div className="text-[13px]" style={{ color: '#e35b66' }}>{err}</div>}
        </div>
      }
      footer={
        <>
          <AwsButton onClick={onCancel}>Cancel</AwsButton>
          <AwsButton variant="primary" disabled={!dirty || submitting} onClick={submit}>
            {submitting ? 'Saving…' : 'Save changes'}
          </AwsButton>
        </>
      }
      onCancel={onCancel}
    />
  );
}

function ResetPasswordModal({ target, isSelf, onCancel, onDone }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  async function submit() {
    if (pw !== pw2) { setErr('Passwords do not match.'); return; }
    setSubmitting(true);
    setErr(null);
    try {
      await s3api.resetAdminPassword(target.id, pw);
      onDone();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title={<>Reset password <span className="font-normal text-[14px] ml-1" style={{ color: colors.text.info }}>for {target.username}</span></>}
      body={
        <div className="space-y-3">
          {!isSelf && (
            <p className="text-[13px]" style={{ color: colors.text.info }}>
              This will replace <span className="font-mono">{target.username}</span>'s password and sign them out of every device.
            </p>
          )}
          <FormField label="New password" value={pw} onChange={setPw} type="password" hint="Min 8 chars · upper · lower · digit" />
          <FormField label="Confirm new password" value={pw2} onChange={setPw2} type="password" />
          {err && <div className="text-[13px]" style={{ color: '#e35b66' }}>{err}</div>}
        </div>
      }
      footer={
        <>
          <AwsButton onClick={onCancel}>Cancel</AwsButton>
          <AwsButton variant="primary" disabled={!pw || submitting} onClick={submit}>
            {submitting ? 'Resetting…' : 'Reset password'}
          </AwsButton>
        </>
      }
      onCancel={onCancel}
    />
  );
}

function ConfirmDestructiveModal({
  title,
  warningTitle,
  body,
  destructiveLabel = 'Delete',
  confirmPrompt,
  onCancel,
  onConfirm,
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = confirmPrompt ? typed === confirmPrompt : true;

  async function go() {
    setBusy(true);
    try { await onConfirm(); }
    finally { setBusy(false); }
  }

  return (
    <ModalShell
      wide
      title={title}
      body={
        <div className="space-y-4">
          <div
            className="flex items-start gap-3 p-3 rounded-[2px]"
            style={{ backgroundColor: 'rgba(176,15,31,0.12)', border: '1px solid #e35b66' }}
          >
            <svg className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#e35b66' }} viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm.53 4.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
            </svg>
            <div className="text-[13px]" style={{ color: colors.text.primary }}>
              <div className="font-semibold mb-1">{warningTitle}</div>
              <div style={{ color: colors.text.info }}>{body}</div>
            </div>
          </div>

          {confirmPrompt && (
            <>
              <p className="text-[13px]" style={{ color: colors.text.info }}>
                To confirm, type <span className="font-mono" style={{ color: colors.text.primary }}>{confirmPrompt}</span> in the field below.
              </p>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="w-full h-[36px] px-3 text-[14px] outline-none focus:shadow-[0_0_0_2px_rgba(31,111,235,0.3)]"
                style={{
                  backgroundColor: '#0d1117',
                  border: `1px solid ${colors.border.inputDefault}`,
                  borderRadius: '4px',
                  color: colors.text.primary,
                }}
                autoFocus
              />
            </>
          )}
        </div>
      }
      footer={
        <>
          <AwsButton disabled={busy} onClick={onCancel}>Cancel</AwsButton>
          <button
            disabled={!matches || busy}
            onClick={go}
            className="px-4 h-[32px] rounded-[20px] text-[14px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#b00f1f', color: '#ffffff', border: '1px solid #b00f1f' }}
          >
            {busy ? 'Working…' : destructiveLabel}
          </button>
        </>
      }
      onCancel={onCancel}
    />
  );
}
