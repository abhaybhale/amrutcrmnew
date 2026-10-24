import React, { useState } from 'react';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useCRM } from '../../context/CRMContext';
import { INITIAL_ACCOUNTS, INITIAL_CONTACTS, INITIAL_LEADS, INITIAL_OPPORTUNITIES, INITIAL_QUOTES, INITIAL_ORDERS } from '../../data/initialData';
import { INITIAL_RENEWAL_RECORDS } from '../../data/productCatalogData';
import { applyDuplicatePlan, previewDuplicateCustomers, type DuplicatePlan } from '../../lib/deduplicateCustomers';

const businessCollections = ['accounts', 'contacts', 'leads', 'opportunities', 'quotes', 'orders', 'renewalRecords'] as const;
type BusinessCollection = typeof businessCollections[number];
const demoIds: Record<BusinessCollection, Set<string>> = {
  accounts: new Set(INITIAL_ACCOUNTS.map(row => row.id)),
  contacts: new Set(INITIAL_CONTACTS.map(row => row.id)),
  leads: new Set(INITIAL_LEADS.map(row => row.id)),
  opportunities: new Set(INITIAL_OPPORTUNITIES.map(row => row.id)),
  quotes: new Set(INITIAL_QUOTES.map(row => row.id)),
  orders: new Set(INITIAL_ORDERS.map(row => row.id)),
  renewalRecords: new Set(INITIAL_RENEWAL_RECORDS.map(row => row.id))
};

