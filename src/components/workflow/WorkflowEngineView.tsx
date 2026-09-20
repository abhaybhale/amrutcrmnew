import React, { useState, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { WorkflowDefinition, WorkflowTransition, UserRole } from '../../types';
import {
  GitFork,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Edit3,
  Trash2,
  X,
  Play,
  AlertTriangle,
  FileCheck2,
  Check,
  RotateCcw,
  Sliders,
  Download,
  Upload,
  Info,
  ChevronRight,
  Eye,
  Copy,
  Clock,
  Send,
  Zap,
  CheckSquare,
  Square
} from 'lucide-react';

const STANDARD_MODULES = [
  { id: 'Leads', label: 'Leads Workflow', desc: 'Standard Enterprise Lead Lifecycle & Qualification' },
  { id: 'Opportunities', label: 'Opportunities Workflow', desc: 'Solution Deals, Commercials & Closing Stages' },
  { id: 'Quotes', label: 'Quotes & CPQ Workflow', desc: 'Pricing Approvals, Discounts & Customer Dispatch' },
  { id: 'Presales', label: 'Presales Workflow', desc: 'Architecture, Technical Scoping & Deliverables' },
  { id: 'POCs', label: 'POC & Evaluation Workflow', desc: 'Technical Feasibility, Testing & Sign-off' },
  { id: 'Orders', label: 'Orders & Fulfillment', desc: 'PO Verification, OEM Procurement & Invoicing' }
];

export const WorkflowEngineView: React.FC = () => {
  const {
    workflows,
    updateWorkflow,
    createWorkflow,
    deleteWorkflow,
    isRoleAuthorizedForTransition,
    validateWorkflowTransition,
    getAvailableWorkflowTransitions,
    roles,
    currentUser,
    showToast,
    addAuditLog
  } = useCRM();

  // Combine built-in roles and any custom user roles
  const allAvailableRoles: string[] = Array.from(new Set([
    'Managing Director',
    'Sales Head',
    'Sales Manager',
    'Sales Person',
    'Sales Coordinator',
    'Lead Gen Manager',
    'Lead Gen',
    'Marketing Manager',
    'Marketing Person',
    'Vendor Manager',
    'Vendor Head',
    'Presales Manager',
    'Presales Person',
    'Presales Consultant',
    'Accounts Head',
    'Accounts Manager',
    'CRM Administrator',
    'Finance & Operations',
    'Management / Executive',
    'Finance & Commercial Operations',
    ...roles.map(r => r.name)
  ]));

  const [selectedModule, setSelectedModule] = useState<string>('Leads');
  const [searchRuleQuery, setSearchRuleQuery] = useState('');
  const [filterFromState, setFilterFromState] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');

  // Selected State Inspection
  const [inspectedState, setInspectedState] = useState<string | null>(null);

  // Interactive Simulator State
  const [simCurrentState, setSimCurrentState] = useState<string>('');
  const [simRole, setSimRole] = useState<string>(currentUser.role || 'Sales Person');
  const [simMandatoryValues, setSimMandatoryValues] = useState<Record<string, string>>({});
  const [simResult, setSimResult] = useState<{ success: boolean; message: string; targetState?: string; isApproval?: boolean } | null>(null);
  const [simHistory, setSimHistory] = useState<Array<{ timestamp: string; from: string; to: string; role: string; success: boolean }>>([]);

  // Modals
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [showAddStateModal, setShowAddStateModal] = useState(false);
  const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');

  // Form State for Adding / Editing Rule
  const [ruleFromState, setRuleFromState] = useState('');
  const [ruleToState, setRuleToState] = useState('');
  const [ruleRoles, setRuleRoles] = useState<string[]>(['Sales Person', 'Sales Manager', 'CRM Administrator']);
  const [ruleRequiresApproval, setRuleRequiresApproval] = useState(false);
  const [ruleApproverRole, setRuleApproverRole] = useState<string>('Sales Manager');
  const [ruleMandatoryFields, setRuleMandatoryFields] = useState<string>('');
  const [ruleSlaHours, setRuleSlaHours] = useState<number>(24);
  const [ruleNotification, setRuleNotification] = useState<string>('');

  // Form State for Adding New State Node
  const [newStateName, setNewStateName] = useState('');
  const [newStateIsStart, setNewStateIsStart] = useState(false);
  const [newStateIsEnd, setNewStateIsEnd] = useState(false);

  // Form State for New Workflow
  const [newWfName, setNewWfName] = useState('');
  const [newWfModule, setNewWfModule] = useState<'Leads' | 'Opportunities' | 'Quotes' | 'Orders' | 'Presales' | 'POCs'>('Leads');
  const [newWfInitialState, setNewWfInitialState] = useState('Draft');

  // Safe state normalization
  const normalizeState = (s?: string): string => {
    if (!s) return '';
    return String(s)
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
  };

  // Active Workflow Resolution with robust fuzzy & case-insensitive matching
  const currentWorkflow: WorkflowDefinition =
    workflows.find(w => w.module?.toLowerCase() === selectedModule.toLowerCase()) ||
    workflows.find(w => w.id?.toLowerCase() === selectedModule.toLowerCase()) ||
    workflows.find(w => w.module?.toLowerCase().includes(selectedModule.toLowerCase()) || selectedModule.toLowerCase().includes(w.module?.toLowerCase() || '')) ||
    workflows[0] || {
      id: 'wf_leads',
      name: 'Standard Lead Workflow',
      module: 'Leads',
      startingState: 'New – Unvalidated',
      endStates: ['Converted', 'Disqualified'],
      allStates: ['New – Unvalidated', 'Validation in Progress', 'Converted', 'Disqualified'],
      transitions: [],
      isActive: true
    };

  const workflowStates: string[] = currentWorkflow.allStates || [];
  const workflowTransitions: WorkflowTransition[] = currentWorkflow.transitions || [];

  // Reset simulator state when switching module or workflow
  useEffect(() => {
    if (workflowStates.length > 0) {
      setSimCurrentState(currentWorkflow.startingState || workflowStates[0]);
      setSimResult(null);
      setSimMandatoryValues({});
      setSimHistory([]);
      setInspectedState(null);
    }
  }, [selectedModule, currentWorkflow.id]);

  // Open Add Rule
  const handleOpenAddRule = () => {
    setRuleFromState(inspectedState || workflowStates[0] || '');
    setRuleToState(workflowStates[1] || workflowStates[0] || '');
    setRuleRoles(['Sales Person', 'Sales Manager', 'CRM Administrator', 'Managing Director']);
    setRuleRequiresApproval(false);
    setRuleApproverRole('Sales Manager');
    setRuleMandatoryFields('');
    setRuleSlaHours(24);
    setRuleNotification('');
    setEditingRuleIndex(null);
    setShowAddRuleModal(true);
  };

  // Open Edit Rule
  const handleOpenEditRule = (idx: number) => {
    const r = workflowTransitions[idx];
    if (!r) return;
    setRuleFromState(r.fromState);
    setRuleToState(r.toState);
    setRuleRoles(r.permittedRoles || []);
    setRuleRequiresApproval(!!r.requiresApproval);
    setRuleApproverRole(r.approverRole || 'Sales Manager');
    setRuleMandatoryFields((r.mandatoryFields || []).join(', '));
    setRuleSlaHours(r.slaHours || 24);
    setRuleNotification(r.notificationMessage || '');
    setEditingRuleIndex(idx);
    setShowAddRuleModal(true);
  };

  // Duplicate Rule
  const handleDuplicateRule = (idx: number) => {
    const r = workflowTransitions[idx];
    if (!r) return;
    const duplicated: WorkflowTransition = {
      ...r,
      notificationMessage: r.notificationMessage ? `${r.notificationMessage} (Copy)` : undefined
    };
    const updatedTransitions = [...workflowTransitions, duplicated];
    updateWorkflow(currentWorkflow.id, { transitions: updatedTransitions });
    showToast(`Duplicated rule: ${r.fromState} -> ${r.toState}`, 'success');
  };

  // Save Rule (Add or Edit)
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleFromState || !ruleToState) {
      showToast('Please specify both source and target states.', 'error');
      return;
    }
    if (ruleRoles.length === 0) {
      showToast('Select at least one permitted user role.', 'error');
      return;
    }

    const mandatoryList = ruleMandatoryFields
      .split(',')
      .map(f => f.trim())
      .filter(Boolean);

    const newTransition: WorkflowTransition = {
      fromState: ruleFromState,
      toState: ruleToState,
      permittedRoles: ruleRoles,
      requiresApproval: ruleRequiresApproval,
      approverRole: ruleRequiresApproval ? ruleApproverRole : undefined,
      mandatoryFields: mandatoryList.length > 0 ? mandatoryList : undefined,
      slaHours: ruleSlaHours > 0 ? Number(ruleSlaHours) : undefined,
      notificationMessage: ruleNotification.trim() || undefined
    };

    let updatedTransitions = [...workflowTransitions];
    if (editingRuleIndex !== null && editingRuleIndex >= 0) {
      updatedTransitions[editingRuleIndex] = newTransition;
      showToast(`Updated transition rule: ${ruleFromState} -> ${ruleToState}`, 'success');
    } else {
      updatedTransitions.push(newTransition);
      showToast(`Added transition rule: ${ruleFromState} -> ${ruleToState}`, 'success');
    }

    // Ensure states exist in allStates if custom
    let updatedAllStates = [...workflowStates];
    if (!updatedAllStates.includes(ruleFromState)) updatedAllStates.push(ruleFromState);
    if (!updatedAllStates.includes(ruleToState)) updatedAllStates.push(ruleToState);

    updateWorkflow(currentWorkflow.id, {
      transitions: updatedTransitions,
      allStates: updatedAllStates
    });

    setShowAddRuleModal(false);
  };

  // Delete Rule
  const handleDeleteRule = (idx: number) => {
    const target = workflowTransitions[idx];
    if (!target) return;
    const updatedTransitions = workflowTransitions.filter((_, i) => i !== idx);
    updateWorkflow(currentWorkflow.id, { transitions: updatedTransitions });
    showToast(`Deleted rule: ${target.fromState} -> ${target.toState}`, 'info');
  };

  // Add New State Node
  const handleAddStateNode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newStateName.trim();
    if (!cleanName) {
      showToast('State name cannot be blank', 'error');
      return;
    }
    if (workflowStates.includes(cleanName)) {
      showToast(`State "${cleanName}" already exists in this workflow`, 'warning');
      return;
    }

    const updatedStates = [...workflowStates, cleanName];
    const updatedEndStates = newStateIsEnd ? [...(currentWorkflow.endStates || []), cleanName] : currentWorkflow.endStates;
    const newStarting = newStateIsStart ? cleanName : currentWorkflow.startingState;

    updateWorkflow(currentWorkflow.id, {
      allStates: updatedStates,
      endStates: updatedEndStates,
      startingState: newStarting
    });

    showToast(`Added node "${cleanName}" to workflow`, 'success');
    setNewStateName('');
    setNewStateIsStart(false);
    setNewStateIsEnd(false);
    setShowAddStateModal(false);
  };

  // Delete State Node
  const handleDeleteStateNode = (stateToDelete: string) => {
    if (workflowStates.length <= 2) {
      showToast('Workflows must retain at least 2 states.', 'error');
      return;
    }
    if (stateToDelete === currentWorkflow.startingState) {
      showToast('Cannot delete the configured Starting State. Reassign the starting state first.', 'error');
      return;
    }

    const updatedStates = workflowStates.filter(s => s !== stateToDelete);
    const updatedEndStates = (currentWorkflow.endStates || []).filter(s => s !== stateToDelete);
    // Remove transitions referencing this state
    const updatedTransitions = workflowTransitions.filter(
      t => t.fromState !== stateToDelete && t.toState !== stateToDelete
    );

    updateWorkflow(currentWorkflow.id, {
      allStates: updatedStates,
      endStates: updatedEndStates,
      transitions: updatedTransitions
    });

    if (inspectedState === stateToDelete) setInspectedState(null);
    if (simCurrentState === stateToDelete) setSimCurrentState(updatedStates[0] || '');

    showToast(`Removed state "${stateToDelete}" and associated rules.`, 'info');
  };

  // Toggle Active State
  const handleToggleWorkflowActive = () => {
    const nextActive = !currentWorkflow.isActive;
    updateWorkflow(currentWorkflow.id, { isActive: nextActive });
    showToast(`Workflow ${nextActive ? 'activated' : 'deactivated'}`, 'info');
  };

  // Create New Workflow
  const handleCreateNewWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWfName.trim()) {
      showToast('Please provide a workflow name', 'error');
      return;
    }
    const created = createWorkflow({
      name: newWfName.trim(),
      module: newWfModule,
      startingState: newWfInitialState.trim() || 'Draft',
      allStates: [newWfInitialState.trim() || 'Draft', 'In Progress', 'Completed'],
      endStates: ['Completed'],
      isActive: true,
      transitions: [
        {
          fromState: newWfInitialState.trim() || 'Draft',
          toState: 'In Progress',
          permittedRoles: ['Sales Person', 'Sales Manager', 'CRM Administrator', 'Managing Director']
        },
        {
          fromState: 'In Progress',
          toState: 'Completed',
          permittedRoles: ['Sales Manager', 'CRM Administrator', 'Managing Director']
        }
      ]
    });
    if (!created) return;
    setSelectedModule(created.module);
    setShowNewWorkflowModal(false);
    setNewWfName('');
  };

  // Run Simulator Step
  const handleSimulateTransition = (targetState: string) => {
    const normCurrent = normalizeState(simCurrentState);
    const normTarget = normalizeState(targetState);

    const transitionRule = workflowTransitions.find(
      t => normalizeState(t.fromState) === normCurrent && normalizeState(t.toState) === normTarget
    );

    const now = new Date().toLocaleTimeString();

    if (!transitionRule) {
      setSimResult({
        success: false,
        message: `No transition rule configured from "${simCurrentState}" to "${targetState}".`
      });
      setSimHistory(prev => [{ timestamp: now, from: simCurrentState, to: targetState, role: simRole, success: false }, ...prev.slice(0, 7)]);
      return;
    }

    // Role check with inheritance
    const isRolePermitted = isRoleAuthorizedForTransition(transitionRule.permittedRoles, simRole);
    if (!isRolePermitted) {
      setSimResult({
        success: false,
        message: `Access Denied: Role "${simRole}" is not authorized. Allowed: ${transitionRule.permittedRoles.join(', ')}.`
      });
      setSimHistory(prev => [{ timestamp: now, from: simCurrentState, to: targetState, role: simRole, success: false }, ...prev.slice(0, 7)]);
      return;
    }

    // Mandatory fields check
    if (transitionRule.mandatoryFields && transitionRule.mandatoryFields.length > 0) {
      const missingFields = transitionRule.mandatoryFields.filter(f => !simMandatoryValues[f]?.trim());
      if (missingFields.length > 0) {
        setSimResult({
          success: false,
          message: `Mandatory field guard failed. Please fill: ${missingFields.join(', ')}.`
        });
        setSimHistory(prev => [{ timestamp: now, from: simCurrentState, to: targetState, role: simRole, success: false }, ...prev.slice(0, 7)]);
        return;
      }
    }

    // Approval gate notice
    if (transitionRule.requiresApproval) {
      setSimResult({
        success: true,
        targetState,
        isApproval: true,
        message: `Transition permitted with Approval Gate: Requires formal sign-off by "${transitionRule.approverRole || 'Manager'}".`
      });
      setSimHistory(prev => [{ timestamp: now, from: simCurrentState, to: targetState, role: simRole, success: true }, ...prev.slice(0, 7)]);
      setSimCurrentState(targetState);
      return;
    }

    setSimResult({
      success: true,
      targetState,
      isApproval: false,
      message: `State transition successful! Record advanced to "${targetState}".`
    });
    setSimHistory(prev => [{ timestamp: now, from: simCurrentState, to: targetState, role: simRole, success: true }, ...prev.slice(0, 7)]);
    setSimCurrentState(targetState);
  };

  // Role preset helpers for add/edit modal
  const handleSelectRolePreset = (preset: 'all' | 'sales' | 'presales' | 'mgmt' | 'clear') => {
    if (preset === 'all') {
      setRuleRoles([...allAvailableRoles]);
    } else if (preset === 'sales') {
      setRuleRoles(['Sales Person', 'Sales Manager', 'Sales Head', 'Sales Coordinator', 'Managing Director', 'CRM Administrator']);
    } else if (preset === 'presales') {
      setRuleRoles(['Presales Consultant', 'Presales Person', 'Presales Manager', 'Managing Director', 'CRM Administrator']);
    } else if (preset === 'mgmt') {
      setRuleRoles(['Managing Director', 'CRM Administrator', 'Sales Head', 'Sales Manager']);
    } else if (preset === 'clear') {
      setRuleRoles([]);
    }
  };

  // Export specification JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentWorkflow, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${currentWorkflow.id}_workflow_spec.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Workflow specification exported to JSON', 'success');
  };

  // Import specification JSON
  const handleImportJSON = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed: WorkflowDefinition = JSON.parse(importJsonText);
      if (!parsed.name || !parsed.module || !Array.isArray(parsed.allStates)) {
        showToast('Invalid workflow JSON structure. Must contain name, module, and allStates.', 'error');
        return;
      }
      const existing = workflows.find(w => w.id === parsed.id || w.module === parsed.module);
      if (existing) {
        updateWorkflow(existing.id, parsed);
        showToast(`Workflow "${parsed.name}" updated from JSON spec`, 'success');
      } else {
        createWorkflow(parsed);
        showToast(`Workflow "${parsed.name}" imported successfully`, 'success');
      }
      setShowImportModal(false);
      setImportJsonText('');
    } catch {
      showToast('Could not parse JSON. Please check the syntax.', 'error');
    }
  };

  // Filtered transitions
  const filteredTransitions = workflowTransitions.filter(t => {
    const matchesSearch =
      t.fromState.toLowerCase().includes(searchRuleQuery.toLowerCase()) ||
      t.toState.toLowerCase().includes(searchRuleQuery.toLowerCase()) ||
      t.permittedRoles.some(r => r.toLowerCase().includes(searchRuleQuery.toLowerCase())) ||
      (t.mandatoryFields || []).some(m => m.toLowerCase().includes(searchRuleQuery.toLowerCase()));
    const matchesFrom = filterFromState === 'ALL' || normalizeState(t.fromState) === normalizeState(filterFromState);
    const matchesRole = filterRole === 'ALL' || isRoleAuthorizedForTransition(t.permittedRoles, filterRole);
    return matchesSearch && matchesFrom && matchesRole;
  });

  // Allowed transitions from the simulator's current state
  const simulatorPossibleTransitions = workflowTransitions.filter(
    t => normalizeState(t.fromState) === normalizeState(simCurrentState)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Enterprise Workflow State Machine</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Active Engine
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Role-based state transitions, approval checkpoints, mandatory data guards, and SLA timers across all 6 CRM modules.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
            title="Import Workflow Specification"
          >
            <Upload className="w-3.5 h-3.5 text-gray-500" />
            <span>Import Spec</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
            title="Export Workflow Specification"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export Spec</span>
          </button>

          <button
            onClick={handleOpenAddRule}
            className="px-3.5 py-1.5 bg-[#0073EA] hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transition Rule</span>
          </button>
        </div>
      </div>

      {/* Module Selector Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-xs">
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 pt-1 pb-2">
          Select CRM Workflow Stream ({workflows.length} Active)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {STANDARD_MODULES.map(mod => {
            const wf = workflows.find(w => w.module === mod.id) || { name: mod.label, transitions: [] };
            const isSelected = selectedModule === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setSelectedModule(mod.id)}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between space-y-1.5 ${
                  isSelected
                    ? 'bg-[#222448] text-white border-[#222448] shadow-sm'
                    : 'bg-gray-50/70 hover:bg-gray-100/80 text-gray-800 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                    {mod.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {wf.transitions?.length || 0} Rules
                  </span>
                </div>
                <p className={`text-[10px] line-clamp-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                  {mod.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workflow Summary & State Diagram Visual Pipeline */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="text-base font-bold text-gray-900">{currentWorkflow.name}</h3>
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-100">
                Module: {currentWorkflow.module}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Starting Node: <strong className="text-blue-700 font-bold">{currentWorkflow.startingState}</strong> • {workflowStates.length} Configured States • {workflowTransitions.length} Configured Transitions
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddStateModal(true)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-gray-500" />
              <span>Add State Node</span>
            </button>

            <button
              onClick={handleToggleWorkflowActive}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                currentWorkflow.isActive
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${currentWorkflow.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span>{currentWorkflow.isActive ? 'Engine Active' : 'Engine Disabled'}</span>
            </button>
          </div>
        </div>

        {/* Visual Pipeline Nodes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Sequential State Flow &amp; Interactive Node Inspection
            </span>
            <span className="text-[10px] text-gray-400">
              Click any node to inspect transitions or delete custom states
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {workflowStates.map((state, idx) => {
              const isStart = state === currentWorkflow.startingState;
              const isEnd = (currentWorkflow.endStates || []).includes(state) ||
                state.toLowerCase().includes('won') ||
                state.toLowerCase().includes('convert') ||
                state.toLowerCase().includes('lost') ||
                state.toLowerCase().includes('complete');
              const isEndWon = state.toLowerCase().includes('won') || state.toLowerCase().includes('convert') || state.toLowerCase().includes('complete') || state.toLowerCase().includes('accepted');
              const isEndLost = state.toLowerCase().includes('lost') || state.toLowerCase().includes('disqual') || state.toLowerCase().includes('shelved') || state.toLowerCase().includes('cancel');

              const isSelected = inspectedState === state;
              const outboundCount = workflowTransitions.filter(t => t.fromState === state).length;
              const inboundCount = workflowTransitions.filter(t => t.toState === state).length;

              return (
                <React.Fragment key={idx}>
                  <div
                    onClick={() => {
                      setInspectedState(isSelected ? null : state);
                      setSimCurrentState(state);
                    }}
                    className={`group cursor-pointer px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-2 shadow-xs transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 bg-blue-600 text-white border-blue-600'
                        : isStart
                        ? 'bg-blue-50 text-blue-900 border-blue-200 font-bold hover:bg-blue-100'
                        : isEndWon
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                        : isEndLost
                        ? 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
                        : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {isStart && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                    <span>{state}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-gray-600'
                      }`}
                      title={`Inbound: ${inboundCount}, Outbound: ${outboundCount}`}
                    >
                      {outboundCount} out
                    </span>

                    {!isStart && workflowStates.length > 2 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete state "${state}" from workflow?`)) {
                            handleDeleteStateNode(state);
                          }
                        }}
                        className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity ${
                          isSelected ? 'hover:bg-blue-700 text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-rose-600'
                        }`}
                        title="Delete state"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {idx < workflowStates.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Node Inspector Drawer */}
          {inspectedState && (
            <div className="mt-3 p-4 bg-gray-50 border border-blue-200 rounded-xl space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-gray-900">
                    Inspecting State Node: <span className="text-blue-600">{inspectedState}</span>
                  </h4>
                </div>
                <button
                  onClick={() => setInspectedState(null)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  Close Inspection
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1">
                  <span className="font-bold text-gray-700 block text-[11px]">Forward (Outbound) Transitions:</span>
                  {workflowTransitions.filter(t => t.fromState === inspectedState).length === 0 ? (
                    <span className="text-gray-400 italic text-[11px]">No outbound transitions (Terminal state).</span>
                  ) : (
                    workflowTransitions
                      .filter(t => t.fromState === inspectedState)
                      .map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] py-0.5 border-b border-gray-50">
                          <span className="font-semibold text-blue-600">➔ {t.toState}</span>
                          <span className="text-gray-400 text-[10px]">{t.permittedRoles.length} roles</span>
                        </div>
                      ))
                  )}
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1">
                  <span className="font-bold text-gray-700 block text-[11px]">Incoming (Inbound) Transitions:</span>
                  {workflowTransitions.filter(t => t.toState === inspectedState).length === 0 ? (
                    <span className="text-gray-400 italic text-[11px]">No inbound transitions (Root/Start state).</span>
                  ) : (
                    workflowTransitions
                      .filter(t => t.toState === inspectedState)
                      .map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] py-0.5 border-b border-gray-50">
                          <span className="font-semibold text-gray-700">From {t.fromState}</span>
                          <span className="text-gray-400 text-[10px]">{t.permittedRoles.length} roles</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive State Machine Simulator Sandbox */}
      <div className="bg-gradient-to-br from-[#222448] to-[#1a1b38] text-white p-6 rounded-2xl shadow-lg border border-[#363963] space-y-5">
        <div className="flex items-center justify-between border-b border-[#363963] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Interactive State Machine Sandbox</h3>
              <p className="text-[11px] text-gray-300">
                Simulate role-based authorization, mandatory data guards, and approval gates in real time.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-[#363963] text-blue-300 px-2.5 py-1 rounded-full">
            Live Testing Harness
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* 1. Pick Current State */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-300 block">1. Simulated Current State</label>
            <select
              value={simCurrentState}
              onChange={(e) => {
                setSimCurrentState(e.target.value);
                setSimResult(null);
              }}
              className="w-full bg-[#2a2d55] border border-[#45497c] text-white rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-400"
            >
              {workflowStates.map(st => (
                <option key={st} value={st} className="bg-[#222448] text-white">
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Pick Role to Test */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-300 block">2. Persona / Role to Test</label>
            <select
              value={simRole}
              onChange={(e) => {
                setSimRole(e.target.value);
                setSimResult(null);
              }}
              className="w-full bg-[#2a2d55] border border-[#45497c] text-white rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-blue-400"
            >
              {allAvailableRoles.map(role => (
                <option key={role} value={role} className="bg-[#222448] text-white">
                  {role} {role === currentUser.role ? '(Your Current Role)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Simulator Controls */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-300 block">3. Reset Sandbox</label>
            <button
              onClick={() => {
                setSimCurrentState(currentWorkflow.startingState || workflowStates[0]);
                setSimResult(null);
                setSimMandatoryValues({});
                setSimHistory([]);
              }}
              className="w-full bg-[#2a2d55] hover:bg-[#343768] text-gray-200 border border-[#45497c] rounded-xl p-2.5 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
              <span>Reset to Initial State</span>
            </button>
          </div>
        </div>

        {/* Possible Next Transitions from Simulator State */}
        <div className="pt-2 border-t border-[#363963] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider block">
              Available Next Transitions from "{simCurrentState}":
            </span>
            <span className="text-[10px] text-gray-400">
              Role: <strong className="text-blue-300">{simRole}</strong>
            </span>
          </div>

          {simulatorPossibleTransitions.length === 0 ? (
            <div className="p-4 bg-[#2a2d55]/70 rounded-xl text-center text-gray-400 text-xs italic border border-[#363963]">
              No forward transitions configured from this state (Terminal Outcome Node).
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {simulatorPossibleTransitions.map((tr, idx) => {
                const isRoleAllowed = isRoleAuthorizedForTransition(tr.permittedRoles, simRole);
                const hasApproval = !!tr.requiresApproval;
                const hasMandatory = (tr.mandatoryFields || []).length > 0;

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 transition-all ${
                      isRoleAllowed
                        ? 'bg-[#2a2d55] border-[#4a4e85] hover:border-blue-400 shadow-xs'
                        : 'bg-[#1e2040] border-[#363963] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-bold text-xs text-white">
                        <span>Advance to:</span>
                        <span className="text-blue-400">{tr.toState}</span>
                      </div>
                      {isRoleAllowed ? (
                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Permitted
                        </span>
                      ) : (
                        <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Restricted
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-gray-300 space-y-1 bg-[#1a1b38]/60 p-2 rounded-lg border border-[#363963]">
                      <div>
                        <span className="text-gray-400">Allowed Roles:</span> {tr.permittedRoles.join(', ')}
                      </div>
                      {hasApproval && (
                        <div className="text-amber-300 flex items-center space-x-1">
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>Approval Required: {tr.approverRole || 'Manager'}</span>
                        </div>
                      )}
                      {hasMandatory && (
                        <div className="text-blue-300 flex items-center space-x-1">
                          <FileCheck2 className="w-3 h-3 text-blue-400" />
                          <span>Mandatory: {tr.mandatoryFields?.join(', ')}</span>
                        </div>
                      )}
                      {tr.slaHours && (
                        <div className="text-purple-300 flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-purple-400" />
                          <span>SLA: {tr.slaHours} Hours</span>
                        </div>
                      )}
                    </div>

                    {/* Mandatory inputs mock in simulator */}
                    {hasMandatory && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-gray-300 font-semibold block">Enter Mandatory Data:</span>
                        {tr.mandatoryFields?.map(f => (
                          <input
                            key={f}
                            type="text"
                            placeholder={`Enter ${f}...`}
                            value={simMandatoryValues[f] || ''}
                            onChange={(e) => setSimMandatoryValues({ ...simMandatoryValues, [f]: e.target.value })}
                            className="w-full bg-[#1e2040] border border-[#45497c] text-white rounded-lg px-2.5 py-1 text-[11px] outline-none focus:border-blue-400"
                          />
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => handleSimulateTransition(tr.toState)}
                      disabled={!isRoleAllowed}
                      className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                        isRoleAllowed
                          ? 'bg-[#0073EA] hover:bg-blue-600 text-white shadow-xs'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Test Transition</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Simulation Feedback Alert */}
        {simResult && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-center space-x-3 transition-all ${
              simResult.success
                ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-700'
                : 'bg-rose-950/90 text-rose-200 border border-rose-700'
            }`}
          >
            {simResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div>
              <strong className="block font-bold">{simResult.success ? 'Transition Validated' : 'Transition Blocked'}</strong>
              <span className="text-[11px] text-gray-200">{simResult.message}</span>
            </div>
          </div>
        )}

        {/* Simulator History Trail */}
        {simHistory.length > 0 && (
          <div className="pt-2 border-t border-[#363963]">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
              Recent Sandbox Simulation Log:
            </span>
            <div className="space-y-1">
              {simHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] bg-[#1e2040] px-3 py-1 rounded-lg border border-[#363963]">
                  <span className="text-gray-400 font-mono text-[10px]">{h.timestamp}</span>
                  <span className="font-semibold text-gray-200">
                    {h.from} ➔ <span className="text-blue-400">{h.to}</span>
                  </span>
                  <span className="text-gray-400 text-[10px]">as {h.role}</span>
                  <span className={h.success ? 'text-emerald-400 font-bold text-[10px]' : 'text-rose-400 font-bold text-[10px]'}>
                    {h.success ? 'PASSED' : 'BLOCKED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configured State Transition Matrix */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <h4 className="font-bold text-gray-900 text-sm">State Transition Rule Matrix</h4>
            <p className="text-xs text-gray-500">
              Active transition paths, permitted role authorizations, mandatory guards, and SLA targets.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search transitions, roles, fields..."
              value={searchRuleQuery}
              onChange={(e) => setSearchRuleQuery(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500 w-52"
            />

            <select
              value={filterFromState}
              onChange={(e) => setFilterFromState(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none font-semibold text-gray-700"
            >
              <option value="ALL">All Source States</option>
              {workflowStates.map(st => (
                <option key={st} value={st}>From: {st}</option>
              ))}
            </select>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none font-semibold text-gray-700"
            >
              <option value="ALL">All Roles</option>
              {allAvailableRoles.map(r => (
                <option key={r} value={r}>Role: {r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/60 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">From State</th>
                <th className="py-3 px-2 text-center w-6"></th>
                <th className="py-3 px-4">To State</th>
                <th className="py-3 px-4">Permitted Roles</th>
                <th className="py-3 px-4">Approval Gate</th>
                <th className="py-3 px-4">Mandatory Fields Guard</th>
                <th className="py-3 px-4">SLA Target</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredTransitions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-400 italic">
                    No transition rules found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransitions.map((tr, idx) => {
                  const originalIndex = workflowTransitions.indexOf(tr);
                  return (
                    <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-900 whitespace-nowrap">
                        {tr.fromState}
                      </td>

                      <td className="py-3.5 px-2 text-center text-gray-400">
                        <ArrowRight className="w-3.5 h-3.5 mx-auto" />
                      </td>

                      <td className="py-3.5 px-4 font-bold text-blue-600 whitespace-nowrap">
                        {tr.toState}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {tr.permittedRoles.map((r, rIdx) => (
                            <span
                              key={rIdx}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                isRoleAuthorizedForTransition([r], currentUser.role)
                                  ? 'bg-blue-100 text-blue-800 font-bold'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tr.requiresApproval ? (
                          <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1 w-fit">
                            <Lock className="w-3 h-3 text-amber-700" />
                            <span>{tr.approverRole || 'Manager'} Sign-off</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Direct Transition</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-gray-600">
                        {tr.mandatoryFields && tr.mandatoryFields.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tr.mandatoryFields.map((f, fIdx) => (
                              <span key={fIdx} className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-semibold px-2 py-0.5 rounded">
                                {f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                        {tr.slaHours ? `${tr.slaHours} hrs` : 'Standard'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleDuplicateRule(originalIndex)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Duplicate Rule"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditRule(originalIndex)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Rule"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(originalIndex)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Add / Edit Transition Rule Modal */}
      {showAddRuleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">
                {editingRuleIndex !== null ? 'Edit State Transition Rule' : 'Add State Transition Rule'}
              </h3>
              <button
                onClick={() => setShowAddRuleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">From State (Source) *</label>
                  <select
                    value={ruleFromState}
                    onChange={(e) => setRuleFromState(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-medium"
                    required
                  >
                    {workflowStates.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">To State (Target) *</label>
                  <select
                    value={ruleToState}
                    onChange={(e) => setRuleToState(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-medium"
                    required
                  >
                    {workflowStates.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Permitted Roles with Preset Buttons */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-gray-700 block">Permitted Roles *</label>
                  <div className="flex items-center space-x-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleSelectRolePreset('all')}
                      className="text-blue-600 hover:underline px-1"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleSelectRolePreset('sales')}
                      className="text-blue-600 hover:underline px-1"
                    >
                      Sales Team
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleSelectRolePreset('mgmt')}
                      className="text-blue-600 hover:underline px-1"
                    >
                      Management
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => handleSelectRolePreset('clear')}
                      className="text-gray-500 hover:underline px-1"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-48 overflow-y-auto">
                  {allAvailableRoles.map(role => {
                    const isChecked = ruleRoles.includes(role);
                    return (
                      <label key={role} className="flex items-center space-x-2 text-gray-700 cursor-pointer hover:bg-gray-100/60 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setRuleRoles(ruleRoles.filter(r => r !== role));
                            } else {
                              setRuleRoles([...ruleRoles, role]);
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-medium truncate">{role}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Approval Gate */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-amber-900">
                  <input
                    type="checkbox"
                    checked={ruleRequiresApproval}
                    onChange={(e) => setRuleRequiresApproval(e.target.checked)}
                    className="rounded text-amber-600"
                  />
                  <span>Require Formal Approval Before State Transition</span>
                </label>

                {ruleRequiresApproval && (
                  <div className="pt-2">
                    <label className="font-semibold text-gray-700 block mb-1">Required Approver Role</label>
                    <select
                      value={ruleApproverRole}
                      onChange={(e) => setRuleApproverRole(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none"
                    >
                      {allAvailableRoles.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Mandatory Fields */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Mandatory Fields Guard (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. bant.budget, totalValue, customerPoRef"
                  value={ruleMandatoryFields}
                  onChange={(e) => setRuleMandatoryFields(e.target.value)}
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  These fields MUST contain non-empty data before this transition is allowed.
                </p>
              </div>

              {/* SLA Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Transition SLA (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={ruleSlaHours}
                    onChange={(e) => setRuleSlaHours(Number(e.target.value))}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Success Notification Text</label>
                  <input
                    type="text"
                    placeholder="Optional message to team..."
                    value={ruleNotification}
                    onChange={(e) => setRuleNotification(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddRuleModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0073EA] hover:bg-blue-600 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Transition Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add State Node Modal */}
      {showAddStateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Add State Node</h3>
              <button
                onClick={() => setShowAddStateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStateNode} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">State Node Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Solution Review, Technical POC, Legal Verification"
                  value={newStateName}
                  onChange={(e) => setNewStateName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-medium"
                  required
                />
              </div>

              <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <label className="flex items-center space-x-2 cursor-pointer font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={newStateIsStart}
                    onChange={(e) => setNewStateIsStart(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Designate as Initial Starting Node</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={newStateIsEnd}
                    onChange={(e) => setNewStateIsEnd(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Designate as Terminal / Outcome Node</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddStateModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0073EA] hover:bg-blue-600 text-white rounded-lg font-semibold shadow-xs"
                >
                  Add State Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Spec Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Import Workflow Specification</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportJSON} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Paste JSON Specification</label>
                <textarea
                  rows={8}
                  placeholder={`{\n  "id": "wf_custom",\n  "name": "Custom Stream",\n  "module": "Leads",\n  "startingState": "Draft",\n  "allStates": ["Draft", "Active", "Done"],\n  "transitions": []\n}`}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-[11px] outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0073EA] hover:bg-blue-600 text-white rounded-lg font-semibold shadow-xs"
                >
                  Apply Specification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
