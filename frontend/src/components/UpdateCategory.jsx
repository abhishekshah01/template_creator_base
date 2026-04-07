import { Settings } from './Icons';

export default function UpdateCategory() {
  return (
    <div className="text-center py-16 px-5">
      <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Settings className="w-6 h-6 text-slate-500" />
      </div>
      <h2 className="text-base font-medium text-slate-400 mb-2">Update Category Config</h2>
      <p className="text-sm text-slate-600 max-w-sm mx-auto">
        Send category configuration updates via POST request with custom JSON payload.
      </p>
    </div>
  );
}
