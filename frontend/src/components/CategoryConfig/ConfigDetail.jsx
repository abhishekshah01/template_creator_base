export default function ConfigDetail({ configId, onNavigate }) {
  return (
    <>
      <button onClick={() => onNavigate('config-all')}
        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-4">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        Back to All Configs
      </button>

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-medium">Config Detail</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs text-red-400 border border-red-500/30 rounded-lg hover:bg-red-950/30 transition-colors">Delete</button>
          <button className="px-4 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium">Save Changes</button>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
        <div className="text-sm text-slate-400 mb-2">Config ID: <span className="font-mono text-slate-200">{configId}</span></div>
        <p className="text-xs text-slate-500">
          Detail/Edit view will be implemented here — same form layout as create, pre-populated with existing data.
        </p>
      </div>
    </>
  );
}
