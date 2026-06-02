const BASE = '/api';

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

class PermissionDeniedError extends Error {
  constructor({ action, resource, reason }) {
    super(`Permission denied: ${action} on ${resource}`);
    this.name = 'PermissionDeniedError';
    this.action = action;
    this.resource = resource;
    this.reason = reason;
  }
}

function sanitizeErrorMessage(text, status) {
  if (!text) return `Request failed (${status})`;
  if (text.includes('<html') || text.includes('<!DOCTYPE')) {
    const titleMatch = text.match(/<title>([^<]*)<\/title>/i);
    const h1Match = text.match(/<h1>([^<]*)<\/h1>/i);
    const clean = titleMatch?.[1] || h1Match?.[1] || `${status} error`;
    return clean.trim();
  }
  return text;
}

async function request(path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const adminToken = localStorage.getItem('admin_auth_token') || '';
  if (adminToken) headers['X-Admin-Token'] = adminToken;

  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: sanitizeErrorMessage(text, resp.status) }; }
  if (resp.status === 403 && data?.detail?.error === 'permission_denied') {
    throw new PermissionDeniedError(data.detail);
  }
  if (resp.status === 401 || resp.status === 403) {
    throw new AuthError('Token expired or invalid. Please update your API token in the sidebar.');
  }
  if (!resp.ok) {
    const raw = data.detail || data.message || `Request failed (${resp.status})`;
    throw new Error(sanitizeErrorMessage(raw, resp.status));
  }
  return data;
}

export { AuthError, PermissionDeniedError };

// ---------------------------------------------------------------------------
// Admin auth gate (AWS S3 Navigate UI)
// ---------------------------------------------------------------------------

const ADMIN_TOKEN_KEY = 'admin_auth_token';

export class AdminAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AdminAuthError';
  }
}

export const adminAuth = {
  getToken: () => localStorage.getItem(ADMIN_TOKEN_KEY) || '',
  setToken: (t) => {
    if (t) localStorage.setItem(ADMIN_TOKEN_KEY, t);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  login: async (account, username, password) => {
    const resp = await fetch('/api/admin-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, username, password }),
    });
    const text = await resp.text();
    let data; try { data = JSON.parse(text); } catch { data = { message: text }; }
    if (!resp.ok) throw new AdminAuthError(data.detail || data.message || 'Login failed');
    localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    return data;
  },

  me: async () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    const resp = await fetch('/api/admin-auth/me', { headers: { 'X-Admin-Token': token } });
    if (resp.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      throw new AdminAuthError('Session expired');
    }
    if (!resp.ok) throw new AdminAuthError(`me failed (${resp.status})`);
    return resp.json();
  },

  logout: async () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    try {
      await fetch('/api/admin-auth/logout', {
        method: 'POST',
        headers: { 'X-Admin-Token': token },
      });
    } catch { /* swallow */ }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  },
};

