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
  const { vendors, accessibleOpportunities, accessibleOrders, allUsers, currentUser, createVendor, updateVendor, canManageVendors, canEditVendor } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const emptyVendor = () => ({ name: '', code: '', website: '', products: '', annualTarget: '0', servicesTarget: '0', mdfAllocated: '0', mdfUtilized: '0', vendorHeadUserId: '', partnerLevel: 'Website-listed principal' as Vendor['partnerLevel'], relationshipManager: '', territory: 'India', agreementStartDate: '', agreementRenewalDate: '', distributorName: '', certifiedEngineersCount: '0', vendorHealth: 'Healthy / High Growth' as Vendor['vendorHealth'] });
  const [newVendor, setNewVendor] = useState(emptyVendor);

  const saveVendor = (event: React.FormEvent) => {
    event.preventDefault();
    if (editingVendorId ? !canEditVendor(editingVendorId) : !canManageVendors) return;
    const name = newVendor.name.trim();
    const code = newVendor.code.trim().toUpperCase();
    if (!name || !code || vendors.some(v => v.id !== editingVendorId && (v.name.toLowerCase() === name.toLowerCase() || v.code.toLowerCase() === code.toLowerCase()))) return;
    const details: Partial<Vendor> = {
      name,
      code,
      partnerPortalUrl: newVendor.website.trim(),
      focusProducts: newVendor.products.split(',').map(p => p.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b)),
      annualRevenueTarget: Number(newVendor.annualTarget),
      quarterlyTarget: Number(newVendor.annualTarget) / 4,
      servicesTarget: Number(newVendor.servicesTarget),
      mdfAllocated: Number(newVendor.mdfAllocated),
      mdfUtilized: Number(newVendor.mdfUtilized),
      vendorHeadUserId: newVendor.vendorHeadUserId,
      vendorHeadUserName: allUsers.find(user => user.id === newVendor.vendorHeadUserId)?.name || '',
      partnerLevel: newVendor.partnerLevel,
      relationshipManager: newVendor.relationshipManager.trim(),
      territory: newVendor.territory.trim(),
      agreementStartDate: newVendor.agreementStartDate,
      agreementRenewalDate: newVendor.agreementRenewalDate,
      distributorName: newVendor.distributorName.trim(),
      certifiedEngineersCount: Number(newVendor.certifiedEngineersCount),
      vendorHealth: newVendor.vendorHealth,
    };
    if (editingVendorId) {
      if (!canManageVendors) {
        delete details.vendorHeadUserId;
        delete details.vendorHeadUserName;
      }
      updateVendor(editingVendorId, details);
    } else {
      createVendor(details);
    }
    setNewVendor(emptyVendor());
    setEditingVendorId(null);
    setShowAddVendor(false);
  };

  const editVendor = (vendor: Vendor) => {
    setNewVendor({ name: vendor.name, code: vendor.code, website: vendor.partnerPortalUrl, products: [...vendor.focusProducts].sort((a, b) => a.localeCompare(b)).join(', '), annualTarget: String(vendor.annualRevenueTarget || 0), servicesTarget: String(vendor.servicesTarget || 0), mdfAllocated: String(vendor.mdfAllocated || 0), mdfUtilized: String(vendor.mdfUtilized || 0), vendorHeadUserId: vendor.vendorHeadUserId, partnerLevel: vendor.partnerLevel, relationshipManager: vendor.relationshipManager, territory: vendor.territory, agreementStartDate: vendor.agreementStartDate, agreementRenewalDate: vendor.agreementRenewalDate, distributorName: vendor.distributorName, certifiedEngineersCount: String(vendor.certifiedEngineersCount || 0), vendorHealth: vendor.vendorHealth });
    setEditingVendorId(vendor.id);
    setShowAddVendor(true);
  };

  const visibleVendors = currentUser.role === 'Vendor Head' ? vendors.filter(v => canEditVendor(v.id)) : vendors;
  const filteredVendors = visibleVendors.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.code.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">OEM / Vendor Alliances Master</h1>
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {visibleVendors.length} Strategic OEMs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Vendor Head governance, annual sales targets, deal registration tracking, and MDF budgets.
          </p>
        </div>
        {canManageVendors && <button onClick={() => { setEditingVendorId(null); setNewVendor(emptyVendor()); setShowAddVendor(true); }} className="px-4 py-2.5 bg-[#0073EA] text-white rounded-xl font-semibold text-xs flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Vendor
        </button>}
      </div>

      {showAddVendor && (canManageVendors || (editingVendorId && canEditVendor(editingVendorId))) && <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
        <form onSubmit={saveVendor} className="bg-white rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-lg font-bold">{editingVendorId ? 'Edit Vendor' : 'Add Vendor'}</h2><button type="button" onClick={() => setShowAddVendor(false)} aria-label="Close"><X className="w-5 h-5" /></button></div>
          <label className="block text-sm">Vendor name *<input required className="w-full border rounded-lg p-2 mt-1" value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} /></label>
          <label className="block text-sm">Code *<input required className="w-full border rounded-lg p-2 mt-1" value={newVendor.code} onChange={e => setNewVendor({ ...newVendor, code: e.target.value })} /></label>
          <label className="block text-sm">Website<input type="url" className="w-full border rounded-lg p-2 mt-1" value={newVendor.website} onChange={e => setNewVendor({ ...newVendor, website: e.target.value })} /></label>
          <label className="block text-sm">Focus products (comma separated)<input className="w-full border rounded-lg p-2 mt-1" value={newVendor.products} onChange={e => setNewVendor({ ...newVendor, products: e.target.value })} /></label>
          <label className="block text-sm">Annual vendor product target (₹)<input type="number" min="0" required className="w-full border rounded-lg p-2 mt-1" value={newVendor.annualTarget} onChange={e => setNewVendor({ ...newVendor, annualTarget: e.target.value })} /></label>
          <div className="text-sm">Quarterly target (annual ÷ 4): <strong>₹{(Number(newVendor.annualTarget) / 4).toLocaleString('en-IN')}</strong></div>
          <label className="block text-sm">Services target (₹; zero allowed)<input type="number" min="0" required className="w-full border rounded-lg p-2 mt-1" value={newVendor.servicesTarget} onChange={e => setNewVendor({ ...newVendor, servicesTarget: e.target.value })} /></label>
          {canManageVendors && <><label className="block text-sm">Vendor head<select className="w-full border rounded-lg p-2 mt-1" value={newVendor.vendorHeadUserId} onChange={e => setNewVendor({ ...newVendor, vendorHeadUserId: e.target.value })}><option value="">Unassigned</option>{allUsers.map(user => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}</select></label>
          <p className="text-xs text-slate-500">Showing all {allUsers.length} CRM staff in alphabetical order. If someone is missing, add their staff record in User Management first.</p></>}
          <div className="grid grid-cols-2 gap-3">{([['mdfAllocated','MDF allocated (₹)'],['mdfUtilized','MDF utilized (₹)'],['certifiedEngineersCount','Certified engineers']] as const).map(([key,label]) => <label key={key} className="block text-sm">{label}<input type="number" min="0" value={newVendor[key]} onChange={e => setNewVendor({ ...newVendor, [key]: e.target.value })} className="w-full border rounded-lg p-2 mt-1" /></label>)}</div>
          <label className="block text-sm">Partner level<select value={newVendor.partnerLevel} onChange={e => setNewVendor({ ...newVendor, partnerLevel: e.target.value as Vendor['partnerLevel'] })} className="w-full border rounded-lg p-2 mt-1">{['Platinum / Elite Partner','Gold Partner','Silver Partner','Registered Solution Provider','Website-listed principal'].map(level => <option key={level}>{level}</option>)}</select></label>
          <label className="block text-sm">Vendor health<select value={newVendor.vendorHealth} onChange={e => setNewVendor({ ...newVendor, vendorHealth: e.target.value as Vendor['vendorHealth'] })} className="w-full border rounded-lg p-2 mt-1">{['Healthy / High Growth','Stable','Needs Review'].map(health => <option key={health}>{health}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3">{([['relationshipManager','Relationship manager'],['territory','Territory'],['distributorName','Distributor'],['agreementStartDate','Agreement start'],['agreementRenewalDate','Agreement renewal']] as const).map(([key,label]) => <label key={key} className="block text-sm">{label}<input type={key.includes('Date') ? 'date' : 'text'} value={newVendor[key]} onChange={e => setNewVendor({ ...newVendor, [key]: e.target.value })} className="w-full border rounded-lg p-2 mt-1" /></label>)}</div>
          <button type="submit" className="px-4 py-2 bg-[#0073EA] text-white rounded-lg">Save Vendor</button>
        </form>
      </div>}

      {/* Vendors Grid */}
      <div className="bg-white rounded-xl border border-amber-200 p-4 text-sm space-y-1">
        <div><strong>Unassigned vendors:</strong> {visibleVendors.filter(v => !allUsers.some(u => u.id === v.vendorHeadUserId)).map(v => v.name).sort((a, b) => a.localeCompare(b)).join(', ') || 'None'}</div>
        <div><strong>Unassigned product targets:</strong> {visibleVendors.filter(v => !(v.annualRevenueTarget > 0)).map(v => v.name).sort((a, b) => a.localeCompare(b)).join(', ') || 'None'}</div>
      </div>
      <div className="flex justify-end gap-2 text-sm"><button onClick={() => setViewMode('table')} className={`rounded-lg px-4 py-2 ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'bg-white'}`}>Table</button><button onClick={() => setViewMode('cards')} className={`rounded-lg px-4 py-2 ${viewMode === 'cards' ? 'bg-slate-900 text-white' : 'bg-white'}`}>Cards</button></div>
      {viewMode === 'table' && <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{['OEM / vendor','Vendor head','Other assigned heads','Product target','Services target','MDF allocated','MDF utilized','Actions'].map(header => <th key={header} className="p-3">{header}</th>)}</tr></thead><tbody>{filteredVendors.map(vendor => <tr key={vendor.id} className="border-t"><td className="p-3 font-semibold">{vendor.name}</td><td className="p-3">{allUsers.find(user => user.id === vendor.vendorHeadUserId)?.name || 'Unassigned'}</td><td className="p-3">{(vendor.secondaryVendorHeadIds || []).map(id => allUsers.find(user => user.id === id)?.name).filter(Boolean).join(', ') || '—'}</td><td className="p-3">₹{vendor.annualRevenueTarget.toLocaleString('en-IN')}</td><td className="p-3">₹{(vendor.servicesTarget || 0).toLocaleString('en-IN')}</td><td className="p-3">₹{vendor.mdfAllocated.toLocaleString('en-IN')}</td><td className="p-3">₹{vendor.mdfUtilized.toLocaleString('en-IN')}</td><td className="p-3">{canEditVendor(vendor.id) && <button onClick={() => editVendor(vendor)} className="font-semibold text-indigo-700">Edit</button>}</td></tr>)}</tbody></table></div>}
      {viewMode === 'cards' &&
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
                  {canEditVendor(vendor.id) ? <button onClick={() => editVendor(vendor)} className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded" title={`Edit ${vendor.name}`}>{vendor.code}</button> : <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{vendor.code}</span>}
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
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Quarterly: ₹{((vendor.annualRevenueTarget || 0) / 4 / 100000).toFixed(1)}L</span>
                    <span>Services: ₹{((vendor.servicesTarget || 0) / 100000).toFixed(1)}L</span>
                  </div>
                </div>

                {/* Focus Products */}
                <div className="mt-4 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Focus Product Catalog
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[...vendor.focusProducts].sort((a, b) => a.localeCompare(b)).map((prod, idx) => (
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
      }
    </div>
  );
};
