import React from 'react';
import { useCRM, CustomerHistorySummary } from '../../context/CRMContext';
import { StatusBadge, TierBadge } from './StatusBadge';
import { 
  Building2, 
  Users, 
  Briefcase, 
  ShoppingBag, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  TrendingUp, 
  Layers, 
  Calendar,
  Sparkles,
  Phone,
  Mail
} from 'lucide-react';

interface CustomerHistoryPeekProps {
  companyName: string;
  onSelectAccount?: (accountId: string) => void;
  onSelectContact?: (contactId: string) => void;
}

export const CustomerHistoryPeek: React.FC<CustomerHistoryPeekProps> = ({
  companyName,
  onSelectAccount,
  onSelectContact
}) => {
  const { searchCustomerHistory, getFieldAccess } = useCRM();
  const history: CustomerHistorySummary = searchCustomerHistory(companyName);

  if (!companyName || companyName.trim().length < 2) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500">
        <Sparkles className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <p className="text-sm font-medium">Real-Time Customer Peek</p>
        <p className="text-xs text-slate-400 mt-1">
          Type a company name to instantly search past accounts, deals, orders, contacts & installed OEM products.
        </p>
      </div>
    );
  }

  const {
    matchedAccount,
    matchedContacts,
    matchedLeads,
    openOpportunities,
    closedOpportunities,
    pastOrders,
    installedProducts,
    totalHistoricalRevenue,
    health
  } = history;

  const hasAnyMatch = matchedAccount || matchedContacts.length > 0 || matchedLeads.length > 0 || openOpportunities.length > 0;

  if (!hasAnyMatch) {
    return (
      <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 text-left">
        <div className="flex items-center space-x-2 text-emerald-800 font-semibold text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>New Prospect Detected</span>
        </div>
        <p className="text-xs text-emerald-700 mt-1.5 leading-relaxed">
          No existing duplicate Account or past deals found for &ldquo;<strong>{companyName}</strong>&rdquo;. This is a fresh prospective client.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden text-left divide-y divide-slate-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
              Matched Customer History
            </span>
          </div>
          {matchedAccount && <TierBadge tier={matchedAccount.tier} />}
        </div>
        <h4 className="text-base font-bold text-white mt-1">
          {matchedAccount ? matchedAccount.name : companyName}
        </h4>
        <div className="flex items-center space-x-3 mt-2 text-xs text-indigo-200">
          <span>{matchedAccount?.city || 'India'}</span>
          <span>•</span>
          <span className="text-emerald-400 font-medium">Health: {health}</span>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/60 p-3 text-center">
        <div>
          <span className="text-xs text-slate-500 block">Total Revenue</span>
          <span className="text-sm font-bold text-slate-900">
            ₹{(totalHistoricalRevenue / 100000).toFixed(1)} L
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500 block">Open Deals</span>
          <span className="text-sm font-bold text-indigo-600">
            {openOpportunities.length} (₹{(openOpportunities.reduce((s, o) => s + o.totalValue, 0) / 100000).toFixed(1)}L)
          </span>
        </div>
        <div>
          <span className="text-xs text-slate-500 block">Past Orders</span>
          <span className="text-sm font-bold text-emerald-600">{pastOrders.length}</span>
        </div>
      </div>

      {/* Installed OEM Products */}
      {installedProducts.length > 0 && (
        <div className="p-3.5">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-2">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Installed OEM Products & Licenses</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {installedProducts.map((prod, idx) => (
              <span
                key={idx}
                className="bg-indigo-50 text-indigo-800 text-xs px-2.5 py-1 rounded-md border border-indigo-100 font-medium"
              >
                {prod}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Existing Key Contacts */}
      {matchedContacts.length > 0 && (
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
              <Users className="w-3.5 h-3.5 text-sky-500" />
              <span>Known Contacts ({matchedContacts.length})</span>
            </div>
          </div>
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {matchedContacts.map((cnt) => (
              <div
                key={cnt.id}
                onClick={() => onSelectContact && onSelectContact(cnt.id)}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200 text-xs cursor-pointer flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">{cnt.name}</p>
                  <p className="text-slate-500 text-[11px]">{cnt.designation} • {cnt.roleInBuying}</p>
                </div>
                <div className="text-right">
                  <span className="text-indigo-600 hover:underline font-medium text-[11px]">Use Contact</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open & Past Opportunities */}
      {openOpportunities.length > 0 && (
        <div className="p-3.5">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 mb-2">
            <Briefcase className="w-3.5 h-3.5 text-amber-500" />
            <span>Active Pipeline Cases</span>
          </div>
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {openOpportunities.map((opp) => (
              <div key={opp.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 truncate max-w-[180px]">{opp.title}</span>
                  <StatusBadge status={opp.stage} size="sm" />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Owner: {opp.ownerName}</span>
                  <span className="font-bold text-slate-800">₹{(opp.totalValue / 100000).toFixed(1)} L</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Use Existing Account Action Button */}
      {matchedAccount && onSelectAccount && (
        <div className="p-3 bg-slate-50 text-center">
          <button
            type="button"
            onClick={() => onSelectAccount(matchedAccount.id)}
            className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors flex items-center justify-center space-x-1.5"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Link to Existing Account ({matchedAccount.name})</span>
          </button>
        </div>
      )}
    </div>
  );
};
