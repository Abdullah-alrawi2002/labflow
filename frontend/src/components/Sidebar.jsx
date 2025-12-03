import React from 'react';
import { Plus } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '🧪' },
  { id: 'projects', label: 'Projects', icon: '📁' },
  { id: 'protocols', label: 'Protocols', icon: '📋' },
  { id: 'equipment', label: 'Equipment', icon: '🔬' },
  { id: 'members', label: 'Members', icon: '👥' },
  { id: 'audit', label: 'Audit Trail', icon: '📜' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar({ 
  currentView, 
  onViewChange, 
  labName = 'Research Lab',
  onNewProject 
}) {
  return (
    <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen">
      {/* Logo/Lab Name */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/25">
            🔬
          </div>
          <div>
            <h1 className="font-bold text-gray-900">LabFlow</h1>
            <p className="text-xs text-gray-500">{labName}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentView === item.id
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* New Project Button */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={onNewProject}
          className="w-full btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>
    </div>
  );
}
