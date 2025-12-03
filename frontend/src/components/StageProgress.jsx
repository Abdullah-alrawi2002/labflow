import React from 'react';

const STAGES = [
  { id: 'brainstorm', label: 'Brainstorm', color: 'bg-primary-500' },
  { id: 'experiment', label: 'Experiment', color: 'bg-primary-500' },
  { id: 'write', label: 'Write', color: 'bg-amber-400' },
  { id: 'publish', label: 'Publish', color: 'bg-amber-400' },
];

export default function StageProgress({ currentStage, onStageChange }) {
  const currentIndex = STAGES.findIndex(s => s.id === currentStage);

  return (
    <div className="flex items-center justify-between px-4">
      {STAGES.map((stage, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = stage.id === currentStage;
        
        return (
          <div key={stage.id} className="flex-1 flex flex-col items-center">
            <button
              onClick={() => onStageChange(stage.id)}
              className={`text-sm font-medium mb-3 transition-colors ${
                isActive ? 'text-gray-900' : 'text-gray-400'
              } ${isCurrent ? 'text-primary-600' : ''}`}
            >
              {stage.label}
            </button>
            <div className="w-full h-1 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  index < currentIndex ? 'bg-primary-500 w-full' :
                  isCurrent ? 'bg-primary-500 w-full' :
                  index === currentIndex + 1 ? 'bg-amber-400 w-1/2' :
                  'w-0'
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
