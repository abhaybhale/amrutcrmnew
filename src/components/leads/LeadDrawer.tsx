import React, { useState } from 'react';
import { Lead, Opportunity } from '../../types';
import { useCRM } from '../../context/CRMContext';
import { StatusBadge, PriorityBadge, SLACountdownBadge } from '../common/StatusBadge';
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  Layers,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  FileText,
  DollarSign,
  ShieldAlert,
  Send,
  Edit3
} from 'lucide-react';

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onOpenAssignModal: (lead: Lead) => void;
  onOpenConvertModal: (lead: Lead) => void;
}

export const LeadDrawer: React.FC<LeadDrawerProps> = ({
  lead,
  onClose,
  onOpenAssignModal,
  onOpenConvertModal
}) => {
  const {
    currentUser,
    updateLead,
    workflows,
    assignmentHistory,
    auditLogs,
    fieldAttributes,
    getFieldAccess,
    getAvailableWorkflowTransitions,
    validateWorkflowTransition,
    showToast
  } = useCRM();

  const [activeTab, setActiveTab] = useState<'details' | 'bant' | 'history' | 'activity'>('details');
  const [newNote, setNewNote] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  if (!lead) return null;

  const leadWorkflow = workflows.find(w => w.module === 'Leads');
  const relevantAuditLogs = auditLogs.filter(a => a.recordId === lead.id);
  const relevantAssignments = assignmentHistory.filter(a => a.recordId === lead.id);

  // Allowed next transitions based on workflow engine definition and current role
  const availableTransitions = getAvailableWorkflowTransitions('Leads', lead.status, currentUser.role);

  const handleStatusChange = (nextState: string) => {
    if (nextState === 'Converted' || nextState === 'Qualified – Convert to Opportunity') {
      onOpenConvertModal(lead);
      return;
    }

    const validation = validateWorkflowTransition('Leads', lead.status, nextState, currentUser.role, lead);
    if (!validation.allowed) {
      showToast(validation.reason || `Transition to "${nextState}" not permitted.`, 'error');
      return;
    }

    if (validation.requiresApproval) {
      showToast(`State transition submitted: Pending approval by ${validation.approverRole || 'Manager'}`, 'info');
    }

    updateLead(lead.id, { status: nextState as any });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const updatedNotes = lead.notes ? `${lead.notes}\n[${new Date().toLocaleDateString()} ${currentUser.name}]: ${newNote}` : `[${new Date().toLocaleDateString()} ${currentUser.name}]: ${newNote}`;
    updateLead(lead.id, { notes: updatedNotes });
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
                {lead.leadNumber}
              </span>
              <PriorityBadge priority={lead.priority} />
              <SLACountdownBadge dueTime={lead.slaDueTime} status={lead.slaStatus} />
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
              {lead.companyName}
            </h2>
            <p className="text-sm font-medium text-indigo-600 mt-0.5">
              {lead.product}
            </p>
          </div>

          {/* Key Quick Attributes Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Working Owner</span>
              <span className="font-semibold text-slate-800 flex items-center space-x-1 mt-0.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span className="truncate">{lead.workingSalespersonName}</span>
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Reporter (Created By)</span>
              <span className="font-medium text-slate-700 block mt-0.5 truncate">
                {lead.reporterName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">OEM / Vendor</span>
              <span className="font-semibold text-slate-800 block mt-0.5 truncate">
                {lead.vendorName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Expected Deal</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                ₹{(lead.expectedValue / 100000).toFixed(1)} Lakhs
              </span>
            </div>
          </div>
        </div>

        {/* Action Bar (Workflow transitions & Convert to Opp) */}
        <div className="px-6 py-3 bg-indigo-50/80 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-indigo-950">Status:</span>
            <StatusBadge status={lead.status} size="sm" />
          </div>

          <div className="flex items-center space-x-2">
            {/* Reassign button */}
            {(
              currentUser.role === 'CRM Administrator' ||
              currentUser.role === 'Managing Director' ||
              currentUser.role === 'Sales Head' ||
              currentUser.role === 'Sales Manager' ||
              currentUser.role === 'Sales Coordinator' ||
              currentUser.role === 'Lead Gen Manager'
            ) && (
              <button
                onClick={() => onOpenAssignModal(lead)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Reassign Lead</span>
              </button>
            )}

            {/* Convert to Opportunity Primary CTA */}
            {lead.status !== 'Converted' && (
              <button
                onClick={() => onOpenConvertModal(lead)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Convert to Opportunity</span>
              </button>
            )}
          </div>
        </div>

        {/* Available Workflow State Buttons */}
        {availableTransitions.length > 0 && lead.status !== 'Converted' && (
          <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center space-x-2 overflow-x-auto text-xs">
            <span className="text-slate-500 font-semibold text-[11px] whitespace-nowrap">
              Advance Stage:
            </span>
            {availableTransitions.map((tr, idx) => (
              <button
                key={idx}
                onClick={() => handleStatusChange(tr.toState)}
                className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white text-slate-700 border border-slate-300 rounded-md font-medium text-xs whitespace-nowrap transition-colors flex items-center space-x-1 shadow-2xs"
              >
                <span>{tr.toState}</span>
                <ArrowRight className="w-3 h-3 opacity-60" />
              </button>
            ))}
          </div>
        )}

        {/* Drawer Tabs */}
        <div className="px-6 border-b border-slate-200 flex space-x-6 text-xs font-semibold text-slate-500">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
            }`}
          >
            Lead Information
          </button>
          <button
            onClick={() => setActiveTab('bant')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'bant' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
            }`}
          >
            BANT & Qualification
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
            }`}
          >
            Assignment History ({relevantAssignments.length})
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

        {/* Drawer Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center space-x-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Primary Contact Stakeholder</span>
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Contact Name</span>
                    <span className="font-semibold text-slate-800 text-sm">{lead.contactName}</span>
                    <span className="text-slate-500 block">{lead.designation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Location</span>
                    <span className="font-medium text-slate-700">{lead.city}, {lead.country}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email Address</span>
                    <a href={`mailto:${lead.contactEmail}`} className="text-indigo-600 hover:underline font-medium flex items-center space-x-1 mt-0.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{lead.contactEmail || 'Not provided'}</span>
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Phone / Mobile</span>
                    <a href={`tel:${lead.contactPhone}`} className="text-slate-700 hover:underline font-medium flex items-center space-x-1 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lead.contactPhone || 'Not provided'}</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Requirement & Solution Interest */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Requirement & Scope Summary</span>
                </h4>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {lead.requirement || 'No detailed technical requirement logged.'}
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Lead Source:</span>{' '}
                    <span className="font-semibold text-slate-700">{lead.source} {lead.subSource && `(${lead.subSource})`}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Campaign:</span>{' '}
                    <span className="font-semibold text-slate-700">{lead.campaign || 'Direct / General'}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic & Imported Custom Attributes */}
              {(() => {
                const leadCustomAttrs = fieldAttributes.filter(fa => fa.module === 'Leads');
                const customFieldEntries = Object.entries(lead.customFields || {});
                const allFieldKeys = Array.from(new Set([
                  ...leadCustomAttrs.map(a => a.name),
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
                        const attrDef = leadCustomAttrs.find(a => a.name === key);
                        const label = attrDef?.label || key.replace(/^custom_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const val = lead.customFields?.[key];

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

              {/* Next Action */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-amber-900 text-xs flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Next Planned Action</span>
                  </h4>
                  <span className="text-amber-800 font-semibold text-[11px]">
                    Due: {new Date(lead.nextActionDate).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-amber-900 font-medium">{lead.nextAction}</p>
              </div>

              {/* Notes Section */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">Working Notes & Telephony Logs</h4>
                {lead.notes && (
                  <pre className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-700 whitespace-pre-wrap font-sans">
                    {lead.notes}
                  </pre>
                )}
                <form onSubmit={handleAddNote} className="flex space-x-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a new update or call log..."
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

          {activeTab === 'bant' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <h4 className="font-bold text-indigo-950 text-sm mb-1">BANT Qualification Framework</h4>
                <p className="text-indigo-700 text-xs">
                  Review Budget, Authority, Need, and Timeline parameters before qualifying for Opportunity conversion.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">Budget</span>
                  <span className="font-semibold text-slate-900 text-sm block mt-1">{lead.bant.budget}</span>
                  {lead.bant.budgetAmount && (
                    <span className="text-xs text-indigo-600 font-bold block mt-0.5">
                      ₹{(lead.bant.budgetAmount / 100000).toFixed(1)} Lakhs Sanctioned
                    </span>
                  )}
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">Authority</span>
                  <span className="font-semibold text-slate-900 text-sm block mt-1">{lead.bant.authority}</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">Need</span>
                  <span className="font-semibold text-slate-900 text-sm block mt-1">{lead.bant.need}</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">Timeline</span>
                  <span className="font-semibold text-slate-900 text-sm block mt-1">{lead.bant.timeline}</span>
                </div>
              </div>

              {lead.bant.notes && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                    BANT Qualification Commentary
                  </span>
                  <p className="text-slate-700">{lead.bant.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">Immutable Assignment & Routing Logs</h4>
              {relevantAssignments.length === 0 ? (
                <p className="text-slate-400 italic">No historical reassignments logged for this record.</p>
              ) : (
                <div className="space-y-2.5">
                  {relevantAssignments.map((asg) => (
                    <div key={asg.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">
                          {asg.previousOwnerName} → {asg.newOwnerName}
                        </span>
                        <span className="text-slate-400">{new Date(asg.assignedDate).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600 text-[11px]">
                        <strong>Assigned By:</strong> {asg.assignedByName} • <strong>SLA Action:</strong> {asg.slaResetDecision}
                      </p>
                      <p className="text-indigo-600 text-[11px] bg-indigo-50 p-2 rounded border border-indigo-100">
                        <strong>Reason:</strong> {asg.reason}
                        {asg.notes && <span className="block mt-0.5 text-slate-600">{asg.notes}</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-sm">Audit Trail History</h4>
              <div className="space-y-2">
                {relevantAuditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">{log.details}</p>
                    <p className="text-slate-400 text-[10px] mt-1">User: {log.userName} ({log.userRole})</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-400">Created: {new Date(lead.createdDate).toLocaleDateString()}</span>
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
