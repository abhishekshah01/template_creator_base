const BASE = '/api';

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

function sanitizeErrorMessage(text, status) {
  if (!text) return `Request failed (${status})`;
  // Strip HTML responses (e.g. 404 pages from reverse proxies)
  if (text.includes('<html') || text.includes('<!DOCTYPE')) {
    const titleMatch = text.match(/<title>([^<]*)<\/title>/i);
    const h1Match = text.match(/<h1>([^<]*)<\/h1>/i);
    const clean = titleMatch?.[1] || h1Match?.[1] || `${status} error`;
    return clean.trim();
  }
  return text;
}

async function request(path, body) {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: sanitizeErrorMessage(text, resp.status) }; }
  if (resp.status === 401 || resp.status === 403) {
    throw new AuthError('Token expired or invalid. Please update your API token in the sidebar.');
  }
  if (!resp.ok) {
    const raw = data.detail || data.message || `Request failed (${resp.status})`;
    throw new Error(sanitizeErrorMessage(raw, resp.status));
  }
  return data;
}

export { AuthError };

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
    request('/create-template', { job_id: jobId, user_id: userId, template_name: templateName }),
  getEnvVariables: (jobId) => request('/env-variables', { job_id: jobId }),
  getCollectionData: (jobId, dbName, collectionName, limit = 20) =>
    request('/collection-data', { job_id: jobId, db_name: dbName, collection_name: collectionName, limit }),
  runMongosh: (jobId, dbName, command) =>
    request('/mongosh', { job_id: jobId, db_name: dbName, command }),
  createCategoryConfig: (payload) => request('/category-config', payload),
  generateTemplateSummary: (templateName, bearerToken) =>
    request('/template-summary', { template_name: templateName, bearer_token: bearerToken }),
  listCategoryConfigs: (bearerToken) =>
    request('/list-category-configs', { bearer_token: bearerToken }),
  getEnvironments: () => fetch('/api/environments').then(r => r.json()),
  switchEnvironment: (envName) => request('/switch-environment', { env_name: envName }),
  getCategoryConfig: (configId, bearerToken) =>
    request('/get-category-config', { config_id: String(configId), bearer_token: bearerToken }),
  updateCategoryConfig: (payload) => request('/update-category-config', payload),
};
