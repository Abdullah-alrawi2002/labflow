import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2, Table, BarChart3 } from 'lucide-react';
import { api } from '../utils/api';
import ExperimentAnalysisModal from './ExperimentAnalysisModal';

export default function ExperimentsSection({ experiments, onAdd, onRefresh }) {
  const [expandedId, setExpandedId] = useState(null);
  const [selectedExperiment, setSelectedExperiment] = useState(null);

  const handleDelete = async (e, expId) => {
    e.stopPropagation();
    if (!confirm('Delete this experiment?')) return;
    try {
      await api.deleteExperiment(expId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleAnalyze = (e, experiment) => {
    e.stopPropagation();
    setSelectedExperiment(experiment);
  };

  // If no experiments, show empty state
  if (experiments.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">🧪 Experiments</h2>
          <button
            onClick={onAdd}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="card p-12 text-center">
          <Table className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No experiments logged yet</p>
          <button onClick={onAdd} className="btn btn-primary">
            Log Your First Experiment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">🧪 Experiments</h2>
        <button
          onClick={onAdd}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Experiments Grid */}
      <div className="grid grid-cols-2 gap-4">
        {experiments.map((exp) => (
          <ExperimentCard
            key={exp.id}
            experiment={exp}
            isExpanded={expandedId === exp.id}
            onToggleExpand={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
            onDelete={(e) => handleDelete(e, exp.id)}
            onAnalyze={(e) => handleAnalyze(e, exp)}
          />
        ))}
      </div>

      {/* Analysis Modal */}
      {selectedExperiment && (
        <ExperimentAnalysisModal
          experiment={selectedExperiment}
          onClose={() => setSelectedExperiment(null)}
        />
      )}
    </div>
  );
}

function ExperimentCard({ experiment, isExpanded, onToggleExpand, onDelete, onAnalyze }) {
  const params = experiment.parameters || [];
  const data = experiment.data || [];

  return (
    <div className="card overflow-hidden hover:shadow-md transition-shadow">
      {/* Header - Clickable */}
      <div 
        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-gray-900">{experiment.name}</h3>
          <span className="text-xs text-gray-400">
            {data.length} rows
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAnalyze}
            className="p-1.5 rounded-lg hover:bg-primary-100 text-primary-600 transition-colors"
            title="Analyze"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {params.slice(0, isExpanded ? params.length : 3).map((param, i) => (
                <th key={i} className="text-left py-2 px-4 font-medium text-gray-600">
                  {param.name}
                  {param.unit && <span className="text-gray-400 ml-1">({param.unit})</span>}
                </th>
              ))}
              {!isExpanded && params.length > 3 && (
                <th className="text-left py-2 px-4 font-medium text-gray-400">
                  +{params.length - 3} more
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, isExpanded ? data.length : 3).map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="border-t border-gray-100 hover:bg-gray-50">
                {params.slice(0, isExpanded ? params.length : 3).map((param, pIndex) => (
                  <td key={pIndex} className="py-2 px-4 text-gray-700">
                    {row[param.name] || '-'}
                  </td>
                ))}
                {!isExpanded && params.length > 3 && (
                  <td className="py-2 px-4 text-gray-400">...</td>
                )}
              </tr>
            ))}
            {!isExpanded && data.length > 3 && (
              <tr className="border-t border-gray-100">
                <td colSpan={params.length} className="py-2 px-4 text-center text-gray-400 text-xs">
                  +{data.length - 3} more rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Actions - Only visible when expanded */}
      {isExpanded && (
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onDelete}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
