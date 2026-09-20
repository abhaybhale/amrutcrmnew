import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Vendor } from '../../types';
import {
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  Building2,
  Sparkles,
  Layers,
  DollarSign,
  ShieldCheck,
  ExternalLink,
  Target,
  X
} from 'lucide-react';

export const VendorsView: React.FC = () => {
  const { vendors, accessibleOpportunities, accessibleOrders, allUsers, createVendor, updateVendor, canManageVendors } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [newVendor, setNewVendor] = useState({ name: '', code: '', website: '', products: '' });

  const saveVendor = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageVendors) return;
    const name = newVendor.name.trim();
    const code = newVendor.code.trim().toUpperCase();
    if (!name || !code || vendors.some(v => v.id !== editingVendorId && (v.name.toLowerCase() === name.toLowerCase() || v.code.toLowerCase() === code.toLowerCase()))) return;
    const details: Partial<Vendor> = {
      name,
      code,
      partnerPortalUrl: newVendor.website.trim(),
      focusProducts: newVendor.products.split(',').map(p => p.trim()).filter(Boolean),
    };
    if (editingVendorId) {
      updateVendor(editingVendorId, details);
    } else {
      createVendor({ ...details, vendorHeadUserId: '', vendorHeadUserName: '', annualRevenueTarget: 0, quarterlyTarget: 0, mdfAllocated: 0, certifiedEngineersCount: 0 });
    }
    setNewVendor({ name: '', code: '', website: '', products: '' });
    setEditingVendorId(null);
    setShowAddVendor(false);
  };

  const editVendor = (vendor: Vendor) => {
    setNewVendor({ name: vendor.name, code: vendor.code, website: vendor.partnerPortalUrl, products: vendor.focusProducts.join(', ') });
    setEditingVendorId(vendor.id);
    setShowAddVendor(true);
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">OEM / Vendor Alliances Master</h1>
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {vendors.length} Strategic OEMs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Vendor Head governance, annual sales targets, deal registration tracking, and MDF budgets.
          </p>
        </div>
        {canManageVendors && <button onClick={() => { setEditingVendorId(null); setNewVendor({ name: '', code: '', website: '', products: '' }); setShowAddVendor(true); }} className="px-4 py-2.5 bg-[#0073EA] text-white rounded-xl font-semibold text-xs flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>}
      </div>

      {showAddVendor && canManageVendors && <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
        <form onSubmit={saveVendor} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-lg font-bold">{editingVendorId ? 'Edit Vendor' : 'Add Vendor'}</h2><button type="button" onClick={() => setShowAddVendor(false)} aria-label="Close"><X className="w-5 h-5" /></button></div>
          <label className="block text-sm">Vendor name *<input required className="w-full border rounded-lg p-2 mt-1" value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} /></label>
          <label className="block text-sm">Code *<input required className="w-full border rounded-lg p-2 mt-1" value={newVendor.code} onChange={e => setNewVendor({ ...newVendor, code: e.target.value })} /></label>
          <label className="block text-sm">Website<input type="url" className="w-full border rounded-lg p-2 mt-1" value={newVendor.website} onChange={e => setNewVendor({ ...newVendor, website: e.target.value })} /></label>
          <label className="block text-sm">Focus products (comma separated)<input className="w-full border rounded-lg p-2 mt-1" value={newVendor.products} onChange={e => setNewVendor({ ...newVendor, products: e.target.value })} /></label>
          <button type="submit" className="px-4 py-2 bg-[#0073EA] text-white rounded-lg">Save Vendor</button>
        </form>
      </div>}

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVendors.map((vendor) => {
          const vendorOpps = accessibleOpportunities.filter(o => o.vendorId === vendor.id);
          const vendorOrders = accessibleOrders.filter(o => o.accountName.includes(vendor.name) || vendorOpps.some(op => op.accountId === o.accountId));
          const totalAchieved = vendor.annualRevenueTarget ? accessibleOrders.filter(o => o.vendorId === vendor.id).reduce((sum, o) => sum + (o.totalAmount || 0), 0) : 0;
          const targetPct = vendor.annualRevenueTarget > 0 ? (totalAchieved / vendor.annualRevenueTarget) * 100 : 0;
          const assignedHead = allUsers.find(u => u.id === vendor.vendorHeadUserId);

          return (
            <div
              key={vendor.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between space-y-5"
            >
              <div>
                <div className="flex items-center justify-between">
                  {canManageVendors ? <button onClick={() => editVendor(vendor)} className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded" title={`Edit ${vendor.name}`}>{vendor.code}</button> : <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{vendor.code}</span>}
                  <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-100">
                    {vendor.partnerLevel}
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 mt-2">{vendor.name}</h3>

                {/* Vendor Head Card */}
                <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center space-x-2.5 text-xs text-amber-950">
                  <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] text-amber-700 block uppercase font-bold">Assigned Vendor Head</span>
                    <span className="font-bold truncate">{assignedHead ? assignedHead.name : 'Unassigned'}</span>
                  </div>
                </div>

                {/* Annual Target vs Achievement Progress */}
                <div className="mt-4 space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-500">Annual Target Achievement:</span>
                    <span className="font-bold text-indigo-700">{targetPct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(targetPct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>Achieved: ₹{(totalAchieved / 100000).toFixed(1)}L</span>
                    <span>Target: ₹{(vendor.annualRevenueTarget / 100000).toFixed(1)}L</span>
                  </div>
                </div>

                {/* Focus Products */}
                <div className="mt-4 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Focus Product Catalog
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {vendor.focusProducts.map((prod, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-0.5 rounded-md">
                        {prod}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* MDF Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>MDF Budget: <strong>₹{(vendor.mdfAllocated / 100000).toFixed(1)}L</strong></span>
                <span>Active Deals: <strong className="text-indigo-600">{vendorOpps.length}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
