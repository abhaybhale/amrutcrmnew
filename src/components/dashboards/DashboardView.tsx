import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { StatusBadge } from '../common/StatusBadge';
import { MyDayPanel } from './MyDayPanel';
import { NavigationTab } from '../layout/Sidebar';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  Target,
  Briefcase,
  ShoppingBag,
  Clock,
  AlertTriangle,
  Award,
  DollarSign,
  Layers,
  Sparkles,
  Users,
  Boxes
} from 'lucide-react';

interface DashboardViewProps {
  /** Navigates the app to another module and remembers the Dashboard so the
   * global "Back" affordance (rendered by App.tsx) can return here. Optional
   * so DashboardView still renders standalone (e.g. in isolation/tests). */
  onNavigate?: (tab: NavigationTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    currentUser,
    accessibleLeads,
    accessibleOpportunities,
    accessibleOrders,
    accessibleQuotes,
    vendors,
    allUsers
  } = useCRM();

  const [activePersonaTab, setActivePersonaTab] = useState<'auto' | 'salesperson' | 'manager' | 'vendor_head' | 'executive'>('auto');

  // Determine active view mode
  const effectivePersona = activePersonaTab === 'auto'
    ? currentUser.role === 'Sales Person'
      ? 'salesperson'
      : currentUser.role === 'Sales Manager'
      ? 'manager'
      : currentUser.role === 'Vendor Head'
      ? 'vendor_head'
      : 'executive'
    : activePersonaTab;

  // Colors for recharts
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  // Pipeline Stage Distribution
  const stageDataMap: Record<string, number> = {};
  accessibleOpportunities.forEach(o => {
    stageDataMap[o.stage] = (stageDataMap[o.stage] || 0) + o.totalValue;
  });
  const stageChartData = Object.entries(stageDataMap).map(([name, value]) => ({
    name: name.split('/')[0].trim(),
    value: Math.round(value / 100000)
  }));

  // OEM Revenue Distribution
  const oemDataMap: Record<string, number> = {};
  accessibleOpportunities.forEach(o => {
    oemDataMap[o.vendorName] = (oemDataMap[o.vendorName] || 0) + o.totalValue;
  });
  const oemChartData = Object.entries(oemDataMap).map(([name, value]) => ({
    name,
    value: Math.round(value / 100000)
  }));

  // Rep Leaderboard
  const repSalesData = allUsers.filter(u => u.role === 'Sales Person' && u.isActive).map(u => {
    const repOpps = accessibleOpportunities.filter(o => o.ownerId === u.id);
    const repOrders = accessibleOrders.filter(ord => repOpps.some(o => o.accountId === ord.accountId));
    const won = repOrders.reduce((s, o) => s + (o.grandTotal ?? o.totalAmount ?? 0), 0);
    const pipeline = repOpps.filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost').reduce((s, o) => s + o.totalValue, 0);
    return {
      name: u.name.split(' ')[0],
      Won: Math.round(won / 100000),
      Pipeline: Math.round(pipeline / 100000)
    };
  });

  // Total summary metrics
  const totalPipeline = accessibleOpportunities.reduce((s, o) => s + o.totalValue, 0);
  const totalWon = accessibleOrders.reduce((s, o) => s + (o.grandTotal ?? o.totalAmount ?? 0), 0);
  const breachedLeads = accessibleLeads.filter(l => l.slaStatus === 'SLA Breached');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Analytics Dashboard</h1>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Live Monolith
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline metrics, SLA health, revenue realization, and OEM vendor performance.
          </p>
        </div>

        {/* Persona Switcher Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActivePersonaTab('auto')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activePersonaTab === 'auto' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Auto ({currentUser.role.split(' ')[0]})
          </button>
          <button
            onClick={() => setActivePersonaTab('salesperson')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              effectivePersona === 'salesperson' && activePersonaTab !== 'auto' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sales Rep
          </button>
          <button
            onClick={() => setActivePersonaTab('manager')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              effectivePersona === 'manager' && activePersonaTab !== 'auto' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sales Manager
          </button>
          <button
            onClick={() => setActivePersonaTab('vendor_head')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              effectivePersona === 'vendor_head' && activePersonaTab !== 'auto' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vendor Head
          </button>
          <button
            onClick={() => setActivePersonaTab('executive')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              effectivePersona === 'executive' && activePersonaTab !== 'auto' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Executive
          </button>
        </div>
      </div>

      {/* Per-Person Daily Work Queue */}
      <MyDayPanel />

      {/* Top 4 KPI Metrics — clickable drill-down into the relevant module */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate?.('opportunities')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left w-full hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Pipeline</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">
            ₹{(totalPipeline / 100000).toFixed(1)} Lakhs
          </span>
          <span className="text-[11px] text-indigo-600 font-semibold mt-1 block">
            {accessibleOpportunities.length} Qualified Deals in Flight
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left w-full hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Realized Orders</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-600 mt-2 block">
            ₹{(totalWon / 100000).toFixed(1)} Lakhs
          </span>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
            {accessibleOrders.length} Completed PO Deliveries
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('leads')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left w-full hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Leads In Triage</span>
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-2 block">
            {accessibleLeads.length} Leads
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            {accessibleLeads.filter(l => l.status === 'New – Unvalidated').length} Unvalidated Inbound
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('leads')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left w-full hover:shadow-md hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">SLA Status</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className={`text-2xl font-black mt-2 block ${breachedLeads.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {breachedLeads.length} Breaches
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            24h First Contact SLA Guard
          </span>
        </button>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Value Chart */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Pipeline Value by Stage (₹ Lakhs)</h3>
            <span className="text-xs text-slate-400">Current Quarter</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`₹${val} Lakhs`, 'Value']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* OEM Distribution Pie */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">OEM / Vendor Pipeline Share</h3>
            <span className="text-xs text-slate-400">Alliances</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={oemChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {oemChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${val} Lakhs`, 'Pipeline']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Rep Leaderboard & Follow-ups Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rep Leaderboard */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Sales Representative Performance (₹ Lakhs)</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repSalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Won" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pipeline" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Immediate Next Actions / Follow-ups */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Priority Deal Actions</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {accessibleOpportunities.filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost').slice(0, 5).map((opp) => (
              <div
                key={opp.id}
                onClick={() => onNavigate?.('opportunities')}
                className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all"
              >
                <div>
                  <h4 className="font-bold text-slate-900">{opp.title}</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">{opp.nextAction}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-indigo-600 block">₹{(opp.totalValue / 100000).toFixed(1)}L</span>
                  <span className="text-[10px] text-slate-400">Close: {new Date(opp.expectedCloseDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
