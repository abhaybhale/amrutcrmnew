import { collection, doc, getDocs, writeBatch, type DocumentData } from 'firebase/firestore';
import { db } from './firebase';

type Change = { collection: string; id: string; patch: DocumentData };

const relatedCollections = [
  'contacts',
  'leads',
  'opportunities',
  'presalesRequests',
  'pocRecords',
  'quotes',
  'orders',
  'renewalRecords',
  'tasks'
];

export async function mergeAccountsInto(primaryId: string, duplicateIds: string[]): Promise<number> {
  const duplicates = new Set(duplicateIds.filter(id => id !== primaryId));
  if (!primaryId || duplicates.size === 0) throw new Error('Select a primary account and at least one duplicate.');

  const accountRows = (await getDocs(collection(db, 'accounts'))).docs;
  const primary = accountRows.find(row => row.id === primaryId);
  if (!primary) throw new Error('The primary account could not be found.');

  const snapshots = await Promise.all(
    relatedCollections.map(async collectionName => ({
      collectionName,
      rows: (await getDocs(collection(db, collectionName))).docs
    }))
  );
  const changes: Change[] = [];

  for (const { collectionName, rows } of snapshots) {
    for (const row of rows) {
      const data = row.data();
      const patch: DocumentData = {};

      if (duplicates.has(data.accountId)) {
        patch.accountId = primaryId;
        if ('accountName' in data) patch.accountName = primary.data().name;
      }
      if (Array.isArray(data.accountIds)) {
        const accountIds = [...new Set(data.accountIds.map((id: string) => duplicates.has(id) ? primaryId : id))];
        if (accountIds.join('|') !== data.accountIds.join('|')) patch.accountIds = accountIds;
      }
      if (Array.isArray(data.accountNames) && Object.keys(patch).length) {
        patch.accountNames = [...new Set([primary.data().name, ...data.accountNames])];
      }
      if (Object.keys(patch).length) changes.push({ collection: collectionName, id: row.id, patch });
    }
  }

  for (let start = 0; start < changes.length; start += 350) {
    const batch = writeBatch(db);
    for (const change of changes.slice(start, start + 350)) {
      batch.update(doc(db, change.collection, change.id), change.patch);
    }
    await batch.commit();
  }

  const ids = [...duplicates];
  for (let start = 0; start < ids.length; start += 350) {
    const batch = writeBatch(db);
    for (const id of ids.slice(start, start + 350)) batch.delete(doc(db, 'accounts', id));
    await batch.commit();
  }

  return changes.length;
}
