import React from 'react';
import { Plus, FolderOpen, ChevronRight } from 'lucide-react';

export default function ProjectsPage({ projects, currentProject, onSelect, onNew }) {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <button onClick={onNew} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No Projects Yet</h2>
          <p className="text-gray-500 mb-6">Create your first project to get started</p>
          <button onClick={onNew} className="btn btn-primary">
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => onSelect(project)}
              className={`card p-5 text-left card-hover flex items-center gap-4 w-full ${
                currentProject?.id === project.id ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                <p className="text-sm text-gray-500">{project.lab_name}</p>
              </div>
              <div className="text-right text-sm text-gray-400">
                <p>{project.experiments?.length || 0} experiments</p>
                <p className="capitalize">{project.stage}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