export const api = {
  getJobInfo: (jobId, bearerToken) => request('/job-info', { job_id: jobId, bearer_token: bearerToken || '' }),
  getCollections: (jobId) => request('/collections', { job_id: jobId }),
  deleteCollections: (jobId, dbName, collections) =>
    request('/delete-collections', { job_id: jobId, db_name: dbName, collections }),
  pauseJob: (jobId) => request('/pause-job', { job_id: jobId }),
  restartJob: (jobId, bearerToken) => request('/restart-job', { job_id: jobId, bearer_token: bearerToken || '' }),
  deployApp: (jobId, bearerToken) => request('/deploy-app', { job_id: jobId, bearer_token: bearerToken || '' }),
  getDeployStatus: (jobId, bearerToken) => request('/deploy-status', { job_id: jobId, bearer_token: bearerToken || '' }),
  getDeployHistory: (jobId, bearerToken) => request('/deploy-history', { job_id: jobId, bearer_token: bearerToken || '' }),
  createTemplate: (jobId, userId, templateName) =>
    request('/create-template', {
      job_id: jobId,
      user_id: userId,
      template_name: templateName,
    }),
  getTemplateJob: (dagRunId) =>
    fetch(`/api/template-job/${encodeURIComponent(dagRunId)}`).then(async r => {
      const text = await r.text();
      let data; try { data = JSON.parse(text); } catch { data = {}; }
      if (!r.ok) throw new Error(data.detail || data.message || `Status check failed (${r.status})`);
      return data;
    }),
  getEnvVariables: (jobId) => request('/env-variables', { job_id: jobId }),
  getCollectionData: (jobId, dbName, collectionName, limit = 20) =>
    request('/collection-data', { job_id: jobId, db_name: dbName, collection_name: collectionName, limit }),
  runMongosh: (jobId, dbName, command) =>
    request('/mongosh', { job_id: jobId, db_name: dbName, command }),
  createCategoryConfig: (payload) => request('/category-config', payload),
  generateTemplateSummary: (templateName, bearerToken) =>
    request('/template-summary', { template_name: templateName, bearer_token: bearerToken }),
  listCategoryConfigs: (bearerToken, force = false) =>
    request('/list-category-configs', { bearer_token: bearerToken, force }),
  getEnvironments: () => fetch('/api/environments').then(r => r.json()),
  switchEnvironment: (envName) => request('/switch-environment', { env_name: envName }),
  getCategoryConfig: (configId, bearerToken) =>
    request('/get-category-config', { config_id: String(configId), bearer_token: bearerToken }),
  updateCategoryConfig: (payload) => request('/update-category-config', payload),

  // S3 / CloudFront — proxied to app-service /internal/s3-templates
  getAssetUploadUrl: (bucket, key, contentType, bearerToken) =>
    request('/asset/upload-url', {
      bucket, key, content_type: contentType || 'application/octet-stream', bearer_token: bearerToken,
    }),
  deleteAsset: (bucket, key, bearerToken) =>
    request('/asset/delete', { bucket, key, bearer_token: bearerToken }),
  invalidateAsset: (cloudfrontDistributionId, path, bearerToken) =>
    request('/asset/invalidate', {
      cloudfront_distribution_id: cloudfrontDistributionId, path, bearer_token: bearerToken,
    }),
  listAssetBuckets: (bearerToken, force = false) =>
    request('/asset/buckets', { bearer_token: bearerToken, force }),
  listAssetObjects: (bucket, prefix, continuationToken, bearerToken, force = false) =>
    request('/asset/objects', {
      bucket, prefix: prefix || '', continuation_token: continuationToken || null, bearer_token: bearerToken, force,
    }),
  getAssetObjectMeta: (bucket, key, bearerToken, force = false) =>
    request('/asset/object-meta', { bucket, key, bearer_token: bearerToken, force }),
  getAssetDownloadUrl: (bucket, key, bearerToken, opts = {}) =>
    request('/asset/download-url', {
      bucket, key,
      expiration_minutes: opts.expirationMinutes || 5,
      download: opts.download || false,
      bearer_token: bearerToken,
    }),

  // Convenience: upload a File directly (mint URL + PUT bytes), returns the public CDN URL.
  uploadAsset: async (file, bucket, key, bearerToken, cloudfrontUrl) => {
    const signed = await request('/asset/upload-url', {
      bucket, key, content_type: file.type || 'application/octet-stream', bearer_token: bearerToken,
    });
    const putResp = await fetch(signed.upload_url, {
      method: 'PUT',
      headers: signed.headers || { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });
    if (!putResp.ok) throw new Error(`S3 PUT failed (${putResp.status})`);
    const publicUrl = cloudfrontUrl ? `${cloudfrontUrl.replace(/\/$/, '')}/${key}` : signed.public_url;
    return { key, public_url: publicUrl, etag: putResp.headers.get('ETag') };
  },
};
