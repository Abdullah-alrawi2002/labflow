import React, { useState } from 'react';
import { RefreshCw, Sparkles, X, Lightbulb } from 'lucide-react';

export default function InsightsSection({ insights, onAnalyze, analyzing }) {
  const [selectedInsight, setSelectedInsight] = useState(null);

  // Limit to 3 insights
  const displayInsights = (insights.length > 0 ? insights : defaultInsights).slice(0, 3);

  // Extract title (first sentence or first 50 chars)
  const getTitle = (content) => {
    const firstSentence = content.split(/[.!?]/)[0];
    if (firstSentence.length > 60) {
      return firstSentence.substring(0, 57) + '...';
    }
    return firstSentence;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">💡 Insights</h2>
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="Generate AI Insights"
        >
          {analyzing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="card p-4 space-y-2">
        {displayInsights.map((insight, i) => {
          const content = typeof insight === 'string' ? insight : insight.content;
          const title = getTitle(content);
          
          return (
            <button
              key={insight.id || i}
              onClick={() => setSelectedInsight({ title, content })}
              className="w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-primary-100 rounded-lg text-primary-600 flex-shrink-0">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                    {title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Click to read more</p>
                </div>
              </div>
            </button>
          );
        })}

        {insights.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">
            Click ✨ to generate insights
          </p>
        )}
      </div>

      {/* Insight Detail Modal */}
      {selectedInsight && (
        <InsightModal
          insight={selectedInsight}
          onClose={() => setSelectedInsight(null)}
        />
      )}
    </div>
  );
}

function InsightModal({ insight, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl animate-fade-in">
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-xl text-primary-600">
              <Lightbulb className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900">💡 Insight</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-gray-700 leading-relaxed">{insight.content}</p>
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

const defaultInsights = [
  {
    id: 1,
    content: "Experiments using Method B under mid-range temperatures (32-34°C) showed a 27% increase in yield consistency compared to all other condition sets. This suggests optimal reaction conditions fall within this narrow temperature band."
  },
  {
    id: 2,
    content: "Reaction stability sharply declined when reagent concentration fell below 0.8× baseline, suggesting a critical threshold for maintaining reproducibility. Consider this as a lower bound for future experiments."
  },
  {
    id: 3,
    content: "Data points collected after 4PM showed 15% higher variance than morning measurements, possibly indicating equipment drift or environmental factors affecting results."
  }
];
