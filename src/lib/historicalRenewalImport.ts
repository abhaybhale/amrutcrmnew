import type { Account, Order } from '../types';

export interface HistoricalOrderRow {
  issueKey: string;
  accountName: string;
  contactName: string;
  contactEmail: string;
  vendorName: string;
  sourceStatus: string;
  orderType: string;
  allocationNote: string;
  orderDate: string;
  softwareAmount: number;
  servicesAmount: number;
  totalAmount: number;
  renewalDate: string;
  accountInferred: boolean;
}

export interface HistoricalImportPreview {
  ready: HistoricalOrderRow[];
  skipped: { issueKey: string; reason: string }[];
  inferredAccounts: number;
  existingOrders: number;
  existingAccounts: number;
  newAccounts: number;
  inferredValueSplits: number;
}

const clean = (value: unknown) => String(value ?? '').trim();
const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const field = (row: Record<string, string>, ...names: string[]) => {
  const found = Object.keys(row).find(header => names.some(name => key(header.replace(/^\uFEFF/, '')) === key(name)));
  return clean(found ? row[found] : '');
};

function parseDate(value: string): string | null {
  const match = /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s|$)/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
}

function nextYear(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year + 1, month, 0)).getUTCDate();
  return `${year + 1}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

export function previewHistoricalOrders(rows: Record<string, string>[], accounts: Account[], orders: Order[]): HistoricalImportPreview {
  const namesByEmail = new Map<string, Set<string>>();
  for (const row of rows) {
    const email = field(row, 'End User Email-Id').toLowerCase().replace(/;$/, '');
    const name = field(row, 'Client Name');
    if (email && name) {
      const names = namesByEmail.get(email) ?? new Set<string>();
      names.add(key(name));
      namesByEmail.set(email, names);
    }
  }
  const displayNames = new Map<string, string>();
  for (const row of rows) {
    const name = field(row, 'Client Name');
    if (name) displayNames.set(key(name), name);
  }
  const knownAccounts = new Map(accounts.map(account => [key(account.name), account.name]));
  const existingKeys = new Set(orders.map(order => order.customFields?.sourceIssueKey || order.orderNumber).filter(Boolean).map(String));
  const seen = new Set<string>();
  const ready: HistoricalOrderRow[] = [];
  const skipped: HistoricalImportPreview['skipped'] = [];
  let inferredAccounts = 0;
  let existingOrders = 0;
  let inferredValueSplits = 0;

  for (const row of rows) {
    const issueKey = field(row, 'Issue key');
    if (!/^AMS-\d+$/i.test(issueKey)) { skipped.push({ issueKey: issueKey || '(missing)', reason: 'Missing Jira issue key' }); continue; }
    if (seen.has(issueKey) || existingKeys.has(issueKey)) {
      existingOrders += Number(existingKeys.has(issueKey));
      skipped.push({ issueKey, reason: 'Order already imported or repeated in file' });
      continue;
    }
    seen.add(issueKey);
    const email = field(row, 'End User Email-Id').toLowerCase().replace(/;$/, '');
    let accountName = field(row, 'Client Name');
    let accountInferred = false;
    if (!accountName) {
      const names = namesByEmail.get(email);
      if (names?.size === 1) {
        const normalized = [...names][0];
        accountName = knownAccounts.get(normalized) || displayNames.get(normalized) || '';
        accountInferred = true;
      }
    }
    if (!accountName) { skipped.push({ issueKey, reason: 'Client name missing or email matches multiple clients' }); continue; }
    const orderDate = parseDate(field(row, 'Created'));
    if (!orderDate) { skipped.push({ issueKey, reason: 'Invalid Created date' }); continue; }
    let product = Number(field(row, 'Total Product Order Value').replace(/,/g, ''));
    let services = Number(field(row, 'Total Services Order Value').replace(/,/g, ''));
    const total = Number(field(row, 'Total Order Value').replace(/,/g, ''));
    const orderType = field(row, 'Type of Order').toLowerCase();
    if (![product, services, total].every(Number.isFinite) || Math.min(product, services, total) < 0 || total <= 0) {
      skipped.push({ issueKey, reason: 'Missing or invalid order value' }); continue;
    }
    if ((orderType === 'product' && product === 0 && services > 0) ||
        (orderType === 'services' && services === 0 && product > 0)) {
      skipped.push({ issueKey, reason: 'Order type conflicts with product/services value columns' }); continue;
    }
    const difference = Math.round((total - product - services) * 100) / 100;
    let allocationNote = '';
    if (Math.abs(difference) > 0.01) {
      if (orderType === 'product' && services === 0) {
        product += difference;
        allocationNote = 'Unallocated total assigned to product using Type of Order';
      } else if (orderType === 'services' && product === 0) {
        services += difference;
        allocationNote = 'Unallocated total assigned to services using Type of Order';
      } else if (orderType === 'both' && difference > 0 && ((product > 0 && services === 0) || (services > 0 && product === 0))) {
        if (product > 0) services = difference;
        else product = difference;
        allocationNote = 'Missing product/services value inferred from Total Order Value';
      } else if (Math.abs(difference) <= Math.max(1, total * 0.001)) {
        if (product >= services) product += difference;
        else services += difference;
        allocationNote = 'Minor total rounding difference reconciled';
      } else {
        skipped.push({ issueKey, reason: 'Product + services does not match total; cannot allocate safely' }); continue;
      }
      if (product < 0 || services < 0) {
        skipped.push({ issueKey, reason: 'Product/services reconciliation would be negative' }); continue;
      }
      inferredValueSplits++;
    }
    const rawContact = field(row, 'End User Name');
    ready.push({
      issueKey, accountName: knownAccounts.get(key(accountName)) || accountName,
      contactName: rawContact && !rawContact.includes('@') ? rawContact : '',
      contactEmail: /^[^\s@;]+@[^\s@;]+\.[^\s@;]+$/.test(email) ? email : '',
      vendorName: field(row, 'OEM'), sourceStatus: field(row, 'Status'), orderType, allocationNote,
      orderDate, softwareAmount: product, servicesAmount: services, totalAmount: total,
      renewalDate: nextYear(orderDate), accountInferred
    });
    if (accountInferred) inferredAccounts++;
  }
  const uniqueNames = new Set(ready.map(row => key(row.accountName)));
  const existingAccounts = [...uniqueNames].filter(name => knownAccounts.has(name)).length;
  return { ready, skipped, inferredAccounts, existingOrders, existingAccounts, newAccounts: uniqueNames.size - existingAccounts, inferredValueSplits };
}
