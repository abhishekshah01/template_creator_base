import { useState } from 'react';

import { s3api } from '../S3Navigate/api';

const REMEMBERED_ACCOUNT_KEY = 'cmsportal_remembered_account';
const REMEMBERED_USERNAME_KEY = 'cmsportal_remembered_username';

export default function CmsSignIn({ onSignedIn }) {
  const [account, setAccount] = useState(() => localStorage.getItem(REMEMBERED_ACCOUNT_KEY) || '');
  const [username, setUsername] = useState(() => localStorage.getItem(REMEMBERED_USERNAME_KEY) || '');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem(REMEMBERED_USERNAME_KEY));
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    const trimmedAccount = account.trim();
    const trimmedUser = username.trim();
    const fe = {};
    if (!trimmedAccount) fe.account = 'Account ID or email is required';
    if (!trimmedUser) fe.username = 'Username is required';
    if (!password) fe.password = 'Password is required';
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) return;

    setSubmitting(true);
    setAuthError(null);
    try {
      const data = await s3api.signIn(trimmedAccount, trimmedUser, password);
      if (remember) {
        localStorage.setItem(REMEMBERED_ACCOUNT_KEY, trimmedAccount);
        localStorage.setItem(REMEMBERED_USERNAME_KEY, trimmedUser);
      } else {
        localStorage.removeItem(REMEMBERED_ACCOUNT_KEY);
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }
      onSignedIn?.(data);
    } catch (err) {
      setAuthError({
        title: isAuthFailure(err.message) ? 'Authentication failed' : 'Sign-in failed',
        message: isAuthFailure(err.message)
          ? 'Your authentication information is incorrect. Please try again.'
          : err.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full bg-[#0f1419] text-[#e9ecef] flex flex-col">
      <div className="mt-12 mb-8 flex justify-center">
        <AtomLogo />
      </div>

      <div className="flex justify-center px-6 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-[360px_360px] gap-5 items-start">
          <div className="flex flex-col">
            {authError && (
              <AuthErrorAlert
                title={authError.title}
                message={authError.message}
                onDismiss={() => setAuthError(null)}
              />
            )}

            <form
              onSubmit={handleSubmit}
              noValidate
              className="bg-[#161b22] rounded-[4px] overflow-hidden"
            >
              <div className="px-5 pt-4 pb-3 border-b border-[#30363d]">
                <h2 className="text-[20px] font-bold text-[#e6edf3]">CMS Portal sign in</h2>
                <p className="text-[12px] text-[#8b949e] mt-0.5">
                  Manage assets in <span className="font-mono">s3://emergent-frontend-assets/assets/templates</span>
                </p>
              </div>

              <div className="px-5 py-4">
                <label className="block text-[14px] font-bold text-[#e6edf3] mb-1">Account ID or email</label>
                <input
                  type="text"
                  value={account}
                  onChange={(e) => {
                    setAccount(e.target.value);
                    if (fieldErrors.account) setFieldErrors((p) => ({ ...p, account: undefined }));
                  }}
                  autoComplete="username"
                  className={inputCls(!!fieldErrors.account)}
                />
                {fieldErrors.account ? <FieldError message={fieldErrors.account} /> : <Gap />}

                <label className="flex items-center gap-2 text-[14px] text-[#c9d1d9] cursor-pointer mb-4 select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="accent-[#7c3aed] w-[18px] h-[18px]"
                  />
                  Remember this account
                </label>

                <label className="block text-[14px] font-bold text-[#e6edf3] mb-1">Username</label>
                <input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: undefined }));
                  }}
                  autoComplete="username"
                  className={inputCls(!!fieldErrors.username)}
                />
                {fieldErrors.username ? <FieldError message={fieldErrors.username} /> : <Gap />}

                <label className="block text-[14px] font-bold text-[#e6edf3] mb-1">Password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  autoComplete="current-password"
                  className={inputCls(!!fieldErrors.password)}
                />
                {fieldErrors.password ? <FieldError message={fieldErrors.password} /> : <Gap small />}

                <label className="flex items-center gap-2 text-[14px] text-[#c9d1d9] cursor-pointer mb-4 select-none">
                  <input
                    type="checkbox"
                    checked={showPw}
                    onChange={(e) => setShowPw(e.target.checked)}
                    className="accent-[#7c3aed] w-[18px] h-[18px]"
                  />
                  Show Password
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-[38px] rounded-[2px] bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[14px] font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-[#0d1117] rounded-[4px] overflow-hidden flex flex-col">
            <div
              className="relative h-[320px]"
              style={{
                background:
                  'radial-gradient(130% 100% at 95% 12%, #22d3ee 0%, #7c3aed 28%, #2e1065 62%, #0d1117 90%)',
              }}
            >
              <div className="absolute inset-0 p-6 flex flex-col justify-start">
                <h3 className="text-[26px] font-bold text-white leading-tight mb-1.5">CMS Portal</h3>
                <p className="text-[14px] text-white/90 max-w-[240px] leading-snug">
                  Upload, delete, and invalidate cached assets — scoped to the templates prefix.
                </p>
                <div className="mt-4 text-[12px] text-white/80 max-w-[260px] leading-snug">
                  <div className="font-mono break-all">s3://emergent-frontend-assets/<br />assets/templates/</div>
                </div>
              </div>
              <div className="absolute right-4 bottom-2 opacity-80 hidden sm:block">
                <CubesMascot />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-10 mx-auto w-full max-w-[740px] text-[12px] text-[#8b949e] leading-relaxed">
        <div className="text-center">
          CMS Portal proxies through app-service. No AWS credentials live in this app.
        </div>
        <div className="mt-3 text-center">
          © {new Date().getFullYear()} Emergent. All rights reserved.
        </div>
      </div>
    </div>
  );
}

