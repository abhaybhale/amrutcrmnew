import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { Invoice, Payment, Expense, InvoiceStatus, PaymentMethod } from '../types';
import { INITIAL_INVOICES, INITIAL_PAYMENTS, INITIAL_EXPENSES } from '../data/marketingFinanceData';
import { useCRM } from './CRMContext';
import { useSyncedCollection } from '../lib/useSyncedCollection';

export interface ARAgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  invoices: Invoice[];
  total: number;
}

interface FinanceContextType {
  invoices: Invoice[];
  accessibleInvoices: Invoice[];
  payments: Payment[];
  accessiblePayments: Payment[];
  expenses: Expense[];
  accessibleExpenses: Expense[];

  createInvoiceFromOrder: (orderId: string) => Invoice | null;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  recordPayment: (invoiceId: string, data: { amount: number; method: PaymentMethod; referenceNumber?: string; receivedDate?: string; notes?: string }) => void;

  createExpense: (data: Partial<Expense>) => Expense;
  updateExpenseStatus: (id: string, status: Expense['status']) => void;

  arAgingBuckets: ARAgingBucket[];
  revenueSummary: { totalInvoiced: number; totalCollected: number; totalOutstanding: number; overdueCount: number };
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const daysBetween = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / 86400000);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, currentCompanyId, orders, showToast, roles, isAuthenticated } = useCRM();

  const [invoices, setInvoices] = useSyncedCollection<Invoice>('invoices', INITIAL_INVOICES, isAuthenticated);
  const [payments, setPayments] = useSyncedCollection<Payment>('payments', INITIAL_PAYMENTS, isAuthenticated);
  const [expenses, setExpenses] = useSyncedCollection<Expense>('expenses', INITIAL_EXPENSES, isAuthenticated);

  const canSeeAllFinance = useMemo(() => {
    if (
      currentUser.role === 'Managing Director' ||
      currentUser.role === 'CRM Administrator' ||
      currentUser.role === 'CRM Coordinator' ||
      currentUser.role === 'Finance & Operations' ||
      currentUser.role === 'Finance & Commercial Operations' ||
      currentUser.role === 'Accounts Head' ||
      currentUser.role === 'Accounts Manager'
    ) {
      return true;
    }
    const roleDef = roles.find(r => r.name === currentUser.role);
    return !!roleDef?.permissions?.canViewAllFinance;
  }, [currentUser, roles]);

  const accessibleInvoices = useMemo(() => {
    const scoped = invoices.filter(i => i.companyId === currentCompanyId);
    return canSeeAllFinance ? scoped : scoped.filter(i => i.salespersonId === currentUser.id);
  }, [invoices, currentCompanyId, canSeeAllFinance, currentUser.id]);

  const accessiblePayments = useMemo(() => {
    const scoped = payments.filter(p => p.companyId === currentCompanyId);
    if (canSeeAllFinance) return scoped;
    const myInvoiceIds = new Set(accessibleInvoices.map(i => i.id));
    return scoped.filter(p => myInvoiceIds.has(p.invoiceId));
  }, [payments, currentCompanyId, canSeeAllFinance, accessibleInvoices]);

  const accessibleExpenses = useMemo(() => {
    const scoped = expenses.filter(e => e.companyId === currentCompanyId);
    return canSeeAllFinance ? scoped : scoped.filter(e => e.createdById === currentUser.id);
  }, [expenses, currentCompanyId, canSeeAllFinance, currentUser.id]);

  const createInvoiceFromOrder = (orderId: string): Invoice | null => {
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      showToast('Order not found — cannot generate invoice.', 'error');
      return null;
    }
    if (invoices.some(i => i.orderId === orderId)) {
      showToast('An invoice already exists for this order.', 'warning');
      return invoices.find(i => i.orderId === orderId) || null;
    }

    const taxPercent = 18;
    const subtotal = order.totalAmount;
    const taxAmount = Math.round(subtotal * (taxPercent / 100));
    const grandTotal = subtotal + taxAmount;
    const now = new Date();
    const dueDate = new Date(now.getTime() + 30 * 86400000);

    const newInvoice: Invoice = {
      id: 'inv_' + Date.now(),
      invoiceNumber: 'INV-' + now.getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
      companyId: currentCompanyId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      accountId: order.accountId,
      accountName: order.accountName,
      salespersonId: order.salespersonId,
      salespersonName: order.salespersonName,
      currency: order.currency,
      items: [
        ...(order.softwareAmount > 0 ? [{ id: 'li_sw', description: `${order.product} — Software / License`, quantity: 1, unitPrice: order.softwareAmount, taxPercent, amount: order.softwareAmount }] : []),
        ...(order.servicesAmount > 0 ? [{ id: 'li_svc', description: `${order.product} — Services / Implementation`, quantity: 1, unitPrice: order.servicesAmount, taxPercent, amount: order.servicesAmount }] : [])
      ],
      subtotal,
      taxAmount,
      grandTotal,
      amountPaid: 0,
      balanceDue: grandTotal,
      invoiceDate: now.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'Sent',
      createdDate: now.toISOString()
    };

    setInvoices(prev => [newInvoice, ...prev]);
    showToast(`Invoice ${newInvoice.invoiceNumber} generated for ${order.accountName}`, 'success');
    return newInvoice;
  };

  const updateInvoice = (id: string, data: Partial<Invoice>) => {
    setInvoices(prev => prev.map(i => (i.id === id ? { ...i, ...data } : i)));
  };

  const recordPayment = (invoiceId: string, data: { amount: number; method: PaymentMethod; referenceNumber?: string; receivedDate?: string; notes?: string }) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    const newPayment: Payment = {
      id: 'pay_' + Date.now(),
      companyId: currentCompanyId,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      accountId: invoice.accountId,
      accountName: invoice.accountName,
      amount: data.amount,
      currency: invoice.currency,
      method: data.method,
      referenceNumber: data.referenceNumber,
      receivedDate: data.receivedDate || new Date().toISOString().split('T')[0],
      recordedById: currentUser.id,
      recordedByName: currentUser.name,
      notes: data.notes,
      createdDate: new Date().toISOString()
    };
    setPayments(prev => [newPayment, ...prev]);

    const newAmountPaid = invoice.amountPaid + data.amount;
    const newBalance = Math.max(0, invoice.grandTotal - newAmountPaid);
    let status: InvoiceStatus = invoice.status;
    if (newBalance <= 0) status = 'Paid';
    else if (newAmountPaid > 0) status = 'Partially Paid';

    setInvoices(prev => prev.map(i => (i.id === invoiceId ? { ...i, amountPaid: newAmountPaid, balanceDue: newBalance, status } : i)));
    showToast(`Payment of ${invoice.currency} ${data.amount.toLocaleString()} recorded against ${invoice.invoiceNumber}`, 'success');
  };

  const createExpense = (data: Partial<Expense>): Expense => {
    const newExpense: Expense = {
      id: 'exp_' + Date.now(),
      companyId: data.companyId || currentCompanyId,
      category: data.category || 'Other',
      description: data.description || '',
      amount: data.amount || 0,
      currency: data.currency || 'INR (₹)',
      linkedProjectId: data.linkedProjectId,
      linkedCampaignId: data.linkedCampaignId,
      linkedOrderId: data.linkedOrderId,
      incurredDate: data.incurredDate || new Date().toISOString().split('T')[0],
      status: 'Pending Approval',
      createdById: currentUser.id,
      createdByName: currentUser.name,
      createdDate: new Date().toISOString()
    };
    setExpenses(prev => [newExpense, ...prev]);
    showToast(`Expense logged: ${newExpense.description}`, 'success');
    return newExpense;
  };

  const updateExpenseStatus = (id: string, status: Expense['status']) => {
    setExpenses(prev => prev.map(e => (e.id === id ? { ...e, status, approvedById: status === 'Approved' ? currentUser.id : e.approvedById } : e)));
  };

  const arAgingBuckets = useMemo((): ARAgingBucket[] => {
    const now = new Date();
    const outstanding = accessibleInvoices.filter(i => i.balanceDue > 0);
    const buckets: ARAgingBucket[] = [
      { label: 'Current (0-30 days)', minDays: 0, maxDays: 30, invoices: [], total: 0 },
      { label: '31-60 days', minDays: 31, maxDays: 60, invoices: [], total: 0 },
      { label: '61-90 days', minDays: 61, maxDays: 90, invoices: [], total: 0 },
      { label: '90+ days (at risk)', minDays: 91, maxDays: null, invoices: [], total: 0 }
    ];
    outstanding.forEach(inv => {
      const age = daysBetween(now, new Date(inv.dueDate));
      const bucket = buckets.find(b => age >= b.minDays && (b.maxDays === null || age <= b.maxDays)) || buckets[0];
      bucket.invoices.push(inv);
      bucket.total += inv.balanceDue;
    });
    return buckets;
  }, [accessibleInvoices]);

  const revenueSummary = useMemo(() => {
    const totalInvoiced = accessibleInvoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalCollected = accessibleInvoices.reduce((s, i) => s + i.amountPaid, 0);
    const totalOutstanding = accessibleInvoices.reduce((s, i) => s + i.balanceDue, 0);
    const overdueCount = accessibleInvoices.filter(i => i.balanceDue > 0 && new Date(i.dueDate) < new Date()).length;
    return { totalInvoiced, totalCollected, totalOutstanding, overdueCount };
  }, [accessibleInvoices]);

  return (
    <FinanceContext.Provider
      value={{
        invoices,
        accessibleInvoices,
        payments,
        accessiblePayments,
        expenses,
        accessibleExpenses,
        createInvoiceFromOrder,
        updateInvoice,
        recordPayment,
        createExpense,
        updateExpenseStatus,
        arAgingBuckets,
        revenueSummary
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
