import React, { useState, useEffect } from 'react';
import { 
  Shield, Clock, User, FileText, Edit, Trash2, Eye, 
  CheckCircle, AlertTriangle, Download, Filter, Search,
  PenTool, GitBranch, History, Lock
} from 'lucide-react';
import { api } from '../utils/api';

export default function AuditTrailPage({ projectId }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, [projectId]);

  const fetchAuditLogs = async () => {
    try {
      const data = await api.getAuditLog(projectId);
      setAuditLogs(data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (filter !== 'all' && log.action !== filter) return false;
    if (searchTerm && !log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const actionIcons = {
    create: { icon: FileText, color: 'text-green-500 bg-green-100' },
    update: { icon: Edit, color: 'text-blue-500 bg-blue-100' },
    delete: { icon: Trash2, color: 'text-red-500 bg-red-100' },
    sign: { icon: PenTool, color: 'text-purple-500 bg-purple-100' },
    restore: { icon: History, color: 'text-orange-500 bg-orange-100' },
    status_change: { icon: GitBranch, color: 'text-yellow-500 bg-yellow-100' },
    comment: { icon: FileText, color: 'text-gray-500 bg-gray-100' },
    analyze: { icon: Eye, color: 'text-indigo-500 bg-indigo-100' },
  };

  const exportAuditLog = () => {
    const csv = [
      ['Timestamp', 'Action', 'Entity Type', 'Entity Name', 'User', 'Summary'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.action,
        log.entity_type,
        log.entity_name || '',
        log.user_name,
        (log.change_summary || '').replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading audit trail...</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-500" />
            Audit Trail
          </h1>
          <p className="text-gray-500">Complete history of all changes for compliance</p>
        </div>
        <button onClick={exportAuditLog} className="btn btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Compliance Info Banner */}
      <div className="card p-4 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">FDA 21 CFR Part 11 Compliance Ready</h3>
            <p className="text-sm text-blue-700">
              All entries are timestamped, checksummed for integrity, and include user identification.
              Digital signatures provide non-repudiation for completed experiments.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by entity name..."
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">All Actions</option>
            <option value="create">Created</option>
            <option value="update">Updated</option>
            <option value="delete">Deleted</option>
            <option value="sign">Signed</option>
            <option value="restore">Restored</option>
          </select>
        </div>
        <span className="text-sm text-gray-500">
          {filteredLogs.length} entries
        </span>
      </div>

      {/* Audit Log Timeline */}
      {filteredLogs.length === 0 ? (
        <div className="card p-12 text-center">
          <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">No audit logs yet</h3>
          <p className="text-gray-500">Activity will be recorded here as you work</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log, index) => {
            const actionConfig = actionIcons[log.action] || actionIcons.update;
            const Icon = actionConfig.icon;
            
            return (
              <div key={log.id} className="card p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${actionConfig.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 capitalize">{log.action.replace('_', ' ')}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">{log.entity_type}</span>
                      {log.entity_name && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm font-medium text-gray-900">{log.entity_name}</span>
                        </>
                      )}
                    </div>
                    
                    {log.change_summary && (
                      <p className="text-sm text-gray-600 mb-2">{log.change_summary}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.user_name}
                        {log.user_role && ` (${log.user_role})`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    {log.reason && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        Reason: {log.reason}
                      </p>
                    )}
                  </div>
                  
                  {log.action === 'sign' && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Signed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
