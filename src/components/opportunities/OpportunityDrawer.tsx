import React, { useState } from 'react';
import { Opportunity, OpportunityStage } from '../../types';
import { useCRM } from '../../context/CRMContext';
import { StatusBadge, PriorityBadge } from '../common/StatusBadge';
import {
  X,
  Briefcase,
  Building2,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertTriangle
} from 'lucide-react';

interface OpportunityDrawerProps {
  opportunity: Opportunity | null;
  onClose: () => void;
  onOpenCloseWizard: (opp: Opportunity, outcome: 'Won' | 'Lost' | 'Shelved') => void;
  onOpenCreateQuote?: (opp: Opportunity) => void;
  onOpenCreatePOC?: (opp: Opportunity) => void;
}

export const OpportunityDrawer: React.FC<OpportunityDrawerProps> = ({
  opportunity,
  onClose,
  onOpenCloseWizard,
  onOpenCreateQuote,
  onOpenCreatePOC
}) => {
  const {
    currentUser,
    updateOpportunity,
    accessibleQuotes,
    accessiblePresales,
    contacts,
    workflows,
    auditLogs,
    fieldAttributes,
    getAvailableWorkflowTransitions,
    validateWorkflowTransition,
    showToast
  } = useCRM();

  const [activeTab, setActiveTab] = useState<'overview' | 'commercials' | 'presales' | 'quotes' | 'activity'>('overview');
  const [newNote, setNewNote] = useState('');

  if (!opportunity) return null;

  const oppWorkflow = workflows.find(w => w.module === 'Opportunities');
  const linkedQuotes = accessibleQuotes.filter(q => q.opportunityId === opportunity.id);
  const linkedPresales = accessiblePresales.filter(p => p.opportunityId === opportunity.id);
  const relevantAuditLogs = auditLogs.filter(a => a.recordId === opportunity.id);

  // Available transitions based on workflow engine definition and role permissions
  const availableTransitions = getAvailableWorkflowTransitions('Opportunities', opportunity.stage, currentUser.role);

  const handleStageAdvance = (toStage: string) => {
    if (toStage === 'Closed Won') {
      onOpenCloseWizard(opportunity, 'Won');
      return;
    }
    if (toStage === 'Closed Lost') {
      onOpenCloseWizard(opportunity, 'Lost');
      return;
    }
    if (toStage === 'Shelved / Budgeted') {
      onOpenCloseWizard(opportunity, 'Shelved');
      return;
    }

    const validation = validateWorkflowTransition('Opportunities', opportunity.stage, toStage, currentUser.role, opportunity);
    if (!validation.allowed) {
      showToast(validation.reason || `Transition to "${toStage}" not permitted.`, 'error');
      return;
    }

    if (validation.requiresApproval) {
      showToast(`State transition submitted: Pending approval by ${validation.approverRole || 'Manager'}`, 'info');
    }

    updateOpportunity(opportunity.id, { stage: toStage as OpportunityStage });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const updated = opportunity.notes ? `${opportunity.notes}\n[${new Date().toLocaleDateString()} ${currentUser.name}]: ${newNote}` : `[${new Date().toLocaleDateString()} ${currentUser.name}]: ${newNote}`;
    updateOpportunity(opportunity.id, { notes: updated });
    setNewNote('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                {opportunity.oppNumber}
              </span>
              <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {opportunity.pipeline}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3">
            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              {opportunity.title}
            </h2>
            <div className="flex items-center space-x-2 mt-1 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{opportunity.accountName}</span>
              <span>•</span>
              <span className="text-indigo-600 font-medium">{opportunity.vendorName}</span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200/80 text-xs text-center">
            <div className="bg-white p-2 rounded-lg border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] uppercase">Total Value</span>
              <span className="font-black text-slate-900 text-sm">
                ₹{(opportunity.totalValue / 100000).toFixed(1)}L
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] uppercase">Win Probability</span>
              <span className="font-bold text-emerald-600 text-sm">
                {opportunity.probability}%
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] uppercase">Weighted Value</span>
              <span className="font-bold text-indigo-600 text-sm">
                ₹{(opportunity.weightedValue / 100000).toFixed(1)}L
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200/80">
              <span className="text-slate-400 block text-[10px] uppercase">Owner</span>
              <span className="font-semibold text-slate-800 text-xs truncate block">
                {opportunity.ownerName}
              </span>
            </div>
          </div>
        </div>

        {/* Stage Status & Closure CTAs Bar */}
        <div className="px-6 py-3 bg-indigo-50/80 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-indigo-950">Stage:</span>
            <StatusBadge status={opportunity.stage} size="sm" />
          </div>

          {opportunity.stage !== 'Closed Won' && opportunity.stage !== 'Closed Lost' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenCloseWizard(opportunity, 'Won')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Close Won</span>
              </button>
              <button
                onClick={() => onOpenCloseWizard(opportunity, 'Lost')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Close Lost</span>
              </button>
            </div>
          )}
        </div>

        {/* Workflow Advance Bar */}
        {availableTransitions.length > 0 && opportunity.stage !== 'Closed Won' && opportunity.stage !== 'Closed Lost' && (
          <div className="px-6 py-2 bg-slate-100 border-b border-slate-200 flex items-center space-x-2 overflow-x-auto text-xs">
            <span className="text-slate-500 font-semibold text-[11px] whitespace-nowrap">Advance To:</span>
            {availableTransitions.map((tr, idx) => (
              <button
                key={idx}
                onClick={() => handleStageAdvance(tr.toState)}
                className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white text-slate-700 border border-slate-300 rounded-md font-medium text-xs whitespace-nowrap transition-colors flex items-center space-x-1 shadow-2xs"
              >
                <span>{tr.toState}</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 border-b border-slate-200 flex space-x-6 text-xs font-semibold text-slate-500">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
            }`}
          >
            Deal Details
          </button>
          <button
            onClick={() => setActiveTab('commercials')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'commercials' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
            }`}
          >
            Commercials & Split
          </button>
          <button
            onClick={() => setActiveTab('presales')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'presales' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
            }`}
          >
            Presales &amp; POC ({linkedPresales.length})
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'quotes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
            }`}
          >
            CPQ Quotes ({linkedQuotes.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'activity' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
            }`}
          >
            Audit Log ({relevantAuditLogs.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Target Close & Next Action */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Target Close Date</span>
                  <span className="font-bold text-slate-800 text-sm block mt-1">
                    {new Date(opportunity.expectedCloseDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl">
                  <span className="text-amber-800 block text-[11px] font-bold">Next Action</span>
                  <span className="font-semibold text-amber-950 text-xs block mt-1">
                    {opportunity.nextAction}
                  </span>
                </div>
              </div>

              {/* Scope & Requirement */}
              <div className="p-4 border border-slate-200 rounded-xl space-y-2">
                <h4 className="font-bold text-slate-800 text-sm">Scope & Customer Requirement</h4>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {opportunity.description || 'Enterprise solution deployment with multi-tiered licensing and onboarding support.'}
                </p>
              </div>

              {/* Competitors & Deal Registration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Deal Registration with OEM</span>
                  <span className="font-bold text-slate-800 text-xs block mt-1">
                    {opportunity.dealRegistrationStatus || 'Not Submitted'}
                  </span>
                  {opportunity.dealRegistrationNumber && (
                    <span className="text-[10px] text-indigo-600 font-mono block mt-0.5">
                      Ref: {opportunity.dealRegistrationNumber}
                    </span>
                  )}
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Identified Competitors</span>
                  <span className="font-semibold text-slate-800 text-xs block mt-1">
                    {opportunity.competitors && opportunity.competitors.length > 0
                      ? opportunity.competitors.join(', ')
                      : 'None Identified'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">Opportunity Updates</h4>
                {opportunity.notes && (
                  <pre className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-700 whitespace-pre-wrap font-sans">
                    {opportunity.notes}
                  </pre>
                )}
                <form onSubmit={handleAddNote} className="flex space-x-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Log conversation, negotiation terms, meeting minutes..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Post</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'commercials' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Revenue & Split Architecture</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] uppercase block">Software License</span>
                    <span className="font-bold text-slate-900 text-sm block mt-1">
                      ₹{(opportunity.softwareValue / 100000).toFixed(2)}L
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] uppercase block">Services / SOW</span>
                    <span className="font-bold text-slate-900 text-sm block mt-1">
                      ₹{(opportunity.servicesValue / 100000).toFixed(2)}L
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[10px] uppercase block">Total Booking</span>
                    <span className="font-black text-indigo-600 text-sm block mt-1">
                      ₹{(opportunity.totalValue / 100000).toFixed(2)}L
                    </span>
                  </div>
                </div>
              </div>

              {/* Gross Margin (Only visible if permitted by Role Security) */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                <h4 className="font-bold text-emerald-950 text-sm">Estimated Profitability & Margin</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-emerald-800 text-[11px]">Gross Margin:</span>
                    <span className="font-black text-emerald-900 text-base block">
                      ₹{(opportunity.estimatedMargin / 100000).toFixed(2)} Lakhs
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-800 text-[11px]">Margin Percentage:</span>
                    <span className="font-black text-emerald-900 text-base block">
                      {((opportunity.estimatedMargin / opportunity.totalValue) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic & Imported Custom Attributes */}
              {(() => {
                const oppCustomAttrs = fieldAttributes.filter(fa => fa.module === 'Opportunities');
                const customFieldEntries = Object.entries(opportunity.customFields || {});
                const allFieldKeys = Array.from(new Set([
                  ...oppCustomAttrs.map(a => a.name),
                  ...customFieldEntries.map(([k]) => k)
                ]));

                if (allFieldKeys.length === 0) return null;

                return (
                  <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-indigo-950 text-sm flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>Dynamic &amp; Imported Custom Attributes ({allFieldKeys.length})</span>
                      </h4>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                        Schema Extended
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {allFieldKeys.map(key => {
                        const attrDef = oppCustomAttrs.find(a => a.name === key);
                        const label = attrDef?.label || key.replace(/^custom_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const val = opportunity.customFields?.[key];

                        return (
                          <div key={key} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">
                                {label}
                              </span>
                              {attrDef && (
                                <span className="text-[9px] font-mono text-indigo-500 bg-indigo-50 px-1.5 rounded">
                                  {attrDef.type}
                                </span>
                              )}
                            </div>
                            <div className="mt-1">
                              {val !== undefined && val !== null && String(val).trim() !== '' ? (
                                attrDef?.type === 'currency' ? (
                                  <span className="font-bold text-slate-900 text-xs">
                                    ₹{Number(val).toLocaleString('en-IN')}
                                  </span>
                                ) : attrDef?.type === 'url' ? (
                                  <a href={String(val)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs font-semibold break-all">
                                    {String(val)}
                                  </a>
                                ) : attrDef?.type === 'email' ? (
                                  <a href={`mailto:${val}`} className="text-indigo-600 hover:underline text-xs font-semibold">
                                    {String(val)}
                                  </a>
                                ) : attrDef?.type === 'boolean' ? (
                                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                                    String(val).toLowerCase() === 'true' || val === true ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {String(val).toLowerCase() === 'true' || val === true ? 'Yes' : 'No'}
                                  </span>
                                ) : (
                                  <span className="font-semibold text-slate-800 text-xs break-words">
                                    {String(val)}
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400 italic text-xs">Not set</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'presales' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">Presales & Proof of Concept</h4>
                {onOpenCreatePOC && (
                  <button
                    onClick={() => onOpenCreatePOC(opportunity)}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                  >
                    + Request Presales / POC
                  </button>
                )}
              </div>

              {linkedPresales.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400">
                  <Cpu className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-medium">No Presales Requests Linked</p>
                  <p className="text-[11px] mt-1">Request technical architecture, customer demos or POC tracking.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedPresales.map((ps) => (
                    <div key={ps.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{ps.requestType}</span>
                        <StatusBadge status={ps.status} size="sm" />
                      </div>
                      <p className="text-slate-600 text-xs">{ps.scopeDescription}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                        <span>Consultant: {ps.assignedConsultantName || 'Unassigned'}</span>
                        <span>Target Sign-Off: {ps.targetSignOffDate || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">CPQ Quotations</h4>
                {onOpenCreateQuote && (
                  <button
                    onClick={() => onOpenCreateQuote(opportunity)}
                    className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold"
                  >
                    + Generate CPQ Quote
                  </button>
                )}
              </div>

              {linkedQuotes.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400">
                  <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-medium">No Quotations Generated Yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedQuotes.map((qt) => (
                    <div key={qt.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-slate-900">{qt.quoteNumber}</span>
                          <span className="text-slate-400 text-xs ml-2">(Rev {qt.version})</span>
                        </div>
                        <StatusBadge status={qt.status} size="sm" />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                        <span className="text-slate-500">{qt.lineItems.length} Line Items</span>
                        <span className="font-bold text-slate-900">₹{(qt.grandTotal / 100000).toFixed(2)} Lakhs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">Audit Trail</h4>
              <div className="space-y-2">
                {relevantAuditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">{log.details}</p>
                    <p className="text-slate-400 text-[10px] mt-1">By {log.userName} ({log.userRole})</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-400">Created: {new Date(opportunity.createdDate).toLocaleDateString()}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
