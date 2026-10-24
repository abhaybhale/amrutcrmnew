import { collection, getDocs, writeBatch, doc, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from './firebase';

type Row = { id: string; data: DocumentData; ref: QueryDocumentSnapshot['ref'] };
type Change = { collection: string; id: string; patch: DocumentData };
export type DuplicatePlan = { accounts: number; contacts: number; references: number; accountExamples: string[]; contactExamples: string[]; changes: Change[]; removals: { collection: string; id: string }[] };
const norm = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
const key = (value: unknown) => norm(value).replace(/[.,]/g, '');
const related = ['contacts', 'leads', 'opportunities', 'presalesRequests', 'pocRecords', 'quotes', 'orders', 'renewalRecords', 'tasks'];

export async function previewDuplicateCustomers(): Promise<DuplicatePlan> {
  const names = ['accounts', ...related];
  const snapshots = await Promise.all(names.map(async name => [name, (await getDocs(collection(db, name))).docs.map(record => ({ id: record.id, data: record.data(), ref: record.ref }))] as const));
  const rows = new Map<string, Row[]>(snapshots);
  const accountGroups = new Map<string, Row[]>();
  for (const row of rows.get('accounts') || []) {
    if (!key(row.data.name)) continue;
    const groupKey = `${norm(row.data.companyId)}|${key(row.data.name)}`;
    accountGroups.set(groupKey, [...(accountGroups.get(groupKey) || []), row]);
  }
  const accountMap = new Map<string, Row>();
  const accountExamples: string[] = [];
  for (const group of accountGroups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => String(a.data.createdDate || '').localeCompare(String(b.data.createdDate || '')) || a.id.localeCompare(b.id));
    accountExamples.push(`${group[0].data.name} (${group.length})`);
    for (const duplicate of group.slice(1)) accountMap.set(duplicate.id, group[0]);
  }
  const contactGroups = new Map<string, Row[]>();
  for (const row of rows.get('contacts') || []) {
    const accountId = accountMap.get(row.data.accountId)?.id || row.data.accountId;
    const identity = norm(row.data.email) ? `email:${norm(row.data.email)}|${key(row.data.name)}` : key(row.data.name) && norm(row.data.phone || row.data.mobile) ? `account:${accountId}|${key(row.data.name)}|${norm(row.data.phone || row.data.mobile)}` : '';
    if (!accountId || !identity) continue;
    const groupKey = identity;
    contactGroups.set(groupKey, [...(contactGroups.get(groupKey) || []), row]);
  }
  const contactMap = new Map<string, Row>();
  const contactExamples: string[] = [];
  for (const group of contactGroups.values()) {
    if (group.length < 2) continue;
    const emails = new Set(group.map(row => norm(row.data.email)).filter(Boolean));
    if (emails.size > 1) continue;
    group.sort((a, b) => String(a.data.createdDate || '').localeCompare(String(b.data.createdDate || '')) || a.id.localeCompare(b.id));
    contactExamples.push(`${group[0].data.name} (${group.length})`);
    for (const duplicate of group.slice(1)) contactMap.set(duplicate.id, group[0]);
  }
  const changes: Change[] = [];
  for (const group of contactGroups.values()) {
    if (group.length < 2 || !group.slice(1).some(row => contactMap.has(row.id))) continue;
    const canonical = group.find(row => !contactMap.has(row.id))!;
    const accountIds = [...new Set(group.flatMap(row => [row.data.accountId, ...(row.data.accountIds || [])]).map(id => accountMap.get(id)?.id || id).filter(Boolean))];
    const accountNames = [...new Set(group.flatMap(row => [row.data.accountName, ...(row.data.accountNames || [])]).filter(Boolean))];
    changes.push({ collection: 'contacts', id: canonical.id, patch: { accountIds, accountNames } });
  }
  for (const name of related) for (const row of rows.get(name) || []) {
    if (name === 'contacts' && contactMap.has(row.id)) continue;
    const patch: DocumentData = {};
    const account = accountMap.get(row.data.accountId);
    if (account) {
      patch.accountId = account.id;
      if ('accountName' in row.data) patch.accountName = account.data.name;
    }
    for (const field of ['contactId', 'primaryContactId']) {
      const contact = contactMap.get(row.data[field]);
      if (contact) {
        patch[field] = contact.id;
        const nameField = field === 'primaryContactId' ? 'primaryContactName' : 'contactName';
        if (nameField in row.data) patch[nameField] = contact.data.name;
      }
    }
    if (Array.isArray(row.data.secondaryContactIds)) {
      const ids = [...new Set(row.data.secondaryContactIds.map((id: string) => contactMap.get(id)?.id || id))];
      if (ids.some((id, index) => id !== row.data.secondaryContactIds[index]) || ids.length !== row.data.secondaryContactIds.length) patch.secondaryContactIds = ids;
    }
    if (Object.keys(patch).length) changes.push({ collection: name, id: row.id, patch });
  }
  return { accounts: accountMap.size, contacts: contactMap.size, references: changes.length, accountExamples: accountExamples.slice(0, 10), contactExamples: contactExamples.slice(0, 10), changes,
    removals: [...accountMap.keys()].map(id => ({ collection: 'accounts', id })).concat([...contactMap.keys()].map(id => ({ collection: 'contacts', id })) ) };
}

