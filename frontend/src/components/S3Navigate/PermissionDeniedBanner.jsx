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

const BUCKET_SCOPED_VERB = {
  'tc:s3:ListBucket':        'list objects in',
  'tc:s3:GetBucketLocation': 'view details of',
  'tc:s3:GetObject':         'view objects in',
  'tc:s3:PutObject':         'upload objects to',
  'tc:s3:CreateFolder':      'create folders in',
  'tc:s3:DeleteObject':      'delete objects from',
};

function bucketFromResource(resource) {
  const m = (resource || '').match(/^s3:\/\/([^/]+)/);
  if (!m) return null;
  const bucket = m[1];
  return bucket && bucket !== '*' ? bucket : null;
}

function titleFor(action, resource) {
  const bucket = bucketFromResource(resource);
  if (bucket && BUCKET_SCOPED_VERB[action]) {
    return (
      <>
        You don't have permissions to {BUCKET_SCOPED_VERB[action]}{' '}
        <code style={{ fontFamily: 'inherit', fontWeight: 700 }}>
          s3:bucket:{bucket}
        </code>
      </>
    );
  }
  return `You don't have permissions to ${ACTION_LABELS[action] || action}`;
}

export default function PermissionDeniedBanner({ error, onRefresh, className = '' }) {
  if (!error) return null;
  const action = error.action || 'perform this action';
  return (
    <AwsAlert2
      variant="error"
      title={titleFor(action, error.resource)}
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
