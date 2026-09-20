import { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { db } from './firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';

/**
 * useSyncedCollection
 * ---------------------------------------------------------------------------
 * A drop-in replacement for `useState<T[]>` whose returned tuple has the
 * exact same shape — `[value, setValue]` — but is backed by a live Firestore
 * collection instead of (or in addition to) local component state.
 *
 * Why this shape: the rest of the app (CRMContext, MarketingContext,
 * FinanceContext) is full of mutator functions written as
 * `setLeads(prev => [...prev, newLead])` etc. By keeping the public
 * interface byte-for-byte compatible with useState, none of those mutators
 * needed to change — only the ~25 state declarations that feed them.
 *
 * How it works:
 *  - Subscribes to the Firestore collection with onSnapshot. Firestore's
 *    "latency compensation" means writes made by this client show up in the
 *    very next snapshot callback essentially instantly (before the server
 *    round-trip completes), so the UI still feels synchronous even though
 *    persistence is now remote.
 *  - The setValue() function computes the next array (supporting the
 *    functional-update form, just like useState), updates local state
 *    immediately, and diffs old vs new to issue the minimal set of
 *    setDoc/deleteDoc calls to Firestore.
 *  - On first-ever load (collection genuinely empty in Firestore, not just
 *    "still loading"), the hook seeds Firestore with `initialData` — this is
 *    what makes the demo dataset appear the first time anyone opens the app
 *    against a fresh Firestore project, without needing a separate seed
 *    script. Every browser that races to be "first" seeds with the exact
 *    same deterministic IDs, so duplicate seeding just overwrites the same
 *    docs with the same content — harmless.
 *  - Order is not guaranteed by Firestore, so on every snapshot the hook
 *    re-sorts using `createdDate` / `timestamp` (descending, newest first)
 *    when the collection's documents carry one of those fields — matching
 *    the "prepend new records" convention used throughout the existing
 *    mutator functions. Collections without either field keep Firestore's
 *    natural snapshot order.
 */

function sanitizeForFirestore<T>(item: T): DocumentData {
  // Firestore rejects `undefined` field values; round-trip through JSON to
  // strip them (same convention already used by the old FirestoreSync util).
  return JSON.parse(JSON.stringify(item));
}

function sortByRecency<T>(items: T[]): T[] {
  if (items.length === 0) return items;
  const sample = items[0] as any;
  const key = typeof sample?.createdDate === 'string' ? 'createdDate'
    : typeof sample?.timestamp === 'string' ? 'timestamp'
    : null;
  if (!key) return items;
  return [...items].sort((a: any, b: any) => {
    const av = a?.[key] ? Date.parse(a[key]) : 0;
    const bv = b?.[key] ? Date.parse(b[key]) : 0;
    return bv - av;
  });
}

// Tracks which collections this browser tab has already confirmed are
// non-empty (or has already attempted to seed), so a rapid unmount/remount
// (e.g. React StrictMode) doesn't double-seed.
const seedAttempted = new Set<string>();
const allowDatabaseSeeding = (import.meta as any).env?.VITE_ALLOW_DATABASE_SEEDING === 'true';

export function useSyncedCollection<T extends { id: string }>(
  collectionName: string,
  initialData: T[],
  enabled: boolean = true
): [T[], Dispatch<SetStateAction<T[]>>, boolean] {
  // Production starts empty and waits for Firestore. Bundled records are
  // available only during an explicitly enabled, controlled seed operation.
  const [value, setValueState] = useState<T[]>(() => allowDatabaseSeeding ? sortByRecency(initialData) : []);
  const [loading, setLoading] = useState(true);
  const valueRef = useRef<T[]>(value);
  valueRef.current = value;
  const initialDataRef = useRef(initialData);

  useEffect(() => {
    if (!enabled) {
      valueRef.current = [];
      setValueState([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const colRef = collection(db, collectionName);

    const handleSnapshot = async (snap: QuerySnapshot<DocumentData>) => {
      if (cancelled) return;

      if (snap.empty) {
        if (!seedAttempted.has(collectionName)) {
          seedAttempted.add(collectionName);
          const seed = initialDataRef.current;
          if (allowDatabaseSeeding && seed.length > 0) {
            try {
              for (let i = 0; i < seed.length; i += 450) {
                const batch = writeBatch(db);
                seed.slice(i, i + 450).forEach(item => {
                  batch.set(doc(db, collectionName, item.id), sanitizeForFirestore(item));
                });
                await batch.commit();
              }
              // The seed write will itself trigger another snapshot with the
              // real data, so we don't set local state here.
              return;
            } catch (err) {
              console.warn(`[useSyncedCollection] seed write failed for "${collectionName}", falling back to local defaults:`, err);
              if (!cancelled) {
                setValueState(sortByRecency(seed));
                setLoading(false);
              }
              return;
            }
          }
        }
        // Genuinely empty collection (all records deleted, or no seed data).
        setValueState([]);
        setLoading(false);
        return;
      }

      seedAttempted.add(collectionName);
      const docs = snap.docs.map(d => d.data() as T);
      setValueState(sortByRecency(docs));
      setLoading(false);
    };

    const unsub = onSnapshot(
      colRef,
      handleSnapshot,
      (err) => {
        console.error(`[useSyncedCollection] snapshot error for "${collectionName}" — check Firestore rules / auth state:`, err);
        if (!cancelled) setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, enabled]);

  const setValue: Dispatch<SetStateAction<T[]>> = useCallback((update) => {
    const prev = valueRef.current;
    const next = typeof update === 'function' ? (update as (p: T[]) => T[])(prev) : update;
    valueRef.current = next;
    setValueState(next);

    if (!enabled) return;

    const prevMap = new Map<string, T>(prev.map(i => [i.id, i]));
    const nextMap = new Map<string, T>(next.map(i => [i.id, i]));

    nextMap.forEach((item, id) => {
      if (prevMap.get(id) !== item) {
        setDoc(doc(db, collectionName, id), sanitizeForFirestore(item)).catch(err => {
          console.warn(`[useSyncedCollection] write failed for "${collectionName}/${id}":`, err);
        });
      }
    });
    prevMap.forEach((_item, id) => {
      if (!nextMap.has(id)) {
        deleteDoc(doc(db, collectionName, id)).catch(err => {
          console.warn(`[useSyncedCollection] delete failed for "${collectionName}/${id}":`, err);
        });
      }
    });
  }, [collectionName, enabled]);

  return [value, setValue, loading];
}
