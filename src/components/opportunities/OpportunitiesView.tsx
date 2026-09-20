import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Opportunity, OpportunityStage, PipelineType, PriorityLevel } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { OpportunityDrawer } from './OpportunityDrawer';
import { BulkImportModal } from '../common/BulkImportModal';
import { KanbanColumn, KanbanCard } from '../common/DragDropKanban';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import confetti from 'canvas-confetti';
import {
  Plus,
  Search,
  Filter,
  Table as TableIcon,
  Kanban,
  Briefcase,
  DollarSign,
  TrendingUp,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  MoreHorizontal,
  X,
  Layers,
  ChevronDown,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';

interface OpportunitiesViewProps {
  onOpenCreateQuote?: (opp: Opportunity) => void;
  onOpenCreatePOC?: (opp: Opportunity) => void;
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  onOpenCreateQuote,
  onOpenCreatePOC
}) => {
  const {
    currentUser,
    accessibleOpportunities,
    accounts,
    vendors,
    products,
    allUsers,
    createOpportunity,
    updateOpportunity,
    advanceOpportunityStage
  } = useCRM();

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const productOptionsForVendor = (vendorId: string): { value: string; label: string }[] => {
    const catalogued = products.filter(p => p.vendorId === vendorId && p.isActive);
    if (catalogued.length > 0) {
      return catalogued.map(p => ({ value: p.name, label: `${p.name} — ₹${p.listPrice.toLocaleString('en-IN')}` }));
    }
    const vendor = vendors.find(v => v.id === vendorId);
    return (vendor?.focusProducts || []).map(name => ({ value: name, label: name }));
  };

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');

  // Inspection Drawer
  const [inspectingOpp, setInspectingOpp] = useState<Opportunity | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showClosureWizard, setShowClosureWizard] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [closureOutcome, setClosureOutcome] = useState<'Won' | 'Lost' | 'Shelved'>('Won');
  const [targetOppForClosure, setTargetOppForClosure] = useState<Opportunity | null>(null);

  // Create Opp State
  const [createFormData, setCreateFormData] = useState({
    title: '',
    accountId: accounts[0]?.id || '',
    vendorId: vendors[0]?.id || 'v_atlassian',
    product: '',
    pipeline: 'Software + Presales / POC' as PipelineType,
    stage: 'Qualified Opportunity' as OpportunityStage,
    softwareValue: 800000,
    servicesValue: 200000,
    probability: 40,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    description: '',
    nextAction: 'Technical Discovery Call',
    ownerId: currentUser.role === 'Sales Person' ? currentUser.id : ''
  });

  // Closure Form State
  const [closureForm, setClosureForm] = useState({
    customerPoNumber: 'PO-2026-',
    customerPoDate: new Date().toISOString().split('T')[0],
    billingMilestones: '100% Advance against PO',
    finalContractValue: 0,
    lossReason: 'Competitor Price Discounting' as any,
    competitorName: '',
    competitorPrice: 0,
    lossNotes: '',
    shelvedReason: 'Budget Postponed to Next Financial Year',
    revisitDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0]
  });

  // Filtered Opportunities
  const filteredOpps = accessibleOpportunities.filter(opp => {
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (opp.title || '').toLowerCase().includes(q) ||
      (opp.accountName || '').toLowerCase().includes(q) ||
      (opp.oppNumber || '').toLowerCase().includes(q) ||
      (opp.product || '').toLowerCase().includes(q);

    const matchesPipeline = selectedPipeline === 'ALL' || opp.pipeline === selectedPipeline;
    const matchesVendor = selectedVendorFilter === 'ALL' || opp.vendorId === selectedVendorFilter;
    const matchesStage = selectedStageFilter === 'ALL' || opp.stage === selectedStageFilter;

    return matchesSearch && matchesPipeline && matchesVendor && matchesStage;
  });

  // Pipeline stages for Kanban
  const kanbanStages: OpportunityStage[] = [
    'Qualified Opportunity',
    'Discovery / BANT',
    'Presales / POC in Progress',
    'Solution & Commercial Inputs Ready',
    'Quote Submitted',
    'Negotiation',
    'Closed Won',
    'Closed Lost'
  ];

  // Pipeline summary metrics
  const totalPipelineValue = filteredOpps.reduce((sum, o) => sum + (o.stage !== 'Closed Lost' ? (Number(o.totalValue) || 0) : 0), 0);
  const weightedPipelineValue = filteredOpps.reduce((sum, o) => sum + (o.stage !== 'Closed Lost' ? (Number(o.weightedValue) || Math.round((Number(o.totalValue) || 0) * (Number(o.probability || 40) / 100))) : 0), 0);
  const wonOpps = filteredOpps.filter(o => o.stage === 'Closed Won');
  const wonValue = wonOpps.reduce((sum, o) => sum + (Number(o.totalValue) || 0), 0);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const opp = filteredOpps.find(o => o.id === active.id);
    const targetStage = String(over.id) as OpportunityStage;
    if (!opp || opp.stage === targetStage) return;

    // Terminal stages need PO / loss-reason details, so route those through
    // the existing closure wizard instead of silently flipping the stage.
    if (targetStage === 'Closed Won') {
      handleOpenCloseWizard(opp, 'Won');
    } else if (targetStage === 'Closed Lost') {
      handleOpenCloseWizard(opp, 'Lost');
    } else {
      advanceOpportunityStage(opp.id, targetStage);
    }
  };

  const handleOpenCloseWizard = (opp: Opportunity, outcome: 'Won' | 'Lost' | 'Shelved') => {
    setTargetOppForClosure(opp);
    setClosureOutcome(outcome);
    setClosureForm({
      customerPoNumber: `PO-${opp.oppNumber.replace('OPP-', '')}-99`,
      customerPoDate: new Date().toISOString().split('T')[0],
      billingMilestones: '100% on license delivery',
      finalContractValue: opp.totalValue,
      lossReason: 'Competitor Price Discounting',
      competitorName: opp.competitor || 'Competitor OEM Partner',
      competitorPrice: Math.round(opp.totalValue * 0.85),
      lossNotes: '',
      shelvedReason: 'Customer frozen IT budget for this quarter',
      revisitDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString().split('T')[0]
    });
    setShowClosureWizard(true);
  };

  const handleExecuteClosure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOppForClosure) return;

    let completed = false;
    if (closureOutcome === 'Won') {
      completed = advanceOpportunityStage(
        targetOppForClosure.id,
        'Closed Won',
        {
          poRef: closureForm.customerPoNumber,
          orderDate: closureForm.customerPoDate,
          billingMilestones: closureForm.billingMilestones,
          finalContractValue: Number(closureForm.finalContractValue)
        }
      );

      if (completed) try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (err) {}
    } else if (closureOutcome === 'Lost') {
      completed = advanceOpportunityStage(
        targetOppForClosure.id,
        'Closed Lost',
        { reason: closureForm.lossReason, competitor: closureForm.competitorName, lossNotes: closureForm.lossNotes }
      );
    } else {
      completed = advanceOpportunityStage(
        targetOppForClosure.id,
        'Shelved / Budgeted',
        { reason: closureForm.shelvedReason, revisitDate: closureForm.revisitDate }
      );
    }

    if (!completed) return;
    setShowClosureWizard(false);
    if (inspectingOpp && inspectingOpp.id === targetOppForClosure.id) {
      setInspectingOpp(null);
    }
  };

  const handleCreateOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    const acc = accounts.find(a => a.id === createFormData.accountId) || accounts[0];
    const vendor = vendors.find(v => v.id === createFormData.vendorId) || vendors[0];

    createOpportunity({
      title: createFormData.title,
      accountId: acc.id,
      accountName: acc.name,
      vendorId: vendor.id,
      vendorName: vendor.name,
      product: createFormData.product,
      pipeline: createFormData.pipeline,
      stage: createFormData.stage,
      softwareValue: Number(createFormData.softwareValue),
      servicesValue: Number(createFormData.servicesValue),
      probability: Number(createFormData.probability),
      expectedCloseDate: createFormData.expectedCloseDate,
      description: createFormData.description,
      nextAction: createFormData.nextAction,
      ownerId: createFormData.ownerId
    });

    setShowCreateModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Opportunities Pipeline</h1>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredOpps.length} Active Deals
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise deal cycle tracking, CPQ linkage, presales sync, and multi-pipeline management.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                viewMode === 'kanban' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
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
            <span>+ Add Opportunity</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Total Pipeline</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            ₹{(totalPipelineValue / 100000).toFixed(1)} Lakhs
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">{filteredOpps.length} deals in cycle</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Weighted Pipeline</span>
          <span className="text-xl font-black text-indigo-600 mt-1 block">
            ₹{(weightedPipelineValue / 100000).toFixed(1)} Lakhs
          </span>
          <span className="text-[11px] text-indigo-500 mt-0.5 block">Factored by win probability</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Won Bookings</span>
          <span className="text-xl font-black text-emerald-600 mt-1 block">
            ₹{(wonValue / 100000).toFixed(1)} Lakhs
          </span>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">{wonOpps.length} orders booked</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Avg Deal Size</span>
          <span className="text-xl font-black text-slate-800 mt-1 block">
            ₹{filteredOpps.length > 0 ? (totalPipelineValue / filteredOpps.length / 100000).toFixed(1) : 0} Lakhs
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Across enterprise solutions</span>
        </div>
      </div>

      {/* Pipeline Tabs & Filter Strip */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
        {/* Pipeline Selector Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-slate-100">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0 mr-1">Pipeline:</span>
          {['ALL', 'Software + Presales / POC', 'Software – Direct / Simple', 'Services / Customisation', 'Renewal / Expansion', 'Tender / Formal RFP'].map(pipe => (
            <button
              key={pipe}
              onClick={() => setSelectedPipeline(pipe)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedPipeline === pipe
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pipe === 'ALL' ? 'All Pipelines' : pipe}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deals, accounts, opp #..."
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

            {/* Stage Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="text-slate-400 text-[11px]">Stage:</span>
              <select
                value={selectedStageFilter}
                onChange={(e) => setSelectedStageFilter(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer text-xs"
              >
                <option value="ALL">All Stages</option>
                {kanbanStages.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {(selectedVendorFilter !== 'ALL' || selectedStageFilter !== 'ALL' || selectedPipeline !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedVendorFilter('ALL');
                setSelectedStageFilter('ALL');
                setSelectedPipeline('ALL');
                setSearchQuery('');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <DndContext sensors={dndSensors} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-4">
            {kanbanStages.map((stg) => {
              const stageOpps = filteredOpps.filter(o => o.stage === stg);
              const stageTotal = stageOpps.reduce((s, o) => s + o.totalValue, 0);

              return (
                <KanbanColumn
                  key={stg}
                  id={stg}
                  className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200 flex flex-col min-w-[280px]"
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="font-bold text-slate-800 text-xs truncate">{stg}</span>
                      <span className="bg-slate-200 text-slate-700 text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                        {stageOpps.length}
                      </span>
                    </div>
                    <span className="font-black text-indigo-700 text-xs">
                      ₹{(stageTotal / 100000).toFixed(1)}L
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="space-y-2.5 flex-1 min-h-[64px]">
                    {stageOpps.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                        Drop here to move to this stage
                      </div>
                    ) : (
                      stageOpps.map((opp) => (
                        <KanbanCard
                          key={opp.id}
                          id={opp.id}
                          onClick={() => setInspectingOpp(opp)}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-slate-400">{opp.oppNumber}</span>
                            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {opp.probability}% win
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{opp.title}</h4>
                          <p className="text-slate-500 font-medium text-[11px] truncate">{opp.accountName}</p>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                            <span className="font-black text-slate-900">₹{(opp.totalValue / 100000).toFixed(1)}L</span>
                            <span className="text-indigo-600 font-semibold truncate max-w-[100px]">{opp.vendorName}</span>
                          </div>

                          {opp.nextAction && (
                            <div className="pt-1.5 text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded truncate">
                              <strong>Next:</strong> {opp.nextAction}
                            </div>
                          )}
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

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Opportunity & Account</th>
                  <th className="py-3.5 px-4">Pipeline</th>
                  <th className="py-3.5 px-4">Stage</th>
                  <th className="py-3.5 px-4">OEM / Vendor</th>
                  <th className="py-3.5 px-4 text-right">Total Value</th>
                  <th className="py-3.5 px-4 text-center">Win Prob %</th>
                  <th className="py-3.5 px-4">Target Close</th>
                  <th className="py-3.5 px-4">Working Owner</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOpps.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400 italic">
                      No opportunities match filters.
                    </td>
                  </tr>
                ) : (
                  filteredOpps.map((opp) => (
                    <tr
                      key={opp.id}
                      onClick={() => setInspectingOpp(opp)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {opp.oppNumber}
                          </span>
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {opp.title}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5 font-medium">
                          {opp.accountName}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {opp.pipeline}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={opp.stage} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-indigo-600">
                        {opp.vendorName}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                        ₹{(opp.totalValue / 100000).toFixed(1)} L
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                        {opp.probability}%
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {new Date(opp.expectedCloseDate).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                        {opp.ownerName}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {opp.stage !== 'Closed Won' && opp.stage !== 'Closed Lost' ? (
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleOpenCloseWizard(opp, 'Won')}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded text-[11px] font-bold border border-emerald-200"
                            >
                              Won
                            </button>
                            <button
                              onClick={() => handleOpenCloseWizard(opp, 'Lost')}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded text-[11px] font-bold border border-rose-200"
                            >
                              Lost
                            </button>
                          </div>
                        ) : (
                          <StatusBadge status={opp.stage} size="sm" />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSPECTION DRAWER */}
      <OpportunityDrawer
        opportunity={inspectingOpp}
        onClose={() => setInspectingOpp(null)}
        onOpenCloseWizard={handleOpenCloseWizard}
        onOpenCreateQuote={onOpenCreateQuote}
        onOpenCreatePOC={onOpenCreatePOC}
      />

      {/* CREATE OPPORTUNITY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Create New Opportunity</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOpportunity} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Opportunity Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={createFormData.title}
                  onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                  placeholder="e.g. ICICI Bank - Jira Align Enterprise Rollout"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-indigo-500 font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Account</label>
                  <select
                    value={createFormData.accountId}
                    onChange={(e) => setCreateFormData({ ...createFormData, accountId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                  >
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.city})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">OEM / Vendor</label>
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product</label>
                <select
                  value={createFormData.product}
                  onChange={(e) => setCreateFormData({ ...createFormData, product: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                >
                  <option value="">Select a product…</option>
                  {productOptionsForVendor(createFormData.vendorId).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Pipeline</label>
                  <select
                    value={createFormData.pipeline}
                    onChange={(e) => setCreateFormData({ ...createFormData, pipeline: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                  >
                    <option value="Software + Presales / POC">Software + Presales / POC</option>
                    <option value="Software – Direct / Simple">Software – Direct / Simple</option>
                    <option value="Services / Customisation">Services / Customisation</option>
                    <option value="Renewal / Expansion">Renewal / Expansion</option>
                    <option value="Tender / Formal RFP">Tender / Formal RFP</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stage</label>
                  <select
                    value={createFormData.stage}
                    onChange={(e) => setCreateFormData({ ...createFormData, stage: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                  >
                    {kanbanStages.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Software Value (₹)</label>
                  <input
                    type="number"
                    value={createFormData.softwareValue}
                    onChange={(e) => setCreateFormData({ ...createFormData, softwareValue: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Services Value (₹)</label>
                  <input
                    type="number"
                    value={createFormData.servicesValue}
                    onChange={(e) => setCreateFormData({ ...createFormData, servicesValue: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Win Probability (%)</label>
                  <input
                    type="number"
                    value={createFormData.probability}
                    onChange={(e) => setCreateFormData({ ...createFormData, probability: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Close Date</label>
                  <input
                    type="date"
                    value={createFormData.expectedCloseDate}
                    onChange={(e) => setCreateFormData({ ...createFormData, expectedCloseDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Next Immediate Action</label>
                  <input
                    type="text"
                    value={createFormData.nextAction}
                    onChange={(e) => setCreateFormData({ ...createFormData, nextAction: e.target.value })}
                    placeholder="e.g. Schedule solution sizing call"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30"
                >
                  Create Opportunity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSURE WIZARD MODAL (WON / LOST / SHELVED) */}
      {showClosureWizard && targetOppForClosure && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div
              className={`px-6 py-4 border-b text-white flex items-center justify-between ${
                closureOutcome === 'Won'
                  ? 'bg-emerald-950 border-emerald-800'
                  : closureOutcome === 'Lost'
                  ? 'bg-rose-950 border-rose-800'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div>
                <h3 className="text-base font-bold">
                  {closureOutcome === 'Won' ? '🎉 Close Deal as WON' : closureOutcome === 'Lost' ? 'Deal Closure: LOST' : 'Shelve Opportunity'}
                </h3>
                <p className="text-xs opacity-80 mt-0.5">{targetOppForClosure.title}</p>
              </div>
              <button onClick={() => setShowClosureWizard(false)} className="opacity-70 hover:opacity-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteClosure} className="p-6 space-y-4 text-xs">
              {closureOutcome === 'Won' && (
                <>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                    <p className="font-bold">Automated Order &amp; Delivery Provisioning</p>
                    <p className="text-[11px] mt-0.5 text-emerald-700">
                      Closing this opportunity as WON will automatically create an active Customer Order, add the OEM licenses to Installed Products, and track renewal timelines.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Customer PO Number <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={closureForm.customerPoNumber}
                        onChange={(e) => setClosureForm({ ...closureForm, customerPoNumber: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Customer PO Date</label>
                      <input
                        type="date"
                        value={closureForm.customerPoDate}
                        onChange={(e) => setClosureForm({ ...closureForm, customerPoDate: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Final Booking Value (₹)</label>
                    <input
                      type="number"
                      value={closureForm.finalContractValue}
                      onChange={(e) => setClosureForm({ ...closureForm, finalContractValue: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Billing Milestones &amp; Terms</label>
                    <input
                      type="text"
                      value={closureForm.billingMilestones}
                      onChange={(e) => setClosureForm({ ...closureForm, billingMilestones: e.target.value })}
                      placeholder="e.g. 100% advance, or 50% on SOW signoff + 50% UAT"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </>
              )}

              {closureOutcome === 'Lost' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Primary Loss Reason</label>
                    <select
                      value={closureForm.lossReason}
                      onChange={(e) => setClosureForm({ ...closureForm, lossReason: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none"
                    >
                      <option value="Competitor Price Discounting">Competitor Price Discounting</option>
                      <option value="Direct OEM Deal">Direct OEM Deal / Bypass</option>
                      <option value="Customer Budget Cancelled">Customer Budget Cancelled</option>
                      <option value="Feature / Technical Gap">Feature / Technical Gap</option>
                      <option value="Executive Level Influence">Executive Level Influence</option>
                      <option value="No Decision / Project Shelved">No Decision / Project Shelved</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Winning Competitor</label>
                      <input
                        type="text"
                        value={closureForm.competitorName}
                        onChange={(e) => setClosureForm({ ...closureForm, competitorName: e.target.value })}
                        placeholder="e.g. Redington / Wipro"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Winning Price (₹)</label>
                      <input
                        type="number"
                        value={closureForm.competitorPrice}
                        onChange={(e) => setClosureForm({ ...closureForm, competitorPrice: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Loss Analysis &amp; Feedback</label>
                    <textarea
                      rows={3}
                      value={closureForm.lossNotes}
                      onChange={(e) => setClosureForm({ ...closureForm, lossNotes: e.target.value })}
                      placeholder="Detailed feedback from buyer on why we lost..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </>
              )}

              {closureOutcome === 'Shelved' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Reason for Shelving</label>
                    <input
                      type="text"
                      value={closureForm.shelvedReason}
                      onChange={(e) => setClosureForm({ ...closureForm, shelvedReason: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Planned Re-Engagement Date</label>
                    <input
                      type="date"
                      value={closureForm.revisitDate}
                      onChange={(e) => setClosureForm({ ...closureForm, revisitDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowClosureWizard(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold text-white shadow-md transition-all ${
                    closureOutcome === 'Won'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                      : closureOutcome === 'Lost'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                      : 'bg-slate-700 hover:bg-slate-800'
                  }`}
                >
                  Confirm Closure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        initialModule="Opportunities"
      />
    </div>
  );
};
