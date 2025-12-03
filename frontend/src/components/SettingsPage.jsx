import React, { useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { api } from '../utils/api';

export default function SettingsPage({ project, onRefresh }) {
  const [formData, setFormData] = useState({
    name: project.name,
    lab_name: project.lab_name,
    description: project.description || '',
    field: project.field || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProject(project.id, formData);
      onRefresh();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Project Settings</h1>

      <div className="card p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lab Name
          </label>
          <input
            type="text"
            value={formData.lab_name}
            onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Research Field
          </label>
          <select
            value={formData.field}
            onChange={(e) => setFormData({ ...formData, field: e.target.value })}
            className="input"
          >
            <option value="">Select field...</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Biology">Biology</option>
            <option value="Physics">Physics</option>
            <option value="Materials Science">Materials Science</option>
            <option value="Environmental Science">Environmental Science</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="input resize-none"
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="card p-6 mt-6 border-red-100">
        <h3 className="font-semibold text-red-600 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-500 mb-4">
          Deleting a project will permanently remove all experiments, tasks, and data.
        </p>
        <button className="btn bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Delete Project
        </button>
      </div>
    </div>
  );
}
