import React, { useState } from 'react';
import { FileText, Link2, Highlighter, ExternalLink } from 'lucide-react';
import { createAnnotation } from '../utils/api';

/**
 * PDF Annotation Viewer (Liner-like)
 *
 * Simplified PDF viewer with annotation capabilities.
 * For production, integrate PDF.js (https://mozilla.github.io/pdf.js/)
 *
 * UX Features:
 * - Text selection and highlighting
 * - Link snippets to experiments/protocols
 * - Persistent annotations
 * - Context menu on selection
 *
 * Implementation Notes:
 * Full PDF.js integration required for production:
 * 1. npm install pdfjs-dist
 * 2. npm install react-pdf (wrapper)
 * 3. Handle text layer rendering
 * 4. Implement selection coordinate tracking
 */
export default function PDFAnnotationViewer({ paper, onAnnotationCreated }) {
  const [selectedText, setSelectedText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0) {
      setSelectedText(text);
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      setShowMenu(true);
    } else {
      setShowMenu(false);
    }
  };

  // Create simple highlight annotation
  const handleHighlight = async () => {
    try {
      const annotation = await createAnnotation(paper.id, {
        snippet_text: selectedText,
        user_name: 'Current User' // Replace with actual user from auth
      });

      if (onAnnotationCreated) {
        onAnnotationCreated(annotation);
      }

      setShowMenu(false);
      window.getSelection().removeAllRanges();
    } catch (err) {
      console.error('Error creating annotation:', err);
      alert('Failed to create annotation');
    }
  };

  // Show modal to link to experiment/protocol
  const handleLinkToEntity = () => {
    setShowLinkModal(true);
    setShowMenu(false);
  };

  // Mock PDF content - replace with actual PDF.js rendering
  const renderMockPDFContent = () => {
    return (
      <div className="prose prose-sm max-w-none" onMouseUp={handleTextSelection}>
        <h2>{paper.title}</h2>
        <p className="text-gray-600">
          <strong>Authors:</strong> {paper.authors?.join(', ') || 'Unknown'}
        </p>
        <p className="text-gray-600">
          <strong>DOI:</strong> {paper.doi || 'Not available'}
        </p>

        <hr className="my-4" />

        <h3>Abstract</h3>
        <p>{paper.description || 'Abstract not available'}</p>

        <h3>Key Findings</h3>
        {paper.key_findings && paper.key_findings.length > 0 ? (
          <ul>
            {paper.key_findings.map((finding, i) => (
              <li key={i}>{finding}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">No key findings extracted yet</p>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This is a simplified preview. In production, this component
            would render the full PDF using PDF.js library with proper text layer
            extraction for accurate highlighting and annotation.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="relative bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">PDF Viewer</h3>
        </div>

        {paper.url && (
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            Open Original
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* PDF Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto">
        {paper.full_text_pdf_path ? (
          // Production: Render PDF.js viewer here
          <div>
            <p className="text-sm text-gray-600 mb-4">
              PDF Path: {paper.full_text_pdf_path}
            </p>
            {renderMockPDFContent()}
          </div>
        ) : (
          // Fallback: Show metadata
          renderMockPDFContent()
        )}
      </div>

      {/* Selection Context Menu */}
      {showMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50
            flex items-center gap-2"
          style={{
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <button
            onClick={handleHighlight}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700
              hover:bg-yellow-50 rounded transition-colors"
            title="Highlight text"
          >
            <Highlighter className="w-4 h-4 text-yellow-600" />
            Highlight
          </button>
          <button
            onClick={handleLinkToEntity}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-700
              hover:bg-blue-50 rounded transition-colors"
            title="Link to experiment or protocol"
          >
            <Link2 className="w-4 h-4 text-blue-600" />
            Link
          </button>
        </div>
      )}

      {/* Link to Entity Modal */}
      {showLinkModal && (
        <LinkToEntityModal
          selectedText={selectedText}
          paperId={paper.id}
          onClose={() => setShowLinkModal(false)}
          onLinked={(annotation) => {
            setShowLinkModal(false);
            if (onAnnotationCreated) {
              onAnnotationCreated(annotation);
            }
          }}
        />
      )}

      {/* Implementation Guide */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Production Implementation Guide:
        </h4>
        <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
          <li>Install: <code className="bg-gray-200 px-1 rounded">npm install react-pdf pdfjs-dist</code></li>
          <li>Import PDF.js Document and Page components</li>
          <li>Enable text layer: <code className="bg-gray-200 px-1 rounded">textContent</code> prop</li>
          <li>Track text coordinates for highlight positioning</li>
          <li>Store highlight coordinates in annotation metadata</li>
          <li>Render highlights as overlays on PDF canvas</li>
        </ol>
      </div>
    </div>
  );
}

/**
 * Modal for linking highlighted text to internal entities
 */
function LinkToEntityModal({ selectedText, paperId, onClose, onLinked }) {
  const [entityType, setEntityType] = useState('experiment');
  const [entityId, setEntityId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!entityId) {
      alert('Please enter an entity ID');
      return;
    }

    try {
      setLoading(true);
      const annotation = await createAnnotation(paperId, {
        snippet_text: selectedText,
        user_name: 'Current User', // Replace with actual user
        linked_entity_type: entityType,
        linked_entity_id: parseInt(entityId)
      });

      onLinked(annotation);
    } catch (err) {
      console.error('Error linking annotation:', err);
      alert('Failed to link annotation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Link to Experiment or Protocol
        </h3>

        <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-sm text-gray-700 italic">"{selectedText}"</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="experiment">Experiment</option>
              <option value="protocol">Protocol</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {entityType === 'experiment' ? 'Experiment' : 'Protocol'} ID
            </label>
            <input
              type="number"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter ID"
              required
            />
          </div>

          <div className="flex gap-3">
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
              {loading ? 'Linking...' : 'Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
