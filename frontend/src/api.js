const BASE = '/api';

async function request(path, body) {
  const resp = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (!resp.ok) throw new Error(data.detail || data.message || `Request failed (${resp.status})`);
  return data;
}

export const api = {
  getJobInfo: (jobId) => request('/job-info', { job_id: jobId }),
  getCollections: (jobId) => request('/collections', { job_id: jobId }),
  deleteCollections: (jobId, dbName, collections) =>
    request('/delete-collections', { job_id: jobId, db_name: dbName, collections }),
  pauseJob: (jobId) => request('/pause-job', { job_id: jobId }),
  createTemplate: (jobId, userId, templateName) =>
    request('/create-template', { job_id: jobId, user_id: userId, template_name: templateName }),
};
