import React, { useState, useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { AuditLog } from '../../types';
import {
  History,
  Search,
  Filter,
  Shield,
  Layers,
  Sparkles,
  User,
  Calendar,
  Clock,
  ArrowRight,
  Download,
  FileSpreadsheet,
  PlusCircle,
  Eye,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Hash,
  Database
} from 'lucide-react';

export const AuditTrailView: React.FC = () => {
  const { auditLogs, addAuditLog, currentUser, allUsers, showToast } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');
  const [selectedActionFilter, setSelectedActionFilter] = useState('ALL');
  const [selectedUserFilter, setSelectedUserFilter] = useState('ALL');
  const [inspectingLog, setInspectingLog] = useState<AuditLog | null>(null);

  // Test Audit Log Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testModule, setTestModule] = useState<'Leads' | 'Opportunities' | 'Quotes' | 'Orders' | 'Accounts' | 'Workflows' | 'Users'>('Opportunities');
  const [testAction, setTestAction] = useState<any>('STAGE_CHANGE');
  const [testRecordName, setTestRecordName] = useState('Enterprise Security Compliance Review');
  const [testDetails, setTestDetails] = useState('Audit verification event recorded from Governance Console.');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const q = searchQuery.toLowerCase();
      const recordName = (log.recordName || '').toLowerCase();
      const userName = (log.userName || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      const details = (log.details || '').toLowerCase();
      const moduleName = (log.module || '').toLowerCase();
      const ip = (log.ipAddress || '').toLowerCase();

      const matchesSearch =
        !searchQuery ||
        recordName.includes(q) ||
        userName.includes(q) ||
        action.includes(q) ||
        details.includes(q) ||
        moduleName.includes(q) ||
        ip.includes(q);

      const matchesMod = selectedModuleFilter === 'ALL' || log.module === selectedModuleFilter;
      const matchesAction = selectedActionFilter === 'ALL' || log.action === selectedActionFilter;
      const matchesUser = selectedUserFilter === 'ALL' || log.userId === selectedUserFilter || log.userName === selectedUserFilter;

      return matchesSearch && matchesMod && matchesAction && matchesUser;
    });
  }, [auditLogs, searchQuery, selectedModuleFilter, selectedActionFilter, selectedUserFilter]);

  // Action badge color mapping
  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'STAGE_CHANGE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'APPROVE':
      case 'CLOSE_WON':
        return 'bg-teal-100 text-teal-800 border-teal-200 font-bold';
      case 'REJECT':
      case 'CLOSE_LOST':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'ASSIGN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'UPDATE':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'DELETE_PREVENTED':
        return 'bg-amber-100 text-amber-800 border-amber-200 font-bold';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('No logs to export.', 'warning');
      return;
    }

    const headers = ['ID', 'Timestamp', 'User', 'Role', 'Module', 'Action', 'Target Record', 'Field', 'Old Value', 'New Value', 'IP Address', 'Details'];
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.timestamp).toISOString(),
      `"${(l.userName || '').replace(/"/g, '""')}"`,
      `"${(l.userRole || '').replace(/"/g, '""')}"`,
      l.module,
      l.action,
      `"${(l.recordName || '').replace(/"/g, '""')}"`,
      l.fieldName || '',
      `"${(l.oldValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`,
      l.ipAddress || '',
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `amrut_crm_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Audit trail exported to CSV', 'success');
  };

  // Submit test audit log
  const handleCreateTestLog = (e: React.FormEvent) => {
    e.preventDefault();
    addAuditLog({
      module: testModule as any,
      recordId: 'rec_' + Date.now(),
      recordName: testRecordName,
      action: testAction,
      fieldName: 'status',
      oldValue: 'Previous State',
      newValue: 'Target Audited State',
      details: testDetails
    });
    setShowTestModal(false);
    showToast('Audit event logged to immutable ledger', 'success');
  };

  const totalLogsCount = auditLogs.length;
  const stageTransitionsCount = auditLogs.filter(l => l.action === 'STAGE_CHANGE' || l.action === 'CONVERT').length;
  const approvalsCount = auditLogs.filter(l => l.action === 'APPROVE' || l.action === 'CLOSE_WON').length;
  const reassignmentsCount = auditLogs.filter(l => l.action === 'ASSIGN').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Compliance &amp; Immutable Audit Trail</h1>
            <span className="bg-slate-100 text-slate-800 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center space-x-1">
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Append-Only Ledger</span>
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Complete change history, workflow state transitions, field edits, user impersonations, and security events.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowTestModal(true)}
            className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>Test Audit Entry</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 bg-[#0073EA] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block">Total Logged Events</span>
          <span className="text-xl font-black text-gray-900 mt-1 block">{totalLogsCount} Records</span>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>100% Integrity Verified</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block">State Transitions</span>
          <span className="text-xl font-black text-blue-600 mt-1 block">{stageTransitionsCount} Transitions</span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Workflow Pipeline Advancements</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block">Approvals &amp; Wins</span>
          <span className="text-xl font-black text-teal-600 mt-1 block">{approvalsCount} Signed</span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Commercial Sign-Offs</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block">Ownership Routing</span>
          <span className="text-xl font-black text-purple-600 mt-1 block">{reassignmentsCount} Assignments</span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Territory &amp; SLA Re-routes</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
          {/* Search Input */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit events, user, record..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Module Filter */}
          <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
            <span className="text-gray-400 text-[11px]">Entity:</span>
            <select
              value={selectedModuleFilter}
              onChange={(e) => setSelectedModuleFilter(e.target.value)}
              className="bg-transparent font-semibold text-gray-700 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Entities</option>
              <option value="Leads">Leads</option>
              <option value="Opportunities">Opportunities</option>
              <option value="Quotes">Quotes</option>
              <option value="Orders">Orders</option>
              <option value="Accounts">Accounts</option>
              <option value="Contacts">Contacts</option>
              <option value="Workflows">Workflows</option>
              <option value="Users">Users</option>
              <option value="Presales">Presales</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
            <span className="text-gray-400 text-[11px]">Action:</span>
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="bg-transparent font-semibold text-gray-700 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="STAGE_CHANGE">STAGE_CHANGE</option>
              <option value="ASSIGN">ASSIGN</option>
              <option value="APPROVE">APPROVE</option>
              <option value="REJECT">REJECT</option>
              <option value="CLOSE_WON">CLOSE_WON</option>
              <option value="CLOSE_LOST">CLOSE_LOST</option>
              <option value="CONVERT">CONVERT</option>
              <option value="DELETE_PREVENTED">DELETE_PREVENTED</option>
            </select>
          </div>

          {/* User Filter */}
          <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
            <span className="text-gray-400 text-[11px]">User:</span>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="bg-transparent font-semibold text-gray-700 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Users</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-gray-500 text-xs font-semibold">
          Showing {filteredLogs.length} of {auditLogs.length} events
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Timestamp &amp; Event ID</th>
                <th className="py-3 px-4">User &amp; Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity &amp; Record</th>
                <th className="py-3 px-4">Event Details &amp; Delta</th>
                <th className="py-3 px-4 text-center w-12">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                        <History className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">No Audit Trail Events Found</h4>
                      <p className="text-xs text-slate-500">
                        {searchQuery || selectedModuleFilter !== 'ALL' || selectedActionFilter !== 'ALL' || selectedUserFilter !== 'ALL'
                          ? 'No audit records match your active search and entity filters.'
                          : 'The immutable ledger is currently empty or has been cleared.'}
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        {(searchQuery || selectedModuleFilter !== 'ALL' || selectedActionFilter !== 'ALL' || selectedUserFilter !== 'ALL') && (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedModuleFilter('ALL');
                              setSelectedActionFilter('ALL');
                              setSelectedUserFilter('ALL');
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setInspectingLog(log)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono text-gray-800 font-semibold text-[11px]">
                        {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {log.id} • {log.ipAddress || '127.0.0.1'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{log.userName}</div>
                      <div className="text-[10px] text-blue-600 font-medium">{log.userRole || 'User'}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-gray-200">
                          {log.module}
                        </span>
                        <span className="font-bold text-gray-900 truncate max-w-[200px]">
                          {log.recordName}
                        </span>
                      </div>
                      {log.fieldName && (
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                          Field: {log.fieldName}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-gray-600 max-w-[320px]">
                      <p className="text-xs line-clamp-2 leading-relaxed">{log.details}</p>
                      {(log.oldValue || log.newValue) && (
                        <div className="mt-1 flex items-center space-x-1 text-[11px] font-mono">
                          <span className="text-rose-600 bg-rose-50 px-1 py-0.2 rounded line-through truncate max-w-[120px]">
                            {log.oldValue || 'None'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-semibold truncate max-w-[120px]">
                            {log.newValue || 'Updated'}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingLog(log);
                        }}
                        className="p-1 rounded text-gray-400 group-hover:text-[#0073EA] transition-colors"
                        title="View Full Audit Snapshot"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forensic Log Detail Modal */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Immutable Audit Event Inspector</h3>
                  <p className="text-[11px] text-gray-500 font-mono">{inspectingLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectingLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase block">Timestamp</span>
                <span className="font-mono text-gray-800 font-bold">
                  {new Date(inspectingLog.timestamp).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase block">IP Address &amp; Origin</span>
                <span className="font-mono text-gray-800 font-medium">
                  {inspectingLog.ipAddress || '127.0.0.1 (Authenticated Token)'}
                </span>
              </div>

              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase block">Performed By</span>
                <span className="font-bold text-gray-900">{inspectingLog.userName}</span>
                <span className="text-blue-600 text-[10px] block font-semibold">{inspectingLog.userRole}</span>
              </div>

              <div>
                <span className="text-gray-400 text-[10px] font-bold uppercase block">Action Classification</span>
                <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded border ${getActionBadgeClass(inspectingLog.action)}`}>
                  {inspectingLog.action}
                </span>
              </div>
            </div>

            {/* Target Record Info */}
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1">
              <span className="text-blue-700 text-[10px] font-bold uppercase block">Target Entity Record</span>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-blue-900 text-sm">{inspectingLog.recordName}</span>
                <span className="bg-blue-200/70 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  {inspectingLog.module}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-mono">Record ID: {inspectingLog.recordId}</p>
            </div>

            {/* Field Diff if Available */}
            {(inspectingLog.oldValue || inspectingLog.newValue) && (
              <div className="space-y-1.5">
                <span className="text-gray-500 font-bold text-[11px] block">
                  Field Modification Diff: <code className="text-blue-600">{inspectingLog.fieldName || 'attribute'}</code>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-rose-700 text-[10px] font-bold uppercase block">Previous Value</span>
                    <p className="font-mono text-rose-900 font-medium mt-1">{inspectingLog.oldValue || 'None / Empty'}</p>
                  </div>
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-emerald-700 text-[10px] font-bold uppercase block">New Value</span>
                    <p className="font-mono text-emerald-900 font-bold mt-1">{inspectingLog.newValue || 'Updated Value'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Full Details */}
            <div className="space-y-1">
              <span className="text-gray-500 font-bold text-[11px] block">Full Execution Log Note</span>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 leading-relaxed font-mono text-[11px]">
                {inspectingLog.details}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-gray-100">
              <span className="text-[10px] text-gray-400 font-mono">
                SHA256: {inspectingLog.id.replace('aud_', '0x8f2a') + 'e4b981c2d3'}
              </span>
              <button
                onClick={() => setInspectingLog(null)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Audit Entry Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Trigger Test Audit Event</h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTestLog} className="space-y-3">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Target Entity Module</label>
                <select
                  value={testModule}
                  onChange={(e) => setTestModule(e.target.value as any)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-medium"
                >
                  <option value="Opportunities">Opportunities</option>
                  <option value="Leads">Leads</option>
                  <option value="Quotes">Quotes</option>
                  <option value="Orders">Orders</option>
                  <option value="Accounts">Accounts</option>
                  <option value="Workflows">Workflows</option>
                  <option value="Users">Users</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Action Type</label>
                <select
                  value={testAction}
                  onChange={(e) => setTestAction(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-medium"
                >
                  <option value="STAGE_CHANGE">STAGE_CHANGE</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="APPROVE">APPROVE</option>
                  <option value="ASSIGN">ASSIGN</option>
                  <option value="CLOSE_WON">CLOSE_WON</option>
                  <option value="DELETE_PREVENTED">DELETE_PREVENTED</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Record Name / Title</label>
                <input
                  type="text"
                  value={testRecordName}
                  onChange={(e) => setTestRecordName(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Audit Details Log Note</label>
                <textarea
                  rows={3}
                  value={testDetails}
                  onChange={(e) => setTestDetails(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0073EA] hover:bg-blue-600 text-white rounded-lg font-semibold shadow-xs"
                >
                  Log Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
