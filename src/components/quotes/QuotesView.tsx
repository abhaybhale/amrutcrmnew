import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Quote, QuoteLineItem, QuoteLineType, QuoteStatus } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Trash2,
  DollarSign,
  Send,
  Building2,
  AlertTriangle,
  X,
  Sparkles,
  Download
} from 'lucide-react';

export const QuotesView: React.FC = () => {
  const {
    currentUser,
    accessibleQuotes,
    accessibleOpportunities,
    accounts,
    companies,
    currentCompany,
    products,
    createQuote,
    updateQuote,
    approveQuote,
    rejectQuote,
    getFieldAccess
  } = useCRM();

  // Resolve which company entity (letterhead / GST-VAT % / T&C) a quote was
  // issued under. Older quotes created before `companyId` existed fall back
  // to the viewer's currently active company.
  const resolveQuoteCompany = (q: { companyId?: string }) =>
    companies.find(c => c.id === q.companyId) || currentCompany;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [inspectingQuote, setInspectingQuote] = useState<Quote | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Line items state for create/edit
  const [createQuoteData, setCreateQuoteData] = useState({
    opportunityId: accessibleOpportunities[0]?.id || '',
    currency: 'INR (₹)' as const,
    paymentTerms: '100% Advance against PI / PO Net 30 Days',
    validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    notes: `1. Software license keys delivered electronically.\n2. Taxes as applicable (${currentCompany.gstPercent}% GST).\n3. Annual maintenance support included as per OEM policy.`,
    items: [
      {
        id: 'li_1',
        description: 'Jira Software Data Center - 500 User Tier (1 Year Subscription)',
        itemType: 'Software License' as QuoteLineType,
        quantity: 1,
        unitListPrice: 1200000,
        vendorUnitCost: 960000,
        vendorTotalCost: 960000,
        discountPercent: 5,
        unitSellingPrice: 1140000,
        totalSellingPrice: 1140000,
        marginAmount: 180000,
        marginPercent: 15.8
      }
    ] as QuoteLineItem[]
  });

  const filteredQuotes = accessibleQuotes.filter(q => {
    const matchesSearch =
      q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.opportunityTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatusFilter === 'ALL' || q.status === selectedStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate totals for new quote
  const subtotal = createQuoteData.items.reduce((s, li) => s + li.totalSellingPrice, 0);
  const totalCost = createQuoteData.items.reduce((s, li) => s + li.vendorTotalCost, 0);
  const totalMargin = subtotal - totalCost;
  const marginPct = subtotal > 0 ? (totalMargin / subtotal) * 100 : 0;
  const taxAmount = subtotal * (currentCompany.gstPercent / 100); // company-configured GST/VAT %
  const grandTotal = subtotal + taxAmount;
  const totalDiscount = createQuoteData.items.reduce((s, li) => s + ((li.unitListPrice * li.quantity) - li.totalSellingPrice), 0);
  const totalListVal = createQuoteData.items.reduce((s, li) => s + (li.unitListPrice * li.quantity), 0);
  const overallDiscPct = totalListVal > 0 ? (totalDiscount / totalListVal) * 100 : 0;

  // Product catalog quick-pick, scoped to the target opportunity's vendor
  const selectedOppForItems = accessibleOpportunities.find(o => o.id === createQuoteData.opportunityId);
  const cataloguedProductsForOpp = selectedOppForItems
    ? products.filter(p => p.vendorId === selectedOppForItems.vendorId && p.isActive)
    : [];

  const handlePickCatalogProduct = (idx: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    handleUpdateLineItem(idx, {
      description: product.name,
      unitListPrice: product.listPrice,
      itemType: 'Software License'
    });
  };

  // Add line item
  const handleAddLineItem = () => {
    const newItem: QuoteLineItem = {
      id: `li_${Date.now()}`,
      description: 'Professional Deployment & Migration Services (Amrut Engineering)',
      itemType: 'Professional Services',
      quantity: 1,
      unitListPrice: 150000,
      vendorUnitCost: 90000,
      vendorTotalCost: 90000,
      discountPercent: 0,
      unitSellingPrice: 150000,
      totalSellingPrice: 150000,
      marginAmount: 60000,
      marginPercent: 40.0
    };
    setCreateQuoteData({
      ...createQuoteData,
      items: [...createQuoteData.items, newItem]
    });
  };

  const handleUpdateLineItem = (idx: number, updates: Partial<QuoteLineItem>) => {
    const items = [...createQuoteData.items];
    const item = { ...items[idx], ...updates };

    const discountedUnitPrice = item.unitListPrice * (1 - (item.discountPercent / 100));
    item.unitSellingPrice = Math.round(discountedUnitPrice);
    item.totalSellingPrice = Math.round(item.unitSellingPrice * item.quantity);
    item.vendorTotalCost = Math.round(item.vendorUnitCost * item.quantity);
    item.marginAmount = Math.round(item.totalSellingPrice - item.vendorTotalCost);
    item.marginPercent = item.totalSellingPrice > 0 ? Number(((item.marginAmount / item.totalSellingPrice) * 100).toFixed(1)) : 0;

    items[idx] = item;
    setCreateQuoteData({ ...createQuoteData, items });
  };

  const handleRemoveLineItem = (idx: number) => {
    const items = createQuoteData.items.filter((_, i) => i !== idx);
    setCreateQuoteData({ ...createQuoteData, items });
  };

  const handleCreateQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const opp = accessibleOpportunities.find(o => o.id === createQuoteData.opportunityId) || accessibleOpportunities[0];
    if (!opp) return;

    createQuote({
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      accountId: opp.accountId,
      accountName: opp.accountName,
      contactId: opp.primaryContactId,
      contactName: opp.primaryContactName,
      salespersonId: opp.ownerId,
      salespersonName: opp.ownerName,
      vendorId: opp.vendorId,
      vendorName: opp.vendorName,
      companyId: currentCompany.id,
      currency: createQuoteData.currency,
      items: createQuoteData.items,
      subtotal,
      totalVendorCost: totalCost,
      totalDiscountAmount: totalDiscount,
      overallDiscountPercent: overallDiscPct,
      taxPercent: 18,
      taxAmount,
      grandTotal,
      totalMarginAmount: totalMargin,
      totalMarginPercent: marginPct,
      paymentTerms: createQuoteData.paymentTerms,
      validUntil: createQuoteData.validUntil,
      notes: createQuoteData.notes,
      approvalRequired: marginPct < 15
    });

    setShowCreateModal(false);
  };

  const handleApproveQuote = (quoteId: string) => {
    approveQuote(quoteId);
  };

  const handleSubmitToCustomer = (quoteId: string) => {
    updateQuote(quoteId, {
      status: 'Submitted to Customer'
    });
  };

  const handleAcceptQuote = (quoteId: string) => {
    updateQuote(quoteId, {
      status: 'Customer Accepted'
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">CPQ Quotations Master</h1>
            <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredQuotes.length} Quotes
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Multi-line pricing engine, software licensing, discount limit approvals, margin control, and PDF generation.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/30 flex items-center space-x-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Generate Quote</span>
        </button>
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
              placeholder="Search quote #, customer, deal..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-400 text-[11px]">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Pending Internal Approval">Pending Approval</option>
              <option value="Approved by Sales Manager">Approved</option>
              <option value="Submitted to Customer">Submitted to Customer</option>
              <option value="Customer Accepted">Accepted</option>
            </select>
          </div>
        </div>

        {(selectedStatusFilter !== 'ALL' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedStatusFilter('ALL');
              setSearchQuery('');
            }}
            className="text-teal-600 hover:text-teal-800 font-semibold text-xs"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Quote Number</th>
                <th className="py-3.5 px-4">Customer Account</th>
                <th className="py-3.5 px-4">Opportunity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Grand Total (₹)</th>
                <th className="py-3.5 px-4 text-center">Margin %</th>
                <th className="py-3.5 px-4">Valid Until</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 italic">
                    No quotes found.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => setInspectingQuote(q)}
                    className="hover:bg-teal-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                          {q.quoteNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                          v{q.version}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{q.items.length} line items</span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {q.accountName}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 truncate max-w-[200px]">
                      {q.opportunityTitle}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={q.status} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                      ₹{(q.grandTotal / 100000).toFixed(2)} L
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-emerald-600 whitespace-nowrap">
                      {q.totalMarginPercent.toFixed(1)}%
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {new Date(q.validUntil).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => {
                            setInspectingQuote(q);
                            setShowPrintModal(true);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                          title="Print / View Quotation Document"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {q.status === 'Pending Internal Approval' && (currentUser.role === 'CRM Administrator' || currentUser.role === 'Sales Manager') && (
                          <button
                            onClick={() => handleApproveQuote(q.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                          >
                            Approve
                          </button>
                        )}

                        {q.status === 'Approved by Sales Manager' && (
                          <button
                            onClick={() => handleSubmitToCustomer(q.id)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold"
                          >
                            Send to Client
                          </button>
                        )}

                        {q.status === 'Submitted to Customer' && (
                          <button
                            onClick={() => handleAcceptQuote(q.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                          >
                            Client Accepted
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE QUOTE CPQ BUILDER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Configure, Price &amp; Generate Quotation (CPQ)</h3>
                <p className="text-xs text-slate-500">Amrut Software Enterprise Commercial Engine</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuoteSubmit} className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Target Opportunity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Opportunity Deal</label>
                  <select
                    value={createQuoteData.opportunityId}
                    onChange={(e) => setCreateQuoteData({ ...createQuoteData, opportunityId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-teal-500 font-semibold"
                  >
                    {accessibleOpportunities.map(o => (
                      <option key={o.id} value={o.id}>{o.title} ({o.accountName})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quote Validity Date</label>
                  <input
                    type="date"
                    value={createQuoteData.validUntil}
                    onChange={(e) => setCreateQuoteData({ ...createQuoteData, validUntil: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Commercial Line Items</h4>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Line Item</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Description &amp; Category</th>
                        <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                        <th className="py-2.5 px-2 w-28 text-right">List Price (₹)</th>
                        <th className="py-2.5 px-2 w-28 text-right">Vendor Cost (₹)</th>
                        <th className="py-2.5 px-2 w-20 text-center">Disc %</th>
                        <th className="py-2.5 px-2 w-28 text-right">Sell Price (₹)</th>
                        <th className="py-2.5 px-2 w-28 text-right">Line Total (₹)</th>
                        <th className="py-2.5 px-2 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {createQuoteData.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3">
                            {cataloguedProductsForOpp.length > 0 && (
                              <select
                                value=""
                                onChange={(e) => e.target.value && handlePickCatalogProduct(idx, e.target.value)}
                                className="w-full mb-1 px-2 py-1 bg-indigo-50 border border-indigo-200 rounded text-[10px] font-semibold text-indigo-700 outline-none"
                              >
                                <option value="">Quick-fill from {selectedOppForItems?.vendorName} catalog…</option>
                                {cataloguedProductsForOpp.map(p => (
                                  <option key={p.id} value={p.id}>{p.name} — ₹{p.listPrice.toLocaleString('en-IN')}</option>
                                ))}
                              </select>
                            )}
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleUpdateLineItem(idx, { description: e.target.value })}
                              className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                            />
                            <select
                              value={item.itemType}
                              onChange={(e) => handleUpdateLineItem(idx, { itemType: e.target.value as QuoteLineType })}
                              className="mt-1 text-[10px] text-slate-500 bg-transparent outline-none"
                            >
                              <option value="Software License">Software License</option>
                              <option value="Cloud Subscription">Cloud Subscription</option>
                              <option value="Professional Services">Professional Services</option>
                              <option value="Custom Development">Custom Development</option>
                              <option value="Annual Support">Annual Support</option>
                            </select>
                          </td>

                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateLineItem(idx, { quantity: Number(e.target.value) })}
                              className="w-14 px-1 py-1 text-center bg-white border border-slate-200 rounded text-xs"
                            />
                          </td>

                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              value={item.unitListPrice}
                              onChange={(e) => handleUpdateLineItem(idx, { unitListPrice: Number(e.target.value) })}
                              className="w-24 px-1 py-1 text-right bg-white border border-slate-200 rounded text-xs font-semibold"
                            />
                          </td>

                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              value={item.vendorUnitCost}
                              onChange={(e) => handleUpdateLineItem(idx, { vendorUnitCost: Number(e.target.value) })}
                              className="w-24 px-1 py-1 text-right bg-white border border-slate-200 rounded text-xs"
                            />
                          </td>

                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              value={item.discountPercent}
                              onChange={(e) => handleUpdateLineItem(idx, { discountPercent: Number(e.target.value) })}
                              className="w-16 px-1 py-1 text-center bg-white border border-slate-200 rounded text-xs font-bold text-amber-600"
                            />
                          </td>

                          <td className="py-2 px-2 text-right font-bold text-slate-800">
                            ₹{item.unitSellingPrice.toLocaleString('en-IN')}
                          </td>

                          <td className="py-2 px-2 text-right font-black text-slate-900">
                            ₹{item.totalSellingPrice.toLocaleString('en-IN')}
                          </td>

                          <td className="py-2 px-2 text-center">
                            {createQuoteData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Commercial Summary Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Subtotal</span>
                  <span className="font-bold text-slate-900 text-sm block">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Tax ({currentCompany.gstPercent}% GST/VAT)</span>
                  <span className="font-semibold text-slate-700 text-sm block">₹{taxAmount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Gross Margin</span>
                  <span className="font-bold text-emerald-600 text-sm block">
                    ₹{totalMargin.toLocaleString('en-IN')} ({marginPct.toFixed(1)}%)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Grand Total</span>
                  <span className="font-black text-teal-700 text-base block">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Approval Notice */}
              {marginPct < 15 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Gross Margin is below 15% ({marginPct.toFixed(1)}%). This quotation will require <strong>Sales Manager Approval</strong>.
                  </span>
                </div>
              )}

              {/* Terms */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Commercial Payment Terms</label>
                  <input
                    type="text"
                    value={createQuoteData.paymentTerms}
                    onChange={(e) => setCreateQuoteData({ ...createQuoteData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Notes &amp; Terms</label>
                  <textarea
                    rows={2}
                    value={createQuoteData.notes}
                    onChange={(e) => setCreateQuoteData({ ...createQuoteData, notes: e.target.value })}
                    className="w-full px-3 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md shadow-teal-600/30"
                >
                  Generate Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT / PREVIEW QUOTATION MODAL */}
      {showPrintModal && inspectingQuote && (() => {
        const previewCompany = resolveQuoteCompany(inspectingQuote);
        return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800">
            {/* Action Bar */}
            <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between text-xs print:hidden">
              <span>Printable Commercial Document Preview</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 rounded-lg font-semibold flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
                <button onClick={() => setShowPrintModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Body (Formal Letterhead) */}
            <div className="p-10 space-y-8 text-xs font-sans">
              {/* Header Letterhead */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
                <div className="flex items-start space-x-3">
                  {previewCompany.logo && (
                    <img src={previewCompany.logo} alt={previewCompany.name} className="w-12 h-12 object-contain rounded-lg" />
                  )}
                  <div>
                    <h1 className="text-2xl font-black tracking-wider text-slate-950">{previewCompany.legalEntity}</h1>
                    <p className="text-[11px] text-slate-600 mt-1">{previewCompany.industry}</p>
                    <p className="text-[11px] text-slate-500">{previewCompany.city}, {previewCompany.country}</p>
                    <p className="text-[11px] text-slate-500 font-mono">Tax Reg. No: {previewCompany.taxRegistrationNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-teal-700 block">COMMERCIAL QUOTATION</span>
                  <p className="font-mono font-bold text-sm text-slate-900 mt-1">{inspectingQuote.quoteNumber}</p>
                  <p className="text-slate-500 text-[11px]">Date: {new Date(inspectingQuote.createdDate).toLocaleDateString()}</p>
                  <p className="text-slate-500 text-[11px]">Valid Until: {new Date(inspectingQuote.validUntil).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Customer Box */}
              <div className="grid grid-cols-2 gap-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Quotation Prepared For:</span>
                  <h3 className="font-bold text-slate-900 text-sm mt-0.5">{inspectingQuote.accountName}</h3>
                  <p className="text-slate-600 text-xs mt-0.5">Ref Opportunity: {inspectingQuote.opportunityTitle}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Account Representative:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{inspectingQuote.salespersonName}</p>
                  <p className="text-slate-500 text-[11px]">{previewCompany.primaryContactEmail}</p>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-slate-900 font-bold uppercase text-[10px]">
                    <th className="py-2.5">Item Description</th>
                    <th className="py-2.5 text-center">Category</th>
                    <th className="py-2.5 text-center">Qty</th>
                    <th className="py-2.5 text-right">Unit Price (₹)</th>
                    <th className="py-2.5 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {inspectingQuote.items.map((li, idx) => (
                    <tr key={idx}>
                      <td className="py-3 font-semibold text-slate-900">{li.description}</td>
                      <td className="py-3 text-center text-slate-500">{li.itemType}</td>
                      <td className="py-3 text-center font-bold">{li.quantity}</td>
                      <td className="py-3 text-right">₹{li.unitSellingPrice.toLocaleString('en-IN')}</td>
                      <td className="py-3 text-right font-bold text-slate-900">₹{li.totalSellingPrice.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Box */}
              <div className="flex justify-end pt-4 border-t-2 border-slate-800">
                <div className="w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">₹{inspectingQuote.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({inspectingQuote.taxPercent}% GST/VAT):</span>
                    <span className="font-semibold">₹{inspectingQuote.taxAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-300">
                    <span>Grand Total:</span>
                    <span>₹{inspectingQuote.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="pt-6 border-t border-slate-200 space-y-2 text-[11px] text-slate-600">
                <p><strong>Payment Terms:</strong> {inspectingQuote.paymentTerms}</p>
                <p><strong>Notes &amp; Conditions:</strong> {inspectingQuote.notes}</p>
              </div>

              {/* Company Terms & Conditions */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">Terms &amp; Conditions</p>
                <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-line">{previewCompany.termsAndConditions}</p>
              </div>

              {/* Signatures */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-xs text-slate-500">
                <div className="border-t border-slate-300 pt-2">
                  <p className="font-bold text-slate-800">Authorized Signatory ({previewCompany.name})</p>
                  <p className="text-[10px] mt-0.5">Digitally Approved: {inspectingQuote.approvedByName || `${previewCompany.name} Commercial`}</p>
                </div>
                <div className="border-t border-slate-300 pt-2 text-right">
                  <p className="font-bold text-slate-800">Customer Acceptance &amp; Stamp</p>
                  <p className="text-[10px] mt-0.5">Signature &amp; Date</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};
