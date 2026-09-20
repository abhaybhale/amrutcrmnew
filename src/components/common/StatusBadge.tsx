import React from 'react';
import { LeadStatus, OpportunityStage, PriorityLevel, ContactRole, AccountTier, QuoteStatus } from '../../types';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className = '' }) => {
  // Monday.com style vibrant, clean status colors
  const getColors = (st: string) => {
    switch (st) {
      // Leads
      case 'New – Unvalidated':
        return 'bg-blue-500 text-white';
      case 'Validation in Progress':
        return 'bg-indigo-500 text-white';
      case 'Ready for Assignment':
        return 'bg-cyan-500 text-white';
      case 'Assigned – Awaiting Acceptance':
        return 'bg-amber-500 text-white';
      case 'Accepted – Action Pending':
        return 'bg-teal-500 text-white';
      case 'Contact Attempted':
        return 'bg-sky-500 text-white';
      case 'Connected / Discovery':
        return 'bg-purple-600 text-white';
      case 'Qualification in Progress':
        return 'bg-violet-500 text-white';
      case 'Qualified – Convert to Opportunity':
        return 'bg-emerald-600 text-white';
      case 'Budgeted / Future Project':
        return 'bg-slate-500 text-white';
      case 'Shelved / Nurture':
        return 'bg-stone-500 text-white';
      case 'Disqualified':
        return 'bg-rose-600 text-white';
      case 'Converted':
        return 'bg-green-600 text-white';

      // Opportunities
      case 'Qualified Opportunity':
        return 'bg-blue-600 text-white';
      case 'Discovery / BANT':
        return 'bg-indigo-600 text-white';
      case 'Solution Route Confirmed':
        return 'bg-cyan-600 text-white';
      case 'Presales / POC in Progress':
        return 'bg-purple-600 text-white';
      case 'Solution & Commercial Inputs Ready':
        return 'bg-amber-600 text-white';
      case 'Quote Submitted':
        return 'bg-teal-600 text-white';
      case 'Technical / Commercial Evaluation':
        return 'bg-sky-600 text-white';
      case 'Negotiation':
        return 'bg-orange-600 text-white';
      case 'Verbal / Intent to Order':
        return 'bg-lime-600 text-white';
      case 'Closed Won':
        return 'bg-emerald-600 text-white';
      case 'Closed Lost':
        return 'bg-rose-700 text-white';
      case 'Shelved / Budgeted':
        return 'bg-slate-600 text-white';

      // Quotes
      case 'Draft':
        return 'bg-slate-500 text-white';
      case 'Pending Internal Approval':
        return 'bg-amber-500 text-white';
      case 'Approved by Sales Manager':
        return 'bg-teal-600 text-white';
      case 'Submitted to Customer':
        return 'bg-blue-600 text-white';
      case 'Customer Accepted':
        return 'bg-emerald-600 text-white';
      case 'Customer Requested Revision':
        return 'bg-orange-500 text-white';
      case 'Rejected':
        return 'bg-rose-600 text-white';
      case 'Expired':
        return 'bg-gray-500 text-white';

      // Presales & POC
      case 'Requested':
        return 'bg-amber-500 text-white';
      case 'Assigned':
        return 'bg-blue-500 text-white';
      case 'In Progress':
      case 'Active Testing':
        return 'bg-purple-600 text-white';
      case 'Completed – Sign-off Received':
      case 'Sign-off Received':
        return 'bg-emerald-600 text-white';
      case 'Planning':
        return 'bg-sky-500 text-white';

      default:
        return 'bg-neutral-600 text-white';
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium rounded-sm tracking-wide',
    md: 'text-xs px-3 py-1 font-semibold rounded-md shadow-xs',
    lg: 'text-sm px-4 py-1.5 font-semibold rounded-md'
  };

  return (
    <span
      className={`inline-flex items-center justify-center text-center whitespace-nowrap transition-colors duration-150 ${getColors(
        status
      )} ${sizeClasses[size]} ${className}`}
    >
      {status}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: PriorityLevel }> = ({ priority }) => {
  const styles = {
    Urgent: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    High: 'bg-orange-100 text-orange-800 border-orange-300 font-semibold',
    Medium: 'bg-amber-100 text-amber-800 border-amber-300 font-medium',
    Low: 'bg-slate-100 text-slate-700 border-slate-300 font-normal'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${styles[priority]}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          priority === 'Urgent'
            ? 'bg-rose-600'
            : priority === 'High'
            ? 'bg-orange-500'
            : priority === 'Medium'
            ? 'bg-amber-500'
            : 'bg-slate-400'
        }`}
      />
      {priority}
    </span>
  );
};

export const TierBadge: React.FC<{ tier: AccountTier }> = ({ tier }) => {
  const styles = {
    Strategic: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
    Growth: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold',
    Maintain: 'bg-blue-100 text-blue-800 border-blue-300 font-medium',
    General: 'bg-slate-100 text-slate-700 border-slate-300 font-normal',
    Dormant: 'bg-stone-100 text-stone-600 border-stone-300 font-normal'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${styles[tier]}`}>
      {tier}
    </span>
  );
};

export const ContactRoleBadge: React.FC<{ role: ContactRole }> = ({ role }) => {
  const styles: Record<ContactRole, string> = {
    'Decision Maker': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Technical Evaluator': 'bg-sky-50 text-sky-700 border-sky-200',
    'Procurement': 'bg-amber-50 text-amber-700 border-amber-200',
    'Finance': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Influencer': 'bg-purple-50 text-purple-700 border-purple-200',
    'User / End-User': 'bg-slate-50 text-slate-700 border-slate-200',
    'Champion': 'bg-teal-50 text-teal-700 border-teal-200',
    'Management Sponsor': 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium ${styles[role] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {role}
    </span>
  );
};

export const SLACountdownBadge: React.FC<{ dueTime: string; status: string }> = ({ dueTime, status }) => {
  const isBreached = status === 'SLA Breached' || new Date(dueTime).getTime() < Date.now();
  const isNearBreach = status === 'Near Breach' || (!isBreached && new Date(dueTime).getTime() - Date.now() < 3 * 3600 * 1000);

  return (
    <div
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
        isBreached
          ? 'bg-rose-100 text-rose-800 border border-rose-300'
          : isNearBreach
          ? 'bg-amber-100 text-amber-800 border border-amber-300'
          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full mr-1.5 animate-pulse ${
          isBreached ? 'bg-rose-600' : isNearBreach ? 'bg-amber-500' : 'bg-emerald-500'
        }`}
      />
      {isBreached ? 'SLA Breached' : isNearBreach ? 'Near SLA Breach (<3h)' : 'Within SLA'}
    </div>
  );
};
