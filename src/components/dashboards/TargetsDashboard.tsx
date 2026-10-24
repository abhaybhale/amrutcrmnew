import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import type { Order } from '../../types';

const financialYearOf = (date: string): number | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return month >= 4 ? year : year - 1;
};

const productAmount = (order: Order) => Number(order.softwareAmount ?? order.softwareValue ?? 0) || 0;
const servicesAmount = (order: Order) => Number(order.servicesAmount ?? order.servicesValue ?? 0) || 0;

/** Read-only executive view. OEM/Vendor Alliances is the source of target amounts. */
export const TargetsDashboard: React.FC = () => {
  const { vendors, allUsers, currentCompany, accessibleOrders } = useCRM();
  const today = new Date();
  const currentFinancialYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const [selectedYear, setSelectedYear] = useState(currentFinancialYear);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const availableYears = Array.from(new Set([
    currentFinancialYear,
    ...accessibleOrders.map(order => financialYearOf(order.orderReceivedDate)).filter((year): year is number => year !== null)
  ])).sort((a, b) => b - a);
  const yearOrders = accessibleOrders.filter(order => financialYearOf(order.orderReceivedDate) === selectedYear);
  const productAchieved = yearOrders.reduce((sum, order) => sum + productAmount(order), 0);
  const servicesAchieved = yearOrders.reduce((sum, order) => sum + servicesAmount(order), 0);
  const yearLabel = `FY ${selectedYear}–${String(selectedYear + 1).slice(-2)}`;
  const normalizeVendor = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const vendorForOrder = (order: Order) => vendors.find(vendor => vendor.id === order.vendorId)
    || vendors.find(vendor => normalizeVendor(vendor.name) === normalizeVendor(order.vendorName))
    || (normalizeVendor(order.vendorName) === 'nagios' ? vendors.find(vendor => normalizeVendor(vendor.name) === 'nagiosenterprises') : undefined);
  const unmatchedNames = new Map<string, string>();
  yearOrders.forEach(order => {
    if (!vendorForOrder(order)) unmatchedNames.set(normalizeVendor(order.vendorName) || 'unspecified', order.vendorName || 'Unspecified OEM');
  });
  const sortedVendors = [
    ...vendors.map(vendor => ({ id: vendor.id, name: vendor.name, vendor })),
    ...[...unmatchedNames].map(([id, name]) => ({ id: `source_${id}`, name, vendor: undefined as typeof vendors[number] | undefined }))
  ].sort((a, b) => {
    const aNeedsAttention = Number(!a.vendor || !allUsers.some(user => user.id === a.vendor?.vendorHeadUserId)) + Number(!(a.vendor?.annualRevenueTarget && a.vendor.annualRevenueTarget > 0));
    const bNeedsAttention = Number(!b.vendor || !allUsers.some(user => user.id === b.vendor?.vendorHeadUserId)) + Number(!(b.vendor?.annualRevenueTarget && b.vendor.annualRevenueTarget > 0));
    return bNeedsAttention - aNeedsAttention || a.name.localeCompare(b.name);
  });
  const vendorTotal = vendors.reduce((sum, vendor) => sum + (Number(vendor.annualRevenueTarget) || 0), 0);
  const servicesTotal = vendors.reduce((sum, vendor) => sum + (Number(vendor.servicesTarget) || 0), 0);
  const currency = (amount: number) => `${currentCompany.currencySymbol}${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const unassignedVendors = vendors.filter(vendor => !allUsers.some(user => user.id === vendor.vendorHeadUserId));
  const unassignedTargets = vendors.filter(vendor => !(vendor.annualRevenueTarget > 0));
  const ordersForVendor = (row: typeof sortedVendors[number]) => yearOrders.filter(order => row.vendor
    ? vendorForOrder(order)?.id === row.vendor.id
    : !vendorForOrder(order) && (normalizeVendor(order.vendorName) || 'unspecified') === row.id.slice(7));

  return <div className="space-y-6 pb-12">
    <div className="rounded-2xl bg-slate-900 p-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Sales Targets</h1>
          <p className="mt-1 text-sm text-slate-300">Read-only targets from OEM / Vendor Alliances and received orders for {currentCompany.name}.</p></div>
        <label className="text-sm font-medium">Financial year
          <select className="ml-2 rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-white" value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))}>
            {availableYears.map(year => <option key={year} value={year}>FY {year}–{String(year + 1).slice(-2)}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-2 text-xs text-slate-400">{yearLabel}: orders received from 1 April {selectedYear} through 31 March {selectedYear + 1}. Configured annual targets are shown for comparison.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-slate-800 p-4"><div className="text-sm text-slate-300">Vendor product targets</div><div className="mt-2 text-xl font-bold">{currency(vendorTotal)}</div></div>
        <div className="rounded-xl bg-slate-800 p-4"><div className="text-sm text-slate-300">Services targets</div><div className="mt-2 text-xl font-bold">{currency(servicesTotal)}</div></div>
        <div className="rounded-xl bg-slate-800 p-4"><div className="text-sm text-slate-300">Total sales target</div><div className="mt-2 text-xl font-bold">{currency(vendorTotal + servicesTotal)}</div></div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-slate-800 p-4"><div className="text-sm text-slate-300">Product target achieved</div><div className="mt-2 text-xl font-bold">{currency(productAchieved)}</div></div>
        <div className="rounded-xl bg-slate-800 p-4"><div className="text-sm text-slate-300">Services target achieved</div><div className="mt-2 text-xl font-bold">{currency(servicesAchieved)}</div></div>
        <div className="rounded-xl bg-slate-800 p-4"><div className="text-sm text-slate-300">Total achieved</div><div className="mt-2 text-xl font-bold">{currency(productAchieved + servicesAchieved)}</div></div>
      </div>
    </div>

    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm space-y-2">
      <div><strong>Unassigned vendors ({unassignedVendors.length}):</strong> {unassignedVendors.map(v => v.name).sort((a, b) => a.localeCompare(b)).join(', ') || 'None'}</div>
      <div><strong>Unassigned product targets ({unassignedTargets.length}):</strong> {unassignedTargets.map(v => v.name).sort((a, b) => a.localeCompare(b)).join(', ') || 'None'}</div>
    </div>

    <div className="flex justify-end gap-1 text-sm"><button onClick={() => setViewMode('table')} className={`rounded-lg px-4 py-2 ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>Table view</button><button onClick={() => setViewMode('cards')} className={`rounded-lg px-4 py-2 ${viewMode === 'cards' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>Card view</button></div>

    {viewMode === 'cards' && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sortedVendors.map(row => {
      const vendorOrders = ordersForVendor(row);
      return <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-bold text-slate-900">{row.name}</h2><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><span className="text-slate-500">Product sales</span><div className="font-semibold">{currency(vendorOrders.reduce((sum, order) => sum + productAmount(order), 0))}</div></div><div><span className="text-slate-500">Services sales</span><div className="font-semibold">{currency(vendorOrders.reduce((sum, order) => sum + servicesAmount(order), 0))}</div></div><div><span className="text-slate-500">Product target</span><div>{currency(row.vendor?.annualRevenueTarget || 0)}</div></div><div><span className="text-slate-500">Services target</span><div>{currency(row.vendor?.servicesTarget || 0)}</div></div></div></div>;
    })}</div>}

    {viewMode === 'table' && <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600"><tr>
          <th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Vendor head</th>
          <th className="px-4 py-3 text-right">Annual product target</th>
          <th className="px-4 py-3 text-right">Quarterly product target</th>
          <th className="px-4 py-3 text-right">Services target</th>
          <th className="px-4 py-3 text-right">Product sales achieved</th>
          <th className="px-4 py-3 text-right">Services target achieved</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100">
          {sortedVendors.map(row => {
            const vendor = row.vendor;
            const head = allUsers.find(user => user.id === vendor?.vendorHeadUserId);
            const vendorOrders = ordersForVendor(row);
            const achieved = vendorOrders.reduce((sum, order) => sum + productAmount(order), 0);
            const vendorServicesAchieved = vendorOrders.reduce((sum, order) => sum + servicesAmount(order), 0);
            return <tr key={row.id}>
              <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
              <td className="px-4 py-3">{head?.name || <span className="text-amber-700">Unassigned</span>}</td>
              <td className="px-4 py-3 text-right">{vendor?.annualRevenueTarget && vendor.annualRevenueTarget > 0 ? currency(vendor.annualRevenueTarget) : <span className="text-amber-700">Unassigned</span>}</td>
              <td className="px-4 py-3 text-right">{currency((vendor?.annualRevenueTarget || 0) / 4)}</td>
              <td className="px-4 py-3 text-right">{currency(vendor?.servicesTarget || 0)}</td>
              <td className="px-4 py-3 text-right">{currency(achieved)}</td>
              <td className="px-4 py-3 text-right">{currency(vendorServicesAchieved)}</td>
            </tr>;
          })}
        </tbody>
        <tfoot className="bg-slate-50 font-bold"><tr>
          <td className="px-4 py-3" colSpan={2}>Total</td>
          <td className="px-4 py-3 text-right">{currency(vendorTotal)}</td>
          <td className="px-4 py-3 text-right">{currency(vendorTotal / 4)}</td>
          <td className="px-4 py-3 text-right">{currency(servicesTotal)}</td>
          <td className="px-4 py-3 text-right">{currency(productAchieved)}</td>
          <td className="px-4 py-3 text-right">{currency(servicesAchieved)}</td>
        </tr></tfoot>
      </table>
    </div>}
  </div>;
};
