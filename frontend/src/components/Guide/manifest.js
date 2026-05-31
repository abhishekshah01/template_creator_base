// Ordered list of guide pages. Source of truth for sidebar nav, breadcrumbs,
// and "Next →" links. The `id` matches the activePage value in App.jsx.

export const GUIDE_PAGES = [
  { id: 'guide-start',     title: 'Start Guide' },
  { id: 'guide-token',     title: 'Setup API Token' },
  { id: 'guide-create',    title: 'Create a Template' },
  { id: 'guide-configs',   title: 'Category Configs' },
  { id: 'guide-verify',    title: 'Verify a Template' },
  { id: 'guide-faq',       title: 'FAQ & Troubleshooting' },
];

export function nextPage(currentId) {
  const i = GUIDE_PAGES.findIndex(p => p.id === currentId);
  if (i < 0 || i >= GUIDE_PAGES.length - 1) return null;
  return GUIDE_PAGES[i + 1];
}

export function pageTitle(id) {
  return GUIDE_PAGES.find(p => p.id === id)?.title || '';
}
