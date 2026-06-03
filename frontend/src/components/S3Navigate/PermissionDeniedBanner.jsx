import AwsAlert2 from './AwsAlert2';

const LINK_COLOR = '#45abfe';

const ACTION_LABELS = {
  'tc:s3:ListBuckets': 'list buckets',
  'tc:s3:GetBucketLocation': 'view bucket details',
  'tc:s3:ListBucket': 'list objects in this bucket',
  'tc:s3:GetObject': 'view this object',
  'tc:s3:PutObject': 'upload objects',
  'tc:s3:CreateFolder': 'create folders',
  'tc:s3:DeleteObject': 'delete objects',
  'tc:s3:InvalidateCache': 'invalidate the cache',
};

const BUCKET_SCOPED_LABEL = {
  'tc:s3:ListBucket':         (b) => `list objects in ${b}`,
  'tc:s3:GetBucketLocation':  (b) => `view details of ${b}`,
  'tc:s3:GetObject':          (b) => `view objects in ${b}`,
  'tc:s3:PutObject':          (b) => `upload objects to ${b}`,
  'tc:s3:CreateFolder':       (b) => `create folders in ${b}`,
  'tc:s3:DeleteObject':       (b) => `delete objects from ${b}`,
};

function bucketFromResource(resource) {
  const m = (resource || '').match(/^s3:\/\/([^/]+)/);
  if (!m) return null;
  const bucket = m[1];
  return bucket && bucket !== '*' ? bucket : null;
}

function labelFor(action, resource) {
  const bucket = bucketFromResource(resource);
  if (bucket && BUCKET_SCOPED_LABEL[action]) return BUCKET_SCOPED_LABEL[action](bucket);
  return ACTION_LABELS[action] || action;
}

export default function PermissionDeniedBanner({ error, onRefresh, className = '' }) {
  if (!error) return null;
  const action = error.action || 'perform this action';
  const label = labelFor(action, error.resource);
  return (
    <AwsAlert2
      variant="error"
      title={`You don't have permissions to ${label}`}
      className={className}
    >
      After you or your administrator has updated your permissions to allow the{' '}
      <code style={{ fontFamily: 'inherit', fontWeight: 600 }}>{action}</code> action,{' '}
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          className="underline underline-offset-2 hover:opacity-90"
          style={{ color: LINK_COLOR }}
        >
          refresh this page
        </button>
      ) : (
        'refresh this page'
      )}
      .
    </AwsAlert2>
  );
}

export { ACTION_LABELS };
