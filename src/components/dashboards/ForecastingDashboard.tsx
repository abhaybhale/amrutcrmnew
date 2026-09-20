import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  TrendingUp,
  Calendar,
  Layers,
  Briefcase,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Clock,
  PieChart as PieIcon,
  Filter,
  ArrowUpRight,
  Sparkles,
  Award,
  ChevronRight,
  Flame,
  CheckCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Opportunity } from '../../types';

export const ForecastingDashboard: React.FC = () => {
  const {
    currentCompany,
    timeHorizonForecasts,
    getPipelineForecastByHorizon,
    accessibleOpportunities,
    currentUser
  } = useCRM();

  const [selectedHorizon, setSelectedHorizon] = useState<string>('This Month');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'All' | 'Software' | 'Services'>('All');

  const activeForecast = timeHorizonForecasts[selectedHorizon] || getPipelineForecastByHorizon(selectedHorizon);

  // Format currency helpers
  const formatAmt = (val: number) => {
    if (currentCompany.currency === 'INR') {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
      return `₹${val.toLocaleString('en-IN')}`;
    }
    if (val >= 1000000) return `${currentCompany.currencySymbol}${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `${currentCompany.currencySymbol}${(val / 1000).toFixed(1)}k`;
    return `${currentCompany.currencySymbol}${val.toLocaleString()}`;
  };

  // Horizon forecast comparison data for bar chart
  const horizonBarData = [
    { name: 'This Week', value: Math.round(timeHorizonForecasts['This Week'].totalPipelineValue / 100000), weighted: Math.round(timeHorizonForecasts['This Week'].weightedForecastValue / 100000) },
    { name: 'This Month', value: Math.round(timeHorizonForecasts['This Month'].totalPipelineValue / 100000), weighted: Math.round(timeHorizonForecasts['This Month'].weightedForecastValue / 100000) },
    { name: 'Next Month', value: Math.round(timeHorizonForecasts['Next Month'].totalPipelineValue / 100000), weighted: Math.round(timeHorizonForecasts['Next Month'].weightedForecastValue / 100000) },
    { name: 'Next 6 Mos', value: Math.round(timeHorizonForecasts['Next 6 Months (H1/H2)'].totalPipelineValue / 100000), weighted: Math.round(timeHorizonForecasts['Next 6 Months (H1/H2)'].weightedForecastValue / 100000) },
    { name: 'Full Year', value: Math.round(timeHorizonForecasts['Full Financial Year'].totalPipelineValue / 100000), weighted: Math.round(timeHorizonForecasts['Full Financial Year'].weightedForecastValue / 100000) }
  ];

  // BANT Confidence Distribution Pie Data
  const bantPieData = [
    { name: 'High BANT (>80% Win Prob)', value: activeForecast.committedDealsCount, color: '#10b981' },
    { name: 'Moderate BANT (50-70% Prob)', value: activeForecast.bestCaseDealsCount, color: '#f59e0b' },
    { name: 'Early Qualification (<50% Prob)', value: activeForecast.pipelineDealsCount, color: '#6366f1' }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Forecasting Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-Horizon Pipeline &amp; BANT Projections</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Revenue Forecasts (Weekly / Monthly / 6-Months / Annual)
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Probability-weighted revenue projections, BANT qualification metrics, and split software vs. services pipeline for {currentCompany.name}.
            </p>
          </div>

          {/* Time Horizon Selector Buttons */}
          <div className="flex flex-wrap items-center bg-slate-800/90 p-1.5 rounded-xl border border-slate-700">
            {['This Week', 'This Month', 'Next Month', 'Next 6 Months (H1/H2)', 'Full Financial Year'].map((horizon) => (
              <button
                key={horizon}
                onClick={() => setSelectedHorizon(horizon)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedHorizon === horizon
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {horizon}
              </button>
            ))}
          </div>
        </div>

        {/* Forecast KPI Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Unweighted Pipeline</span>
              <DollarSign className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1.5">{formatAmt(activeForecast.totalPipelineValue)}</div>
            <div className="text-xs text-slate-400 mt-2">
              Across <strong className="text-white">{activeForecast.opportunityCount}</strong> active deals
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Weighted Likely Revenue</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1.5">{formatAmt(activeForecast.weightedForecastValue)}</div>
            <div className="text-xs text-slate-400 mt-2">
              Based on stage probability &amp; BANT scores
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Software License Pipeline</span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-bold text-blue-400 mt-1.5">{formatAmt(activeForecast.softwareValue)}</div>
            <div className="text-xs text-slate-400 mt-2">
              OEM Products &amp; Cloud Subscriptions
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Services Pipeline</span>
              <Briefcase className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-purple-400 mt-1.5">{formatAmt(activeForecast.servicesValue)}</div>
            <div className="text-xs text-slate-400 mt-2">
              Consulting, Migration &amp; SLA Support
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Horizon Bar Comparison & BANT Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Horizon Comparison */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Pipeline vs. Weighted Forecast Across Horizons</h3>
              <p className="text-xs text-slate-500">Comparing expected close value across time brackets in ₹ Lakhs</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Confidence Factor: 74.8%
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={horizonBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any, name: any) => [`₹${val} Lakhs`, name]}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="value" name="Total Pipeline" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="weighted" name="Likely Forecast (Weighted)" fill="#F25C05" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BANT Deal Breakdown Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">BANT Qualification Profile</h3>
            <p className="text-xs text-slate-500">Budget, Authority, Need &amp; Timeline matrix</p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Committed Deals (80-100%)
                </span>
                <span>{activeForecast.committedDealsCount} Deals</span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-1">
                Budget allocated, Decision maker signed off, urgent timeline (&lt;30 days).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Best Case (50-79%)
                </span>
                <span>{activeForecast.bestCaseDealsCount} Deals</span>
              </div>
              <p className="text-[11px] text-amber-700 mt-1">
                Evaluation committee formed, technical validation complete, commercial pending.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-indigo-600" />
                  Pipeline Exploration (&lt;50%)
                </span>
                <span>{activeForecast.pipelineDealsCount} Deals</span>
              </div>
              <p className="text-[11px] text-indigo-700 mt-1">
                Discovery in progress, requirement scoping under discussion.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Opportunity Forecast Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">High-Impact Opportunities for {selectedHorizon}</h3>
            <p className="text-xs text-slate-500">Key enterprise accounts projected to close in this timeframe</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Category Filter:</span>
            <div className="flex rounded-lg bg-slate-100 p-1">
              {(['All', 'Software', 'Services'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    selectedCategoryFilter === cat ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Opportunity &amp; Account</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Vendor Partner</th>
                <th className="py-3 px-4">Software Value</th>
                <th className="py-3 px-4">Services Value</th>
                <th className="py-3 px-4">Total Value</th>
                <th className="py-3 px-4">Win Probability</th>
                <th className="py-3 px-4">Weighted Forecast</th>
                <th className="py-3 px-4">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeForecast.topDeals.map((opp) => (
                <tr key={opp.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div>{opp.title}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{opp.accountName}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {opp.stage}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {opp.vendorName}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    {formatAmt(opp.softwareValue || 0)}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-purple-700">
                    {formatAmt(opp.servicesValue || 0)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {formatAmt(opp.totalValue)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-600">
                    {opp.probability}%
                  </td>
                  <td className="py-3.5 px-4 font-bold text-orange-600">
                    {formatAmt(((opp.totalValue || 0) * (opp.probability || 50)) / 100)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {opp.ownerName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
