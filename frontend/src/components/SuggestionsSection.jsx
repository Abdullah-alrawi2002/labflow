import React, { useState } from 'react';
import { X, Zap, ChevronRight } from 'lucide-react';

export default function SuggestionsSection({ suggestions }) {
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  // Limit to 3 suggestions
  const displaySuggestions = (suggestions.length > 0 ? suggestions : defaultSuggestions).slice(0, 3);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">🎯 Suggestions</h2>

      <div className="card p-4 space-y-2">
        {displaySuggestions.map((suggestion, i) => (
          <button
            key={suggestion.id || i}
            onClick={() => setSelectedSuggestion(suggestion)}
            className="w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600 flex-shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <p className="text-sm font-medium text-gray-900 flex-1 group-hover:text-amber-600 transition-colors">
                {suggestion.title}
              </p>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500" />
            </div>
          </button>
        ))}

        {suggestions.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">
            Run AI analysis to get suggestions
          </p>
        )}
      </div>

      {/* Suggestion Detail Modal */}
      {selectedSuggestion && (
        <SuggestionModal
          suggestion={selectedSuggestion}
          onClose={() => setSelectedSuggestion(null)}
        />
      )}
    </div>
  );
}

function SuggestionModal({ suggestion, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl animate-fade-in">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900">🎯 Suggestion</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-5">
          <h4 className="font-semibold text-gray-900 mb-3">{suggestion.title}</h4>
          <p className="text-gray-600 leading-relaxed">{suggestion.description}</p>
        </div>
        <div className="p-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const defaultSuggestions = [
  {
    id: 1,
    title: "Explore Temperature Optimization",
    description: "Run a temperature sweep between 32-36°C to validate the emerging pattern. Based on your current data, this range shows the most promising results. Consider using 1°C increments for higher resolution."
  },
  {
    id: 2,
    title: "Test Unexplored Parameter Combination",
    description: "Evaluate Method B with reduced pH (6.8-7.0) — this is an unexplored but promising zone based on the correlation patterns in your data. This could reveal synergistic effects."
  },
  {
    id: 3,
    title: "Replicate High-Variance Results",
    description: "Experiments 7 and 12 showed unusually high variance. Consider replicating these with controlled conditions to determine if the variance is due to methodology or genuine effect."
  }
];
