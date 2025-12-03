import React, { useState } from 'react';
import { Plus, Box } from 'lucide-react';
import { api } from '../utils/api';

export default function EquipmentPage({ project, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newEquipment, setNewEquipment] = useState({ name: '', status: 'available' });

  const equipment = project.equipment || [];

  const handleAdd = async () => {
    if (!newEquipment.name) return;
    try {
      await api.addEquipment(project.id, newEquipment);
      setNewEquipment({ name: '', status: 'available' });
      setShowAdd(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to add equipment:', err);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Equipment</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Equipment
        </button>
      </div>

      {showAdd && (
        <div className="card p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Add Equipment</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={newEquipment.name}
              onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
              placeholder="Equipment Name"
              className="input"
            />
            <select
              value={newEquipment.status}
              onChange={(e) => setNewEquipment({ ...newEquipment, status: e.target.value })}
              className="input"
            >
              <option value="available">Available</option>
              <option value="in_use">In Use</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleAdd} className="btn btn-primary">
              Add Equipment
            </button>
          </div>
        </div>
      )}

      {equipment.length === 0 ? (
        <div className="card p-12 text-center">
          <Box className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No Equipment</h2>
          <p className="text-gray-500">Add equipment used in your experiments</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {equipment.map(item => (
            <div key={item.id} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Box className="w-5 h-5 text-gray-600" />
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  item.status === 'available' ? 'bg-green-100 text-green-700' :
                  item.status === 'in_use' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">{item.name}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
