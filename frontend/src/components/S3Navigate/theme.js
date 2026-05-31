// AWS S3 Navigate design tokens. Source of truth for colors, font, and radii
// used across BucketList / ObjectList / AdminsPage / ObjectDetail. All section
// components should import from here instead of hardcoding hex values.

export const colors = {
  bg: {
    page: '#1a1c1d',         // outer page canvas
    card: '#181a1b',         // panel / card surface + inactive button fill
    rowSelected: '#002c3c',  // selected table row inner fill
  },
  border: {
    rowSeparator: '#ebebf0', // thin light divider between rows
    buttonInactive: '#444a4d',
    buttonActive: '#005bbc',
    rowSelected: '#016ce0',
    inputDefault: '#8c8c95',
    primaryButton: '#b36b00',
  },
  text: {
    primary: '#ffffff',
    selectedRow: '#dbd8d3',
    info: '#bab4ab',            // helper / description copy
    placeholder: '#5e5c56',     // italic search placeholder
    buttonInactive: '#a2998d',
    buttonActive: '#45abfe',
    primaryButton: '#dbd8d3',
  },
  icon: {
    search: '#a49d91',
    buttonInactive: '#a2998d',
    buttonActive: '#45abfe',
  },
  fill: {
    primaryButton: '#cc7a00',   // Upload / Create — orange
  },
};

// Pill-button radius, matches Cloudscape "normal" button shape.
export const radii = {
  pill: '20px',
  input: '8px',
};

// Wired into index.css via @font-face declarations. Inside the .aws-s3-section
// scope this becomes the default font-family.
export const fontStack = "'Amazon Ember', 'Helvetica Neue', system-ui, -apple-system, sans-serif";
export const baseFontSize = '14px';
