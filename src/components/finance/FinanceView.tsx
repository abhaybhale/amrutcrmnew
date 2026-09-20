import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useFinance } from '../../context/FinanceContext';
import { PaymentMethod } from '../../types';
import {
  Receipt,
  Wallet,
  AlertTriangle,
  TrendingUp,
  Plus,
  X,
  FileText,
  Landmark
} from 'lucide-react';

const PAYMENT_METHODS: PaymentMethod[] = ['Bank Transfer', 'Cheque', 'Credit Card', 'UPI', 'Wire Transfer', 'Other'];

const money = (n: number, currency = 'INR (₹)') => {
  const symbol = currency.match(/\((.*?)\)/)?.[1] || currency.split(' ')[0] || '₹';
  return `${symbol}${(n / 100000).toFixed(1)}L`;
};

export const FinanceView: React.FC = () => {
  const { currentCompany, orders } = useCRM();
  const { accessibleInvoices, accessiblePayments, accessibleExpenses, createInvoiceFromOrder, recordPayment, arAgingBuckets, revenueSummary } = useFinance();

  const [tab, setTab] = useState<'invoices' | 'payments' | 'aging' | 'expenses'>('invoices');
  const [payModalInvoiceId, setPayModalInvoiceId] = useState<string | null>(null);

  const ordersWithoutInvoice = orders.filter(o => !accessibleInvoices.some(i => i.orderId === o.id));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Finance &amp; Billing</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{currentCompany.code}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Invoices generated from won orders, payment collection and AR aging.</p>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {(['invoices', 'payments', 'aging', 'expenses'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3.5 py-1.5 rounded-lg font-semibold capitalize transition-all ${tab === t ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              {t === 'aging' ? 'AR Aging' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Receipt className="w-4 h-4 text-indigo-600" />} label="Total Invoiced" value={money(revenueSummary.totalInvoiced)} />
        <StatCard icon={<Wallet className="w-4 h-4 text-emerald-600" />} label="Collected" value={money(revenueSummary.totalCollected)} />
        <StatCard icon={<TrendingUp className="w-4 h-4 text-amber-600" />} label="Outstanding" value={money(revenueSummary.totalOutstanding)} />
        <StatCard icon={<AlertTriangle className="w-4 h-4 text-rose-600" />} label="Overdue Invoices" value={String(revenueSummary.overdueCount)} danger={revenueSummary.overdueCount > 0} />
      </div>

      {tab === 'invoices' && (
        <div className="space-y-4">
          {ordersWithoutInvoice.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-amber-800">
                <strong>{ordersWithoutInvoice.length} won order(s)</strong> don't have an invoice yet.
              </div>
              <div className="flex flex-wrap gap-2">
                {ordersWithoutInvoice.map(o => (
                  <button key={o.id} onClick={() => createInvoiceFromOrder(o.id)} className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100">
                    <Plus className="w-3 h-3" /> Generate for {o.orderNumber}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {accessibleInvoices.map(inv => (
              <div key={inv.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{inv.invoiceNumber}</h4>
                      <InvoiceStatusPill status={inv.status} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{inv.accountName} &middot; Due {new Date(inv.dueDate).toLocaleDateString()} &middot; {inv.salespersonName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs">
                  <div className="text-right">
                    <p className="text-slate-400">Grand Total</p>
                    <p className="font-bold text-slate-900">{money(inv.grandTotal, inv.currency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400">Balance Due</p>
                    <p className={`font-bold ${inv.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{money(inv.balanceDue, inv.currency)}</p>
                  </div>
                  {inv.balanceDue > 0 && (
                    <button onClick={() => setPayModalInvoiceId(inv.id)} className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                      Record Payment
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-3">
          {accessiblePayments.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center"><Landmark className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{p.accountName}</p>
                  <p className="text-[11px] text-slate-500">{p.invoiceNumber} &middot; {p.method} {p.referenceNumber && `• Ref: ${p.referenceNumber}`} &middot; {new Date(p.receivedDate).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-emerald-700">{money(p.amount, p.currency)}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'aging' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {arAgingBuckets.map(bucket => (
            <div key={bucket.label} className={`bg-white p-4 rounded-2xl border shadow-xs space-y-3 ${bucket.total > 0 && bucket.minDays >= 61 ? 'border-rose-200' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700">{bucket.label}</h4>
                {bucket.minDays >= 61 && bucket.total > 0 && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
              </div>
              <p className="text-lg font-black text-slate-900">{money(bucket.total)}</p>
              <div className="space-y-1.5">
                {bucket.invoices.map(inv => (
                  <div key={inv.id} className="flex justify-between text-[11px] text-slate-600">
                    <span className="truncate">{inv.accountName}</span>
                    <span className="font-semibold">{money(inv.balanceDue, inv.currency)}</span>
                  </div>
                ))}
                {bucket.invoices.length === 0 && <p className="text-[11px] text-slate-400">No invoices in this range</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'expenses' && (
        <div className="space-y-3">
          {accessibleExpenses.map(exp => (
            <div key={exp.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{exp.description}</p>
                <p className="text-[11px] text-slate-500">{exp.category} &middot; {exp.createdByName} &middot; {new Date(exp.incurredDate).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  exp.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                  exp.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                  exp.status === 'Reimbursed' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                }`}>{exp.status}</span>
                <span className="text-sm font-bold text-slate-900">{money(exp.amount, exp.currency)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {payModalInvoiceId && (
        <RecordPaymentModal
          invoice={accessibleInvoices.find(i => i.id === payModalInvoiceId)!}
          onClose={() => setPayModalInvoiceId(null)}
          onRecord={(data) => { recordPayment(payModalInvoiceId, data); setPayModalInvoiceId(null); }}
        />
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; danger?: boolean }> = ({ icon, label, value, danger }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
    <div className="flex items-center justify-between text-slate-400">
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      {icon}
    </div>
    <span className={`text-xl font-black mt-2 block ${danger ? 'text-rose-600' : 'text-slate-900'}`}>{value}</span>
  </div>
);

const InvoiceStatusPill: React.FC<{ status: string }> = ({ status }) => {
  const color =
    status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
    status === 'Overdue' ? 'bg-rose-100 text-rose-700' :
    status === 'Partially Paid' ? 'bg-amber-100 text-amber-700' :
    status === 'Cancelled' || status === 'Written Off' ? 'bg-slate-200 text-slate-500' :
    'bg-indigo-100 text-indigo-700';
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{status}</span>;
};

const RecordPaymentModal: React.FC<{ invoice: any; onClose: () => void; onRecord: (data: { amount: number; method: PaymentMethod; referenceNumber?: string; receivedDate?: string; notes?: string }) => void }> = ({ invoice, onClose, onRecord }) => {
  const [amount, setAmount] = useState(String(invoice.balanceDue));
  const [method, setMethod] = useState<PaymentMethod>('Bank Transfer');
  const [reference, setReference] = useState('');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Record Payment — {invoice.invoiceNumber}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onRecord({ amount: Number(amount), method, referenceNumber: reference }); }}
          className="space-y-4 pt-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount ({invoice.currency})</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} max={invoice.balanceDue} required className="input" />
            <p className="text-[11px] text-slate-400 mt-1">Balance due: {invoice.currency} {invoice.balanceDue.toLocaleString()}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value as PaymentMethod)} className="input">
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reference Number</label>
            <input value={reference} onChange={e => setReference(e.target.value)} className="input" placeholder="e.g. NEFT-88213" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm">Record Payment</button>
          </div>
        </form>
      </div>
    </div>
  );
};
