import AwsAlert2 from './AwsAlert2';
import AwsAlertSolid from './AwsAlertSolid';

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

const LINK_COLOR = '#45abfe';

export default function PermissionDeniedBanner({ error, onRefresh, tone = 'outlined', className = '' }) {
  if (!error) return null;
  const action = error.action || 'perform this action';
  const label = ACTION_LABELS[action] || action;
  const title = `You don't have permissions to ${label}`;
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

  if (tone === 'solid') {
    return (
      <AwsAlertSolid variant="error" title={title} className={className}>
        {body}
      </AwsAlertSolid>
    );
  }
  return (
    <AwsAlert2 variant="error" title={title} className={className}>
      {body}
    </AwsAlert2>
  );
}

export { ACTION_LABELS };
