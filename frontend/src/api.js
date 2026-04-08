const BASE = '/api';

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

async function request(path, body) {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (resp.status === 401 || resp.status === 403) {
    throw new AuthError('Token expired or invalid. Please update your API token in the sidebar.');
  }
  if (!resp.ok) throw new Error(data.detail || data.message || `Request failed (${resp.status})`);
  return data;
}

export { AuthError };

export const api = {
  getJobInfo: (jobId) => request('/job-info', { job_id: jobId }),
  getCollections: (jobId) => request('/collections', { job_id: jobId }),
  deleteCollections: (jobId, dbName, collections) =>
    request('/delete-collections', { job_id: jobId, db_name: dbName, collections }),
  pauseJob: (jobId) => request('/pause-job', { job_id: jobId }),
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
};
