import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Order, OrderStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  FileCheck2,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  RotateCw
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const { accessibleOrders, updateOrder } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'orders' | 'renewals'>('orders');

  const filteredOrders = accessibleOrders.filter(ord => {
    const matchesSearch =
      ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.customerPoNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.accountName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatusFilter === 'ALL' || (ord.status || ord.billingStatus) === selectedStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalBookedValue = accessibleOrders.reduce((sum, o) => sum + (o.grandTotal || o.totalAmount || 0), 0);

  // Renewals calculation (orders with license expiry or renewal dates)
  const renewals = accessibleOrders
    .filter(o => o.licenseExpiryDate || o.renewalDate || o.endDate)
    .sort((a, b) => {
      const dateA = new Date(a.licenseExpiryDate || a.renewalDate || a.endDate).getTime();
      const dateB = new Date(b.licenseExpiryDate || b.renewalDate || b.endDate).getTime();
      return dateA - dateB;
    });

  const handleUpdateStatus = (orderId: string, nextStatus: OrderStatus) => {
    updateOrder(orderId, { status: nextStatus });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Orders &amp; Renewals Management</h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              {accessibleOrders.length} Executed Orders
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Customer PO tracking, OEM license delivery, milestone billing, and contract renewal timeline.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'orders' ? 'bg-white text-[#0073EA] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Orders Received</span>
          </button>
          <button
            onClick={() => setActiveTab('renewals')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'renewals' ? 'bg-white text-[#0073EA] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Upcoming Renewals</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block">Total Bookings</span>
          <span className="text-xl font-black text-gray-900 mt-1 block">
            ₹{(totalBookedValue / 100000).toFixed(2)} Lakhs
          </span>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">100% PO Backed</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block">Software Share</span>
          <span className="text-xl font-black text-blue-600 mt-1 block">
            ₹{(accessibleOrders.reduce((s, o) => s + (o.softwareValue || o.softwareAmount || 0), 0) / 100000).toFixed(2)} Lakhs
          </span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">OEM License &amp; Cloud</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider block">Services Share</span>
          <span className="text-xl font-black text-purple-600 mt-1 block">
            ₹{(accessibleOrders.reduce((s, o) => s + (o.servicesValue || o.servicesAmount || 0), 0) / 100000).toFixed(2)} Lakhs
          </span>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Customisation &amp; SOW</span>
        </div>
      </div>

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Order # &amp; Customer PO</th>
                  <th className="py-3.5 px-4">Account &amp; Deal</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Order Value (₹)</th>
                  <th className="py-3.5 px-4">Billing Terms</th>
                  <th className="py-3.5 px-4">License Expiry</th>
                  <th className="py-3.5 px-4 text-center">Update Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400 italic">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-gray-900">{ord.orderNumber}</div>
                        <div className="text-blue-600 text-[11px] font-semibold mt-0.5">
                          PO: {ord.customerPoNumber} ({ord.customerPoDate || ord.poDate ? new Date(ord.customerPoDate || ord.poDate).toLocaleDateString() : 'Active'})
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block">{ord.accountName}</span>
                        <span className="text-gray-500 text-[11px] block">{ord.opportunityTitle}</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          {ord.status || ord.billingStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-gray-900 whitespace-nowrap">
                        ₹{(((ord.grandTotal || ord.totalAmount || 0)) / 100000).toFixed(2)} L
                      </td>

                      <td className="py-3.5 px-4 text-gray-600 text-[11px] max-w-[200px] truncate">
                        {ord.billingMilestones || ord.billingStatus || 'Standard 30 Days'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                        {ord.licenseExpiryDate || ord.renewalDate || ord.endDate
                          ? new Date(ord.licenseExpiryDate || ord.renewalDate || ord.endDate).toLocaleDateString()
                          : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <select
                          value={ord.status || 'PO Received – Verification'}
                          onChange={(e) => handleUpdateStatus(ord.id, e.target.value as OrderStatus)}
                          className="bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs font-semibold text-gray-700 outline-none"
                        >
                          <option value="PO Received – Verification">PO Received</option>
                          <option value="OEM Procurement in Progress">OEM Procurement</option>
                          <option value="Licenses Delivered to Customer">Licenses Delivered</option>
                          <option value="Services Deployment Active">Services Active</option>
                          <option value="Invoiced & Completed">Invoiced &amp; Complete</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RENEWALS CALENDAR TAB */}
      {activeTab === 'renewals' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm">Automated Annual Renewal Pipeline</h4>
              <p className="mt-0.5 text-blue-700">
                System tracks upcoming OEM license expirations and flags 90-day renewal opportunity windows.
              </p>
            </div>
            <span className="font-black text-blue-800 text-base">{renewals.length} Upcoming Renewals</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renewals.map((ord) => {
              const targetDate = ord.licenseExpiryDate || ord.renewalDate || ord.endDate;
              const daysRemaining = targetDate
                ? Math.round((new Date(targetDate).getTime() - Date.now()) / (1000 * 3600 * 24))
                : 0;

              return (
                <div key={ord.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-gray-500">{ord.orderNumber}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      daysRemaining < 30
                        ? 'bg-rose-100 text-rose-800'
                        : daysRemaining < 90
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {daysRemaining > 0 ? `${daysRemaining} Days to Expiry` : 'Expired'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{ord.accountName}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">{ord.opportunityTitle}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-400 text-[10px] block">Contract Value</span>
                      <span className="font-black text-gray-900">₹{(((ord.grandTotal || ord.totalAmount || 0)) / 100000).toFixed(2)}L</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 text-[10px] block">Renewal Date</span>
                      <span className="font-bold text-blue-600">
                        {targetDate ? new Date(targetDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
