import React, { useState } from 'react';
import Papa from 'papaparse';
import { useCRM } from '../../context/CRMContext';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Layers,
  Sparkles,
  BarChart3,
  Search,
  Plus,
  Play,
  RefreshCw
} from 'lucide-react';

export const CustomReportBuilderView: React.FC = () => {
  const { accessibleLeads, accessibleOpportunities, accessibleOrders, accessibleQuotes } = useCRM();

  const [selectedModule, setSelectedModule] = useState<'Leads' | 'Opportunities' | 'Orders' | 'Quotes'>('Opportunities');
  const [groupBy, setGroupBy] = useState<'vendorName' | 'stage' | 'ownerName' | 'pipeline'>('vendorName');

  // Generate dynamic aggregated data
  let rawData: any[] = [];
  if (selectedModule === 'Leads') rawData = accessibleLeads;
  else if (selectedModule === 'Opportunities') rawData = accessibleOpportunities;
  else if (selectedModule === 'Orders') rawData = accessibleOrders;
  else if (selectedModule === 'Quotes') rawData = accessibleQuotes;

  // Group aggregation
  const groupedSummary: Record<string, { count: number; totalValue: number }> = Object.create(null);
  rawData.forEach(item => {
    const key = item[groupBy] || item['status'] || 'Unassigned';
    const val = item.totalValue || item.grandTotal || 0;
    if (!groupedSummary[key]) {
      groupedSummary[key] = { count: 0, totalValue: 0 };
    }
    groupedSummary[key].count += 1;
    groupedSummary[key].totalValue += val;
  });

  const exportCSV = () => {
    let rows: Array<Array<string | number>> = [];
    if (selectedModule === 'Opportunities') {
      rows = [['ID', 'Title', 'Account', 'Vendor', 'Stage', 'Value (INR)', 'Expected Close', 'Owner'],
        ...accessibleOpportunities.map(o => [o.id, o.title, o.accountName, o.vendorName, o.stage, o.totalValue, o.expectedCloseDate, o.ownerName])];
    } else if (selectedModule === 'Leads') {
      rows = [['Lead#', 'Company', 'Contact', 'Vendor', 'Status', 'Estimated Value', 'Salesperson'],
        ...accessibleLeads.map(l => [l.leadNumber, l.companyName, l.contactName, l.vendorName, l.status, l.expectedValue, l.workingSalespersonName])];
    } else {
      rows = [['Group', 'Record Count', 'Total Value (INR)'],
        ...Object.entries(groupedSummary).map(([k, v]) => [k, v.count, v.totalValue])];
    }

    const csvContent = Papa.unparse(rows, { escapeFormulae: true });
    const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Amrut_CRM_${selectedModule}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Custom Report Builder</h1>
            <span className="bg-teal-100 text-teal-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Export Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dynamic query runner, multi-dimensional groupings, revenue aggregation, and instant CSV data export.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export to Excel / CSV</span>
        </button>
      </div>

      {/* Query Parameters Box */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Primary CRM Entity</label>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
          >
            <option value="Opportunities">Opportunities (Deals)</option>
            <option value="Leads">Inbound Leads</option>
            <option value="Orders">Orders &amp; Renewals</option>
            <option value="Quotes">CPQ Quotations</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Group &amp; Aggregate By</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
          >
            <option value="vendorName">OEM / Vendor Partner</option>
            <option value="stage">Stage / Pipeline Status</option>
            <option value="ownerName">Assigned Salesperson</option>
            <option value="pipeline">Sales Pipeline</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Time Horizon</label>
          <select className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none">
            <option>Current Fiscal Year (2026-2027)</option>
            <option>Current Quarter (Q2)</option>
            <option>All Historical Records</option>
          </select>
        </div>
      </div>

      {/* Aggregate Results Summary Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Aggregated Report Results</h3>
            <p className="text-xs text-slate-500">Breakdown of {rawData.length} records grouped by selected dimension.</p>
          </div>
          <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg text-xs">
            {Object.keys(groupedSummary).length} Aggregate Groups
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Group Dimension</th>
                <th className="py-3 px-4 text-center">Record Count</th>
                <th className="py-3 px-4 text-right">Aggregated Total Value (₹)</th>
                <th className="py-3 px-4 text-right">Value Share %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {Object.entries(groupedSummary).map(([grp, stats], idx) => {
                const totalAll = Object.values(groupedSummary).reduce((s, g) => s + g.totalValue, 0);
                const share = totalAll > 0 ? (stats.totalValue / totalAll) * 100 : 0;

                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{grp}</td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">{stats.count}</td>
                    <td className="py-3 px-4 text-right font-black text-indigo-700">
                      ₹{(stats.totalValue / 100000).toFixed(2)} Lakhs
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">
                      {share.toFixed(1)}%
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
