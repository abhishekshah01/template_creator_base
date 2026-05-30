import { useState } from 'react';

import { s3api } from './api';

// Admin sign-in gate for AWS S3 Navigate. Single shared admin credential.
// Token is stored in localStorage (sliding 24h TTL on the backend).
export default function SignIn({ onSignedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
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
    <div className="min-h-[calc(100vh-4rem)] -mx-6 -my-8 bg-[#0f1419] text-[#e9ecef] flex flex-col items-center justify-center">
      {/* Emergent "e" mark */}
      <img
        src="https://assets.emergent.sh/assets/elogo.gif"
        alt="Emergent"
        className="h-[64px] w-auto select-none mb-8"
        draggable={false}
      />

      <div className="w-full max-w-[420px] px-6">
        {error && (
          <div className="mb-4 rounded border border-[#da3633]/40 bg-[#da3633]/10 px-4 py-3 text-[14px] text-[#f85149]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}
          className="bg-[#161b22] border border-[#30363d] rounded-md overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-[#30363d]">
            <h2 className="text-[18px] font-bold text-[#e6edf3]">
              AWS S3 Navigate — Admin sign in
            </h2>
            <p className="text-[12px] text-[#8b949e] mt-1">
              Only admins can browse buckets directly.
            </p>
          </div>

          <div className="px-6 py-5 space-y-4">
            <Field label="Username">
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className={inputCls}
                autoFocus
              />
            </Field>

            <Field label="Password">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`${inputCls} pr-10`}
                />
                <button type="button"
                  onClick={() => setShowPw(s => !s)}
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[11px] text-[#8b949e] hover:text-[#e6edf3]">
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white font-semibold text-[14px] transition-colors">
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-[12px] text-[#8b949e]">
          Session lasts 24 hours of inactivity. Sign out manually from the top bar.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-[#e6edf3] mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-md ' +
  'text-[14px] text-[#e6edf3] outline-none focus:border-[#1f6feb] ' +
  'focus:shadow-[0_0_0_3px_rgba(31,111,235,0.3)] placeholder:text-[#484f58] ' +
  'transition-shadow';
