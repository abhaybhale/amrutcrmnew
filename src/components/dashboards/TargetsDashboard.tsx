import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import {
  Target,
  TrendingUp,
  Award,
  Users,
  Building2,
  Calendar,
  DollarSign,
  Briefcase,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Filter,
  Plus,
  Edit2,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  PieChart,
  BarChart2,
  Compass
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import { TargetPeriod, VendorSalesTarget } from '../../types';

export const TargetsDashboard: React.FC = () => {
  const {
    currentUser,
    allUsers,
    vendors,
    companies,
    currentCompany,
    currentCompanyId,
    vendorTargets,
    upsertVendorTarget,
    getUserQuotas,
    getVendorHeadRollup,
    showToast
  } = useCRM();

  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<TargetPeriod>('FY-2026');
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Partial<VendorSalesTarget> | null>(null);
  const activeUserIds = new Set(allUsers.filter(user => user.isActive).map(user => user.id));
  const activeVendorTargets = vendorTargets.filter(target => activeUserIds.has(target.userId));

  // Active user's personal quota
  const myQuotas = getUserQuotas(currentUser.id, currentCompanyId);

  // Active vendor head responsibilities
  const isVendorLead = currentUser.vendorResponsibilities && currentUser.vendorResponsibilities.length > 0;
  const vendorHeadVendorId = currentUser.vendorResponsibilities?.[0] || 'v_atlassian';
  const vendorHeadRollup = getVendorHeadRollup(vendorHeadVendorId, currentCompanyId);

  // Filtered targets table
  const filteredTargets = activeVendorTargets.filter(t => {
    if (t.companyId !== currentCompanyId) return false;
    if (t.period !== selectedPeriod) return false;
    if (selectedUserFilter !== 'all' && t.userId !== selectedUserFilter) return false;
    if (selectedVendorFilter !== 'all' && t.vendorId !== selectedVendorFilter) return false;
    return true;
  });

  // Calculate overall company totals
  const totalSoftwareTargetSum = filteredTargets.reduce((acc, t) => acc + t.productLicenseTarget, 0);
  const totalSoftwareAchievedSum = filteredTargets.reduce((acc, t) => acc + t.productLicenseAchieved, 0);
  const totalServicesTargetSum = filteredTargets.reduce((acc, t) => acc + t.servicesTarget, 0);
  const totalServicesAchievedSum = filteredTargets.reduce((acc, t) => acc + t.servicesAchieved, 0);
  const overallTargetSum = totalSoftwareTargetSum + totalServicesTargetSum;
  const overallAchievedSum = totalSoftwareAchievedSum + totalServicesAchievedSum;
  const overallPercentage = overallTargetSum > 0 ? Math.round((overallAchievedSum / overallTargetSum) * 1000) / 10 : 0;

  // Chart data: Vendor Breakdown
  const vendorChartData = vendors.map(v => {
    const vTargets = activeVendorTargets.filter(t => t.vendorId === v.id && t.companyId === currentCompanyId && t.period === selectedPeriod);
    const swTrg = vTargets.reduce((a, b) => a + b.productLicenseTarget, 0);
    const swAch = vTargets.reduce((a, b) => a + b.productLicenseAchieved, 0);
    const srvTrg = vTargets.reduce((a, b) => a + b.servicesTarget, 0);
    const srvAch = vTargets.reduce((a, b) => a + b.servicesAchieved, 0);
    return {
      name: v.name,
      'Product Target': Math.round(swTrg / 100000),
      'Product Won': Math.round(swAch / 100000),
      'Services Target': Math.round(srvTrg / 100000),
      'Services Won': Math.round(srvAch / 100000),
      swTrg,
      swAch,
      srvTrg,
      srvAch
    };
  });

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

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget?.userId || !editingTarget?.vendorId) {
      showToast('Please select a staff member and a vendor', 'error');
      return;
    }
    const targetUser = allUsers.find(u => u.id === editingTarget.userId);
    const targetVendor = vendors.find(v => v.id === editingTarget.vendorId);

    upsertVendorTarget({
      ...editingTarget,
      companyId: currentCompanyId,
      userName: targetUser?.name || 'Staff Member',
      userRole: targetUser?.role || 'Sales Person',
      vendorName: targetVendor?.name || 'Vendor Partner',
      period: selectedPeriod
    });

    setShowTargetModal(false);
    setEditingTarget(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-semibold">
              <Target className="w-3.5 h-3.5 text-orange-400" />
              <span>{currentCompany.name} ({currentCompany.code}) Target Matrix</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Sales Quotas &amp; Vendor Revenue Rollups
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Track software license vs. services targets per sales rep, manage Vendor Relationship Head rollup targets, and monitor corporate target achievement across fiscal periods.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setEditingTarget({
                  userId: currentUser.id,
                  vendorId: vendors[0]?.id || 'v_atlassian',
                  productLicenseTarget: 10000000,
                  productLicenseAchieved: 0,
                  servicesTarget: 5000000,
                  servicesAchieved: 0,
                  period: 'FY-2026'
                });
                setShowTargetModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-xs shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Set Sales Quota / Target</span>
            </button>
          </div>
        </div>

        {/* Global Summary KPI Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Overall Company Target</span>
              <Building2 className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1.5">{formatAmt(overallTargetSum)}</div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
              <span className="text-emerald-400 font-medium">{formatAmt(overallAchievedSum)}</span>
              <span>achieved ({overallPercentage}%)</span>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Software License Quota</span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1.5">{formatAmt(totalSoftwareTargetSum)}</div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
              <span className="text-blue-400 font-medium">{formatAmt(totalSoftwareAchievedSum)}</span>
              <span>({totalSoftwareTargetSum > 0 ? Math.round((totalSoftwareAchievedSum / totalSoftwareTargetSum) * 100) : 0}%)</span>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Services &amp; Implementation Target</span>
              <Briefcase className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1.5">{formatAmt(totalServicesTargetSum)}</div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
              <span className="text-purple-400 font-medium">{formatAmt(totalServicesAchievedSum)}</span>
              <span>({totalServicesTargetSum > 0 ? Math.round((totalServicesAchievedSum / totalServicesTargetSum) * 100) : 0}%)</span>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Overall Achievement</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1.5">{overallPercentage}%</div>
            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overallPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Relationship Head Rollup Feature Box */}
      {vendorHeadRollup.vendor && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 font-bold text-lg">
                {vendorHeadRollup.vendor.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                    Vendor Lead View
                  </span>
                  <span className="text-xs text-slate-400">Relationship Head: {vendorHeadRollup.vendorHeadUser?.name}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {vendorHeadRollup.vendor.name} — Total Corporate Target &amp; Rep Contributions
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">Aggregate Vendor Target</p>
                <p className="text-base font-bold text-slate-900">{formatAmt(vendorHeadRollup.totalVendorTarget)}</p>
              </div>
              <div className="text-right pl-3 border-l border-slate-200">
                <p className="text-xs text-slate-400 font-medium">Achieved Won</p>
                <p className="text-base font-bold text-emerald-600">{formatAmt(vendorHeadRollup.totalVendorAchieved)}</p>
              </div>
            </div>
          </div>

          {/* Subordinate Rep Breakdown Cards */}
          <div className="mt-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Sales Rep Contributions towards {vendorHeadRollup.vendor.name} Quota
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vendorHeadRollup.repContributions.map((contrib, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-orange-300 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{contrib.rep.name}</p>
                      <p className="text-xs text-slate-500">{contrib.rep.role}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {contrib.percent}%
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Target: <strong className="text-slate-700">{formatAmt(contrib.target)}</strong></span>
                    <span className="text-slate-500">Won: <strong className="text-emerald-600">{formatAmt(contrib.achieved)}</strong></span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-orange-500 h-full rounded-full"
                      style={{ width: `${Math.min(contrib.percent, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Target Breakdown Charts & Active Quota Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendor Comparison Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Vendor Target vs. Achieved Breakdown</h3>
              <p className="text-xs text-slate-500">In ₹ Lakhs / Units per OEM partner for {selectedPeriod}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as TargetPeriod)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="FY-2026">FY-2026 (Full Year)</option>
                <option value="H1-2026">H1-2026 (Apr - Sep)</option>
                <option value="H2-2026">H2-2026 (Oct - Mar)</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendorChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any, name: any) => [`₹${val} Lakhs`, name]}
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Product Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Product Won" fill="#F25C05" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Services Target" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Services Won" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* My Personal Quota Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{currentUser.name} (My Quota)</h4>
                <p className="text-xs text-slate-500">{currentUser.role}</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800">
              {myQuotas.overallPercent}% Won
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Overall Target</span>
              <span className="font-bold text-slate-900">{formatAmt(myQuotas.overallTarget)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Total Booked</span>
              <span className="font-bold text-emerald-600">{formatAmt(myQuotas.overallAchieved)}</span>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Services Category Quotas</p>
              <div className="space-y-2.5">
                {myQuotas.servicesBreakdown.map((srv, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between text-slate-700 font-medium">
                      <span>{srv.serviceType}</span>
                      <span className="text-emerald-600 font-bold">{srv.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(srv.percent, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Sales Quota &amp; Vendor Target Roster</h3>
            <p className="text-xs text-slate-500">Individual targets, services quotas, and current achievement stats</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
            >
              <option value="all">All Sales Staff</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>

            <select
              value={selectedVendorFilter}
              onChange={(e) => setSelectedVendorFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
            >
              <option value="all">All Vendors</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Sales Representative</th>
                <th className="py-3 px-4">Vendor Partner</th>
                <th className="py-3 px-4">Product Quota</th>
                <th className="py-3 px-4">Services Quota</th>
                <th className="py-3 px-4">Total Quota</th>
                <th className="py-3 px-4">Total Achieved</th>
                <th className="py-3 px-4">Achievement %</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTargets.map((trg) => (
                <tr key={trg.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                        {trg.userName.charAt(0)}
                      </div>
                      <div>
                        <div>{trg.userName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{trg.userRole}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {trg.vendorName}
                      {trg.isVendorHeadTarget && (
                        <span className="text-[9px] bg-orange-100 text-orange-700 px-1 rounded font-bold">Lead</span>
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{formatAmt(trg.productLicenseTarget)}</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">{formatAmt(trg.productLicenseAchieved)} won</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{formatAmt(trg.servicesTarget)}</div>
                    <div className="text-[10px] text-purple-600 font-semibold">{formatAmt(trg.servicesAchieved)} won</div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {formatAmt(trg.totalTarget)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-600">
                    {formatAmt(trg.totalAchieved)}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${trg.achievementPercentage >= 80 ? 'text-emerald-600' : trg.achievementPercentage >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {trg.achievementPercentage}%
                      </span>
                      <div className="w-16 bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-full rounded-full ${trg.achievementPercentage >= 80 ? 'bg-emerald-500' : trg.achievementPercentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(trg.achievementPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setEditingTarget(trg);
                        setShowTargetModal(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      title="Edit Target"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Target Setup Modal */}
      {showTargetModal && editingTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingTarget.id ? 'Edit Sales Target & Quota' : 'Assign Sales Target & Quota'}
              </h3>
              <button
                onClick={() => {
                  setShowTargetModal(false);
                  setEditingTarget(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Representative</label>
                <select
                  value={editingTarget.userId}
                  onChange={(e) => setEditingTarget({ ...editingTarget, userId: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                  required
                >
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} — {u.role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Partner</label>
                <select
                  value={editingTarget.vendorId}
                  onChange={(e) => setEditingTarget({ ...editingTarget, vendorId: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                  required
                >
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Software License Target ({currentCompany.currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={editingTarget.productLicenseTarget || ''}
                    onChange={(e) => setEditingTarget({ ...editingTarget, productLicenseTarget: Number(e.target.value) })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                    placeholder="e.g. 20000000"
                    required
                  />
                </div>
              </div>

              <div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Services Target ({currentCompany.currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={editingTarget.servicesTarget || ''}
                    onChange={(e) => setEditingTarget({ ...editingTarget, servicesTarget: Number(e.target.value) })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
                    placeholder="e.g. 8000000"
                    required
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                Achieved software and services values are calculated automatically from received orders for this salesperson, vendor, and fiscal period.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isVendorHeadTarget"
                  checked={editingTarget.isVendorHeadTarget || false}
                  onChange={(e) => setEditingTarget({ ...editingTarget, isVendorHeadTarget: e.target.checked })}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="isVendorHeadTarget" className="text-xs text-slate-700 font-medium">
                  This user is the Vendor Relationship Lead (Enables full corporate rollup)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowTargetModal(false);
                    setEditingTarget(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-sm"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
