export default function ProgressBar({ currentStep, totalSteps = 4 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-[11px] text-slate-500">Start</span>
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        let bg = 'bg-slate-700';
        if (step < currentStep) bg = 'bg-green-500';
        else if (step === currentStep) bg = 'bg-blue-500';
        return <div key={step} className={`flex-1 h-[3px] rounded-full transition-all duration-400 ${bg}`} />;
      })}
      <span className="text-[11px] text-slate-500">Done</span>
    </div>
  );
}
