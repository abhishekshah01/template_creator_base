import { FileText } from './Icons';

export default function TemplateSummary() {
  return (
    <div className="text-center py-16 px-5">
      <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
        <FileText className="w-6 h-6 text-slate-500" />
      </div>
      <h2 className="text-base font-medium text-slate-400 mb-2">Template Summary</h2>
      <p className="text-sm text-slate-600 max-w-sm mx-auto">
        Generate and manage template summaries with metadata, descriptions, and configuration details.
      </p>
    </div>
  );
}
