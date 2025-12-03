const API = '/api';

async function request(endpoint, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(`${API}${endpoint}`, config);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Projects
  getProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: data }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: data }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  
  // Experiments
  getExperiment: (id) => request(`/experiments/${id}`),
  createExperiment: (projectId, data) => request(`/projects/${projectId}/experiments`, { method: 'POST', body: data }),
  updateExperiment: (id, data) => request(`/experiments/${id}`, { method: 'PUT', body: data }),
  deleteExperiment: (id) => request(`/experiments/${id}`, { method: 'DELETE' }),
  getExperimentAnalysis: (id) => request(`/experiments/${id}/analysis`),
  
  // Experiment Version Control
  getExperimentVersions: (id) => request(`/experiments/${id}/versions`),
  restoreExperimentVersion: (id, version) => request(`/experiments/${id}/restore/${version}`, { method: 'POST' }),
  
  // Digital Signatures
  signExperiment: (id, data) => request(`/experiments/${id}/sign`, { method: 'POST', body: data }),
  verifySignature: (id) => request(`/experiments/${id}/verify-signature`),
  
  // Experiment Status
  updateExperimentStatus: (id, data) => request(`/experiments/${id}/status`, { method: 'PUT', body: data }),
  getSuccessRateAnalysis: (projectId) => request(`/projects/${projectId}/success-rate`),
  
  // Protocols
  getProtocols: (projectId) => request(`/projects/${projectId}/protocols`),
  getProtocol: (id) => request(`/protocols/${id}`),
  createProtocol: (projectId, data) => request(`/projects/${projectId}/protocols`, { method: 'POST', body: data }),
  useProtocol: (id) => request(`/protocols/${id}/use`, { method: 'POST' }),
  deleteProtocol: (id) => request(`/protocols/${id}`, { method: 'DELETE' }),
  
  // Comments
  getComments: (experimentId) => request(`/experiments/${experimentId}/comments`),
  createComment: (experimentId, data) => request(`/experiments/${experimentId}/comments`, { method: 'POST', body: data }),
  resolveComment: (id) => request(`/comments/${id}/resolve`, { method: 'PUT' }),
  deleteComment: (id) => request(`/comments/${id}`, { method: 'DELETE' }),
  
  // Audit Log
  getAuditLog: (projectId) => request(`/projects/${projectId}/audit-log`),
  getExperimentAuditLog: (experimentId) => request(`/experiments/${experimentId}/audit-log`),
  
  // Tasks
  createTask: (projectId, data) => request(`/projects/${projectId}/tasks`, { method: 'POST', body: data }),
  toggleTask: (id) => request(`/tasks/${id}/toggle`, { method: 'PUT' }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  
  // Schedule
  createSchedule: (projectId, data) => request(`/projects/${projectId}/schedule`, { method: 'POST', body: data }),
  deleteSchedule: (id) => request(`/schedule/${id}`, { method: 'DELETE' }),
  
  // AI Analysis
  analyze: (projectId) => request(`/projects/${projectId}/analyze`, { method: 'POST' }),
  
  // Members
  getMembers: (projectId) => request(`/projects/${projectId}/members`),
  addMember: (projectId, data) => request(`/projects/${projectId}/members`, { method: 'POST', body: data }),
  removeMember: (id) => request(`/members/${id}`, { method: 'DELETE' }),
  
  // Equipment
  getEquipment: (projectId) => request(`/projects/${projectId}/equipment`),
  addEquipment: (projectId, data) => request(`/projects/${projectId}/equipment`, { method: 'POST', body: data }),
  removeEquipment: (id) => request(`/equipment/${id}`, { method: 'DELETE' }),
  
  // File Upload
  uploadExcel: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API}/upload/excel`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API}/upload/image`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};
