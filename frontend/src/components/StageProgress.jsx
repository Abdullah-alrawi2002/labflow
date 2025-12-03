import React from 'react';

const STAGES = [
  { id: 'brainstorm', label: 'Brainstorm', icon: '💡' },
  { id: 'experiment', label: 'Experiment', icon: '🧪' },
  { id: 'write', label: 'Write', icon: '✍️' },
  { id: 'publish', label: 'Publish', icon: '🚀' },
];

export default function StageProgress({ currentStage, onStageChange }) {
  const activeStage = STAGES.find((stage) => stage.id === currentStage)?.id || STAGES[0].id;
  const currentIndex = STAGES.findIndex((stage) => stage.id === activeStage);

  return (
    <div className="flex items-center gap-4">
      {STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const circleColor = isCompleted || isCurrent ? 'bg-primary-500' : 'bg-gray-200';
        const lineColor = index < currentIndex ? 'bg-primary-500' : 'bg-gray-200';

        return (
          <div key={stage.id} className="flex items-center flex-1">
            <button
              onClick={() => onStageChange?.(stage.id)}
              className={`flex flex-col items-start text-left transition-colors ${
                isCurrent ? 'text-primary-600' : isCompleted ? 'text-gray-800' : 'text-gray-400'
              }`}
            >
              <span className={`w-3 h-3 rounded-full mb-2 ${circleColor}`} aria-hidden />
              <span className="text-xs font-semibold tracking-wide uppercase">{stage.label}</span>
              <span className="text-[11px] text-gray-400">{stage.icon} {isCurrent ? 'Current stage' : 'Select stage'}</span>
            </button>

            {index < STAGES.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 rounded-full ${lineColor}`} aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
