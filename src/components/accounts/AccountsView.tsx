import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Account, AccountTier } from '../../types';
import { TierBadge, StatusBadge } from '../common/StatusBadge';
import { BulkImportModal } from '../common/BulkImportModal';
import {
  Building2,
  Users,
  Briefcase,
  ShoppingBag,
  Layers,
  Plus,
  Search,
  MapPin,
  Globe,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  X,
  Phone,
  Mail,
  Calendar,
  UploadCloud,
  FileSpreadsheet,
  Sparkles
} from 'lucide-react';

export const AccountsView: React.FC = () => {
  const {
    accessibleAccounts,
    contacts,
    accessibleOpportunities,
    accessibleOrders,
    allUsers,
    createAccount,
    updateAccount
  } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState('ALL');
  const [inspectingAccount, setInspectingAccount] = useState<Account | null>(null);
  const [activeAccountTab, setActiveAccountTab] = useState<'overview' | 'contacts' | 'deals' | 'orders' | 'products'>('overview');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [createData, setCreateData] = useState({
    name: '',
    industry: 'Banking & Financial Services',
    tier: 'Growth' as AccountTier,
    city: 'Mumbai',
    country: 'India',
    website: 'https://',
    annualRevenue: 5000000,
    relationshipHealth: 'Good' as Account['relationshipHealth'],
    installedProducts: ['Atlassian Jira Software Data Center', 'SonarQube Enterprise']
  });

  const filteredAccounts = accessibleAccounts.filter(acc => {
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch =
      !q ||
      (acc.name || '').toLowerCase().includes(q) ||
      (acc.city || '').toLowerCase().includes(q) ||
      (acc.industry || '').toLowerCase().includes(q);
    const matchesTier = selectedTierFilter === 'ALL' || acc.tier === selectedTierFilter;
    return matchesSearch && matchesTier;
  });

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    createAccount({
      name: createData.name,
      industry: createData.industry,
      tier: createData.tier,
      city: createData.city,
      country: createData.country,
      website: createData.website,
      annualRevenue: Number(createData.annualRevenue),
      relationshipHealth: createData.relationshipHealth,
      installedProducts: createData.installedProducts
    });
    setShowCreateModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Accounts &amp; Clients 360</h1>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredAccounts.length} Enterprise Clients
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Account master, enterprise tiering, installed OEM licenses, ongoing deals and historical billing.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
          >
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <span>Bulk Import XLS / CSV</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Account</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, industry, city..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-400 text-[11px]">Tier:</span>
            <select
              value={selectedTierFilter}
              onChange={(e) => setSelectedTierFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Tiers</option>
              <option value="Strategic">Strategic</option>
              <option value="Growth">Growth</option>
              <option value="Maintain">Maintain</option>
              <option value="General">General</option>
              <option value="Dormant">Dormant</option>
            </select>
          </div>
        </div>

        {(selectedTierFilter !== 'ALL' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedTierFilter('ALL');
              setSearchQuery('');
            }}
            className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Grid of Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAccounts.map((acc) => {
          const accContacts = contacts.filter(c => c.accountId === acc.id);
          const accOpps = accessibleOpportunities.filter(o => o.accountId === acc.id);
          const accOrders = accessibleOrders.filter(o => o.accountId === acc.id);
          const totalSpent = accOrders.reduce((sum, ord) => sum + (ord.grandTotal || ord.totalAmount || 0), 0);

          return (
            <button
              type="button"
              key={acc.id}
              onClick={() => {
                setInspectingAccount(acc);
                setActiveAccountTab('overview');
              }}
              className="w-full text-left bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-400">{(acc as any).accountNumber || acc.id}</span>
                  <TierBadge tier={acc.tier} />
                </div>

                <h3 className="font-bold text-slate-900 text-base mt-2 group-hover:text-indigo-600 transition-colors">
                  {acc.name}
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">{acc.industry} • {acc.city}</p>

                {/* Installed OEM Tags */}
                {acc.installedProducts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {acc.installedProducts.slice(0, 2).map((p, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-medium">
                        {p}
                      </span>
                    ))}
                    {acc.installedProducts.length > 2 && (
                      <span className="text-[10px] text-slate-400 font-bold px-1 py-0.5">
                        +{acc.installedProducts.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Stats Footer */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-3 text-center text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Revenue</span>
                  <span className="font-bold text-slate-900">₹{(totalSpent / 100000).toFixed(1)}L</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Active Deals</span>
                  <span className="font-bold text-indigo-600">{accOpps.length}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Contacts</span>
                  <span className="font-bold text-slate-700">{accContacts.length}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 360-DEGREE ACCOUNT INSPECTION DRAWER */}
      {inspectingAccount && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                    {(inspectingAccount as any).accountNumber || inspectingAccount.id}
                  </span>
                  <TierBadge tier={inspectingAccount.tier} />
                </div>
                <button
                  onClick={() => setInspectingAccount(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-3">
                <h2 className="text-xl font-bold text-slate-900">{inspectingAccount.name}</h2>
                <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                  <span>{inspectingAccount.industry}</span>
                  <span>•</span>
                  <span>{inspectingAccount.city}, {inspectingAccount.country}</span>
                  <span>•</span>
                  <span className="font-bold text-emerald-600">Health: {inspectingAccount.relationshipHealth || 'Not assessed'}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 border-b border-slate-200 flex space-x-6 text-xs font-semibold text-slate-500">
              <button
                onClick={() => setActiveAccountTab('overview')}
                className={`py-3 border-b-2 transition-colors ${
                  activeAccountTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
                }`}
              >
                Account Overview
              </button>
              <button
                onClick={() => setActiveAccountTab('contacts')}
                className={`py-3 border-b-2 transition-colors ${
                  activeAccountTab === 'contacts' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
                }`}
              >
                Contacts ({contacts.filter(c => c.accountId === inspectingAccount.id).length})
              </button>
              <button
                onClick={() => setActiveAccountTab('deals')}
                className={`py-3 border-b-2 transition-colors ${
                  activeAccountTab === 'deals' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
                }`}
              >
                Opportunities ({accessibleOpportunities.filter(o => o.accountId === inspectingAccount.id).length})
              </button>
              <button
                onClick={() => setActiveAccountTab('orders')}
                className={`py-3 border-b-2 transition-colors ${
                  activeAccountTab === 'orders' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
                }`}
              >
                Orders &amp; Billing
              </button>
              <button
                onClick={() => setActiveAccountTab('products')}
                className={`py-3 border-b-2 transition-colors ${
                  activeAccountTab === 'products' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-800'
                }`}
              >
                Installed OEM Stack
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {activeAccountTab === 'overview' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm">Account Metadata</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Assigned Account Owner</span>
                        <span className="font-semibold text-slate-900">{allUsers.find(user => user.id === inspectingAccount.ownerId)?.name || 'Unassigned'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Annual Turnover</span>
                        <span className="font-semibold text-slate-900">₹{((inspectingAccount.annualRevenue || 0) / 100000).toFixed(1)} Lakhs</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Official Website</span>
                        <a href={inspectingAccount.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                          {inspectingAccount.website || 'N/A'}
                        </a>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Primary Currency</span>
                        <span className="font-semibold text-slate-900">INR (₹)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeAccountTab === 'contacts' && (
                <div className="space-y-3">
                  {contacts.filter(c => c.accountId === inspectingAccount.id).map(cnt => (
                    <div key={cnt.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{cnt.name}</span>
                          <span className="text-slate-500 text-xs block">{cnt.designation}</span>
                        </div>
                        <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded border border-indigo-100">
                          {cnt.roleInBuying}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-slate-600 pt-1">
                        <span className="flex items-center space-x-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cnt.email}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cnt.phone}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeAccountTab === 'deals' && (
                <div className="space-y-3">
                  {accessibleOpportunities.filter(o => o.accountId === inspectingAccount.id).map(opp => (
                    <div key={opp.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{opp.title}</span>
                        <span className="text-slate-500 text-xs block mt-0.5">{opp.vendorName} • {opp.pipeline}</span>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={opp.stage} size="sm" />
                        <span className="font-black text-slate-900 text-xs block mt-1">₹{(opp.totalValue / 100000).toFixed(1)}L</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeAccountTab === 'orders' && (
                <div className="space-y-3">
                  {accessibleOrders.filter(o => o.accountId === inspectingAccount.id).map(ord => (
                    <div key={ord.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {ord.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                        <span>PO: {ord.customerPoNumber}</span>
                        <span className="font-bold text-slate-900">₹{((ord.grandTotal || ord.totalAmount || 0) / 100000).toFixed(2)} Lakhs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeAccountTab === 'products' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-sm">Installed Software &amp; Cloud Licenses</h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {inspectingAccount.installedProducts.map((prod, idx) => (
                      <div key={idx} className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between">
                        <span className="font-bold text-indigo-950">{prod}</span>
                        <span className="text-xs text-indigo-700 font-semibold bg-white px-2.5 py-1 rounded-md border border-indigo-200">
                          Active License
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setInspectingAccount(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ACCOUNT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add New Enterprise Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company / Organization Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  placeholder="e.g. Larsen & Toubro Infotech Ltd"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Industry Sector</label>
                  <select
                    value={createData.industry}
                    onChange={(e) => setCreateData({ ...createData, industry: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none"
                  >
                    <option value="Banking & Financial Services">Banking &amp; Financial Services</option>
                    <option value="Information Technology & SaaS">Information Technology &amp; SaaS</option>
                    <option value="Manufacturing & Auto">Manufacturing &amp; Auto</option>
                    <option value="Healthcare & Pharma">Healthcare &amp; Pharma</option>
                    <option value="Government & PSU">Government &amp; PSU</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Account Tier</label>
                  <select
                    value={createData.tier}
                    onChange={(e) => setCreateData({ ...createData, tier: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none"
                  >
                    <option value="Strategic">Strategic</option>
                    <option value="Growth">Growth</option>
                    <option value="Maintain">Maintain</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Headquarter City</label>
                  <input
                    type="text"
                    value={createData.city}
                    onChange={(e) => setCreateData({ ...createData, city: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Annual Revenue (₹)</label>
                  <input
                    type="number"
                    value={createData.annualRevenue}
                    onChange={(e) => setCreateData({ ...createData, annualRevenue: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        initialModule="Accounts"
      />
    </div>
  );
};
