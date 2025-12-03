import React, { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, Loader2 } from 'lucide-react';
import { getExperimentAnnotations } from '../utils/api';

/**
 * Literature Influence Widget
 *
 * Displays literature snippets that influenced/informed this experiment.
 * Appears in Experiment sidebar as "Influencing Literature Snippets"
 *
 * UX Features:
 * - Shows snippets from cited papers
 * - Links to full paper view
 * - Indicates knowledge lineage
 * - Loads asynchronously without blocking main content
 */
export default function LiteratureInfluenceWidget({ experimentId }) {
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!experimentId) return;

    const fetchAnnotations = async () => {
      try {
        setLoading(true);
        const data = await getExperimentAnnotations(experimentId);
        setAnnotations(data || []);
      } catch (err) {
        console.error('Error fetching experiment annotations:', err);
        setError('Failed to load literature references');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnotations();
  }, [experimentId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Influencing Literature
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Influencing Literature
        </h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (annotations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Influencing Literature
        </h3>
        <p className="text-sm text-gray-500 italic">
          No literature citations yet. Link papers to track knowledge sources.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-blue-600" />
        Influencing Literature Snippets
      </h3>

      <div className="space-y-3">
        {annotations.map((annotation) => (
          <div
            key={annotation.id}
            className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
          >
            {/* Snippet */}
            <div className="mb-2">
              <p className="text-sm text-gray-700 italic leading-relaxed line-clamp-3">
                "{annotation.snippet_text}"
              </p>
            </div>

            {/* Metadata */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                By {annotation.user_name || 'Unknown'}
              </span>
              <button
                onClick={() => window.open(`/literature/${annotation.paper_id}`, '_blank')}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
              >
                View Paper
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {annotations.length} {annotations.length === 1 ? 'reference' : 'references'} from literature
        </p>
      </div>
    </div>
  );
}
