import React, { useState } from 'react';
import { Plus, UserPlus, Trash2 } from 'lucide-react';
import { api } from '../utils/api';

export default function MembersPage({ project, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', role: '' });

  const members = project.members || [];

  const handleAdd = async () => {
    if (!newMember.name) return;
    try {
      await api.addMember(project.id, newMember);
      setNewMember({ name: '', role: '' });
      setShowAdd(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {showAdd && (
        <div className="card p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Add New Member</h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              placeholder="Name"
              className="input"
            />
            <input
              type="text"
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              placeholder="Role"
              className="input"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAdd(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleAdd} className="btn btn-primary">
              Add Member
            </button>
          </div>
        </div>
      )}

      {members.length === 0 ? (
        <div className="card p-12 text-center">
          <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No Team Members</h2>
          <p className="text-gray-500">Add members to collaborate on this project</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {members.map(member => (
            <div key={member.id} className="card p-5 flex items-center gap-4">
              <img
                src={member.avatar || `https://i.pravatar.cc/60?u=${member.id}`}
                alt={member.name}
                className="w-12 h-12 rounded-full"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{member.name}</h3>
                <p className="text-sm text-gray-500">{member.role || 'Team Member'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
