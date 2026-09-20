import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { RoleDefinition } from '../../types';
import {
  Shield,
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  Users,
  Check,
  X,
  Lock,
  Sparkles,
  AlertCircle,
  FileCheck2,
  Layers,
  Database,
  Sliders,
  FileSpreadsheet,
  BarChart3
} from 'lucide-react';

export const RoleManagementTab: React.FC = () => {
  const { roles, allUsers, createRole, updateRole, deleteRole } = useCRM();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<RoleDefinition | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#0073EA',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    permissions: {
      canViewAllLeads: false,
      canManageUsers: false,
      canConfigureWorkflows: false,
      canApproveQuotes: false,
      canImportData: false,
      canManageFieldSecurity: false,
      canExportReports: true
    }
  });

  const badgeThemes = [
    { label: 'Royal Blue', bg: 'bg-blue-50 text-blue-700 border-blue-200', color: '#0073EA' },
    { label: 'Emerald Green', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', color: '#00C875' },
    { label: 'Purple Iris', bg: 'bg-purple-50 text-purple-700 border-purple-200', color: '#8B5CF6' },
    { label: 'Amber Gold', bg: 'bg-amber-50 text-amber-700 border-amber-200', color: '#F59E0B' },
    { label: 'Rose Pink', bg: 'bg-rose-50 text-rose-700 border-rose-200', color: '#E11D48' },
    { label: 'Cyan Ocean', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', color: '#06B6D4' },
    { label: 'Indigo Slate', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', color: '#4F46E5' },
    { label: 'Dark Charcoal', bg: 'bg-slate-100 text-slate-800 border-slate-300', color: '#334155' }
  ];

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      description: '',
      color: '#0073EA',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      permissions: {
        canViewAllLeads: false,
        canManageUsers: false,
        canConfigureWorkflows: false,
        canApproveQuotes: false,
        canImportData: true,
        canManageFieldSecurity: false,
        canExportReports: true
      }
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (role: RoleDefinition) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      color: role.color,
      badgeBg: role.badgeBg,
      permissions: { ...role.permissions }
    });
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingRole) {
      updateRole(editingRole.id, {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        badgeBg: formData.badgeBg,
        badgeText: formData.badgeBg.split(' ')[1] || 'text-blue-700',
        permissions: formData.permissions
      });
      setEditingRole(null);
    } else {
      createRole({
        name: formData.name,
        description: formData.description,
        color: formData.color,
        badgeBg: formData.badgeBg,
        badgeText: formData.badgeBg.split(' ')[1] || 'text-blue-700',
        permissions: formData.permissions
      });
      setShowAddModal(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (roleToDelete) {
      deleteRole(roleToDelete.id);
      setRoleToDelete(null);
    }
  };

  const permissionLabels: { key: keyof RoleDefinition['permissions']; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      key: 'canViewAllLeads',
      label: 'View All Enterprise Leads',
      desc: 'Bypasses territory & salesperson assignment scoping to view complete cross-region pipelines.',
      icon: Users
    },
    {
      key: 'canManageUsers',
      label: 'Staff & Role Administration',
      desc: 'Create, modify, disable employee accounts and define role permission matrices.',
      icon: ShieldCheck
    },
    {
      key: 'canConfigureWorkflows',
      label: 'Workflow Engine & SLA Rules',
      desc: 'Modify SLA thresholds, round-robin auto-assignment rules, and trigger configurations.',
      icon: Sliders
    },
    {
      key: 'canApproveQuotes',
      label: 'Commercial CPQ Approvals',
      desc: 'Authorize quotes exceeding 10% discount thresholds and special margin concessions.',
      icon: FileCheck2
    },
    {
      key: 'canImportData',
      label: 'Bulk Data Import (CSV / XLS)',
      desc: 'Execute bulk dataset imports with automated field mapping and schema provisioning.',
      icon: FileSpreadsheet
    },
    {
      key: 'canManageFieldSecurity',
      label: 'Field-Level Security Matrix',
      desc: 'Configure Read/Write, Read-Only, and Hidden restrictions on sensitive financial fields.',
      icon: Lock
    },
    {
      key: 'canExportReports',
      label: 'Custom Reporting & Exports',
      desc: 'Generate customized multi-module tabular reports and export CSV analytics.',
      icon: BarChart3
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-slate-900">Role-Based Access Control (RBAC)</h2>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
              {roles.length} Defined Roles
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Define system personas, assign granular permission capabilities, and control operational access across modules.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-[#0073EA] hover:bg-blue-600 text-white rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Role</span>
        </button>
      </div>

      {/* Grid of Roles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roles.map((role) => {
          const assignedCount = allUsers.filter(u => u.role === role.name).length;
          const activePermsCount = Object.values(role.permissions).filter(Boolean).length;

          return (
            <div
              key={role.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all relative overflow-hidden"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border ${role.badgeBg}`}>
                      {role.name}
                    </span>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed line-clamp-2">
                      {role.description}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(role)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Permissions"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {!role.isSystem && (
                      <button
                        onClick={() => setRoleToDelete(role)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Assigned Users</p>
                    <p className="text-sm font-bold text-slate-800 flex items-center space-x-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{assignedCount} Staff</span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Granted Rights</p>
                    <p className="text-sm font-bold text-slate-800 flex items-center space-x-1 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{activePermsCount} / 7 Permissions</span>
                    </p>
                  </div>
                </div>

                {/* Permission Tags */}
                <div className="mt-3 space-y-1.5 pt-3 border-t border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Access Capabilities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {permissionLabels.map(p => {
                      const hasPerm = role.permissions[p.key];
                      if (!hasPerm) return null;
                      return (
                        <span
                          key={p.key}
                          className="inline-flex items-center space-x-1 bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                        >
                          <Check className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          <span>{p.label}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{role.isSystem ? '🔒 Built-in System Role' : '✨ Custom Defined Role'}</span>
                <span>{new Date(role.createdDate).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Role Modal */}
      {(showAddModal || editingRole) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New User Role'}
                </h3>
                <p className="text-xs text-slate-500">
                  Define authority limits and capabilities for this role assignment.
                </p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setEditingRole(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role Title / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Regional Account Executive"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={editingRole?.isSystem}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500"
                />
                {editingRole?.isSystem && (
                  <p className="text-[11px] text-amber-600 mt-1">System role names are fixed, but capabilities can be adjusted.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Summarize the core operational responsibilities for this role..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Color & Badge Theme */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Badge Styling</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {badgeThemes.map(theme => {
                    const isSelected = formData.badgeBg === theme.bg;
                    return (
                      <button
                        type="button"
                        key={theme.label}
                        onClick={() => setFormData({ ...formData, badgeBg: theme.bg, color: theme.color })}
                        className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-blue-500 border-transparent shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${theme.bg}`}>
                          Preview
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Granted Capabilities &amp; Permissions</label>
                  <button
                    type="button"
                    onClick={() => {
                      const allChecked = Object.values(formData.permissions).every(Boolean);
                      setFormData({
                        ...formData,
                        permissions: {
                          canViewAllLeads: !allChecked,
                          canManageUsers: !allChecked,
                          canConfigureWorkflows: !allChecked,
                          canApproveQuotes: !allChecked,
                          canImportData: !allChecked,
                          canManageFieldSecurity: !allChecked,
                          canExportReports: !allChecked
                        }
                      });
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Toggle All
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {permissionLabels.map((perm) => {
                    const isChecked = formData.permissions[perm.key];
                    const Icon = perm.icon;
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              permissions: {
                                ...formData.permissions,
                                [perm.key]: e.target.checked
                              }
                            });
                          }}
                          className="w-4 h-4 text-blue-600 rounded-sm mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <Icon className="w-3.5 h-3.5 text-slate-500" />
                            <p className="text-xs font-bold text-slate-900">{perm.label}</p>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{perm.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingRole(null); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0073EA] hover:bg-blue-600 rounded-xl transition-all shadow-xs"
                >
                  {editingRole ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {roleToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Custom Role?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete role <span className="font-bold text-slate-800">{roleToDelete.name}</span>? Existing users assigned to this role will default to standard Sales Person permissions.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setRoleToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