export const DataManagementTab: React.FC = () => {
  const { currentUser } = useCRM();
  const [counts, setCounts] = useState<Record<BusinessCollection, { all: number; demo: number }> | null>(null);
  const [selected, setSelected] = useState<BusinessCollection>('leads');
  const [demoConfirmation, setDemoConfirmation] = useState('');
  const [dangerConfirmation, setDangerConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [duplicatePlan, setDuplicatePlan] = useState<DuplicatePlan | null>(null);
  const [duplicateConfirmation, setDuplicateConfirmation] = useState('');
  const isAdmin = currentUser.role === 'CRM Administrator' || currentUser.role === 'Managing Director';
  const confirmed = (value: string, phrase: string) => value.trim().replace(/\s+/g, ' ').toUpperCase() === phrase;

  const scan = async () => {
    setBusy(true);
    setMessage('');
    try {
      const next = {} as Record<BusinessCollection, { all: number; demo: number }>;
      for (const name of businessCollections) {
        const snapshot = await getDocs(collection(db, name));
        next[name] = { all: snapshot.size, demo: snapshot.docs.filter(record => demoIds[name].has(record.id)).length };
      }
      setCounts(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not scan records.');
    } finally {
      setBusy(false);
    }
  };

  const removeRecords = async (demoOnly: boolean) => {
    if (!isAdmin) return;
    const expected = demoOnly ? 'DELETE DEMO RECORDS' : `DELETE ${selected.toUpperCase()}`;
    if (!confirmed(demoOnly ? demoConfirmation : dangerConfirmation, expected)) return;
    setBusy(true);
    setMessage('');
    try {
      let removed = 0;
      const names = demoOnly ? businessCollections : [selected];
      for (const name of names) {
        const snapshot = await getDocs(collection(db, name));
        const records = demoOnly ? snapshot.docs.filter(record => demoIds[name].has(record.id)) : snapshot.docs;
        for (let start = 0; start < records.length; start += 400) {
          const batch = writeBatch(db);
          records.slice(start, start + 400).forEach(record => batch.delete(doc(db, name, record.id)));
          await batch.commit();
          removed += Math.min(400, records.length - start);
          setMessage(`${removed} records deleted so far…`);
        }
      }
      setDemoConfirmation('');
      setDangerConfirmation('');
      await scan();
      setMessage(`${removed} records deleted. Audit logs and staff accounts were retained.`);
    } catch (error) {
      setMessage(`Deletion stopped: ${error instanceof Error ? error.message : 'unknown error'}. Scan again before retrying.`);
    } finally {
      setBusy(false);
    }
  };

  const previewDuplicates = async () => {
    setBusy(true);
    setMessage('Checking accounts, contacts and linked records…');
    try {
      const plan = await previewDuplicateCustomers();
      setDuplicatePlan(plan);
      setMessage(`Found ${plan.accounts} duplicate accounts and ${plan.contacts} duplicate contacts. ${plan.references} linked records need updating.`);
    } catch (error) {
      setMessage(`Duplicate scan failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally { setBusy(false); }
  };

  const mergeDuplicates = async () => {
    if (!duplicatePlan || !confirmed(duplicateConfirmation, 'MERGE DUPLICATES')) return;
    setBusy(true);
    try {
      await applyDuplicatePlan(duplicatePlan, setMessage);
      setMessage(`Removed ${duplicatePlan.accounts} duplicate accounts and ${duplicatePlan.contacts} duplicate contacts; updated ${duplicatePlan.references} linked records.`);
      setDuplicatePlan(null);
      setDuplicateConfirmation('');
    } catch (error) {
      setMessage(`Merge stopped: ${error instanceof Error ? error.message : 'unknown error'}. Scan again before retrying.`);
      setDuplicatePlan(null);
    } finally { setBusy(false); }
  };

  if (!isAdmin) return <p className="text-sm text-slate-600">Administrator access required.</p>;

  return <div className="space-y-6">
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold">Data Management</h2>
      <p className="mt-1 text-sm text-slate-600">Scan live records to review counts. Type the shown phrase to enable deletion; capitalization and surrounding spaces do not matter. Deletion cannot be undone.</p>
      <button disabled={busy} onClick={scan} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Working…' : 'Scan record counts'}</button>
      {counts && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{businessCollections.map(name => <div key={name} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{name}</strong><div>{counts[name].all} total · {counts[name].demo} bundled demo</div></div>)}</div>}
      {message && <p role="status" className="mt-3 text-sm text-slate-700">{message}</p>}
    </div>

    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
      <h3 className="font-bold text-amber-950">Delete demo records</h3>
      <p className="mt-1 text-sm text-amber-900">Deletes only bundled demo IDs found in Accounts, Contacts, Leads, Opportunities, Quotes, Orders and Renewals. Imported Jira records are retained.</p>
      <input value={demoConfirmation} onChange={event => setDemoConfirmation(event.target.value)} placeholder="Type DELETE DEMO RECORDS" className="mt-3 w-full rounded-lg border border-amber-300 px-3 py-2 text-sm" />
      <p className="mt-2 text-xs font-semibold text-amber-900">Confirmation: DELETE DEMO RECORDS</p>
      <button disabled={busy || !confirmed(demoConfirmation, 'DELETE DEMO RECORDS')} onClick={() => void removeRecords(true)} className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Delete demo records</button>
    </div>

    <div className="rounded-xl border border-blue-300 bg-blue-50 p-5">
      <h3 className="font-bold text-blue-950">Remove duplicate accounts and contacts</h3>
      <p className="mt-1 text-sm text-blue-900">Matches accounts by the same name and company. Matches contacts by email across accounts, or by name and phone within an account. All account links and linked records are moved to the oldest matching record before duplicates are removed.</p>
      <button disabled={busy} onClick={() => void previewDuplicates()} className="mt-3 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Scan duplicates</button>
      {duplicatePlan && <div className="mt-3 text-sm text-blue-950"><p>{duplicatePlan.accounts} accounts · {duplicatePlan.contacts} contacts · {duplicatePlan.references} linked records</p><p className="mt-1">Account examples: {duplicatePlan.accountExamples.join(', ') || 'none'}</p><p>Contact examples: {duplicatePlan.contactExamples.join(', ') || 'none'}</p><input value={duplicateConfirmation} onChange={event => setDuplicateConfirmation(event.target.value)} placeholder="Type MERGE DUPLICATES" className="mt-3 block w-full rounded-lg border border-blue-300 p-2" /><button disabled={busy || !confirmed(duplicateConfirmation, 'MERGE DUPLICATES') || !duplicatePlan.removals.length} onClick={() => void mergeDuplicates()} className="mt-3 rounded-lg bg-blue-800 px-4 py-2 font-semibold text-white disabled:opacity-50">Merge and delete duplicates</button></div>}
    </div>

    <div className="rounded-xl border border-red-300 bg-red-50 p-5">
      <h3 className="font-bold text-red-950">Danger zone: delete module data</h3>
      <p className="mt-1 text-sm text-red-900">Deletes every record in the selected module, including live customer data. Related modules are retained and may still reference deleted records. Staff accounts, configuration and audit logs are retained.</p>
      <select value={selected} onChange={event => { setSelected(event.target.value as BusinessCollection); setDangerConfirmation(''); }} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm">{businessCollections.map(name => <option key={name} value={name}>{name} {counts ? `(${counts[name].all})` : ''}</option>)}</select>
      <input value={dangerConfirmation} onChange={event => setDangerConfirmation(event.target.value)} placeholder={`Type DELETE ${selected.toUpperCase()}`} className="mt-3 block w-full rounded-lg border border-red-300 px-3 py-2 text-sm" />
      <p className="mt-2 text-xs font-semibold text-red-900">Confirmation: DELETE {selected.toUpperCase()}</p>
      <button disabled={busy || !confirmed(dangerConfirmation, `DELETE ${selected.toUpperCase()}`)} onClick={() => void removeRecords(false)} className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Delete all {selected} records</button>
    </div>
  </div>;
};
