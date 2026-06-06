// Local client for the S3 browser. Wraps the existing api.* helpers (which
// proxy to app-service /internal/templates/s3/*) and the auth gate.
//
// All authed routes require both:
//   - bearer_token: the template-creator API token (already in localStorage)
//   - auth token  : minted by /api/auth/login (the S3 Navigate session gate)

import { api, authGate, AuthGateError } from '../../api';
import { BUCKET, CLOUDFRONT_URL, CLOUDFRONT_DISTRIBUTION_ID } from './config';

export class GateError extends Error {
  constructor(message) { super(message); this.name = 'GateError'; }
}

function bearer() {
  return localStorage.getItem('bearer_token') || '';
}

function wrap(promise) {
  return promise.catch(err => {
    if (err instanceof AuthGateError) throw new GateError(err.message);
    throw err;
  });
}

async function gateFetch(path, opts = {}) {
  const token = authGate.getToken();
  const headers = { ...(opts.headers || {}) };
  if (token) headers['X-Auth-Token'] = token;
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const resp = await fetch(`/api/auth${path}`, { ...opts, headers });
  const text = await resp.text();
  let data; try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (resp.status === 401) {
    authGate.setToken('');
    throw new GateError(data.detail || data.message || 'Session expired');
  }
  if (!resp.ok) throw new Error(data.detail || data.message || `Request failed (${resp.status})`);
  return data;
}

export const s3api = {
  signIn: (account, username, password) => authGate.login(account, username, password),
  me: () => wrap(authGate.me()),
  signOut: () => authGate.logout(),

  // User management — uses the gate token; bounces to sign-in on 401.
  listUsers: () => gateFetch('/users'),
  createUser: (payload) => gateFetch('/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, patches) =>
    gateFetch(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patches) }),
  resetUserPassword: (id, newPassword) =>
    gateFetch(`/users/${encodeURIComponent(id)}/password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    }),

  // Browse — `force` bypasses the backend 30s TTL cache and refills it.
  listBuckets: (force = false) => api.listAssetBuckets(bearer(), force),
  listObjects: (bucket, prefix = '', continuationToken = null, force = false) =>
    api.listAssetObjects(bucket, prefix, continuationToken, bearer(), force),
  objectMeta: (bucket, key, force = false) => api.getAssetObjectMeta(bucket, key, bearer(), force),
  objectUrl: (bucket, key, download = false) =>
    api.getAssetDownloadUrl(bucket, key, bearer(), { download }),

  // Mutate
  uploadFile: (file, bucket, key) =>
    api.uploadAsset(file, bucket, key, bearer(), CLOUDFRONT_URL),
  uploadObject: (file, bucket, key, onProgress, signal) =>
    api.uploadAssetObject(file, bucket, key, bearer(), onProgress, signal),
  createFolder: (bucket, key) => api.createAssetFolder(bucket, key, bearer()),
  deleteObject: (bucket, key) => api.deleteAsset(bucket, key, bearer()),
  invalidateCache: (path) =>
    api.invalidateAsset(CLOUDFRONT_DISTRIBUTION_ID, path, bearer()),
};

export { BUCKET, CLOUDFRONT_URL, CLOUDFRONT_DISTRIBUTION_ID };

// Re-export so existing components can `import { getToken } from './api'`
export const getToken = () => authGate.getToken();
