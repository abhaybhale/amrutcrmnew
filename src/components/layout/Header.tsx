import React, { useState, useRef, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  Search,
  Plus,
  Bell,
  UserCheck,
  Plane,
  Sparkles,
  ChevronDown,
  Building2,
  Briefcase,
  Target,
  Users,
  ShoppingBag,
  ExternalLink,
  Shield,
  Layers,
  LogOut,
  Key,
  Lock,
  X
} from 'lucide-react';
import { NavigationTab } from './Sidebar';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

interface HeaderProps {
  onOpenQuickCreate?: (type: 'lead' | 'opportunity' | 'account' | 'quote' | 'presales') => void;
  setActiveTab?: (tab: NavigationTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenQuickCreate, setActiveTab }) => {
  const {
    currentUser,
    allUsers,
    accounts,
    leads,
    opportunities,
    contacts,
    orders,
    vendors,
    companies,
    currentCompany,
    currentCompanyId,
    switchCompany,
    googleAccount,
    toggleUserOutOfOffice,
    logout,
    toasts,
    removeToast,
    showToast
  } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showQuickCreateMenu, setShowQuickCreateMenu] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const companyMenuRef = useRef<HTMLDivElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
      if (companyMenuRef.current && !companyMenuRef.current.contains(e.target as Node)) {
        setShowCompanyMenu(false);
      }
      if (quickCreateRef.current && !quickCreateRef.current.contains(e.target as Node)) {
        setShowQuickCreateMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global search filtering
  const searchResults = React.useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return null;
    const q = searchQuery.toLowerCase();

    const matchedLeads = leads.filter(
      l => l.companyName.toLowerCase().includes(q) || l.product.toLowerCase().includes(q) || l.leadNumber.toLowerCase().includes(q)
    );
    const matchedOpps = opportunities.filter(
      o => o.title.toLowerCase().includes(q) || o.accountName.toLowerCase().includes(q) || o.oppNumber.toLowerCase().includes(q)
    );
    const matchedAccounts = accounts.filter(
      a => a.name.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)
    );
    const matchedContacts = contacts.filter(
      c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.accountName.toLowerCase().includes(q)
    );
    const matchedVendors = vendors.filter(
      v => v.name.toLowerCase().includes(q) || v.code.toLowerCase().includes(q)
    );

    return {
      leads: matchedLeads,
      opportunities: matchedOpps,
      accounts: matchedAccounts,
      contacts: matchedContacts,
      vendors: matchedVendors
    };
  }, [searchQuery, leads, opportunities, accounts, contacts, vendors]);

  const handleQuickCreate = (type: 'lead' | 'opportunity' | 'account' | 'quote' | 'presales') => {
    setShowQuickCreateMenu(false);
    if (onOpenQuickCreate) {
      onOpenQuickCreate(type);
    } else if (setActiveTab) {
      if (type === 'lead') setActiveTab('leads');
      if (type === 'opportunity') setActiveTab('opportunities');
      if (type === 'account') setActiveTab('accounts');
      if (type === 'quote') setActiveTab('quotes');
      if (type === 'presales') setActiveTab('presales');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between z-20 shadow-xs select-none">
      {/* Global Search Bar */}
      <div className="relative w-80 lg:w-96">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearchModal(true)}
            placeholder="Search leads, accounts, deals, contacts..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 hover:bg-gray-100/70 focus:bg-white text-gray-800 placeholder-gray-400 rounded-full text-xs border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Global Search Results Dropdown */}
        {showSearchModal && searchResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 max-h-[460px] overflow-y-auto">
            <div className="p-2 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500 px-3">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Search Results</span>
              <button onClick={() => setShowSearchModal(false)} className="text-gray-400 hover:text-gray-600">Close</button>
            </div>

            {/* Opportunities */}
            {searchResults.opportunities.length > 0 && (
              <div className="p-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">Opportunities</span>
                {searchResults.opportunities.map(o => (
                  <div
                    key={o.id}
                    onClick={() => {
                      if (setActiveTab) setActiveTab('opportunities');
                      setShowSearchModal(false);
                    }}
                    className="p-2 hover:bg-blue-50 rounded-md cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-medium text-gray-800">{o.title}</span>
                    </div>
                    <span className="text-gray-500 font-semibold">₹{(o.totalValue / 100000).toFixed(1)}L</span>
                  </div>
                ))}
              </div>
            )}

            {/* Leads */}
            {searchResults.leads.length > 0 && (
              <div className="p-2 border-t border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">Leads</span>
                {searchResults.leads.map(l => (
                  <div
                    key={l.id}
                    onClick={() => {
                      if (setActiveTab) setActiveTab('leads');
                      setShowSearchModal(false);
                    }}
                    className="p-2 hover:bg-blue-50 rounded-md cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <Target className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-medium text-gray-800">{l.companyName} ({l.product})</span>
                    </div>
                    <span className="text-gray-500 font-semibold">{l.leadNumber}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Accounts */}
            {searchResults.accounts.length > 0 && (
              <div className="p-2 border-t border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">Accounts</span>
                {searchResults.accounts.map(a => (
                  <div
                    key={a.id}
                    onClick={() => {
                      if (setActiveTab) setActiveTab('accounts');
                      setShowSearchModal(false);
                    }}
                    className="p-2 hover:bg-blue-50 rounded-md cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-3.5 h-3.5 text-purple-600" />
                      <span className="font-medium text-gray-800">{a.name}</span>
                    </div>
                    <span className="text-gray-400">{a.city}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls & Impersonator */}
      <div className="flex items-center space-x-3">
        {/* Multi-Company Tenant Switcher */}
        <div className="relative" ref={companyMenuRef}>
          <button
            onClick={() => setShowCompanyMenu(!showCompanyMenu)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all border border-slate-700 shadow-xs text-xs font-semibold"
            title="Switch Active Operating Company / Tenant"
          >
            <Building2 className="w-3.5 h-3.5 text-orange-400" />
            <div className="flex items-center gap-1.5">
              <span>{currentCompany.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30">
                {currentCompany.code}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showCompanyMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-2 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Multi-Company Profiles
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Select tenant to isolate leads, targets, pipeline &amp; quotes.
                </p>
              </div>

              <div className="py-1">
                {companies.map((comp) => {
                  const isSelected = comp.id === currentCompanyId;
                  return (
                    <button
                      key={comp.id}
                      onClick={() => {
                        switchCompany(comp.id);
                        setShowCompanyMenu(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-orange-50 text-orange-950 font-semibold' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {comp.code}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-xs truncate">{comp.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{comp.city}, {comp.country} • {comp.currency}</p>
                        </div>
                      </div>
                      {isSelected && <span className="text-orange-600 font-bold text-xs">Active</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Google Workspace Quick Status Sync Badge */}
        <button
          onClick={() => setActiveTab && setActiveTab('workspace' as NavigationTab)}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold hover:bg-sky-100 transition-colors"
          title={`Google Sync Connected: ${googleAccount.googleEmail}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-medium">Google Sync</span>
        </button>

        {/* Cloud Firestore Status Pill */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold"
          title="Cloud Firestore Database Connected (Project: gen-lang-client-0722379473)"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="text-[11px] font-medium">Firestore Cloud DB</span>
        </div>

        {/* Out of Office Quick Toggle for current user */}
        <button
          onClick={() => toggleUserOutOfOffice(currentUser.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
            currentUser.isOutOfOffice
              ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-xs'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
          title="Toggle Out of Office. If OOO is active, inbound leads automatically route to your assigned backup salesperson!"
        >
          <Plane className={`w-3.5 h-3.5 ${currentUser.isOutOfOffice ? 'text-amber-600' : 'text-gray-400'}`} />
          <span>{currentUser.isOutOfOffice ? 'OOO Active' : 'In Office'}</span>
        </button>

        {/* Quick + New Action Menu */}
        <div className="relative" ref={quickCreateRef}>
          <button
            onClick={() => setShowQuickCreateMenu(!showQuickCreateMenu)}
            className="px-3.5 py-1.5 bg-[#0073EA] hover:bg-blue-600 text-white rounded-md text-xs font-medium shadow-xs flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Record</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {showQuickCreateMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 text-xs">
              <button
                onClick={() => handleQuickCreate('lead')}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-gray-700 flex items-center space-x-2 font-medium"
              >
                <Target className="w-4 h-4 text-blue-600" />
                <span>New Lead</span>
              </button>
              <button
                onClick={() => handleQuickCreate('opportunity')}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-gray-700 flex items-center space-x-2 font-medium"
              >
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <span>New Opportunity</span>
              </button>
              <button
                onClick={() => handleQuickCreate('account')}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-gray-700 flex items-center space-x-2 font-medium"
              >
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>New Account &amp; Client</span>
              </button>
              <button
                onClick={() => handleQuickCreate('quote')}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-gray-700 flex items-center space-x-2 font-medium"
              >
                <ShoppingBag className="w-4 h-4 text-teal-600" />
                <span>New CPQ Quotation</span>
              </button>
              <button
                onClick={() => handleQuickCreate('presales')}
                className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-gray-700 flex items-center space-x-2 font-medium"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>New Presales / POC Request</span>
              </button>
            </div>
          )}
        </div>

        {/* Role Switcher / Impersonator */}
        <div className="relative" ref={roleMenuRef}>
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors text-left"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shadow-xs">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center space-x-1">
                <span className="text-xs font-bold text-gray-800 truncate max-w-[120px]">{currentUser.name}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </div>
              <span className="text-[10px] font-semibold text-blue-600 block leading-tight">
                {currentUser.role}
              </span>
            </div>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 text-xs">
              <div className="px-3.5 py-2 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Team Directory
                </span>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Everyone with a CRM account at this company. Sign in as a different person to see the app as they would.
                </p>
              </div>

              <div className="max-h-72 overflow-y-auto py-1">
                {allUsers.map((u) => {
                  const isSelected = u.id === currentUser.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        if (!isSelected) {
                          showToast(`Real per-user accounts are signed in individually now — sign out and sign back in as ${u.name} to switch.`, 'info');
                        }
                        setShowRoleMenu(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {u.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 text-xs truncate">{u.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{u.role}</p>
                          {u.role === 'Vendor Head' && u.vendorResponsibilities.length > 0 && (
                            <p className="text-[9px] text-amber-600 font-medium">
                              OEMs: {u.vendorResponsibilities.map(v => v.replace('v_', '').toUpperCase()).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && <span className="text-blue-600 font-bold text-xs">Active</span>}
                    </button>
                  );
                })}
              </div>

              <div className="p-2 border-t border-gray-100 bg-gray-50 space-y-1">
                <button
                  id="btn_header_change_password"
                  onClick={() => {
                    setShowRoleMenu(false);
                    setShowChangePasswordModal(true);
                  }}
                  className="w-full py-1.5 px-2 text-[11px] text-gray-700 hover:bg-gray-100 rounded-lg font-medium flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5 text-gray-500" />
                  <span>Change Password</span>
                </button>
                <div className="flex items-center gap-1 pt-1 border-t border-gray-200">
                  <button
                    id="btn_header_logout"
                    onClick={() => {
                      setShowRoleMenu(false);
                      logout();
                    }}
                    className="flex-1 py-1 text-[11px] text-red-600 hover:text-red-700 font-medium flex items-center justify-center space-x-1 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* Floating Toast Notification Stack */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl shadow-lg border text-xs font-medium flex items-center justify-between space-x-3 transition-all animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'success'
                ? 'bg-emerald-950 text-emerald-100 border-emerald-800 shadow-emerald-900/20'
                : toast.type === 'warning'
                ? 'bg-amber-950 text-amber-100 border-amber-800 shadow-amber-900/20'
                : toast.type === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-800 shadow-rose-900/20'
                : 'bg-gray-900 text-gray-100 border-gray-800'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white shrink-0 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </header>
  );
};
