// Local client for the S3 browser. Wraps the existing api.* helpers (which
// proxy to app-service /internal/s3-templates/*) and the admin-auth gate.
//
// All authed routes require both:
//   - bearer_token: the template-creator API token (already in localStorage)
//   - admin token : minted by /api/admin-auth/login (only checked for UI gate)

import { api, adminAuth, AdminAuthError } from '../../api';
import { BUCKET, CLOUDFRONT_URL, CLOUDFRONT_DISTRIBUTION_ID } from './config';

export class GateError extends Error {
  constructor(message) { super(message); this.name = 'GateError'; }
}

function bearer() {
  return localStorage.getItem('bearer_token') || '';
}

function wrap(promise) {
  return promise.catch(err => {
    if (err instanceof AdminAuthError) throw new GateError(err.message);
    throw err;
  });
}

async function adminFetch(path, opts = {}) {
  const token = adminAuth.getToken();
  const headers = { ...(opts.headers || {}) };
  if (token) headers['X-Admin-Token'] = token;
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const resp = await fetch(`/api/admin-auth${path}`, { ...opts, headers });
  const text = await resp.text();
  let data; try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (resp.status === 401) {
    adminAuth.setToken('');
    throw new GateError(data.detail || data.message || 'Session expired');
  }
  if (!resp.ok) throw new Error(data.detail || data.message || `Request failed (${resp.status})`);
  return data;
}

export const s3api = {
  signIn: (account, username, password) => adminAuth.login(account, username, password),
  me: () => wrap(adminAuth.me()),
  signOut: () => adminAuth.logout(),

  // Admin user management — uses the gate token; bounces to sign-in on 401.
  listAdmins: () => adminFetch('/users'),
  createAdmin: (payload) => adminFetch('/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateAdmin: (id, patches) =>
    adminFetch(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patches) }),
  resetAdminPassword: (id, newPassword) =>
    adminFetch(`/users/${encodeURIComponent(id)}/password`, {
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
  // Upload a file through the backend (server-side S3 PUT, no browser CORS).
  uploadObject: (file, bucket, key, onProgress) =>
    api.uploadAssetObject(file, bucket, key, bearer(), onProgress),
  // Create a folder server-side (app-service writes the zero-byte marker).
  createFolder: (bucket, key) => api.createAssetFolder(bucket, key, bearer()),
  deleteObject: (bucket, key) => api.deleteAsset(bucket, key, bearer()),
  invalidateCache: (path) =>
    api.invalidateAsset(CLOUDFRONT_DISTRIBUTION_ID, path, bearer()),
};

export { BUCKET, CLOUDFRONT_URL, CLOUDFRONT_DISTRIBUTION_ID };

// Re-export so existing components can `import { getToken } from './api'`
export const getToken = () => adminAuth.getToken();
