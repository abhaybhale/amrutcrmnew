import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { User, UserRole } from '../../types';
import { DataImportModal } from './DataImportModal';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  Shield,
  MapPin,
  Building2,
  Mail,
  Phone,
  Calendar,
  ToggleLeft,
  ToggleRight,
  LogIn,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Layers,
  Filter,
  X,
  Edit3,
  Network,
  ArrowRightLeft,
  GitFork,
  Briefcase,
  ChevronRight,
  UserPlus,
  Sliders,
  Share2,
  CornerDownRight,
  Crown,
  Award,
  Globe,
  Tag,
  FileSpreadsheet,
  Upload,
  Key,
  Lock,
  Copy,
  Check
} from 'lucide-react';

export const UserManagementTab: React.FC = () => {
  const {
    allUsers,
    currentUser,
    createUser,
    updateUser,
    renameUser,
    deleteUser,
    transferUserWorkload,
    toggleUserOutOfOffice,
    generateActivationLink,
    showToast,
    roles,
    vendors,
    leads,
    opportunities,
    accounts,
    companies,
    requestPasswordReset
  } = useCRM();

  // Active view tab within User Management
  const [activeTab, setActiveTab] = useState<'roster' | 'org_chart' | 'vendor_mapping' | 'territory_mapping' | 'workload_transfer'>('roster');

  // Filters for roster
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OOO'>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteTransferTargetId, setDeleteTransferTargetId] = useState<string>('');
  const [isSavingUser, setIsSavingUser] = useState(false);
  
  // Quick Rename Modal State
  const [userToRename, setUserToRename] = useState<User | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Quick User Mapping Modal State
  const [userToMap, setUserToMap] = useState<User | null>(null);
  const [mappingData, setMappingData] = useState({
    reportingManagerId: '',
    backupUserId: '',
    territory: '',
    role: '' as UserRole,
    department: '',
    vendorResponsibilities: [] as string[],
    eligibleForAutoAssignment: true
  });

  // Dedicated Workload Transfer Studio State
  const [transferSourceId, setTransferSourceId] = useState<string>('');
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [transferOptions, setTransferOptions] = useState({
    leads: true,
    opportunities: true,
    accounts: true,
    subordinates: true
  });

  // Form State for Create/Edit
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    mobile: '',
    department: 'Sales',
    role: 'Sales Person' as UserRole,
    territory: 'West – Mumbai & Pune',
    reportingManagerId: '',
    backupUserId: '',
    eligibleForAutoAssignment: true,
    isOutOfOffice: false,
    vendorResponsibilities: [] as string[],
    primaryCompanyId: ''
  });

  const departments = [
    'Sales',
    'Presales',
    'Vendor Management',
    'Commercial & CPQ',
    'Finance & Operations',
    'Executive Management',
    'Marketing',
    'Lead Generation',
    'Legal & Compliance'
  ];

  const territories = [
    'West – Mumbai & Pune',
    'South – Bengaluru & Hyderabad',
    'North – Delhi NCR',
    'East – Kolkata & Eastern Hubs',
    'Central – Ahmedabad & Indore',
    'Pan India',
    'International / Global'
  ];

  // Calculate active workload stats for a user
  const getUserWorkloadStats = (userId: string) => {
    const userLeads = leads.filter(l => l.workingSalespersonId === userId).length;
    const userOpps = opportunities.filter(o => o.ownerId === userId).length;
    const userAccounts = accounts.filter(a => a.ownerId === userId).length;
    const directReports = allUsers.filter(u => u.reportingManagerId === userId).length;
    return { userLeads, userOpps, userAccounts, directReports, total: userLeads + userOpps + userAccounts + directReports };
  };

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.territory.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    const matchesDept = selectedDeptFilter === 'ALL' || u.department === selectedDeptFilter;
    const matchesStatus =
      statusFilter === 'ALL' ? true :
      statusFilter === 'ACTIVE' ? u.isActive && !u.isOutOfOffice :
      u.isOutOfOffice;

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  const handleOpenAddModal = () => {
    const nextEmpId = `AS-${(allUsers.length + 201).toString()}`;
    setFormData({
      name: '',
      employeeId: nextEmpId,
      email: '',
      mobile: '+91 ',
      department: 'Sales',
      role: 'Sales Person',
      territory: 'West – Mumbai & Pune',
      reportingManagerId: allUsers.find(u => u.role === 'Sales Manager' || u.role === 'Sales Head')?.id || '',
      backupUserId: allUsers.find(u => u.role === 'Sales Person' && u.id !== currentUser.id)?.id || '',
      eligibleForAutoAssignment: true,
      isOutOfOffice: false,
      vendorResponsibilities: [],
      primaryCompanyId: companies[0]?.id || ''
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      employeeId: user.employeeId,
      email: user.email,
      mobile: user.mobile,
      department: user.department,
      role: user.role,
      territory: user.territory,
      reportingManagerId: user.reportingManagerId || '',
      backupUserId: user.backupUserId || '',
      eligibleForAutoAssignment: user.eligibleForAutoAssignment,
      isOutOfOffice: user.isOutOfOffice,
      vendorResponsibilities: user.vendorResponsibilities || [],
      primaryCompanyId: user.primaryCompanyId || companies[0]?.id || ''
    });
  };

  const handleOpenRenameModal = (user: User) => {
    setUserToRename(user);
    setRenameValue(user.name);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToRename || !renameValue.trim()) return;
    renameUser(userToRename.id, renameValue.trim());
    setUserToRename(null);
  };

  const handleOpenMappingModal = (user: User) => {
    setUserToMap(user);
    setMappingData({
      reportingManagerId: user.reportingManagerId || '',
      backupUserId: user.backupUserId || '',
      territory: user.territory || 'Pan India',
      role: user.role,
      department: user.department,
      vendorResponsibilities: user.vendorResponsibilities || [],
      eligibleForAutoAssignment: user.eligibleForAutoAssignment
    });
  };

  const handleSaveMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToMap) return;
    updateUser(userToMap.id, {
      reportingManagerId: mappingData.reportingManagerId || undefined,
      backupUserId: mappingData.backupUserId || undefined,
      territory: mappingData.territory,
      role: mappingData.role,
      department: mappingData.department,
      vendorResponsibilities: mappingData.vendorResponsibilities,
      eligibleForAutoAssignment: mappingData.eligibleForAutoAssignment
    });
    setUserToMap(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    const normalizedEmail = formData.email.trim().toLowerCase();
    if (!normalizedEmail.endsWith('@amrutsoftware.com')) {
      showToast('Only @amrutsoftware.com email addresses can be added.', 'error');
      return;
    }

    if (editingUser) {
      updateUser(editingUser.id, {
        name: formData.name,
        employeeId: formData.employeeId,
        email: formData.email,
        mobile: formData.mobile,
        department: formData.department,
        role: formData.role,
        territory: formData.territory,
        reportingManagerId: formData.reportingManagerId || undefined,
        backupUserId: formData.backupUserId || undefined,
        eligibleForAutoAssignment: formData.eligibleForAutoAssignment,
        isOutOfOffice: formData.isOutOfOffice,
        vendorResponsibilities: formData.vendorResponsibilities
      });
      setEditingUser(null);
    } else {
      setIsSavingUser(true);
      const result = await createUser({
        name: formData.name,
        employeeId: formData.employeeId,
        email: normalizedEmail,
        mobile: formData.mobile,
        department: formData.department,
        role: formData.role,
        territory: formData.territory,
        reportingManagerId: formData.reportingManagerId || undefined,
        backupUserId: formData.backupUserId || undefined,
        eligibleForAutoAssignment: formData.eligibleForAutoAssignment,
        isOutOfOffice: formData.isOutOfOffice,
        vendorResponsibilities: formData.vendorResponsibilities,
        primaryCompanyId: formData.primaryCompanyId
      });
      setIsSavingUser(false);
      if (result.success) setShowAddModal(false);
    }
  };

  const handleOpenDeleteModal = (user: User) => {
    setUserToDelete(user);
    // Find default fallback recipient for workload (e.g. Sales Head, Sales Manager, or first other user)
    const defaultTarget = allUsers.find(u => u.id !== user.id && (u.role === 'Sales Head' || u.role === 'Sales Manager' || u.role === 'Managing Director')) || allUsers.find(u => u.id !== user.id);
    setDeleteTransferTargetId(defaultTarget ? defaultTarget.id : '');
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteUser(userToDelete.id, deleteTransferTargetId || undefined);
      setUserToDelete(null);
    }
  };

  const handleExecuteWorkloadTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSourceId || !transferTargetId) return;
    if (transferSourceId === transferTargetId) return;
    transferUserWorkload(transferSourceId, transferTargetId, transferOptions);
  };

  const oooCount = allUsers.filter(u => u.isOutOfOffice).length;
  const activeCount = allUsers.filter(u => u.isActive && !u.isOutOfOffice).length;

  return (
    <div className="space-y-6">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff Accounts</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{allUsers.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active &amp; In-Office</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Out-Of-Office (Routing)</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{oooCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Active Persona</p>
            <p className="text-sm font-bold text-slate-900 mt-1 truncate max-w-[140px]">{currentUser.name}</p>
            <span className="text-[11px] font-medium text-indigo-600">{currentUser.role}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* User Management Views Navigation Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-[#0073EA] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff Roster &amp; Profiles</span>
          </button>

          <button
            onClick={() => setActiveTab('org_chart')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'org_chart'
                ? 'bg-[#0073EA] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Hierarchy &amp; Reporting Lines</span>
          </button>

          <button
            onClick={() => setActiveTab('vendor_mapping')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'vendor_mapping'
                ? 'bg-[#0073EA] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>OEM Vendor Mapping</span>
          </button>

          <button
            onClick={() => setActiveTab('territory_mapping')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'territory_mapping'
                ? 'bg-[#0073EA] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Territory Coverage</span>
          </button>

          <button
            onClick={() => setActiveTab('workload_transfer')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'workload_transfer'
                ? 'bg-[#0073EA] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Workload Transfer Studio</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 ml-auto">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            title="Import users in bulk from CSV or Excel spreadsheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import Staff (CSV / XLS)</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#0073EA] hover:bg-blue-600 text-white rounded-xl font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: STAFF ROSTER & PROFILES */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff, email, ID, territory..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Roles ({roles.length})</option>
                {roles.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>

              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  In Office
                </button>
                <button
                  onClick={() => setStatusFilter('OOO')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'OOO' ? 'bg-white text-amber-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  OOO ({oooCount})
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member &amp; ID</th>
                    <th className="py-3 px-4">Role &amp; Department</th>
                    <th className="py-3 px-4">Reporting Hierarchy &amp; Territory</th>
                    <th className="py-3 px-4">Partner &amp; Workload Scope</th>
                    <th className="py-3 px-4">Password &amp; Status</th>
                    <th className="py-3 px-4">Availability</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No users match the criteria</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((usr) => {
                      const isCurrent = usr.id === currentUser.id;
                      const manager = allUsers.find(u => u.id === usr.reportingManagerId);
                      const backup = allUsers.find(u => u.id === usr.backupUserId);
                      const roleDef = roles.find(r => r.name === usr.role);
                      const stats = getUserWorkloadStats(usr.id);

                      return (
                        <tr key={usr.id} className={`hover:bg-slate-50/60 transition-colors ${isCurrent ? 'bg-indigo-50/40' : ''}`}>
                          {/* Name & ID */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200 shrink-0">
                                {usr.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="font-bold text-slate-900 truncate">{usr.name}</p>
                                  {isCurrent && (
                                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                      Active Session
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleOpenRenameModal(usr)}
                                    className="text-slate-400 hover:text-blue-600 p-0.5 rounded-md hover:bg-slate-100"
                                    title="Quick Rename User"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                                  <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600">{usr.employeeId || 'AS-GEN'}</span>
                                  <span>•</span>
                                  <span className="truncate">{usr.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role & Dept */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border ${roleDef?.badgeBg || 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                {usr.role}
                              </span>
                              <p className="text-[11px] text-slate-500">{usr.department}</p>
                            </div>
                          </td>

                          {/* Hierarchy & Territory */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <p className="text-[11px] text-slate-600 flex items-center space-x-1">
                                <span className="text-slate-400 font-normal">Reports to:</span>
                                <span className="font-bold text-slate-800">{manager ? manager.name : 'None (Executive Level)'}</span>
                              </p>
                              <p className="text-[11px] text-slate-500 flex items-center space-x-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{usr.territory}</span>
                              </p>
                            </div>
                          </td>

                          {/* Vendor & Workload Scope */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {usr.vendorResponsibilities && usr.vendorResponsibilities.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {usr.vendorResponsibilities.map(vId => {
                                    const vObj = vendors.find(v => v.id === vId);
                                    return (
                                      <span key={vId} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold">
                                        {vObj?.name || vId}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">General Practice</span>
                              )}
                              <div className="text-[10px] text-slate-500 flex items-center space-x-2">
                                <span>{stats.userLeads} Leads</span>
                                <span>•</span>
                                <span>{stats.userOpps} Opps</span>
                                <span>•</span>
                                <span>{stats.directReports} Direct Reports</span>
                              </div>
                            </div>
                          </td>

                          {/* Password & Activation Status */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {usr.isPasswordSet ? (
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Active (Password Set)</span>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                                    <Key className="w-3 h-3 text-amber-600" />
                                    <span>Pending 1st Login</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const { code, link } = generateActivationLink(usr.id);
                                      navigator.clipboard?.writeText(link);
                                      showToast(`Activation Link & Invite Code ${code} copied for ${usr.name}!`, 'success');
                                    }}
                                    className="block text-[10px] text-blue-600 hover:text-blue-800 font-medium underline cursor-pointer"
                                    title="Copy direct invite link for first-time password setup"
                                  >
                                    Copy Invite ({usr.tempActivationCode || 'ACT-9021'})
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status & OOO Routing */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <button
                                onClick={() => toggleUserOutOfOffice(usr.id)}
                                className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                                  usr.isOutOfOffice
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                }`}
                                title="Click to toggle Out of Office mode"
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${usr.isOutOfOffice ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                <span>{usr.isOutOfOffice ? 'On Leave (OOO)' : 'In Office'}</span>
                              </button>

                              {usr.isOutOfOffice && backup && (
                                <p className="text-[10px] text-amber-700 font-medium">
                                  ↳ Backup: <span className="font-bold">{backup.name}</span>
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {!isCurrent && (
                                <button
                                  onClick={() => showToast(`Real per-user accounts are signed in individually now — sign out and sign back in as ${usr.name} to switch.`, 'info')}
                                  className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                                  title={`Sign in separately as ${usr.name} to switch`}
                                >
                                  <LogIn className="w-3 h-3" />
                                  <span>Switch</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenRenameModal(usr)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Rename User"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenMappingModal(usr)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                title="Configure User Mappings (Reporting Manager, Vendor, Territory)"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  const result = await requestPasswordReset(usr.email);
                                  showToast(result.message || 'Password reset request completed.', result.success ? 'success' : 'error');
                                }}
                                className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                title={`Send password reset email to ${usr.email}`}
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(usr)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Full Profile Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteModal(usr)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete User &amp; Reassign Records"
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
        </div>
      )}

      {/* VIEW 2: HIERARCHY & REPORTING LINES (ORG CHART) */}
      {activeTab === 'org_chart' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-5 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Network className="w-4 h-4 text-blue-600" />
                <span>Enterprise Reporting Hierarchy &amp; Management Lines</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Visual organization tree. Change any employee&apos;s reporting manager directly from the inline selector to immediately update data visibility and escalation chains.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allUsers.map((usr) => {
              const manager = allUsers.find(u => u.id === usr.reportingManagerId);
              const directReports = allUsers.filter(u => u.reportingManagerId === usr.id);
              const isExec = !usr.reportingManagerId;

              return (
                <div
                  key={usr.id}
                  className={`bg-white rounded-2xl border p-4 shadow-xs space-y-3 transition-all ${
                    isExec ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-xs ${
                        isExec ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {isExec ? <Crown className="w-5 h-5 text-amber-600" /> : usr.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <h4 className="text-xs font-bold text-slate-900">{usr.name}</h4>
                          {isExec && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">Top Executive</span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-indigo-600">{usr.role}</p>
                        <p className="text-[10px] text-slate-400">{usr.department} • {usr.territory}</p>
                      </div>
                    </div>
                  </div>

                  {/* Inline Reporting Manager Selector */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Reporting Manager (Hierarchical Line)
                    </label>
                    <select
                      value={usr.reportingManagerId || ''}
                      onChange={(e) => {
                        updateUser(usr.id, { reportingManagerId: e.target.value || undefined });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    >
                      <option value="">None (Top Executive)</option>
                      {allUsers
                        .filter(u => u.id !== usr.id)
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Direct Reports List */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-600">Direct Reports ({directReports.length})</span>
                    </div>
                    {directReports.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No direct subordinates assigned</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {directReports.map(sub => (
                          <span key={sub.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium border border-slate-200">
                            {sub.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: OEM VENDOR MAPPING MATRIX */}
      {activeTab === 'vendor_mapping' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-white p-5 rounded-2xl border border-indigo-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>OEM Partner &amp; Vendor Responsibilities Matrix</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Map staff members to specific OEM technology partners (Atlassian, Microsoft, Nagios, JetBrains, AWS, etc.) to grant partner-scoped record visibility and management.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => {
              const mappedUsers = allUsers.filter(u => u.vendorResponsibilities && u.vendorResponsibilities.includes(vendor.id));

              return (
                <div key={vendor.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{vendor.name}</h4>
                      <p className="text-[11px] text-slate-500">{vendor.partnerLevel} OEM Partner</p>
                    </div>
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold">
                      {mappedUsers.length} Mapped
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-600">Assigned Vendor Heads &amp; Leads:</p>
                    {mappedUsers.length === 0 ? (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                        ⚠️ No designated Vendor Head currently assigned.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {mappedUsers.map(usr => (
                          <div key={usr.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{usr.name}</p>
                              <p className="text-[10px] text-slate-500">{usr.role} • {usr.department}</p>
                            </div>
                            <button
                              onClick={() => {
                                const nextList = (usr.vendorResponsibilities || []).filter(id => id !== vendor.id);
                                updateUser(usr.id, { vendorResponsibilities: nextList });
                              }}
                              className="text-rose-500 hover:text-rose-700 text-[10px] font-semibold px-2 py-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Unmap user from this vendor"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Add Staff to this Vendor */}
                  <div className="pt-3 border-t border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      + Map Additional Staff Member
                    </label>
                    <select
                      onChange={(e) => {
                        const uId = e.target.value;
                        if (!uId) return;
                        const targetUser = allUsers.find(u => u.id === uId);
                        if (targetUser) {
                          const currentVendors = targetUser.vendorResponsibilities || [];
                          if (!currentVendors.includes(vendor.id)) {
                            updateUser(uId, { vendorResponsibilities: [...currentVendors, vendor.id] });
                          }
                        }
                        e.target.value = '';
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    >
                      <option value="">Select staff member to map...</option>
                      {allUsers
                        .filter(u => !(u.vendorResponsibilities || []).includes(vendor.id))
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: TERRITORY COVERAGE MAPPING */}
      {activeTab === 'territory_mapping' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-5 rounded-2xl border border-emerald-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Geographic Territory &amp; Regional Alignment Matrix</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Ensure full sales coverage across Mumbai/Pune, Bengaluru/Hyderabad, Delhi NCR, and Global accounts with territory mapping.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {territories.map((territory) => {
              const assignedUsers = allUsers.filter(u => u.territory === territory);

              return (
                <div key={territory} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span>{territory}</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{assignedUsers.length} Representatives Assigned</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {assignedUsers.length === 0 ? (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                        ⚠️ No personnel mapped to this territory.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {assignedUsers.map(usr => (
                          <div key={usr.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{usr.name}</p>
                              <p className="text-[10px] text-slate-500">{usr.role} • {usr.department}</p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded-md font-medium text-slate-600">
                              {usr.isOutOfOffice ? '⚠️ On Leave' : 'Active'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Re-map a user to this territory */}
                  <div className="pt-3 border-t border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      + Re-map Staff Member to {territory}
                    </label>
                    <select
                      onChange={(e) => {
                        const uId = e.target.value;
                        if (!uId) return;
                        updateUser(uId, { territory });
                        e.target.value = '';
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    >
                      <option value="">Select staff member to transfer...</option>
                      {allUsers
                        .filter(u => u.territory !== territory)
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} (Currently: {u.territory})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 5: WORKLOAD TRANSFER & REASSIGNMENT STUDIO */}
      {activeTab === 'workload_transfer' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-5 rounded-2xl border border-blue-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                <span>Enterprise Workload Transfer &amp; User Reassignment Studio</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Seamlessly bulk-transfer active Leads, Opportunities, Customer Accounts, and Reporting Lines from one staff member to another (ideal for territory reshuffles, promotions, or departures).
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs max-w-3xl mx-auto space-y-6">
            <form onSubmit={handleExecuteWorkloadTransfer} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Source User */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    1. Source User (Transfer From) *
                  </label>
                  <select
                    required
                    value={transferSourceId}
                    onChange={(e) => setTransferSourceId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="">Select source user...</option>
                    {allUsers.map(u => {
                      const stats = getUserWorkloadStats(u.id);
                      return (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role}) — {stats.userLeads} leads, {stats.userOpps} opps
                        </option>
                      );
                    })}
                  </select>

                  {transferSourceId && (
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs space-y-1 text-blue-900">
                      {(() => {
                        const stats = getUserWorkloadStats(transferSourceId);
                        return (
                          <>
                            <p className="font-bold">Active Records Found:</p>
                            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-blue-800">
                              <li>{stats.userLeads} Leads assigned</li>
                              <li>{stats.userOpps} Opportunities in pipeline</li>
                              <li>{stats.userAccounts} Accounts owned</li>
                              <li>{stats.directReports} Direct reporting subordinates</li>
                            </ul>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Target User */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Destination User (Transfer To) *
                  </label>
                  <select
                    required
                    value={transferTargetId}
                    onChange={(e) => setTransferTargetId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="">Select target recipient...</option>
                    {allUsers
                      .filter(u => u.id !== transferSourceId)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role}) — {u.territory}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Transfer Options */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-700">Select Modules to Transfer:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="flex items-center space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transferOptions.leads}
                      onChange={(e) => setTransferOptions({ ...transferOptions, leads: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded-sm"
                    />
                    <span>Leads</span>
                  </label>

                  <label className="flex items-center space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transferOptions.opportunities}
                      onChange={(e) => setTransferOptions({ ...transferOptions, opportunities: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded-sm"
                    />
                    <span>Opportunities</span>
                  </label>

                  <label className="flex items-center space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transferOptions.accounts}
                      onChange={(e) => setTransferOptions({ ...transferOptions, accounts: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded-sm"
                    />
                    <span>Accounts</span>
                  </label>

                  <label className="flex items-center space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={transferOptions.subordinates}
                      onChange={(e) => setTransferOptions({ ...transferOptions, subordinates: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded-sm"
                    />
                    <span>Direct Reports</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={!transferSourceId || !transferTargetId || transferSourceId === transferTargetId}
                  className="px-6 py-2.5 bg-[#0073EA] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Execute Workload Transfer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK RENAME MODAL */}
      {userToRename && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Rename User Account</h3>
                  <p className="text-[11px] text-slate-500">{userToRename.employeeId} • {userToRename.role}</p>
                </div>
              </div>
              <button
                onClick={() => setUserToRename(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRename} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Enter employee full name..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Renaming will automatically update the salesperson name across all assigned leads, opportunities, quotes, and accounts.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserToRename(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#0073EA] hover:bg-blue-600 rounded-xl transition-all shadow-xs"
                >
                  Save New Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK USER MAPPING MODAL */}
      {userToMap && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">User Mappings &amp; Coverage for {userToMap.name}</h3>
                  <p className="text-[11px] text-slate-500">{userToMap.email} • {userToMap.employeeId}</p>
                </div>
              </div>
              <button
                onClick={() => setUserToMap(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMapping} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reporting Manager (Hierarchy Line)</label>
                  <select
                    value={mappingData.reportingManagerId}
                    onChange={(e) => setMappingData({ ...mappingData, reportingManagerId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="">None (Top Executive Level)</option>
                    {allUsers
                      .filter(u => u.id !== userToMap.id)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Out-Of-Office Backup Representative</label>
                  <select
                    value={mappingData.backupUserId}
                    onChange={(e) => setMappingData({ ...mappingData, backupUserId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    <option value="">Default Round Robin Assignment</option>
                    {allUsers
                      .filter(u => u.id !== userToMap.id)
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.territory})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Territory Alignment</label>
                  <select
                    value={mappingData.territory}
                    onChange={(e) => setMappingData({ ...mappingData, territory: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    {territories.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={mappingData.role}
                    onChange={(e) => setMappingData({ ...mappingData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vendor Head Responsibilities Mapping */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  OEM Partner Scope Responsibilities:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {vendors.map(v => {
                    const isSelected = mappingData.vendorResponsibilities.includes(v.id);
                    return (
                      <label
                        key={v.id}
                        className={`flex items-center space-x-2 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMappingData({ ...mappingData, vendorResponsibilities: [...mappingData.vendorResponsibilities, v.id] });
                            } else {
                              setMappingData({ ...mappingData, vendorResponsibilities: mappingData.vendorResponsibilities.filter(id => id !== v.id) });
                            }
                          }}
                          className="w-3.5 h-3.5 text-indigo-600 rounded-sm"
                        />
                        <span className="truncate">{v.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserToMap(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs"
                >
                  Save User Mappings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / FULL EDIT USER MODAL */}
      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingUser ? `Edit User: ${editingUser.name}` : 'Create New User Account'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure enterprise credentials, user role permissions, territory alignment, and coverage rules.
                </p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setEditingUser(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AS-205"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@amrutsoftware.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Contact</label>
                  <input
                    type="text"
                    placeholder="+91 98000 00000"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.name}>{r.name} {r.isSystem ? '(System)' : '(Custom)'}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company *</label>
                  <select
                    required
                    value={formData.primaryCompanyId}
                    onChange={(e) => setFormData({ ...formData, primaryCompanyId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="">Select company...</option>
                    {companies.filter(company => company.isActive).map(company => (
                      <option key={company.id} value={company.id}>{company.name} ({company.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Territory Assignment</label>
                  <select
                    value={formData.territory}
                    onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    {territories.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reporting Manager</label>
                  <select
                    value={formData.reportingManagerId}
                    onChange={(e) => setFormData({ ...formData, reportingManagerId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="">None (Top Executive Level)</option>
                    {allUsers
                      .filter(u => !editingUser || u.id !== editingUser.id)
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Out-Of-Office Backup Rep</label>
                  <select
                    value={formData.backupUserId}
                    onChange={(e) => setFormData({ ...formData, backupUserId: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="">Default Round Robin Assignment</option>
                    {allUsers
                      .filter(u => !editingUser || u.id !== editingUser.id)
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.territory})</option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center space-x-4 pt-6">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.eligibleForAutoAssignment}
                      onChange={(e) => setFormData({ ...formData, eligibleForAutoAssignment: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                    />
                    <span>Auto Lead Assignment Active</span>
                  </label>
                </div>
              </div>

              {/* Vendor Head Responsibilities */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  OEM Partner Head Responsibility (Grants Partner Scope Visibility)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {vendors.map(v => {
                    const isSelected = formData.vendorResponsibilities.includes(v.id);
                    return (
                      <label
                        key={v.id}
                        className={`flex items-center space-x-2 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, vendorResponsibilities: [...formData.vendorResponsibilities, v.id] });
                            } else {
                              setFormData({ ...formData, vendorResponsibilities: formData.vendorResponsibilities.filter(id => id !== v.id) });
                            }
                          }}
                          className="w-3.5 h-3.5 text-indigo-600 rounded-sm"
                        />
                        <span className="truncate">{v.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingUser(null); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0073EA] hover:bg-blue-600 disabled:opacity-50 rounded-xl transition-all shadow-xs"
                >
                  {isSavingUser ? 'Creating Account...' : editingUser ? 'Save Changes' : 'Create User & Send Setup Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENHANCED DELETE USER MODAL WITH WORKLOAD REASSIGNMENT */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete User Account</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <span className="font-bold text-slate-800">{userToDelete.name}</span> ({userToDelete.email})?
              </p>
            </div>

            {/* Current Workload Summary */}
            {(() => {
              const stats = getUserWorkloadStats(userToDelete.id);
              return (
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <p className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Active Workload Records:</span>
                    <span className="text-rose-600 font-extrabold">{stats.total} total items</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <span className="bg-white p-1.5 rounded-lg border border-slate-100">{stats.userLeads} Active Leads</span>
                    <span className="bg-white p-1.5 rounded-lg border border-slate-100">{stats.userOpps} Pipeline Opps</span>
                    <span className="bg-white p-1.5 rounded-lg border border-slate-100">{stats.userAccounts} Accounts</span>
                    <span className="bg-white p-1.5 rounded-lg border border-slate-100">{stats.directReports} Direct Reports</span>
                  </div>

                  {stats.total > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Reassign All Records &amp; Subordinates To:
                      </label>
                      <select
                        value={deleteTransferTargetId}
                        onChange={(e) => setDeleteTransferTargetId(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="">Do not reassign (clear / archive)</option>
                        {allUsers
                          .filter(u => u.id !== userToDelete.id)
                          .map(u => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs"
              >
                Confirm &amp; Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Data Import Modal for Users */}
      <DataImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        targetModule="Users"
      />
    </div>
  );
};
