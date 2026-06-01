// AWS S3 Navigate design tokens. Source of truth for colors, font, and radii
// used across BucketList / ObjectList / AdminsPage / ObjectDetail. All section
// components should import from here instead of hardcoding hex values.

export const colors = {
  bg: {
    page: '#0d1117',         // matches the rest of the app (gh-canvas)
    card: '#161b22',         // matches gh-canvas-subtle
    rowSelected: '#002c3c',  // AWS-blue selected row fill (keep)
  },
  border: {
    rowSeparator: '#ebebf0', // thin light divider between rows
    buttonInactive: '#444a4d',
    buttonActive: '#005bbc',
    rowSelected: '#45abfe',  // bright blue ring around selected rows
    inputDefault: '#8c8c95',
    primaryButton: '#b36b00',
    cardOutline: '#c6c6cd',  // outer panel border
  },
  text: {
    primary: '#ffffff',
    selectedRow: '#dbd8d3',
    tableHeader: '#dbd8d3',     // column headers (slightly dimmer than body)
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

