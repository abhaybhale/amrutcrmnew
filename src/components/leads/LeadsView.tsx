import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Lead, LeadStatus, PriorityLevel, LeadSource } from '../../types';
import { StatusBadge, PriorityBadge, SLACountdownBadge } from '../common/StatusBadge';
import { CustomerHistoryPeek } from '../common/CustomerHistoryPeek';
import { LeadDrawer } from './LeadDrawer';
import { BulkImportModal } from '../common/BulkImportModal';
import { KanbanColumn, KanbanCard } from '../common/DragDropKanban';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import confetti from 'canvas-confetti';
import {
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  Table as TableIcon,
  Kanban,
  UserCheck,
  Sparkles,
  ArrowRight,
  Building2,
  Phone,
  Mail,
  MoreHorizontal,
  Layers,
  Clock,
  CheckCircle2,
  X,
  AlertCircle,
  FileCheck2,
  DollarSign,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';

export const LeadsView: React.FC = () => {
  const {
    currentUser,
    accessibleLeads,
    vendors,
    products,
    allUsers,
    accounts,
    contacts,
    roles,
    createLead,
    updateLead,
    assignLead,
    convertLeadToOpportunity,
    searchCustomerHistory,
    getFieldAccess,
    showToast
  } = useCRM();

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Vendor → Product cascading options: prefer the priced catalog, fall
  // back to the vendor's plain focusProducts list if nothing's catalogued
  // for it yet (e.g. a newly added vendor before Admin adds its products).
  const productOptionsForVendor = (vendorId: string): { value: string; label: string }[] => {
    const catalogued = products.filter(p => p.vendorId === vendorId && p.isActive);
    if (catalogued.length > 0) {
      return catalogued.map(p => ({ value: p.name, label: `${p.name} — ₹${p.listPrice.toLocaleString('en-IN')}` }));
    }
    const vendor = vendors.find(v => v.id === vendorId);
    return (vendor?.focusProducts || []).map(name => ({ value: name, label: name }));
  };

  const canAssignLeads =
    currentUser.role === 'CRM Administrator' ||
    currentUser.role === 'Managing Director' ||
    currentUser.role === 'Sales Head' ||
    currentUser.role === 'Sales Manager' ||
    currentUser.role === 'Sales Coordinator' ||
    currentUser.role === 'Lead Gen Manager' ||
    Boolean(roles.find(r => r.name === currentUser.role)?.permissions?.canAssignLeads);

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');

  // Selected lead for inspection drawer
  const [inspectingLead, setInspectingLead] = useState<Lead | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [targetLeadForAction, setTargetLeadForAction] = useState<Lead | null>(null);

  // Create Form State
  const [createFormData, setCreateFormData] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    designation: '',
    city: 'Mumbai',
    country: 'India',
    source: 'OEM / Vendor Referral' as LeadSource,
    subSource: '',
    vendorId: vendors[0]?.id || 'v_atlassian',
    product: '',
    expectedValue: 500000,
    priority: 'High' as PriorityLevel,
    territory: 'Mumbai & Pune (West)',
    requirement: '',
    workingSalespersonId: currentUser.role === 'Sales Person' ? currentUser.id : '',
    budgetStatus: 'Budget Allocated' as any,
    authorityStatus: 'Decision Maker Identified' as any,
    needStatus: 'Defined Project Need' as any,
    timelineStatus: '1–3 Months' as any,
    notes: ''
  });

  // Assign Modal State
  const [assignData, setAssignData] = useState({
    newOwnerId: '',
    reason: 'Named Account Alignment',
    slaResetDecision: 'Preserve SLA' as 'Reset SLA' | 'Preserve SLA',
    notes: ''
  });

  // Convert Modal State
  const [convertData, setConvertData] = useState<{
    accountChoice: 'existing' | 'new';
    selectedAccountId: string;
    newAccountName: string;
    newAccountIndustry: string;
    contactChoice: 'existing' | 'new';
    selectedContactId: string;
    newContactName: string;
    newContactEmail: string;
    opportunityTitle: string;
    pipeline: any;
    expectedCloseDate: string;
  }>({
    accountChoice: 'new',
    selectedAccountId: '',
    newAccountName: '',
    newAccountIndustry: 'Enterprise Technology',
    contactChoice: 'new',
    selectedContactId: '',
    newContactName: '',
    newContactEmail: '',
    opportunityTitle: '',
    pipeline: 'Software + Presales / POC',
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
  });

  // Filtered Leads
  const filteredLeads = accessibleLeads.filter(lead => {
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (lead.companyName || '').toLowerCase().includes(q) ||
      (lead.contactName || '').toLowerCase().includes(q) ||
      (lead.product || '').toLowerCase().includes(q) ||
      (lead.leadNumber || '').toLowerCase().includes(q) ||
      (lead.city || '').toLowerCase().includes(q) ||
      (lead.designation || '').toLowerCase().includes(q);

    const matchesVendor = selectedVendorFilter === 'ALL' || lead.vendorId === selectedVendorFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || lead.status === selectedStatusFilter;
    const matchesPriority = selectedPriorityFilter === 'ALL' || lead.priority === selectedPriorityFilter;

    return matchesSearch && matchesVendor && matchesStatus && matchesPriority;
  });

  // Drag-and-drop: move a lead card to a new status column
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const lead = filteredLeads.find(l => l.id === active.id);
    const targetStatus = String(over.id) as LeadStatus;
    if (!lead || lead.status === targetStatus) return;

    updateLead(lead.id, { status: targetStatus });
  };

  // Open Assign Modal Handler
  const handleOpenAssignModal = (lead: Lead) => {
    setTargetLeadForAction(lead);
    setAssignData({
      newOwnerId: lead.workingSalespersonId || allUsers.find(u => u.role === 'Sales Person')?.id || '',
      reason: 'Workload & Territory Allocation',
      slaResetDecision: 'Preserve SLA',
      notes: ''
    });
    setShowAssignModal(true);
  };

  // Submit Assign
  const handleExecuteAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLeadForAction || !assignData.newOwnerId) return;
    assignLead(
      targetLeadForAction.id,
      assignData.newOwnerId,
      assignData.reason,
      assignData.slaResetDecision,
      assignData.notes
    );
    setShowAssignModal(false);
    if (inspectingLead && inspectingLead.id === targetLeadForAction.id) {
      setInspectingLead(null);
    }
  };

  // Open Convert Modal Handler
  const handleOpenConvertModal = (lead: Lead) => {
    setTargetLeadForAction(lead);
    const history = searchCustomerHistory(lead.companyName);

    setConvertData({
      accountChoice: history.matchedAccount ? 'existing' : 'new',
      selectedAccountId: history.matchedAccount?.id || '',
      newAccountName: lead.companyName,
      newAccountIndustry: 'Information Technology',
      contactChoice: history.matchedContacts.length > 0 ? 'existing' : 'new',
      selectedContactId: history.matchedContacts[0]?.id || '',
      newContactName: lead.contactName,
      newContactEmail: lead.contactEmail,
      opportunityTitle: `${lead.companyName} - ${lead.product}`,
      pipeline: 'Software + Presales / POC',
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
    });
    setShowConvertModal(true);
  };

  // Submit Lead Conversion
  const handleExecuteConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLeadForAction) return;

    try {
      convertLeadToOpportunity(
        targetLeadForAction.id,
        {
          type: convertData.accountChoice,
          accountId: convertData.selectedAccountId,
          newAccountData: {
            name: convertData.newAccountName,
            industry: convertData.newAccountIndustry
          }
        },
        {
          type: convertData.contactChoice,
          contactId: convertData.selectedContactId,
          newContactData: {
            name: convertData.newContactName,
            email: convertData.newContactEmail
          }
        },
        {
          title: convertData.opportunityTitle,
          pipeline: convertData.pipeline,
          expectedCloseDate: convertData.expectedCloseDate
        }
      );

      // Trigger Confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // Safe fallback
      }

      setShowConvertModal(false);
      if (inspectingLead) setInspectingLead(null);
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Lead conversion failed.', 'error');
    }
  };

  // Submit Create Lead
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find(v => v.id === createFormData.vendorId) || vendors[0];

    createLead({
      companyName: createFormData.companyName,
      contactName: createFormData.contactName,
      contactEmail: createFormData.contactEmail,
      contactPhone: createFormData.contactPhone,
      designation: createFormData.designation,
      city: createFormData.city,
      country: createFormData.country,
      source: createFormData.source,
      subSource: createFormData.subSource,
      vendorId: vendor.id,
      vendorName: vendor.name,
      product: createFormData.product || vendor.focusProducts[0],
      expectedValue: Number(createFormData.expectedValue),
      priority: createFormData.priority,
      territory: createFormData.territory,
      requirement: createFormData.requirement,
      workingSalespersonId: createFormData.workingSalespersonId,
      bant: {
        budget: createFormData.budgetStatus,
        authority: createFormData.authorityStatus,
        need: createFormData.needStatus,
        timeline: createFormData.timelineStatus,
        budgetAmount: Number(createFormData.expectedValue)
      },
      notes: createFormData.notes
    });

    setShowCreateModal(false);
    // Reset form
    setCreateFormData({
      companyName: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      designation: '',
      city: 'Mumbai',
      country: 'India',
      source: 'OEM / Vendor Referral',
      subSource: '',
      vendorId: vendors[0]?.id || 'v_atlassian',
      product: '',
      expectedValue: 500000,
      priority: 'High',
      territory: 'Mumbai & Pune (West)',
      requirement: '',
      workingSalespersonId: currentUser.role === 'Sales Person' ? currentUser.id : '',
      budgetStatus: 'Budget Allocated',
      authorityStatus: 'Decision Maker Identified',
      needStatus: 'Defined Project Need',
      timelineStatus: '1–3 Months',
      notes: ''
    });
  };

  // Group leads for Kanban
  const kanbanStages: LeadStatus[] = [
    'New – Unvalidated',
    'Validation in Progress',
    'Assigned – Awaiting Acceptance',
    'Connected / Discovery',
    'Qualification in Progress',
    'Qualified – Convert to Opportunity'
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Leads Workspace</h1>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredLeads.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise lead intake, qualification, SLA monitoring, and seamless Lead-to-Opportunity upgrade.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                viewMode === 'kanban' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
          >
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <span>Bulk Import XLS / CSV</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by company, product..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
            />
          </div>

          {/* Vendor Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-400 text-[11px]">OEM:</span>
            <select
              value={selectedVendorFilter}
              onChange={(e) => setSelectedVendorFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All OEMs</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-400 text-[11px]">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="New – Unvalidated">New – Unvalidated</option>
              <option value="Assigned – Awaiting Acceptance">Assigned</option>
              <option value="Connected / Discovery">Connected / Discovery</option>
              <option value="Qualification in Progress">Qualification in Progress</option>
              <option value="Qualified – Convert to Opportunity">Qualified</option>
              <option value="Converted">Converted</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-400 text-[11px]">Priority:</span>
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Quick Clear */}
        {(selectedVendorFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || selectedPriorityFilter !== 'ALL' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedVendorFilter('ALL');
              setSelectedStatusFilter('ALL');
              setSelectedPriorityFilter('ALL');
              setSearchQuery('');
            }}
            className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Lead & Company</th>
                  <th className="py-3.5 px-4">OEM & Product</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Working Salesperson</th>
                  <th className="py-3.5 px-4">Reporter</th>
                  <th className="py-3.5 px-4 text-right">Expected Value</th>
                  <th className="py-3.5 px-4">SLA Clock</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400 italic">
                      No leads match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isConverted = lead.status === 'Converted';
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setInspectingLead(lead)}
                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                      >
                        {/* Lead & Company */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {lead.leadNumber}
                            </span>
                            <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {lead.companyName}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5 flex items-center space-x-2">
                            <span>{lead.contactName} ({lead.designation})</span>
                            <span>•</span>
                            <span className="text-slate-400">{lead.city}</span>
                          </div>
                        </td>

                        {/* Product */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 block truncate max-w-[190px]">
                            {lead.product}
                          </span>
                          <span className="text-indigo-600 text-[11px] font-medium block">
                            {lead.vendorName}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={lead.status} size="sm" />
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <PriorityBadge priority={lead.priority} />
                        </td>

                        {/* Working Salesperson */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5 font-medium text-slate-800">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                              {lead.workingSalespersonName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span>{lead.workingSalespersonName}</span>
                          </div>
                        </td>

                        {/* Reporter */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                          {lead.reporterName}
                        </td>

                        {/* Value */}
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          ₹{(lead.expectedValue / 100000).toFixed(1)} L
                        </td>

                        {/* SLA */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <SLACountdownBadge dueTime={lead.slaDueTime} status={lead.slaStatus} />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-1.5">
                            {!isConverted ? (
                              <button
                                onClick={() => handleOpenConvertModal(lead)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 border border-emerald-200"
                                title="Convert Lead to Opportunity"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Convert</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Converted
                              </span>
                            )}

                            {canAssignLeads && (
                              <button
                                onClick={() => handleOpenAssignModal(lead)}
                                className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg"
                                title="Reassign Lead"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <DndContext sensors={dndSensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
            {kanbanStages.map((stg) => {
              const stageLeads = filteredLeads.filter(l => l.status === stg);
              return (
                <KanbanColumn
                  key={stg}
                  id={stg}
                  className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200 flex flex-col min-w-[240px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="font-bold text-slate-800 text-xs truncate">{stg}</span>
                    <span className="bg-slate-200 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div className="space-y-2.5 flex-1 min-h-[64px]">
                    {stageLeads.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-[11px] border border-dashed border-slate-200 rounded-xl">
                        Drop here
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <KanbanCard
                          key={lead.id}
                          id={lead.id}
                          onClick={() => setInspectingLead(lead)}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-slate-400">{lead.leadNumber}</span>
                            <PriorityBadge priority={lead.priority} />
                          </div>

                          <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{lead.companyName}</h4>
                          <p className="text-indigo-600 font-medium text-[11px] line-clamp-1">{lead.product}</p>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                            <span className="font-bold text-slate-800">₹{(lead.expectedValue / 100000).toFixed(1)}L</span>
                            <span className="text-slate-500 font-medium truncate max-w-[90px]">{lead.workingSalespersonName}</span>
                          </div>
                        </KanbanCard>
                      ))
                    )}
                  </div>
                </KanbanColumn>
              );
            })}
          </div>
        </DndContext>
      )}

      {/* INSPECTION DRAWER */}
      <LeadDrawer
        lead={inspectingLead}
        onClose={() => setInspectingLead(null)}
        onOpenAssignModal={handleOpenAssignModal}
        onOpenConvertModal={handleOpenConvertModal}
      />

      {/* CREATE LEAD MODAL (WITH LIVE CUSTOMER HISTORY PEEK SIDE PANEL!) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create New Enterprise Lead</h3>
                <p className="text-xs text-slate-500">
                  Real-time customer history peeking will automatically search past accounts, deals & installed products as you type.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead}>
              <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 max-h-[75vh] overflow-y-auto">
                {/* Left Column: Form Inputs (7 cols) */}
                <div className="lg:col-span-7 p-6 space-y-4 text-xs">
                  {/* Company Name */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Customer / Company Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createFormData.companyName}
                      onChange={(e) => setCreateFormData({ ...createFormData, companyName: e.target.value })}
                      placeholder="e.g. Tata Consultancy Services Ltd, Reliance Jio"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-slate-900"
                    />
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Contact Stakeholder</label>
                      <input
                        type="text"
                        required
                        value={createFormData.contactName}
                        onChange={(e) => setCreateFormData({ ...createFormData, contactName: e.target.value })}
                        placeholder="e.g. Mahesh Kulkarni"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Designation</label>
                      <input
                        type="text"
                        value={createFormData.designation}
                        onChange={(e) => setCreateFormData({ ...createFormData, designation: e.target.value })}
                        placeholder="e.g. Head of DevOps & Tooling"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={createFormData.contactEmail}
                        onChange={(e) => setCreateFormData({ ...createFormData, contactEmail: e.target.value })}
                        placeholder="name@company.com"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Mobile / Phone</label>
                      <input
                        type="text"
                        value={createFormData.contactPhone}
                        onChange={(e) => setCreateFormData({ ...createFormData, contactPhone: e.target.value })}
                        placeholder="+91 98200 12345"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Vendor & Product */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">OEM / Vendor</label>
                      <select
                        value={createFormData.vendorId}
                        onChange={(e) => {
                          const vId = e.target.value;
                          const options = productOptionsForVendor(vId);
                          setCreateFormData({
                            ...createFormData,
                            vendorId: vId,
                            product: options[0]?.value || ''
                          });
                        }}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                      >
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Product / Solution</label>
                      <select
                        value={createFormData.product}
                        onChange={(e) => setCreateFormData({ ...createFormData, product: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                      >
                        <option value="">Select a product…</option>
                        {productOptionsForVendor(createFormData.vendorId).map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Commercials & Priority */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Expected Value (₹)</label>
                      <input
                        type="number"
                        value={createFormData.expectedValue}
                        onChange={(e) => setCreateFormData({ ...createFormData, expectedValue: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Priority</label>
                      <select
                        value={createFormData.priority}
                        onChange={(e) => setCreateFormData({ ...createFormData, priority: e.target.value as any })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                      >
                        <option value="Urgent">Urgent</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Territory</label>
                      <select
                        value={createFormData.territory}
                        onChange={(e) => setCreateFormData({ ...createFormData, territory: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                      >
                        <option value="Mumbai & Pune (West)">Mumbai & Pune (West)</option>
                        <option value="Bengaluru & Hyderabad (South)">Bengaluru & Hyderabad (South)</option>
                        <option value="Delhi NCR (North)">Delhi NCR (North)</option>
                        <option value="Pan India & APAC">Pan India & APAC</option>
                      </select>
                    </div>
                  </div>

                  {/* Source & Salesperson Assignment */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Lead Source</label>
                      <select
                        value={createFormData.source}
                        onChange={(e) => setCreateFormData({ ...createFormData, source: e.target.value as any })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                      >
                        <option value="OEM / Vendor Referral">OEM / Vendor Referral</option>
                        <option value="Website Inbound">Website Inbound</option>
                        <option value="Existing Customer Expansion">Existing Customer Expansion</option>
                        <option value="Google Campaign">Google Campaign</option>
                        <option value="Closed-Door Event">Closed-Door Event</option>
                        <option value="Cold Calling">Cold Calling</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Assign Working Salesperson</label>
                      <select
                        value={createFormData.workingSalespersonId}
                        onChange={(e) => setCreateFormData({ ...createFormData, workingSalespersonId: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                      >
                        <option value="">Auto-Assign (Territory / Round-Robin)</option>
                        {allUsers.filter(u => u.role === 'Sales Person').map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.territory})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Requirement Text */}
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Technical Requirement / Notes</label>
                    <textarea
                      rows={2}
                      value={createFormData.requirement}
                      onChange={(e) => setCreateFormData({ ...createFormData, requirement: e.target.value })}
                      placeholder="Specify user tiers, license count, migration requirements..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Right Column: Real-Time Customer History Live Peek (5 cols) */}
                <div className="lg:col-span-5 p-6 bg-slate-50/50">
                  <CustomerHistoryPeek
                    companyName={createFormData.companyName}
                    onSelectAccount={(accId) => {
                      const acc = accounts.find(a => a.id === accId);
                      if (acc) {
                        setCreateFormData({
                          ...createFormData,
                          companyName: acc.name,
                          city: acc.city
                        });
                      }
                    }}
                    onSelectContact={(cntId) => {
                      const cnt = contacts.find(c => c.id === cntId);
                      if (cnt) {
                        setCreateFormData({
                          ...createFormData,
                          contactName: cnt.name,
                          contactEmail: cnt.email,
                          contactPhone: cnt.phone,
                          designation: cnt.designation
                        });
                      }
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30 transition-all"
                >
                  Create &amp; Route Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REASSIGN LEAD MODAL */}
      {showAssignModal && targetLeadForAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Reassign Lead: {targetLeadForAction.leadNumber}
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteAssign} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <p className="text-indigo-900 font-semibold">{targetLeadForAction.companyName}</p>
                <p className="text-indigo-700 text-[11px] mt-0.5">
                  Current Owner: <strong>{targetLeadForAction.workingSalespersonName}</strong>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Working Salesperson</label>
                <select
                  value={assignData.newOwnerId}
                  onChange={(e) => setAssignData({ ...assignData, newOwnerId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                >
                  {allUsers.filter(u => u.role === 'Sales Person' || u.role === 'Sales Manager' || u.role === 'Sales Coordinator' || u.role === 'Sales Head' || u.department === 'Sales').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.territory}) {u.isOutOfOffice ? '⚠️ Out of Office' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assignment Reason</label>
                <select
                  value={assignData.reason}
                  onChange={(e) => setAssignData({ ...assignData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                >
                  <option value="Named Account Alignment">Named Account Alignment</option>
                  <option value="Territory Rebalance">Territory Rebalance</option>
                  <option value="OEM Competency Specialization">OEM Competency Specialization</option>
                  <option value="Primary Rep Out of Office / Leave">Primary Rep Out of Office / Leave</option>
                  <option value="Management Reallocation">Management Reallocation</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">SLA Decision</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="slaReset"
                      checked={assignData.slaResetDecision === 'Preserve SLA'}
                      onChange={() => setAssignData({ ...assignData, slaResetDecision: 'Preserve SLA' })}
                    />
                    <span>Preserve Current SLA Clock</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="slaReset"
                      checked={assignData.slaResetDecision === 'Reset SLA'}
                      onChange={() => setAssignData({ ...assignData, slaResetDecision: 'Reset SLA' })}
                    />
                    <span>Reset SLA Clock (24h)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes &amp; Instructions</label>
                <textarea
                  rows={2}
                  value={assignData.notes}
                  onChange={(e) => setAssignData({ ...assignData, notes: e.target.value })}
                  placeholder="Special instructions for new owner..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD TO OPPORTUNITY CONVERSION WIZARD */}
      {showConvertModal && targetLeadForAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-emerald-950 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold">Upgrade Lead to Opportunity</h3>
                  <p className="text-xs text-emerald-200">
                    Converts {targetLeadForAction.leadNumber} and links Account, Contact &amp; Pipeline Deal.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="text-emerald-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteConversion} className="p-6 space-y-5 text-xs">
              {/* Account Mapping */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span>Account Mapping</span>
                </h4>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="accountChoice"
                      checked={convertData.accountChoice === 'new'}
                      onChange={() => setConvertData({ ...convertData, accountChoice: 'new' })}
                    />
                    <span>Create New Account</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="radio"
                      name="accountChoice"
                      checked={convertData.accountChoice === 'existing'}
                      onChange={() => setConvertData({ ...convertData, accountChoice: 'existing' })}
                    />
                    <span>Link to Existing Account</span>
                  </label>
                </div>

                {convertData.accountChoice === 'new' ? (
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">New Account Name</label>
                    <input
                      type="text"
                      required
                      value={convertData.newAccountName}
                      onChange={(e) => setConvertData({ ...convertData, newAccountName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Select Existing Account</label>
                    <select
                      value={convertData.selectedAccountId}
                      onChange={(e) => setConvertData({ ...convertData, selectedAccountId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                    >
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.city})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Contact Mapping */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-sky-600" />
                  <span>Contact Stakeholder Mapping</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Primary Contact Name</label>
                    <input
                      type="text"
                      required
                      value={convertData.newContactName}
                      onChange={(e) => setConvertData({ ...convertData, newContactName: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={convertData.newContactEmail}
                      onChange={(e) => setConvertData({ ...convertData, newContactEmail: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Opportunity Parameters */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Opportunity Details</span>
                </h4>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Opportunity Title</label>
                  <input
                    type="text"
                    required
                    value={convertData.opportunityTitle}
                    onChange={(e) => setConvertData({ ...convertData, opportunityTitle: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Target Pipeline</label>
                    <select
                      value={convertData.pipeline}
                      onChange={(e) => setConvertData({ ...convertData, pipeline: e.target.value as any })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                    >
                      <option value="Software + Presales / POC">Software + Presales / POC</option>
                      <option value="Software – Direct / Simple">Software – Direct / Simple</option>
                      <option value="Services / Customisation">Services / Customisation</option>
                      <option value="Renewal / Expansion">Renewal / Expansion</option>
                      <option value="Tender / Formal RFP">Tender / Formal RFP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Expected Close Date</label>
                    <input
                      type="date"
                      value={convertData.expectedCloseDate}
                      onChange={(e) => setConvertData({ ...convertData, expectedCloseDate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-slate-500 text-[11px]">
                  All BANT, notes &amp; attachments will carry forward automatically.
                </span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowConvertModal(false)}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Conversion</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        initialModule="Leads"
      />
    </div>
  );
};
