import React, { useState, useEffect } from 'react';
import { FlaskConical, FileText, Loader2 } from 'lucide-react';
import { getPaperAnnotations } from '../utils/api';

/**
 * Internal Usage Widget
 *
 * Shows how this paper has been used internally in experiments and protocols.
 * Appears in Literature sidebar as "Internal Use/Application"
 *
 * UX Features:
 * - Displays count of internal references
 * - Lists linked experiments and protocols
 * - Tracks knowledge reuse
 * - Provides quick navigation
 */
export default function InternalUsageWidget({ paperId }) {
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupedAnnotations, setGroupedAnnotations] = useState({
    experiments: [],
    protocols: [],
    other: []
  });

  useEffect(() => {
    if (!paperId) return;

    const fetchAnnotations = async () => {
      try {
        setLoading(true);
        const data = await getPaperAnnotations(paperId);
        setAnnotations(data || []);

        // Group by entity type
        const grouped = {
          experiments: data.filter(a => a.linked_entity_type === 'experiment'),
          protocols: data.filter(a => a.linked_entity_type === 'protocol'),
          other: data.filter(a => !a.linked_entity_type || (a.linked_entity_type !== 'experiment' && a.linked_entity_type !== 'protocol'))
        };
        setGroupedAnnotations(grouped);
      } catch (err) {
        console.error('Error fetching paper annotations:', err);
        setError('Failed to load internal usage data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnotations();
  }, [paperId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-green-600" />
          Internal Use/Application
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
          <FlaskConical className="w-4 h-4 text-green-600" />
          Internal Use/Application
        </h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const totalLinked = annotations.filter(a => a.linked_entity_id).length;
  const uniqueExperiments = [...new Set(groupedAnnotations.experiments.map(a => a.linked_entity_id))];
  const uniqueProtocols = [...new Set(groupedAnnotations.protocols.map(a => a.linked_entity_id))];

  if (annotations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-green-600" />
          Internal Use/Application
        </h3>
        <p className="text-sm text-gray-500 italic">
          This paper hasn't been applied in any experiments yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-green-600" />
        Internal Use/Application
      </h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">
            {uniqueExperiments.length}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Experiment{uniqueExperiments.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-700">
            {uniqueProtocols.length}
          </div>
          <div className="text-xs text-purple-600 mt-1">
            Protocol{uniqueProtocols.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Linked Experiments */}
      {groupedAnnotations.experiments.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <FlaskConical className="w-3 h-3" />
            Applied in Experiments
          </h4>
          <div className="space-y-2">
            {[...new Map(groupedAnnotations.experiments.map(a => [a.linked_entity_id, a])).values()].map((annotation) => (
              <button
                key={annotation.id}
                onClick={() => window.location.href = `/experiments/${annotation.linked_entity_id}`}
                className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100
                  border border-gray-200 rounded-lg transition-colors text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">
                    Experiment #{annotation.linked_entity_id}
                  </span>
                  <span className="text-xs text-gray-500">
                    View
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Linked Protocols */}
      {groupedAnnotations.protocols.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            Referenced in Protocols
          </h4>
          <div className="space-y-2">
            {[...new Map(groupedAnnotations.protocols.map(a => [a.linked_entity_id, a])).values()].map((annotation) => (
              <button
                key={annotation.id}
                onClick={() => window.location.href = `/protocols/${annotation.linked_entity_id}`}
                className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100
                  border border-gray-200 rounded-lg transition-colors text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">
                    Protocol #{annotation.linked_entity_id}
                  </span>
                  <span className="text-xs text-gray-500">
                    View
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Highlights without links */}
      {groupedAnnotations.other.length > 0 && (
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            + {groupedAnnotations.other.length} highlighted snippet{groupedAnnotations.other.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Total count */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Total: {annotations.length} annotation{annotations.length !== 1 ? 's' : ''} from this paper
        </p>
      </div>
    </div>
  );
}
