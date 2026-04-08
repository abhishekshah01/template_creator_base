export default function ConfigDetail({ configId, onNavigate }) {
  return (
    <>
      <button onClick={() => onNavigate('config-all')}
        className="flex items-center gap-1 text-xs text-gh-text-secondary hover:text-gh-accent-blue-text transition-colors mb-4">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        Back to All Configs
      </button>

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-medium text-gh-text">Config Detail</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs text-gh-accent-red-text border border-gh-border rounded-md hover:bg-gh-accent-red/15 transition-colors">Delete</button>
          <button className="px-4 py-1.5 text-xs text-white bg-gh-btn-primary rounded-md hover:bg-gh-btn-primary-hover transition-colors font-medium">Save Changes</button>
        </div>
      </div>

      <div className="bg-gh-surface border border-gh-border rounded-md p-8 text-center">
        <div className="text-sm text-gh-text-secondary mb-2">Config ID: <span className="font-mono text-gh-text">{configId}</span></div>
        <p className="text-xs text-gh-text-muted">
          Detail/Edit view will be implemented here — same form layout as create, pre-populated with existing data.
        </p>
      </div>
    </>
  );
}