export async function applyDuplicatePlan(plan: DuplicatePlan, onProgress: (message: string) => void): Promise<void> {
  for (let start = 0; start < plan.changes.length; start += 350) {
    const batch = writeBatch(db);
    for (const change of plan.changes.slice(start, start + 350)) batch.update(doc(db, change.collection, change.id), change.patch);
    await batch.commit();
    onProgress(`Updated ${Math.min(start + 350, plan.changes.length)} of ${plan.changes.length} linked records`);
  }
  for (let start = 0; start < plan.removals.length; start += 350) {
    const batch = writeBatch(db);
    for (const removal of plan.removals.slice(start, start + 350)) batch.delete(doc(db, removal.collection, removal.id));
    await batch.commit();
    onProgress(`Removed ${Math.min(start + 350, plan.removals.length)} of ${plan.removals.length} duplicate records`);
  }
}

export async function previewManualAccountMerge(keeperId: string, duplicateIds: string[]): Promise<DuplicatePlan> {
  const selected = new Set(duplicateIds.filter(id => id !== keeperId));
  const names = ['accounts', ...related];
  const snapshots = await Promise.all(names.map(async name => [name, (await getDocs(collection(db, name))).docs.map(record => ({ id: record.id, data: record.data(), ref: record.ref }))] as const));
  const rows = new Map<string, Row[]>(snapshots);
  const keeper = (rows.get('accounts') || []).find(row => row.id === keeperId);
  if (!keeper) throw new Error('Primary account was not found.');
  const changes: Change[] = [];
  for (const name of related) for (const row of rows.get(name) || []) {
    const patch: DocumentData = {};
    if (selected.has(row.data.accountId)) {
      patch.accountId = keeperId;
      if ('accountName' in row.data) patch.accountName = keeper.data.name;
    }
    if (Array.isArray(row.data.accountIds)) {
      const accountIds = [...new Set(row.data.accountIds.map((id: string) => selected.has(id) ? keeperId : id))];
      if (accountIds.join('|') !== row.data.accountIds.join('|')) patch.accountIds = accountIds;
    }
    if (Array.isArray(row.data.accountNames) && Object.keys(patch).length) {
      patch.accountNames = [...new Set([keeper.data.name, ...row.data.accountNames])];
    }
    if (Object.keys(patch).length) changes.push({ collection: name, id: row.id, patch });
  }
  return {
    accounts: selected.size,
    contacts: 0,
    references: changes.length,
    accountExamples: [...selected].map(id => (rows.get('accounts') || []).find(row => row.id === id)?.data.name).filter(Boolean),
    contactExamples: [],
    changes,
    removals: [...selected].map(id => ({ collection: 'accounts', id }))
  };
}
