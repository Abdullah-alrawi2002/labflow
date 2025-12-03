import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus, RefreshCw, AlertTriangle, CheckCircle2,
  ExternalLink, TrendingUp, TrendingDown, FileText
} from 'lucide-react';
import {
  getLiterature,
  createLiterature,
  refreshLiteratureMetrics,
  getPaper
} from '../utils/api';
import InternalUsageWidget from './InternalUsageWidget';
import PDFAnnotationViewer from './PDFAnnotationViewer';

/**
 * Literature Management Page (V2.0)
 *
 * Comprehensive literature management with:
 * - Scite metrics integration
 * - Internal contradiction detection
 * - PDF annotation support
 * - Knowledge graph visualization
 *
 * UX Features:
 * - Clean, card-based layout
 * - Visual indicators for metrics
 * - Easy-to-scan status badges
 * - Quick actions on hover
 */
export default function LiteraturePage({ projectId }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);

  useEffect(() => {
    if (projectId) {
      fetchLiterature();
    }
  }, [projectId]);

  const fetchLiterature = async () => {
    try {
      setLoading(true);
      const data = await getLiterature(projectId);
      setPapers(data || []);
    } catch (err) {
      console.error('Error fetching literature:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshMetrics = async (paperId) => {
    try {
      setRefreshingId(paperId);
      await refreshLiteratureMetrics(paperId);
      await fetchLiterature(); // Refresh list
      alert('Metrics refreshed successfully');
    } catch (err) {
      console.error('Error refreshing metrics:', err);
      alert('Failed to refresh metrics');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleViewPaper = async (paperId) => {
    try {
      const paper = await getPaper(paperId);
      setSelectedPaper(paper);
    } catch (err) {
      console.error('Error fetching paper:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading literature...</p>
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedPaper) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <button
          onClick={() => setSelectedPaper(null)}
          className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to List
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            <PDFAnnotationViewer
              paper={selectedPaper}
              onAnnotationCreated={() => {
                // Refresh paper data
                handleViewPaper(selectedPaper.id);
              }}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Scite Metrics */}
            <SciteMetricsCard paper={selectedPaper} onRefresh={handleRefreshMetrics} />

            {/* Internal Usage */}
            <InternalUsageWidget paperId={selectedPaper.id} />
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Literature & Knowledge Base
          </h1>
          <p className="text-gray-600 mt-1">
            Manage papers with validation metrics and internal tracking
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
            rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Paper
        </button>
      </div>

      {/* Papers Grid */}
      {papers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Literature Yet
          </h3>
          <p className="text-gray-600 mb-4">
            Start building your knowledge base by adding papers
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Your First Paper
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {papers.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              onView={handleViewPaper}
              onRefresh={handleRefreshMetrics}
              isRefreshing={refreshingId === paper.id}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddPaperModal
          projectId={projectId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchLiterature();
          }}
        />
      )}
    </div>
  );
}

/**
 * Individual Paper Card
 */
function PaperCard({ paper, onView, onRefresh, isRefreshing }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="p-4">
        {/* Header with status */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">
            {paper.title}
          </h3>
          {paper.contradiction_alert && (
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 ml-2" />
          )}
        </div>

        {/* Authors */}
        {paper.authors && paper.authors.length > 0 && (
          <p className="text-xs text-gray-600 mb-3 line-clamp-1">
            {paper.authors.join(', ')}
          </p>
        )}

        {/* Scite Metrics */}
        {(paper.scite_support_score !== null || paper.scite_contradiction_score !== null) && (
          <div className="flex items-center gap-3 mb-3 text-xs">
            {paper.scite_support_score !== null && (
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span className="font-medium">{paper.scite_support_score}</span>
                <span className="text-gray-500">support</span>
              </div>
            )}
            {paper.scite_contradiction_score !== null && (
              <div className="flex items-center gap-1 text-red-600">
                <TrendingDown className="w-3 h-3" />
                <span className="font-medium">{paper.scite_contradiction_score}</span>
                <span className="text-gray-500">contrast</span>
              </div>
            )}
          </div>
        )}

        {/* DOI */}
        {paper.doi && (
          <p className="text-xs text-gray-500 mb-3">
            DOI: {paper.doi}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
          <button
            onClick={() => onView(paper.id)}
            className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded
              hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            View & Annotate
          </button>
          <button
            onClick={() => onRefresh(paper.id)}
            disabled={isRefreshing}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors
              disabled:opacity-50"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          {paper.url && (
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Open original"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Scite Metrics Display Card
 */
function SciteMetricsCard({ paper, onRefresh }) {
  const hasMetrics = paper.scite_support_score !== null || paper.scite_contradiction_score !== null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Scite Metrics</h3>
        <button
          onClick={() => onRefresh(paper.id)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {hasMetrics ? (
        <div className="space-y-3">
          {/* Support Score */}
          {paper.scite_support_score !== null && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">Supporting Citations</span>
                <span className="text-lg font-bold text-green-600">
                  {paper.scite_support_score}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${Math.min(paper.scite_support_score * 2, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Contradiction Score */}
          {paper.scite_contradiction_score !== null && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">Contrasting Citations</span>
                <span className="text-lg font-bold text-red-600">
                  {paper.scite_contradiction_score}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${Math.min(paper.scite_contradiction_score * 10, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Internal Alert */}
          {paper.contradiction_alert && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-800">
                    Internal Variance Detected
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Paper claims differ from your experiment data by &gt;2 SD
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">
          No metrics available. Click refresh to fetch.
        </p>
      )}
    </div>
  );
}

/**
 * Add Paper Modal
 */
function AddPaperModal({ projectId, onClose, onAdded }) {
  const [formData, setFormData] = useState({
    title: '',
    doi: '',
    url: '',
    description: '',
    authors: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const authors = formData.authors
        .split(',')
        .map(a => a.trim())
        .filter(a => a);

      await createLiterature(projectId, {
        ...formData,
        authors
      });

      onAdded();
    } catch (err) {
      console.error('Error creating paper:', err);
      alert('Failed to add paper');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Add Literature</h2>
          <p className="text-sm text-gray-600 mt-1">
            Add a new paper to your knowledge base
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DOI
              </label>
              <input
                type="text"
                value={formData.doi}
                onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="10.1000/example"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authors (comma-separated)
            </label>
            <input
              type="text"
              value={formData.authors}
              onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Smith J, Johnson A, ..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Abstract / Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700
                rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg
                hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Paper'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
