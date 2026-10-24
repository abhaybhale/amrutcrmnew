import React, { useState, useRef } from 'react';
import { useCRM } from '../../context/CRMContext';
import { RenewalRecord, RenewalStatus } from '../../types';
import Papa from 'papaparse';
import { previewHistoricalOrders, type HistoricalImportPreview } from '../../lib/historicalRenewalImport';
import { KanbanColumn, KanbanCard } from '../common/DragDropKanban';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  RefreshCw,
  Search,
  UploadCloud,
  X,
  User,
  Percent,
  AlertTriangle,
  Trash2,
  Check,
  Download,
  FileSpreadsheet
} from 'lucide-react';

const RENEWAL_STATUSES: RenewalStatus[] = ['Upcoming', 'Contacted', 'Quoted', 'Renewed', 'At Risk', 'Lost'];

const STATUS_COLORS: Record<RenewalStatus, string> = {
  'Upcoming': 'bg-slate-200 text-slate-700',
  'Contacted': 'bg-blue-100 text-blue-700',
  'Quoted': 'bg-indigo-100 text-indigo-700',
  'Renewed': 'bg-emerald-100 text-emerald-700',
  'At Risk': 'bg-amber-100 text-amber-700',
  'Lost': 'bg-rose-100 text-rose-700'
};

const CSV_TEMPLATE_HEADERS = ['accountName', 'vendorName', 'product', 'salespersonName', 'renewalDate', 'previousValue', 'currency', 'notes'];

