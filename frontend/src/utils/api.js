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

  // V2.0: Literature / Papers
  getLiterature: (projectId) => request(`/projects/${projectId}/literature`),
  getPaper: (id) => request(`/literature/${id}`),
  createLiterature: (projectId, data) => request(`/projects/${projectId}/literature`, { method: 'POST', body: data }),
  updateLiterature: (id, data) => request(`/literature/${id}`, { method: 'PUT', body: data }),
  refreshLiteratureMetrics: (id) => request(`/literature/${id}/refresh-metrics`, { method: 'POST' }),

  // V2.0: Annotations
  createAnnotation: (paperId, data) => request(`/literature/${paperId}/annotations`, { method: 'POST', body: data }),
  getPaperAnnotations: (paperId) => request(`/literature/${paperId}/annotations`),
  getExperimentAnnotations: (experimentId) => request(`/experiments/${experimentId}/annotations`),
  deleteAnnotation: (id) => request(`/annotations/${id}`, { method: 'DELETE' }),

  // V2.0: AI Writing Service
  generateManuscript: (data) => request('/generate-manuscript', { method: 'POST', body: data }),
};

// Export individual functions for convenience
export const getProjects = api.getProjects;
export const getProject = api.getProject;
export const createProject = api.createProject;
export const updateProject = api.updateProject;
export const deleteProject = api.deleteProject;

export const getExperiment = api.getExperiment;
export const createExperiment = api.createExperiment;
export const updateExperiment = api.updateExperiment;
export const deleteExperiment = api.deleteExperiment;
export const getExperimentAnalysis = api.getExperimentAnalysis;

export const getExperimentVersions = api.getExperimentVersions;
export const restoreExperimentVersion = api.restoreExperimentVersion;

export const signExperiment = api.signExperiment;
export const verifySignature = api.verifySignature;

export const updateExperimentStatus = api.updateExperimentStatus;
export const getSuccessRateAnalysis = api.getSuccessRateAnalysis;

export const getProtocols = api.getProtocols;
export const getProtocol = api.getProtocol;
export const createProtocol = api.createProtocol;
export const useProtocol = api.useProtocol;
export const deleteProtocol = api.deleteProtocol;

export const getComments = api.getComments;
export const createComment = api.createComment;
export const resolveComment = api.resolveComment;
export const deleteComment = api.deleteComment;

export const getAuditLog = api.getAuditLog;
export const getExperimentAuditLog = api.getExperimentAuditLog;

export const createTask = api.createTask;
export const toggleTask = api.toggleTask;
export const deleteTask = api.deleteTask;

export const createSchedule = api.createSchedule;
export const deleteSchedule = api.deleteSchedule;

export const analyze = api.analyze;

export const getMembers = api.getMembers;
export const addMember = api.addMember;
export const removeMember = api.removeMember;

export const getEquipment = api.getEquipment;
export const addEquipment = api.addEquipment;
export const removeEquipment = api.removeEquipment;

export const uploadExcel = api.uploadExcel;
export const uploadImage = api.uploadImage;

// V2.0 exports
export const getLiterature = api.getLiterature;
export const getPaper = api.getPaper;
export const createLiterature = api.createLiterature;
export const updateLiterature = api.updateLiterature;
export const refreshLiteratureMetrics = api.refreshLiteratureMetrics;

export const createAnnotation = api.createAnnotation;
export const getPaperAnnotations = api.getPaperAnnotations;
export const getExperimentAnnotations = api.getExperimentAnnotations;
export const deleteAnnotation = api.deleteAnnotation;

export const generateManuscript = api.generateManuscript;