function isAuthFailure(message) {
  if (!message) return false;
  return /invalid|incorrect|wrong\s+(?:credentials|password|username)/i.test(message);
}

function inputCls(hasError = false) {
  const base =
    'w-full h-[36px] px-3 bg-[#0d1117] border rounded-[2px] text-[14px] text-[#e6edf3] outline-none ' +
    'focus:shadow-[0_0_0_2px_rgba(124,58,237,0.35)] transition-shadow';
  return hasError
    ? `${base} border-[#e35b66] focus:border-[#e35b66] focus:shadow-[0_0_0_2px_rgba(227,91,102,0.3)]`
    : `${base} border-[#687077] focus:border-[#7c3aed]`;
}

function Gap({ small = false }) {
  return <div className={small ? 'mb-2' : 'mb-3'} />;
}

function FieldError({ message }) {
  return (
    <div className="mt-1 mb-2 flex items-center gap-1.5 text-[13px] text-[#e35b66]">
      <svg className="w-[14px] h-[14px] shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm3.28 4.72a.75.75 0 0 0-1.06 0L8 6.94 5.78 4.72a.749.749 0 1 0-1.06 1.06L6.94 8 4.72 10.22a.749.749 0 1 0 1.06 1.06L8 9.06l2.22 2.22a.749.749 0 1 0 1.06-1.06L9.06 8l2.22-2.22a.749.749 0 0 0 0-1.06Z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

function AuthErrorAlert({ title, message, onDismiss }) {
  return (
    <div className="mb-4 flex items-start gap-3 p-4 rounded-[2px] bg-[#3f1d1c] border border-[#fe6b58]">
      <svg
        className="w-[22px] h-[22px] text-[#fe6b58] shrink-0 mt-px"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      >
        <circle cx="8" cy="8" r="7" />
        <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" strokeLinecap="round" />
      </svg>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold text-[#e6edf3] leading-snug">{title}</div>
        <div className="text-[14px] text-[#c9d1d9] mt-0.5 leading-snug break-words">{message}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="shrink-0 -mt-1 -mr-1 p-1 rounded text-[#c9d1d9] hover:bg-white/10"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
      )}
    </div>
  );
}

function AtomLogo() {
  return (
    <svg width="72" height="72" viewBox="0 0 16 16" fill="none" stroke="#a78bfa" strokeWidth="1.1">
      <ellipse cx="8" cy="8" rx="6.8" ry="2.6" />
      <ellipse cx="8" cy="8" rx="6.8" ry="2.6" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="6.8" ry="2.6" transform="rotate(120 8 8)" />
      <circle cx="8" cy="8" r="1.3" fill="#a78bfa" stroke="none" />
    </svg>
  );
}

function CubesMascot() {
  return (
    <svg
      width="100"
      height="112"
      viewBox="0 0 120 140"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <rect x="18" y="34" width="40" height="40" rx="4" />
      <rect x="62" y="14" width="34" height="34" rx="4" />
      <rect x="62" y="52" width="40" height="68" rx="4" />
      <rect x="18" y="78" width="40" height="42" rx="4" />
      <line x1="20" y1="135" x2="100" y2="135" strokeDasharray="2 6" />
    </svg>
  );
}
