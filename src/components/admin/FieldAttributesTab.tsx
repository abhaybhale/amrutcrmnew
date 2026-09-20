import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { FieldAttribute, FieldAttributeType } from '../../types';
import {
  SlidersHorizontal,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Lock,
  Layers,
  Sparkles,
  Search,
  Type,
  Hash,
  DollarSign,
  Calendar,
  ListFilter,
  CheckSquare,
  Mail,
  Globe,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

export const FieldAttributesTab: React.FC = () => {
  const { fieldAttributes, createFieldAttribute, updateFieldAttribute, deleteFieldAttribute } = useCRM();

  const [selectedModule, setSelectedModule] = useState<'Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Quotes' | 'Orders'>('Leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAttr, setEditingAttr] = useState<FieldAttribute | null>(null);
  const [attrToDelete, setAttrToDelete] = useState<FieldAttribute | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    label: '',
    name: '',
    module: 'Leads' as FieldAttribute['module'],
    type: 'text' as FieldAttributeType,
    mandatory: false,
    defaultValue: '',
    helpText: '',
    optionsString: 'Option A, Option B, Option C'
  });

  const modules: ('Leads' | 'Opportunities' | 'Accounts' | 'Contacts' | 'Quotes' | 'Orders')[] = [
    'Leads',
    'Opportunities',
    'Accounts',
    'Contacts',
    'Quotes',
    'Orders'
  ];

  const typeIcons: Record<FieldAttributeType, React.ComponentType<{ className?: string }>> = {
    text: Type,
    number: Hash,
    currency: DollarSign,
    date: Calendar,
    select: ListFilter,
    boolean: CheckSquare,
    email: Mail,
    url: Globe
  };

  const filteredAttributes = fieldAttributes.filter(attr => {
    const matchesModule = attr.module === selectedModule;
    const matchesSearch =
      attr.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (attr.helpText || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || attr.type === typeFilter;
    return matchesModule && matchesSearch && matchesType;
  });

  const handleOpenAdd = () => {
    setFormData({
      label: '',
      name: '',
      module: selectedModule,
      type: 'text',
      mandatory: false,
      defaultValue: '',
      helpText: '',
      optionsString: 'Option A, Option B, Option C'
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (attr: FieldAttribute) => {
    setEditingAttr(attr);
    setFormData({
      label: attr.label,
      name: attr.name,
      module: attr.module,
      type: attr.type,
      mandatory: attr.mandatory,
      defaultValue: attr.defaultValue ? String(attr.defaultValue) : '',
      helpText: attr.helpText || '',
      optionsString: (attr.options || []).join(', ')
    });
  };

  const handleLabelChange = (val: string) => {
    const cleanKey = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    setFormData(prev => ({
      ...prev,
      label: val,
      name: prev.name.startsWith('custom_') || !editingAttr ? `custom_${cleanKey}` : prev.name
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim()) return;

    const parsedOptions = formData.type === 'select'
      ? formData.optionsString.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    if (editingAttr) {
      updateFieldAttribute(editingAttr.id, {
        label: formData.label,
        mandatory: formData.mandatory,
        defaultValue: formData.defaultValue || undefined,
        helpText: formData.helpText,
        options: parsedOptions
      });
      setEditingAttr(null);
    } else {
      createFieldAttribute({
        label: formData.label,
        name: formData.name || `custom_${formData.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        module: formData.module,
        type: formData.type,
        mandatory: formData.mandatory,
        defaultValue: formData.defaultValue || undefined,
        helpText: formData.helpText,
        options: parsedOptions
      });
      setShowAddModal(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (attrToDelete) {
      deleteFieldAttribute(attrToDelete.id);
      setAttrToDelete(null);
    }
  };

  const customCount = fieldAttributes.filter(a => a.module === selectedModule && !a.isSystem).length;
  const systemCount = fieldAttributes.filter(a => a.module === selectedModule && a.isSystem).length;

  return (
    <div className="space-y-6">
      {/* Module Selector & Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-slate-900">Dynamic Field Attributes Schema</h2>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-100">
              {fieldAttributes.length} Total Field Definitions
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Define custom metadata attributes, validation rules, selection choices, and data types for CRM entities.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-[#0073EA] hover:bg-blue-600 text-white rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Attribute</span>
        </button>
      </div>

      {/* Module Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {modules.map(mod => {
          const isSelected = selectedModule === mod;
          const count = fieldAttributes.filter(a => a.module === mod).length;
          return (
            <button
              key={mod}
              onClick={() => setSelectedModule(mod)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span>{mod}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${selectedModule} attributes...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Data Types</option>
            <option value="text">Text (Single Line)</option>
            <option value="number">Numeric</option>
            <option value="currency">Currency Amount</option>
            <option value="date">Date</option>
            <option value="select">Dropdown Select</option>
            <option value="boolean">Checkbox / Boolean</option>
            <option value="email">Email</option>
            <option value="url">URL Link</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{systemCount}</span> System Core
          <span>•</span>
          <span className="font-semibold text-blue-600">{customCount}</span> Dynamic Custom
        </div>
      </div>

      {/* Attributes Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Field Label &amp; System Key</th>
                <th className="py-3 px-4">Data Type</th>
                <th className="py-3 px-4">Requirement</th>
                <th className="py-3 px-4">Config / Options</th>
                <th className="py-3 px-4">Help Text</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAttributes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No field attributes found</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Add Custom Attribute" to define a new dynamic attribute for {selectedModule}.</p>
                  </td>
                </tr>
              ) : (
                filteredAttributes.map((attr) => {
                  const Icon = typeIcons[attr.type] || Type;

                  return (
                    <tr key={attr.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Label & Key */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">{attr.label}</span>
                            {attr.isSystem ? (
                              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                Core
                              </span>
                            ) : (
                              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-indigo-100">
                                Custom
                              </span>
                            )}
                          </div>
                          <code className="text-[11px] font-mono text-slate-500 bg-slate-50 px-1 py-0.2 rounded mt-0.5 inline-block">
                            {attr.name}
                          </code>
                        </div>
                      </td>

                      {/* Data Type */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                          <Icon className="w-3.5 h-3.5 text-slate-500" />
                          <span className="capitalize">{attr.type}</span>
                        </span>
                      </td>

                      {/* Requirement */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          attr.mandatory
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-50 text-slate-600'
                        }`}>
                          {attr.mandatory ? 'Mandatory *' : 'Optional'}
                        </span>
                      </td>

                      {/* Config / Options */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {attr.options && attr.options.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {attr.options.slice(0, 3).map((opt, i) => (
                              <span key={i} className="bg-slate-100 text-slate-700 text-[10px] font-medium px-1.5 py-0.5 rounded">
                                {opt}
                              </span>
                            ))}
                            {attr.options.length > 3 && (
                              <span className="text-[10px] text-slate-400 font-bold">
                                +{attr.options.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : attr.defaultValue !== undefined ? (
                          <span className="text-slate-500 font-mono text-[11px]">
                            Default: {String(attr.defaultValue)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Help Text */}
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                        {attr.helpText || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(attr)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Field Attribute"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {!attr.isSystem && (
                            <button
                              onClick={() => setAttrToDelete(attr)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Field Attribute"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Attribute Modal */}
      {(showAddModal || editingAttr) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingAttr ? `Edit Field: ${editingAttr.label}` : `Add Custom ${formData.module} Attribute`}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure field properties, validation constraints, and entry guidelines.
                </p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setEditingAttr(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target CRM Module *</label>
                <select
                  value={formData.module}
                  onChange={(e) => setFormData({ ...formData, module: e.target.value as any })}
                  disabled={!!editingAttr}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:bg-slate-100"
                >
                  {modules.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Field Display Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GSTIN / Tax Identification"
                  value={formData.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">System Internal Key</label>
                <input
                  type="text"
                  required
                  disabled={!!editingAttr}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded-xl text-slate-600 focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Stored dynamically on the entity record.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as FieldAttributeType })}
                    disabled={!!editingAttr}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:bg-slate-100"
                  >
                    <option value="text">Text (Single Line)</option>
                    <option value="number">Numeric (Integer / Float)</option>
                    <option value="currency">Currency (INR / USD)</option>
                    <option value="date">Date</option>
                    <option value="select">Dropdown Select List</option>
                    <option value="boolean">Boolean Checkbox (Yes / No)</option>
                    <option value="email">Email Address</option>
                    <option value="url">Website URL</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.mandatory}
                      onChange={(e) => setFormData({ ...formData, mandatory: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                    />
                    <span>Mandatory Required Field</span>
                  </label>
                </div>
              </div>

              {formData.type === 'select' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dropdown Options (Comma separated)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Standard, Premium, Enterprise Elite"
                    value={formData.optionsString}
                    onChange={(e) => setFormData({ ...formData, optionsString: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Value (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Standard Tier"
                  value={formData.defaultValue}
                  onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Help Text / Tooltip</label>
                <input
                  type="text"
                  placeholder="e.g. Specify 15-digit GST identification number"
                  value={formData.helpText}
                  onChange={(e) => setFormData({ ...formData, helpText: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingAttr(null); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0073EA] hover:bg-blue-600 rounded-xl transition-all shadow-xs"
                >
                  {editingAttr ? 'Save Field' : 'Create Attribute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {attrToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Field Attribute?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <span className="font-bold text-slate-800">{attrToDelete.label}</span> from {attrToDelete.module}? Existing records containing this custom field attribute will retain their JSON values.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setAttrToDelete(null)}
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
