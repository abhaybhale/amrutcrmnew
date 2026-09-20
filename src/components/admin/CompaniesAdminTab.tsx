import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { CompanyTenant } from '../../types';
import {
  Building2,
  Plus,
  Edit,
  X,
  Percent,
  FileText,
  Globe,
  Check,
  Lock
} from 'lucide-react';

const emptyForm = {
  code: '',
  name: '',
  legalEntity: '',
  domain: '',
  currency: 'INR',
  currencySymbol: '₹',
  country: 'India',
  city: '',
  taxRegistrationNumber: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
  themeColor: '#F25C05',
  industry: 'Software Products & IT Consulting',
  annualSalesTarget: 50000000,
  annualServicesTarget: 20000000,
  gstPercent: 18,
  renewalPriceIncreasePercent: 10,
  termsAndConditions: ''
};

export const CompaniesAdminTab: React.FC = () => {
  const { currentUser, companies, createCompany, updateCompany } = useCRM();

  const isAdminOrMD = currentUser.role === 'CRM Administrator' || currentUser.role === 'Managing Director';
  const isSalesHead = currentUser.role === 'Sales Head';

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyTenant | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });

  const handleOpenAdd = () => {
    setFormData({ ...emptyForm });
    setShowAddModal(true);
  };

  const handleOpenEdit = (company: CompanyTenant) => {
    setEditingCompany(company);
    setFormData({
      code: company.code,
      name: company.name,
      legalEntity: company.legalEntity,
      domain: company.domain,
      currency: company.currency,
      currencySymbol: company.currencySymbol,
      country: company.country,
      city: company.city,
      taxRegistrationNumber: company.taxRegistrationNumber,
      primaryContactEmail: company.primaryContactEmail,
      primaryContactPhone: company.primaryContactPhone,
      themeColor: company.themeColor,
      industry: company.industry,
      annualSalesTarget: company.annualSalesTarget,
      annualServicesTarget: company.annualServicesTarget,
      gstPercent: company.gstPercent,
      renewalPriceIncreasePercent: company.renewalPriceIncreasePercent,
      termsAndConditions: company.termsAndConditions
    });
  };

  const handleClose = () => {
    setShowAddModal(false);
    setEditingCompany(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCompany) {
      if (isAdminOrMD) {
        updateCompany(editingCompany.id, {
          code: formData.code,
          name: formData.name,
          legalEntity: formData.legalEntity,
          domain: formData.domain,
          currency: formData.currency,
          currencySymbol: formData.currencySymbol,
          country: formData.country,
          city: formData.city,
          taxRegistrationNumber: formData.taxRegistrationNumber,
          primaryContactEmail: formData.primaryContactEmail,
          primaryContactPhone: formData.primaryContactPhone,
          themeColor: formData.themeColor,
          industry: formData.industry,
          annualSalesTarget: Number(formData.annualSalesTarget),
          annualServicesTarget: Number(formData.annualServicesTarget),
          gstPercent: Number(formData.gstPercent),
          renewalPriceIncreasePercent: Number(formData.renewalPriceIncreasePercent),
          termsAndConditions: formData.termsAndConditions
        });
      } else if (isSalesHead) {
        // updateCompany() itself strips this down to just the T&C fields
        // for Sales Head — sending the full form is harmless.
        updateCompany(editingCompany.id, { termsAndConditions: formData.termsAndConditions });
      }
    } else if (isAdminOrMD) {
      createCompany({
        code: formData.code,
        name: formData.name,
        legalEntity: formData.legalEntity,
        domain: formData.domain,
        currency: formData.currency,
        currencySymbol: formData.currencySymbol,
        country: formData.country,
        city: formData.city,
        taxRegistrationNumber: formData.taxRegistrationNumber,
        primaryContactEmail: formData.primaryContactEmail,
        primaryContactPhone: formData.primaryContactPhone,
        themeColor: formData.themeColor,
        industry: formData.industry,
        annualSalesTarget: Number(formData.annualSalesTarget),
        annualServicesTarget: Number(formData.annualServicesTarget),
        gstPercent: Number(formData.gstPercent),
        renewalPriceIncreasePercent: Number(formData.renewalPriceIncreasePercent),
        termsAndConditions: formData.termsAndConditions
      });
    }

    handleClose();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-slate-900">Company Entities &amp; Tax Configuration</h2>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-100">
              {companies.length} Companies
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage legal entities, quote letterhead details, GST/VAT %, renewal uplift %, and Terms &amp; Conditions per company.
          </p>
          {isSalesHead && !isAdminOrMD && (
            <p className="text-[11px] text-amber-600 mt-1 flex items-center space-x-1">
              <Lock className="w-3 h-3" />
              <span>Sales Head access: you may edit Terms &amp; Conditions only. Other fields are read-only.</span>
            </p>
          )}
        </div>

        {isAdminOrMD && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-[#0073EA] hover:bg-blue-600 text-white rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Company Entity</span>
          </button>
        )}
      </div>

      {/* Grid of Companies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {companies.map((company) => (
          <div
            key={company.id}
            className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm"
                    style={{ backgroundColor: company.themeColor }}
                  >
                    {company.code}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{company.name}</p>
                    <p className="text-[11px] text-slate-500 flex items-center space-x-1">
                      <Globe className="w-3 h-3" />
                      <span>{company.country} · {company.currency}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenEdit(company)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  title={isAdminOrMD ? 'Edit Company' : 'Edit Terms & Conditions'}
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Tax Rate (GST/VAT)</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center space-x-1 mt-0.5">
                    <Percent className="w-3.5 h-3.5 text-slate-500" />
                    <span>{company.gstPercent}%</span>
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Renewal Uplift %</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center space-x-1 mt-0.5">
                    <Percent className="w-3.5 h-3.5 text-slate-500" />
                    <span>{company.renewalPriceIncreasePercent}%</span>
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>Terms &amp; Conditions</span>
                </p>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-3">
                  {company.termsAndConditions}
                </p>
                {company.termsAndConditionsLastUpdatedBy && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Last updated by {company.termsAndConditionsLastUpdatedBy}
                    {company.termsAndConditionsLastUpdatedDate ? ` on ${new Date(company.termsAndConditionsLastUpdatedDate).toLocaleDateString()}` : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>{company.legalEntity}</span>
              <span>{company.isActive ? '🟢 Active' : '⚪ Inactive'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {(showAddModal || editingCompany) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingCompany ? `Edit: ${editingCompany.name}` : 'Add Company Entity'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAdminOrMD
                    ? 'Full company profile, quote letterhead, tax %, and renewal uplift % configuration.'
                    : 'You can update the Terms & Conditions block used on this company\'s quote template.'}
                </p>
              </div>
              <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {isAdminOrMD && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Company Code *</label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Display Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Legal Entity Name (for Quote Letterhead) *</label>
                    <input
                      type="text"
                      required
                      value={formData.legalEntity}
                      onChange={(e) => setFormData({ ...formData, legalEntity: e.target.value })}
                      placeholder="e.g. AMRUT SOFTWARE PVT LTD"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Currency</label>
                      <input
                        type="text"
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tax Reg. Number (GSTIN/VAT)</label>
                      <input
                        type="text"
                        value={formData.taxRegistrationNumber}
                        onChange={(e) => setFormData({ ...formData, taxRegistrationNumber: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tax Rate (GST / VAT %) — applied to Quotes &amp; Invoices
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.gstPercent}
                        onChange={(e) => setFormData({ ...formData, gstPercent: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Renewal Price Increase %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.renewalPriceIncreasePercent}
                        onChange={(e) => setFormData({ ...formData, renewalPriceIncreasePercent: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                  </div>
                </>
              )}

              {!isAdminOrMD && editingCompany && (
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                  <p><span className="font-bold">{editingCompany.legalEntity}</span> · {editingCompany.country} · {editingCompany.currency} · GST/VAT {editingCompany.gstPercent}%</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Terms &amp; Conditions (appended to Quote PDF)</span>
                </label>
                <textarea
                  rows={6}
                  value={formData.termsAndConditions}
                  onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                  placeholder="Enter the standard Terms & Conditions text shown on this company's quotations..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0073EA] hover:bg-blue-600 rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingCompany ? 'Save Changes' : 'Create Company'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
