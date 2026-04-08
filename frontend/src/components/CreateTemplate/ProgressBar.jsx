export default function ProgressBar({ currentStep, totalSteps = 4 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-[11px] text-gh-text-muted">Start</span>
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        let bg = 'bg-gh-overlay';
        if (step < currentStep) bg = 'bg-gh-accent-green';
        else if (step === currentStep) bg = 'bg-gh-accent-blue';
        return <div key={step} className={`flex-1 h-[3px] rounded-full transition-all duration-400 ${bg}`} />;
      })}
      <span className="text-[11px] text-gh-text-muted">Done</span>
    </div>
  );
}
