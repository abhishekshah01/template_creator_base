// CMS Portal scope — all actions land in this fixed bucket + prefix.
// Users supply only the relative path under the prefix.
export const CMS_BUCKET = 'emergent-frontend-assets';
export const CMS_PREFIX = 'assets/templates/';

// S3 path shown in the UI as a read-only prefix label.
export const CMS_S3_PREFIX_LABEL = `s3://${CMS_BUCKET}/${CMS_PREFIX}`;

// CloudFront distribution invalidations are issued against. One per env.
export { CLOUDFRONT_DISTRIBUTION_ID, CLOUDFRONT_URL } from '../S3Navigate/config';
