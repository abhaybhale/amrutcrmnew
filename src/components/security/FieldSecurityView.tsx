import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { FieldAccessLevel, UserRole } from '../../types';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';

export const FieldSecurityView: React.FC = () => {
  const { fieldSecurityRules, updateFieldSecurity } = useCRM();
  const [selectedRole, setSelectedRole] = useState<UserRole>('Sales Person');

  const allRoles: UserRole[] = [
    'Sales Person',
    'Sales Manager',
    'Vendor Head',
    'Presales Consultant',
    'Finance & Operations',
    'Management / Executive',
    'CRM Administrator'
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Field-Level Access Control (FLAC)</h1>
            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              Zero-Trust Security Matrix
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enforce real-time field masking for commercial margins, vendor costs, and confidential pricing.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-gray-400 font-medium">Selected Role:</span>
          <span className="px-2.5 py-1 bg-[#363963] text-white text-xs font-semibold rounded-md shadow-xs">
            {selectedRole}
          </span>
        </div>
      </div>

      {/* Role Selection Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0 w-full">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0 mr-1">
            Select Role:
          </span>
          {allRoles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1.5 rounded-md font-medium text-xs whitespace-nowrap transition-all ${
                selectedRole === role
                  ? 'bg-[#0073EA] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Field Permissions Matrix */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Security Rules for {selectedRole}</h3>
            <p className="text-xs text-gray-500">
              Configure read, edit, hidden, or mandatory enforcement per field on the server and UI.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
            Active Policy
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Entity Module</th>
                <th className="py-3 px-4">Field Name / Label</th>
                <th className="py-3 px-4 text-center">Current Permission</th>
                <th className="py-3 px-4 text-center">Set Access Level</th>
                <th className="py-3 px-4">Enforcement Effect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {fieldSecurityRules.map((rule) => {
                const currentPerm: FieldAccessLevel = rule.rolePermissions[selectedRole] || 'Editable';

                return (
                  <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{rule.module}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-blue-600">{rule.fieldLabel}</div>
                      <div className="font-mono text-[10px] text-gray-400 mt-0.5">{rule.fieldName}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          currentPerm === 'Hidden'
                            ? 'bg-rose-100 text-rose-700'
                            : currentPerm === 'Read Only'
                            ? 'bg-amber-100 text-amber-700'
                            : currentPerm === 'Mandatory'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {currentPerm === 'Hidden' && <EyeOff className="w-3 h-3" />}
                        {currentPerm === 'Read Only' && <Lock className="w-3 h-3" />}
                        {currentPerm === 'Editable' && <Edit3 className="w-3 h-3" />}
                        {currentPerm === 'Mandatory' && <ShieldCheck className="w-3 h-3" />}
                        <span>{currentPerm}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        {(['Editable', 'Read Only', 'Hidden', 'Mandatory'] as FieldAccessLevel[]).map((level) => (
                          <button
                            key={level}
                            onClick={() => updateFieldSecurity(rule.id, selectedRole, level)}
                            className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                              currentPerm === level
                                ? 'bg-white text-gray-900 font-bold shadow-xs'
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {currentPerm === 'Hidden' && (
                        <span className="text-[11px] text-rose-600 font-medium">
                          Masked completely: Hidden from JSON API &amp; DOM
                        </span>
                      )}
                      {currentPerm === 'Read Only' && (
                        <span className="text-[11px] text-amber-700 font-medium">
                          Visible in view mode, disabled in input forms
                        </span>
                      )}
                      {currentPerm === 'Editable' && (
                        <span className="text-[11px] text-emerald-600 font-medium">
                          Full read &amp; write permissions enabled
                        </span>
                      )}
                      {currentPerm === 'Mandatory' && (
                        <span className="text-[11px] text-purple-700 font-medium">
                          Required field: Cannot save form without value
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
