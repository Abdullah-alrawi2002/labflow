import React, { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Mandatory Change Reason Modal (21 CFR Part 11 Compliance)
 *
 * This modal enforces data integrity by requiring users to provide
 * a reason for any changes to experiments or protocols.
 *
 * UX Features:
 * - Non-dismissible (user must provide reason or cancel)
 * - Clear compliance messaging
 * - Validation feedback
 * - Professional styling
 */
export default function ChangeReasonModal({
  isOpen,
  onClose,
  onSubmit,
  entityName = "experiment"
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    // Validate reason is not empty
    if (!reason.trim()) {
      setError('Change reason is required for compliance');
      return;
    }

    // Validate minimum length for meaningful reason
    if (reason.trim().length < 10) {
      setError('Please provide a more detailed reason (at least 10 characters)');
      return;
    }

    onSubmit(reason);
    setReason('');
    setError('');
  };

  const handleCancel = () => {
    setReason('');
    setError('');
    onClose();
  };

  // Prevent closing modal by clicking outside
  const handleBackdropClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Change Reason Required
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                21 CFR Part 11 Compliance
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-4">
              To maintain data integrity and comply with regulatory requirements,
              please provide a clear reason for modifying this {entityName}.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                <strong>Why this matters:</strong> All changes are permanently logged
                in the audit trail for regulatory compliance and data traceability.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="change-reason"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Reason for Change *
            </label>
            <textarea
              id="change-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500
                focus:border-blue-500 transition-all resize-none ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              rows={4}
              placeholder="Example: Correcting temperature reading from 25°C to 23°C due to sensor calibration"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-600 rounded-full" />
                {error}
              </p>
            )}

            <p className="mt-2 text-xs text-gray-500">
              Minimum 10 characters. Be specific about what changed and why.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg
              hover:bg-gray-100 transition-colors font-medium"
          >
            Cancel Edit
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            Confirm & Save
          </button>
        </div>
      </div>
    </div>
  );
}
