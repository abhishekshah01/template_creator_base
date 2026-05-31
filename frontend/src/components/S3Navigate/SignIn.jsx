import { useState } from 'react';

import { s3api } from './api';
import AwsAlert from './AwsAlert';

// Admin sign-in for AWS S3 Navigate. Layout mirrors the AWS IAM user sign-in
// console: two-column hero, account/username/password fields, orange action.
// Token is stored in localStorage (sliding 24h TTL on the backend).
export default function SignIn({ onSignedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await s3api.signIn(username.trim(), password);
      onSignedIn?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="aws-s3-theme min-h-full flex flex-col">
      {/* Top utility bar */}
      <div className="px-6 py-4 flex items-center justify-end gap-7 text-[13px] text-[#d4d8db]">
        <span className="cursor-default">Provide feedback</span>
        <span className="cursor-default flex items-center gap-1">
          Multi-session disabled <Chevron />
        </span>
        <span className="cursor-default flex items-center gap-1">
          English <Chevron />
        </span>
      </div>

      {/* Centered logo */}
      <div className="flex justify-center mt-4 mb-10">
        <img
          src="https://assets.emergent.sh/assets/elogo.gif"
          alt="Emergent"
          className="h-[64px] w-auto select-none"
          draggable={false}
        />
      </div>

      {/* Two-column hero */}
      <div className="flex-1 flex justify-center px-6 pb-12">
        <div className="w-full max-w-[1080px] grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          {/* Left: sign-in card */}
          <div className="max-w-[440px] w-full mx-auto md:mx-0">
            {error && (
              <div className="mb-4">
                <AwsAlert
                  variant="error"
                  tone="outlined"
                  title="Authentication failed"
                  onDismiss={() => setError(null)}
                >
                  Your authentication information is incorrect. Please try again.
                </AwsAlert>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="bg-[#232c3a] border border-[#3c4451] rounded-md overflow-hidden"
            >
              <div className="px-6 pt-5 pb-3 border-b border-[#3c4451]">
                <h2 className="text-[18px] font-bold text-[#ffffff] inline-flex items-center gap-1.5">
                  Admin sign in <InfoCircle />
                </h2>
              </div>

              <div className="px-6 py-5 space-y-4">
                <Field
                  label="Username"
                  accessory={
                    <button
                      type="button"
                      className="text-[12px] text-[#88c4ff] underline decoration-dashed underline-offset-2"
                      onClick={(e) => e.preventDefault()}
                    >
                      (Don't have?)
                    </button>
                  }
                >
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputCls}
                    autoFocus
                  />
                </Field>

                <label className="flex items-center gap-2 text-[13px] text-[#d4d8db] select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="accent-[#88c4ff] w-4 h-4"
                  />
                  Remember this account
                </label>

                <Field label="Password">
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <div className="flex items-center justify-between text-[13px]">
                  <label className="flex items-center gap-2 text-[#d4d8db] select-none">
                    <input
                      type="checkbox"
                      checked={showPw}
                      onChange={(e) => setShowPw(e.target.checked)}
                      className="accent-[#88c4ff] w-4 h-4"
                    />
                    Show Password
                  </label>
                  <button
                    type="button"
                    className="text-[#88c4ff] underline decoration-dashed underline-offset-2"
                    onClick={(e) => e.preventDefault()}
                  >
                    Having trouble?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 rounded-[2px] bg-[#ff9900] hover:bg-[#ec7211] disabled:opacity-50 text-[#000000] font-bold text-[14px] transition-colors"
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </div>
            </form>

            <p className="mt-6 text-center text-[12px] text-[#8b949e]">
              Session lasts 24 hours of inactivity. Sign out manually from the top bar.
            </p>
          </div>

          {/* Right: promo panel */}
          <PromoPanel />
        </div>
      </div>

      <footer className="px-6 py-6 text-center text-[11px] text-[#6e7681]">
        © {new Date().getFullYear()} Emergent. AWS S3 Navigate is an admin-only
        view that proxies through app-service. No AWS credentials live in this app.
      </footer>
    </div>
  );
}

function Field({ label, accessory, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="block text-[13px] font-semibold text-[#ffffff]">{label}</label>
        {accessory}
      </div>
      {children}
    </div>
  );
}

function InfoCircle() {
  return (
    <svg className="w-[14px] h-[14px] text-[#88c4ff]" viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
    </svg>
  );
}

function PromoPanel() {
  return (
    <div className="w-full max-w-[520px] mx-auto md:mx-0 self-center">
      <div className="relative overflow-hidden rounded-md bg-gradient-to-br from-[#1c1816] via-[#2a1c12] to-[#5b2a0a] aspect-[16/10] flex flex-col justify-between p-7">
        <div>
          <h3 className="text-[28px] font-bold text-white leading-tight">
            Emergent S3 Navigate
          </h3>
          <p className="mt-3 text-[14px] text-white/85 max-w-[320px]">
            Browse, upload, and manage objects across all your buckets —
            without ever touching an AWS access key.
          </p>
        </div>
        <button
          type="button"
          className="self-start px-4 py-1.5 border border-white/70 text-white text-[13px] hover:bg-white/10 transition-colors rounded-[2px]"
          onClick={(e) => e.preventDefault()}
        >
          Learn more »
        </button>
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 bg-[#1a212d] border border-[#3c4451] rounded-[2px] ' +
  'text-[14px] text-[#ffffff] outline-none focus:border-[#88c4ff] ' +
  'focus:shadow-[0_0_0_3px_rgba(136,196,255,0.3)] placeholder:text-[#484f58] ' +
  'transition-shadow';
