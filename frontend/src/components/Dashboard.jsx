import React, { useState } from 'react';
import { Plus, UserPlus, Link2, RefreshCw, ChevronRight } from 'lucide-react';
import { api } from '../utils/api';
import StageProgress from './StageProgress';
import ExperimentsSection from './ExperimentsSection';
import CalendarSection from './CalendarSection';
import InsightsSection from './InsightsSection';
import NextStepsSection from './NextStepsSection';
import SuggestionsSection from './SuggestionsSection';
import PapersSection from './PapersSection';
import NewExperimentModal from './NewExperimentModal';

export default function Dashboard({ project, onRefresh }) {
  const [showNewExp, setShowNewExp] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const stageLabel = (project.stage || 'brainstorm').replace(/\b\w/g, (l) => l.toUpperCase());

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await api.analyze(project.id);
      onRefresh();
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateExperiment = async (data) => {
    try {
      await api.createExperiment(project.id, data);
      onRefresh();
      setShowNewExp(false);
    } catch (err) {
      console.error('Failed to create experiment:', err);
    }
  };

  const members = project.members?.length > 0 ? project.members : [
    { id: 1, name: 'You', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1' },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-[0.12em]">Home / {stageLabel}</p>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">Dashboard</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-400">Current project</p>
            <p className="text-sm font-semibold text-gray-900">{project.name}</p>
          </div>
          <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium">
            <UserPlus className="w-4 h-4" />
            Invite
          </button>
          <div className="flex -space-x-2">
            {members.slice(0, 4).map((member, i) => (
              <img
                key={member.id || i}
                src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                alt={member.name}
                className="w-8 h-8 rounded-full border-2 border-white bg-gray-100"
              />
            ))}
            {members.length > 4 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                +{members.length - 4}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Stage Progress */}
      <div className="card p-5 shadow-soft mb-8">
        <StageProgress
          currentStage={project.stage}
          onStageChange={async (stage) => {
            await api.updateProject(project.id, { stage });
            onRefresh();
          }}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6 mt-8">
        {/* Left Column - Experiments & Calendar */}
        <div className="col-span-8 space-y-6">
          <ExperimentsSection 
            experiments={project.experiments || []}
            onAdd={() => setShowNewExp(true)}
            onRefresh={onRefresh}
          />
          <CalendarSection 
            projectId={project.id}
            scheduled={project.scheduled || []}
            onRefresh={onRefresh}
          />
        </div>

        {/* Right Column - AI Insights & Next Steps */}
        <div className="col-span-4 space-y-6">
          <InsightsSection 
            insights={project.insights || []}
            onAnalyze={handleAnalyze}
            analyzing={analyzing}
          />
          <SuggestionsSection 
            suggestions={project.suggestions || []}
          />
          <NextStepsSection 
            projectId={project.id}
            tasks={project.tasks || []}
            onRefresh={onRefresh}
          />
        </div>
      </div>

      {/* Papers Section - Full Width */}
      <div className="mt-6">
        <PapersSection 
          papers={project.papers || []}
          projectId={project.id}
          onRefresh={onRefresh}
        />
      </div>

      {/* New Experiment Modal */}
      {showNewExp && (
        <NewExperimentModal
          onClose={() => setShowNewExp(false)}
          onCreate={handleCreateExperiment}
        />
      )}
    </div>
  );
}
