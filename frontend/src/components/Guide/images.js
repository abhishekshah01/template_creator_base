// Central image registry for the guide.
//
// To populate the guide with real screenshots:
//   1. Upload PNGs to S3 (or any CDN) using the filenames listed below.
//   2. Set IMAGES_BASE_URL to the bucket's public base URL, e.g.
//      'https://my-bucket.s3.amazonaws.com/template-guide'.
//      No trailing slash.
//   3. Refresh the app. Every <Screenshot name="..." /> resolves to a real
//      image; any name not yet uploaded keeps showing the placeholder card.
//
// To rename a file: just change the value (the filename) below — don't change
// the key, since the content files reference keys.

export const IMAGES_BASE_URL = 'https://assets.emergent.sh/assets/template-automation/docs';

const IMAGES = {
  // Start Guide
  'start-sidebar':                 'start-guide-01.png',

  // Setup API Token
  'setup-token-1-signed-in':       'setup-api-token-01.png',
  'setup-token-2-inspector-open':  'setup-api-token-02.png',
  'setup-token-3-network-empty':   'setup-api-token-03.png',
  'setup-token-4-network-filtered':'setup-api-token-04.png',
  'setup-token-5-auth-header':     'setup-api-token-05.png',
  'setup-paste-settings':          'setup-api-token-06.png',

  // Create a Template
  'create-overview':               'create-template-01.png',
  'create-step1':                  'create-template-02.png',
  'create-step2-has-live':         'create-template-03.png',
  'create-step2-never-deployed':   'create-template-04.png',
  'create-step3-collections':      'create-template-05.png',
  'create-step3-mongosh':          'create-template-06.png',
  'create-step4-success':          'create-template-07.png',

  // Category Configs
  'configs-all-list':              'category-configs-01.png',
  'configs-create-form':           'category-configs-02.png',
  'configs-summary-result':        'category-configs-03.png',

  // Verify a Template
  'verify-search-hit':             'verify-template-01.png',
};

export function imageUrl(name) {
  if (!IMAGES_BASE_URL || !IMAGES[name]) return null;
  return `${IMAGES_BASE_URL}/${IMAGES[name]}`;
}
