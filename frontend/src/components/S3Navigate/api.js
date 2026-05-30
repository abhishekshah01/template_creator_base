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

export const s3api = {
  // Admin gate
  signIn: (username, password) => adminAuth.login(username, password),
  me: () => wrap(adminAuth.me()),
  signOut: () => adminAuth.logout(),

  // Browse
  listBuckets: () => api.listAssetBuckets(bearer()),
  listObjects: (bucket, prefix = '', continuationToken = null) =>
    api.listAssetObjects(bucket, prefix, continuationToken, bearer()),
  objectMeta: (bucket, key) => api.getAssetObjectMeta(bucket, key, bearer()),
  objectUrl: (bucket, key, download = false) =>
    api.getAssetDownloadUrl(bucket, key, bearer(), { download }),

  // Mutate
  uploadFile: (file, bucket, key) =>
    api.uploadAsset(file, bucket, key, bearer(), CLOUDFRONT_URL),
  deleteObject: (bucket, key) => api.deleteAsset(bucket, key, bearer()),
  invalidateCache: (path) =>
    api.invalidateAsset(CLOUDFRONT_DISTRIBUTION_ID, path, bearer()),
};

export { BUCKET, CLOUDFRONT_URL, CLOUDFRONT_DISTRIBUTION_ID };
