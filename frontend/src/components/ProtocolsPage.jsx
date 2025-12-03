import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, X, Clock, AlertTriangle, CheckCircle, 
  ChevronDown, ChevronUp, Play, Copy, Trash2, Edit,
  Shield, Beaker, ListOrdered, Package
} from 'lucide-react';
import { api } from '../utils/api';

export default function ProtocolsPage({ projectId, onUseProtocol }) {
  const [protocols, setProtocols] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProtocols();
  }, [projectId]);

  const fetchProtocols = async () => {
    try {
      const data = await api.getProtocols(projectId);
      setProtocols(data);
    } catch (err) {
      console.error('Failed to fetch protocols:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (protocol) => {
    try {
      await api.createProtocol(projectId, protocol);
      fetchProtocols();
      setShowModal(false);
    } catch (err) {
      console.error('Failed to create protocol:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this protocol?')) return;
    try {
      await api.deleteProtocol(id);
      fetchProtocols();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleUse = async (protocol) => {
    try {
      const template = await api.useProtocol(protocol.id);
      if (onUseProtocol) {
        onUseProtocol(template);
      }
    } catch (err) {
      console.error('Failed to use protocol:', err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading protocols...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Protocol Templates</h1>
          <p className="text-gray-500">Reusable experiment protocols for consistent results</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Protocol
        </button>
      </div>

      {protocols.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No protocols yet</h3>
          <p className="text-gray-500 mb-4">Create reusable templates for your experiments</p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            Create First Protocol
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {protocols.map(protocol => (
            <ProtocolCard
              key={protocol.id}
              protocol={protocol}
              onView={() => setSelectedProtocol(protocol)}
              onUse={() => handleUse(protocol)}
              onDelete={() => handleDelete(protocol.id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateProtocolModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}

      {selectedProtocol && (
        <ProtocolDetailModal
          protocol={selectedProtocol}
          onClose={() => setSelectedProtocol(null)}
          onUse={() => handleUse(selectedProtocol)}
        />
      )}
    </div>
  );
}

function ProtocolCard({ protocol, onView, onUse, onDelete }) {
  const difficultyColors = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-700',
    advanced: 'bg-red-100 text-red-700'
  };

  const categoryIcons = {
    sample_prep: Beaker,
    analysis: FileText,
    synthesis: Package,
    default: ListOrdered
  };

  const Icon = categoryIcons[protocol.category] || categoryIcons.default;

  return (
    <div className="card p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Icon className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{protocol.name}</h3>
            <p className="text-xs text-gray-500">{protocol.category || 'General'}</p>
          </div>
        </div>
        <span className="text-xs text-gray-400">v{protocol.version}</span>
      </div>

      {protocol.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{protocol.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {protocol.estimated_duration_minutes && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
            <Clock className="w-3 h-3" />
            {protocol.estimated_duration_minutes} min
          </span>
        )}
        {protocol.difficulty_level && (
          <span className={`text-xs px-2 py-1 rounded ${difficultyColors[protocol.difficulty_level] || 'bg-gray-100 text-gray-600'}`}>
            {protocol.difficulty_level}
          </span>
        )}
        {protocol.hazards?.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
            <AlertTriangle className="w-3 h-3" />
            {protocol.hazards.length} hazards
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          Used {protocol.times_used || 0} times
          {protocol.success_rate && ` • ${Math.round(protocol.success_rate)}% success`}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onView} className="text-xs text-gray-500 hover:text-gray-700">
            View
          </button>
          <button onClick={onUse} className="btn btn-primary btn-sm flex items-center gap-1">
            <Play className="w-3 h-3" />
            Use
          </button>
          <button onClick={onDelete} className="p-1 text-red-400 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateProtocolModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    difficulty_level: 'intermediate',
    estimated_duration_minutes: 60,
    steps: [{ order: 1, title: '', details: '', duration_minutes: 10 }],
    required_equipment: [],
    required_materials: [],
    parameters_template: [],
    safety_notes: '',
    hazards: [],
    ppe_required: []
  });

  const [newEquipment, setNewEquipment] = useState('');
  const [newHazard, setNewHazard] = useState('');
  const [newPPE, setNewPPE] = useState('');

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { order: formData.steps.length + 1, title: '', details: '', duration_minutes: 10 }]
    });
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...formData.steps];
    newSteps[index][field] = value;
    setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (index) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps.map((s, i) => ({ ...s, order: i + 1 })) });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Create Protocol Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Protocol Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="e.g., Standard PCR Protocol"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={2}
                placeholder="Brief description of the protocol..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input"
              >
                <option value="">Select category</option>
                <option value="sample_prep">Sample Preparation</option>
                <option value="analysis">Analysis</option>
                <option value="synthesis">Synthesis</option>
                <option value="purification">Purification</option>
                <option value="cell_culture">Cell Culture</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={formData.difficulty_level}
                onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                className="input"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. Duration (min)</label>
              <input
                type="number"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) || 0 })}
                className="input"
              />
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Protocol Steps</label>
              <button onClick={addStep} className="text-sm text-primary-600 hover:text-primary-800">
                + Add Step
              </button>
            </div>
            <div className="space-y-3">
              {formData.steps.map((step, index) => (
                <div key={index} className="card p-3 bg-gray-50">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {step.order}
                    </span>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        className="input text-sm"
                        placeholder="Step title"
                      />
                      <textarea
                        value={step.details}
                        onChange={(e) => updateStep(index, 'details', e.target.value)}
                        className="input text-sm"
                        rows={2}
                        placeholder="Detailed instructions..."
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={step.duration_minutes}
                          onChange={(e) => updateStep(index, 'duration_minutes', parseInt(e.target.value) || 0)}
                          className="input text-sm w-20"
                        />
                        <span className="text-xs text-gray-500">minutes</span>
                      </div>
                    </div>
                    {formData.steps.length > 1 && (
                      <button onClick={() => removeStep(index)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Required Equipment</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newEquipment}
                onChange={(e) => setNewEquipment(e.target.value)}
                className="input flex-1"
                placeholder="Add equipment..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newEquipment.trim()) {
                    setFormData({ ...formData, required_equipment: [...formData.required_equipment, newEquipment.trim()] });
                    setNewEquipment('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newEquipment.trim()) {
                    setFormData({ ...formData, required_equipment: [...formData.required_equipment, newEquipment.trim()] });
                    setNewEquipment('');
                  }
                }}
                className="btn btn-secondary"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.required_equipment.map((eq, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                  {eq}
                  <button onClick={() => setFormData({ ...formData, required_equipment: formData.required_equipment.filter((_, idx) => idx !== i) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Safety */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Safety & Hazards</label>
            <textarea
              value={formData.safety_notes}
              onChange={(e) => setFormData({ ...formData, safety_notes: e.target.value })}
              className="input mb-2"
              rows={2}
              placeholder="Safety notes and precautions..."
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Hazards</p>
                <div className="flex gap-2 mb-1">
                  <input
                    type="text"
                    value={newHazard}
                    onChange={(e) => setNewHazard(e.target.value)}
                    className="input text-sm flex-1"
                    placeholder="e.g., Chemical"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newHazard.trim()) {
                        setFormData({ ...formData, hazards: [...formData.hazards, newHazard.trim()] });
                        setNewHazard('');
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.hazards.map((h, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                      {h}
                      <button onClick={() => setFormData({ ...formData, hazards: formData.hazards.filter((_, idx) => idx !== i) })}>
                        <X className="w-2 h-2" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">PPE Required</p>
                <div className="flex gap-2 mb-1">
                  <input
                    type="text"
                    value={newPPE}
                    onChange={(e) => setNewPPE(e.target.value)}
                    className="input text-sm flex-1"
                    placeholder="e.g., Gloves"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newPPE.trim()) {
                        setFormData({ ...formData, ppe_required: [...formData.ppe_required, newPPE.trim()] });
                        setNewPPE('');
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.ppe_required.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                      {p}
                      <button onClick={() => setFormData({ ...formData, ppe_required: formData.ppe_required.filter((_, idx) => idx !== i) })}>
                        <X className="w-2 h-2" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={!formData.name.trim()}>
            Create Protocol
          </button>
        </div>
      </div>
    </div>
  );
}

function ProtocolDetailModal({ protocol, onClose, onUse }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{protocol.name}</h2>
            <p className="text-sm text-gray-500">Version {protocol.version}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-6">
          {protocol.description && (
            <p className="text-gray-600">{protocol.description}</p>
          )}

          {/* Steps */}
          {protocol.steps?.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Steps</h3>
              <div className="space-y-3">
                {protocol.steps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {step.order}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{step.title}</p>
                      {step.details && <p className="text-sm text-gray-600 mt-1">{step.details}</p>}
                      {step.duration_minutes && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {step.duration_minutes} min
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipment */}
          {protocol.required_equipment?.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Required Equipment</h3>
              <div className="flex flex-wrap gap-2">
                {protocol.required_equipment.map((eq, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">{eq}</span>
                ))}
              </div>
            </div>
          )}

          {/* Safety */}
          {(protocol.safety_notes || protocol.hazards?.length > 0 || protocol.ppe_required?.length > 0) && (
            <div className="card p-4 bg-orange-50 border-orange-200">
              <h3 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Safety Information
              </h3>
              {protocol.safety_notes && <p className="text-sm text-orange-800 mb-2">{protocol.safety_notes}</p>}
              <div className="flex gap-4">
                {protocol.hazards?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-orange-700">Hazards:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {protocol.hazards.map((h, i) => (
                        <span key={i} className="px-2 py-0.5 bg-orange-200 text-orange-800 rounded text-xs">{h}</span>
                      ))}
                    </div>
                  </div>
                )}
                {protocol.ppe_required?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-orange-700">PPE Required:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {protocol.ppe_required.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 bg-green-200 text-green-800 rounded text-xs">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="btn btn-secondary">Close</button>
          <button onClick={onUse} className="btn btn-primary flex items-center gap-2">
            <Play className="w-4 h-4" />
            Use This Protocol
          </button>
        </div>
      </div>
    </div>
  );
}
