import AwsAlert2 from './AwsAlert2';
import AwsAlertSolid from './AwsAlertSolid';

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
        Insufficient permissions to {BUCKET_SCOPED_VERB[action]} s3bucket:{bucket}
      </>
    );
  }
  return `Insufficient permissions to ${ACTION_LABELS[action] || action}`;
}

export default function PermissionDeniedBanner({
  error,
  onRefresh,
  onDismiss,
  tone = 'outlined',
  className = '',
}) {
  if (!error) return null;
  const action = error.action || 'perform this action';
  const title = titleFor(action, error.resource);
  const body = (
    <>
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
    </>
  );

  const Shell = tone === 'solid' ? AwsAlertSolid : AwsAlert2;
  return (
    <Shell variant="error" title={title} onDismiss={onDismiss} className={className}>
      {body}
    </Shell>
  );
}

export { ACTION_LABELS };
