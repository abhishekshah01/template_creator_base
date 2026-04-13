const BASE = '/api';
const V2 = '/api/v2';

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
  }
}

// --- Flow / request correlation ---------------------------------------------
// A "flow" is one user-perceived action that spans multiple HTTP calls
// (e.g. inspect → drop collections → pause → create template).
// Set it once at the start of such a flow; api.request() will attach it
// as X-Flow-Id on every call until it's cleared.
let _currentFlowId = null;

export function newFlowId() {
  // 16 hex chars — short enough to read, long enough to avoid collisions.
  const rand = crypto.getRandomValues(new Uint8Array(8));
  return 'flow_' + Array.from(rand, b => b.toString(16).padStart(2, '0')).join('');
}

export function startFlow() {
  _currentFlowId = newFlowId();
  return _currentFlowId;
}

export function currentFlowId() {
  return _currentFlowId;
}

export function clearFlow() {
  _currentFlowId = null;
}

// ----------------------------------------------------------------------------

async function request(path, body, { method = 'POST', base = BASE } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (_currentFlowId) headers['X-Flow-Id'] = _currentFlowId;

  const init = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);

  const resp = await fetch(`${base}${path}`, init);
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (resp.status === 401 || resp.status === 403) {
    throw new AuthError('Token expired or invalid. Please update your API token in the sidebar.');
  }
  if (!resp.ok) throw new Error(data.detail || data.message || `Request failed (${resp.status})`);
  return data;
}

async function getJson(url, { base = BASE } = {}) {
  const headers = {};
  if (_currentFlowId) headers['X-Flow-Id'] = _currentFlowId;
  const resp = await fetch(`${base}${url}`, { headers });
  if (!resp.ok) throw new Error(`Request failed (${resp.status})`);
  return resp.json();
}

export { AuthError };

export const api = {
  // v1 — existing
  getJobInfo: (jobId, bearerToken) => request('/job-info', { job_id: jobId, bearer_token: bearerToken || '' }),
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
  getEnvironments: () => fetch('/api/environments').then(r => r.json()),
  switchEnvironment: (envName) => request('/switch-environment', { env_name: envName }),
  getCategoryConfig: (configId, bearerToken) =>
    request('/get-category-config', { config_id: String(configId), bearer_token: bearerToken }),
  updateCategoryConfig: (payload) => request('/update-category-config', payload),

  // v2 — logs/events/observability
  listEvents: (params = {}) => getJson('/events?' + new URLSearchParams(params), { base: V2 }),
  getEvent: (id) => getJson(`/events/${id}`, { base: V2 }),
  listLogs: (params = {}) => getJson('/logs?' + new URLSearchParams(params), { base: V2 }),
  logsSummary: (window = '1h') => getJson(`/logs/summary?window=${window}`, { base: V2 }),
  eventsByFlow: (flowId) => getJson(`/events/by-flow/${flowId}`, { base: V2 }),
  postClientLog: (payload) => request('/client-logs', payload, { base: V2 }),
};

// ---------------------------------------------------------------------------
// Global browser error reporter — catches unhandled JS errors + rejections
// and ships them to /api/v2/client-logs. Throttled + queued so a reporting
// failure doesn't loop.
// ---------------------------------------------------------------------------

let _lastReportTs = 0;
const REPORT_INTERVAL_MS = 500;

function shouldThrottle() {
  const now = Date.now();
  if (now - _lastReportTs < REPORT_INTERVAL_MS) return true;
  _lastReportTs = now;
  return false;
}

async function reportClientError(payload) {
  if (shouldThrottle()) return;
  try {
    await api.postClientLog({
      ...payload,
      url: window.location.href,
      user_agent: navigator.userAgent,
      flow_id: _currentFlowId || undefined,
    });
  } catch {
    // swallow — never retry a logging failure
  }
}

if (typeof window !== 'undefined' && !window.__tc_error_reporter_installed) {
  window.__tc_error_reporter_installed = true;

  window.addEventListener('error', (event) => {
    reportClientError({
      level: 'error',
      message: event.message || 'Uncaught error',
      source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : 'window.onerror',
      stack: event.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportClientError({
      level: 'error',
      message: (reason && (reason.message || String(reason))) || 'Unhandled promise rejection',
      source: 'unhandledrejection',
      stack: reason?.stack,
    });
  });
}
