import { useEffect, useMemo, useState } from 'react';

import AwsAlert from './AwsAlert';
import { s3api } from './api';
import { formatAwsDateCompact } from './format';

// Settings -> Admin users. Lists every admin in the admin_users collection,
// lets the signed-in admin create, edit, reset password, and (de)activate
// peers (including themselves — see ConfirmDestructive flow + auto-logout).
export default function AdminsPage({ currentUsername, onSelfDeactivated, onCopyToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [modal, setModal] = useState(null);
  // ^ {kind: 'create' | 'edit' | 'reset' | 'confirm', target?, intent?, copy?}

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
    if (!q) return items;
    return items.filter(u =>
      u.account_id.includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q),
    );
  }, [items, filter]);

  const activeCount = items.filter(u => u.is_active).length;

  function copy(text) {
    navigator.clipboard.writeText(text).then(
      () => onCopyToast?.('Copied'),
      () => onCopyToast?.('Copy failed'),
    );
  }

  async function applyUpdate(id, patches, opts = {}) {
    const target = items.find(u => u.id === id);
    const isSelfDeactivate = opts.isSelfDeactivate;
    await s3api.updateAdmin(id, patches);
    if (isSelfDeactivate) {
      onSelfDeactivated?.();
      return;
    }
    await load();
    return target;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-[24px] font-bold text-[#e6edf3]">Admin users</h1>
          <p className="text-[13px] text-[#8b949e] mt-1">
            {items.length} total · {activeCount} active. Anyone listed here can sign in to AWS S3 Navigate.
          </p>
        </div>
        <button
          onClick={() => setModal({ kind: 'create' })}
          className="px-4 h-[36px] rounded-[2px] bg-[#ec7211] hover:bg-[#eb5f07] text-[#16191f] text-[14px] font-bold"
        >
          Create admin
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <AwsAlert variant="error" tone="outlined" title="Couldn’t load admins" onDismiss={() => setError(null)}>
            {error}
          </AwsAlert>
        </div>
      )}

      <div className="mt-5 mb-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by account ID, email, or username"
          className="w-full max-w-[420px] h-[36px] px-3 bg-[#0d1117] border border-[#687077] rounded-[2px] text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb] focus:shadow-[0_0_0_2px_rgba(31,111,235,0.3)]"
        />
      </div>

      <div className="rounded-[4px] bg-[#0d1117] overflow-x-auto">
        <table className="w-full min-w-[860px] text-[13px] text-left">
          <thead className="text-[#c9d1d9] border-b border-[#30363d]">
            <tr>
              <Th>Account ID</Th>
              <Th>Email</Th>
              <Th>Username</Th>
              <Th>Created</Th>
              <Th>Last login</Th>
              <Th>Status</Th>
              <Th className="text-right pr-4">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="p-4 text-[#8b949e]" colSpan={7}>Loading admins…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td className="p-4 text-[#8b949e]" colSpan={7}>No admins match this filter.</td></tr>
            )}
            {filtered.map(u => {
              const isSelf = u.username === currentUsername;
              const lastActive = u.is_active && activeCount === 1;
              return (
                <tr key={u.id} className="border-b border-[#21262d] last:border-b-0 hover:bg-[#161b22]">
                  <Td>
                    <button onClick={() => copy(u.account_id)} className="font-mono text-[#e6edf3] hover:text-[#58a6ff]" title="Copy">
                      {u.account_id}
                    </button>
                  </Td>
                  <Td className="text-[#c9d1d9]">{u.email}</Td>
                  <Td className="text-[#c9d1d9]">
                    {u.username}
                    {isSelf && <span className="ml-2 text-[11px] text-[#8b949e] uppercase tracking-wider">you</span>}
                  </Td>
                  <Td className="text-[#8b949e]">{formatAwsDateCompact(u.created_at)}</Td>
                  <Td className="text-[#8b949e]">{u.last_login_at ? formatAwsDateCompact(u.last_login_at) : '—'}</Td>
                  <Td>
                    {u.is_active
                      ? <Badge color="#3fb950" bg="rgba(63,185,80,0.12)">Active</Badge>
                      : <Badge color="#8b949e" bg="rgba(139,148,158,0.12)">Inactive</Badge>}
                  </Td>
                  <Td className="text-right pr-4 whitespace-nowrap">
                    <div className="inline-flex gap-3 text-[13px]">
                      <RowAction onClick={() => setModal({ kind: 'edit', target: u })}>Edit</RowAction>
                      <RowAction onClick={() => setModal({ kind: 'reset', target: u })}>Reset password</RowAction>
                      {u.is_active ? (
                        <RowAction
                          danger
                          disabled={lastActive}
                          title={lastActive ? 'Cannot deactivate the last active admin' : undefined}
                          onClick={() => setModal({
                            kind: 'confirm',
                            target: u,
                            intent: 'deactivate',
                            copy: {
                              title: 'Deactivate admin?',
                              destructiveLabel: 'Deactivate admin',
                              warningTitle: isSelf
                                ? 'This will sign you out immediately'
                                : `This will sign out ${u.username} immediately`,
                              body: isSelf
                                ? <>You're deactivating your own account. Your current session will be deleted, you'll be returned to the sign-in page, and you won't be able to sign in until another admin reactivates you.</>
                                : <><span className="font-mono">{u.username}</span> ({u.email}) will lose access to AWS S3 Navigate. Their existing sessions will be revoked. Reactivate from this page later if needed.</>,
                              confirmPrompt: u.username,
                            },
                          })}
                        >Deactivate</RowAction>
                      ) : (
                        <RowAction onClick={async () => {
                          try { await applyUpdate(u.id, { is_active: true }); }
                          catch (e) { setError(e.message); }
                        }}>Reactivate</RowAction>
                      )}
                    </div>
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
          onDone={async () => { setModal(null); await load(); }}
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
            const isSelf = modal.target.username === currentUsername;
            try {
              await applyUpdate(modal.target.id, { is_active: false }, { isSelfDeactivate: isSelf });
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

function Th({ children, className = '' }) {
  return <th className={`px-3 py-2 font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`px-3 py-3 align-middle ${className}`}>{children}</td>;
}

function Badge({ color, bg, children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[12px] font-semibold rounded-[2px]"
      style={{ color, backgroundColor: bg }}>
      {children}
    </span>
  );
}

function RowAction({ onClick, children, danger = false, disabled = false, title }) {
  const base = 'underline decoration-dotted underline-offset-2 transition-colors';
  const color = disabled
    ? 'text-[#484f58] cursor-not-allowed'
    : danger
      ? 'text-[#e35b66] hover:text-[#fe6b58]'
      : 'text-[#58a6ff] hover:text-[#79b8ff]';
  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      className={`${base} ${color}`}
    >
      {children}
    </button>
  );
}

function ModalShell({ title, body, footer, onCancel, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-[#161b22] rounded-[4px] shadow-[0_24px_64px_rgba(0,0,0,0.6)] ${wide ? 'w-full max-w-[560px]' : 'w-full max-w-[440px]'}`}
      >
        <div className="px-5 pt-4 pb-3 border-b border-[#30363d]">
          <h2 className="text-[18px] font-bold text-[#e6edf3]">{title}</h2>
        </div>
        <div className="px-5 py-4">{body}</div>
        <div className="px-5 py-3 border-t border-[#30363d] flex items-center justify-end gap-2">
          {footer}
        </div>
      </div>
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
          {err && <div className="text-[13px] text-[#e35b66]">{err}</div>}
        </div>
      }
      footer={
        <>
          <button onClick={onCancel} className="px-4 h-[34px] rounded-[2px] text-[14px] text-[#c9d1d9] hover:bg-[#21262d]">Cancel</button>
          <button
            disabled={submitting}
            onClick={submit}
            className="px-4 h-[34px] rounded-[2px] bg-[#ec7211] hover:bg-[#eb5f07] text-[#16191f] text-[14px] font-bold disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create admin'}
          </button>
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
      title={<>Edit admin <span className="text-[#8b949e] font-normal text-[14px] ml-1">({target.account_id})</span></>}
      body={
        <div className="space-y-3">
          <FormField label="Account ID" value={target.account_id} disabled mono hint="Account ID is immutable." />
          <FormField label="Email" value={email} onChange={setEmail} type="email" />
          <FormField label="Username" value={username} onChange={setUsername} />
          {err && <div className="text-[13px] text-[#e35b66]">{err}</div>}
        </div>
      }
      footer={
        <>
          <button onClick={onCancel} className="px-4 h-[34px] rounded-[2px] text-[14px] text-[#c9d1d9] hover:bg-[#21262d]">Cancel</button>
          <button
            disabled={!dirty || submitting}
            onClick={submit}
            className="px-4 h-[34px] rounded-[2px] bg-[#ec7211] hover:bg-[#eb5f07] text-[#16191f] text-[14px] font-bold disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
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
      title={<>Reset password <span className="text-[#8b949e] font-normal text-[14px] ml-1">for {target.username}</span></>}
      body={
        <div className="space-y-3">
          {!isSelf && (
            <p className="text-[13px] text-[#c9d1d9]">
              This will replace <span className="font-mono">{target.username}</span>'s password and sign them out of every device.
            </p>
          )}
          <FormField label="New password" value={pw} onChange={setPw} type="password" hint="Min 8 chars · upper · lower · digit" />
          <FormField label="Confirm new password" value={pw2} onChange={setPw2} type="password" />
          {err && <div className="text-[13px] text-[#e35b66]">{err}</div>}
        </div>
      }
      footer={
        <>
          <button onClick={onCancel} className="px-4 h-[34px] rounded-[2px] text-[14px] text-[#c9d1d9] hover:bg-[#21262d]">Cancel</button>
          <button
            disabled={!pw || submitting}
            onClick={submit}
            className="px-4 h-[34px] rounded-[2px] bg-[#ec7211] hover:bg-[#eb5f07] text-[#16191f] text-[14px] font-bold disabled:opacity-50"
          >
            {submitting ? 'Resetting…' : 'Reset password'}
          </button>
        </>
      }
      onCancel={onCancel}
    />
  );
}

// AWS-style "type the value to confirm" destructive modal.
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
            <svg className="w-5 h-5 mt-0.5 shrink-0 text-[#e35b66]" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm.53 4.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
            </svg>
            <div className="text-[13px] text-[#e6edf3]">
              <div className="font-semibold mb-1">{warningTitle}</div>
              <div className="text-[#c9d1d9]">{body}</div>
            </div>
          </div>

          {confirmPrompt && (
            <>
              <p className="text-[13px] text-[#c9d1d9]">
                To confirm, type <span className="font-mono text-[#e6edf3]">{confirmPrompt}</span> in the field below.
              </p>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="w-full h-[36px] px-3 bg-[#0d1117] border border-[#687077] rounded-[2px] text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb] focus:shadow-[0_0_0_2px_rgba(31,111,235,0.3)]"
                autoFocus
              />
            </>
          )}
        </div>
      }
      footer={
        <>
          <button
            disabled={busy}
            onClick={onCancel}
            className="px-4 h-[34px] rounded-[2px] text-[14px] text-[#c9d1d9] hover:bg-[#21262d] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={!matches || busy}
            onClick={go}
            className="px-4 h-[34px] rounded-[2px] bg-[#b00f1f] hover:bg-[#8a0a16] text-white text-[14px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Working…' : destructiveLabel}
          </button>
        </>
      }
      onCancel={onCancel}
    />
  );
}

function FormField({ label, value, onChange, type = 'text', hint, placeholder, disabled, mono, maxLength }) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-[#e6edf3] mb-1">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`w-full h-[34px] px-3 bg-[#0d1117] border border-[#687077] rounded-[2px] text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb] focus:shadow-[0_0_0_2px_rgba(31,111,235,0.3)] disabled:opacity-60 ${mono ? 'font-mono' : ''}`}
      />
      {hint && <div className="mt-1 text-[12px] text-[#8b949e]">{hint}</div>}
    </div>
  );
}
