import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { PresalesRequest, PresalesType, PresalesStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  Cpu,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Building2,
  UserCheck,
  Sparkles,
  Layers,
  X,
  FileCheck2,
  Calendar,
  AlertCircle
} from 'lucide-react';

export const PresalesPOCView: React.FC = () => {
  const {
    currentUser,
    accessiblePresales,
    accessibleOpportunities,
    allUsers,
    createPresalesRequest,
    updatePresalesRequest
  } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inspectingRequest, setInspectingRequest] = useState<PresalesRequest | null>(null);

  const [createData, setCreateData] = useState({
    opportunityId: accessibleOpportunities[0]?.id || '',
    requestType: 'Proof of Concept (POC)' as PresalesType,
    scopeDescription: '',
    pocSuccessCriteria: [
      'Customer LDAP / SSO directory integration verification',
      'Migration of 500 test issues from legacy ticketing system',
      'Automated SLA and escalation rule workflow validation'
    ],
    assignedConsultantId: allUsers.find(u => u.role === 'Presales Consultant')?.id || '',
    targetSignOffDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
    environmentDetails: 'Atlassian Cloud Premium trial tenant with Jira Service Management & Confluence'
  });

  const filteredRequests = accessiblePresales.filter(req => {
    const scope = req.scopeDescription || req.objective || '';
    const reqType = req.requestType || req.type || '';
    const matchesSearch =
      req.opportunityTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scope.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === 'ALL' || reqType === selectedTypeFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || req.status === selectedStatusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const opp = accessibleOpportunities.find(o => o.id === createData.opportunityId) || accessibleOpportunities[0];
    if (!opp) return;

    createPresalesRequest({
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      accountId: opp.accountId,
      accountName: opp.accountName,
      type: createData.requestType,
      requestType: createData.requestType,
      status: 'Requested',
      objective: createData.scopeDescription,
      scopeDescription: createData.scopeDescription,
      pocSuccessCriteria: createData.pocSuccessCriteria,
      assignedConsultantId: createData.assignedConsultantId,
      targetSignOffDate: createData.targetSignOffDate,
      targetCompletionDate: createData.targetSignOffDate,
      environmentDetails: createData.environmentDetails
    });

    setShowCreateModal(false);
  };

  const handleUpdateStatus = (reqId: string, nextStatus: PresalesStatus) => {
    updatePresalesRequest(reqId, { status: nextStatus });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Presales &amp; POC Engagements</h1>
            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              {filteredRequests.length} Active Engagements
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Solution architecture, customer proof-of-concept success criteria, SOW sizing, and technical sign-offs.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#0073EA] hover:bg-blue-600 text-white rounded-md text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Request Presales / POC</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search engagement, account, scope..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
            <span className="text-gray-400 text-[11px]">Type:</span>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="bg-transparent font-semibold text-gray-700 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Types</option>
              <option value="Proof of Concept (POC)">Proof of Concept (POC)</option>
              <option value="Demo">Demo / Technical Demo</option>
              <option value="Architecture Review">Architecture Review</option>
              <option value="SOW Scoping">SOW Scoping</option>
              <option value="RFP Technical Response">RFP Technical Response</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
            <span className="text-gray-400 text-[11px]">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-gray-700 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="Requested">Requested</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {(selectedTypeFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedTypeFilter('ALL');
              setSelectedStatusFilter('ALL');
              setSearchQuery('');
            }}
            className="text-blue-600 hover:text-blue-800 font-semibold text-xs"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Grid of Engagements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRequests.map((req) => (
          <div
            key={req.id}
            onClick={() => setInspectingRequest(req)}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">
                  {req.requestType || req.type || 'Presales'}
                </span>
                <StatusBadge status={req.status} size="sm" />
              </div>

              <h3 className="font-bold text-gray-800 text-sm mt-2">{req.opportunityTitle}</h3>
              <p className="text-gray-500 text-xs mt-0.5">{req.accountName}</p>

              <p className="text-gray-600 text-xs mt-3 line-clamp-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                {req.scopeDescription || req.objective || 'Technical engagement in progress.'}
              </p>

              {/* POC Criteria count */}
              {req.pocSuccessCriteria && req.pocSuccessCriteria.length > 0 && (
                <div className="mt-3 text-[11px] text-gray-500 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{req.pocSuccessCriteria.length} Defined Success Criteria</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">
                Consultant: <strong>{req.assignedConsultantName || 'Assigned'}</strong>
              </span>
              <span className="text-gray-400 text-[11px]">
                Target: {req.targetSignOffDate || req.targetCompletionDate ? new Date(req.targetSignOffDate || req.targetCompletionDate!).toLocaleDateString() : 'Active'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Request Presales &amp; POC Engagement</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Target Opportunity Deal</label>
                <select
                  value={createData.opportunityId}
                  onChange={(e) => setCreateData({ ...createData, opportunityId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-xs outline-none font-semibold"
                >
                  {accessibleOpportunities.map(o => (
                    <option key={o.id} value={o.id}>{o.title} ({o.accountName})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Engagement Type</label>
                  <select
                    value={createData.requestType}
                    onChange={(e) => setCreateData({ ...createData, requestType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-xs outline-none"
                  >
                    <option value="Proof of Concept (POC)">Proof of Concept (POC)</option>
                    <option value="Demo">Technical Demo</option>
                    <option value="Architecture Review">Architecture &amp; Sizing</option>
                    <option value="SOW Scoping">SOW Scope Definition</option>
                    <option value="RFP Technical Response">RFP Technical Response</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Assign Technical Consultant</label>
                  <select
                    value={createData.assignedConsultantId}
                    onChange={(e) => setCreateData({ ...createData, assignedConsultantId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-xs outline-none"
                  >
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Scope &amp; Technical Objectives</label>
                <textarea
                  rows={3}
                  value={createData.scopeDescription}
                  onChange={(e) => setCreateData({ ...createData, scopeDescription: e.target.value })}
                  placeholder="Describe technical evaluation parameters, integrations, and milestones..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Target Evaluation Completion Date</label>
                <input
                  type="date"
                  value={createData.targetSignOffDate}
                  onChange={(e) => setCreateData({ ...createData, targetSignOffDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0073EA] hover:bg-blue-600 text-white rounded-md font-semibold text-xs shadow-xs"
                >
                  Initialize Engagement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT MODAL */}
      {inspectingRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-gray-400">{inspectingRequest.reqNumber}</span>
                <h3 className="text-base font-bold text-gray-900">{inspectingRequest.opportunityTitle}</h3>
              </div>
              <button onClick={() => setInspectingRequest(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-400 block text-[10px]">Account Name</span>
                  <span className="font-bold text-gray-800">{inspectingRequest.accountName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Status</span>
                  <StatusBadge status={inspectingRequest.status} size="sm" />
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Assigned Technical Lead</span>
                  <span className="font-semibold text-gray-800">{inspectingRequest.assignedConsultantName || 'Presales Lead'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Target Date</span>
                  <span className="font-semibold text-gray-800">{inspectingRequest.targetSignOffDate || inspectingRequest.targetCompletionDate || 'Flexible'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-1">Scope &amp; Architecture Notes</h4>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 leading-relaxed">
                  {inspectingRequest.scopeDescription || inspectingRequest.objective || 'Standard technical evaluation.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 font-semibold">Change Status:</span>
                  <select
                    value={inspectingRequest.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as PresalesStatus;
                      handleUpdateStatus(inspectingRequest.id, newStatus);
                      setInspectingRequest({ ...inspectingRequest, status: newStatus });
                    }}
                    className="bg-gray-50 border border-gray-300 rounded-md px-2 py-1 text-xs font-semibold text-gray-700 outline-none"
                  >
                    <option value="Requested">Requested</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <button
                  onClick={() => setInspectingRequest(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