export const RenewalBoard: React.FC = () => {
  const {
    currentUser,
    currentCompany,
    accessibleRenewals,
    allUsers,
    canManageRenewals,
    updateRenewalStatus,
    updateRenewalRecord,
    reassignRenewal,
    deleteRenewalRecord,
    bulkImportRenewalRecords,
    importHistoricalOrders,
    accounts,
    orders
  } = useCRM();

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [salespersonFilter, setSalespersonFilter] = useState(canManageRenewals ? 'ALL' : currentUser.id);
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [productType, setProductType] = useState('ALL');
  const [inspecting, setInspecting] = useState<RenewalRecord | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<Record<string, string>[] | null>(null);
  const [parseError, setParseError] = useState('');
  const [historicalPreview, setHistoricalPreview] = useState<HistoricalImportPreview | null>(null);
  const [includeInferredAccounts, setIncludeInferredAccounts] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const salespeople = allUsers.filter(u => u.role === 'Sales Person').sort((a, b) => a.name.localeCompare(b.name));
  const vendors = [...new Set(accessibleRenewals.map(record => record.vendorName).filter(Boolean))].sort((a, b) => a!.localeCompare(b!));
  const years = [...new Set(accessibleRenewals.map(record => record.renewalDate.slice(0, 4)))].sort().reverse();

  const filteredRenewals = accessibleRenewals.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.accountName.toLowerCase().includes(q) ||
      (r.vendorName || '').toLowerCase().includes(q) ||
      r.product.toLowerCase().includes(q) ||
      r.salespersonName.toLowerCase().includes(q);
    const matchesSalesperson = salespersonFilter === 'ALL' || r.salespersonId === salespersonFilter;
    const category = `${r.product} ${r.notes || ''}`.toLowerCase();
    const isSupport = /support|service|maintenance|amc|implementation|consulting/.test(category);
    return matchesSearch && matchesSalesperson
      && (vendorFilter === 'ALL' || r.vendorName === vendorFilter)
      && (yearFilter === 'ALL' || r.renewalDate.slice(0, 4) === yearFilter)
      && (!fromDate || r.renewalDate >= fromDate)
      && (!toDate || r.renewalDate <= toDate)
      && (productType === 'ALL' || (productType === 'SUPPORT' ? isSupport : !isSupport));
  });

  const totalUpcomingValue = filteredRenewals
    .filter(r => r.status !== 'Renewed' && r.status !== 'Lost')
    .reduce((s, r) => s + r.suggestedRenewalValue, 0);
  const atRiskCount = filteredRenewals.filter(r => r.status === 'At Risk').length;
  const renewedValue = filteredRenewals.filter(r => r.status === 'Renewed').reduce((s, r) => s + r.suggestedRenewalValue, 0);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const renewal = filteredRenewals.find(r => r.id === active.id);
    const targetStatus = String(over.id) as RenewalStatus;
    if (!renewal || renewal.status === targetStatus) return;
    updateRenewalStatus(renewal.id, targetStatus);
  };

  // ------------------------------------------------------------------
  // CSV Import (Admin / Sales Head one-time annual import)
  // ------------------------------------------------------------------
  const parseCsv = (text: string) => {
    setParseError('');
    setHistoricalPreview(null);
    setIncludeInferredAccounts(false);
    const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), {
      header: true, skipEmptyLines: 'greedy', transformHeader: header => header.trim()
    });
    const rows = parsed.data;
    if (parsed.errors.length || !rows.length) {
      setParseError(parsed.errors[0]?.message || 'Provide a CSV with a header and at least one data row.');
      setParsedRows(null);
      return;
    }
    const headers = parsed.meta.fields || [];
    if (headers.some(h => h.toLowerCase() === 'issue key')) {
      if (!headers.some(h => h.toLowerCase() === 'created') || !headers.some(h => h.toLowerCase() === 'total order value')) {
        setParseError('Jira order CSV requires Issue key, Created, and Total Order Value columns.');
        setParsedRows(null);
        return;
      }
      setHistoricalPreview(previewHistoricalOrders(rows, accounts, orders));
      setParsedRows(rows);
      return;
    }
    if (!headers.some(h => h.toLowerCase().includes('account'))) {
      setParseError('Could not find an "accountName" column — check your CSV header row.');
      setParsedRows(null);
      return;
    }
    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const sample = [
      CSV_TEMPLATE_HEADERS.join(','),
      'Tata Consultancy Services Ltd,Atlassian,Jira Software Data Center,Rajesh Kumar,2027-03-15,1850000,INR,',
      'HDFC Bank Ltd,Red Hat (IBM),Red Hat OpenShift Platform Plus,Priya Sharma,2027-04-20,3200000,INR,Renewal call scheduled'
    ].join('\n');
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'renewal_board_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const findKey = (row: Record<string, string>, needle: string) =>
    Object.keys(row).find(k => k.toLowerCase().replace(/\s+/g, '') === needle.toLowerCase());

  const handleConfirmImport = async () => {
    if (!parsedRows || parsedRows.length === 0) return;
    if (historicalPreview) {
      const ready = historicalPreview.ready.filter(row => includeInferredAccounts || !row.accountInferred);
      if (!ready.length) return;
      setImporting(true);
      try {
        await importHistoricalOrders(ready);
        setShowImportModal(false);
        setCsvText('');
        setParsedRows(null);
        setHistoricalPreview(null);
      } catch (error) {
        setParseError(error instanceof Error ? error.message : 'Import failed; retry the same file to resume safely.');
      } finally {
        setImporting(false);
      }
      return;
    }

    const records = parsedRows.map(row => {
      const get = (needle: string) => {
        const key = findKey(row, needle);
        return key ? row[key] : '';
      };
      const salespersonName = get('salespersonName') || get('salesperson');
      const matchedSalesperson = salespeople.find(u => u.name.toLowerCase() === salespersonName.toLowerCase());

      return {
        accountName: get('accountName') || get('account'),
        vendorName: get('vendorName') || get('vendor'),
        product: get('product'),
        salespersonId: matchedSalesperson?.id,
        salespersonName: matchedSalesperson?.name || salespersonName || currentUser.name,
        renewalDate: get('renewalDate') || get('date') || new Date().toISOString().split('T')[0],
        previousValue: Number(get('previousValue') || get('value')) || 0,
        currency: get('currency') || currentCompany.currency,
        notes: get('notes') || undefined
      };
    });

    const count = bulkImportRenewalRecords(records);
    if (count > 0) {
      setShowImportModal(false);
      setCsvText('');
      setParsedRows(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Annual Renewal Board</h1>
            <span className="bg-cyan-100 text-cyan-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {filteredRenewals.length} Renewals
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {canManageRenewals
              ? `Import the full year once — the board works automatically from there. Only reassign a renewal when the account's salesperson actually changes. Suggested value uses ${currentCompany.name}'s ${currentCompany.renewalPriceIncreasePercent}% uplift (Admin → Companies & Tax Config).`
              : 'Your assigned renewals for the year. Drag a card to update its status as you work each account.'}
          </p>
        </div>

        {canManageRenewals && (
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-[#0073EA] hover:bg-blue-600 text-white rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import Annual Renewals</span>
          </button>
        )}
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Open Pipeline Value</span>
          <span className="text-lg font-black text-slate-900 block mt-1">
            {currentCompany.currencySymbol}{(totalUpcomingValue / 100000).toFixed(1)}L
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">At Risk</span>
          <span className={`text-lg font-black block mt-1 ${atRiskCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {atRiskCount} Accounts
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Renewed This Year</span>
          <span className="text-lg font-black text-emerald-600 block mt-1">
            {currentCompany.currencySymbol}{(renewedValue / 100000).toFixed(1)}L
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search account, vendor, product, salesperson..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
          />
        </div>
        {canManageRenewals && (
          <select
            value={salespersonFilter}
            onChange={(e) => setSalespersonFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
          >
            <option value="ALL">All Salespeople</option>
            {salespeople.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select aria-label="Renewal vendor" value={vendorFilter} onChange={event => setVendorFilter(event.target.value)} className="rounded border bg-white p-2 text-xs"><option value="ALL">All vendors</option>{vendors.map(vendor => <option key={vendor}>{vendor}</option>)}</select>
        <select aria-label="Renewal year" value={yearFilter} onChange={event => setYearFilter(event.target.value)} className="rounded border bg-white p-2 text-xs"><option value="ALL">All years</option>{years.map(year => <option key={year}>{year}</option>)}</select>
        <input aria-label="Renewal from date" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className="rounded border bg-white p-2 text-xs" />
        <input aria-label="Renewal to date" type="date" value={toDate} onChange={event => setToDate(event.target.value)} className="rounded border bg-white p-2 text-xs" />
        <select aria-label="Renewal product or support" value={productType} onChange={event => setProductType(event.target.value)} className="rounded border bg-white p-2 text-xs"><option value="ALL">Product and support</option><option value="PRODUCT">Product</option><option value="SUPPORT">Services / support</option></select>
      </div>
      <div className="flex justify-end gap-2 text-sm"><button onClick={() => setViewMode('table')} className={`rounded-lg px-4 py-2 ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'bg-white'}`}>Table</button><button onClick={() => setViewMode('kanban')} className={`rounded-lg px-4 py-2 ${viewMode === 'kanban' ? 'bg-slate-900 text-white' : 'bg-white'}`}>Kanban</button></div>
      {viewMode === 'table' && <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr>{['Account','Vendor','Product','Salesperson','Renewal date','Value','Status'].map(header => <th key={header} className="p-3">{header}</th>)}</tr></thead><tbody>{[...filteredRenewals].sort((a,b) => a.accountName.localeCompare(b.accountName)).map(renewal => <tr key={renewal.id} className="cursor-pointer border-t hover:bg-slate-50" onClick={() => setInspecting(renewal)}><td className="p-3 font-semibold">{renewal.accountName}</td><td className="p-3">{renewal.vendorName}</td><td className="p-3">{renewal.product}</td><td className="p-3">{renewal.salespersonName}</td><td className="p-3">{renewal.renewalDate}</td><td className="p-3">{renewal.currency} {renewal.suggestedRenewalValue.toLocaleString('en-IN')}</td><td className="p-3">{renewal.status}</td></tr>)}</tbody></table></div>}
      {viewMode === 'kanban' &&
      <DndContext sensors={dndSensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {RENEWAL_STATUSES.map((status) => {
            const statusRenewals = filteredRenewals.filter(r => r.status === status);
            const statusValue = statusRenewals.reduce((s, r) => s + r.suggestedRenewalValue, 0);

            return (
              <KanbanColumn
                key={status}
                id={status}
                className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200 flex flex-col min-w-[230px]"
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
                    {status}
                  </span>
                  <span className="bg-slate-200 text-slate-700 text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                    {statusRenewals.length}
                  </span>
                </div>
                <div className="px-1 mb-2 text-[10px] text-slate-500 font-semibold">
                  {currentCompany.currencySymbol}{(statusValue / 100000).toFixed(1)}L
                </div>

                <div className="space-y-2.5 flex-1 min-h-[64px]">
                  {statusRenewals.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-[11px] border border-dashed border-slate-200 rounded-xl">
                      Drop here
                    </div>
                  ) : (
                    statusRenewals.map((renewal) => (
                      <KanbanCard
                        key={renewal.id}
                        id={renewal.id}
                        onClick={() => setInspecting(renewal)}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-cyan-300 transition-all space-y-1.5"
                      >
                        <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{renewal.accountName}</h4>
                        <p className="text-cyan-700 font-medium text-[11px] line-clamp-1">{renewal.product}</p>
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                          <span className="font-black text-slate-900">
                            {renewal.currency === 'INR' ? '₹' : renewal.currency + ' '}{(renewal.suggestedRenewalValue / 100000).toFixed(1)}L
                          </span>
                          <span className="text-slate-500 font-medium truncate max-w-[80px]">{renewal.salespersonName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Renews {new Date(renewal.renewalDate).toLocaleDateString()}
                        </div>
                      </KanbanCard>
                    ))
                  )}
                </div>
              </KanbanColumn>
            );
          })}
        </div>
      </DndContext>
      }

      {/* Inspection Modal */}
      {inspecting && (() => {
        const canEditNotes = canManageRenewals || inspecting.salespersonId === currentUser.id;
        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{inspecting.accountName}</h3>
                  <p className="text-xs text-slate-500">{inspecting.vendorName} · {inspecting.product}</p>
                </div>
                <button onClick={() => setInspecting(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Renewal Date</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{new Date(inspecting.renewalDate).toLocaleDateString()}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Status</p>
                  <select
                    value={inspecting.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as RenewalStatus;
                      updateRenewalStatus(inspecting.id, newStatus);
                      setInspecting({ ...inspecting, status: newStatus });
                    }}
                    className="w-full mt-0.5 text-sm font-bold text-slate-800 bg-transparent outline-none"
                  >
                    {RENEWAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Previous Value</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {inspecting.currency === 'INR' ? '₹' : inspecting.currency + ' '}{inspecting.previousValue.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center space-x-1">
                    <Percent className="w-3 h-3" />
                    <span>Suggested Renewal Value</span>
                  </p>
                  <p className="text-sm font-bold text-emerald-700 mt-0.5">
                    {inspecting.currency === 'INR' ? '₹' : inspecting.currency + ' '}{inspecting.suggestedRenewalValue.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Salesperson / Reassignment */}
              <div className="pt-3 border-t border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>Assigned Salesperson</span>
                </p>
                {canManageRenewals ? (
                  <select
                    value={inspecting.salespersonId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      reassignRenewal(inspecting.id, newId);
                      const newUser = salespeople.find(u => u.id === newId);
                      if (newUser) {
                        setInspecting({
                          ...inspecting,
                          reassignedFromId: inspecting.salespersonId,
                          reassignedFromName: inspecting.salespersonName,
                          salespersonId: newUser.id,
                          salespersonName: newUser.name
                        });
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    {salespeople.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm font-bold text-slate-800">{inspecting.salespersonName}</p>
                )}
                {inspecting.reassignedFromName && (
                  <p className="text-[11px] text-amber-600 mt-1">Reassigned from {inspecting.reassignedFromName}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  disabled={!canEditNotes}
                  value={inspecting.notes || ''}
                  onChange={(e) => setInspecting({ ...inspecting, notes: e.target.value })}
                  onBlur={(e) => updateRenewalRecord(inspecting.id, { notes: e.target.value })}
                  placeholder="Add context — budget status, competitor threat, escalation needed..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {inspecting.status === 'At Risk' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-amber-900 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>This renewal is flagged At Risk — consider a Sales Head escalation before the renewal date.</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {canManageRenewals ? (
                  <button
                    onClick={() => { deleteRenewalRecord(inspecting.id); setInspecting(null); }}
                    className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </button>
                ) : <span />}
                <button
                  onClick={() => setInspecting(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0073EA] hover:bg-blue-600 rounded-xl transition-all shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Import Modal */}
      {showImportModal && canManageRenewals && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Import Annual Renewal Data</h3>
                <p className="text-xs text-slate-500">One-time yearly import — the board is worked from here afterward.</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadTemplate}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV Template</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Upload CSV File</span>
              </button>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Or paste CSV data (columns: {CSV_TEMPLATE_HEADERS.join(', ')})
              </label>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => { setCsvText(e.target.value); parseCsv(e.target.value); }}
                placeholder="accountName,vendorName,product,salespersonName,renewalDate,previousValue,currency,notes"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
              />
              {parseError && <p className="text-[11px] text-rose-600 mt-1">{parseError}</p>}
            </div>

            {parsedRows && parsedRows.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600">
                  {historicalPreview ? `${historicalPreview.ready.length} orders matched; ${historicalPreview.skipped.length} skipped` : `${parsedRows.length} row(s) ready to import`}
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 8).map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-1.5 font-semibold text-slate-800">{row.accountName || row.account || row['Client Name'] || row['Issue key']}</td>
                          <td className="px-3 py-1.5 text-slate-500">{row.vendorName || row.vendor || row.OEM}</td>
                          <td className="px-3 py-1.5 text-slate-500">{row.product || row['End User Name']}</td>
                          <td className="px-3 py-1.5 text-slate-500">{row.salespersonName || row.salesperson || row.Created}</td>
                          <td className="px-3 py-1.5 text-slate-500">{row.previousValue || row.value || row['Total Order Value']}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 8 && (
                    <p className="text-[10px] text-slate-400 px-3 py-1.5">…and {parsedRows.length - 8} more</p>
                  )}
                </div>
              </div>
            )}

            {historicalPreview && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
              <p><strong>Historical Jira import:</strong> creates linked accounts, contacts, orders and renewals. {historicalPreview.inferredAccounts} rows have a client name inferred from one matching email. {historicalPreview.existingOrders} orders are already present.</p>
              <p>Product and services amounts follow the value columns. {historicalPreview.inferredValueSplits} rows have a missing amount allocated using “Type of Order”; unreconciled rows are skipped for review.</p>
              <p>{historicalPreview.existingAccounts} customer names match existing accounts; {historicalPreview.newAccounts} distinct names would create accounts. Matching ignores case and punctuation only.</p>
              <p>Jira Created is used as the order date. Renewal is estimated 12 months later because the CSV has no expiry date. Billing, delivery and salesperson need verification.</p>
              <label className="flex items-center gap-2"><input type="checkbox" checked={includeInferredAccounts} onChange={event => setIncludeInferredAccounts(event.target.checked)} /> Include {historicalPreview.inferredAccounts} inferred client matches (review source data first)</label>
              {historicalPreview.skipped.length > 0 && <button className="underline font-semibold" onClick={() => {
                const blob = new Blob([Papa.unparse(historicalPreview.skipped)], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a'); link.href = url; link.download = 'renewal-import-skipped.csv'; link.click(); URL.revokeObjectURL(url);
              }}>Download skipped issue list</button>}
            </div>}

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing || !parsedRows || parsedRows.length === 0 || (historicalPreview !== null && !historicalPreview.ready.some(row => includeInferredAccounts || !row.accountInferred))}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#0073EA] hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{importing ? 'Importing…' : historicalPreview ? `Import ${historicalPreview.ready.filter(row => includeInferredAccounts || !row.accountInferred).length} Orders + Renewals` : `Import ${parsedRows?.length || 0} Renewals`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
