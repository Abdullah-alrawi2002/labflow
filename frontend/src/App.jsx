import React, { useState, useEffect } from 'react';
import { 
  Home, FolderOpen, Users, Box, Settings, Plus, 
  ChevronRight, Link2, UserPlus
} from 'lucide-react';
import { api } from './utils/api';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectsPage from './components/ProjectsPage';
import MembersPage from './components/MembersPage';
import EquipmentPage from './components/EquipmentPage';
import SettingsPage from './components/SettingsPage';
import ProtocolsPage from './components/ProtocolsPage';
import AuditTrailPage from './components/AuditTrailPage';
import NewProjectModal from './components/NewProjectModal';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (data.length > 0 && !currentProject) {
        setCurrentProject(data[0]);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshProject = async () => {
    if (!currentProject) return;
    try {
      const updated = await api.getProject(currentProject.id);
      setCurrentProject(updated);
      setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
  };

  const handleCreateProject = async (data) => {
    try {
      const newProject = await api.createProject(data);
      setProjects(prev => [newProject, ...prev]);
      setCurrentProject(newProject);
      setShowNewProject(false);
      setCurrentPage('dashboard');
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleSelectProject = (project) => {
    setCurrentProject(project);
    setCurrentPage('dashboard');
  };

  const handleUseProtocol = (template) => {
    // Navigate to dashboard and potentially open experiment modal with protocol
    setCurrentPage('dashboard');
    // Could pass template data to dashboard
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        labName={currentProject?.lab_name || "My Lab"}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        projects={projects}
        currentProject={currentProject}
        onSelectProject={handleSelectProject}
        onNewProject={() => setShowNewProject(true)}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {currentProject ? (
          <>
            {currentPage === 'dashboard' && (
              <Dashboard
                project={currentProject}
                onRefresh={refreshProject}
              />
            )}
            {currentPage === 'projects' && (
              <ProjectsPage
                projects={projects}
                currentProject={currentProject}
                onSelect={handleSelectProject}
                onNew={() => setShowNewProject(true)}
              />
            )}
            {currentPage === 'protocols' && (
              <ProtocolsPage
                projectId={currentProject.id}
                onUseProtocol={handleUseProtocol}
              />
            )}
            {currentPage === 'audit' && (
              <AuditTrailPage
                projectId={currentProject.id}
              />
            )}
            {currentPage === 'members' && (
              <MembersPage
                project={currentProject}
                onRefresh={refreshProject}
              />
            )}
            {currentPage === 'equipment' && (
              <EquipmentPage
                project={currentProject}
                onRefresh={refreshProject}
              />
            )}
            {currentPage === 'settings' && (
              <SettingsPage
                project={currentProject}
                onRefresh={refreshProject}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No Projects Yet</h2>
              <p className="text-gray-500 mb-6">Create your first research project to get started</p>
              <button
                onClick={() => setShowNewProject(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </button>
            </div>
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}
