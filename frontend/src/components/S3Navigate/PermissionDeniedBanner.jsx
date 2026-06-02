import AwsAlertSolid from './AwsAlertSolid';
import { colors } from './theme';

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

export default function PermissionDeniedBanner({ error, onRefresh, className = '' }) {
  if (!error) return null;
  const action = error.action || 'perform this action';
  const label = ACTION_LABELS[action] || action;
  return (
    <AwsAlertSolid
      variant="error"
      title={`You don't have permissions to ${label}`}
      className={className}
    >
      Your administrator must grant you{' '}
      <code style={{ fontFamily: 'inherit', fontWeight: 600 }}>{action}</code>{' '}
      to perform this action.
      {onRefresh && (
        <>
          {' '}After you obtain the necessary permission, choose{' '}
          <button
            type="button"
            onClick={onRefresh}
            className="underline underline-offset-2 hover:opacity-90"
            style={{ color: colors.text.primary, fontWeight: 600 }}
          >
            Refresh
          </button>
          .
        </>
      )}
    </AwsAlertSolid>
  );
}

export { ACTION_LABELS };
